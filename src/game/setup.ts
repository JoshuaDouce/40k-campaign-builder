// Read-only helpers for the round-0 Setup tab. None of these mutate.
import { worldCounts } from "./map.ts";
import { countsAsSetupNine, rosterOf, setupToughnessBlock, totalEffective } from "./roster.ts";
import { forceOrgFor } from "./forceOrg.ts";
import { datasheetLimit, distinctDatasheets, toggleOn, warlordNotCharacter } from "./toggles.ts";
import { getPlanet, getPlayer, getProvince, supplyOf } from "./selectors.ts";
import type { CampaignState, Role } from "./types.ts";

const EXAMPLE_SUFFIX = "(example)";

/** True for the sample players a new campaign ships with, whose names end with "(example)". */
export function isExampleName(name: string): boolean {
  return name.trim().toLowerCase().endsWith(EXAMPLE_SUFFIX);
}

/** True if the Reach has the right number of worlds for the players and every player has a Capital on an outer world. */
export function chartMatches(state: CampaignState): boolean {
  if (state.sys.planets.length !== worldCounts(state.players.length).P) return false;
  return state.players.every((p) => {
    const prov = getProvince(state, state.cap[p.id] ?? "");
    return !!prov && getPlanet(state, prov.pl)?.orbit === "outer";
  });
}

/** Number of current players ticked Ready. */
export function setupReadyCount(state: CampaignState): number {
  return state.players.filter((p) => state.ready?.[p.id] === true).length;
}

/** Players still using a shipped example name, for the Begin warning. */
export function exampleNames(state: CampaignState): string[] {
  return state.players.filter((p) => isExampleName(p.name)).map((p) => p.name);
}

export interface SetupChecklist {
  /** Characters on the roster; `name` is the first one's (the Warlord's if there is one). */
  character: {
    count: number;
    name?: string;
    isWarlord: boolean;
    /** Name of an exempt (Knights) non-Character Warlord who is the warband's one Character, with no real Character beside it. */
    knightWarlord?: string;
    /** Name of a non-Character Warlord that is not covered by the Knights exemption. */
    notCharacter?: string;
  };
  /** Distinct datasheets vs the limit; only set when the Datasheet limit rule is on. */
  datasheets?: { count: number; limit: number };
  /** Units at Toughness 10+ (Setup only; a blank T never counts). `name`/`t` are set when `count` is 1. */
  toughOver: { count: number; name?: string; t?: number };
  /** Non-Battleline units at exactly Toughness 9 (Setup only; a blank T never counts). Setup allows one. */
  toughNine: { count: number };
  /** Units whose datasheet matches an Epic Hero (needs `isEpicName`; none without it). `name` is set when `count` is 1. */
  epic: { count: number; name?: string };
  rosterTotal: number;
  supply: number;
  /** Roster is non-empty and within supply. */
  rosterOk: boolean;
  /** "Province, Planet" */
  capital?: string;
  /** Roles still short of their minimum (only Battleline when slots are off). */
  foShort: { role: Role; n: number }[];
}

export function setupChecklist(state: CampaignState, playerId: string, isEpicName?: (name: string) => boolean): SetupChecklist {
  const player = getPlayer(state, playerId);
  const roster = rosterOf(state, playerId);
  const chars = roster.filter((u) => u.isCharacter);
  const over = roster.filter((u) => setupToughnessBlock(state, u.t));
  const nines = state.round === 0 ? roster.filter(countsAsSetupNine) : [];
  const epics = (isEpicName ? roster.filter((u) => isEpicName(u.datasheet)) : []);
  const rosterTotal = totalEffective(roster);
  const supply = player ? supplyOf(state, player) : 0;
  const softWarlord = roster.find((u) => u.isWarlord && !u.isCharacter);
  const notChar = softWarlord && warlordNotCharacter(state, player, softWarlord);
  const prov = state.cap[playerId] ? getProvince(state, state.cap[playerId]) : undefined;
  const planet = prov ? getPlanet(state, prov.pl) : undefined;
  return {
    character: { count: chars.length, name: (chars.find((u) => u.isWarlord) ?? chars[0])?.name, isWarlord: chars.some((u) => u.isWarlord),
      ...(softWarlord && !notChar && chars.length === 0 && { knightWarlord: softWarlord.name }),
      ...(softWarlord && notChar && { notCharacter: softWarlord.name }),
    },
    ...(toggleOn(state, "datasheetLimit") && { datasheets: { count: distinctDatasheets(roster), limit: datasheetLimit(state, playerId) } }),
    toughOver: { count: over.length, name: over.length === 1 ? over[0].name : undefined, t: over.length === 1 ? over[0].t : undefined },
    toughNine: { count: nines.length },
    epic: { count: epics.length, name: epics.length === 1 ? epics[0].name : undefined },
    rosterTotal,
    supply,
    rosterOk: roster.length > 0 && rosterTotal <= supply,
    capital: prov && planet ? `${prov.name}, ${planet.name}` : undefined,
    // The Battleline minimum holds in every campaign; the other minimums come with Force Organisation slots.
    foShort: forceOrgFor(state, playerId)
      .rows.filter((r) => r.role === "Battleline" || toggleOn(state, "forceOrg"))
      .map((r) => ({ role: r.role, n: Math.max(0, r.min - r.filled) }))
      .filter((r) => r.n > 0),
  };
}
