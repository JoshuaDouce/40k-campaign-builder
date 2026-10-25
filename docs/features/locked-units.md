# Units are locked once the campaign starts

Added 2026-10-25.

From War Round 1, a unit on a roster stays there and can only grow:

- **No removing.** The Remove button is gone from unit cards, and the `removeUnit` action is refused. A unit still
  leaves through a third Battle Scar in the post-battle report (Characters go to the Hall of Heroes as before).
- **No shrinking.** An edit can't lower base points below what the unit has now. In the Edit unit form, model counts
  below the current points are disabled, picking a datasheet chooses the smallest size at or above them, and typing
  lower points shows "a unit can grow but not shrink". `updateUnit` refuses it too.
- Setup (War Round 0) is unchanged: add, remove and resize freely.
- Example units (from "Add example units") are exempt, so they can still be removed or cleared.

Helpers: `unitLocked(state, unit)` and `minPointsFor(state, unit)` in `src/game/roster.ts`. There is no stored model
count, so "size" is the unit's base points: a bigger size always costs more.
