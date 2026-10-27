# Battle army list

Added 2026-10-27. Design: `design/battle-army-list.html`.

Once a battle's twists are rolled, the War Round battle card shows an army list for each side: the attacker and the
defender (a garrison battle has only the attacker's). Each side picks the roster units it fields.

- A new list starts with the Warlord and 2 Battleline (the first two on the roster). Tick other units In or Out.
- The Warlord is always fielded. A list keeps at least 2 Battleline: tick another Battleline to swap one out. With 2
  or fewer Battleline on the roster, they are all fielded.
- Tap a fielded unit's points to field it smaller ("Fielded at ___ pts"). Never split it. Blank means full points.
- The total shows against the side's limit: the battle's points, the garrison edge for the attacker, and +10% for an
  Underdog attacker. Over the limit is a warning, never a block.
- That player or the owner edits the list until the result is recorded. Everyone else sees it read-only.
- When the result is recorded each side's fielded units are remembered; the post-battle helper starts with those
  units ticked as fought. Undo puts back what was remembered before.

Data: `LiveBattle.lists` (by player id) and `CampaignState.lastArmy` (in the Undo snapshot). The Underdog +10% now lives in
`LiveBattle.attackerPts`, like the garrison edge. Logic in `src/game/army.ts`;
the engine re-checks every saved list against the roster (`fixArmy`), so lists stay legal when units are added,
removed or lost. Editing a list closes an open Undo window, like a re-roll.
