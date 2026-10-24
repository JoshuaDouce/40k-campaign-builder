# Feature: Campaign rule toggles

> Scoped 2026-10-24 by the product-owner agent. Owner decisions: four independent on/off toggles, switchable at any time
> by the campaign owner only, defaults = today's rules, every change logged. Builds on
> [force-organisation.md](force-organisation.md), [setup-slot-types.md](setup-slot-types.md),
> [setup-toughness-cap.md](setup-toughness-cap.md) and [setup-one-character.md](setup-one-character.md).
> The Setup hard rules stay fixed and are NOT toggles: one Character who is the Warlord, no unit at T10+, at most one
> non-Battleline unit at T9, no Epic Heroes.

Groups play the campaign differently. The owner tunes four rules to the table; everyone can see which are on.

## Description
A "Campaign rules" panel lists four toggles: Force Organisation slots, Datasheet limit, Toughness stages and Knights
exemption. Everyone sees which are on. Only the campaign owner can change them, at any time (Setup or any War Round).
Each change writes one campaign log line. Switching a toggle never deletes or edits a unit: a roster already breaking a
newly enabled rule is flagged, and only saves that would add to the problem are blocked. A campaign saved before this
feature behaves exactly as today.

## The four toggles
| Toggle | Default | When on | When off |
|---|---|---|---|
| Force Organisation slots | ON | Chart, slot warnings, "Over limit" tags, minimum warnings and slot hints (today) | All of those hidden. The role picker stays |
| Datasheet limit | OFF | A roster may use at most N different datasheets | No limit |
| Toughness stages | OFF | War Rounds 1 and 2: no unit above T11 | Only the fixed Setup rules apply |
| Knights exemption | OFF | Knights players: Armigers and War Dogs count as Battleline, and may be the Setup Warlord | Normal rules |

## Behaviour (decided)

### All toggles
- **Independent:** any combination works.
- **Old saves:** no toggle data = the defaults above.
- **Units are never changed or deleted by a switch.** A unit that now breaks a rule is flagged; only a save that adds
  to the problem is blocked (same pattern as the legacy T10+ unit).
- **Owner-only** in the permissions check, like Regen and Reset. Non-owners see the state but no controls.
- **Switching to the value it already has** is a no-op: no log line.
- **Reset campaign keeps the toggles.** Chart a new Reach doesn't touch them.
- **Open Undo window:** changing a toggle does not close it (treat like roster actions). The log line is kept if the
  battle is undone.

### 1. Force Organisation slots (default on)
- **Off hides:** the Force Org chart, "Over limit" card tags, "Needs N more {role}" checklist lines and the slot hint
  under the role picker.
- **Off keeps:** the role picker (with its mapping hint), the role tag on cards, and Setup's one-Character rule.
- Roles still matter off: the Battleline T9 exception and the Knights toggle read the role.
- Switching back on shows the chart again, with any over-limit units flagged as normal.

### 2. Datasheet limit (default off)
- **N = 5 + current War Round** (Setup = 5, War Round 1 = 6, …). A late joiner gets the current N.
- **Counting:** distinct datasheets on the roster, compared folded (case, accents, apostrophes, surrounding spaces).
  Several units of one datasheet count once. The Warlord counts like any other unit.
- **Blank datasheet:** never counted, never blocked. Custom typed names count as their own datasheet.
- **Hard block** on Add unit, Edit unit and Seasoned Recruits when the save would bring a datasheet no other unit has
  and the roster would then exceed N. The game module refuses too; a refused recruit spends nothing.
- **Edits that don't add a new datasheet always save,** even on a roster over N.
- **Over the limit** (switched on late): unchanged, flagged; fixed by removing units or waiting for N to grow.
- **Roster tab:** "Datasheets x / N" near the totals. Over N: "! {x - N} over the datasheet limit", over-limit style.
- **Setup checklist:** a "Datasheets" line "x / N", done when x ≤ N. Never blocks Ready or Begin.
- **Add example units:** examples that would go past N are left out, in roster order.
- **Block message (under the Datasheet field):** "! Your roster already uses {N} of {N} datasheets, and {datasheet}
  would be a new one. Pick a datasheet you already field, or wait: the limit rises by 1 each War Round."

### 3. Toughness stages (default off)
- **Setup unchanged.** The fixed T9/T10+ rules apply first.
- **Active when:** War Round 1 or 2 and that player's supply limit is under 1250. Then no unit may be T12+.
- **Lifts** from War Round 3, or the moment that player's supply reaches 1250.
- **Hard block** on Add, Edit and Seasoned Recruits at T12+; game module refuses too. A legacy T12+ unit is refused
  only if it stays T12+ while the cap is active. Blank T never counts.
- **Unit card flag:** "! T{n}: over the War Round 1–2 limit". The Roster tab shows a one-line count of flagged units
  while the cap is active.
- **Form hint (only while active):** "War Rounds 1 and 2 allow Toughness 11 or lower, until your supply limit reaches
  1250 pts."
- **Block message:** "! War Rounds 1 and 2 allow Toughness 11 or lower until your supply limit reaches 1250 pts. This
  unit is T{n}. Lower its Toughness or pick another unit."
- **Datasheet picker:** while active, T12+ rows get the warning style; still pickable.

### 4. Knights exemption (default off)
- **Applies only to** players whose current faction is Imperial Knights or Chaos Knights.
- **Which units:** folded datasheet name starts with "Armiger" or "War Dog" (typed names too).
- **Role:** picking such a datasheet sets role Battleline (a note under the role picker says so); the player may change
  it. Battleline Armigers are exempt from the one-T9 rule through the existing Battleline exception.
- **Setup Warlord:** in Setup the Warlord may be a non-Character Armiger or War Dog.
  - It carries the Warlord flag and Warlord trait, not the Character-only items (title, backstory, enhancement, relics).
  - It stays Battleline and fills a Battleline slot.
  - It uses the non-Character honour and scar tables and keeps the Warlord's protection.
- **One Character in Setup:** such a Warlord counts as the warband's one Character. While it exists, Setup refuses a
  second Warlord or Character; while a Character exists, Setup refuses making an Armiger the Warlord.
- **Checklist "Character" line:** done with exactly one Character who is the Warlord, or an exempt non-Character
  Warlord and no Character. Value for the second: "{name}: Warlord (Knight)".
- **From War Round 1:** normal rules. An existing Armiger Warlord stays; the player can untick it or make a Character
  the Warlord, but can't make a non-Character the Warlord again.
- **Toggle off later, or faction changed:** the Armiger Warlord is not changed (unit clean-up must not strip it). It
  shows "! Warlord is not a Character" on the card and in the Setup checklist. A save may keep the flag but cannot add it.

## Where the controls live
- **Rules tab, "Campaign rules" panel at the top:** four rows (name, On/Off badge, one-line description). The owner gets
  a switch per row (`aria-pressed`, ≥44px tap target); everyone else sees only the badge. Rows stack on a phone.
- **Setup tab, step 4:** read-only line "Campaign rules: {toggles that are on}" ("Default rules" when only Force
  Organisation is on), with a button to the Rules tab.
- **Rules tab text:** each toggle's paragraph shows only while it is on.

## Data shape (suggestion)
`state.toggles?: { forceOrg?: boolean; datasheetLimit?: boolean; toughnessStages?: boolean; knights?: boolean }`;
missing object or key = default. New owner-only action `setToggle { key, on }`. The datasheet fold lives in the game
module (it can't import from `src/components`).

## Log lines
`Campaign rule changed: {Name} is now on.` / `… is now off.` Names: "Force Organisation slots", "Datasheet limit",
"Toughness stages", "Knights exemption" (name bold).

## Text changes (final wording)
- **"Setup limits" paragraph, always shown, after the Characters paragraphs:**

  > **Setup limits.** Until War Round 1 begins, your warband has exactly one Character: your Warlord. No unit may have Toughness 10 or higher, and only one unit other than Battleline may have Toughness 9: the heavy armour comes later. No Epic Heroes, ever: your warband is built from named Characters of your own, not the galaxy's legends.

- **Force Organisation paragraph, only when on** (current text minus the Setup sentences, keeping the Character-row
  sentence "Until War Round 1 begins, the Character row is held at 1: your Warlord.").
- **When Force Organisation is off, in its place:**

  > **Roles.** Every unit can be given a role: Character, Battleline, Infantry, Mounted, Vehicle / Monster or Other. This campaign does not use slots, so there are no limits or minimums. Roles still matter for the Battleline exception to the Toughness 9 limit and for the Knights exemption.

- **"Which role?" and "Slots hold models, not fixed units"** stay; with slots off, "in one Battleline slot" reads "in one
  Battleline unit".
- **Shown only when on, after Which role?:**

  > **Datasheet limit.** A roster may use at most 5 different datasheets in Setup, and 1 more at the start of each War Round: 6 in War Round 1, 7 in War Round 2, and so on. Several units of the same datasheet count once, and so does your Warlord's. A unit with no datasheet named isn't counted. At the limit, you can't add a unit of a new datasheet until the limit grows.

  > **Toughness stages.** In War Rounds 1 and 2, no unit may have Toughness 12 or higher. From War Round 3, or as soon as your supply limit reaches 1250 pts, the cap is gone. The Setup limits still apply first.

  > **Knights.** For Imperial Knights and Chaos Knights players: Armigers and War Dogs count as Battleline, so the one Toughness 9 limit doesn't apply to them. In Setup, your Warlord may be an Armiger or War Dog instead of a Character. It carries the Warlord trait, but no title, backstory, enhancement or relics. From War Round 1 the normal rules apply, and you may make a Character your Warlord.

- **Role picker note (Knights player, toggle on, Armiger/War Dog picked):** "Armigers and War Dogs count as Battleline
  in this campaign."
- **Setup step 4 helper, appended:** "Your owner may have switched some campaign rules on or off: see the Rules tab."
- **Panel descriptions:**
  - Force Organisation slots: "Role slots, minimums and over-limit warnings."
  - Datasheet limit: "5 datasheets in Setup, +1 each War Round."
  - Toughness stages: "No unit above T11 in War Rounds 1–2, until supply reaches 1250."
  - Knights exemption: "Armigers and War Dogs count as Battleline; one may be the Setup Warlord."

## Acceptance criteria (check by hand at ~400px)
1. The Rules tab has a "Campaign rules" panel at the top with four rows and On/Off badges. A fresh or old-save campaign
   shows Force Organisation slots on, the rest off. Nothing scrolls sideways.
2. The owner sees a switch on each row; other members see only the badges, with the same state.
3. Flipping a switch updates the badge and writes one log line. A non-owner cannot dispatch it. Re-setting the same
   value writes nothing.
4. An old save with no toggle data behaves exactly as before.
5. **Force Organisation off:** chart, "Over limit" tags, "Needs N more" lines and slot hints are gone; role picker, role
   tags and the one-Character rule stay; Rules tab shows "Roles" instead. Back on restores everything, no unit changed.
6. **Datasheet limit on, Setup:** the sixth distinct datasheet can't be added, edited in or recruited (message shows;
   refused recruit costs no RP). A second unit of an existing datasheet saves.
7. Roster tab shows "Datasheets x / N". At War Round 1, N = 6. A blank datasheet doesn't count.
8. The Setup checklist "Datasheets" line shows "x / N" only when on, and never blocks Ready or Begin.
9. A roster over N is unchanged and flagged; edits that keep or reuse a datasheet still save.
10. "Add example units" with the limit on in Setup adds at most 5 distinct datasheets.
11. Names differing only by case, accent or apostrophe count as one datasheet.
12. **Toughness stages on:** in War Round 1 or 2, a T12 unit can't be added, edited to or recruited; T11 and blank save.
    A legacy T12+ unit is flagged and can be lowered. From War Round 3, or supply 1250+, all of that disappears.
13. Setup behaves as today with Toughness stages on.
14. **Knights on, Knights player:** picking "Armiger Helverin" or "War Dog Stalker" sets Battleline and shows the note;
    two T9 Armigers fit in Setup. Other factions: no effect.
15. In Setup a Knights player can make a non-Character Armiger the Warlord: Character-only fields hidden, Warlord trait
    shown, checklist Character line done ("{name}: Warlord (Knight)").
16. With such a Warlord in Setup, adding a Character or another Warlord is refused; with a Character present, making
    an Armiger the Warlord is refused.
17. From War Round 1 the Armiger Warlord stays, but a non-Character can't newly become Warlord. Toggle off or faction
    change leaves it untouched with "! Warlord is not a Character".
18. The owner can switch toggles in Setup or any War Round; owner edits to others' rosters get the same blocks.
19. Flipping a toggle doesn't close an open Undo window.
20. Reset campaign keeps the toggles.
21. Each toggle's Rules paragraph shows only while on.

## Edge cases
- Supply crossing 1250 mid-round lifts the Toughness cap for that player at once.
- N rises when a War Round begins; counts are computed, never stored.
- Changing a unit's only-of-its-kind datasheet to another new one doesn't raise the count and saves.
- Typed names count as their own datasheet; two spellings count as two (honour system).
- Knights with Toughness stages: Armigers (T9) fine; T12+ Knights blocked in War Rounds 1–2.
- A non-Character Warlord after Setup: "Needs 1 more Character" shows if Force Org is on; Promotion clears it.

## Out of scope
Toggling the fixed Setup rules. Custom values (N, caps, 1250). Per-player toggles. Toggle history screen. Server-side
enforcement. Auto-fixing rosters. Datasheet-limit flags on unit cards. Blocking Ready or Begin. New AWS resources.
Automated tests (project decision).
