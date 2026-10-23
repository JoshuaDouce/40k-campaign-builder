# Feature: Start on 0 RP

> Scoped 2026-10-23 by the product-owner agent. Owner decisions: every player starts on 0 RP, the late-arrival bonus is
> unchanged (no RP catch-up), existing Setup campaigns are moved to 0 once.

A deliberate deviation from `reference/index.html` (which stays at 5, read-only). Slows the opening so RP must be earned.

## Description
Every player starts the campaign with 0 Requisition Points instead of 5. RP comes only from income: +1 per Capital
and Hive City at the start of each War Round, +1 per battle to both fighters, +1 more to the winner. The bank cap of 10
and all spend costs are unchanged. In Setup the RP spend buttons are disabled because everyone has 0 RP. The Setup
checklist drops its RP line, and the Pitch and Setup text say you start on 0 and earn RP.

## Decided behaviour
- **New players, campaign reset, example players:** start on 0 RP.
- **Late joiners (after War Round 1):** start on 0 RP. They keep the existing late-arrival bonus (supply catch-up and
  1 extra Fate Card). No RP catch-up.
- **First income:** War Round 1 begins through the step that collects income, and every player holds their Capital
  by then, so each player has 1 RP at the start of War Round 1 ("<name> collects 1 RP from their cities.").
- **Existing campaigns still in Setup (round 0):** moved to 0 RP once, tracked by a flag in the state. Campaigns past
  Setup keep their RP. Owner +/- RP changes made in Setup survive later loads.
- **Owner stat +/- RP buttons:** still work.
- **"Not ready" reminder:** it lists only players who haven't ticked Ready, so removing the RP check doesn't change it.

## Acceptance criteria (check by hand at ~400px)
1. A new campaign shows 0 RP for every player, example players included.
2. A player added in Setup, and every player after "Reset campaign", is on 0 RP.
3. A player who joins after War Round 1 starts on 0 RP, and still gets the extra Fate Card and supply limit.
4. The Setup checklist shows Character, roster, any "Needs N more" flags and Capital. It has no RP line.
5. Ready and Begin War Round 1 behave as before.
6. In Setup, RP spends are unavailable on 0 RP, and the owner's +/- RP buttons still work.
7. Beginning War Round 1 gives each player +1 RP for their Capital and logs it.
8. Battle RP (+1 both, +1 winner, Decisive win, Raid steal) is unchanged. A Raid on a 0 RP player steals nothing.
9. An old Setup campaign with players on 5 RP shows 0 RP after loading. If the owner sets someone to 3 and reloads, it
   stays 3.
10. An old campaign in War Round 1 or later keeps every player's RP.
11. No screen still says you start with 5 RP.

## Text changes
- **Pitch, "Build a 750 pt roster":** "Start with 5 Requisition Points (RP) and a Capital province on one of the outer
  worlds." becomes "Start with 0 Requisition Points (RP) and a Capital province on one of the outer worlds. Earn RP
  from your Capital and from battles."
- **Setup, "Your start.":** "A 750 pt roster led by one Warlord, 0 Requisition Points (earn them from your Capital and
  from battles), and a Capital province on an outer world. No Epic Heroes or named characters."
- **Setup step 4:** "Each warband needs exactly one Character (its Warlord), a 750 pt roster and a Capital. You start
  on 0 RP and earn it from your Capital and battles. Build rosters on the Roster tab."
- **Setup checklist:** remove the "5 RP" line.
- **Rules tab:** no change. It never mentions starting RP.

## Edge cases
- Reset sets the migration flag again, so a reset campaign isn't re-zeroed after the owner changes RP.
- An old Setup campaign where RP was already spent is zeroed. Nothing is refunded.

## Out of scope
- Income, battle RP, the bank cap or spend costs.
- RP catch-up for late joiners.
- `reference/index.html`.
- Backend or data model changes (the flag lives in the state JSON).
- Automated tests (project decision).
