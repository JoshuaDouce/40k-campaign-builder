import { getPlayer, notReady } from "../../game/index.ts";
import type { Action } from "../../game/index.ts";
import { BattleCard } from "./BattleCard.tsx";
import { PickPicker } from "./PickPicker.tsx";
import { PlayerLine } from "./PlayerLine.tsx";
import { pickLineWithWorld } from "./pickText.ts";
import { useActingPlayer } from "./useActingPlayer.ts";
import type { WarCtx } from "./warTypes.ts";

export function PlanPanel({ state, dispatch, viewer, colors, can, canActFor }: WarCtx) {
  const { slots, mine, mineInRound, actingId, setForId } = useActingPlayer(state, viewer);
  const acting = getPlayer(state, actingId);
  const pk = acting ? state.picks[acting.id] : undefined;
  const isMine = !!acting && acting.id === mineInRound?.id;
  const waiting = notReady(state).length;
  // This panel only shows in Planning, so everyone is Ready exactly when the owner may reveal.
  const allReady = waiting === 0;
  const reveal: Action = { type: "revealPicks" };
  const revealOk = allReady && can(reveal);
  const inBattle = slots.filter((id) => state.picks[id]?.battle && !state.picks[id]?.done);
  const hasBattle = !!pk?.battle && !pk.done;

  return (
    <div className="turn st-wrap">
      <div className="eyebrow">War Round {state.round} · Planning</div>
      <h4>Plan your move</h4>
      {acting ? <PlayerLine player={acting} state={state} /> : null}
      {mine && !mineInRound ? (
        <p className="dim" style={{ margin: "10px 0 0" }}>
          You joined after this round began, so you take no part in it. You are in from the next War Round.
        </p>
      ) : null}
      {acting && !isMine ? (
        <div className="row" style={{ marginTop: 10 }}>
          <span>Picking for {acting.name}.</span>
          {mineInRound ? (
            <button type="button" className="btn sm" onClick={() => setForId(null)}>
              Back to my pick
            </button>
          ) : null}
        </div>
      ) : null}
      {acting && !hasBattle ? (
        pk?.ready ? (
          <>
            <div className="st-mine">
              {isMine ? "You" : acting.name}: {pickLineWithWorld(state, pk)}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn"
                disabled={!can({ type: "unreadyPick", playerId: acting.id })}
                onClick={() => dispatch({ type: "unreadyPick", playerId: acting.id })}
              >
                Unready to change
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="dim" style={{ margin: "10px 0 0" }}>
              Choose your action in secret. Nobody sees it until the owner reveals.
            </p>
            <PickPicker
              key={`${state.round}-${acting.id}-${pk ? "kept" : "new"}`}
              state={state}
              player={acting}
              initial={pk}
              submitLabel="Ready"
              allowed={canActFor(acting.id)}
              onSubmit={(c) => dispatch({ type: "readyPick", playerId: acting.id, ...c })}
            />
          </>
        )
      ) : null}
      {!acting && viewer.isOwner ? (
        <p className="dim" style={{ margin: "10px 0 0" }}>
          Use Pick for them on a player below to choose for them.
        </p>
      ) : null}

      <ul className="st-roster" aria-label="Players">
        {slots.map((id) => {
          const p = getPlayer(state, id);
          if (!p) return null;
          const k = state.picks[id];
          const live = !!k?.battle && !k.done;
          const stat = k?.done ? "Done" : live ? "In battle" : k?.ready ? "Ready" : "Choosing…";
          const ok = !!k?.ready || !!k?.done;
          return (
            <li key={id} className="st-pl">
              <span className="nm">
                <span className="dot" style={{ background: colors[id] }}></span>
                {p.name}
                {id === mineInRound?.id ? <span className="st-you">(you)</span> : null}
              </span>
              <span className={`st-stat${ok ? " ok" : ""}`}>{stat}</span>
              {viewer.isOwner && k?.ready && !live && !k.done ? (
                <button
                  type="button"
                  className="btn sm"
                  disabled={!can({ type: "unreadyPick", playerId: id })}
                  onClick={() => dispatch({ type: "unreadyPick", playerId: id })}
                >
                  Unready to change
                </button>
              ) : null}
              {viewer.isOwner && !k?.ready && !live && id !== actingId ? (
                <button type="button" className="btn sm" onClick={() => setForId(id)}>
                  Pick for them
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {waiting > 0 ? <p className="hint">Waiting for {waiting} more to be Ready.</p> : null}
      {viewer.isOwner ? (
        <>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn primary" disabled={!revealOk} aria-describedby={revealOk ? undefined : "reveal-why"} onClick={() => dispatch(reveal)}>
              Reveal all picks
            </button>
          </div>
          {allReady ? null : (
            <p className="hint" id="reveal-why">
              Everyone must be Ready first.
            </p>
          )}
        </>
      ) : null}
      {inBattle.length ? (
        <>
          <h3 style={{ marginTop: 18 }}>Battle in progress</h3>
          {inBattle.map((id) => (
            <div key={id}>
              <p className="dim" style={{ margin: "8px 0 0" }}>
                {getPlayer(state, id)?.name}
              </p>
              <BattleCard state={state} dispatch={dispatch} can={can} playerId={id} />
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
