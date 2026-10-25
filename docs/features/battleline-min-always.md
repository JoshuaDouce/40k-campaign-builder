# Battleline minimum in every campaign

Added 2026-10-25.

The "at least 2 Battleline" minimum now applies whether Force Organisation slots are on or off (so also under the
Datasheet limit). The other minimum (1 Character) still comes with slots, though Setup's one-Warlord check covers it.

- Setup checklist: "! Needs N more Battleline" shows in both modes (`setupChecklist().foShort`, `src/game/setup.ts`).
- My Warband: with slots off, a "Battleline x / 2 minimum" line sits with the other counts and turns red when
  short. With slots on, the Force Org chart shows it as before.
- It is a warning like the other minimums, never a block. Rules tab "Roles" paragraph updated.
