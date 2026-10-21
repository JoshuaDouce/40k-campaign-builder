// Read-only helpers over a CampaignState. None of these mutate.
import { ALT, FACTIONS, HOLL, ORBITS, VTYPES } from "./data.ts";
import type { CampaignState, OrbitDef, Planet, Player, Province, Zone } from "./types.ts";

export const r50 = (n: number): number => Math.round(n / 50) * 50;
export const r5 = (n: number): number => Math.round(n / 5) * 5;

export function getPlayer(s: CampaignState, id: string | null | undefined): Player | undefined {
  return id ? s.players.find((p) => p.id === id) : undefined;
}
/** The player whose turn it is, or undefined between rounds. */
export function currentActor(s: CampaignState): Player | undefined {
  return s.turnIdx === null ? undefined : getPlayer(s, s.order[s.turnIdx]);
}
export function getPlanet(s: CampaignState, id: string): Planet | undefined {
  return s.sys.planets.find((p) => p.id === id);
}
/** A province, or the Hollowgate for "holl". */
export function getZone(s: CampaignState, id: string): Zone | undefined {
  return id === "holl" ? HOLL : s.sys.provs.find((v) => v.id === id);
}
export function getProvince(s: CampaignState, id: string): Province | undefined {
  return s.sys.provs.find((v) => v.id === id);
}

export function ownerOf(s: CampaignState, id: string): Player | undefined {
  return getPlayer(s, s.terr[id]);
}
export function provsOf(s: CampaignState, p: Player): Province[] {
  return s.sys.provs.filter((v) => s.terr[v.id] === p.id);
}
/** Provinces held, plus one for the Hollowgate. */
export function count(s: CampaignState, p: Player): number {
  return provsOf(s, p).length + (s.terr.holl === p.id ? 1 : 0);
}
export function orbitOf(s: CampaignState, v: Zone): OrbitDef | { name: string; mult: number; twists: number } {
  if (v.type === "rift") return { name: "The Hollowgate", mult: 1, twists: 2 };
  const pl = getPlanet(s, v.pl);
  return ORBITS[pl ? pl.orbit : "outer"];
}
export function sizeOf(s: CampaignState, v: Zone): number {
  if (v.type === "rift") return 2000;
  const pl = getPlanet(s, v.pl);
  return r50(VTYPES[v.type].size * ORBITS[pl ? pl.orbit : "outer"].mult);
}
export function claimedFrac(s: CampaignState): number {
  const n = s.sys.provs.length;
  return n ? s.sys.provs.filter((v) => s.terr[v.id]).length / n : 0;
}
/** True once 60% is claimed or round 8 is reached, and from then on (latched). */
export function hollOpen(s: CampaignState): boolean {
  return s.hollOpened || claimedFrac(s) >= 0.6 || s.round >= 8;
}
export function supplyOf(p: Player): number {
  return 750 + 150 * p.battles + (p.sup || 0);
}
/** Planet ids linked to planet `a` by a warp lane. */
export function laneLinked(s: CampaignState, a: string): string[] {
  return s.sys.lanes.filter((l) => l.includes(a)).map((l) => (l[0] === a ? l[1] : l[0]));
}
export function holdsType(s: CampaignState, p: Player, ty: Province["type"]): number {
  return provsOf(s, p).filter((v) => v.type === ty).length;
}

/** Golden-angle HSL colour, the n-th in the sequence. */
function generatedColor(n: number): string {
  return `hsl(${Math.round((n * 137.508) % 360)} 55% 62%)`;
}

/**
 * Colour for every player, in player order. Faction colour, or ALT[i % ALT.length] on a faction
 * clash. If that colour is already taken, a generated colour is used instead, so all are distinct.
 */
export function playerColors(s: CampaignState): Record<string, string> {
  const out: Record<string, string> = {};
  const used = new Set<string>();
  let gen = 0;
  s.players.forEach((p, i) => {
    const clash = s.players.slice(0, i).some((q) => q.faction === p.faction);
    let c = clash ? ALT[i % ALT.length] : (FACTIONS[p.faction] ?? { c: "#888" }).c;
    while (used.has(c)) c = generatedColor(gen++);
    used.add(c);
    out[p.id] = c;
  });
  return out;
}
export function colorOf(s: CampaignState, p: Player | null | undefined): string {
  if (!p) return "none";
  return playerColors(s)[p.id] ?? (FACTIONS[p.faction] ?? { c: "#888" }).c;
}

export function stageText(s: CampaignState): string {
  const pc = Math.round(claimedFrac(s) * 100);
  return hollOpen(s)
    ? `${pc}% OF THE REACH CLAIMED · THE HOLLOWGATE IS OPEN`
    : `${pc}% OF THE REACH CLAIMED · THE HOLLOWGATE OPENS AT 60% OR WAR ROUND 8`;
}
