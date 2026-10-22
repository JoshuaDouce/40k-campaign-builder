# Feature: Force Organisation

> Scoped 2026-10-22 by the product-owner agent. Owner decisions: modern role set, slots follow provinces
> held right now (lost province = lost slot), minimums apply for the whole campaign. Guidance only.

Extends the Roster tab. Nothing here ever blocks saving, a battle, a War Round or a turn. The supply
limit (points cap) is unchanged and sits alongside the chart.

## Description
Every unit is given a battlefield role: Character, Battleline, Infantry, Vehicle, Monster or Other.
Above the unit list each player sees a Force Organisation chart, one row per role: units filling it, the
current maximum and the minimum where there is one, with a warning when a minimum is unmet or a maximum
exceeded. Extra slots are earned by holding provinces, and the chart says which holding grants each slot.
Inspired by the 3rd edition chart, but a campaign guide: take a Forge and you may field a second Vehicle;
lose it and you're asked to stand one down.

## Decided rules
| Role | Min (always) | Base max | Extra slots from holdings |
|---|---|---|---|
| Character | 1 | 2 | +1 per Shrine held |
| Battleline | 2 | 4 | +1 per Fortress held |
| Infantry | 0 | 3 | +1 per Hive City held |
| Vehicle | 0 | 1 | +1 per Forge held |
| Monster | 0 | 1 | +1 per Refinery held |
| Other | 0 | 1 | +1 per Spaceport held (a Capital counts as a Spaceport) |

- Each matching province held gives +1, capped at +3 per role from holdings. Every player's Capital
  means they start at Other 2.
- Settlement, Outpost and Ruins grant nothing. The Hollowgate is not a province for this purpose.
- **Live:** slots follow provinces held right now. Losing one removes its slot. Units over the new maximum
  stay; the row reads "Over limit by N" and the last N units of that role in roster order get an
  "Over limit" tag. Nothing is deleted or moved.
- Minimums apply for the whole campaign, as warnings ("Needs 1 more Battleline"), never blocks.
- **Character role = `isCharacter`.** Kept in sync both ways. Picking another role clears `isCharacter`
  (and Warlord). Promotion to Character sets the role. Honour, scar, relic, Warlord and Hall of Heroes
  logic is untouched. The Warlord counts in the Character row.
- **Old saves:** a unit with no role and `isCharacter` counts as Character. Any other unit with no role
  is "Unassigned", fills no slot, and the chart shows a quiet "N units need a role" nudge. No migration.
- **Example units:** Anvil Squad, Red Hand Assault → Battleline; Ashfall Gun-Line, Gatekeepers, Breach
  Team Seven → Infantry; Captain Idris Valen → Character; The Anvil of Kharst → Vehicle.
- Permissions as other roster edits: that player or the owner. Anyone can see the chart on rosters they
  can already view.

## Acceptance criteria (check by hand at ~400px)
1. The unit editor has a Role picker with the six roles. A new unit defaults to Unassigned unless
   Character is ticked. Saving never fails because of a role.
2. The Role picker and the Character tickbox stay in sync both ways. Warlord still only for Characters.
3. Each unit card shows its role as a small tag. Unassigned units show "No role", muted.
4. The chart shows six rows, each "filled / max" plus "min N" where there is one. No sideways scroll.
5. Rows with extra slots list the source, e.g. "+1 Forge (Thessaly Works)". No matching provinces =
   base slots only.
6. A new empty roster warns for Character (needs 1) and Battleline (needs 2) straight away.
7. Meeting a minimum clears its warning. Exceeding a maximum shows "Over limit by N" on the row and
   "Over limit" tags on the excess units. Saving still works.
8. Gaining a province updates the chart without a refresh. Losing one removes the slot and flags any
   excess; no unit is deleted.
9. The +3 cap per role from holdings shows in the chart.
10. Old-save units without a role show as Unassigned and fill no slot; a legacy Character counts as
    Character; the "N units need a role" nudge shows.
11. "Add example units" gives the roles above; the chart then shows Battleline 2/4 and Character 1/2
    with no minimum warnings.
12. A promoted unit becomes role Character and counts in that row.
13. The Rules tab has a Force Organisation paragraph. Existing supply text is unchanged.
14. Nothing blocks adding, recruiting, post-battle results or starting a battle, even with every row
    in warning.

## Rules tab wording
**Force Organisation.** Every unit has a role: Character, Battleline, Infantry, Vehicle, Monster or
Other. Each warband should field at least 1 Character and 2 Battleline, and no more of each role than
its slots allow. Slots grow with your conquests: each Shrine held adds a Character slot, each Fortress a
Battleline, each Hive City an Infantry, each Forge a Vehicle, each Refinery a Monster and each Spaceport
(your Capital counts) an Other, up to +3 per role. Lose the ground and you lose the slot, and any units
left over are over limit. This is the Reach's guidance, not a law: your group decides how strictly to
hold each other to it. Your supply limit still caps total points.

## Edge cases
- A player with no provinces left still gets base slots.
- Late joiners start with base slots plus their Capital and will show shortfalls until they build up.
- Removing a unit (including to the Hall of Heroes) frees its slot.
- Province ownership is shared state, so the chart reads the current map.

## Out of scope
Server enforcement. Blocking battles, results or Fate Cards for an invalid roster. Changing points,
supply or Muster. Per-faction role tables. Multiple roles per unit or 3rd-ed sub-roles (Elites, Fast
Attack, Heavy Support). Auto-assigning roles to existing units. Points-per-role limits. Logging slot
changes. Notifications.
