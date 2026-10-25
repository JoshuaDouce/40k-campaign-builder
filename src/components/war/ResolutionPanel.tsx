import { DefenderLines } from "./DefenderLines.tsx";
import { MyMovePanel } from "./MyMovePanel.tsx";
import { OrdersList } from "./OrdersList.tsx";
import { useActingPlayer } from "./useActingPlayer.ts";
import type { WarCtx } from "./warTypes.ts";

/** Resolution: the viewer's own pick front and centre, then every pick with its live status. */
export function ResolutionPanel(ctx: WarCtx) {
  const { state, viewer } = ctx;
  const { mine, mineInRound, actingId, setForId } = useActingPlayer(state, viewer);
  return (
    <>
      {actingId ? (
        <MyMovePanel
          key={`${state.round}-${actingId}`}
          {...ctx}
          playerId={actingId}
          isMine={actingId === mineInRound?.id}
          onBack={mineInRound && actingId !== mineInRound.id ? () => setForId(null) : undefined}
        />
      ) : mine ? (
        <div className="turn st-wrap">
          <p className="dim" style={{ margin: 0 }}>
            You take no part in this War Round. You are in from the next one.
          </p>
          <DefenderLines {...ctx} playerId={mine.id} isYou name={mine.name} />
        </div>
      ) : null}
      <OrdersList {...ctx} myId={mine?.id} actingId={actingId} onActFor={setForId} />
    </>
  );
}
