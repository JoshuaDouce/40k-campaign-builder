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
  | "T'au Empire"
  | "Adeptus Custodes"
  | "Black Templars"
  | "Blood Angels"
  | "Chaos Daemons"
  | "Chaos Knights"
  | "Dark Angels"
  | "Deathwatch"
  | "Drukhari"
  | "Emperor's Children"
  | "Grey Knights"
  | "Imperial Agents"
  | "Imperial Knights"
  | "Leagues of Votann"
  | "Space Wolves"
  | "Thousand Sons"
  | "World Eaters";

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
export type Role = "Character" | "Battleline" | "Infantry" | "Mounted" | "Vehicle / Monster" | "Other";
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
  /** Added to the holder's supply limit while they hold it. */
  supply?: number;
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
  /** Lowercase email of that user, so the Members list can show who has picked a faction. */
  email?: string;
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

/**
 * One unit on a player's roster. Scars are plain strings: the scar name from `SCARS`, or for Worn Gear
 * `"Worn Gear (melta rifles)"` (name, space, weapon in brackets). Use `scarName` / `scarWeapon` / `makeScar`
 * from roster.ts rather than parsing by hand.
 */
export interface Unit {
  id: string;
  name: string;
  datasheet: string;
  /** Base points, before honours. */
  points: number;
  xp: number;
  /** Honour names from `HONOURS`, no duplicates. */
  honours: string[];
  scars: string[];
  isCharacter: boolean;
  /** Battlefield role for the Force Organisation chart. Missing = unassigned (a legacy Character counts as Character). */
  role?: Role;
  /** At most one per roster; requires `isCharacter`. */
  isWarlord: boolean;
  enhancement?: string;
  /** Characters only. Shown as "Name, the Title". */
  title?: string;
  /** Characters only. Plain text, at most 280 characters. */
  backstory?: string;
  /** The Warlord only. Free text. */
  warlordTrait?: string;
  /** Characters only. Names from `RELICS`, at most 3, no duplicates. */
  relics?: string[];
  /** Characters only. Battle Training bought with Promotion: free text, at most 3. */
  training?: string[];
  /** Toughness (highest T among its models). Missing = unknown; never flagged. */
  t?: number;
  /** Career record, every unit. Missing = 0. */
  battles?: number;
  kills?: number;
  /** True for example units added by "Add example units". Examples never log a Legend. */
  ex?: boolean;
  /** Set once "becomes a Legend of the Reach" has been logged, so it is only logged once. */
  legendLogged?: boolean;
}

/** One unit's line in a post-battle report. The UI resolves every die and passes the finished result. */
export interface PostBattleResult {
  unitId: string;
  fought: boolean;
  /** Only valid if `fought`. */
  destroyed: boolean;
  kills: number;
  /** True for the one unit Marked for Glory (+2 XP). At most one per report. */
  glory: boolean;
  /** Replaces the computed XP gain when set. */
  xpOverride?: number;
  /** New honours chosen/rolled (names, none already held). Count must not exceed `honoursOwed`. */
  honours?: string[];
  /** The D6 for the fallen. Required if `destroyed`, except for the Warlord (which never rolls; ignored). */
  fallenRoll?: number;
  /**
   * Scar name. Characters: from `CHAR_SCARS` (or legacy `SCARS`); others: `SCARS`. Required when the fallen roll
   * leaves the unit scarred, and ALWAYS required when a destroyed unit is the Warlord (no fallenRoll needed).
   * Ignored otherwise.
   */
  scar?: string;
  /** Weapon for a Worn Gear scar. */
  scarWeapon?: string;
}

/** A Character remembered in the Hall of Heroes. A snapshot: it does not change after it is stored. */
export interface FallenCharacter {
  id: string;
  playerId: string;
  playerName: string;
  name: string;
  title?: string;
  datasheet: string;
  /** Rank name at death. */
  rank: string;
  battles: number;
  kills: number;
  relics: string[];
  cause: string;
  /** War Round it fell in. */
  round: number;
  /** True for example entries added by "Add example units". */
  ex?: true;
}

/** The battle behind a pick once its twists are rolled ("In battle"). Its figures are fixed at the roll. */
export interface LiveBattle {
  /** The defender, or the garrison player. */
  def: string;
  /** True for a fight against an unclaimed province's garrison. */
  garrison: boolean;
  twists: number[];
  /** Figures worked out when the twists were rolled. A re-roll works them out again. */
  pts: number;
  /** Attacker's points: equals `pts` unless this is a garrison battle (+20%). */
  attackerPts: number;
  notes: string[];
  cards: number;
  lightForces: boolean;
}

/** One player's pick for the current War Round. Planning: act, target and ready. Resolution: the rest. */
export interface RoundPick {
  /** Null only for a slot that was already finished when a pre-simultaneous save was converted. */
  act: ActionId | null;
  /** Target province (or "holl") for Conquer, Raid and Fortify. */
  zone?: string;
  /** Garrison player chosen in Planning for an unclaimed province (Conquer). */
  def?: string;
  /** Marked Ready in Planning. */
  ready: boolean;
  /** Set once the twists are rolled: the pick is In battle until the result is recorded. */
  battle?: LiveBattle;
  /** Result recorded, or quiet action confirmed. */
  done?: boolean;
  /** Why the pick fell through when it was cancelled outright (a player in the battle was removed). */
  fell?: string;
}

/** The phase of the War Round in progress. Null between rounds. */
export type RoundPhase = "planning" | "resolution";

/** How a pick stands, derived live from the shared state. */
export type PickStatus =
  | { kind: "ready" }
  | { kind: "battle" }
  | { kind: "waiting"; on: string }
  | { kind: "fell"; reason: string }
  | { kind: "done" };

/** One recorded battle result, from the attacker's side. Kept small: it is saved with the campaign. */
export interface BattleRecord {
  round: number;
  /** Attacker id and the name they had at the time. */
  att: string;
  attName: string;
  /** Defender id and saved name. Missing for a garrison fight (the garrison player takes no part). */
  def?: string;
  defName?: string;
  /** Province (or "holl") id and name, and the world name (missing for the Hollowgate). */
  prov: string;
  provName: string;
  world?: string;
  kind: "conquer" | "raid";
  /** True for a fight against an unclaimed province's garrison. */
  garrison?: true;
  /** "a" attacker won, "d" defender (or garrison) won, "x" draw. */
  out: "a" | "d" | "x";
  /** True when the attacker took the province (a Conquer win). */
  took?: true;
}

/** The parts of the campaign a battle result can change. Restored by Undo. */
export type UndoSnapshot = Pick<
  CampaignState,
  "round" | "phase" | "order" | "picks" | "log" | "won" | "fort" | "terr" | "players" | "hollOpened"
>;

/** The open Undo window for the latest battle result. Present only while Undo is still possible. */
export interface UndoInfo {
  /** The campaign just before the result. */
  before: UndoSnapshot;
  attacker: string;
  /** The defender, or the garrison player. */
  defender?: string;
  /** True once a post-battle report has been filed since the result: Undo is then blocked. */
  reportFiled: boolean;
  /** Log lines added by roster actions after the result (newest first), kept when the result is undone. */
  later: LogEntry[];
}

export interface CampaignState {
  round: number;
  /** Null between War Rounds. */
  phase: RoundPhase | null;
  /** Round-start order (fewest provinces first). Fixed for the round; it decides who goes first in a clash. */
  order: string[];
  /** This round's picks by player id. A slot (a player in `order`) with no pick is still Choosing. */
  picks: Record<string, RoundPick>;
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
  /** Unit rosters keyed by player id. Missing on old saves = every roster empty. */
  rosters?: Record<string, Unit[]>;
  /** Hall of Heroes memorial, oldest first (show newest first). Missing on old saves = none. */
  fallen?: FallenCharacter[];
  /** Round-0 setup: players who ticked Ready. Missing = nobody ready. */
  ready?: Record<string, true>;
  /** Set once the 0 RP start has been applied; an older round-0 save without it has its players' RP zeroed once on load. */
  rpStartZero?: boolean;
  /** Battle history, oldest first. Missing on old saves = empty. */
  history?: BattleRecord[];
  /** Undo window for the latest battle result. Missing = nothing to undo. */
  undo?: UndoInfo;
  /** Owner-switched campaign rules. Missing object or key = default (forceOrg on, the rest off). */
  toggles?: Partial<Record<ToggleKey, boolean>>;
}

export type ToggleKey = "forceOrg" | "datasheetLimit" | "toughnessStages" | "knights";

/** A rolled battle with its zone and both players looked up (`d` stands in for `def`). */
export type BattleInfo = Omit<LiveBattle, "def"> & {
  v: Zone;
  a: Player;
  d: Player;
  trait: { n: string; trait: string };
};

export type Action =
  | { type: "beginRound" }
  | { type: "readyPick"; playerId: string; act: ActionId; zone?: string; def?: string }
  | { type: "unreadyPick"; playerId: string }
  | { type: "revealPicks" }
  | { type: "rollPick"; playerId: string; def?: string }
  | { type: "rerollPick"; playerId: string }
  | { type: "resolvePick"; playerId: string; result: "a" | "d" | "x"; decisive?: boolean }
  | { type: "confirmQuietPick"; playerId: string }
  | { type: "switchPick"; playerId: string; act: ActionId; zone?: string; def?: string }
  | { type: "undoBattle"; attacker: string }
  | { type: "drawCard"; playerId: string }
  | { type: "playCard"; playerId: string; index: number }
  | { type: "discardCard"; playerId: string; index: number }
  | { type: "buyReinforcements"; playerId: string }
  | { type: "adjustStat"; playerId: string; stat: StatKey; delta: number }
  | { type: "setProvinceOwner"; provId: string; playerId: string | null }
  | { type: "updatePlayer"; playerId: string; name?: string; faction?: FactionName }
  | { type: "addPlayer"; id: string; name: string; faction: FactionName; userId?: string; email?: string }
  | { type: "removePlayer"; playerId: string }
  | { type: "addUnit"; playerId: string; unit: Unit }
  | { type: "updateUnit"; playerId: string; unit: Unit }
  | { type: "removeUnit"; playerId: string; unitId: string; cause?: string }
  | { type: "addRelic"; playerId: string; unitId: string; relic: string; source: "shrine" | "fate" }
  | { type: "removeRelic"; playerId: string; unitId: string; relic: string }
  | { type: "deleteFallen"; id: string }
  | { type: "applyPostBattle"; playerId: string; results: PostBattleResult[] }
  | { type: "addExamples"; playerId: string }
  | { type: "clearExamples"; playerId: string }
  | { type: "setReady"; playerId: string; ready: boolean }
  | { type: "fieldSurgeon"; playerId: string; unitId: string; scar: string }
  | { type: "promotion"; playerId: string; unitId: string; training?: string }
  | { type: "seasonedRecruits"; playerId: string; unit: Unit }
  | { type: "setToggle"; key: ToggleKey; on: boolean }
  | { type: "regen" }
  | { type: "reset" };

export type ActionType = Action["type"];
