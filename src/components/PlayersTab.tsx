import { useEffect, useState } from "react";
import { canPerform, count, getPlanet, getProvince, HAND_LIMIT, isV12, supplyOf } from "../game/index.ts";
import type { Action, CampaignState, FactionName, Player, StatKey } from "../game/index.ts";
import { useCampaign } from "../store/useCampaign.ts";
import type { TabId } from "../store/useDevicePrefs.ts";
import { BattleHistory } from "./BattleHistory.tsx";
import { DeleteCampaign } from "./account/DeleteCampaign.tsx";
import { MembersPanel } from "./account/MembersPanel.tsx";
import { WaitingNote } from "./account/WaitingNote.tsx";
import { PlayerLog } from "./PlayerLog.tsx";
import { FactionOptions } from "./FactionOptions.tsx";
import { OrganiserCards } from "./OrganiserCards.tsx";
import { PlayerNameInput } from "./PlayerNameInput.tsx";

const STAT_LABELS: ReadonlyArray<readonly [StatKey, string]> = [
  ["rp", "Requisition"],
  ["battles", "Battles"],
  ["wins", "Wins"],
];

interface TabProps {
  colors: Record<string, string>;
  onNavigate: (tab: TabId) => void;
  /** The organiser opens the join screen to play in this campaign too. */
  onPlay: () => void;
  /** The campaign was deleted: leave it. */
  onDeleted: () => void;
}

export function PlayersTab({ colors, onNavigate, onPlay, onDeleted }: TabProps) {
  const { state, dispatch, viewer, members } = useCampaign();
  const [resetOpen, setResetOpen] = useState(false);
  const setup = state.round === 0;
  const waiting = members.filter((m) => !state.players.some((p) => p.email === m));
  const ownerNotPlaying = viewer.isOwner && !state.players.some((p) => p.userId === viewer.userId);

  return (
    <section className="tab" id="tracker">
      <h2>Players</h2>
      {viewer.isOwner ? <MembersPanel /> : null}
      <WaitingNote emails={waiting} />
      <p className="dim">{setup ? "Rename players here." : "Rename or remove players here."} Play your Fate Cards and spend RP on My Warband.</p>
      {setup ? <div className="su-pointer">Setting up? Use the Setup tab to chart the Reach and begin.</div> : null}
      {ownerNotPlaying ? (
        <div className="row">
          <button className="btn" onClick={onPlay}>
            Play in this campaign
          </button>
        </div>
      ) : null}
      {state.round >= 1 && (
        <p className="dim">The campaign is under way, so new players get a catch-up bonus: extra supply and a Fate Card.</p>
      )}
      <div className="cols2">
        {state.players.length ? (
          state.players.map((p) => (
            <PlayerCard key={p.id} player={p} state={state} color={colors[p.id]} setup={setup} />
          ))
        ) : (
          <p className="dim" style={{ marginTop: 16 }}>
            No players yet. Members appear here once they pick a faction.
          </p>
        )}
      </div>
      <PlayerLog colors={colors} />
      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn danger sm" disabled={!canPerform(state, { type: "reset" }, viewer)} onClick={() => setResetOpen(true)}>
          Reset campaign
        </button>
        {resetOpen ? (
          <span>
            <span className="mono" style={{ fontSize: 12 }}>
              Wipe everything?
            </span>{" "}
            <button
              className="btn danger sm"
              onClick={() => {
                dispatch({ type: "reset" });
                setResetOpen(false);
                onNavigate("setup");
              }}
            >
              Yes, reset
            </button>{" "}
            <button className="btn sm" onClick={() => setResetOpen(false)}>
              Cancel
            </button>
          </span>
        ) : null}
      </div>
      {viewer.isOwner ? <DeleteCampaign onDeleted={onDeleted} /> : null}
    </section>
  );
}

interface CardProps {
  player: Player;
  state: CampaignState;
  color: string | undefined;
  setup: boolean;
}

function PlayerCard({ player: p, state, color, setup }: CardProps) {
  const { dispatch, viewer } = useCampaign();
  const [armedAt, setArmedAt] = useState<CampaignState | null>(null);
  const can = (a: Action) => canPerform(state, a, viewer);
  const cap = state.cap[p.id] ? getProvince(state, state.cap[p.id]) : undefined;
  const capPlanet = cap ? getPlanet(state, cap.pl) : undefined;
  const n = count(state, p);
  const canEdit = can({ type: "updatePlayer", playerId: p.id });

  // Any action on this card (or any state change) disarms the two-step Remove, as a prototype re-render did.
  const armed = armedAt === state;
  useEffect(() => {
    if (!armedAt) return;
    const t = setTimeout(() => setArmedAt(null), 4000);
    return () => clearTimeout(t);
  }, [armedAt]);

  return (
    <div className="player">
      <div className="top">
        <span className="dot" style={{ background: color, width: 14, height: 14 }}></span>
        <PlayerNameInput playerId={p.id} name={p.name} disabled={!canEdit} label="Player name" />
        <select
          aria-label="Faction"
          value={p.faction}
          disabled={!canEdit}
          onChange={(e) => dispatch({ type: "updatePlayer", playerId: p.id, faction: e.target.value as FactionName })}
        >
          <FactionOptions />
        </select>
      </div>
      <div className="stats">
        {STAT_LABELS.map(([k, label]) => {
          const dec: Action = { type: "adjustStat", playerId: p.id, stat: k, delta: -1 };
          const inc: Action = { type: "adjustStat", playerId: p.id, stat: k, delta: 1 };
          return (
            <div className="stat" key={k}>
              <div className="l">{label}</div>
              <div className="v">{p[k]}</div>
              <div className="pm">
                <button className="btn sm" aria-label="Decrease" disabled={!can(dec)} onClick={() => dispatch(dec)}>
                  −
                </button>
                <button className="btn sm" aria-label="Increase" disabled={!can(inc)} onClick={() => dispatch(inc)}>
                  +
                </button>
              </div>
            </div>
          );
        })}
        <div className="stat">
          <div className="l">Supply</div>
          <div className="v">{supplyOf(state, p)}</div>
        </div>
      </div>
      <div className="mono dim" style={{ fontSize: 12 }}>
        EMPIRE: {n} PROVINCE{n === 1 ? "" : "S"}
        {cap ? ` · CAPITAL ${cap.name.toUpperCase()}, ${(capPlanet?.name ?? "").toUpperCase()}` : ""}
        {p.scout && !isV12(state) ? " · SCOUTED" : ""}
      </div>
      <BattleHistory state={state} player={p} />
      <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
        <span className="mono" style={{ fontSize: 12 }}>
          FATE HAND {p.hand.length}/{HAND_LIMIT}
        </span>
        <span className="row">
          {setup ? null : armed ? (
            <button
              className="btn sm danger"
              disabled={!can({ type: "removePlayer", playerId: p.id })}
              onBlur={() => setArmedAt(null)}
              onClick={() => dispatch({ type: "removePlayer", playerId: p.id })}
            >
              Confirm remove
            </button>
          ) : (
            <button className="btn sm danger" disabled={!can({ type: "removePlayer", playerId: p.id })} onClick={() => setArmedAt(state)}>
              Remove
            </button>
          )}
        </span>
      </div>
      <div className="handbar">
        {Array.from({ length: HAND_LIMIT }, (_, i) => (
          <i key={i} className={i < p.hand.length ? "on" : ""}></i>
        ))}
      </div>
      {can({ type: "organiserRemoveCard", playerId: p.id, index: 0 }) ? <OrganiserCards player={p} /> : null}
    </div>
  );
}
