import { useState } from "react";
import { canPerform, HAND_LIMIT } from "../game/index.ts";
import type { Card, Player } from "../game/index.ts";
import { canSeeHand, useCampaign } from "../store/useCampaign.ts";
import { FateCard } from "./FateCard.tsx";

const cardKey = (c: Card): string => `${c.fac ?? ""}|${c.t}|${c.e}`;

/** Hand positions that were not in `before`, for the deal animation. */
function diffHand(before: Card[], hand: Card[]): Set<number> {
  const counts = new Map<string, number>();
  before.forEach((c) => counts.set(cardKey(c), (counts.get(cardKey(c)) ?? 0) + 1));
  const added = new Set<number>();
  hand.forEach((c, i) => {
    const left = counts.get(cardKey(c)) ?? 0;
    if (left > 0) counts.set(cardKey(c), left - 1);
    else added.add(i);
  });
  return added;
}

/** Cards that arrived since the previous render of this player's hand (nothing stored in the campaign). */
function useNewCards(p: Player): Set<number> {
  const [track, setTrack] = useState<{ id: string; hand: Card[]; fresh: Set<number> }>({ id: p.id, hand: p.hand, fresh: new Set() });
  if (track.hand === p.hand) return track.fresh;
  // Switching player (the owner's picker) is not a deal.
  const next = { id: p.id, hand: p.hand, fresh: track.id === p.id ? diffHand(track.hand, p.hand) : new Set<number>() };
  setTrack(next);
  return next.fresh;
}

/** A player's Fate Card hand: the count for everyone, the cards with Play and Discard for the player themselves. */
export function FateHand({ player: p }: { player: Player }) {
  const { state, dispatch, viewer } = useCampaign();
  const [msg, setMsg] = useState("");
  const fresh = useNewCards(p);
  const visible = canSeeHand(p, viewer);

  const spendCard = (type: "playCard" | "discardCard", index: number) => {
    const card = p.hand[index];
    if (!card || !canPerform(state, { type, playerId: p.id, index }, viewer)) return;
    dispatch({ type, playerId: p.id, index });
    setMsg(`${type === "playCard" ? "Played: " : "Discarded: "}${card.t}`);
  };

  return (
    <div className="fate-hand">
      <div className="lbl">
        Fate hand {p.hand.length}/{HAND_LIMIT}
      </div>
      <div className="handbar">
        {Array.from({ length: HAND_LIMIT }, (_, i) => (
          <i key={i} className={i < p.hand.length ? "on" : ""}></i>
        ))}
      </div>
      <div className="msg" role="status">
        {msg}
      </div>
      {!visible ? (
        <p className="mono dim" style={{ fontSize: 12 }}>
          Only {p.name} can see their hand.
        </p>
      ) : p.hand.length ? (
        <div className="cards">
          {p.hand.map((c, i) => (
            <FateCard key={i} card={c} isNew={fresh.has(i)}>
              <div className="acts">
                <button className="btn sm primary" onClick={() => spendCard("playCard", i)}>
                  Play
                </button>
                <button className="btn sm" onClick={() => spendCard("discardCard", i)}>
                  Discard
                </button>
              </div>
            </FateCard>
          ))}
        </div>
      ) : (
        <p className="mono dim" style={{ fontSize: 12 }}>
          No Fate Cards in hand. You draw them for Refineries, victories, Underdog's grit, Muster, Scout, or Requisition the Deck.
        </p>
      )}
    </div>
  );
}
