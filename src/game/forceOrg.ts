// Force Organisation: a guidance chart of how many units of each battlefield role a warband may field.
// Pure. Nothing here blocks an action; the UI shows warnings only.
import { VTYPES } from "./data.ts";
import { provsOf, getPlayer } from "./selectors.ts";
import type { CampaignState, ProvinceType, Role, Unit } from "./types.ts";

/** Most extra slots a role can earn from holdings. */
export const HOLDING_CAP = 3;

export interface RoleDef {
  role: Role;
  /** Slots everyone has. */
  base: number;
  /** Units needed for the whole campaign (a warning, never a block). */
  min: number;
  /** Province types that each grant +1 slot. A Capital counts as a Spaceport. */
  from: readonly ProvinceType[];
}

export const ROLES: readonly RoleDef[] = [
  { role: "Character", base: 2, min: 1, from: ["shrine"] },
  { role: "Battleline", base: 5, min: 2, from: ["fortress"] },
  { role: "Infantry", base: 4, min: 0, from: ["hive"] },
  { role: "Mounted", base: 1, min: 0, from: ["settlement"] },
  { role: "Vehicle / Monster", base: 1, min: 0, from: ["forge", "refinery"] },
  { role: "Other", base: 1, min: 0, from: ["spaceport", "capital"] },
];

export const ROLE_NAMES: readonly Role[] = ROLES.map((r) => r.role);

export function isRole(x: unknown): x is Role {
  return typeof x === "string" && ROLE_NAMES.includes(x as Role);
}

/** A stored role as a current Role. Legacy "Vehicle" and "Monster" become "Vehicle / Monster"; anything else unknown is undefined. */
export function normaliseRole(x: unknown): Role | undefined {
  if (x === "Vehicle" || x === "Monster") return "Vehicle / Monster";
  return isRole(x) ? x : undefined;
}

/** The unit's role. A legacy Character with no role counts as Character; otherwise undefined (unassigned). */
export function roleOf(unit: Pick<Unit, "role" | "isCharacter">): Role | undefined {
  return normaliseRole(unit.role) ?? (unit.isCharacter ? "Character" : undefined);
}

export interface RoleSource {
  /** Holding label: "Forge", ... or "Capital". */
  label: string;
  /** Province name, e.g. "Thessaly Works". */
  province: string;
}

export interface ForceOrgRow {
  role: Role;
  /** Units of this role on the roster. */
  filled: number;
  base: number;
  min: number;
  /** base + min(HOLDING_CAP, matching). */
  max: number;
  /** Setup only: replaces the "Base N" source line (e.g. "One Character: your Warlord"). */
  note?: string;
  /** Matching provinces held (uncapped). */
  matching: number;
  /** Every matching province held (the UI shows the first 3). */
  sources: RoleSource[];
}

export interface ForceOrg {
  rows: ForceOrgRow[];
  /** Units with no role (fill no slot). */
  unassigned: number;
  /** Ids of the last N units of each role (roster order) where filled exceeds max. */
  overLimitIds: string[];
}

export function forceOrgFor(state: CampaignState, playerId: string): ForceOrg {
  const player = getPlayer(state, playerId);
  const held = player ? provsOf(state, player) : [];
  // Read directly rather than via rosterOf: roster.ts imports isRole from here.
  const units = state.rosters?.[playerId] ?? [];
  const byRole = new Map<Role, Unit[]>();
  let unassigned = 0;
  for (const u of units) {
    const r = roleOf(u);
    if (!r) unassigned++;
    else byRole.set(r, [...(byRole.get(r) ?? []), u]);
  }
  const overLimitIds: string[] = [];
  const rows = ROLES.map((def): ForceOrgRow => {
    const sources = held
      .filter((v) => def.from.includes(v.type))
      .map((v) => ({ label: VTYPES[v.type].n, province: v.name }));
    const mine = byRole.get(def.role) ?? [];
    // Setup (round 0): one Character, the Warlord, so the row is held at 1 and its minimum is left to the checklist.
    const setupChar = state.round === 0 && def.role === "Character";
    const max = setupChar ? 1 : def.base + Math.min(HOLDING_CAP, sources.length);
    if (mine.length > max) overLimitIds.push(...mine.slice(max).map((u) => u.id));
    const row: ForceOrgRow = { role: def.role, filled: mine.length, base: setupChar ? 1 : def.base, min: setupChar ? 0 : def.min, max, matching: sources.length, sources };
    if (setupChar) row.note = "One Character: your Warlord";
    return row;
  });
  return { rows, unassigned, overLimitIds };
}
