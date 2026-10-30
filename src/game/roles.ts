// Unit roles, and the two role rules every campaign keeps: Character slots and a Battleline minimum.
// Pure. `capProblem` in roster.ts uses `roleRules` to refuse saves that add a Character past its slots.
import { VTYPES } from "./data.ts";
import { provsOf, getPlayer } from "./selectors.ts";
import { provinceBonus } from "./version.ts";
import type { CampaignState, ProvinceType, Role, Unit, Zone } from "./types.ts";

export const ROLE_NAMES: readonly Role[] = ["Character", "Battleline", "Non-Monster / Vehicle", "Vehicle / Monster", "Other"];

/** Character slots everyone has; each Shrine held adds one, up to SHRINE_SLOT_CAP more. */
export const CHARACTER_SLOTS = 1;
export const SHRINE_SLOT_CAP = 3;
/** Units of each role a warband needs for the whole campaign (a warning, never a block). */
export const CHARACTER_MIN = 1;
export const BATTLELINE_MIN = 2;

/** What holding this type gives: its bonus text, plus a Character slot for a Shrine. */
export function typeGains(state: Pick<CampaignState, "rules">, type: ProvinceType): string {
  return type === "shrine" ? `${VTYPES[type].bonus} +1 Character slot.` : provinceBonus(state, type);
}

/** What holding this zone gives its holder, in one line. */
export function holderGains(state: Pick<CampaignState, "rules">, v: Zone): string {
  return v.type === "rift" ? "Hold it when the War Round ends to win the Reach." : typeGains(state, v.type);
}

export function isRole(x: unknown): x is Role {
  return typeof x === "string" && ROLE_NAMES.includes(x as Role);
}

/** A stored role as a current Role. Legacy "Vehicle" and "Monster" become "Vehicle / Monster", legacy "Infantry", "Mounted" and "Infantry / Mounted" become "Non-Monster / Vehicle"; anything else unknown is undefined. */
export function normaliseRole(x: unknown): Role | undefined {
  if (x === "Vehicle" || x === "Monster") return "Vehicle / Monster";
  if (x === "Infantry" || x === "Mounted" || x === "Infantry / Mounted") return "Non-Monster / Vehicle";
  return isRole(x) ? x : undefined;
}

/** The unit's role. A legacy Character with no role counts as Character; otherwise undefined (unassigned). */
export function roleOf(unit: Pick<Unit, "role" | "isCharacter">): Role | undefined {
  return normaliseRole(unit.role) ?? (unit.isCharacter ? "Character" : undefined);
}

export interface RoleRow {
  role: Role;
  filled: number;
  min: number;
  /** Units short of the minimum. */
  short: number;
  /** Slot limit: Character only (Battleline has a minimum but no limit). */
  max?: number;
  /** Units over the slot limit (always 0 without one). */
  over: number;
}

export interface RoleRules {
  /** Character, then Battleline. */
  rows: RoleRow[];
  /** Ids of the Characters (roster order) past the slot limit. */
  overLimitIds: string[];
}

export function roleRules(state: CampaignState, playerId: string): RoleRules {
  const player = getPlayer(state, playerId);
  // Read directly rather than via rosterOf: roster.ts imports isRole from here.
  const units = state.rosters?.[playerId] ?? [];
  const chars = units.filter((u) => roleOf(u) === "Character");
  const battleline = units.filter((u) => roleOf(u) === "Battleline").length;
  // Setup (round 0): one Character, the Warlord, so the limit is held at 1 (Shrines ignored) and its minimum is left to the checklist.
  const setup = state.round === 0;
  const shrines = player ? provsOf(state, player).filter((v) => v.type === "shrine").length : 0;
  const max = setup ? 1 : CHARACTER_SLOTS + Math.min(SHRINE_SLOT_CAP, shrines);
  const charMin = setup ? 0 : CHARACTER_MIN;
  return {
    rows: [
      { role: "Character", filled: chars.length, min: charMin, short: Math.max(0, charMin - chars.length), max, over: Math.max(0, chars.length - max) },
      { role: "Battleline", filled: battleline, min: BATTLELINE_MIN, short: Math.max(0, BATTLELINE_MIN - battleline), over: 0 },
    ],
    overLimitIds: chars.slice(max).map((u) => u.id),
  };
}
