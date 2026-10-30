# Varkesh Reach 1.2

Added 2026-10-30. Slows the RP and supply curve and makes battles grow as the war moves towards the rift.

## What 1.2 changes

| | 1.1 | 1.2 |
|---|---|---|
| Province types | Every world draws from the same mix (500–1000 pts) | By orbit: outer 500–750, middle 750–1000, inner 1000s plus one 1500 pt Titan Graveyard (Spaceports 750 everywhere) |
| Capital border | A 500, a 750 and a 1000 pt neighbour | A 500 and a 750 pt neighbour |
| Reinforcements | 1 RP for +200 supply | 2 RP for +200 supply |
| RP bank cap | 10 | 6 |
| Muster | +250 supply, 1 Fate Card | +150 supply, 1 Fate Card |
| Forge, on Muster | +150 more supply | +50 more supply |
| Outpost held | +100 supply | +50 supply |
| Ruins held | +150 supply | +100 supply |
| Titan Graveyard held | (not in 1.1) | +150 supply |
| Scout action | Draw 1 Fate Card, swap a twist next battle | Removed |
| Hollowgate opens | 60% claimed or War Round 8 | 60% claimed or War Round 12 |

New province type: **Titan Graveyard** (1500 pts, Strike Force). Holding it gives +150 to your supply limit. Inner
worlds only, 1.2 only.

## Versions

- `state.rules`: missing means 1.1, so every existing campaign stays on 1.1 until the organiser upgrades it.
- New campaigns (and a campaign reset) start on 1.2.
- `src/game/version.ts` holds the version-dependent numbers (`rpCap`, `reinforceCost`, `hollowgateRound`, `musterSupply`, `forgeMusterBonus`, `provinceSupply`, `provinceBonus`, `actionsFor`).

## Upgrading a 1.1 campaign (organiser)

Rules tab → Campaign rules panel → "Upgrade to Varkesh Reach 1.2". It can't be undone.

- **Map:** worlds, provinces, borders, warp lanes and who holds what are untouched. Held provinces, Capitals and
  Spaceports keep their type. Every other unclaimed province is re-charted to its orbit's types (and renamed to match).
- **Supply:** each Reinforcements already bought loses half its supply (100 pts). The panel counts purchases from the
  log, which only keeps the latest 60 entries, so the organiser can correct each count before applying. Supply never
  drops below the 750 base plus held provinces.
- **Musters:** each Muster already taken loses 100 supply (+250 becomes +150), or 200 if it had a Forge (+400 becomes +200),
  counted from the log lines (latest 60 only, so older Musters are not cut). Taken automatically, never below the player's
  own supply bonus, and shown in the panel's supply column. Logged per player.
- **Province supply:** held Outposts, Ruins and Titan Graveyards give the new 1.2 amounts at once (supply from holdings is live).
- **Scout:** no longer an action. A Scout pick already made still resolves, and a swap already earned still applies to the next battle.
- **RP:** anyone holding more than 6 drops to 6.
- **Hollowgate:** if it's already open, it stays open.
- Rosters over the new supply limit may stay as they are or shrink (the usual roster cap rule).

## Where it shows

Rules (version line, Reach, province table, actions table, Requisition, RP table), Pitch, Setup briefing, My Warband Reinforcements
button, and the Turn Guide (Reinforcements cost, Muster supply, RP cap, Hollowgate round, Titan Graveyard as an inner-world target, no Scout). The Map and War Room target lists show the version-aware province bonus text. Scout is hidden everywhere on 1.2.

## Load migration for campaigns already on 1.2

Campaigns upgraded or created before this change were on 1.2 with 1.1 Muster amounts. `state.musterRepriced` marks that the
Muster cut has been done. On load (`normaliseState` calls `repriceMusters`), a 1.2 campaign without the flag gets the same
cut once, with a log line and a Player log entry per affected player, and the flag is set. 1.1 campaigns are left alone
(the upgrade sets the flag). New campaigns and resets start with it set. The flag reaches the saved state with the next
save; until then the load is repeated from the same data, so the result is the same.
