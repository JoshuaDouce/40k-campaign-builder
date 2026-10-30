# Mission Twists switch; small battles always use Light Forces and Close Quarters

Added 2026-10-30.

- **Mission Twists** is a campaign rule in the owner's Campaign rules panel (Rules tab), on by default. Switching it off
  means battles rolled from then on get no twists. Battles already rolled keep theirs; Re-roll works them out again
  with the switch as it is now. With twists off, the Scout note ("may swap one twist") isn't added.
- **Small battles:** a battle of 750 pts or fewer (its own size, after twists and Raid, before Garrison or Underdog
  bonuses) always uses **Light Forces** (no unit at Toughness 10+) and **Close Quarters** (44" x 30" table with extra
  ruins), on the battle card, whether twists are on or off. One that rolled either twist doesn't show it twice.
- Engine: `autoTwists(pts, twists)` and `SMALL_GAME_TWISTS` in `src/game/engine.ts`. The stored `lightForces` flag on
  a battle is no longer used (old saves may still hold it).
- The Turn Guide shows both small-game twists. It doesn't read the switch: it still offers twist rolls.
- The Rules tab hides the twist count by orbit and the Mission Twists (D12) table when the switch is off. The "Small
  battles" line under Battle size still gives the Light Forces and Close Quarters effects.
