// Battle army lists: which roster units each side fields in a rolled battle, and at what points.
import { roleOf, ROLES } from "./forceOrg.ts";
import { effectivePoints, rosterOf } from "./roster.ts";
import type { ArmyList, BattleTally, CampaignState, LiveBattle, Unit } from "./types.ts";

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
  if (!b || pk.done || b.started || !armySides(b, attackerId).includes(side) || !isArmyList(list)) return false;
  (b.lists ??= {})[side] = fixArmy(list, rosterOf(s, side));
  return true;
}

/** Start a rolled battle, or go back to army lists keeping the tally (mutates `s`). */
export function setBattleStarted(s: CampaignState, attackerId: string, on: boolean): boolean {
  const pk = s.picks[attackerId];
  const b = pk?.battle;
  if (!b || pk.done || typeof on !== "boolean") return false;
  if (on) b.started = true;
  else delete b.started;
  return true;
}

/** A side's tally in a started battle, if `unitId` is in its list. */
function tallyFor(s: CampaignState, attackerId: string, side: string, unitId: string): BattleTally | null {
  const pk = s.picks[attackerId];
  const b = pk?.battle;
  if (!b?.started || pk.done || !armySides(b, attackerId).includes(side)) return null;
  if (!armyOf(s, b, side).units.includes(unitId)) return null;
  return ((b.tally ??= {})[side] ??= { units: {} });
}

/** Set a fielded unit's losses and kills in a started battle (mutates `s`). Values are absolute, so a retry is safe. */
export function tallyUnit(s: CampaignState, attackerId: string, side: string, unitId: string, destroyed: boolean, kills: number): boolean {
  if (typeof destroyed !== "boolean" || !Number.isInteger(kills) || kills < 0 || kills > 99) return false;
  const t = tallyFor(s, attackerId, side, unitId);
  if (!t) return false;
  if (destroyed || kills > 0) t.units[unitId] = { ...(destroyed && { destroyed: true }), ...(kills > 0 && { kills }) };
  else delete t.units[unitId];
  return true;
}

/** Name a side's unit Marked for Glory in a started battle, or clear it with null (mutates `s`). */
export function markGlory(s: CampaignState, attackerId: string, side: string, unitId: string | null): boolean {
  if (unitId === null) {
    const pk = s.picks[attackerId];
    const b = pk?.battle;
    if (!b?.started || pk.done || !armySides(b, attackerId).includes(side)) return false;
    const t = b.tally?.[side];
    if (t) delete t.glory;
    return true;
  }
  const t = tallyFor(s, attackerId, side, unitId);
  if (!t) return false;
  t.glory = unitId;
  return true;
}

/**
 * Remember each side's fielded units and any tally (even after going back to army lists) when a result is
 * recorded, for the post-battle helper (mutates `s`). Tallies keep only units still in the list.
 */
export function rememberArmies(s: CampaignState, attackerId: string, b: LiveBattle): void {
  const last = (s.lastArmy ??= {});
  for (const side of armySides(b, attackerId)) {
    const units = armyOf(s, b, side).units;
    last[side] = units;
    const t = b.tally?.[side];
    if (t) {
      const kept = Object.fromEntries(Object.entries(t.units).filter(([id]) => units.includes(id)));
      (s.lastTally ??= {})[side] = { units: kept, ...(t.glory && units.includes(t.glory) && { glory: t.glory }) };
    } else if (s.lastTally) delete s.lastTally[side];
  }
}
