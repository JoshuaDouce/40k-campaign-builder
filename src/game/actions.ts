// The single entry point for every state change.
import { drawCard } from "./cards.ts";
import { ACTIONS, FACTIONS } from "./data.ts";
import { beginRound, doQuiet, endTurn, fresh, regen, resolve, rollBattle, rollTwists, targets } from "./engine.ts";
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
import { currentActor, getPlayer, getZone, hollOpen, provsOf } from "./selectors.ts";
import type { Action, CampaignState, Player } from "./types.ts";

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
      if (s.turnIdx !== null || !s.players.length) return false;
      beginRound(s, rng);
      return true;

    case "chooseAction": {
      const actor = currentActor(s);
      const def = ACTIONS.find((x) => x.id === a.act);
      if (!actor || s.pend || !def) return false;
      if (def.battle) {
        if (s.players.length < 2 || !targets(s, actor, def.id).length) return false;
      } else if (def.id === "fortify" && !provsOf(s, actor).length) return false;
      s.pend = { act: def.id, actor: actor.id };
      return true;
    }

    case "cancelAction":
      if (!s.pend || s.pend.rolled) return false;
      s.pend = null;
      return true;

    case "rollBattle":
      return rollBattle(s, { zone: a.zone, def: a.def }, rng);

    case "rerollTwists":
      if (!s.pend?.rolled) return false;
      rollTwists(s, rng);
      return true;

    case "resolveBattle":
      if (a.result !== "a" && a.result !== "d" && a.result !== "x") return false;
      if (a.decisive !== undefined && typeof a.decisive !== "boolean") return false;
      return resolve(s, a.result, rng, a.decisive);

    case "confirmQuiet":
      return doQuiet(s, a.fortZone, rng);

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
      return promoteUnit(s, a.playerId, a.unitId, a.enhancement);
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
      const p: Player = { id: a.id, name: a.name, faction: a.faction, rp: 5, battles: 0, wins: 0, sup: 0, scout: false, hand: [] };
      if (a.userId !== undefined) p.userId = a.userId;
      s.players.push(p);
      addWorld(s, p.id, rng);
      return true;
    }

    case "removePlayer": {
      if (!getPlayer(s, a.playerId)) return false;
      const wasActor = currentActor(s)?.id === a.playerId;
      s.players = s.players.filter((x) => x.id !== a.playerId);
      Object.keys(s.terr).forEach((k) => {
        if (s.terr[k] === a.playerId) delete s.terr[k];
      });
      delete s.cap[a.playerId];
      removePlayerRoster(s, a.playerId);
      if (s.won === a.playerId) s.won = null;
      if (s.pend && (s.pend.actor === a.playerId || s.pend.def === a.playerId)) s.pend = null;
      if (wasActor) endTurn(s);
      return true;
    }

    case "regen":
      if (s.round !== 0) return false;
      regen(s, rng);
      return true;

    case "reset": {
      const keep = s.players.map((p) => ({ ...p, rp: 5, battles: 0, wins: 0, sup: 0, scout: false, hand: [] }));
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
  try {
    ok = run(s, action, ctx.rng);
  } catch (err) {
    console.error(err);
    ok = false;
  }
  if (!ok) return state;
  if (hollOpen(s)) s.hollOpened = true;
  return s;
}
