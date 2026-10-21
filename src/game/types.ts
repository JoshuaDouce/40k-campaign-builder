// Shared types for the Varkesh Reach game module. Pure data, no behaviour.

export type FactionName =
  | "Space Marines"
  | "Astra Militarum"
  | "Adepta Sororitas"
  | "Adeptus Mechanicus"
  | "Chaos Space Marines"
  | "Death Guard"
  | "Orks"
  | "Necrons"
  | "Tyranids"
  | "Genestealer Cults"
  | "Aeldari"
  | "T'au Empire";

export type Side = "imp" | "cha" | "xen";
export type SideKey = "imp-imp" | "cha-cha" | "imp-cha" | "imp-xen" | "cha-xen" | "xen-xen";
export type OrbitKey = "outer" | "middle" | "inner";
export type PlanetType = "hive" | "death" | "forge" | "agri" | "shrine" | "moon" | "ice" | "ash";
export type ProvinceType =
  | "capital"
  | "spaceport"
  | "hive"
  | "forge"
  | "fortress"
  | "shrine"
  | "refinery"
  | "settlement"
  | "outpost"
  | "ruins";
export type ActionId = "conquer" | "raid" | "recuperate" | "muster" | "fortify" | "scout";
export type StatKey = "rp" | "battles" | "wins";

export interface FactionInfo {
  c: string;
  side: Side;
  want: string;
  open: string;
}
export interface OrbitDef {
  name: string;
  mult: number;
  twists: number;
  r: number;
}
export interface PlanetTypeDef {
  n: string;
  c: string;
  trait: string;
  fav: ProvinceType;
}
export interface ProvinceTypeDef {
  n: string;
  size: number;
  bonus: string;
  suf: readonly string[];
}
export interface TwistDef {
  t: string;
  e: string;
  m: number;
}
export interface ActionDef {
  id: ActionId;
  n: string;
  battle: boolean;
  d: string;
}

/** A Fate Card in a hand. `fac` is set for faction cards. */
export interface Card {
  t: string;
  e: string;
  fac?: FactionName;
}

export interface Player {
  id: string;
  name: string;
  faction: FactionName;
  rp: number;
  battles: number;
  wins: number;
  /** Bonus supply from Muster and Reinforcements. */
  sup: number;
  /** True after a Scout action until the player's next battle resolves. */
  scout: boolean;
  hand: Card[];
  /** Cognito user id of whoever controls this player. Players without one are owner-controlled. */
  userId?: string;
}

export type Pt = [number, number];

export interface Planet {
  id: string;
  name: string;
  type: PlanetType;
  orbit: OrbitKey;
  /** Angle in radians around the system centre. */
  ang: number;
  /** Position in the system viewBox, derived from `ang` and the layout scale. */
  x: number;
  y: number;
}

export interface Province {
  id: string;
  /** Planet id. */
  pl: string;
  type: ProvinceType;
  name: string;
  /** Seed point inside the planet disc (unit circle). */
  x: number;
  y: number;
  /** Voronoi cell polygon in unit-circle coordinates. */
  cell: Pt[];
  /** Neighbouring province ids on the same planet. */
  nb: string[];
}

export interface Hollowgate {
  id: "holl";
  name: string;
  type: "rift";
  pl: null;
}
/** Anything a battle can be fought over. Discriminate on `type === "rift"`. */
export type Zone = Province | Hollowgate;

export type Lane = [string, string];

export interface System {
  seed: number;
  /** Side length of the square system viewBox (360 unless the layout was scaled up). Centre is size / 2. */
  size: number;
  planets: Planet[];
  lanes: Lane[];
  provs: Province[];
}

/** One run of log text. `b` marks bold. Plain text only, never HTML. */
export interface LogSeg {
  b?: true;
  t: string;
}
export interface LogEntry {
  r: number;
  segs: LogSeg[];
}

export interface Pending {
  act: ActionId;
  actor: string;
  zone?: string;
  def?: string;
  twists?: number[];
  rolled?: boolean;
}

export interface CampaignState {
  round: number;
  /** Index into `order` of the player whose turn it is, or null between War Rounds. */
  turnIdx: number | null;
  order: string[];
  pend: Pending | null;
  /** Newest first, capped at 60. */
  log: LogEntry[];
  won: string | null;
  fort: Record<string, true>;
  /** Province id (or "holl") to owning player id. */
  terr: Record<string, string>;
  /** Player id to capital province id. */
  cap: Record<string, string>;
  sys: System;
  players: Player[];
  /** Latched once the Hollowgate has opened, so adding worlds can never close it. */
  hollOpened: boolean;
}

export interface BattleInfo {
  v: Zone;
  a: Player;
  d: Player;
  pts: number;
  notes: string[];
  cards: number;
  lightForces: boolean;
  trait: { n: string; trait: string };
}

export type Action =
  | { type: "beginRound" }
  | { type: "chooseAction"; act: ActionId }
  | { type: "cancelAction" }
  | { type: "rollBattle"; zone: string; def: string }
  | { type: "rerollTwists" }
  | { type: "resolveBattle"; result: "a" | "d" | "x" }
  | { type: "confirmQuiet"; fortZone?: string }
  | { type: "drawCard"; playerId: string }
  | { type: "playCard"; playerId: string; index: number }
  | { type: "discardCard"; playerId: string; index: number }
  | { type: "buyReinforcements"; playerId: string }
  | { type: "adjustStat"; playerId: string; stat: StatKey; delta: number }
  | { type: "setProvinceOwner"; provId: string; playerId: string | null }
  | { type: "updatePlayer"; playerId: string; name?: string; faction?: FactionName }
  | { type: "addPlayer"; id: string; name: string; faction: FactionName; userId?: string }
  | { type: "removePlayer"; playerId: string }
  | { type: "regen" }
  | { type: "reset" };

export type ActionType = Action["type"];
