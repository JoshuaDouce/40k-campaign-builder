import { count, supplyOf } from "../../game/index.ts";
import type { CampaignState, Player } from "../../game/index.ts";

/** Mono stat line under a player's name in the War Room panels. */
export function PlayerLine({ player, state }: { player: Player; state: CampaignState }) {
  return (
    <p className="dim mono" style={{ fontSize: 12, marginTop: 4 }}>
      {player.faction.toUpperCase()} · {player.rp} RP · SUPPLY {supplyOf(player)} · {count(state, player)} PROVINCES · HAND {player.hand.length}/5
    </p>
  );
}
