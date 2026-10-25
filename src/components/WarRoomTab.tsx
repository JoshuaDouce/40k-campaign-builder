import { canActFor, canPerform, getPlayer, stageText, provsOf } from "../game/index.ts";
import type { Action } from "../game/index.ts";
import { useCampaign } from "../store/useCampaign.ts";
import { PlanPanel } from "./war/PlanPanel.tsx";
import { ResolutionPanel } from "./war/ResolutionPanel.tsx";
import { UndoBattle } from "./UndoBattle.tsx";
import type { WarCtx } from "./war/warTypes.ts";
import type { TabId } from "../store/useDevicePrefs.ts";

interface Props {
  colors: Record<string, string>;
  onNavigate: (tab: TabId) => void;
}

export function WarRoomTab({ colors, onNavigate }: Props) {
  const { state, dispatch, viewer } = useCampaign();
  const can = (a: Action) => canPerform(state, a, viewer);
  const actFor = (playerId: string) => canActFor(state, playerId, viewer);

  return (
    <section className="tab" id="war">
      <h2>War Room</h2>
      <p className="dim">Runs the campaign round by round: plan in secret, reveal, then play your picks side by side. Battle results update the map and players automatically. Record XP and scars on your own rosters.</p>
      <div>
        {state.players.length < 2 && state.phase === null ? (
          <div className="turn">
            <h4>Waiting for players</h4>
            <p className="dim" style={{ marginTop: 6 }}>
              A War Round needs at least 2 players.
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn primary" disabled>
                Begin War Round
              </button>
            </div>
          </div>
        ) : (
          <WarBody state={state} dispatch={dispatch} viewer={viewer} colors={colors} can={can} canActFor={actFor} onNavigate={onNavigate} />
        )}
      </div>
      <h3>Campaign log</h3>
      <ul className="log">
        {state.log.length ? (
          state.log.slice(0, 25).map((l, i) => (
            <li key={`${state.log.length - i}`}>
              <span className="r">R{l.r}</span>
              {l.segs.map((seg, j) => (seg.b ? <b key={j}>{seg.t}</b> : <span key={j}>{seg.t}</span>))}
            </li>
          ))
        ) : (
          <li>Nothing yet. Begin the first War Round.</li>
        )}
      </ul>
    </section>
  );
}

interface BodyProps extends WarCtx {
  onNavigate: (tab: TabId) => void;
}

function WarBody({ onNavigate, ...ctx }: BodyProps) {
  const { state, dispatch, can } = ctx;
  const winner = getPlayer(state, state.won);
  return (
    <>
      <div className="row mono" style={{ fontSize: 13, color: "var(--brass)" }}>
        {stageText(state)}
      </div>
      {state.phase ? (
        <div className="row mono" style={{ fontSize: 13, color: "var(--brass)" }}>
          War Round {state.round} · {state.phase === "planning" ? "Plan" : "Play"}
        </div>
      ) : null}
      {state.won ? (
        <div className="win">
          <span className="eyebrow">The Reach is taken</span>
          <b>{winner ? winner.name : "Someone"}</b>holds the Hollowgate. Play on for a rematch, or reset the campaign.
        </div>
      ) : null}
      {state.phase === null && state.round === 0 ? (
        <div className="card" style={{ margin: "12px 0" }}>
          <div className="k">
            <span>Round 0</span>
          </div>
          <div className="t">Campaign setup is under way</div>
          <p className="e dim" style={{ margin: "0 0 6px" }}>
            Finish it on the Setup tab to start War Round 1.
          </p>
          <div className="row">
            <button className="btn primary" onClick={() => onNavigate("setup")}>
              Go to Setup
            </button>
          </div>
        </div>
      ) : state.phase === null ? (
        <BetweenRounds state={state} dispatch={dispatch} can={can} />
      ) : state.phase === "planning" ? (
        <PlanPanel {...ctx} />
      ) : (
        <ResolutionPanel {...ctx} />
      )}
      <UndoBattle key={state.undo ? `${state.round}-${state.history?.length ?? 0}` : "none"} state={state} dispatch={dispatch} viewer={ctx.viewer} />
    </>
  );
}

function BetweenRounds({ state, dispatch, can }: Pick<BodyProps, "state" | "dispatch" | "can">) {
  const homeless = state.players.filter((p) => !provsOf(state, p).length);
  return (
    <div className="turn">
      <div className="eyebrow">War Round {state.round} complete</div>
      <h4>War Round {state.round + 1}</h4>
      {homeless.length ? (
        <p style={{ marginTop: 8, color: "var(--blood)" }}>
          {homeless.map((p) => p.name).join(", ")} hold no provinces. They can Conquer any unclaimed province on an outer world.
        </p>
      ) : null}
      <p>Everyone draws a Fate Card and collects RP from Capitals and Hive Cities. Then everyone plans in secret and plays at the same time; only players on the same province wait.</p>
      <button className="btn primary" disabled={!can({ type: "beginRound" })} onClick={() => dispatch({ type: "beginRound" })}>
        Begin War Round {state.round + 1}
      </button>
    </div>
  );
}
