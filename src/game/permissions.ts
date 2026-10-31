// Who may send which action. Honour-system for the MVP: this is enforced in the UI only.
import { droppedEarned, droppedScars, loweredHistory, rosterOf } from "./roster.ts";
import { getPlayer } from "./selectors.ts";
import type { Action, ActionType, CampaignState } from "./types.ts";

export interface PermissionContext {
  /** Signed-in user id, or null when not a member. */
  userId: string | null;
  isOwner: boolean;
}

/** True if this viewer may act for `playerId`: the owner always; anyone else only for their own player. */
export function canActFor(s: CampaignState, playerId: string, ctx: PermissionContext): boolean {
  return ctx.isOwner || controls(s, playerId, ctx.userId);
}

/** Actions only the owner may send. */
export const OWNER_ONLY: ReadonlySet<ActionType> = new Set<ActionType>([
  "revealPicks",
  "adjustStat",
  "setProvinceOwner",
  "removePlayer",
  "organiserRemoveUnit",
  "refundTraining",
  "removeRelic",
  "organiserAddCard",
  "organiserRemoveCard",
  "deleteFallen",
  "setToggle",
  "upgradeRules",
  "regen",
  "reset",
]);

/** True if `playerId` exists, has a userId, and it is `userId`. Players without a userId are owner-only. */
export function controls(s: CampaignState, playerId: string, userId: string | null): boolean {
  const p = getPlayer(s, playerId);
  return !!p && userId !== null && p.userId !== undefined && p.userId === userId;
}

export function canPerform(state: CampaignState, action: Action, ctx: PermissionContext): boolean {
  if (ctx.isOwner) return true;
  if (OWNER_ONLY.has(action.type)) return false;
  const { userId } = ctx;
  switch (action.type) {
    case "beginRound":
      // Starting the campaign (War Round 1) is the owner's call; later rounds any member can begin.
      return userId !== null && state.round !== 0;

    case "readyPick":
    case "unreadyPick":
    case "rollPick":
    case "rerollPick":
    case "setGarrisonEdge":
    case "confirmQuietPick":
    case "switchPick":
      return controls(state, action.playerId, userId);

    case "setArmyList":
    case "tallyUnit":
    case "markGlory":
      return controls(state, action.side, userId);

    case "setBattleStarted":
    case "resolvePick": {
      const b = state.picks[action.playerId]?.battle;
      return controls(state, action.playerId, userId) || (!!b && controls(state, b.def, userId));
    }

    case "undoBattle": {
      const u = state.undo;
      return !!u && !u.reportFiled && u.attacker === action.attacker && (controls(state, u.attacker, userId) || (u.defender !== undefined && controls(state, u.defender, userId)));
    }

    case "updateUnit": {
      // Earned Battle Honours, Battle Training and Battle Scars stay, and XP, battles and kills never go down: only the
      // owner can correct those. Otherwise a player could clear a unit's history to unlock it. Players remove scars
      // through Recuperate or a Field Surgeon.
      const old = rosterOf(state, action.playerId).find((u) => u.id === action.unit.id);
      return controls(state, action.playerId, userId) && !(old && (droppedEarned(old, action.unit).length || droppedScars(old, action.unit).length || loweredHistory(old, action.unit).length));
    }

    case "requisitionDeck":
    case "playCard":
    case "discardCard":
    case "buyReinforcements":
    case "buyDatasheet":
    case "addUnit":
    case "removeUnit":
    case "addRelic":
    case "applyPostBattle":
    case "addExamples":
    case "clearExamples":
    case "fieldSurgeon":
    case "promotion":
    case "seasonedRecruits":
    case "updatePlayer":
    case "setReady":
      return controls(state, action.playerId, userId);

    case "addPlayer":
      return userId !== null && action.userId === userId && !state.players.some((p) => p.userId === userId);
  }
  return false;
}
