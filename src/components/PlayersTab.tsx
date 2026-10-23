import { useEffect, useState } from "react";
import { canPerform, count, getPlanet, getProvince, supplyOf } from "../game/index.ts";
import type { Action, CampaignState, Card, FactionName, Player, StatKey } from "../game/index.ts";
import { canSeeHand, useCampaign } from "../store/useCampaign.ts";
import type { TabId } from "../store/useDevicePrefs.ts";
import { BattleHistory } from "./BattleHistory.tsx";
import { FateCard } from "./FateCard.tsx";
import { DeleteCampaign } from "./account/DeleteCampaign.tsx";
import { MembersPanel } from "./account/MembersPanel.tsx";
import { WaitingNote } from "./account/WaitingNote.tsx";
import { FactionOptions } from "./FactionOptions.tsx";
import { PlayerNameInput } from "./PlayerNameInput.tsx";

const STAT_LABELS: ReadonlyArray<readonly [StatKey, string]> = [
  ["rp", "Requisition"],
  ["battles", "Battles"],
  ["wins", "Wins"],
];

const cardKey = (c: Card): string => `${c.fac ?? ""}|${c.t}|${c.e}`;
const snapshot = (players: Player[]): Record<string, string[]> =>
  Object.fromEntries(players.map((p) => [p.id, p.hand.map(cardKey)]));

/** Hand positions in `players` that were not in `before`, for the deal animation. */
function diffHands(before: Record<string, string[]>, players: Player[]): Record<string, Set<number>> {
  const fresh: Record<string, Set<number>> = {};
  players.forEach((p) => {
    const counts = new Map<string, number>();
    (before[p.id] ?? []).forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
    const added = new Set<number>();
    p.hand.forEach((c, i) => {
      const k = cardKey(c);
      const left = counts.get(k) ?? 0;
      if (left > 0) counts.set(k, left - 1);
      else added.add(i);
    });
    fresh[p.id] = added;
  });
  return fresh;
}

/** Hand positions that arrived since the previous state, derived by comparing hands (nothing stored in the campaign). */
function useNewCards(players: Player[]): Record<string, Set<number>> {
  const [track, setTrack] = useState<{ players: Player[]; fresh: Record<string, Set<number>> }>({ players, fresh: {} });
  if (track.players === players) return track.fresh;
  const next = { players, fresh: diffHands(snapshot(track.players), players) };
  setTrack(next);
  return next.fresh;
}

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
  const newCards = useNewCards(state.players);
  const setup = state.round === 0;
  const waiting = members.filter((m) => !state.players.some((p) => p.email === m));
  const ownerNotPlaying = viewer.isOwner && !state.players.some((p) => p.userId === viewer.userId);

  return (
    <section className="tab" id="tracker">
      <h2>Players</h2>
      {viewer.isOwner ? <MembersPanel /> : null}
      <WaitingNote emails={waiting} />
      <p className="dim">{setup ? "Rename players here." : "Rename or remove players here."}</p>
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
      <div>
        {state.players.length ? (
          state.players.map((p) => (
            <PlayerCard key={p.id} player={p} state={state} color={colors[p.id]} fresh={newCards[p.id]} setup={setup} />
          ))
        ) : (
          <p className="dim" style={{ marginTop: 16 }}>
            No players yet. Members appear here once they pick a faction.
          </p>
        )}
      </div>
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
  fresh: Set<number> | undefined;
  setup: boolean;
}

function PlayerCard({ player: p, state, color, fresh, setup }: CardProps) {
  const { dispatch, viewer } = useCampaign();
  const [msg, setMsg] = useState("");
  const [armedAt, setArmedAt] = useState<CampaignState | null>(null);
  const can = (a: Action) => canPerform(state, a, viewer);
  const cap = state.cap[p.id] ? getProvince(state, state.cap[p.id]) : undefined;
  const capPlanet = cap ? getPlanet(state, cap.pl) : undefined;
  const n = count(state, p);
  const visible = canSeeHand(p, viewer);
  const canEdit = can({ type: "updatePlayer", playerId: p.id });
  const full = p.hand.length >= 5;

  // Any action on this card (or any state change) disarms the two-step Remove, as a prototype re-render did.
  const armed = armedAt === state;
  useEffect(() => {
    if (!armedAt) return;
    const t = setTimeout(() => setArmedAt(null), 4000);
    return () => clearTimeout(t);
  }, [armedAt]);

  const send = (a: Action): boolean => {
    if (!can(a)) return false;
    setArmedAt(null);
    dispatch(a);
    return true;
  };

  const draw = () => {
    if (full) {
      setMsg("Hand full. Play or discard a card first.");
      return;
    }
    if (send({ type: "drawCard", playerId: p.id })) setMsg(p.hand.length + 1 === 5 ? "Hand is now full (5)." : "");
  };

  const spendCard = (kind: "playCard" | "discardCard", index: number) => {
    const card = p.hand[index];
    if (!card) return;
    if (send({ type: kind, playerId: p.id, index })) setMsg(`${kind === "playCard" ? "Played: " : "Discarded: "}${card.t}`);
  };

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
          <div className="v">{supplyOf(p)}</div>
          <div className="pm">
            <button
              className="btn sm"
              disabled={p.rp < 1 || !can({ type: "buyReinforcements", playerId: p.id })}
              title="Spend 1 RP for +200 supply"
              onClick={() => dispatch({ type: "buyReinforcements", playerId: p.id })}
            >
              +200 · 1 RP
            </button>
          </div>
        </div>
      </div>
      <div className="mono dim" style={{ fontSize: 12 }}>
        EMPIRE: {n} PROVINCE{n === 1 ? "" : "S"}
        {cap ? ` · CAPITAL ${cap.name.toUpperCase()}, ${(capPlanet?.name ?? "").toUpperCase()}` : ""}
        {p.scout ? " · SCOUTED" : ""}
      </div>
      <BattleHistory state={state} player={p} />
      <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
        <span className="mono" style={{ fontSize: 12 }}>
          FATE HAND {p.hand.length}/5
        </span>
        <span className="row">
          <button className="btn sm primary" disabled={full || !can({ type: "drawCard", playerId: p.id })} onClick={draw}>
            Draw card
          </button>
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
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={i < p.hand.length ? "on" : ""}></i>
        ))}
      </div>
      <div className="msg">{msg}</div>
      {visible ? (
        <div className="cards">
          {p.hand.map((c, i) => (
            <FateCard key={i} card={c} isNew={fresh?.has(i)}>
              <div className="acts">
                <button className="btn sm primary" disabled={!can({ type: "playCard", playerId: p.id, index: i })} onClick={() => spendCard("playCard", i)}>
                  Play
                </button>
                <button className="btn sm" disabled={!can({ type: "discardCard", playerId: p.id, index: i })} onClick={() => spendCard("discardCard", i)}>
                  Discard
                </button>
              </div>
            </FateCard>
          ))}
        </div>
      ) : null}
    </div>
  );
}
