import { useState } from "react";
import { HAND_LIMIT, poolFor } from "../game/index.ts";
import type { Player } from "../game/index.ts";
import { useCampaign } from "../store/useCampaign.ts";

/** The organiser's view of a player's Fate hand on the Players tab: remove any card, or add one from their pool. */
export function OrganiserCards({ player: p }: { player: Player }) {
  const { dispatch } = useCampaign();
  // Each title once: generic cards first, then the player's faction cards.
  const titles = [...new Set(poolFor(p).map((c) => c.t))];
  const [pick, setPick] = useState(titles[0] ?? "");
  // A faction change swaps the pool; fall back to its first card.
  const chosen = titles.includes(pick) ? pick : (titles[0] ?? "");
  const full = p.hand.length >= HAND_LIMIT;
  return (
    <details className="more oc-hand">
      <summary>Manage Fate Cards</summary>
      <div className="inner">
        <p className="hint">Only you, as organiser, see this. Changes go in the campaign log without naming the card.</p>
        {p.hand.length ? (
          <ul className="oc-list">
            {p.hand.map((c, i) => (
              <li key={i}>
                <span>
                  <b>{c.t}</b>
                  {c.fac ? <span className="dim"> · {c.fac}</span> : null}
                </span>
                <button className="btn sm" onClick={() => dispatch({ type: "organiserRemoveCard", playerId: p.id, index: i })}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mono dim" style={{ fontSize: 12 }}>
            No cards in hand.
          </p>
        )}
        <div className="row">
          <select aria-label={`Card to add to ${p.name}'s hand`} value={chosen} disabled={full} onChange={(e) => setPick(e.target.value)}>
            {titles.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button className="btn sm" disabled={full || !chosen} onClick={() => dispatch({ type: "organiserAddCard", playerId: p.id, title: chosen })}>
            Add card
          </button>
        </div>
        {full ? <p className="hint">The hand is full ({HAND_LIMIT}). Remove a card first.</p> : null}
      </div>
    </details>
  );
}
