// Types for the Turn Guide: a self-contained, rules-only exploration of one player's turn.
import type { ActionId, ProvinceType } from "../../game/index.ts";

export type Tier = "outer" | "middle" | "inner" | "holl";
export type Holder = "unclaimed" | "enemy";
export type Outcome = "win" | "lose" | "draw";

/** The "what is your situation?" set-up. Gameplay terms only. */
export interface Scenario {
  players: number;
  provinces: boolean;
  spaceport: boolean;
  middleHold: boolean;
  innerHold: boolean;
  enemyInReach: boolean;
  unclaimedOuter: boolean;
  hollowOpen: boolean;
  forge: boolean;
  scouted: boolean;
  rp: number;
  hand: number;
  supply: number;
  /** The campaign has Mission Twists off: the guide skips the twist steps and leaves twists out of its text. Not user-set. */
  noTwists?: boolean;
}

/** What has been decided so far this turn. */
export interface Ctx {
  action: ActionId | null;
  tier: Tier | null;
  holder: Holder | null;
  prov: ProvinceType | null;
  underdog: boolean;
  fortified: boolean;
  twists: number[];
  result: Outcome | null;
  decisive: boolean;
}

/** Running gains and losses this turn. */
export interface Tally {
  rp: number;
  cards: number;
  provinces: number;
  supply: number;
}
export type Effects = Partial<Tally>;

export interface Env {
  sc: Scenario;
  ctx: Ctx;
  tally: Tally;
}

export type NoteCat = "dead" | "nochoice" | "nodown" | "judged" | "quirk";
export interface DesignNoteData {
  cat: NoteCat;
  text: string;
}

export type SideGroup = "rp" | "battle";

export interface StepOption {
  id: string;
  label: string;
  /** Breadcrumb text. Defaults to the label; null leaves this choice out of the trail. */
  crumb?: string | null;
  hint?: string;
  next: string | ((ctx: Ctx) => string);
  /** true when playable, otherwise the gameplay reason it is not. */
  available?: (env: Env) => true | string;
  effects?: Effects | ((env: Env) => Effects);
  set?: (ctx: Ctx) => Ctx;
}

export interface RollSpec {
  die: number;
  outcome: (value: number) => string;
  /** Short note on how the die maps to the outcomes, when it is not one-to-one. */
  legend?: string;
}

export interface Step {
  id: string;
  kind: "decision" | "roll" | "info" | "end";
  title: string;
  /** One line for the compact tree node. */
  blurb: string;
  text: string | ((env: Env) => string);
  options: StepOption[];
  notes: DesignNoteData[];
  roll?: RollSpec;
  side?: SideGroup[];
}

export interface TrailItem {
  stepId: string;
  optionId: string;
}
export interface SideUse {
  id: string;
  at: number;
}
export interface SideAction {
  id: string;
  group: SideGroup;
  label: string;
  hint: string;
  effects: Effects;
  /** true when usable now, otherwise the reason. */
  available: (env: Env, used: number) => true | string;
}

export const KIND_LABEL: Record<Step["kind"], string> = { decision: "Decision", roll: "Roll", info: "Step", end: "Turn end" };

export const CAT_LABEL: Record<NoteCat, string> = {
  dead: "Dead end / stuck",
  nochoice: "No real choice",
  nodown: "No downside",
  judged: "Judged at the table",
  quirk: "Quirk",
};
