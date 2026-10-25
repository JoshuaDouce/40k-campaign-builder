// The single entry point for every state change.
import { drawCard } from "./cards.ts";
import { FACTIONS } from "./data.ts";
import { beginRound, fresh, lateArrivalBonus, regen, START_RP } from "./engine.ts";
import { B, log } from "./log.ts";
import { addWorld } from "./map.ts";
import type { Rng } from "./rng.ts";
import {
  addExamplesTo,
  addRelicTo,
  deleteFallenEntry,
  addUnitTo,
  applyPostBattleTo,
  clearExamplesFrom,
  fieldSurgeonOn,
  promoteUnit,
  recruitUnit,
  removePlayerRoster,
  removeRelicFrom,
  removeUnitFrom,
  updateUnitIn,
} from "./roster.ts";
import { isToggleKey, toggleOn, TOGGLE_NAMES } from "./toggles.ts";
import {
  confirmQuietPick,
  dropPlayerPicks,
  forgetRoundCache,
  readyPick,
  rerollPick,
  setGarrisonEdge,
  resolvePick,
  revealPicks,
  rollPick,
  switchPick,
  takeSnapshot,
  undoBattle,
  unreadyPick,
} from "./round.ts";
import { getPlayer, getZone, hollOpen } from "./selectors.ts";
import type { Action, ActionType, CampaignState, Player } from "./types.ts";

/**
 * Actions that leave an open Undo window alone: they only touch rosters, never the things a battle
 * result changes. Every other action closes the window. Filing a post-battle report also blocks Undo.
 */
const ROSTER_ONLY: ReadonlySet<ActionType> = new Set<ActionType>([
  "addUnit",
  "updateUnit",
  "removeUnit",
  "addRelic",
  "removeRelic",
  "deleteFallen",
  "applyPostBattle",
  "addExamples",
  "clearExamples",
  "setToggle",
]);

export interface ApplyContext {
  rng: Rng;
  /** Reserved for callers that want to stamp time; the game module never reads the clock itself. */
  now?: number;
}

function validIndex(p: Player, i: number): boolean {
  return Number.isInteger(i) && i >= 0 && i < p.hand.length;
}

/** Run `a` on the draft `s`. Returns false if the action is invalid (the draft is then discarded). */
function run(s: CampaignState, a: Action, rng: Rng): boolean {
  switch (a.type) {
    case "beginRound":
      if (s.phase !== null || s.players.length < 2) return false;
      beginRound(s, rng);
      return true;

    case "readyPick":
      return readyPick(s, a.playerId, { act: a.act, zone: a.zone, def: a.def });

    case "unreadyPick":
      return unreadyPick(s, a.playerId);

    case "revealPicks":
      return revealPicks(s);

    case "rollPick":
      return rollPick(s, a.playerId, a.def, rng);

    case "rerollPick":
      return rerollPick(s, a.playerId, rng);

    case "setGarrisonEdge":
      return setGarrisonEdge(s, a.playerId, a.edge);

    case "resolvePick": {
      if (a.result !== "a" && a.result !== "d" && a.result !== "x") return false;
      if (a.decisive !== undefined && typeof a.decisive !== "boolean") return false;
      const before = takeSnapshot(s);
      const b = s.picks[a.playerId]?.battle;
      if (!b || !resolvePick(s, a.playerId, a.result, rng, a.decisive)) return false;
      s.undo = { before, attacker: a.playerId, defender: b.def, reportFiled: false, later: [] };
      return true;
    }

    case "undoBattle":
      return undoBattle(s, a.attacker);

    case "confirmQuietPick":
      return confirmQuietPick(s, a.playerId, rng);

    case "switchPick":
      return switchPick(s, a.playerId, { act: a.act, zone: a.zone, def: a.def });

    case "drawCard": {
      const p = getPlayer(s, a.playerId);
      return !!p && !!drawCard(p, rng);
    }

    case "playCard":
    case "discardCard": {
      const p = getPlayer(s, a.playerId);
      if (!p || !validIndex(p, a.index)) return false;
      p.hand.splice(a.index, 1);
      return true;
    }

    case "buyReinforcements": {
      const p = getPlayer(s, a.playerId);
      if (!p || p.rp < 1) return false;
      p.rp--;
      p.sup = (p.sup || 0) + 200;
      log(s, B(p.name), " spends 1 RP on Reinforcements (+200 supply).");
      return true;
    }

    case "addUnit":
      return addUnitTo(s, a.playerId, a.unit);
    case "updateUnit":
      return updateUnitIn(s, a.playerId, a.unit);
    case "removeUnit":
      return removeUnitFrom(s, a.playerId, a.unitId, a.cause);
    case "addRelic":
      return addRelicTo(s, a.playerId, a.unitId, a.relic, a.source);
    case "removeRelic":
      return removeRelicFrom(s, a.playerId, a.unitId, a.relic);
    case "deleteFallen":
      return deleteFallenEntry(s, a.id);
    case "applyPostBattle":
      return applyPostBattleTo(s, a.playerId, a.results);
    case "addExamples":
      return addExamplesTo(s, a.playerId, rng);
    case "clearExamples":
      return clearExamplesFrom(s, a.playerId);
    case "fieldSurgeon":
      return fieldSurgeonOn(s, a.playerId, a.unitId, a.scar);
    case "promotion":
      return promoteUnit(s, a.playerId, a.unitId, a.training);
    case "seasonedRecruits":
      return recruitUnit(s, a.playerId, a.unit);

    case "adjustStat": {
      const p = getPlayer(s, a.playerId);
      if (!p || !Number.isFinite(a.delta)) return false;
      if (a.stat !== "rp" && a.stat !== "battles" && a.stat !== "wins") return false;
      let v = Math.max(0, p[a.stat] + a.delta);
      if (a.stat === "rp") v = Math.min(10, v);
      p[a.stat] = v;
      return true;
    }

    case "setProvinceOwner": {
      if (!getZone(s, a.provId)) return false;
      if (a.playerId === null) delete s.terr[a.provId];
      else if (getPlayer(s, a.playerId)) s.terr[a.provId] = a.playerId;
      else return false;
      return true;
    }

    case "updatePlayer": {
      const p = getPlayer(s, a.playerId);
      if (!p) return false;
      if (a.name !== undefined) {
        if (!a.name.trim()) return false;
        p.name = a.name;
      }
      if (a.faction !== undefined) {
        if (!Object.hasOwn(FACTIONS, a.faction)) return false;
        p.faction = a.faction;
      }
      return true;
    }

    case "addPlayer": {
      if (!a.id || getPlayer(s, a.id) || !Object.hasOwn(FACTIONS, a.faction) || !a.name.trim()) return false;
      if (a.userId !== undefined && s.players.some((x) => x.userId === a.userId)) return false;
      const p: Player = { id: a.id, name: a.name, faction: a.faction, rp: START_RP, battles: 0, wins: 0, sup: 0, scout: false, hand: [] };
      if (a.userId !== undefined) p.userId = a.userId;
      if (a.email !== undefined) p.email = a.email.trim().toLowerCase();
      s.players.push(p);
      addWorld(s, p.id, rng);
      if (s.round > 0) lateArrivalBonus(s, p, rng);
      return true;
    }

    case "removePlayer": {
      const gone = getPlayer(s, a.playerId);
      if (!gone) return false;
      s.players = s.players.filter((x) => x.id !== a.playerId);
      Object.keys(s.terr).forEach((k) => {
        if (s.terr[k] === a.playerId) delete s.terr[k];
      });
      delete s.cap[a.playerId];
      removePlayerRoster(s, a.playerId);
      if (s.ready) delete s.ready[a.playerId];
      if (s.won === a.playerId) s.won = null;
      dropPlayerPicks(s, a.playerId, gone.name);
      return true;
    }

    case "setReady": {
      if (s.round !== 0 || !getPlayer(s, a.playerId)) return false;
      const ready = { ...s.ready };
      if (a.ready) ready[a.playerId] = true;
      else delete ready[a.playerId];
      s.ready = ready;
      return true;
    }

    case "setToggle": {
      if (!isToggleKey(a.key) || typeof a.on !== "boolean") return false;
      if (toggleOn(s, a.key) === a.on) return false; // unchanged: no-op, no log line
      s.toggles = { ...s.toggles, [a.key]: a.on };
      log(s, "Campaign rule changed: ", B(TOGGLE_NAMES[a.key]), ` is now ${a.on ? "on" : "off"}.`);
      return true;
    }

    case "regen":
      if (s.round !== 0) return false;
      regen(s, rng);
      return true;

    case "reset": {
      const keep = s.players.map((p) => ({ ...p, rp: START_RP, battles: 0, wins: 0, sup: 0, scout: false, hand: [] }));
      Object.assign(s, fresh(keep, rng));
      return true;
    }
  }
}

/**
 * Apply an action. Never mutates `state` and never throws: an invalid action (wrong phase, not their
 * turn, bad index, full hand, ...) returns the input `state` object itself, so callers can detect a
 * no-op with `===`. Otherwise returns a new state.
 */
export function apply(state: CampaignState, action: Action, ctx: ApplyContext): CampaignState {
  const s = structuredClone(state);
  let ok = false;
  // Latch before the action too: adding a world or removing a player must not close an open Hollowgate.
  if (hollOpen(s)) s.hollOpened = true;
  const prevTop = s.log[0];
  try {
    ok = run(s, action, ctx.rng);
  } catch (err) {
    console.error(err);
    ok = false;
  }
  if (!ok) return state;
  if (s.undo && action.type !== "resolvePick") {
    if (!ROSTER_ONLY.has(action.type)) delete s.undo;
    else {
      // Keep the window open; remember any log lines the roster action added so Undo can keep them.
      const added = prevTop ? s.log.indexOf(prevTop) : s.log.length;
      if (added > 0) s.undo.later = [...s.log.slice(0, added), ...s.undo.later];
      if (action.type === "applyPostBattle") s.undo.reportFiled = true;
    }
  }
  if (hollOpen(s)) s.hollOpened = true;
  // Selectors may have cached lookups on `s` while it was still being changed.
  forgetRoundCache(s);
  return s;
}
