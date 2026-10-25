import { ACTIONS, defenderOf, getPlayer, isBattleAct, planetOf, zoneName } from "../../game/index.ts";
import type { ActionId, CampaignState, RoundPick } from "../../game/index.ts";

export function actionName(act: ActionId | null | undefined): string {
  return ACTIONS.find((a) => a.id === act)?.n ?? "";
}

/** "Conquer Quarry Ridge" or "Scout". */
export function pickLine(state: CampaignState, pk: RoundPick): string {
  const a = actionName(pk.act);
  const p = zoneName(state, pk.zone, "");
  return p ? `${a} ${p}` : a;
}

/** "Conquer Quarry Ridge on Ash Moon" or "Scout". */
export function pickLineWithWorld(state: CampaignState, pk: RoundPick): string {
  const w = planetOf(state, pk.zone)?.name;
  return w ? `${pickLine(state, pk)} on ${w}` : pickLine(state, pk);
}

/** Who a player's pick is against: the holder, the chosen or rolled garrison player, or nobody for quiet picks. */
export function againstText(state: CampaignState, playerId: string): string | null {
  const pk = state.picks[playerId];
  if (!pk?.zone || !isBattleAct(pk.act)) return null;
  const d = getPlayer(state, defenderOf(state, playerId));
  if (pk.battle) {
    const name = d?.name ?? "";
    return pk.battle.garrison ? `${name} (garrison)` : name;
  }
  if (d) return d.name;
  const g = getPlayer(state, pk.def);
  return g ? `${g.name} (garrison)` : "unclaimed";
}

/** The garrison player actually used: the selection if it is still another player, else the first other player. */
export function garrisonFor(state: CampaignState, playerId: string, sel: string | null): string {
  const others = state.players.filter((p) => p.id !== playerId);
  return sel && others.some((p) => p.id === sel) ? sel : (others[0]?.id ?? "");
}
