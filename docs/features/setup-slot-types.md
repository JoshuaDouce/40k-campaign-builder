# Feature: Slot types and one T9 unit in Setup

> Scoped 2026-10-24 by the product-owner agent. Owner decisions: merge Vehicle and Monster (base 1, +Forge and +Refinery),
> add Mounted (base 1, +Settlement), Dedicated Transports go in Other, one slot per unit, and a Setup-only hard rule of at
> most one Toughness 9 unit (owner bound too, no override). Builds on [force-organisation.md](force-organisation.md) and
> [setup-toughness-cap.md](setup-toughness-cap.md).
>
> **Updated 2026-10-25:** Infantry and Mounted are merged into Non-Monster / Vehicle (base 3), Aircraft move to
> Vehicle / Monster, and roles come from datasheet keywords. See [role-keywords.md](role-keywords.md). The table below is current.

The role list matches how units are actually built, and the heaviest armour is limited to one unit on day one.

## Description
Force Organisation has six roles: Character, Battleline, Infantry, Mounted, Vehicle / Monster and Other. Vehicles and
Monsters share one slot row; bikes and cavalry get their own. Each unit fills exactly one slot, whatever its size or
keywords. The role picker and Rules tab say what goes where. In Setup (before War Round 1) a roster may hold at most one
unit at Toughness 9. If a save would make a second, Save is disabled and a message says why. The Setup checklist shows
it. When War Round 1 begins, the limit goes away.

## Decided rules
| Role | Min (always) | Base max | Extra slots from holdings |
|---|---|---|---|
| Character | 1 | 1 | +1 per Shrine held |
| Battleline | 2 | 4 | +1 per Fortress held |
| Non-Monster / Vehicle | 0 | 3 | +1 per Hive City held and +1 per Settlement held (Beasts and Swarms included) |
| Vehicle / Monster | 0 | 1 | +1 per Forge held and +1 per Refinery held (Aircraft included) |
| Other | 0 | 2 | +1 per Spaceport held |

- Order in the picker and chart: Character, Battleline, Infantry, Mounted, Vehicle / Monster, Other.
- The +3 cap from holdings is per role. Forges and Refineries share the Vehicle / Monster row (2 + 2 held = +3).
- Outpost and Ruins still grant nothing. Settlement's province bonus text ("No bonus. …") is unchanged: no holding's
  bonus text mentions slots; the chart and Rules tab carry it.
- **One slot per unit.** A Battleline Infantry unit fills Battleline only. The one overlap is the Warlord, who is a
  Character and fills the Character slot. Wording only.
- **Setup Toughness 9 rule.** At most one unit at Toughness exactly 9 on a roster in Setup (round 0). T10+ stays blocked
  outright. A blank Toughness never counts.

| | Setup (round 0) | From War Round 1 |
|---|---|---|
| Units at T10+ | Hard block (unchanged) | No limit |
| Units at T9 exactly | At most 1. Hard block on a second | No limit |
| Toughness blank | Allowed, never counted | Allowed |
| Ready / Begin | Flagged in the checklist, never blocked | n/a |

## Behaviour (decided)
- **Old saves:** a unit stored with role "Vehicle" or "Monster" becomes "Vehicle / Monster" with nothing else lost.
  The legacy names are mapped wherever a stored role is read or cleaned (unit clean-up runs `isRole`, which would
  otherwise drop the unknown string and leave the unit as "No role"; `roleOf` must also map them for rosters that are
  read without clean-up). Nothing that had a role may show "No role".
- **Mounted on old saves:** none exist. Units filed elsewhere stay there until edited. No auto-assigning.
- **Role picker:** Unassigned plus the six chips in order. The chip reads "Vehicle / Monster" in full (wrapping is fine,
  no abbreviation). A hint under the chips, always visible, gives the mapping (below).
- **Chart rows:** six rows. Mounted source line: "+1 Settlement ({province})". Vehicle / Monster lists Forges and
  Refineries together, first 3 shown as today.
- **Unit card tag:** shows the role name.
- **Second T9 unit, blocked save:** in Setup, Save is disabled when the form's Toughness is 9 and another unit on the
  roster is already T9. Message beside the Toughness field: "! Setup allows only one unit at Toughness 9, and {Unit name}
  is already T9. Lower this unit's Toughness or pick another unit." Applies to Add unit, Edit unit and Seasoned Recruits.
- **Edit unit:** judged on the resulting unit. A unit never counts against itself.
- **Seasoned Recruits in Setup:** a recruit that would be a second T9 unit is refused and no RP is spent.
- **Legacy roster with 2+ T9 units** (e.g. after Reset campaign): unchanged on load. Saving a T9 unit is stopped only if
  it stays T9 while another T9 unit remains. Lowering or deleting all but one fixes it; other units save normally.
- **Checklist:** folded into the existing "Toughness" line (no new line).
- **Unit card:** second and later T9 units (roster order) on a legacy roster show "! T9: only one unit at T9 in Setup",
  styled like the existing over-limit flag. The first is not flagged. T10+ units keep only their existing flag.
- **Datasheet picker:** unchanged. T9 rows get no warning.
- **Example units:** The Anvil of Kharst (Impulsor, T9) gets role "Vehicle / Monster"; nothing else changes. In Setup,
  if the player already has a non-example T9 unit, the Anvil is left out (same pattern as the example Captain).
  "Add example units" never breaks the rule.
- **Game module also rejects:** add, update and recruit return false in Setup when the unit would be a second T9 unit.
  The UI blocks first, with the message.
- **Unchanged:** supply, points, Promotion, honours, Character/Warlord link, Epic Hero rule, minimums.

## Text changes (final wording)
- **Rules tab, Force Organisation paragraph** (replaces the current one):

  > **Force Organisation.** Every unit has one role: Character, Battleline, Infantry, Mounted, Vehicle / Monster or Other. A unit fills the slot of its role only, whatever its size or keywords: a Battleline Infantry unit fills Battleline and not Infantry. The one overlap is your Warlord, who is a Character and fills the Character slot. Each warband should field at least 1 Character and 2 Battleline, and no more of each role than its slots allow. Slots grow with your conquests: each Shrine held adds a Character slot, each Fortress a Battleline, each Hive City an Infantry, each Settlement a Mounted, each Forge or Refinery a Vehicle / Monster, and each Spaceport (your Capital counts) an Other, up to +3 per role. Lose the ground and you lose the slot, and any units left over are over limit. This is the Reach's guidance, not a law: your group decides how strictly to hold each other to it. Your supply limit still caps total points. Until War Round 1 begins, the Character row is held at 1: your Warlord. Until War Round 1 begins, no unit may have Toughness 10 or higher, and only one unit may have Toughness 9: the heavy armour comes later. No Epic Heroes, ever: your warband is built from named Characters of your own, not the galaxy's legends.

- **Rules tab, new paragraph straight after it:**

  > **Which role?** Infantry covers foot troops of every kind, Beasts and Swarms included. Jump Pack and other flying infantry are Infantry. Bikes, cavalry and jetbikes are Mounted. Walkers, tanks and big monsters are Vehicle / Monster. Dedicated Transports, Aircraft and Fortifications are Other. Psykers take the role their datasheet gives them, usually Character. Allied units and Agents take whatever role their own datasheet gives them.

- **Role picker hint:** "Beasts and Swarms are Infantry. Walkers are Vehicle / Monster. Bikes and cavalry are Mounted.
  Transports, Aircraft and Fortifications are Other. A unit fills one slot only."
- **Setup step 4 helper:** "No unit may have Toughness 10 or higher yet." becomes "No unit may have Toughness 10 or
  higher yet, and only one may be Toughness 9."
- **Toughness hint (Setup only):** "Setup allows Toughness 9 or lower, and only one unit at Toughness 9."

## Acceptance criteria (check by hand at ~400px)
1. The role picker shows Unassigned, Character, Battleline, Infantry, Mounted, Vehicle / Monster, Other. No Vehicle or
   Monster chip. The hint shows under the chips. Nothing overflows sideways.
2. The chart shows six rows in that order. A fresh roster reads Battleline 0 / 5, Infantry 0 / 4, Mounted 0 / 1 and Vehicle / Monster 0 / 1.
3. A Settlement adds a Mounted slot ("+1 Settlement ({province})"). A Forge and a Refinery each add a Vehicle / Monster
   slot, listed in that row. The +3 cap shows as today.
4. A saved unit with role "Vehicle" or "Monster" shows in the Vehicle / Monster row with that tag. Nothing that had a
   role shows "No role". Saving it keeps Vehicle / Monster.
5. Two Mounted units with no Settlement: "Over limit by 1" and the last gets the "Over limit" tag. Saving still works.
6. Nothing blocks saving because of a role.
7. In Setup with no T9 unit, a T9 unit saves. With one already, adding, recruiting or editing another unit to T9 is
   blocked with the message. Lowering to 8 or blanking re-enables Save.
8. The checklist "Toughness" line covers both limits:
   - Done when no unit is T10+ and at most one is T9: "No unit over T9" (no T9 unit) or "One unit at T9" (exactly one).
   - A T10+ unit: as today ("{Unit name} is T{n}" / "{n} units over T9"); this wording wins if both problems exist.
   - Two or more T9 units: "{n} units at T9: keep one".
   - Blank Toughness never counts.
9. That line never blocks Ready or Begin War Round 1.
10. Editing the one T9 unit saves normally.
11. Seasoned Recruits at T9 with a T9 unit already on the roster is refused and no RP is spent.
12. On a legacy roster, second and later T9 units show "! T9: only one unit at T9 in Setup"; the first does not.
13. A legacy roster with 2+ T9 units loads unchanged and can be fixed one unit at a time.
14. "Add example units" on an empty Setup roster gives the Anvil as Vehicle / Monster at T9 (Vehicle / Monster 1 / 1).
    With an own T9 unit already, no Anvil is added.
15. From War Round 1, nothing about T9 is blocked and its checklist text and card flag are gone. The role changes stay.
16. A late joiner is not bound by the T9 rule. Reset campaign applies it again.
17. The owner gets the same stops on another player's roster.
18. The Rules tab, Setup step 4 helper and Toughness hint carry the new wording.
19. A blank Toughness never counts as T9 and never causes an error.

## Extension (owner request, 2026-10-24)
- **Battleline is exempt from the one-T9 rule.** A Battleline unit at T9 never counts toward the limit and never blocks
  another unit. Any number of Battleline units may be T9. The T10+ ban still applies to Battleline. Switching a T9 unit's
  role away from Battleline makes it count again (the form re-checks live).
- **Base slots:** Battleline 4 → 5, Infantry 3 → 4. Minimums unchanged.
- **Slots hold models, not fixed units.** The roster is a model supply. A slot can hold a bigger unit than is fielded
  at once (ten Intercessors in one slot can take the field as two squads of five). Armies for a game are built from
  roster models using the normal 40k muster rules. Wording only.
- Text: Rules tab adds the "Slots hold models, not fixed units." paragraph after "Which role?" and the T9 sentence reads
  "only one unit other than Battleline may have Toughness 9". The form hint, block message, card flag and Setup step 4
  helper say "(Battleline excepted)" / "non-Battleline".

## Edge cases
- The rule follows the campaign stage (round 0), not the player.
- Only T exactly 9 counts. A heavy unit with a blank T slips through (honour system).
- Characters count too: a T9 Warlord uses the one T9 place.
- Changing a unit between Vehicle / Monster and Mounted just moves it between rows.

## Out of scope
Server-side enforcement. Automatic role or keyword detection. Separate rows for Beasts, Swarms, Walkers, Transports or
Aircraft. Blocking Ready or Begin. Auto-fixing legacy rosters or moving units to Mounted. Any limit from War Round 1.
Changing minimums or Toughness values. New AWS resources. Automated tests (project decision).
