// Pure helpers that walk the step graph: replay a trail, build the flow tree, count the notes.
import { HAND_LIMIT, rollInt } from "../../game/index.ts";
import { RP_CAP } from "./battleMath.ts";
import { SIDE_ACTIONS } from "./sideActions.ts";
import { EMPTY_CTX, START, STEPS } from "./stepGraph.ts";
import type { Effects, Env, NoteCat, Scenario, SideUse, Step, StepOption, Tally, TrailItem } from "./guideTypes.ts";

const ZERO_TALLY: Tally = { rp: 0, cards: 0, provinces: 0, supply: 0 };

const initialEnv = (sc: Scenario): Env => ({ sc, ctx: EMPTY_CTX, tally: ZERO_TALLY });

function addTally(t: Tally, e: Effects): Tally {
  return { rp: t.rp + (e.rp ?? 0), cards: t.cards + (e.cards ?? 0), provinces: t.provinces + (e.provinces ?? 0), supply: t.supply + (e.supply ?? 0) };
}

export const stepText = (step: Step, env: Env): string => (typeof step.text === "function" ? step.text(env) : step.text);
export const optionAvailability = (opt: StepOption, env: Env): true | string => (opt.available ? opt.available(env) : true);
/** The real end of a turn (as opposed to a dead-end stop): show the summary and offer another turn. */
export const isTurnOver = (step: Step): boolean => step.id === "end";

function applyOption(opt: StepOption, env: Env): Env {
  const eff = typeof opt.effects === "function" ? opt.effects(env) : (opt.effects ?? {});
  return { sc: env.sc, ctx: opt.set ? opt.set(env.ctx) : env.ctx, tally: addTally(env.tally, eff) };
}
/** Steps left out while Mission Twists are off: the battle goes straight to its size. */
const TWIST_STEPS = new Set(["twist1", "twist2"]);
function nextOf(opt: StepOption, after: Env): string {
  const next = typeof opt.next === "function" ? opt.next(after.ctx) : opt.next;
  return after.sc.noTwists && TWIST_STEPS.has(next) ? "size" : next;
}

/** Roll the step's die, rolling again while the outcome is one that can't be taken. */
export function rollFor(step: Step, rng: () => number, allowed: (optionId: string) => boolean = () => true): { value: number; optionId: string } | null {
  const roll = step.roll;
  if (!roll) return null;
  for (let i = 0; i < 100; i++) {
    const value = 1 + rollInt(rng, roll.die);
    const optionId = roll.outcome(value);
    if (allowed(optionId)) return { value, optionId };
  }
  return null;
}

/** Walk from the start of the turn, letting `pick` choose an option at each step (null stops). */
function walkFrom(sc: Scenario, pick: (step: Step, env: Env, i: number) => StepOption | undefined, visit: (step: Step, opt: StepOption) => void) {
  let env = initialEnv(sc);
  let stepId = START;
  for (let i = 0; i < 40; i++) {
    const step = STEPS[stepId];
    const opt = step && pick(step, env, i);
    if (!opt) break;
    visit(step, opt);
    env = applyOption(opt, env);
    stepId = nextOf(opt, env);
  }
  return { stepId, env };
}

export interface Crumb {
  stepId: string;
  label: string;
}

/** Replay the player's choices from the start of the turn. Side-spends are folded into the tally. */
export function replay(sc: Scenario, trail: TrailItem[], sides: SideUse[]): { stepId: string; env: Env; crumbs: Crumb[] } {
  const crumbs: Crumb[] = [];
  const { stepId, env } = walkFrom(
    sc,
    (step, _env, i) => (i < trail.length ? step.options.find((o) => o.id === trail[i].optionId) : undefined),
    (step, opt) => {
      const label = opt.crumb === undefined ? opt.label : opt.crumb;
      if (label) crumbs.push({ stepId: step.id, label });
    },
  );
  const tally = sides.reduce((t, u) => addTally(t, SIDE_ACTIONS.find((s) => s.id === u.id)?.effects ?? {}), env.tally);
  return { stepId, env: { ...env, tally }, crumbs };
}

// ---------- Flow tree ----------

export interface TreeOption {
  opt: StepOption;
  available: true | string;
  selected: boolean;
  child: TreeChild | null;
}
export type TreeChild = { stub: true; step: Step } | { stub: false; node: TreeNode };
export interface TreeNode {
  step: Step;
  env: Env;
  options: TreeOption[];
  /** For roll nodes whose outcomes all lead to the same place: one shared continuation. */
  joined: TreeChild | null;
}
export type Choices = Record<string, string>;

function selectedId(step: Step, env: Env, choices: Choices): string | null {
  const wanted = step.options.find((o) => o.id === choices[step.id]);
  if (wanted && optionAvailability(wanted, env) === true) return wanted.id;
  return step.options.find((o) => optionAvailability(o, env) === true)?.id ?? null;
}

export function buildTree(sc: Scenario, choices: Choices, showAll: boolean): TreeChild {
  const seen = new Set<string>();
  const build = (stepId: string, env: Env): TreeChild => {
    const step = STEPS[stepId];
    if (seen.has(stepId)) return { stub: true, step };
    seen.add(stepId);
    const sel = selectedId(step, env, choices);
    const rows = step.options.map((opt) => {
      const available = optionAvailability(opt, env);
      const after = applyOption(opt, env);
      return { opt, available, after, next: nextOf(opt, after) };
    });
    const playable = rows.filter((r) => r.available === true);
    const together = step.kind === "roll" && playable.length > 1 && playable.every((r) => r.next === playable[0].next);
    let joined: TreeChild | null = null;
    if (together) {
      const pick = playable.find((r) => r.opt.id === sel) ?? playable[0];
      joined = build(pick.next, pick.after);
    }
    const options = rows.map((r): TreeOption => {
      const selected = r.opt.id === sel;
      const open = !together && r.available === true && (showAll || selected);
      return { opt: r.opt, available: r.available, selected, child: open ? build(r.next, r.after) : null };
    });
    return { stub: false, node: { step, env, options, joined } };
  };
  return build(START, initialEnv(sc));
}

/** The currently selected path through the tree, as a trail the walkthrough can open at. */
export function pathTrail(sc: Scenario, choices: Choices): TrailItem[] {
  const trail: TrailItem[] = [];
  walkFrom(
    sc,
    (step, env) => step.options.find((o) => o.id === selectedId(step, env, choices)),
    (step, opt) => trail.push({ stepId: step.id, optionId: opt.id }),
  );
  return trail;
}

/** The walkthrough's trail as tree choices, so the tree opens on the same path. */
export const trailChoices = (trail: TrailItem[]): Choices => Object.fromEntries(trail.map((t) => [t.stepId, t.optionId]));

// ---------- Notes ----------

function noteCounts(): { total: number; byCat: Record<NoteCat, number> } {
  const byCat: Record<NoteCat, number> = { dead: 0, nochoice: 0, nodown: 0, judged: 0, quirk: 0 };
  let total = 0;
  for (const s of Object.values(STEPS)) {
    for (const n of s.notes) {
      byCat[n.cat]++;
      total++;
    }
  }
  return { total, byCat };
}
/** The step graph never changes, so the note counts are worked out once. */
export const NOTE_COUNTS = noteCounts();

/** The player's situation after this turn, for "Play another turn". */
export function carryOver(env: Env): Scenario {
  const { sc, ctx, tally } = env;
  return {
    ...sc,
    rp: Math.max(0, Math.min(RP_CAP, sc.rp + tally.rp)),
    hand: Math.max(0, Math.min(HAND_LIMIT, sc.hand + tally.cards)),
    supply: sc.supply + tally.supply,
    provinces: sc.provinces || tally.provinces > 0,
    scouted: ctx.action === "scout" ? true : ctx.result ? false : sc.scouted,
  };
}
