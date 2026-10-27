// Battle army lists: which roster units each side fields in a rolled battle, and at what points.
import { roleOf, ROLES } from "./forceOrg.ts";
import { effectivePoints, rosterOf } from "./roster.ts";
import type { ArmyList, CampaignState, LiveBattle, Unit } from "./types.ts";

/** Battleline units a list must field (fewer only when the roster has fewer). */
export const ARMY_BATTLELINE_MIN = ROLES.find((r) => r.role === "Battleline")?.min ?? 2;

/** Why a unit can't be taken out of a list, or null if it can. */
export type ArmyLock = "warlord" | "onlyBattleline" | "battlelineMin" | null;

export const isBattleline = (u: Unit): boolean => roleOf(u) === "Battleline";

/** The players who build a list for this battle: the attacker, and the defender unless it is a garrison. */
export function armySides(b: Pick<LiveBattle, "def" | "garrison">, attackerId: string): string[] {
  return b.garrison ? [attackerId] : [attackerId, b.def];
}

/** A side's points limit: the battle's figure for that side (garrison edge and Underdog included). */
export function armyLimit(b: Pick<LiveBattle, "pts" | "attackerPts" | "defenderPts">, attackerId: string, side: string): number {
  // `?? b.pts` covers very old saves that predate attackerPts.
  return (side === attackerId ? b.attackerPts : b.defenderPts) ?? b.pts;
}

/**
 * The list made legal for the roster as it is now: units still on the roster, in roster order, with the Warlord
 * and at least 2 Battleline (topped up in roster order). Fielded points are kept only when below the unit's points.
 */
export function fixArmy(list: ArmyList, roster: readonly Unit[]): ArmyList {
  const want = new Set(list.units);
  for (const u of roster) if (u.isWarlord) want.add(u.id);
  let battleline = roster.filter((u) => isBattleline(u) && want.has(u.id)).length;
  for (const u of roster) {
    if (battleline >= ARMY_BATTLELINE_MIN) break;
    if (isBattleline(u) && !want.has(u.id)) {
      want.add(u.id);
      battleline++;
    }
  }
  const units = roster.filter((u) => want.has(u.id));
  const field: Record<string, number> = {};
  for (const u of units) {
    const f = list.field?.[u.id];
    if (typeof f === "number" && Number.isInteger(f) && f >= 1 && f < effectivePoints(u)) field[u.id] = f;
  }
  return { units: units.map((u) => u.id), ...(Object.keys(field).length > 0 && { field }) };
}

/** A side's list for a rolled battle: what they saved, or the Warlord and 2 Battleline. Always legal. */
export function armyOf(s: CampaignState, b: Pick<LiveBattle, "lists">, side: string): ArmyList {
  return fixArmy(b.lists?.[side] ?? { units: [] }, rosterOf(s, side));
}

/** Points a unit takes the field at in this list (its full points unless fielded smaller). */
export function fieldedPoints(list: ArmyList, u: Unit): number {
  return list.field?.[u.id] ?? effectivePoints(u);
}

export function armyPoints(list: ArmyList, roster: readonly Unit[]): number {
  return roster.reduce((sum, u) => (list.units.includes(u.id) ? sum + fieldedPoints(list, u) : sum), 0);
}

/** Why a fielded unit is locked in (unfielded units are never locked). */
export function armyLock(list: ArmyList, roster: readonly Unit[], u: Unit): ArmyLock {
  if (!list.units.includes(u.id)) return null;
  if (u.isWarlord) return "warlord";
  if (!isBattleline(u)) return null;
  // With no spare Battleline on the roster there is nothing to swap to.
  if (roster.filter(isBattleline).length <= ARMY_BATTLELINE_MIN) return "onlyBattleline";
  return roster.filter((x) => isBattleline(x) && list.units.includes(x.id)).length <= ARMY_BATTLELINE_MIN ? "battlelineMin" : null;
}

function isArmyList(v: unknown): v is ArmyList {
  if (typeof v !== "object" || v === null) return false;
  const { units, field } = v as Partial<ArmyList>;
  if (!Array.isArray(units) || !units.every((id) => typeof id === "string")) return false;
  return field === undefined || (typeof field === "object" && field !== null && Object.values(field).every((n) => typeof n === "number"));
}

/** Save a side's list for a rolled battle that has no result yet (mutates `s`). */
export function setArmyList(s: CampaignState, attackerId: string, side: string, list: unknown): boolean {
  const pk = s.picks[attackerId];
  const b = pk?.battle;
  if (!b || pk.done || !armySides(b, attackerId).includes(side) || !isArmyList(list)) return false;
  (b.lists ??= {})[side] = fixArmy(list, rosterOf(s, side));
  return true;
}

/** Remember each side's fielded units when a result is recorded, for the post-battle helper (mutates `s`). */
export function rememberArmies(s: CampaignState, attackerId: string, b: LiveBattle): void {
  const last = (s.lastArmy ??= {});
  for (const side of armySides(b, attackerId)) last[side] = armyOf(s, b, side).units;
}
