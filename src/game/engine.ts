// The War Round engine. Functions that take `s: CampaignState` MUTATE it: they are internal building
// blocks that `apply()` runs on a structuredClone. Never call them on state you want to keep.
import { drawFor, HAND_LIMIT } from "./cards.ts";
import { ACTIONS, PTYPES, TWISTS } from "./data.ts";
import { genSystem } from "./map.ts";
import { B, log } from "./log.ts";
import { newSeed, rollInt } from "./rng.ts";
import type { Rng } from "./rng.ts";
import {
  count,
  getPlanet,
  getPlayer,
  getZone,
  holdsType,
  hollOpen,
  laneLinked,
  orbitOf,
  ownerOf,
  provsOf,
  r50,
  sizeOf,
  supplyOf,
} from "./selectors.ts";
import type { ActionId, BattleInfo, CampaignState, Player, Zone } from "./types.ts";

export function examplePlayers(): Player[] {
  const mk = (id: string, name: string, faction: Player["faction"]): Player => ({
    id,
    name,
    faction,
    rp: 5,
    battles: 0,
    wins: 0,
    sup: 0,
    scout: false,
    hand: [],
  });
  return [
    mk("p1", "Player 1 (example)", "Space Marines"),
    mk("p2", "Player 2 (example)", "Orks"),
    mk("p3", "Player 3 (example)", "Necrons"),
  ];
}

/** A brand-new campaign. Pure: returns a new state. */
export function fresh(players: Player[] | undefined, rng: Rng): CampaignState {
  const pl = structuredClone(players ?? examplePlayers());
  const g = genSystem(pl, newSeed(rng));
  return {
    round: 0,
    turnIdx: null,
    order: [],
    pend: null,
    log: [],
    won: null,
    fort: {},
    terr: g.terr,
    cap: g.cap,
    sys: g.sys,
    players: pl,
    hollOpened: false,
  };
}

/** Re-chart the whole Reach from scratch (mutates `s`). */
export function regen(s: CampaignState, rng: Rng): void {
  const g = genSystem(s.players, newSeed(rng));
  s.sys = g.sys;
  s.terr = g.terr;
  s.cap = g.cap;
  s.fort = {};
  s.hollOpened = false;
  log(s, `A new Reach is charted: ${g.sys.planets.length} worlds, ${g.sys.provs.length} provinces for ${s.players.length} players.`);
}

/** Provinces `p` could attack with action `act`. Read-only. */
export function targets(s: CampaignState, p: Player, act: ActionId): Zone[] {
  const mine = provsOf(s, p);
  const set = new Set<string>();
  if (!mine.length) {
    s.sys.provs
      .filter((v) => getPlanet(s, v.pl)?.orbit === "outer" && !s.terr[v.id])
      .forEach((v) => set.add(v.id));
  }
  mine.forEach((v) => v.nb.forEach((n) => set.add(n)));
  const ports = new Set(mine.filter((v) => v.type === "spaceport" || v.type === "capital").map((v) => v.pl));
  ports.forEach((pl) =>
    laneLinked(s, pl).forEach((l) => s.sys.provs.filter((v) => v.pl === l).forEach((v) => set.add(v.id))),
  );
  if (hollOpen(s) && mine.some((v) => getPlanet(s, v.pl)?.orbit === "inner")) set.add("holl");
  return [...set]
    .map((id) => getZone(s, id))
    .filter((v): v is Zone => !!v)
    .filter((v) => s.terr[v.id] !== p.id && (act !== "raid" || (!!s.terr[v.id] && v.id !== "holl")));
}

export function beginRound(s: CampaignState, rng: Rng): void {
  s.round++;
  s.won = null;
  s.pend = null;
  log(s, B(`War Round ${s.round} begins.`));
  s.players.forEach((p) => {
    const inc = holdsType(s, p, "capital") + holdsType(s, p, "hive");
    if (inc) {
      p.rp = Math.min(10, p.rp + inc);
      log(s, B(p.name), ` collects ${inc} RP from their cities.`);
    }
    drawFor(s, p, 1 + holdsType(s, p, "refinery"), "start of War Round", rng);
  });
  s.order = s.players
    .map((p) => ({ id: p.id, z: count(s, p), r: rng() }))
    .sort((a, b) => a.z - b.z || a.r - b.r)
    .map((x) => x.id);
  s.turnIdx = 0;
}

/** Advance to the next present player, or end the round (mutates `s`). */
export function endTurn(s: CampaignState): void {
  s.pend = null;
  let i = (s.turnIdx ?? -1) + 1;
  while (i < s.order.length && !getPlayer(s, s.order[i])) i++;
  if (i >= s.order.length) {
    s.turnIdx = null;
    const h = ownerOf(s, "holl");
    if (h) {
      s.won = h.id;
      log(s, B(`${h.name} holds the Hollowgate at the end of War Round ${s.round} and wins the Varkesh Reach.`));
    } else log(s, `War Round ${s.round} ends.`);
  } else s.turnIdx = i;
}

/** Roll (or re-roll) the mission twists for the pending battle (mutates `s`). */
export function rollTwists(s: CampaignState, rng: Rng): void {
  const pd = s.pend;
  if (!pd?.zone) return;
  const v = getZone(s, pd.zone);
  if (!v) return;
  const n = orbitOf(s, v).twists;
  const idx: number[] = [];
  while (idx.length < n) {
    const i = rollInt(rng, TWISTS.length);
    if (!idx.includes(i)) idx.push(i);
  }
  pd.twists = idx;
  pd.rolled = true;
}

/**
 * Choose the province and defender for the pending battle and roll its twists (mutates `s`).
 * Returns false (and changes nothing) if the zone is not a legal target or the defender is invalid.
 */
export function rollBattle(s: CampaignState, sel: { zone: string; def: string }, rng: Rng): boolean {
  const pd = s.pend;
  if (!pd || pd.rolled) return false;
  const act = ACTIONS.find((a) => a.id === pd.act);
  const actor = getPlayer(s, pd.actor);
  if (!act?.battle || !actor) return false;
  if (!targets(s, actor, pd.act).some((v) => v.id === sel.zone)) return false;
  const holder = s.terr[sel.zone];
  if (holder) {
    if (sel.def !== holder) return false;
  } else if (sel.def === actor.id || !getPlayer(s, sel.def)) return false;
  pd.zone = sel.zone;
  pd.def = sel.def;
  rollTwists(s, rng);
  return true;
}

/** Index of the Light Forces Mission Twist in TWISTS. */
export const LIGHT_FORCES_TWIST = TWISTS.findIndex((t) => t.t === "Light Forces");
/** Battles of this many points or fewer automatically use Light Forces. */
export const LIGHT_FORCES_MAX_PTS = 750;

/** Everything about the pending, rolled battle. Read-only. Null if there is none. */
export function battleInfo(s: CampaignState): BattleInfo | null {
  const pd = s.pend;
  if (!pd?.rolled || !pd.zone || !pd.twists) return null;
  const v = getZone(s, pd.zone),
    a = getPlayer(s, pd.actor),
    d = getPlayer(s, pd.def);
  if (!v || !a || !d) return null;
  const notes: string[] = [];
  let pts = sizeOf(s, v);
  pd.twists.forEach((i) => (pts *= TWISTS[i].m));
  if (pd.act === "raid") {
    pts *= 0.5;
    notes.push("Raid: half size.");
  }
  pts = Math.max(500, r50(pts));
  const cap = Math.min(supplyOf(a), supplyOf(d));
  if (cap < pts) {
    notes.push(`Capped at the lower supply limit (${supplyOf(a) <= supplyOf(d) ? a.name : d.name}).`);
    pts = Math.floor(cap / 50) * 50;
  }
  if (count(s, a) < count(s, d)) notes.push(`${a.name} is the Underdog: +10% (${Math.round((pts * 1.1) / 5) * 5} pts).`);
  const held = s.terr[v.id] === d.id;
  if (held && (s.fort[v.id] || v.type === "fortress"))
    notes.push(`Fortified: ${d.name} gets +1 CP and one extra piece of terrain.`);
  if (v.type === "capital" && held)
    notes.push(`${d.name}'s Capital: if ${a.name} wins a Conquer here, they also steal 2 RP.`);
  if (v.type === "shrine") notes.push("Shrine: both players' Marked for Glory units gain +1 XP.");
  if (a.scout) notes.push(`Scout: ${a.name} may swap one twist for any twist of their choice.`);
  const cards = pd.twists.includes(8) ? 1 : Math.max(1, Math.floor(pts / 500));
  const pl = v.type === "rift" ? undefined : getPlanet(s, v.pl);
  const trait = pl
    ? PTYPES[pl.type]
    : {
        n: "Warp rift",
        trait: "Shifting ground. At the start of each round roll a D6: on a 1 move one terrain piece 3\". One Lord of War allowed.",
      };
  const lightForces = pts <= LIGHT_FORCES_MAX_PTS && !pd.twists.includes(LIGHT_FORCES_TWIST);
  return { v, a, d, pts, notes, cards, lightForces, trait };
}

/** Record the pending battle's result and move on (mutates `s`). Returns false if there is no rolled battle. */
export function resolve(s: CampaignState, res: "a" | "d" | "x", rng: Rng): boolean {
  const pd = s.pend;
  const info = battleInfo(s);
  if (!pd || !info) return false;
  const { v, a, d } = info;
  const win = res === "a" ? a : res === "d" ? d : null;
  [a, d].forEach((p) => {
    p.battles++;
    p.rp = Math.min(10, p.rp + 1);
  });
  if (win) {
    win.wins++;
    win.rp = Math.min(10, win.rp + 1);
  }
  const pl = v.type === "rift" ? undefined : getPlanet(s, v.pl);
  const where = pl ? `${v.name} on ${pl.name}` : v.name;
  log(
    s,
    B(a.name),
    ` ${pd.act === "raid" ? "raided" : "attacked"} ${where} against `,
    B(d.name),
    `: ${win ? win.name + " won" : "a draw"}.`,
  );
  if (pd.act === "conquer") {
    if (win === a) {
      if (v.type === "capital" && s.terr[v.id] === d.id) {
        const st = Math.min(2, d.rp);
        d.rp -= st;
        a.rp = Math.min(10, a.rp + st);
        log(s, B(a.name), ` sacks ${d.name}'s Capital and steals ${st} RP.`);
      }
      s.terr[v.id] = a.id;
      log(s, B(a.name), ` takes ${v.name}.`);
    } else if (win === d && s.terr[v.id] === d.id) log(s, B(d.name), ` holds ${v.name}.`);
  } else if (win === a) {
    const rp = Math.min(1, d.rp);
    d.rp -= rp;
    a.rp = Math.min(10, a.rp + rp);
    if (d.hand.length && a.hand.length < HAND_LIMIT) {
      const c = d.hand.splice(rollInt(rng, d.hand.length), 1)[0];
      a.hand.push(c);
      log(s, B(a.name), ` steals ${rp} RP and the card "${c.t}".`);
    } else log(s, B(a.name), ` steals ${rp} RP.`);
  }
  delete s.fort[v.id];
  if (win) drawFor(s, win, 1, "victory", rng);
  // Underdog's grit: every player on the campaign minimum draws, not only the combatants.
  if (s.players.length > 1) {
    const min = Math.min(...s.players.map((p) => count(s, p)));
    s.players.forEach((p) => {
      if (count(s, p) === min) drawFor(s, p, 1, "Underdog's grit", rng);
    });
  }
  a.scout = false;
  log(s, "Both players: record XP, roll for the fallen, +150 supply.");
  endTurn(s);
  return true;
}

/**
 * Carry out the pending no-battle action and end the turn (mutates `s`). `fortZone` is the province
 * to fortify. Returns false (changing nothing) if there is no pending quiet action or input is invalid.
 */
export function doQuiet(s: CampaignState, fortZone: string | undefined, rng: Rng): boolean {
  const pd = s.pend;
  const p = getPlayer(s, pd?.actor);
  if (!pd || !p) return false;
  const act = pd.act;
  if (act === "conquer" || act === "raid") return false;
  const z = fortZone ? provsOf(s, p).find((v) => v.id === fortZone) : undefined;
  if (act === "fortify" && !z) return false;
  if (act === "recuperate") {
    p.rp = Math.min(10, p.rp + 1);
    log(s, B(p.name), " recuperates: +1 RP, removes up to 2 Battle Scars.");
  }
  if (act === "muster") {
    const n = 250 + 150 * Math.min(1, holdsType(s, p, "forge"));
    p.sup = (p.sup || 0) + n;
    log(s, B(p.name), ` musters: +${n} supply.`);
    drawFor(s, p, 1, "Muster", rng);
  }
  if (act === "fortify" && z) {
    s.fort[z.id] = true;
    log(s, B(p.name), ` fortifies ${z.name}.`);
  }
  if (act === "scout") {
    p.scout = true;
    log(s, B(p.name), " scouts ahead.");
    drawFor(s, p, 1, "Scout", rng);
  }
  endTurn(s);
  return true;
}
