# Feature: Late-joiner catch-up bonus (roadmap "Next up" 1, option A)

> Scoped 2026-10-22 by the product-owner agent. Option A and the 750 floor confirmed by the owner.

## Description
A player added after War Round 1 has begun gets a one-off starter bonus on top of their new outer
world and Capital:
- **Supply:** their supply limit starts at the average of the other players' current supply limits,
  rounded to the nearest 50, minus 150. Never below the normal 750: if it would be, there is no supply
  bonus, only the card. Stored as bonus supply, so it is not recalculated later.
- **1 extra Fate Card,** drawn straight away from the normal deck (hand limit 5 still applies).

Players added before War Round 1 get nothing. The rule lives in the game engine's add-player path, so
invite-code joining in stage 4 gets it too. Automatic, no owner toggle.

## Acceptance criteria (check by hand at ~400px)
1. Round 0, add a player: supply 750, empty hand, no catch-up log line.
2. Round 1+, add a player: supply on the Players tab = round50(average of existing players' supply) − 150.
   Example: 1050 and 1350 average 1200, so the joiner gets 1050. One other player: their supply is the average.
3. If that comes to 750 or less, the joiner gets exactly 750 and still gets the card.
4. The joiner holds 1 card immediately after joining (1/5 on the hand bar).
5. They still get their normal draw at the next War Round (2 cards after it).
6. The log has one plain-text catch-up entry alongside the existing arrival entry; card-only wording
   when there's no supply bonus.
7. The bonus is not recalculated later; the joiner's supply moves only by normal growth.
8. In the Players tab, from round 1 onwards, a short hint near "Add player" says new players get the
   catch-up bonus. Hidden at round 0. No horizontal scroll at 400px.
9. The Rules tab has one short line describing the bonus, in the same tone as the rest.
10. Removing and re-adding a late player gives the bonus again (accepted).
11. Reload: supply, hand and log entry persist.

## Edge cases
- The average covers everyone already in `state.players` (before the joiner is added), including
  players with no provinces and anyone not yet in the turn order.
- Mid-round joiner: the card and supply arrive immediately; they join the turn order next round.
- The Fate deck is drawn from a pool and never runs out, so the card always arrives.
- Applies the same after the Hollowgate opens. Other players see only the hand count, as usual.

## Out of scope
Options B and C, an owner toggle or custom amounts, recalculating later, any bonus at round 0,
preventing remove-and-re-add, changes to world or Capital placement, the stage 4 joining UI.
