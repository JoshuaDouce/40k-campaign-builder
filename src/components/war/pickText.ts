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

/** The garrison player chosen so far: the selection, else one stored by an older save, if still another player. Else "". */
export function garrisonFor(state: CampaignState, playerId: string, sel: string | null): string {
  const ok = (id: string | null | undefined): id is string => !!id && id !== playerId && !!getPlayer(state, id);
  const stored = state.picks[playerId]?.def;
  return ok(sel) ? sel : ok(stored) ? stored : "";
}

/** What a player is doing this round, from revealed picks: "in battle", "attacking Quarry Ridge", "Scout", "done". */
export function doingText(state: CampaignState, playerId: string): string {
  const pk = state.picks[playerId];
  const defending = Object.entries(state.picks).some(([id, o]) => id !== playerId && !o.done && o.battle?.def === playerId);
  if (defending || (pk?.battle && !pk.done)) return "in battle";
  if (!pk) return "no pick";
  if (pk.done) return "done";
  if (isBattleAct(pk.act)) return `attacking ${zoneName(state, pk.zone, "")}`;
  return pickLine(state, pk);
}
