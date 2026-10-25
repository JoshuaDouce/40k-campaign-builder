import { useState } from "react";
import { slotIds } from "../../game/index.ts";
import type { CampaignState } from "../../game/index.ts";
import type { CampaignViewer } from "../../store/useCampaign.ts";

/**
 * Whose pick the War Room panel shows: the viewer's own player, or (owner only) a player they chose to act for.
 * `mineInRound` is the viewer's player if it has a slot in this round.
 */
export function useActingPlayer(state: CampaignState, viewer: CampaignViewer) {
  const slots = slotIds(state);
  const mine = viewer.userId !== null ? state.players.find((p) => p.userId === viewer.userId) : undefined;
  const mineInRound = mine && slots.includes(mine.id) ? mine : undefined;
  const [forId, setForId] = useState<string | null>(null);
  const actingId = viewer.isOwner && forId && slots.includes(forId) ? forId : (mineInRound?.id ?? null);
  return { slots, mine, mineInRound, actingId, setForId };
}
