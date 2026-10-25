# Feature: Infantry / Mounted, and roles from datasheet keywords

> Scoped 2026-10-25 with the owner. Owner decisions: merge Infantry and Mounted into one role with Infantry's base of
> 3 (no extra slot), Aircraft go in Vehicle / Monster, Other keeps Dedicated Transports and Fortifications, a Character
> always fills a Character slot, and the role is filled in from the datasheet's keywords but stays editable.

## Roles
| Role | Base | Extra slots from holdings (cap +3) | Covers |
|---|---|---|---|
| Character | 1 | +1 per Shrine | Every Character, Monster and Vehicle Characters included |
| Battleline | 4 | +1 per Fortress | Battleline units |
| Infantry / Mounted | 3 | +1 per Hive City, +1 per Settlement | Infantry, Mounted, Beasts, Swarms |
| Vehicle / Monster | 1 | +1 per Forge, +1 per Refinery | Walkers, tanks, Monsters, Aircraft |
| Other | 2 | +1 per Spaceport | Dedicated Transports, Fortifications |

- Old saves: a unit stored as "Infantry" or "Mounted" is read as Infantry / Mounted. Nothing else is re-mapped.
- Map and target list: Hive City and Settlement both read "+1 Infantry / Mounted slot".

## Keywords
`npm run update-points` reads each unit's keywords from the BSData wh40k-11e catalogues and writes a role code (`r`)
into `src/data/mfm/*.json`. First match wins: Character → Battleline → Dedicated Transport or Fortification (Other)
→ Vehicle, Monster or Aircraft (Vehicle / Monster) → Infantry, Mounted, Beast or Swarm (Infantry / Mounted). If the
catalogues disagree about a name, the faction's own catalogue decides. If they still disagree, the unit gets no role.

## Unit form
- Picking a datasheet from the list sets the role, the same as tapping that role chip. A Character datasheet ticks
  Character, and in Setup also Warlord.
- A unit that is already a Character keeps the Character role whatever datasheet is picked. A promoted Veteran stays
  a Character.
- The Knights exemption (Armigers and War Dogs as Battleline) wins over the keywords.
- The player can still change the role by hand. Datasheets typed as free text (no data) set nothing.
