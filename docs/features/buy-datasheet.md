# Extra Datasheet (1 RP)

Added 2026-10-25.

With the Datasheet limit rule on, a player can spend **1 RP for +1 to their datasheet limit**, for the rest of the
campaign, as many times as they like. The limit is 5 + datasheets bought (changed 2026-10-25: it no longer grows
by 1 each War Round; buying is the only way up).

- The button is **Extra Datasheet · 1 RP**, with the other RP spends on My Warband. It only shows when the rule is on.
- The Rules tab lists it in the Spending Requisition table (when the rule is on) and in the Datasheet limit paragraph.
  The Edit unit form's "new datasheet" block message mentions it.
- Data: `Player.dsx` (optional, missing = 0), so no migration. Action `buyDatasheet { playerId }`, refused when
  the rule is off or the player has no RP. Same permissions as the other RP spends.
- `datasheetLimit(state, playerId)` now takes the player.
