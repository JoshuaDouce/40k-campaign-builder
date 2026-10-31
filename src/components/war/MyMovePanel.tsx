import { useState } from "react";
import { ACTIONS, actionDesc, defenderOf, isV12, toggleOn, getPlayer, pickStatus, planetOf, zoneName } from "../../game/index.ts";
import type { Action } from "../../game/index.ts";
import { BattleCard } from "./BattleCard.tsx";
import { DefenderLines } from "./DefenderLines.tsx";
import { GarrisonSelect } from "./GarrisonSelect.tsx";
import { ClashTag, PickBadge } from "./PickBadge.tsx";
import { PickPicker } from "./PickPicker.tsx";
import { PlayerLine } from "./PlayerLine.tsx";
import { RecuperateDialog } from "./RecuperateDialog.tsx";
import { garrisonFor, pickLineWithWorld } from "./pickText.ts";
import type { WarCtx } from "./warTypes.ts";

interface Props extends WarCtx {
  playerId: string;
  /** True when this is the viewer's own player. */
  isMine: boolean;
  /** Owner acting for someone else: go back to the owner's own pick. */
  onBack?(): void;
}

/** The acting player's own pick, front and centre, with the one next step for its status. */
export function MyMovePanel({ playerId, isMine, onBack, ...ctx }: Props) {
  const { state, dispatch, can, canActFor } = ctx;
  const player = getPlayer(state, playerId);
  const [switching, setSwitching] = useState(false);
  const [defSel, setDefSel] = useState<string | null>(null);
  const [recuperating, setRecuperating] = useState(false);
  if (!player) return null;
  const pk = state.picks[playerId];
  const status = pickStatus(state, playerId);
  const who = isMine ? "You" : player.name;
  const def = ACTIONS.find((a) => a.id === pk?.act);
  // A Conquer on an unclaimed province: the roller picks the garrison player now that every pick is revealed.
  const needsGarrison = !!pk && pk.act === "conquer" && !!pk.zone && !defenderOf(state, playerId);
  const garrisonId = garrisonFor(state, playerId, defSel);
  const roll: Action = { type: "rollPick", playerId, ...(needsGarrison && garrisonId ? { def: garrisonId } : {}) };
  const confirm: Action = { type: "confirmQuietPick", playerId };
  const switchOk = canActFor(playerId);
  const world = planetOf(state, pk?.zone)?.name;
  const showSwitch = switching && status?.kind === "waiting";

  const picker = (kind: "waiting" | "fell") => (
    <PickPicker
      state={state}
      player={player}
      greyTiedUp
      submitLabel="Switch"
      allowed={switchOk}
      hint={kind === "fell" ? "Free provinces and quiet actions are offered. Provinces tied up by another pick are greyed." : `${isV12(state) ? "Muster" : "Scout, Muster"} and Recuperate are always available and need no target.`}
      onSubmit={(c) => {
        dispatch({ type: "switchPick", playerId, ...c });
        setSwitching(false);
      }}
      extra={
        kind === "waiting" ? (
          <button type="button" className="btn" onClick={() => setSwitching(false)}>
            Keep my pick
          </button>
        ) : null
      }
    />
  );

  return (
    <div className="turn st-wrap">
      <div className="eyebrow">War Round {state.round} · Play</div>
      <h4>{showSwitch ? "Switch to something else" : player.name}</h4>
      <PlayerLine player={player} state={state} />
      {onBack ? (
        <div className="row" style={{ marginTop: 8 }}>
          <button type="button" className="btn sm" onClick={onBack}>
            Back to my pick
          </button>
        </div>
      ) : null}
      {!isMine ? (
        <p className="dim" style={{ margin: "8px 0 0" }}>
          Acting for {player.name}.
        </p>
      ) : null}

      <div className="st-move" aria-live="polite">
        {status?.kind === "fell" ? (
          <>
            <div className="st-fall">
              <b>{player.name}&apos;s pick fell through:</b> {status.reason}. Choose again.
            </div>
            <div className="bd">
              <PickBadge status={status} />
            </div>
          </>
        ) : pk && status && !showSwitch && status.kind !== "done" ? (
          <>
            <div className="st-mine">
              {who}: {pickLineWithWorld(state, pk)}
            </div>
            <div className="bd">
              <PickBadge status={status} />
              <ClashTag state={state} playerId={playerId} />
            </div>
          </>
        ) : null}
      </div>

      {!pk || !status ? (
        <p className="dim" style={{ margin: "10px 0 0" }}>
          No pick was made.
        </p>
      ) : status.kind === "done" ? (
        <p className="st-done">{isMine ? "Your move is done." : `${player.name}'s move is done.`}</p>
      ) : status.kind === "fell" ? (
        picker("fell")
      ) : showSwitch ? (
        picker("waiting")
      ) : status.kind === "battle" ? (
        <BattleCard state={state} dispatch={dispatch} can={can} playerId={playerId} />
      ) : status.kind === "waiting" ? (
        <>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn" disabled={!switchOk} onClick={() => setSwitching(true)}>
              Switch to something else
            </button>
          </div>
          <p className="hint">You can switch at any time. No penalty, no cost.</p>
        </>
      ) : def?.battle ? (
        <div className="battle">
          <div className="eyebrow">
            {world ? `${world} · ` : ""}
            {zoneName(state, pk.zone, "")}
          </div>
          {needsGarrison ? (
            <GarrisonSelect state={state} playerId={playerId} id={`roll-garrison-${playerId}`} value={garrisonId} onChange={setDefSel} disabled={!switchOk} />
          ) : null}
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn primary" disabled={!can(roll) || (needsGarrison && !garrisonId)} onClick={() => dispatch(roll)}>
              {toggleOn(state, "twists") ? "Roll twists" : "Set up battle"}
            </button>
          </div>
        </div>
      ) : def ? (
        <>
          <p style={{ marginTop: 10 }}>{actionDesc(state, def)}</p>
          <button type="button" className="btn primary" disabled={!can(confirm)} onClick={() => (def.id === "recuperate" ? setRecuperating(true) : dispatch(confirm))}>
            Confirm {def.n}
          </button>
          {recuperating && (
            <RecuperateDialog
              state={state}
              playerId={playerId}
              onClose={() => setRecuperating(false)}
              onGo={(scars) => {
                setRecuperating(false);
                dispatch({ ...confirm, scars });
              }}
            />
          )}
        </>
      ) : null}

      <DefenderLines {...ctx} playerId={playerId} isYou={isMine} name={player.name} />
    </div>
  );
}
