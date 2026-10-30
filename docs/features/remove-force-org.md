# Force Organisation slots removed

Added 2026-10-30.

- The Force Organisation chart on My Warband and the **Force Organisation slots** campaign rule are gone. Fortress, Hive
  City, Settlement, Forge, Refinery and Spaceport no longer add slots; their other bonuses are unchanged.
- Units keep their role (set from the datasheet keywords, still editable), and My Warband still groups units by role.
- Two role rules hold in every campaign, as before: **Character slots** (1, +1 per Shrine held, up to +3; held at 1 in
  Setup), enforced on save, and a **2 Battleline minimum**, shown as a warning and used by battle army lists.
- The **Datasheet limit** (5 datasheets, +1 per Extra Datasheet bought) is now on by default. A campaign whose owner
  switched it off keeps it off. It only refuses saves that add a new datasheet past the limit, so a roster already over
  is never forced to shrink.
- Old saves may still hold a `forceOrg` toggle; it is ignored.

To bring slots back, restore `src/game/forceOrg.ts` and `src/components/roster/ForceOrgChart.tsx` from git history
(before this change) and see `force-organisation.md`, `setup-slot-types.md` and `exclusive-slots-datasheets.md`.
