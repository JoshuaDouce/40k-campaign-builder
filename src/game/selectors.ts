// Read-only helpers over a CampaignState. None of these mutate.
import { ALT, FACTIONS, HOLL, ORBITS, VTYPES } from "./data.ts";
import { hollowgateRound, provinceSupply } from "./version.ts";
import type { BattleRecord, CampaignState, OrbitDef, Planet, Player, Province, Zone } from "./types.ts";

export const r50 = (n: number): number => Math.round(n / 50) * 50;
export const r5 = (n: number): number => Math.round(n / 5) * 5;

export function getPlayer(s: CampaignState, id: string | null | undefined): Player | undefined {
  return id ? s.players.find((p) => p.id === id) : undefined;
}
export function getPlanet(s: CampaignState, id: string): Planet | undefined {
  return s.sys.planets.find((p) => p.id === id);
}
/** A province, or the Hollowgate for "holl". */
export function getZone(s: CampaignState, id: string): Zone | undefined {
  return id === "holl" ? HOLL : s.sys.provs.find((v) => v.id === id);
}
/** A zone's name, or `fallback` when there is no zone id or it no longer exists. */
export function zoneName(s: CampaignState, id: string | undefined, fallback: string): string {
  return (id ? getZone(s, id)?.name : undefined) ?? fallback;
}
/** The world a zone (or zone id) sits on. Undefined for the Hollowgate, which is not on a world. */
export function planetOf(s: CampaignState, z: Zone | string | undefined): Planet | undefined {
  const v = typeof z === "string" ? getZone(s, z) : z;
  return !v || v.type === "rift" ? undefined : getPlanet(s, v.pl);
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
export function orbitOf(s: CampaignState, v: Zone): OrbitDef | { name: string; twists: number } {
  if (v.type === "rift") return { name: "The Hollowgate", twists: 2 };
  const pl = getPlanet(s, v.pl);
  return ORBITS[pl ? pl.orbit : "outer"];
}
/** A province plays at its type's points on any world; the orbit only sets the number of twists. */
export function sizeOf(v: Zone): number {
  return v.type === "rift" ? 2000 : VTYPES[v.type].size;
}
export function claimedFrac(s: CampaignState): number {
  const n = s.sys.provs.length;
  return n ? s.sys.provs.filter((v) => s.terr[v.id]).length / n : 0;
}
/** True once 60% is claimed or the Hollowgate round is reached (8, or 12 in 1.2), and from then on (latched). */
export function hollOpen(s: CampaignState): boolean {
  return s.hollOpened || claimedFrac(s) >= 0.6 || s.round >= hollowgateRound(s);
}
/** Supply from held provinces (Outposts and Ruins). Live: lose the province, lose the supply. */
export function holdingSupply(s: CampaignState, p: Player): number {
  return provsOf(s, p).reduce((n, v) => n + provinceSupply(s, v.type), 0);
}
export function supplyOf(s: CampaignState, p: Player): number {
  return 750 + (p.sup || 0) + holdingSupply(s, p);
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

/** One battle seen from one player's side. */
export interface HistoryEntry {
  round: number;
  /** The other side's current name (saved name if they have left). Null for a garrison fight. */
  opponent: string | null;
  garrison: boolean;
  province: string;
  /** Missing for the Hollowgate. */
  world?: string;
  kind: "conquer" | "raid";
  outcome: "won" | "lost" | "draw";
  took: boolean;
}

export interface PlayerHistory {
  /** Newest first. */
  entries: HistoryEntry[];
  battles: number;
  wins: number;
  draws: number;
  losses: number;
  provincesTaken: number;
}

/** A player's battle record, built from state.history. A garrison fight appears for the attacker only. */
export function historyFor(s: CampaignState, playerId: string): PlayerHistory {
  const entries: HistoryEntry[] = [];
  const recs: readonly BattleRecord[] = s.history ?? [];
  for (let i = recs.length - 1; i >= 0; i--) {
    const r = recs[i];
    const asAtt = r.att === playerId;
    if (!asAtt && r.def !== playerId) continue;
    const other = asAtt ? r.def : r.att;
    const otherSaved = asAtt ? r.defName : r.attName;
    entries.push({
      round: r.round,
      opponent: r.garrison ? null : (getPlayer(s, other)?.name ?? otherSaved ?? "Unknown"),
      garrison: !!r.garrison,
      province: r.provName,
      world: r.world,
      kind: r.kind,
      outcome: r.out === "x" ? "draw" : (r.out === "a") === asAtt ? "won" : "lost",
      took: asAtt && !!r.took,
    });
  }
  const wins = entries.filter((e) => e.outcome === "won").length;
  const draws = entries.filter((e) => e.outcome === "draw").length;
  return {
    entries,
    battles: entries.length,
    wins,
    draws,
    losses: entries.length - wins - draws,
    provincesTaken: entries.filter((e) => e.took).length,
  };
}
