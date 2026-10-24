# Feature: Toughness cap in Setup

> Scoped 2026-10-24 by the product-owner agent. Owner decisions: hard block, Setup (round 0) only, the owner is
> bound too (no override). Toughness comes from the BSData 11e datasheet repo. This is the second Setup-only
> restriction, alongside [setup-one-character.md](setup-one-character.md).

Armies grow into heavy units (Knights, Land Raiders, Leman Russ) over the campaign, not on day one. Setup keeps the
first force light.

## Description
While the campaign is in Setup (before War Round 1), no unit on a roster may have Toughness 10 or higher. A unit's
Toughness is the highest T among its models. Units have an optional Toughness field. It is filled in when a player
picks a datasheet from their faction's list. If a save would leave a unit at T10 or more, Save is disabled and a
message says why. Each player's Setup checklist shows whether any unit is over. When War Round 1 begins, the limit
goes away.

## Rules
| | Setup (round 0) | From War Round 1 |
|---|---|---|
| Unit Toughness | 9 or lower. Hard block on saving a unit at T10+ | No limit |
| Unit Toughness blank (unknown) | Allowed, never flagged | Allowed |
| Ready / Begin | Flagged in the checklist, never blocked | n/a |

## Behaviour (decided)
- **Toughness field:** a new optional whole-number field on the unit form, "Toughness (T)". Blank means unknown.
  It can be typed by hand for custom and Legends units, which mostly have no datasheet T.
- **Picking a datasheet:** fills Toughness from the datasheet (the highest T across its models), the same way
  points are filled. If the datasheet has no known T, the field is cleared. The player can still edit it, because
  this is an honour system.
- **Edit unit:** nothing is re-filled unless the player picks a datasheet again. Existing units are not backfilled
  automatically.
- **Blocked save:** in Setup, Save is disabled when the form's Toughness is 10 or more. The message sits beside the
  field: "! Setup allows Toughness 9 or lower. This unit is T{n}. Lower its Toughness or pick another unit."
- **Applies to:** Add unit, Edit unit and Seasoned Recruits.
- **Seasoned Recruits in Setup:** a recruit at T10+ is refused, and no RP is spent.
- **Promotion:** unchanged. Promotion never changes Toughness.
- **Legacy over-limit unit** (a Setup roster that already holds a T10+ unit, for example after Reset campaign):
  - It is not changed when the roster loads.
  - Saving it is stopped only if it stays at T10+. To fix it, lower its T or delete it.
  - It is flagged in the checklist and on the unit card.
- **Datasheet picker:** each row shows the unit's T beside its points (e.g. "T5", muted). Rows with no T show
  nothing extra. In Setup, T10+ rows get a warning style but can still be picked. The form then explains the block.
- **Unit card:** shows "T{n}" in the unit's stat line when known. In Setup, a T10+ unit also shows
  "! T{n}: over the Setup limit", styled like the existing over-limit flag.
- **Example units:** each carries a Toughness.
  - The Redemptor Dreadnought (T10 in 11e) is replaced by an Impulsor (T9, 70 pts). It keeps the name "The Anvil of
    Kharst", the Vehicle role, its XP and honours.
  - "Add example units" must never break the rule.
- **Ready:** works as today. Ready and Begin are never blocked.
- **The game module also rejects the save:** add, update and recruit return false in Setup when the unit would end
  up at T10+. A legacy unit already at T10+ is also refused if it stays there. The UI blocks first, with the message.

## Acceptance criteria (check by hand at ~400px)
1. The unit form has an optional Toughness field. It takes a whole number from 1 upward, or blank. Anything else shows
   "Toughness must be a whole number, 1 or more." and disables Save.
2. Picking a datasheet with a known T fills the field. Picking one with no T clears it. The player can edit it
   afterwards.
3. In Setup:
   - A unit at T9 or lower saves normally.
   - A unit at T10 or more can't be added, edited or recruited. Save is disabled and the message shows.
   - A blank Toughness always saves.
4. Seasoned Recruits at T10+ in Setup is stopped and no RP is spent.
5. Each player's Setup checklist has a "Toughness" line.
   - It is done when no unit is T10+, and then reads "No unit over T9".
   - Not done with one unit over, it reads "{Unit name} is T{n}".
   - Not done with several, it reads "{n} units over T9".
   - Units with a blank Toughness never count.
6. That line never blocks Ready or Begin War Round 1.
7. The unit card shows "T{n}" when known. In Setup a T10+ unit also shows the over-limit flag.
8. The datasheet picker shows T beside points. In Setup, T10+ rows are visibly marked but can still be picked.
9. "Add example units" in Setup gives no unit over T9, and the example cards show a T.
10. A legacy Setup roster with a T10+ unit is left as it is when it loads. The unit can be lowered or deleted.
11. Once War Round 1 begins:
    - nothing is blocked;
    - the checklist line and the card flag disappear;
    - Toughness stays editable.
12. A late joiner (who arrives after War Round 1) is not bound by the rule. Reset campaign applies it again.
13. The owner gets the same stops when editing another player's roster in Setup.
14. The Rules tab and the Setup step 4 helper carry the new wording (below).
15. Datasheets with no matching Toughness can still be picked, with a blank T, and never cause an error.

## Data refresh (developer)
- `npm run update-points` now also reads Toughness from the BSData 11e datasheet repo (github.com/BSData/wh40k-11e,
  JSON catalogues).
  - It writes `t` (the highest T across a unit's models) onto each unit in `src/data/mfm/<slug>.json`.
  - Units with no match get no `t`.
- Matching works by unit name, after normalising curly apostrophes, non-breaking hyphens and case.
  - Where the same name has conflicting T, the script prefers the same faction's catalogue.
  - Otherwise it leaves `t` blank.
- The script prints, for each faction, how many units have no T.
- Running it again with no upstream change gives no diff.
- The app makes no network call at runtime.
- Refreshing the data never changes units already on a roster.
- The attribution for the second source sits next to the existing MFM label.

## Text changes
- **Rules tab:** in the Force Organisation paragraph, after the Character sentence, add: "Until War Round 1 begins,
  no unit may have Toughness 10 or higher: the heavy armour comes later."
- **Setup step 4 helper:** add "No unit may have Toughness 10 or higher yet."
- **Unit form hint under Toughness (Setup only):** "Setup allows Toughness 9 or lower."

## Edge cases
- The rule follows the campaign stage (round 0), not the player.
- A unit whose models have different T uses the highest. Attached leaders are not combined with the unit.
- An unknown Toughness is never a violation, so a heavy unit with a blank T slips through. This is accepted as part
  of the honour system, and it's why the picker fills T in.

## Out of scope
- Server-side enforcement.
- Any other statline field.
- Blocking Ready or Begin.
- Fixing legacy units automatically, or backfilling Toughness.
- Any limit from War Round 1.
- Runtime fetching, or any new AWS resource.
- Automated tests (project decision).
