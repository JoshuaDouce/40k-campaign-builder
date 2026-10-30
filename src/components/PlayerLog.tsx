import { useState } from "react";
import { FIGURE_KEYS, playerLogCap } from "../game/index.ts";
import type { PlayerLogEntry } from "../game/index.ts";
import { useCampaign } from "../store/useCampaign.ts";
import { LogSegs } from "./LogSegs.tsx";

/** Tag text, badge modifier and entry edge class for each actor. */
const TAGS: Record<NonNullable<PlayerLogEntry["by"]>, [string, string, string]> = {
  p: ["Player", "", ""],
  o: ["Organiser", " warn", " org"],
  g: ["Game", " char", " game"],
};

const LABELS: Record<(typeof FIGURE_KEYS)[number], string> = { rp: "RP", sup: "Supply limit", hand: "Cards in hand" };

function Entry({ e }: { e: PlayerLogEntry }) {
  const tag = e.by ? TAGS[e.by] : undefined;
  return (
    <li className={`pl-e${tag?.[2] ?? ""}${e.start ? " start" : ""}`}>
      <div className="pl-top">
        <span className="pl-r">{e.r ? `War Round ${e.r}` : "Setup"}</span>
        {tag ? <span className={`badge${tag[1]}`}>{tag[0]}</span> : null}
      </div>
      <div className="pl-txt">
        <LogSegs segs={e.segs} />
      </div>
      <div className="pl-diffs">
        {FIGURE_KEYS.map((k) => {
          const v = e[k];
          if (!v) return null;
          const [from, to] = v;
          return (
            <span key={k}>
              <span className="k">{LABELS[k]}</span>
              {e.start ? <span className="same">{to}</span> : <span className={to > from ? "up" : "dn"}>{`${from} → ${to}`}</span>}
            </span>
          );
        })}
      </div>
    </li>
  );
}

/** Organiser-only: why each player's RP, supply limit or Fate Card count changed. Read-only. */
export function PlayerLog({ colors }: { colors: Record<string, string> }) {
  const { state, viewer } = useCampaign();
  const [picked, setPicked] = useState<string | null>(null);
  if (!viewer.isOwner || !state.players.length) return null;
  const current = state.players.find((p) => p.id === picked) ?? state.players[0];
  const entries = state.plog?.[current.id] ?? [];
  return (
    <div className="player pl">
      <div className="pl-head">
        <h3>Player log</h3>
        <span className="lbl">Organiser only</span>
      </div>
      <p className="hint">Why a player&apos;s RP, supply or hand changed. One player at a time.</p>
      <div className="pick" role="group" aria-label="Choose a player">
        {state.players.map((p) => (
          <button key={p.id} className="chip" aria-pressed={p.id === current.id} onClick={() => setPicked(p.id)}>
            <span className="dot" style={{ background: colors[p.id] }}></span>
            {p.name}
          </button>
        ))}
      </div>
      {entries.length ? (
        <ul className="pl-list">
          {entries.map((e, i) => (
            <Entry key={entries.length - i} e={e} />
          ))}
        </ul>
      ) : (
        <div className="empty">
          <p className="dim">Nothing recorded for this player yet. Changes to RP, supply limit and Fate Cards will appear here.</p>
        </div>
      )}
      <div className="pl-foot">
        <p>Supply limit is the player&apos;s full limit (base + provinces + Reinforcements), not just the Reinforcements part.</p>
        <p>Keeps the latest {playerLogCap(state.players.length)} entries per player. Read-only.</p>
      </div>
    </div>
  );
}
