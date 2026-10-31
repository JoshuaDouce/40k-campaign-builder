# Units are locked once the campaign starts

Added 2026-10-25.

From War Round 1, a unit with a campaign history stays on the roster and can only grow. A unit has a history once
it has any XP, battles, kills, Battle Honours, Battle Scars, relics or Battle Training. Locked units:

- **No removing.** The Remove button is gone from unit cards, and the `removeUnit` action is refused. A unit still
  leaves through a third Battle Scar in the post-battle report (Characters go to the Hall of Heroes as before).
- **No shrinking.** An edit can't lower base points below what the unit has now. In the Edit unit form, model counts
  below the current points are disabled, picking a datasheet chooses the smallest size at or above them, and typing
  lower points shows "a unit can grow but not shrink". `updateUnit` refuses it too.
- Setup (War Round 0) is unchanged: add, remove and resize freely.
- A fresh unit (none of the above) is not locked in any round: it can be resized up or down, or removed, until it
  first fights or gains something. Changed 2026-10-31; before that every unit locked at War Round 1.
- Example units (from "Add example units") are exempt, so they can still be removed or cleared.
- Players can't clear a unit's history to unlock it: an edit can't lower XP, battles or kills, or remove an earned
  Battle Honour, Battle Training or Battle Scar, and removing a relic is organiser-only. Players remove scars
  through Recuperate (confirming it opens a sheet to pick up to two scars, removed by the game) or a Field Surgeon.
  The organiser can correct any of these in the edit form.

Helpers: `hasHistory(unit)`, `unitLocked(state, unit)` and `minPointsFor(state, unit)` in `src/game/roster.ts`. There is no stored model
count, so "size" is the unit's base points: a bigger size always costs more.
