# Capitals border a 500, 750 and 1000 pt battle

Added 2026-10-25.

When a Reach is charted (and when a late joiner's world is charted), every Capital borders at least one province of
each battle size: 500 pts (Outpost or Shrine), 750 pts (Forge or Refinery, or the Spaceport) and 1000 pts (Hive City,
Fortress or Ruins). Capitals sit on outer worlds, so these are the battle sizes as fought.

- `placeCapital` (in `src/game/map.ts`) now prefers a province with at least 3 neighbours, then `borderCapital`
  retypes neighbours for any missing size. It never changes the Spaceport, and only retypes a neighbour whose size
  isn't needed (a Settlement) or is doubled up. It picks a type not already on that world where it can.
- Checked over 21,600 generated Capitals (2 to 10 players, 400 seeds each): all three sizes every time.
- Existing maps are untouched. The owner can chart a new Reach before War Round 1 to get the new layout.
