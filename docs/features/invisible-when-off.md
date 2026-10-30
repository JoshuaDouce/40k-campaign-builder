# Switched-off rules are invisible

Added 2026-10-30.

While a campaign rule switch is off, nothing about it shows to players. Only the owner's Campaign rules panel lists it.

- **Mission Twists off:** no twist count on the Map, no twist lines in the Pitch (or its copied text), Scout reads
  "Draw 1 Fate Card." (Rules, War Room, Turn Guide), "Roll twists" becomes "Set up battle" and "Re-roll twists" becomes
  "Recalculate", the battle card no longer says twists are locked, and the Turn Guide skips its twist steps and twist
  wording. Light Forces and Close Quarters still show on small battles: they always apply.
- **Battle Training off / Relics off:** training and relics already on units are hidden everywhere (unit cards, unit
  dialog, army lists, Yellowscribe export, Hall of Heroes counts, Rules and Rewards wording) and **don't count toward
  points**. They stay in the campaign data and come back, with their points, when the switch goes on again. Saving a
  unit while hidden keeps them. `rosterOf` returns the roster as the campaign shows it (`visibleUnit`); engine writes
  use the raw roster.
- **Owner exception:** with Battle Training off, the owner still sees a unit's hidden training on its card, labelled
  "switched off, not counted · only you see this", with the "Refund 1 RP (organiser)" button.
- Datasheet limit, Toughness stages and Knights exemption already showed nothing while off.
