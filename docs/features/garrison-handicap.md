# Garrison handicap: +20% attacker or -20% garrison

Added 2026-10-25.

## Rule

When you Conquer an unclaimed province, you fight its garrison, which another player plays as a favour.
You choose the handicap:

- **Attacker +20%** (the default, and the old rule): the garrison plays at the battle size, and you play at +20%.
- **Garrison -20%**: you play at the battle size, and the garrison plays at -20%.

Both are rounded to the nearest 5 pts. Light Forces and Fate Cards still go by the battle size, before the 20%.

## In the app

- The choice is on the rolled garrison battle card in the War Room, as a "Garrison handicap" select. The attacker
  (or the owner) can change it until the result is recorded.
- Changing it keeps the battle size, the twists and the other notes fixed. Only the two point figures and the
  garrison note change. A re-roll keeps the choice.
- The Rules tab, the garrison-player hint and the Turn Guide describe both options.

## Data

`LiveBattle.edge` is `"defender"` when the garrison takes -20%, with the garrison's points in
`LiveBattle.defenderPts`. If either field is missing, the battle uses the attacker +20%, so saves from before this
change still read the same. The new action is `setGarrisonEdge { playerId, edge }`. Only the attacker or the owner
can send it.
