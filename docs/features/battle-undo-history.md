# Feature: Battle Undo and Battle History

> Scoped 2026-10-22. Two linked features. **Undo** takes back a battle result recorded by
> mistake. **History** gives every player a record of their battles. History never shows an
> undone battle. No rule, card or twist changes.

## Description
When someone records a battle result by mistake, the attacker, defender or owner can press
**Undo result** in the War Room. The campaign returns exactly to how it stood the moment
before: the attacker's turn is open again and the battle is shown as rolled but unresolved,
with the same province, defender and mission twists. They then record the right result.

In the Players tab each player card gets a one-line record ("5 battles · 3W 1D 1L"). Tapping
it expands that player's battle list (War Round, opponent, province and world, Conquer / Raid /
Garrison, outcome) with a summary above it.

## Findings that shape the scope
1. **Post-battle reports are not linked to a battle.** A report (XP, fallen) is filed per player
   from the Roster tab at any time. To block undo after a report, the app remembers that a
   report was filed after the latest result.
2. **Undo window.** Roster-only actions (filing a report, editing/adding/removing units, relics)
   do not close the window; filing a report switches Undo to the blocked state (AC 9). Every
   other action closes it: the next player's action, starting a round, card draw/play/discard,
   RP spend, owner stat or province overrides, add/remove player, reset, re-chart.
3. **Random outcomes are restored, not re-rolled.** Cards drawn for the win or Underdog's grit
   and a card stolen by a Raid come back as the same cards in the same hands.
4. **Existing campaigns start with empty history.** The old log is not parsed.

## Decisions (user-confirmed)
- **Who:** attacker, defender or owner (same as who can record a result).
- **Which:** only the most recent result. **When:** until the window closes (finding 2).
- **Reports:** if one has been filed since the result, undo is blocked with a plain note.
  Rosters are never rewound.
- **History:** Players tab. Battles, wins, draws, losses, provinces taken. Last 10 battles with
  "Show all". No streaks or head-to-head.
- **Names:** history shows a player's current name; a removed player falls back to the name
  saved at the time.

## Scope: in
**Undo**
- One button on the War Room after a result, with a confirm step.
- Restores everything a result touches: provinces (incl. Capital sack and RP stolen), RP, battles
  and wins, Fate Card hands, Scout and Fortify, turn order and whose turn it is, end-of-round
  state, a Hollowgate win and its flag. The log lines for that result disappear.

**History**
- Structured battle records saved when a result is recorded and removed on undo.
- One-line record on each player card, expanding to the summary and list.

## Scope: out
- Undoing anything but a battle result, more than one step, or redo.
- Undoing quiet actions (Recuperate, Muster, Fortify, Scout) or card plays.
- Rewinding rosters, XP, fallen characters or supply.
- Rebuilding history for existing campaigns; editing a result in place.
- Streaks, head-to-head, charts, a global history screen, export.
- Stronger permissions (honour-system, UI-only, as today).

## Acceptance criteria (check by hand at ~400px)
**Undo**
1. After a result, the War Room shows "Undo result" to the attacker, defender and owner only.
2. Tapping it asks to confirm. Confirming restores the pre-result state.
3. After undo the same player's turn is open; the battle shows rolled but unresolved with the
   same province, defender, mission twists and garrison flag; the result buttons work again.
4. After undo these match the moment before the result: province owners; every player's RP,
   battles, wins, supply and Scout flag; every Fate Card hand (same cards, same order); Fortify
   flags; turn order and position, round number, win state and the Hollowgate flag.
5. A Raid undo returns a stolen card to the defender. A garrison undo leaves the defender untouched.
6. The log lines the result added are gone; earlier lines are unchanged.
7. Recording a different result after undo works normally.
8. Undo disappears as soon as the window closes and never reappears for older results.
9. If a post-battle report was filed since the result, the blocked note shows instead and
   nothing changes.
10. Undo works if the result ended the War Round or declared a Hollowgate win; the win banner
    clears and play continues.
11. Undo is one saved change; on reload the Undo state is the same.

**History**
12. Each player card shows "N battles · xW yD zL", or "No battles yet".
13. Tapping it expands to the summary: Battles, Wins, Draws, Losses, Provinces taken.
14. The list is newest first: the last 10, with "Show all" / "Show fewer".
15. Each entry shows the War Round, opponent, province and world (Hollowgate has no world),
    Conquer / Raid / Garrison, and the outcome from this player's view (Won / Lost / Draw, plus
    "took the province" where it applies).
16. A result adds an entry for both players (attacker only for a garrison fight). Undo removes it.
17. History counts come from the list. The owner's manual +/- stays independent; if a player's
    totals disagree, show the totals note.
18. Existing campaigns open with empty history and no errors.
19. Both work at ~400px with no sideways scroll and comfortable tap targets.

## Copy
**Undo (War Room)**
- Button: "Undo result"
- Hint: "Recorded by mistake? You can take it back until the next action."
- Confirm title: "Undo this result?"
- Confirm body: "{Attacker} vs {Defender} at {Province} goes back to unresolved. RP, provinces, Fate Cards and the log return to how they were."
- Confirm buttons: "Undo result" / "Keep result"
- Blocked note: "This result can't be undone because a post-battle report has been filed since it was recorded." (Reports can't be removed, so the note doesn't ask for that.)

**History (Players tab)**
- Line: "5 battles · 3W 1D 1L". Zero: "No battles yet".
- Summary labels: "Battles", "Wins", "Draws", "Losses", "Provinces taken".
- Entries:
  - "Round 3 · vs Ironhand · Hive Alpha on Varkesh Prime · Conquer · Won, took the province"
  - "Round 4 · vs Ironhand · Hollowgate · Raid · Lost"
  - "Round 2 · Garrison · Quarry Ridge on Ash Moon · Draw"
- Buttons: "Show all" / "Show fewer"
- Totals note: "Totals above were adjusted by hand, so they may not match this list."

## Edge cases
- The undo window lives in the saved campaign, not the page, so a reload shows the same state.
- Reset, re-chart and remove player close the window and leave history coherent. Reset clears history.
- Draws: outcome Draw; a Conquer province is not taken.
- Garrison fights: attacker-only entry, opponent "Garrison".
- Provinces taken: Conquer wins where the attacker took the province (garrison conquests count, Raids don't).
- Removed players: entries naming them fall back to the saved name.
- Several battles in a round: each separate; only the latest can be undone.
- Late joiners start with empty history.
- Many battles: the 10-item list keeps it usable; keep records small (document size).
