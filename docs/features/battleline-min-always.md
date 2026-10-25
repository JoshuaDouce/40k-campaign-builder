# Character and Battleline rules in every campaign

Added 2026-10-25.

Two role rules now hold whether Force Organisation slots are on or off (so also under the Datasheet limit):

- **At least 2 Battleline.**
- **At least 1 Character, and 1 Character slot, +1 per Shrine held (up to +3).** In Setup the slot is held at 1 (your
  Warlord), as with slots on.

The other roles' minimums and slots still come only with Force Organisation slots.

- `ALWAYS_ROLES` and `roleRuleOn(state, role)` in `src/game/forceOrg.ts`. `typeGains` shows the Shrine's Character
  slot in both modes (Rules table, map).
- Setup checklist: "! Needs N more ..." for Character and Battleline in both modes (`setupChecklist().foShort`).
- My Warband with slots off: "Character x / n slots · min 1" and "Battleline x · min 2" lines with the other counts,
  red when short or over. Characters past the slot limit get the over-limit flag on their card and group header.
- Warnings only, never a block, like the slot rules. Rules tab "Roles" paragraph updated.
