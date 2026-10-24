# Feature: No Epic Heroes

> Scoped 2026-10-24 by the product-owner agent. Owner decisions: hard block for the whole campaign (Setup and every War Round), no owner override, Epic Heroes hidden from the picker, flag comes from data only. Sits alongside [setup-one-character.md](setup-one-character.md) and [setup-toughness-cap.md](setup-toughness-cap.md). Unlike those two, this rule never expires.

Your warband is built from Characters of your own, not the galaxy's legends. No player may have a named Epic Hero (Marneus Calgar and the like) on their roster, in Setup or in any War Round.

## Description
The datasheet picker no longer lists Epic Heroes, Legends ones included. Each unit's datasheet name is checked against the player's faction data. If a save would leave an Epic Hero on a roster, Save is disabled and a message says why. A name typed by hand is checked against the player's faction data. If it matches an Epic Hero, it is blocked. If it matches nothing, it is allowed (honour system). Recruiting an Epic Hero is refused before any RP is spent. A unit already on a roster that turns out to be an Epic Hero is flagged, not deleted.

## Rules
| | Setup and all War Rounds |
|---|---|
| Epic Hero on a roster | Hard block on add, edit and recruit. No owner override. |
| Name not in the data (free-typed) | Allowed |
| Name matches a flagged datasheet in the player's faction | Blocked |
| Ready / Begin | Flagged in the checklist during Setup, never blocked |

## Behaviour (decided)
- **Picker:** Epic Heroes (including Legends) are not shown at all, not even disabled. Searching for one finds nothing.
- **No manual tick:** there is no "Epic Hero" checkbox. The flag comes from data only.
- **Matched by name, not stored:** epic status is worked out from the unit's datasheet name against the faction data each time (form, unit card, checklist). Nothing is saved on the unit, so units added before this rule are caught too. The game module does not enforce it (it has no faction data); like the rest of the app's permissions, the UI is the stop (honour system).
- **Typed name:** the form checks the datasheet name against the epic datasheets in that player's faction data. Matching ignores case, curly versus straight apostrophes, non-breaking hyphens and surrounding spaces. A match blocks Save. No match, or a match on a non-epic datasheet, is allowed.
- **Blocked save message** (beside the datasheet field): "! No Epic Heroes. {Name} is a named legend of the galaxy. Pick another Character or give your own hero a new name."
- **Applies to:** Add unit, Edit unit (judged on the resulting unit) and Seasoned Recruits.
- **Recruit:** refused with the same reason, and no RP is spent.
- **Existing units:** a unit already on a roster that is an Epic Hero (matched by name against the faction data) is left unchanged. Its unit card shows "! Epic Hero: not allowed in this campaign" and the Setup checklist flags it. The player fixes it by renaming or deleting the unit. Saving it is refused while it stays epic.
- **Example units:** none is an Epic Hero.
- **Unchanged:** the one-Character rule, the Toughness cap, points, Warlord and Promotion.

## Acceptance criteria (check by hand at ~400px)
1. Searching the picker for a known Epic Hero (e.g. Marneus Calgar) finds nothing. Legends Epic Heroes are also absent. Non-epic units are all still listed.
2. Picking a non-epic datasheet saves normally.
3. Typing a name that matches an Epic Hero in the player's faction, in any case or apostrophe style, disables Save and shows the message.
4. Typing a name that is not in the data saves normally.
5. Typing a name that matches a non-epic datasheet saves normally.
6. Editing a saved unit so that its name matches an Epic Hero is blocked. Renaming it to something else clears the block.
7. Seasoned Recruits of an Epic Hero is refused and no RP is spent.
8. The rule applies in Setup and in every War Round. The owner is blocked too, including when editing another player's roster.
9. The Setup checklist has a "Heroes" line: "No Epic Heroes" (done), "{Unit name} is an Epic Hero" (one), "{n} Epic Heroes on the roster" (several).
10. That line never blocks Ready or Begin War Round 1.
11. A legacy epic unit is left unchanged on load. Its card shows the warning. It can be renamed or deleted.
12. "Add example units" gives no Epic Hero.
13. A late joiner is bound by the rule. Reset campaign keeps it.
14. The Rules tab and the Setup step text carry the new wording (below).
15. A datasheet with no epic flag, or a faction whose data fails to load, never causes an error. The rule then falls back to the honour system.

## Data refresh (developer)
- `npm run update-points` writes `e: 1` on a unit if any entry in its BSData/wh40k-11e subtree has a category link named "Epic Hero". It is omitted when false.
- Running it again with no upstream change gives no diff.
- Refreshing never changes units already on a roster.
- The app makes no network call at runtime.

## Text changes (final wording)
- **Rules tab:** in the Force Organisation paragraph, at the end, after the Setup-only sentences (so it does not read as expiring): "No Epic Heroes, ever: your warband is built from named Characters of your own, not the galaxy's legends."
- **Setup step text:** add "No Epic Heroes."
- **Datasheet field hint (always shown):** "Epic Heroes are not allowed."
- **Unit card flag:** "! Epic Hero: not allowed in this campaign"

## Edge cases
- A typed close variant ("Marneus Calgar, Lord of Macragge") is not caught. Accepted under the honour system.
- The same name can be epic in one faction and not another. Only the player's own faction data counts.
- If a player changes faction, the name check uses the new faction's data.

## Out of scope
Server-side enforcement, a manual Epic Hero toggle or owner override, blocking Ready or Begin, deleting or auto-fixing legacy units, fuzzy name matching, runtime fetching, new AWS resources, automated tests (project decision).
