// Read-only helpers for the round-0 Setup tab. None of these mutate.
import { worldCounts } from "./map.ts";
import { rosterOf, setupToughnessBlock, totalEffective } from "./roster.ts";
import { forceOrgFor } from "./forceOrg.ts";
import { getPlanet, getPlayer, getProvince, supplyOf } from "./selectors.ts";
import type { CampaignState, Role } from "./types.ts";

const EXAMPLE_SUFFIX = "(example)";

/** True for the sample players a new campaign ships with, whose names end with "(example)". */
export function isExampleName(name: string): boolean {
  return name.trim().toLowerCase().endsWith(EXAMPLE_SUFFIX);
}

/** True if the Reach has one world per the player count (+1) and every player has a Capital on it. */
export function chartMatches(state: CampaignState): boolean {
  if (state.sys.planets.length !== worldCounts(state.players.length).P) return false;
  return state.players.every((p) => {
    const id = state.cap[p.id];
    return !!id && !!getProvince(state, id);
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
  character: { count: number; name?: string; isWarlord: boolean };
  /** Units at Toughness 10+ (Setup only; a blank T never counts). `name`/`t` are set when `count` is 1. */
  toughOver: { count: number; name?: string; t?: number };
  rosterTotal: number;
  supply: number;
  /** Roster is non-empty and within supply. */
  rosterOk: boolean;
  /** "Province, Planet" */
  capital?: string;
  /** Roles still short of their minimum. */
  foShort: { role: Role; n: number }[];
}

export function setupChecklist(state: CampaignState, playerId: string): SetupChecklist {
  const player = getPlayer(state, playerId);
  const roster = rosterOf(state, playerId);
  const chars = roster.filter((u) => u.isCharacter);
  const over = roster.filter((u) => setupToughnessBlock(state, u.t));
  const rosterTotal = totalEffective(roster);
  const supply = player ? supplyOf(player) : 0;
  const prov = state.cap[playerId] ? getProvince(state, state.cap[playerId]) : undefined;
  const planet = prov ? getPlanet(state, prov.pl) : undefined;
  return {
    character: { count: chars.length, name: (chars.find((u) => u.isWarlord) ?? chars[0])?.name, isWarlord: chars.some((u) => u.isWarlord) },
    toughOver: { count: over.length, name: over.length === 1 ? over[0].name : undefined, t: over.length === 1 ? over[0].t : undefined },
    rosterTotal,
    supply,
    rosterOk: roster.length > 0 && rosterTotal <= supply,
    capital: prov && planet ? `${prov.name}, ${planet.name}` : undefined,
    foShort: forceOrgFor(state, playerId)
      .rows.map((r) => ({ role: r.role, n: Math.max(0, r.min - r.filled) }))
      .filter((r) => r.n > 0),
  };
}
