import { useState } from "react";
import { historyFor } from "../game/index.ts";
import type { CampaignState, HistoryEntry, Player } from "../game/index.ts";

const SHOWN = 10;

function entryText(e: HistoryEntry): string {
  const where = e.world ? `${e.province} on ${e.world}` : e.province;
  const kind = e.kind === "raid" ? "Raid" : "Conquer";
  return e.garrison ? `Garrison · ${where}` : `vs ${e.opponent} · ${where} · ${kind}`;
}

function outcomeText(e: HistoryEntry): string {
  const base = e.outcome === "won" ? "Won" : e.outcome === "lost" ? "Lost" : "Draw";
  return e.took ? `${base}, took the province` : base;
}

/** A player's battle record for the Players tab: a one-line summary that expands to totals and a list. */
export function BattleHistory({ state, player }: { state: CampaignState; player: Player }) {
  const [all, setAll] = useState(false);
  const h = historyFor(state, player.id);
  if (!h.battles) {
    return (
      <div className="more bh-hist">
        <div className="bh-rec">No battles yet</div>
      </div>
    );
  }
  const listId = `bh-list-${player.id}`;
  const shown = all ? h.entries : h.entries.slice(0, SHOWN);
  const mismatch = player.battles !== h.battles || player.wins !== h.wins;
  return (
    <details className="more bh-hist">
      <summary>
        {h.battles} {h.battles === 1 ? "battle" : "battles"} · {h.wins}W {h.draws}D {h.losses}L
      </summary>
      <div className="inner">
        <div className="bh-sum">
          <div className="stat">
            <div className="l">Battles</div>
            <div className="v">{h.battles}</div>
          </div>
          <div className="stat">
            <div className="l">Wins</div>
            <div className="v">{h.wins}</div>
          </div>
          <div className="stat">
            <div className="l">Draws</div>
            <div className="v">{h.draws}</div>
          </div>
          <div className="stat">
            <div className="l">Losses</div>
            <div className="v">{h.losses}</div>
          </div>
          <div className="stat wide">
            <div className="l">Provinces taken</div>
            <div className="v">{h.provincesTaken}</div>
          </div>
        </div>
        <ul className="bh-list" id={listId}>
          {shown.map((e, i) => (
            <li key={i} className={`bh-entry ${e.outcome}`}>
              <span className="r">Round {e.round}</span> · {entryText(e)} · <span className="o">{outcomeText(e)}</span>
            </li>
          ))}
        </ul>
        {h.entries.length > SHOWN ? (
          <button type="button" className="btn sm bh-toggle" aria-expanded={all} aria-controls={listId} onClick={() => setAll(!all)}>
            {all ? "Show fewer" : "Show all"}
          </button>
        ) : null}
        {mismatch ? <p className="hint">Totals above were adjusted by hand, so they may not match this list.</p> : null}
      </div>
    </details>
  );
}
