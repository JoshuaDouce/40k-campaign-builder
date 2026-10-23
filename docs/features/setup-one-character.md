# Feature: One Character in Setup

> Scoped 2026-10-23 by the product-owner agent. Owner decisions: hard block, Setup (round 0) only, the owner is
> bound too (no override).

Enforces the rule already written on the Rules tab ("Your warband starts with exactly one Character: your
Warlord"). The first hard rule on the roster; Force Organisation stays guidance from War Round 1.

## Description
While the campaign is in Setup (before War Round 1), each player's roster may hold one Character, and it must be
the Warlord. Trying to add or save a second Character is stopped, with a message saying why. The Force Org
Character row reads max 1 during Setup, and each player's Setup checklist shows whether they have exactly one
Character and that it is the Warlord. When War Round 1 begins, the normal Character slots (base 2, +1 per Shrine
held) return as guidance.

## Rules
| | Setup (round 0) | From War Round 1 |
|---|---|---|
| Characters on a roster | Exactly 1, and it is the Warlord. Hard block on adding a second | Guidance (base 2 + Shrines, min 1) |
| Force Org Character row max | 1 | 2 + Shrines |
| Non-Warlord Characters | Not allowed | Allowed (Promotion, Recruits, edit) |
| Ready / Begin | Flagged in the checklist, never blocked | n/a |

## Behaviour (decided)
- **Adding or saving a Character when one already exists:** stopped. Save is disabled and the message names the
  existing Character, e.g. "Setup allows one Character: your Warlord (Captain Idris Valen). Change or remove them
  first." This applies even if the existing one isn't the Warlord (legacy rosters).
- **Ticking Character (or picking role Character) in Setup:** Warlord is ticked automatically and locked on while
  Character is ticked. A non-Warlord Character can't be made in Setup.
- **Unticking Warlord on the only Character:** not possible in Setup (it's locked). To stop it being a Character,
  untick Character as today; the existing warning about losing details still shows.
- **Making a second unit the Warlord:** this counts as a second Character, so it's blocked. To swap, untick
  Character on the old one, or delete it, first.
- **Deleting the Warlord:** allowed. The checklist then reads "No Character yet". In Setup this skips the Hall of
  Heroes memorial, because no battles have been fought.
- **Promotion in Setup:** promoting a non-Character is refused, with no RP spent. An enhancement for the existing
  Character is unchanged.
- **Seasoned Recruits in Setup:** a Character recruit that would break the limit is refused, with no RP spent.
- **Example units:** the example Captain is the Warlord. In Setup, if the player already has a Character of their
  own, "Add example units" leaves the Captain out.
- **Existing Setup rosters with 2 or more Characters:** not changed automatically. The Force Org Character row
  shows over limit and the checklist flags it. The player can still edit those Characters' other fields and edit
  non-Character units; only a save that adds a Character is stopped.
- **Ready:** works as today. The checklist and the reminder flag the problem, but Ready and Begin are never blocked.
- **The game module also rejects the save:** add, update, recruit and promote return false in Setup for a save
  that would add a second Character or a non-Warlord Character. The UI blocks first, with the message.

## Acceptance criteria (check by hand at ~400px)
1. In Setup, with no Character on the roster, adding one works. Ticking Character (or picking role Character) also
   ticks Warlord, and Warlord can't be unticked while Character is on.
2. In Setup, with one Character on the roster, adding or saving a second Character (with the Character chip, the
   Character role or Recruits) is stopped. Save is disabled and the message names the existing Character.
3. In Setup, making another unit the Warlord is stopped by the same rule. After the old Character is unticked or
   deleted, the new unit can become the Warlord.
4. In Setup, promoting a non-Character is refused and no RP is spent. An enhancement for the existing Character
   still works.
5. The Force Org Character row reads "x / 1" in Setup, and its source line says one Character, your Warlord,
   instead of "Base 2". A legacy roster with 2 Characters shows "Over limit by 1".
6. Each player's Setup checklist has a "Character" line, done only when the roster has exactly one Character and
   it is the Warlord. It shows the name when done, "No Character yet" for none, "2 Characters: keep only the
   Warlord" for several, and "Not the Warlord" for a lone non-Warlord. It replaces the current Warlord line.
7. This never blocks Ready or Begin War Round 1. A player whose Character line isn't done is listed in the
   "not ready" reminder as today.
8. A legacy Setup roster with 2 or more Characters is left as it is when it loads. Its other units can be edited,
   and a Character can be unticked or deleted to fix it.
9. "Add example units" gives Character 1 / 1 with no warning. If the player already has a Character of their own,
   no example Captain is added.
10. Once War Round 1 begins, the Character row goes back to base 2 + Shrines (guidance only), non-Warlord
    Characters can be made again (Promotion, Recruits, the editor), and nothing is blocked.
11. The owner gets the same stops when editing another player's roster in Setup.
12. The Rules tab gains one sentence (below). The rest of the Characters text on the Rules tab is unchanged.

## Text changes
- Rules tab, Force Organisation paragraph, add: "Until War Round 1 begins, the Character row is held at 1: your
  Warlord."
- Setup step 4 helper: "Each warband needs a Warlord, a 750 pt roster, 5 RP and a Capital." becomes "Each warband
  needs exactly one Character (its Warlord), a 750 pt roster, 5 RP and a Capital."

## Edge cases
- The rule follows the campaign stage (round 0), not the player. A late joiner arrives after War Round 1 and isn't
  bound by it.
- Reset campaign goes back to round 0, so the rule applies again to any rosters that remain. They're treated as
  legacy rosters: flagged, not changed.
- In Setup, the Character minimum warning ("Needs 1 more Character") repeats the checklist line, so only the
  checklist line shows.
- Swapping the Warlord means unticking Character on the old one, which loses its title, backstory, enhancement and
  relics. The existing warning covers this.

## Out of scope
- Enforcing the rule on the server.
- Swapping the Warlord in one step.
- Blocking Ready or Begin.
- Fixing legacy rosters automatically.
- Changing base slots, minimums or Shrine bonuses.
- Any change to the rules from War Round 1.
- Backend or data model changes.
- Automated tests (project decision).
