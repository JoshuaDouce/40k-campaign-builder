# Slots or a datasheet limit, not both

Added 2026-10-25.

Force Organisation slots and the Datasheet limit are now exclusive campaign rules. Switching one on in the Rules tab
switches the other off, and the log says so ("Datasheet limit is now on, so Force Organisation slots is off.").
Switching one off leaves the other alone.

- `TOGGLE_EXCLUDES` in `src/game/toggles.ts`; the `setToggle` action applies it.
- Saves from before this change may have both on. `toggleOn` treats Force Organisation as off while the Datasheet
  limit is on, so those campaigns already behave as datasheet-only; no migration.
- Roles stay either way (Battleline T9 exception, Knights exemption).
