# Export to Tabletop Simulator (Yellowscribe)

Added 2026-10-29. Design: `design/yellowscribe-export.html`.

A player builds their list elsewhere (NewRecruit etc.), uploads it at yellowscribe.link and pastes the code into the
app. The app fetches the army, adds the campaign's effects, and gives back a new code for the Yellowscribe mod in TTS.
Nothing in the campaign changes: no dispatch, no log entry, no version bump.

- **Where:** "Import/Export YellowScribe · Add buffs/debuffs", a full-width primary button at the top of My Warband (matches against the
  whole roster), and on each side in the War Room, both on the army list and in the tally once the battle has started
  (matches against the units fielded in that list). That player or the owner. The owner picks the player in the roster
  sheet.
- **Matching:** each imported unit is matched to a roster unit by its datasheet, the real unit name, never the
  player's custom name (case, accents, spaces and punctuation ignored; a unit with no datasheet is matched by hand), duplicates in order, never the same roster unit twice. The review lets you change a match or pick "No
  match"; unmatched units go through unchanged.
- **Effects:** Battle Honours, Scars, relics and Battle Training become named abilities with their rule text, and can be
  unticked. The warlord trait and enhancement are always added. A title renames the unit "Name, the Title".
- **Stat changes:** rows in `src/game/data.ts` with `fx` also change the unit's stats on every model profile: Move, OC,
  Wounds, invulnerable save (Orrin's Ward), BS on ranged weapons, S on melee weapons, and Worn Gear's named weapon.
  Grievous Wound is flagged temporary. Anything that can't be read as a plain number is left alone (the text is still added).
- **Codes expire** about 10 minutes after Yellowscribe last saved them, including the new one.

Backend: one Lambda (`amplify/functions/yellowscribe`) behind the `yellowscribeArmy` query and `yellowscribePost`
mutation, because yellowscribe.link sends no CORS headers. It only ever calls yellowscribe.link. Logic in
`src/game/yellowscribe.ts`, client wrapper in `src/store/yellowscribe.ts`, sheet in
`src/components/roster/YellowscribeExport.tsx`.
