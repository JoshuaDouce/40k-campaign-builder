// Battle army lists: which roster units each side fields in a rolled battle, and at what points.
import { BATTLELINE_MIN, roleOf } from "./roles.ts";
import type { Rng } from "./rng.ts";
import { allowedScars, applyBattleProgress, applyFallen, effectivePoints, fallenPlan, inRange, rosterOf, scarTableFor, WEAPON_MAX, WORN_GEAR } from "./roster.ts";
import { getZone } from "./selectors.ts";
import type { ArmyList, BattleTally, CampaignState, LiveBattle, RemovedUnit, Unit, UndoSnapshot, UnitTally } from "./types.ts";

/** Battleline units a list must field (fewer only when the roster has fewer). */
export const ARMY_BATTLELINE_MIN = BATTLELINE_MIN;

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

/** The units a side fields in a rolled battle, in roster order (as `rosterOf` shows them). */
export function fieldedUnits(s: CampaignState, b: Pick<LiveBattle, "lists">, side: string): readonly Unit[] {
  const ids = new Set(armyOf(s, b, side).units);
  return rosterOf(s, side).filter((u) => ids.has(u.id));
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
  const old = t.units[unitId];
  // Unticking Destroyed clears the fallen rolls; ticking it again keeps whatever is there.
  const entry: UnitTally = destroyed && old?.destroyed ? { ...old } : destroyed ? { destroyed: true } : {};
  if (kills > 0) entry.kills = kills;
  else delete entry.kills;
  if (Object.keys(entry).length > 0) t.units[unitId] = entry;
  else delete t.units[unitId];
  return true;
}

/** A field of `tallyFallen`: missing or null clears it. */
type Roll = number | null | undefined;

/**
 * Set a destroyed unit's fallen rolls in a started battle (mutates `s`). Values are absolute (missing or null clears a
 * field), so a retry is safe. Refused unless the unit is tallied Destroyed, for a fallen D6 on the Warlord, for a die
 * out of range, a scar that is not one the unit may hold, or a weapon over 60 characters. A roll that leaves the unit
 * unscarred clears the scar fields, and a scar other than Worn Gear clears the weapon.
 */
export function tallyFallen(
  s: CampaignState,
  attackerId: string,
  side: string,
  unitId: string,
  fallen: Roll,
  scarRoll: Roll,
  scarPick: string | null | undefined,
  weapon: string | null | undefined
): boolean {
  const t = tallyFor(s, attackerId, side, unitId);
  const unit = rosterOf(s, side).find((u) => u.id === unitId);
  const old = t?.units[unitId];
  if (!t || !unit || !old?.destroyed) return false;
  if ((fallen != null && !inRange(fallen, 6)) || (scarRoll != null && !inRange(scarRoll, scarTableFor(unit).length))) return false;
  if (fallen != null && unit.isWarlord) return false;
  if (scarPick != null && (typeof scarPick !== "string" || !allowedScars(unit).some((x) => x.n === scarPick))) return false;
  const w = weapon ?? undefined;
  if (w !== undefined && (typeof w !== "string" || w.trim().length > WEAPON_MAX)) return false;

  const entry: UnitTally = {
    destroyed: true,
    ...(old.kills !== undefined && { kills: old.kills }),
    ...(fallen != null && { fallen }),
    ...(scarRoll != null && { scarRoll }),
    ...(scarPick != null && { scarPick }),
    ...(w !== undefined && w.trim() !== "" && { weapon: w.trim() }),
  };
  const plan = fallenPlan(unit, entry);
  if (!plan.scarred) {
    delete entry.scarRoll;
    delete entry.scarPick;
    delete entry.weapon;
  } else if (plan.scar !== WORN_GEAR) delete entry.weapon;
  t.units[unitId] = entry;
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

/** What Undo needs to take back a recorded result: the fielded units as they were, and those a third scar removed. */
export type BattleUndo = Required<Pick<UndoSnapshot, "rosters" | "removed">>;

/**
 * Apply a recorded battle to both sides' fielded units, tracked or not (mutates `s`): +1 battle, kills, XP, Glory,
 * Grievous Wound healing, rank-ups, then the fallen for every Destroyed unit (the rolls entered on the tally, the rest
 * rolled with `rng`; see `applyFallen`). An untouched tally means no losses and no kills. A battle at a Shrine
 * (`zone`) gives the Marked for Glory unit its +1 XP too. Returns what Undo needs.
 */
export function applyBattleResult(s: CampaignState, attackerId: string, b: LiveBattle, rng: Rng, zone?: string): BattleUndo {
  const shrine = !!zone && getZone(s, zone)?.type === "shrine";
  const rosters: Record<string, Unit[]> = {};
  const removed: Record<string, RemovedUnit[]> = {};
  for (const side of armySides(b, attackerId)) {
    const ids = armyOf(s, b, side).units;
    // The stored units, not rosterOf's view (or fieldedUnits), which hides switched-off training and relics.
    const roster = s.rosters?.[side];
    if (!roster?.length) continue;
    rosters[side] = structuredClone(roster.filter((u) => ids.includes(u.id)));
    const t = b.tally?.[side];
    const tally: BattleTally = {
      units: Object.fromEntries(Object.entries(t?.units ?? {}).filter(([id]) => ids.includes(id))),
      ...(t?.glory && ids.includes(t.glory) && { glory: t.glory }),
    };
    applyBattleProgress(s, side, ids, tally, shrine);
    const lost = applyFallen(s, side, ids, tally, rng);
    if (lost.length) removed[side] = lost;
  }
  return { rosters, removed };
}
