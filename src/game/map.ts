// Seeded star-system generator, layout scaling and late-joiner world charting.
import { ORBITS, PLANET_NAMES, PREFIX, PTYPES, VTYPES } from "./data.ts";
import { B, log } from "./log.ts";
import { mulberry, rollInt, shuffle } from "./rng.ts";
import type { Rng } from "./rng.ts";
import type { CampaignState, Lane, OrbitKey, Planet, PlanetType, Province, ProvinceType, Pt, System } from "./types.ts";

export const BASE_SIZE = 360;
/** Closest two worlds on one ring may sit before the layout scales up. */
export const MIN_SPACING = 70;
/** Space kept between the outer ring and the edge of the viewBox (so 146 + 34 = 180 at scale 1). */
const EDGE_MARGIN = 34;
const ORBIT_KEYS: OrbitKey[] = ["outer", "middle", "inner"];
const TAU = 2 * Math.PI;

/** Angle folded into [0, 2π). */
export const normAng = (a: number): number => ((a % TAU) + TAU) % TAU;

/* ---------- geometry (verbatim from the prototype) ---------- */

export function clipHalf(poly: Pt[], pi: Pt, pj: Pt): Pt[] {
  const dx = pj[0] - pi[0],
    dy = pj[1] - pi[1],
    mx = (pi[0] + pj[0]) / 2,
    my = (pi[1] + pj[1]) / 2;
  const f = (p: Pt) => (p[0] - mx) * dx + (p[1] - my) * dy;
  const out: Pt[] = [];
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k],
      b = poly[(k + 1) % poly.length],
      fa = f(a),
      fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

export function cellsFor(pts: Pt[]): { cells: Pt[][]; nb: number[][] } {
  const circ: Pt[] = [];
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    circ.push([Math.cos(a), Math.sin(a)]);
  }
  const cells = pts.map((p, i) => {
    let poly = circ;
    pts.forEach((q, j) => {
      if (j !== i) poly = clipHalf(poly, p, q);
    });
    return poly;
  });
  const nb = pts.map((p, i) =>
    pts
      .map((q, j) => {
        if (i === j) return -1;
        const dx = q[0] - p[0],
          dy = q[1] - p[1],
          mx = (p[0] + q[0]) / 2,
          my = (p[1] + q[1]) / 2;
        const on = cells[i].filter((v) => Math.abs((v[0] - mx) * dx + (v[1] - my) * dy) < 1e-9).length;
        return on >= 2 ? j : -1;
      })
      .filter((j) => j >= 0),
  );
  return { cells, nb };
}

export function polyCentroid(c: Pt[]): Pt {
  let a = 0,
    x = 0,
    y = 0;
  for (let i = 0; i < c.length; i++) {
    const p = c[i],
      q = c[(i + 1) % c.length],
      f = p[0] * q[1] - q[0] * p[1];
    a += f;
    x += (p[0] + q[0]) * f;
    y += (p[1] + q[1]) * f;
  }
  a *= 0.5;
  return [x / (6 * a), y / (6 * a)];
}

/* ---------- counts, names, layout ---------- */

/**
 * World counts for a player count. Inner and middle split a base of max(3, players + 1) as before;
 * the outer ring then holds one world per player (at least the base's share), so every Capital is on
 * an outer world of its own. P is the total.
 */
export function worldCounts(players: number): { P: number; nIn: number; nMid: number; nOut: number } {
  const base = Math.max(3, Math.max(1, players) + 1);
  const nIn = base < 6 ? 1 : Math.max(2, Math.round(base / 4));
  const nMid = Math.round((base - nIn) / 2);
  const nOut = Math.max(base - nIn - nMid, players);
  return { P: nIn + nMid + nOut, nIn, nMid, nOut };
}

const ROMAN: Array<[number, string]> = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
function roman(n: number): string {
  let out = "";
  for (const [v, s] of ROMAN) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/** Deterministic extra planet name for when PLANET_NAMES runs out: "Ash II", "Iron II", ... "Ash III". */
export function generatedPlanetName(j: number): string {
  return `${PREFIX[j % PREFIX.length]} ${roman(Math.floor(j / PREFIX.length) + 2)}`;
}

/** Scale factor (>= 1) that keeps every ring's closest pair of worlds at least MIN_SPACING apart. */
export function systemScale(planets: readonly Planet[]): number {
  let scale = 1;
  for (const o of ORBIT_KEYS) {
    const angs = planets
      .filter((p) => p.orbit === o)
      .map((p) => normAng(p.ang))
      .sort((a, b) => a - b);
    if (angs.length < 2) continue;
    let minGap = Infinity;
    for (let i = 0; i < angs.length; i++) {
      const next = i + 1 < angs.length ? angs[i + 1] : angs[0] + TAU;
      minGap = Math.min(minGap, next - angs[i]);
    }
    const chord = 2 * ORBITS[o].r * Math.sin(Math.min(minGap, Math.PI) / 2);
    if (chord > 1e-6) scale = Math.max(scale, MIN_SPACING / chord);
  }
  return Math.ceil(scale * 100) / 100;
}

/** Recompute `sys.size` and every planet's x/y from its angle and the current scale (mutates `sys`). */
export function layoutSystem(sys: System): void {
  const scale = systemScale(sys.planets);
  sys.size = Math.ceil(2 * (ORBITS.outer.r * scale + EDGE_MARGIN));
  const c = sys.size / 2;
  for (const p of sys.planets) {
    const r = ORBITS[p.orbit].r * scale;
    p.x = c + r * Math.cos(p.ang);
    p.y = c + r * Math.sin(p.ang);
  }
}

/* ---------- lanes ---------- */

function addLane(lanes: Lane[], a: string, b: string): void {
  if (a !== b && !lanes.some((l) => l.includes(a) && l.includes(b))) lanes.push([a, b]);
}

/** Link each world on a ring to its circular neighbours (sorted by angle folded into [0, 2π)). */
function addRingLanes(lanes: Lane[], planets: Planet[], orbit: OrbitKey): void {
  const g = planets.filter((p) => p.orbit === orbit).sort((a, b) => normAng(a.ang) - normAng(b.ang));
  if (g.length === 2) addLane(lanes, g[0].id, g[1].id);
  if (g.length > 2) g.forEach((p, i) => addLane(lanes, p.id, g[(i + 1) % g.length].id));
}

function nearest(from: Planet, among: Planet[]): Planet | null {
  let best: Planet | null = null,
    bd = 1e9;
  for (const q of among) {
    const d = Math.hypot(from.x - q.x, from.y - q.y);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
}

/* ---------- provinces ---------- */

/** Generate the provinces of one planet. `nextPrefix` supplies the name prefix for each. */
export function genPlanetProvinces(pl: Planet, R: Rng, nextPrefix: () => string): Province[] {
  const k = pl.orbit === "inner" ? 5 : 5 + Math.floor(R() * 3);
  const pts: Pt[] = [];
  let min = 0.62;
  while (pts.length < k) {
    let tries = 0,
      ok = false;
    while (tries++ < 400) {
      const a = R() * Math.PI * 2,
        rr = Math.sqrt(R()) * 0.8,
        p: Pt = [rr * Math.cos(a), rr * Math.sin(a)];
      if (pts.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) >= min)) {
        pts.push(p);
        ok = true;
        break;
      }
    }
    if (!ok) min *= 0.9;
  }
  const { cells, nb } = cellsFor(pts);
  const fav = PTYPES[pl.type].fav;
  const pool = shuffle<ProvinceType>(
    ["spaceport", fav, "outpost", "settlement", "ruins", "fortress", "refinery", "shrine", "hive", "forge", "settlement", "outpost"],
    R,
  );
  const tlist: ProvinceType[] = ["spaceport", fav];
  pool.forEach((t) => {
    if (tlist.length < k && !tlist.includes(t)) tlist.push(t);
  });
  while (tlist.length < k) tlist.push("outpost");
  const ts = shuffle(tlist, R);
  return pts.map((p, i): Province => {
    const ty = ts[i],
      suf = VTYPES[ty].suf;
    return {
      id: pl.id + "-" + i,
      pl: pl.id,
      type: ty,
      name: nextPrefix() + " " + suf[Math.floor(R() * suf.length)],
      x: p[0],
      y: p[1],
      cell: cells[i].map((v): Pt => [+v[0].toFixed(4), +v[1].toFixed(4)]),
      nb: nb[i].map((j) => pl.id + "-" + j),
    };
  });
}

/**
 * Pick a province on `homeId` to be a Capital, as the prototype does: not a spaceport, not already a
 * capital, as far as possible from capitals already on that world. Converts it in place.
 */
function placeCapital(provs: Province[], homeId: string, cap: Record<string, string>): Province | null {
  const taken = Object.values(cap);
  const cand = provs.filter((v) => v.pl === homeId && !taken.includes(v.id) && v.type !== "spaceport");
  const others = taken
    .map((id) => provs.find((v) => v.id === id))
    .filter((v): v is Province => !!v && v.pl === homeId);
  const spread = (a: Province) => Math.min(9, ...others.map((o) => Math.hypot(o.x - a.x, o.y - a.y)));
  cand.sort((a, b) => spread(b) - spread(a));
  const v = cand[0] ?? provs.find((q) => !taken.includes(q.id));
  if (!v) return null;
  v.type = "capital";
  v.name = v.name.split(" ")[0] + " Landing";
  return v;
}

/* ---------- system generation ---------- */

export interface GeneratedSystem {
  sys: System;
  terr: Record<string, string>;
  cap: Record<string, string>;
}

export function genSystem(players: ReadonlyArray<{ id: string }>, seed: number): GeneratedSystem {
  const R = mulberry(seed);
  const { nIn, nMid, nOut } = worldCounts(players.length);
  const names = shuffle(PLANET_NAMES, R),
    types = shuffle(Object.keys(PTYPES) as PlanetType[], R),
    prefixes = shuffle(PREFIX, R);
  const planets: Planet[] = [];
  let pi = 0;
  const rings: Array<[OrbitKey, number]> = [
    ["outer", nOut],
    ["middle", nMid],
    ["inner", nIn],
  ];
  for (const [o, c] of rings) {
    const off = R() * Math.PI * 2;
    for (let k = 0; k < c; k++) {
      planets.push({
        id: "pl" + pi,
        name: pi < names.length ? names[pi] : generatedPlanetName(pi - names.length),
        type: types[pi % types.length],
        orbit: o,
        ang: normAng(off + (k * 2 * Math.PI) / c),
        x: 0,
        y: 0,
      });
      pi++;
    }
  }
  const sys: System = { seed, size: BASE_SIZE, planets, lanes: [], provs: [] };
  layoutSystem(sys);
  ORBIT_KEYS.forEach((o) => addRingLanes(sys.lanes, planets, o));
  const nextIn: Partial<Record<OrbitKey, OrbitKey>> = { outer: "middle", middle: "inner" };
  planets.forEach((p) => {
    const tgt = nextIn[p.orbit];
    if (!tgt) return;
    const best = nearest(
      p,
      planets.filter((q) => q.orbit === tgt),
    );
    if (best) addLane(sys.lanes, p.id, best.id);
  });
  let pfx = 0;
  const nextPrefix = () => prefixes[pfx++ % prefixes.length];
  planets.forEach((pl) => sys.provs.push(...genPlanetProvinces(pl, R, nextPrefix)));
  // capitals: one outer world per player (worldCounts guarantees enough)
  const homes = planets.filter((p) => p.orbit === "outer");
  const terr: Record<string, string> = {},
    cap: Record<string, string> = {};
  players.forEach((pl, i) => {
    const world = homes[i % homes.length];
    const v = placeCapital(sys.provs, world.id, cap);
    if (v) {
      cap[pl.id] = v.id;
      terr[v.id] = pl.id;
    }
  });
  return { sys, terr, cap };
}

/* ---------- late joiner ---------- */

/** Midpoint of the widest angular gap between the given angles, in [0, 2π). */
function widestGapMid(angles: number[]): number {
  const a = angles.map(normAng).sort((p, q) => p - q);
  let best = -1,
    mid = a[0] + Math.PI;
  for (let i = 0; i < a.length; i++) {
    const next = i + 1 < a.length ? a[i + 1] : a[0] + TAU;
    if (next - a[i] > best) {
      best = next - a[i];
      mid = a[i] + best / 2;
    }
  }
  return normAng(mid);
}

/**
 * Chart a new outer world for a late joiner and make their Capital on it (mutates `s`).
 * The player must already be in `s.players`. Existing provinces and holdings are untouched.
 */
export function addWorld(s: CampaignState, playerId: string, rng: Rng): void {
  const sys = s.sys;
  const player = s.players.find((p) => p.id === playerId);
  const outerAngs = sys.planets.filter((p) => p.orbit === "outer").map((p) => p.ang);
  const ang = outerAngs.length ? widestGapMid(outerAngs) : normAng(rng() * Math.PI * 2);

  const usedNames = new Set(sys.planets.map((p) => p.name));
  let name = shuffle(PLANET_NAMES, rng).find((n) => !usedNames.has(n));
  for (let j = 0; !name; j++) {
    const g = generatedPlanetName(j);
    if (!usedNames.has(g)) name = g;
  }
  const typeKeys = Object.keys(PTYPES) as PlanetType[];
  const idx = sys.planets.reduce((m, p) => Math.max(m, Number(p.id.slice(2)) + 1), sys.planets.length);
  const world: Planet = {
    id: "pl" + idx,
    name,
    type: typeKeys[rollInt(rng, typeKeys.length)],
    orbit: "outer",
    ang,
    x: 0,
    y: 0,
  };
  sys.planets.push(world);
  layoutSystem(sys);

  // Rebuild the outer ring in circular angle order, so the neighbours' lane is split through the new world.
  const orbitOf = (id: string) => sys.planets.find((p) => p.id === id)?.orbit;
  sys.lanes = sys.lanes.filter((l) => !(orbitOf(l[0]) === "outer" && orbitOf(l[1]) === "outer"));
  addRingLanes(sys.lanes, sys.planets, "outer");
  const mids = sys.planets.filter((p) => p.orbit === "middle");
  const link = nearest(world, mids.length ? mids : sys.planets.filter((p) => p.orbit === "inner"));
  if (link) addLane(sys.lanes, world.id, link.id);

  const prefixes = shuffle(PREFIX, rng);
  let pfx = 0;
  const provs = genPlanetProvinces(world, rng, () => prefixes[pfx++ % prefixes.length]);
  sys.provs.push(...provs);

  const v = player ? placeCapital(sys.provs, world.id, s.cap) : null;
  if (player && v) {
    s.cap[player.id] = v.id;
    s.terr[v.id] = player.id;
    log(s, B(player.name), ` arrives in the Reach. A new world, ${world.name}, is charted; their Capital is ${v.name}.`);
  } else {
    log(s, `A new world, ${world.name}, is charted.`);
  }
}
