// The simultaneous War Round: Planning, Reveal and parallel Resolution.
// Functions that take `s: CampaignState` and change it MUTATE it: they are building blocks that `apply()`
// runs on a structuredClone. The read-only selectors (`pickStatus`, `clashOf`, ...) never mutate.
import { drawFor, HAND_LIMIT } from "./cards.ts";
import { ACTIONS, PTYPES, TWISTS } from "./data.ts";
import { LIGHT_FORCES_MAX_PTS, LIGHT_FORCES_TWIST, targets } from "./engine.ts";
import { B, log } from "./log.ts";
import { rollInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import {
  count,
  getPlayer,
  getZone,
  holdsType,
  orbitOf,
  ownerOf,
  planetOf,
  provsOf,
  r5,
  r50,
  sizeOf,
  supplyOf,
  zoneName,
} from "./selectors.ts";
import type {
  ActionId,
  BattleInfo,
  BattleRecord,
  CampaignState,
  GarrisonEdge,
  LiveBattle,
  PickStatus,
  Player,
  RoundPick,
  UndoSnapshot,
  Zone,
} from "./types.ts";

/** What a player chooses in Planning (or when switching). */
export interface PickChoice {
  act: ActionId;
  zone?: string;
  def?: string;
}

// ---------------------------------------------------------------------------------------------
// Slots and statuses (read-only)
// ---------------------------------------------------------------------------------------------

/** Conquer and Raid: the actions marked `battle` in ACTIONS. */
const BATTLE_ACTS: ReadonlySet<ActionId> = new Set(ACTIONS.filter((a) => a.battle).map((a) => a.id));
export const isBattleAct = (a: ActionId | null | undefined): a is "conquer" | "raid" => !!a && BATTLE_ACTS.has(a);
/** Picks that sit on a province (and so can clash): Conquer, Raid and Fortify. */
const hasZone = (pk: RoundPick): boolean => !!pk.zone && (isBattleAct(pk.act) || pk.act === "fortify");

/** The players taking part in this round, in round-start order (weakest first). Players who left are skipped. */
export function slotIds(s: CampaignState): string[] {
  return s.phase === null ? [] : s.order.filter((id) => !!getPlayer(s, id));
}

/** True if this player has a slot in the round in progress. */
export function inRound(s: CampaignState, playerId: string): boolean {
  return slotIds(s).includes(playerId);
}

/**
 * Lookups the status selectors share, built once per state. States are never changed after `apply()` returns
 * (it works on a clone and calls `forgetRoundCache` before handing it back), so a cache keyed by the state is safe.
 * Inside `run`, any status read AFTER an in-place change to `s` must call `forgetRoundCache(s)` first.
 */
interface RoundIndex {
  /** Round-start position of each slot. */
  slot: Map<string, number>;
  /** Unfinished picks that sit on a province, in round-start order. Includes fallen-through picks. */
  zoned: string[];
  /** The same picks grouped by province. */
  byZone: Map<string, string[]>;
  /** fallReason results, filled in as they are asked for. */
  falls: Map<string, string | null>;
}
const roundCache = new WeakMap<CampaignState, RoundIndex>();

function roundIndex(s: CampaignState): RoundIndex {
  const hit = roundCache.get(s);
  if (hit) return hit;
  const slots = slotIds(s);
  const slot = new Map(slots.map((id, i) => [id, i]));
  const zoned = slots.filter((id) => {
    const o = s.picks[id];
    return !!o && !o.done && hasZone(o);
  });
  const byZone = new Map<string, string[]>();
  zoned.forEach((id) => {
    const zone = s.picks[id]?.zone ?? "";
    byZone.set(zone, [...(byZone.get(zone) ?? []), id]);
  });
  const idx: RoundIndex = { slot, zoned, byZone, falls: new Map() };
  roundCache.set(s, idx);
  return idx;
}

/** Drop the cached lookups for `s`. `apply()` calls this on the state it has just changed. */
export function forgetRoundCache(s: CampaignState): void {
  roundCache.delete(s);
}

function computeFallReason(s: CampaignState, playerId: string): string | null {
  const p = getPlayer(s, playerId);
  const pk = s.picks[playerId];
  if (!p || !pk || pk.done || pk.battle) return null;
  if (pk.fell) return pk.fell;
  const place = zoneName(s, pk.zone, "the province");
  if (isBattleAct(pk.act)) {
    if (!pk.zone || !getZone(s, pk.zone)) return "the target no longer exists";
    const holder = s.terr[pk.zone];
    if (holder === p.id) return `${place} is already held by ${p.name}`;
    if (pk.act === "raid" && !holder) return `${place} is no longer held by anyone`;
    if (!targets(s, p, pk.act).some((v) => v.id === pk.zone)) return `${place} is no longer within reach`;
    if (pk.act === "conquer" && !holder && pk.def && !getPlayer(s, pk.def)) return "the garrison player has left";
  }
  if (pk.act === "fortify" && (!pk.zone || s.terr[pk.zone] !== p.id)) return `${place} is no longer held by ${p.name}`;
  return null;
}

/** Why an unfinished pick that is not yet In battle can no longer be played, or null if it still can. Read-only. */
export function fallReason(s: CampaignState, playerId: string): string | null {
  const { falls } = roundIndex(s);
  const hit = falls.get(playerId);
  if (hit !== undefined) return hit;
  const reason = computeFallReason(s, playerId);
  falls.set(playerId, reason);
  return reason;
}

/**
 * The live queue on a province: unfinished picks on it that have not fallen through, In battle first, then
 * round-start order. Whoever is first may play; the rest wait.
 */
function queueOn(s: CampaignState, zone: string | undefined): string[] {
  if (!zone) return [];
  const { slot, byZone } = roundIndex(s);
  const pos = (id: string) => slot.get(id) ?? 0;
  const battle = (id: string) => Number(!!s.picks[id]?.battle);
  return (byZone.get(zone) ?? []).filter((id) => !fallReason(s, id)).sort((x, y) => battle(y) - battle(x) || pos(x) - pos(y));
}

/** Picks that sit ahead of this one in its province's queue. Fallen-through and finished picks never block. */
function ahead(s: CampaignState, playerId: string): string[] {
  const me = s.picks[playerId];
  if (!me || !hasZone(me)) return [];
  const q = queueOn(s, me.zone);
  const i = q.indexOf(playerId);
  return i < 0 ? [] : q.slice(0, i);
}

/** The pick's status, derived live from the shared state. Null if the player has no pick (still Choosing). */
export function pickStatus(s: CampaignState, playerId: string): PickStatus | null {
  if (s.phase === null) return null;
  if (!getPlayer(s, playerId)) return { kind: "done" };
  const pk = s.picks[playerId];
  if (!pk) return null;
  if (pk.done) return { kind: "done" };
  if (pk.battle) return { kind: "battle" };
  const reason = fallReason(s, playerId);
  if (reason) return { kind: "fell", reason };
  const before = ahead(s, playerId);
  if (before.length) return { kind: "waiting", on: getPlayer(s, before[before.length - 1])?.name ?? "another player" };
  return { kind: "ready" };
}

export interface Clash {
  zoneName: string;
  firstName: string;
}

/** The clash this pick is part of (two or more unfinished picks on its province), or null. */
export function clashOf(s: CampaignState, playerId: string): Clash | null {
  const me = s.picks[playerId];
  if (s.phase !== "resolution" || !me || me.done || !hasZone(me) || fallReason(s, playerId)) return null;
  const q = queueOn(s, me.zone);
  if (q.length < 2) return null;
  return { zoneName: zoneName(s, me.zone, "the province"), firstName: getPlayer(s, q[0])?.name ?? "" };
}

/** True if another player's unfinished pick is on this province, so a switch may not go there. */
export function tiedUp(s: CampaignState, zone: string, exceptPlayerId: string): boolean {
  // Unlike the clash queue this counts fallen-through picks too: the province stays tied up until their
  // player chooses again.
  return (roundIndex(s).byZone.get(zone) ?? []).some((id) => id !== exceptPlayerId);
}

/** Who a Conquer or Raid pick is against: the rolled battle's defender, else the province's holder (if any). */
export function defenderOf(s: CampaignState, playerId: string): string | undefined {
  const pk = s.picks[playerId];
  if (!pk) return undefined;
  if (pk.battle) return pk.battle.def;
  return pk.zone ? s.terr[pk.zone] : undefined;
}

export interface DefendingLine {
  attackerId: string;
  attacker: string;
  zoneName: string;
}

/** Unfinished attacks on this player that can still go ahead: Conquer or Raid picks on their provinces, or rolled battles where they field the garrison. */
export function defendingLines(s: CampaignState, playerId: string): DefendingLine[] {
  if (s.phase !== "resolution") return [];
  return roundIndex(s)
    .zoned.filter((id) => id !== playerId && isBattleAct(s.picks[id]?.act) && defenderOf(s, id) === playerId && fallReason(s, id) === null)
    .map((id) => ({ attackerId: id, attacker: getPlayer(s, id)?.name ?? "", zoneName: zoneName(s, s.picks[id]?.zone, "the province") }));
}

/** Players in the round who are not Ready yet. Done slots count as Ready. */
export function notReady(s: CampaignState): string[] {
  return slotIds(s).filter((id) => !(s.picks[id]?.ready || s.picks[id]?.done));
}

/** True when the owner may reveal: Planning, and every present player is Ready. */
export function canReveal(s: CampaignState): boolean {
  return s.phase === "planning" && notReady(s).length === 0;
}

// ---------------------------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------------------------

/** The provinces an action can target: reachable ones for Conquer and Raid, the player's own for Fortify, none otherwise. */
export function pickZones(s: CampaignState, p: Player, act: ActionId): Zone[] {
  return isBattleAct(act) ? targets(s, p, act) : act === "fortify" ? provsOf(s, p) : [];
}

/** True if the action can be picked at all: a battle needs an opponent and a target, Fortify a province to fortify. */
export function actionAvailable(s: CampaignState, p: Player, act: ActionId, zones: Zone[] = pickZones(s, p, act)): boolean {
  if (isBattleAct(act)) return s.players.length > 1 && zones.length > 0;
  return act === "fortify" ? zones.length > 0 : true;
}

/** A complete, legal pick built from `c`, or null. Fills in or drops the garrison player to match the province. */
export function buildPick(s: CampaignState, p: Player, c: PickChoice): RoundPick | null {
  const def = ACTIONS.find((x) => x.id === c.act);
  if (!def) return null;
  const zones = pickZones(s, p, c.act);
  if (!actionAvailable(s, p, c.act, zones)) return null;
  if (def.battle) {
    if (!c.zone || !zones.some((v) => v.id === c.zone)) return null;
    const holder = s.terr[c.zone];
    if (holder) return { act: c.act, zone: c.zone, ready: true };
    if (c.act !== "conquer") return null;
    if (!c.def || c.def === p.id || !getPlayer(s, c.def)) return null;
    return { act: c.act, zone: c.zone, def: c.def, ready: true };
  }
  if (c.act === "fortify") {
    if (!c.zone || s.terr[c.zone] !== p.id) return null;
    return { act: c.act, zone: c.zone, ready: true };
  }
  return { act: c.act, ready: true };
}

/** Planning: store a complete pick and mark the player Ready. */
export function readyPick(s: CampaignState, playerId: string, c: PickChoice): boolean {
  const p = getPlayer(s, playerId);
  if (s.phase !== "planning" || !p || !inRound(s, playerId)) return false;
  const cur = s.picks[playerId];
  if (cur?.battle || cur?.done) return false;
  const pk = buildPick(s, p, c);
  if (!pk) return false;
  s.picks[playerId] = pk;
  return true;
}

/** Planning: take the Ready mark off so the pick can be changed. Keeps the pick so the form stays filled in. */
export function unreadyPick(s: CampaignState, playerId: string): boolean {
  const pk = s.picks[playerId];
  if (s.phase !== "planning" || !pk || !pk.ready || pk.battle || pk.done) return false;
  pk.ready = false;
  return true;
}

/** Owner: reveal every pick at once and start Resolution. Needs every present player to be Ready. */
export function revealPicks(s: CampaignState): boolean {
  if (!canReveal(s)) return false;
  s.phase = "resolution";
  checkRoundEnd(s);
  return true;
}

// ---------------------------------------------------------------------------------------------
// Battles
// ---------------------------------------------------------------------------------------------

function rollTwistSet(zone: Zone, s: CampaignState, rng: Rng): number[] {
  const n = orbitOf(s, zone).twists;
  const idx: number[] = [];
  while (idx.length < n) {
    const i = rollInt(rng, TWISTS.length);
    if (!idx.includes(i)) idx.push(i);
  }
  return idx;
}

/** The garrison's points, the attacker's points and the garrison note for a fixed battle size. */
function garrisonFigures(a: Player, d: Player, pts: number, edge: GarrisonEdge) {
  const weaken = edge === "defender";
  const defenderPts = r5(pts * 0.8);
  const note = `Garrison battle: ${d.name} fields the unclaimed province's garrison and gains nothing from it. ${a.name} must fight it, ${weaken ? `against a garrison with -20% points (${defenderPts} pts)` : "with +20% points"}.`;
  return { attackerPts: weaken ? pts : r5(pts * 1.2), ...(weaken && { defenderPts, edge }), note };
}
const isGarrisonNote = (n: string): boolean => n.startsWith("Garrison battle: ");

/** Points, notes and the rest for a battle, worked out from the state right now. Read-only. */
function figures(s: CampaignState, a: Player, d: Player, v: Zone, act: ActionId, garrison: boolean, twists: number[], edge: GarrisonEdge) {
  const notes: string[] = [];
  let pts = sizeOf(s, v);
  twists.forEach((i) => (pts *= TWISTS[i].m));
  if (act === "raid") {
    pts *= 0.5;
    notes.push("Raid: half size.");
  }
  pts = Math.max(500, r50(pts));
  const cap = garrison ? supplyOf(s, a) : Math.min(supplyOf(s, a), supplyOf(s, d));
  if (cap < pts) {
    notes.push(
      garrison
        ? `Capped at the attacker's supply limit (${a.name}).`
        : `Capped at the lower supply limit (${supplyOf(s, a) <= supplyOf(s, d) ? a.name : d.name}).`,
    );
    pts = Math.floor(cap / 50) * 50;
  }
  const { note, ...gar } = garrison ? garrisonFigures(a, d, pts, edge) : { note: "", attackerPts: pts };
  if (garrison) notes.push(note);
  else if (count(s, a) < count(s, d)) notes.push(`${a.name} is the Underdog: +10% (${r5(pts * 1.1)} pts).`);
  const held = s.terr[v.id] === d.id;
  if (held && (s.fort[v.id] || v.type === "fortress"))
    notes.push(`Fortified: ${d.name} gets +1 CP and one extra piece of terrain.`);
  if (v.type === "capital" && held)
    notes.push(`${d.name}'s Capital: if ${a.name} wins a Conquer here, they also steal 2 RP.`);
  if (v.type === "shrine") notes.push("Shrine: both players' Marked for Glory units gain +1 XP.");
  if (a.scout) notes.push(`Scout: ${a.name} may swap one twist for any twist of their choice.`);
  const cards = twists.includes(8) ? 1 : Math.max(1, Math.floor(pts / 500));
  const lightForces = pts <= LIGHT_FORCES_MAX_PTS && !twists.includes(LIGHT_FORCES_TWIST);
  return { pts, ...gar, notes, cards, lightForces };
}

/** What `makeBattle` needs: the given `twists` (converting an old save), or an `rng` to roll them. */
export type BattleSpec = { attackerId: string; act: ActionId; zone: string; def: string; garrison: boolean; edge?: GarrisonEdge } & (
  | { twists: number[] }
  | { rng: Rng }
);

/** A battle with its twists and figures fixed from the state right now (also used to convert old saves). */
export function makeBattle(s: CampaignState, b: BattleSpec): LiveBattle | null {
  const a = getPlayer(s, b.attackerId);
  const d = getPlayer(s, b.def);
  const v = getZone(s, b.zone);
  if (!a || !d || !v) return null;
  const twists = "twists" in b ? b.twists : rollTwistSet(v, s, b.rng);
  return { def: b.def, garrison: b.garrison, twists, ...figures(s, a, d, v, b.act, b.garrison, twists, b.edge ?? "attacker") };
}

const RIFT_TRAIT = {
  n: "Warp rift",
  trait: "Shifting ground. At the start of each round roll a D6: on a 1 move one terrain piece 3\". One Lord of War allowed.",
};

/** Everything about a player's rolled battle. Points and notes are the ones fixed at the roll. Null if not rolled. */
export function battleInfo(s: CampaignState, playerId: string): BattleInfo | null {
  const pk = s.picks[playerId];
  const b = pk?.battle;
  if (!pk || !b || !pk.zone) return null;
  const v = getZone(s, pk.zone);
  const a = getPlayer(s, playerId);
  const d = getPlayer(s, b.def);
  if (!v || !a || !d) return null;
  const pl = planetOf(s, v);
  return { ...b, v, a, d, trait: pl ? PTYPES[pl.type] : RIFT_TRAIT };
}

/**
 * Roll the twists for a Conquer or Raid pick that is Ready to play and fix its figures. `defArg` is the garrison
 * player when the province is unclaimed and the pick has none (a removed player's province). Returns false (changing
 * nothing) if the pick cannot be played now, e.g. it was already rolled.
 */
export function rollPick(s: CampaignState, playerId: string, defArg: string | undefined, rng: Rng): boolean {
  const pk = s.picks[playerId];
  const a = getPlayer(s, playerId);
  if (s.phase !== "resolution" || !pk || !a || !pk.zone || !pk.act || !isBattleAct(pk.act)) return false;
  if (pickStatus(s, playerId)?.kind !== "ready") return false;
  const holder = defenderOf(s, playerId);
  let def: string;
  let garrison = false;
  if (holder) def = holder;
  else {
    def = pk.def ?? defArg ?? "";
    if (pk.act !== "conquer" || def === a.id || !getPlayer(s, def)) return false;
    garrison = true;
  }
  const battle = makeBattle(s, { attackerId: playerId, act: pk.act, zone: pk.zone, def, garrison, rng });
  if (!battle) return false;
  pk.battle = battle;
  return true;
}

/** Roll the twists again for a battle that is In battle, and work its figures out again from the state now. */
export function rerollPick(s: CampaignState, playerId: string, rng: Rng): boolean {
  const pk = s.picks[playerId];
  if (!pk?.battle || pk.done || !pk.zone || !pk.act) return false;
  const b = pk.battle;
  const battle = makeBattle(s, { attackerId: playerId, act: pk.act, zone: pk.zone, def: b.def, garrison: b.garrison, edge: b.edge, rng });
  if (!battle) return false;
  pk.battle = battle;
  return true;
}

/** Garrison battle In battle: +20% points for the attacker or -20% for the garrison. The battle size stays fixed. */
export function setGarrisonEdge(s: CampaignState, playerId: string, edge: GarrisonEdge): boolean {
  const pk = s.picks[playerId];
  const b = pk?.battle;
  const a = getPlayer(s, playerId);
  const d = getPlayer(s, b?.def);
  if (!b?.garrison || pk.done || !a || !d || (edge !== "attacker" && edge !== "defender")) return false;
  const { note, ...gar } = garrisonFigures(a, d, b.pts, edge);
  const { defenderPts: _d, edge: _e, ...rest } = b;
  pk.battle = { ...rest, ...gar, notes: b.notes.map((n) => (isGarrisonNote(n) ? note : n)) };
  return true;
}

/** End the round once every slot is Done (mutates `s`). Runs the Hollowgate win check. */
export function checkRoundEnd(s: CampaignState): void {
  if (s.phase !== "resolution") return;
  if (!slotIds(s).every((id) => !!s.picks[id]?.done)) return;
  s.phase = null;
  s.picks = {};
  const h = ownerOf(s, "holl");
  if (h) {
    s.won = h.id;
    log(s, B(`${h.name} holds the Hollowgate at the end of War Round ${s.round} and wins the Varkesh Reach.`));
  } else log(s, `War Round ${s.round} ends.`);
}

/** Record the result of a player's In-battle pick (mutates `s`). Uses the state at this moment. */
export function resolvePick(s: CampaignState, playerId: string, res: "a" | "d" | "x", rng: Rng, decisive?: boolean): boolean {
  const pk = s.picks[playerId];
  const info = battleInfo(s, playerId);
  if (!pk || pk.done || !pk.act || !info) return false;
  const { v, a, d } = info;
  const win = res === "a" ? a : res === "d" ? d : null;
  // A garrison player fields the defence as a favour: only the attacker takes part in the campaign.
  const sides = info.garrison ? [a] : [a, d];
  const rewarded = win && sides.includes(win) ? win : null;
  sides.forEach((p) => {
    p.battles++;
    p.rp = Math.min(10, p.rp + 1);
  });
  if (rewarded) {
    rewarded.wins++;
    rewarded.rp = Math.min(10, rewarded.rp + 1);
  }
  const pl = planetOf(s, v);
  const where = pl ? `${v.name} on ${pl.name}` : v.name;
  if (info.garrison)
    log(
      s,
      B(a.name),
      ` attacked ${where}, garrisoned by `,
      B(d.name),
      ": ",
      ...(win === a ? [B(a.name), " won."] : win === d ? [B(d.name), "'s garrison won."] : ["a draw."]),
    );
  else
    log(
      s,
      B(a.name),
      ` ${pk.act === "raid" ? "raided" : "attacked"} ${where} against `,
      B(d.name),
      `: ${win ? win.name + " won" : "a draw"}.`,
    );
  if (pk.act === "conquer") {
    if (win === a) {
      if (v.type === "capital" && s.terr[v.id] === d.id) {
        const st = Math.min(2, d.rp);
        d.rp -= st;
        a.rp = Math.min(10, a.rp + st);
        log(s, B(a.name), ` sacks ${d.name}'s Capital and steals ${st} RP.`);
      }
      s.terr[v.id] = a.id;
      log(s, B(a.name), ` takes ${v.name}.`);
      if (info.garrison && decisive) {
        a.rp = Math.min(10, a.rp + 1);
        log(s, "Decisive win: ", B(a.name), " gains 1 extra RP.");
      }
    } else if (win === d && s.terr[v.id] === d.id) log(s, B(d.name), ` holds ${v.name}.`);
  } else if (win === a) {
    const rp = Math.min(1, d.rp);
    d.rp -= rp;
    a.rp = Math.min(10, a.rp + rp);
    if (d.hand.length && a.hand.length < HAND_LIMIT) {
      const c = d.hand.splice(rollInt(rng, d.hand.length), 1)[0];
      a.hand.push(c);
      log(s, B(a.name), ` steals ${rp} RP and the card "${c.t}".`);
    } else log(s, B(a.name), ` steals ${rp} RP.`);
  }
  delete s.fort[v.id];
  if (rewarded) drawFor(s, rewarded, 1, "victory", rng);
  // Underdog's grit: every player on the campaign minimum draws, not only the combatants.
  if (s.players.length > 1) {
    const min = Math.min(...s.players.map((p) => count(s, p)));
    s.players.forEach((p) => {
      if (count(s, p) === min) drawFor(s, p, 1, "Underdog's grit", rng);
    });
  }
  a.scout = false;
  const rec: BattleRecord = {
    round: s.round,
    att: a.id,
    attName: a.name,
    prov: v.id,
    provName: v.name,
    kind: pk.act === "raid" ? "raid" : "conquer",
    out: res,
  };
  if (!info.garrison) {
    rec.def = d.id;
    rec.defName = d.name;
  } else rec.garrison = true;
  if (pl) rec.world = pl.name;
  if (pk.act === "conquer" && win === a) rec.took = true;
  s.history = [...(s.history ?? []), rec];
  if (info.garrison)
    log(s, B(a.name), ": record XP and roll for the fallen. ", B(d.name), " fielded the garrison and gains nothing.");
  else log(s, "Both players: record XP and roll for the fallen.");
  pk.done = true;
  checkRoundEnd(s);
  return true;
}

/** Copy of the parts of s that a battle result can change. */
export function takeSnapshot(s: CampaignState): UndoSnapshot {
  return structuredClone({
    round: s.round,
    phase: s.phase,
    order: s.order,
    picks: s.picks,
    log: s.log,
    won: s.won,
    fort: s.fort,
    terr: s.terr,
    players: s.players,
    hollOpened: s.hollOpened,
  });
}

/**
 * Take back the latest battle result (mutates s). That pick goes back to In battle with the same twists.
 * Returns false if there is nothing to undo or a post-battle report has been filed since.
 */
export function undoBattle(s: CampaignState, attacker: string): boolean {
  const u = s.undo;
  // The action names whose result it undoes, so a retry after someone else's result landed is a no-op.
  if (!u || u.reportFiled || u.attacker !== attacker) return false;
  const b = structuredClone(u.before);
  s.round = b.round;
  s.phase = b.phase;
  s.order = b.order;
  s.picks = b.picks;
  s.log = [...u.later, ...b.log].slice(0, 60);
  s.won = b.won;
  s.fort = b.fort;
  s.terr = b.terr;
  s.players = b.players;
  s.hollOpened = b.hollOpened;
  s.history = (s.history ?? []).slice(0, -1);
  delete s.undo;
  return true;
}

/** Carry out a player's Ready-to-play quiet pick and mark it Done (mutates `s`). Returns false if it cannot be played now. */
export function confirmQuietPick(s: CampaignState, playerId: string, rng: Rng): boolean {
  const pk = s.picks[playerId];
  const p = getPlayer(s, playerId);
  if (s.phase !== "resolution" || !pk || !p || !pk.act) return false;
  if (isBattleAct(pk.act) || pickStatus(s, playerId)?.kind !== "ready") return false;
  const act = pk.act;
  const z = pk.zone ? provsOf(s, p).find((v) => v.id === pk.zone) : undefined;
  if (act === "fortify" && !z) return false;
  if (act === "recuperate") {
    p.rp = Math.min(10, p.rp + 1);
    log(s, B(p.name), " recuperates: +1 RP, removes up to 2 Battle Scars.");
  }
  if (act === "muster") {
    const n = 250 + 150 * Math.min(1, holdsType(s, p, "forge"));
    p.sup = (p.sup || 0) + n;
    log(s, B(p.name), ` musters: +${n} supply.`);
    drawFor(s, p, 1, "Muster", rng);
  }
  if (act === "fortify" && z) {
    s.fort[z.id] = true;
    log(s, B(p.name), ` fortifies ${z.name}.`);
  }
  if (act === "scout") {
    p.scout = true;
    log(s, B(p.name), " scouts ahead.");
    drawFor(s, p, 1, "Scout", rng);
  }
  pk.done = true;
  checkRoundEnd(s);
  return true;
}

/**
 * Resolution: a Waiting or Choose-again player switches to another legal pick on a province that no other
 * unfinished pick is on (quiet actions are always allowed). The new pick is Ready to play at once.
 */
export function switchPick(s: CampaignState, playerId: string, c: PickChoice): boolean {
  const p = getPlayer(s, playerId);
  const st = pickStatus(s, playerId);
  if (s.phase !== "resolution" || !p || !st || (st.kind !== "waiting" && st.kind !== "fell")) return false;
  const pk = buildPick(s, p, c);
  if (!pk) return false;
  if (pk.zone && tiedUp(s, pk.zone, playerId)) return false;
  s.picks[playerId] = pk;
  return true;
}

/**
 * A player has been removed (call after they leave `s.players`; `name` is the name they had). Their pick is
 * dropped. Planning: picks that named them as garrison go back to un-Ready. Resolution: their slot counts as Done,
 * and the other side of any battle they were in gets "Choose again".
 */
export function dropPlayerPicks(s: CampaignState, playerId: string, name: string): void {
  delete s.picks[playerId];
  Object.values(s.picks).forEach((pk) => {
    if (pk.done) return;
    if (pk.battle && pk.battle.def === playerId) {
      delete pk.battle;
      delete pk.def;
      pk.fell = `${name} has left the campaign`;
    } else if (pk.def === playerId && s.phase === "planning") {
      delete pk.def;
      pk.ready = false;
    }
  });
  checkRoundEnd(s);
}
