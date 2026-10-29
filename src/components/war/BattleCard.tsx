import { useState } from "react";
import { armySides, battleInfo, battleSizeOf, LIGHT_FORCES_MAX_PTS, LIGHT_FORCES_TWIST, planetOf, r5, TWISTS, VTYPES } from "../../game/index.ts";
import type { Action, CampaignState, GarrisonEdge } from "../../game/index.ts";
import { ArmyList } from "./ArmyList.tsx";
import { BattleTally } from "./BattleTally.tsx";

interface Props {
  state: CampaignState;
  dispatch(a: Action): void;
  can(a: Action): boolean;
  /** The attacker whose battle this is. Each battle keeps its own decisive choice. */
  playerId: string;
}

/** One rolled battle: its twists, fixed figures, and the buttons to record the result or re-roll. */
export function BattleCard({ state, dispatch, can, playerId }: Props) {
  const B = battleInfo(state, playerId);
  const [decisive, setDecisive] = useState(false);
  if (!B) return null;
  const planet = planetOf(state, B.v);
  const selId = `decisiveSel-${playerId}`;
  const results: Array<{ result: "a" | "d" | "x"; label: string; primary: boolean }> = [
    { result: "a", label: `${B.a.name} won`, primary: true },
    { result: "d", label: `${B.d.name} won${B.garrison ? " (garrison)" : ""}`, primary: true },
    { result: "x", label: "Draw", primary: false },
  ];
  const reroll: Action = { type: "rerollPick", playerId };
  const edge: GarrisonEdge = B.edge ?? "attacker";
  const edgeId = `edgeSel-${playerId}`;
  const setEdge = (e: GarrisonEdge): Action => ({ type: "setGarrisonEdge", playerId, edge: e });
  const size = battleSizeOf(B.pts, B.twists);
  const started = !!B.started;
  const startAct = (on: boolean): Action => ({ type: "setBattleStarted", playerId, on });
  const sides = armySides({ def: B.d.id, garrison: B.garrison }, playerId);
  return (
    <div className="battle">
      <div className="eyebrow">
        {planet && B.v.type !== "rift" ? `${planet.name} · ${VTYPES[B.v.type].n}` : "The Hollowgate"} · {B.v.name}
        {B.garrison ? " · Garrison battle" : ""}
      </div>
      <div className="size">{B.pts} pts</div>
      <p className="mono" style={{ fontSize: 12, color: "var(--brass)" }}>
        {size.n.toUpperCase()} · {size.board} BOARD · {size.dp} DETACHMENT POINTS
      </p>
      {B.garrison && (
        <>
          <p className="mono dim" style={{ fontSize: 12 }}>
            GARRISON {B.defenderPts ?? B.pts} PTS{edge === "defender" ? " (-20%)" : ""} · {B.a.name.toUpperCase()} {B.attackerPts} PTS
            {edge === "attacker" ? " (+20%)" : ""}
          </p>
          <div className="field">
            <label htmlFor={edgeId}>Garrison handicap ({B.a.name} chooses)</label>
            <select id={edgeId} value={edge} disabled={started || !can(setEdge(edge))} onChange={(e) => dispatch(setEdge(e.target.value as GarrisonEdge))}>
              <option value="attacker">
                {B.a.name} +20% ({r5(B.pts * 1.2)} pts vs {B.pts})
              </option>
              <option value="defender">
                Garrison -20% ({B.pts} pts vs {r5(B.pts * 0.8)})
              </option>
            </select>
          </div>
        </>
      )}
      <p className="mono dim" style={{ fontSize: 12 }}>
        {B.a.name.toUpperCase()} (ATTACKER) VS {B.d.name.toUpperCase()} ({B.garrison ? "GARRISON" : "DEFENDER"}) · FATE CARDS: UP TO {B.cards} EACH
      </p>
      {B.twists.map((i) => (
        <div className="twist" key={i}>
          <span className="mono" style={{ fontSize: 11, color: "var(--blood)" }}>
            TWIST · D12 {i + 1}
          </span>
          <br />
          <b>{TWISTS[i].t}</b>
          <br />
          {TWISTS[i].e}
        </div>
      ))}
      {B.lightForces && (
        <div className="twist" style={{ borderColor: "var(--verd)" }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--verd)" }}>
            LIGHT FORCES · {LIGHT_FORCES_MAX_PTS} PTS OR FEWER
          </span>
          <br />
          {TWISTS[LIGHT_FORCES_TWIST].e}
        </div>
      )}
      <div className="twist" style={{ borderColor: "var(--verd)" }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--verd)" }}>
          WORLD · {B.trait.n.toUpperCase()}
        </span>
        <br />
        {B.trait.trait}
      </div>
      {B.notes.map((n) => (
        <p key={n} style={{ fontSize: 14.5, margin: "4px 0" }}>
          {n}
        </p>
      ))}
      <p className="hint">{started ? "Points and notes are fixed for this battle." : "Points and notes are fixed now. Re-roll works them out again."}</p>
      {started ? (
        <>
          <p className="mono" style={{ fontSize: 12, color: "var(--verd)", marginTop: 12 }}>
            ◆ BATTLE IN PROGRESS · ARMY LISTS AND TWISTS LOCKED
          </p>
          {sides.map((side) => (
            <BattleTally key={side} state={state} dispatch={dispatch} can={can} attackerId={playerId} side={side} battle={B} />
          ))}
          <div className="row">
            <button type="button" className="btn sm" disabled={!can(startAct(false))} onClick={() => dispatch(startAct(false))}>
              Back to army lists
            </button>
          </div>
        </>
      ) : (
        <>
          {sides.map((side) => (
            <ArmyList key={side} state={state} dispatch={dispatch} can={can} attackerId={playerId} side={side} battle={B} />
          ))}
          <div className="row" style={{ marginTop: 10 }}>
            <button type="button" className="btn primary" disabled={!can(startAct(true))} onClick={() => dispatch(startAct(true))}>
              Battle started
            </button>
          </div>
          <p className="hint">Locks the army lists and twists. Track losses, kills and Marked for Glory as you play; the post-battle helper starts from them.</p>
        </>
      )}
      <p className="mono" style={{ fontSize: 12, color: "var(--brass)", marginTop: 12 }}>
        PLAY THE BATTLE WITH NORMAL FORCE RULES, THEN RECORD THE RESULT
      </p>
      {B.garrison && (
        <>
          <div className="field">
            <label htmlFor={selId}>Decisive win? (attacker lost under 25% of their army)</label>
            <select id={selId} value={decisive ? "yes" : "no"} onChange={(e) => setDecisive(e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <p className="dim" style={{ fontSize: 14 }}>
            Only counts if {B.a.name} wins. Yes gives {B.a.name} +1 extra RP.
          </p>
        </>
      )}
      <div className="row">
        {results.map((r) => {
          const a: Action = { type: "resolvePick", playerId, result: r.result, decisive };
          return (
            <button key={r.result} type="button" className={r.primary ? "btn primary" : "btn"} disabled={!can(a)} onClick={() => dispatch(a)}>
              {r.label}
            </button>
          );
        })}
        <button type="button" className="btn sm" disabled={started || !can(reroll)} onClick={() => dispatch(reroll)}>
          Re-roll twists
        </button>
      </div>
    </div>
  );
}
