# Varkesh Reach 1.2

Added 2026-10-30. Slows the RP and supply curve and makes battles grow as the war moves towards the rift.

## What 1.2 changes

| | 1.1 | 1.2 |
|---|---|---|
| Province types | Every world draws from the same mix (500–1000 pts) | By orbit: outer 500–750, middle 750–1000, inner 1000s plus one 1500 pt Titan Graveyard (Spaceports 750 everywhere) |
| Capital border | A 500, a 750 and a 1000 pt neighbour | A 500 and a 750 pt neighbour |
| Reinforcements | 1 RP for +200 supply | 2 RP for +200 supply |
| RP bank cap | 10 | 6 |
| Hollowgate opens | 60% claimed or War Round 8 | 60% claimed or War Round 12 |

New province type: **Titan Graveyard** (1500 pts, Strike Force). Holding it gives +250 to your supply limit. Inner
worlds only, 1.2 only.

## Versions

- `state.rules`: missing means 1.1, so every existing campaign stays on 1.1 until the organiser upgrades it.
- New campaigns (and a campaign reset) start on 1.2.
- `src/game/version.ts` holds the version-dependent numbers (`rpCap`, `reinforceCost`, `hollowgateRound`).

## Upgrading a 1.1 campaign (organiser)

Rules tab → Campaign rules panel → "Upgrade to Varkesh Reach 1.2". It can't be undone.

- **Map:** worlds, provinces, borders, warp lanes and who holds what are untouched. Held provinces, Capitals and
  Spaceports keep their type. Every other unclaimed province is re-charted to its orbit's types (and renamed to match).
- **Supply:** each Reinforcements already bought loses half its supply (100 pts). The panel counts purchases from the
  log, which only keeps the latest 60 entries, so the organiser can correct each count before applying. Supply never
  drops below the 750 base plus held provinces.
- **RP:** anyone holding more than 6 drops to 6.
- **Hollowgate:** if it's already open, it stays open.
- Rosters over the new supply limit may stay as they are or shrink (the usual roster cap rule).

## Where it shows

Rules (version line, Reach, province table, Requisition, RP table), Pitch, Setup briefing, My Warband Reinforcements
button, and the Turn Guide (Reinforcements cost, RP cap, Hollowgate round, Titan Graveyard as an inner-world target).
