import { useState } from "react";
import { FACCARDS, GENERIC } from "../game/index.ts";
import type { FactionName } from "../game/index.ts";
import { FateCard } from "./FateCard.tsx";

type DeckFilter = "Generic" | FactionName;
const FACTION_NAMES = Object.keys(FACCARDS) as FactionName[];
const OPTIONS: DeckFilter[] = ["Generic", ...FACTION_NAMES];

export function DeckTab() {
  const [filter, setFilter] = useState<DeckFilter>("Generic");
  const list = filter === "Generic" ? GENERIC : (FACCARDS[filter] ?? []).map((c) => ({ ...c, n: 2, fac: filter }));

  return (
    <section className="tab" id="cards">
      <h2>The Fate Deck</h2>
      <p>
        One shared deck. Each player also adds their faction's cards to their own draws. <b>Hand limit 5.</b> Play up to <b>1 card per 500 pts</b> in the battle (rounded down, minimum 1). Reveal a card when you use it, then discard it.
      </p>
      <div className="note">
        <b>House note.</b> These are suggestions. Strike any card that feels too strong after a few games, and write new ones as the story grows.
      </div>
      <div className="row" role="group" aria-label="Filter cards">
        {OPTIONS.map((o) => (
          <button key={o} className="chip" aria-pressed={o === filter} onClick={() => setFilter(o)}>
            {o === "Generic" ? "Generic deck" : o}
          </button>
        ))}
      </div>
      <div className="cards">
        {list.map((c) => (
          <FateCard key={c.t} card={c} />
        ))}
      </div>
    </section>
  );
}
