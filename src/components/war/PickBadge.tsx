import { clashOf } from "../../game/index.ts";
import type { CampaignState, PickStatus } from "../../game/index.ts";

/** Status pill. The text is always shown; colour only reinforces it. */
export function PickBadge({ status }: { status: PickStatus | null }) {
  if (!status) return null;
  switch (status.kind) {
    case "ready":
      return <span className="st-b ready">Ready to play</span>;
    case "battle":
      return <span className="st-b battle">In battle</span>;
    case "waiting":
      return <span className="st-b wait">Waiting on {status.on}</span>;
    case "fell":
      return <span className="st-b again">Choose again</span>;
    case "done":
      return <span className="st-b done">Done</span>;
  }
}

/** "Clash at {Province}: {Name} first", or nothing if the pick is not in a clash. */
export function ClashTag({ state, playerId }: { state: CampaignState; playerId: string }) {
  const c = clashOf(state, playerId);
  if (!c) return null;
  return (
    <span className="st-tag">
      Clash at {c.zoneName}: {c.firstName} first
    </span>
  );
}
