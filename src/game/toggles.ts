// Campaign rule toggles: six owner-switched rules, plus the datasheet / Toughness-stage / Knights helpers.
// Pure and read-only. Roster saves in roster.ts call the block checks; the UI uses them for messages.
import { getPlayer, supplyOf } from "./selectors.ts";
import { musterSupply } from "./version.ts";
import type { ActionDef, CampaignState, Player, ToggleKey, Unit } from "./types.ts";

export const TOGGLE_KEYS: readonly ToggleKey[] = ["twists", "training", "relics", "datasheetLimit", "toughnessStages", "knights"];

/** Names used in the Rules tab and the log. */
export const TOGGLE_NAMES: Readonly<Record<ToggleKey, string>> = {
  twists: "Mission Twists",
  training: "Battle Training",
  relics: "Relics",
  datasheetLimit: "Datasheet limit",
  toughnessStages: "Toughness stages",
  knights: "Knights exemption",
};

/** Defaults when the campaign has no toggle data: today's rules. */
export const TOGGLE_DEFAULTS: Readonly<Record<ToggleKey, boolean>> = {
  twists: true,
  training: true,
  relics: true,
  datasheetLimit: true,
  toughnessStages: false,
  knights: false,
};

export function isToggleKey(x: unknown): x is ToggleKey {
  return typeof x === "string" && (TOGGLE_KEYS as readonly string[]).includes(x);
}

/** True if the rule is on. Old saves may still hold a `forceOrg` key: it is ignored. */
export function toggleOn(state: Pick<CampaignState, "toggles">, key: ToggleKey): boolean {
  return state.toggles?.[key] ?? TOGGLE_DEFAULTS[key];
}

/** Scout's rules text while Mission Twists are off (no twist to swap). */
export const SCOUT_NO_TWISTS = "Draw 1 Fate Card.";

/** An action's rules text as this campaign plays it: Scout's twist swap is left out while Mission Twists are off. */
export function actionDesc(state: Pick<CampaignState, "toggles" | "rules">, a: Pick<ActionDef, "id" | "d">): string {
  if (a.id === "muster") return `+${musterSupply(state)} pts to your supply limit and draw 1 Fate Card.`;
  return a.id === "scout" && !toggleOn(state, "twists") ? SCOUT_NO_TWISTS : a.d;
}

/** Toggle names that are on, in panel order. */
export function togglesOn(state: Pick<CampaignState, "toggles">): ToggleKey[] {
  return TOGGLE_KEYS.filter((k) => toggleOn(state, k));
}

/** Highest Toughness allowed while Toughness stages is active. */
export const STAGE_MAX_TOUGHNESS = 11;
/** The stage cap lifts once a player's supply limit reaches this. */
export const STAGE_SUPPLY = 1250;
/** Last War Round the stage cap applies in. */
export const STAGE_LAST_ROUND = 2;

/* ---------- Datasheet limit ---------- */

/** Datasheet name folded for matching: case, accents, apostrophes and surrounding spaces ignored. */
export function foldDatasheet(text: string): string {
  let out = "";
  for (const ch of text) {
    if (/['‘’`]/.test(ch)) continue;
    out += ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  }
  return out.replace(/\s+/g, " ").trim();
}

/** RP cost of one extra datasheet. */
export const DATASHEET_COST = 1;

/** Different datasheets a player's roster may use: 5, +1 per datasheet bought with RP. */
export function datasheetLimit(state: Pick<CampaignState, "players">, playerId: string): number {
  return 5 + (state.players.find((p) => p.id === playerId)?.dsx ?? 0);
}

/** Distinct non-blank datasheets (folded) among `units`. */
export function distinctDatasheets(units: readonly Pick<Unit, "datasheet">[]): number {
  const set = new Set<string>();
  for (const u of units) {
    const f = foldDatasheet(u.datasheet);
    if (f) set.add(f);
  }
  return set.size;
}

/**
 * True if saving `unit` (new, or an edit of the unit with the same id) would raise the roster's distinct datasheet
 * count past the limit. Saves that keep the count the same (reuse, keep or swap a sole datasheet, blank) never block,
 * even on a roster already over the limit.
 */
export function datasheetLimitBlock(state: CampaignState, playerId: string, unit: Pick<Unit, "id" | "datasheet">): boolean {
  if (!toggleOn(state, "datasheetLimit")) return false;
  const roster = state.rosters?.[playerId] ?? [];
  const before = distinctDatasheets(roster);
  const after = distinctDatasheets([...roster.filter((x) => x.id !== unit.id), unit]);
  return after > before && after > datasheetLimit(state, playerId);
}

/* ---------- Toughness stages ---------- */

/** True while the War Round 1-2 cap applies to this player: toggle on, round 1 or 2, supply under 1250. */
export function toughStageActive(state: CampaignState, player: Player | undefined): boolean {
  if (!player || !toggleOn(state, "toughnessStages")) return false;
  return state.round >= 1 && state.round <= STAGE_LAST_ROUND && supplyOf(state, player) < STAGE_SUPPLY;
}

/** True when the stage cap is active for the player and `t` is a number over the cap. Blank never counts. */
export function overStageCap(t: number | undefined): boolean {
  return typeof t === "number" && t > STAGE_MAX_TOUGHNESS;
}

export function toughStageBlock(state: CampaignState, playerId: string, t: number | undefined): boolean {
  return overStageCap(t) && toughStageActive(state, getPlayer(state, playerId));
}

/* ---------- Knights exemption ---------- */

export const KNIGHT_FACTIONS: readonly string[] = ["Imperial Knights", "Chaos Knights"];

/** True for a folded datasheet name that starts with "armiger" or "war dog". */
export function isKnightDatasheet(datasheet: string): boolean {
  const f = foldDatasheet(datasheet);
  return f.startsWith("armiger") || f.startsWith("war dog");
}

/** True if the Knights toggle is on, the player is a Knights faction and the datasheet is an Armiger or War Dog. */
export function isKnightsExempt(state: CampaignState, player: Player | undefined, datasheet: string): boolean {
  return !!player && toggleOn(state, "knights") && KNIGHT_FACTIONS.includes(player.faction) && isKnightDatasheet(datasheet);
}

/** True for a Warlord that is not a Character and is not covered by the Knights exemption in Setup. */
export function warlordNotCharacter(state: CampaignState, player: Player | undefined, unit: Pick<Unit, "isWarlord" | "isCharacter" | "datasheet">): boolean {
  if (!unit.isWarlord || unit.isCharacter) return false;
  return !(state.round === 0 && isKnightsExempt(state, player, unit.datasheet));
}
