// Force Organisation: a guidance chart of how many units of each battlefield role a warband may field.
// Pure. Nothing here blocks an action; the UI shows warnings only.
import { VTYPES } from "./data.ts";
import { provsOf, getPlayer } from "./selectors.ts";
import { toggleOn } from "./toggles.ts";
import type { CampaignState, ProvinceType, Role, Unit, Zone } from "./types.ts";

/** Most extra slots a role can earn from holdings, unless its RoleDef sets its own cap. */
export const HOLDING_CAP = 3;

export interface RoleDef {
  role: Role;
  /** Slots everyone has. */
  base: number;
  /** Units needed for the whole campaign (a warning, never a block). */
  min: number;
  /** Province types that each grant +1 slot. */
  from: readonly ProvinceType[];
  /** What the role covers, shown under its name where the name alone is unclear. */
  covers?: string;
  /** Most extra slots from holdings (default HOLDING_CAP). */
  cap?: number;
  /** Has no slots of its own: its units fill this role's slots instead. */
  slotsIn?: Role;
}

export const ROLES: readonly RoleDef[] = [
  { role: "Character", base: 1, min: 1, from: ["shrine"] },
  { role: "Battleline", base: 0, min: 2, from: [], slotsIn: "Non-Monster / Vehicle" },
  { role: "Non-Monster / Vehicle", base: 6, min: 0, from: ["fortress", "hive", "settlement"], cap: 6, covers: "Battleline, Infantry, Mounted, Beasts, Swarms" },
  { role: "Vehicle / Monster", base: 1, min: 0, from: ["forge", "refinery"], covers: "Walkers, tanks, Monsters, Aircraft" },
  { role: "Other", base: 2, min: 0, from: ["spaceport"], covers: "Dedicated Transports, Fortifications" },
];

export const ROLE_NAMES: readonly Role[] = ROLES.map((r) => r.role);

/** The role whose slots a unit of this role fills: Battleline fills Non-Monster / Vehicle, the rest their own. */
export function slotRole(role: Role): Role {
  return ROLES.find((r) => r.role === role)?.slotsIn ?? role;
}

/** The role a holding of this type adds a slot to, if any. */
export function slotRoleOf(type: ProvinceType): Role | undefined {
  return ROLES.find((r) => r.from.includes(type))?.role;
}

/** What holding this type gives: its bonus text, plus its slot when Force Organisation is on. */
export function typeGains(type: ProvinceType, slots: boolean): string {
  const role = slots ? slotRoleOf(type) : undefined;
  return role ? `${VTYPES[type].bonus} +1 ${role} slot.` : VTYPES[type].bonus;
}

/** What holding this zone gives its holder, in one line. */
export function holderGains(state: CampaignState, v: Zone): string {
  return v.type === "rift" ? "Hold it when the War Round ends to win the Reach." : typeGains(v.type, toggleOn(state, "forceOrg"));
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

export interface RoleSource {
  /** Holding label: "Forge", ... or "Capital". */
  label: string;
  /** Province name, e.g. "Thessaly Works". */
  province: string;
}

export interface ForceOrgRow {
  role: Role;
  /** Units filling this row: its own role, plus any role whose slotsIn is this one. */
  filled: number;
  base: number;
  min: number;
  /** base + min(cap, matching). For a slotsIn row, the max of the row it fills. */
  max: number;
  /** Most extra slots from holdings. */
  cap: number;
  /** Units short of the minimum. */
  short: number;
  /** Units over the slot limit (always 0 for a slotsIn row: its units count on the row they fill). */
  over: number;
  /** Has no slots of its own: its units fill this role's slots. */
  slotsIn?: Role;
  covers?: string;
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
  const unassigned = units.filter((u) => !roleOf(u)).length;
  const overLimitIds: string[] = [];
  const slotRows = new Map<Role, ForceOrgRow>();
  for (const def of ROLES) {
    if (def.slotsIn) continue;
    const sources = held
      .filter((v) => def.from.includes(v.type))
      .map((v) => ({ label: VTYPES[v.type].n, province: v.name }));
    // Roster order across every role that fills these slots, so the latest additions are the ones over limit.
    const mine = units.filter((u) => {
      const r = roleOf(u);
      return !!r && slotRole(r) === def.role;
    });
    // Setup (round 0): one Character, the Warlord, so the row is held at 1 (Shrines ignored) and its minimum is left to the checklist.
    const setupChar = state.round === 0 && def.role === "Character";
    const cap = def.cap ?? HOLDING_CAP;
    const max = setupChar ? 1 : def.base + Math.min(cap, sources.length);
    if (mine.length > max) overLimitIds.push(...mine.slice(max).map((u) => u.id));
    const min = setupChar ? 0 : def.min;
    const row: ForceOrgRow = { role: def.role, filled: mine.length, base: def.base, min, max, cap, short: Math.max(0, min - mine.length), over: Math.max(0, mine.length - max), matching: sources.length, sources };
    if (def.covers) row.covers = def.covers;
    if (setupChar) row.note = "One Character: your Warlord";
    slotRows.set(def.role, row);
  }
  // Chart order: a slotsIn row (Battleline) keeps its place, with a minimum but no slots of its own.
  const rows = ROLES.map((def): ForceOrgRow => {
    const own = slotRows.get(def.role);
    if (own) return own;
    const filled = units.filter((u) => roleOf(u) === def.role).length;
    return { role: def.role, filled, base: 0, min: def.min, max: slotRows.get(def.slotsIn ?? def.role)?.max ?? 0, cap: 0, short: Math.max(0, def.min - filled), over: 0, matching: 0, sources: [], ...(def.slotsIn && { slotsIn: def.slotsIn }) };
  });
  return { rows, unassigned, overLimitIds };
}
