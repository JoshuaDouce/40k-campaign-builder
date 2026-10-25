# Feature: Campaign focus navigation (Reference tab)

> Scoped 2026-10-25 by the product-owner agent. Owner decisions: once a campaign is under way the main tab bar shrinks to
> War Room, Map, Roster, Players and Reference. Reference holds Pitch, Rules, Turn Guide, Fate Deck and Factions behind a
> row of sub-buttons (chosen over a dropdown). Setup is not changed. Navigation only.

When a campaign is running, players want to see what matters at the table straight away: the War Room, the Map, their
Roster and the other players. Reading material (Pitch, Rules, Turn Guide, Fate Deck, Factions) is still there, but tucked
into one Reference tab. From War Round 1 the tab bar reads War Room, Map, Roster, Players, Reference, and opening a
campaign always lands on the War Room. Reference has a row of buttons at the top to pick which page you read. It
remembers the last page you looked at on that device. Before War Round 1 (Setup) nothing changes. The signed-out and
campaign-list screens do not change either.

## Decided behaviour
- **When it applies:** only inside a campaign with `state.round >= 1`. At round 0 the flat tab set is unchanged (Setup,
  Pitch, War Room, Map, Roster, Rules, Turn Guide, Fate Deck, Factions, Players) and the campaign opens on Setup.
- **Main tab bar from round 1** (this order, nothing else): War Room, Map, Roster, Players, Reference. The Players tab keeps
  its name "Players".
- **Opening a started campaign always lands on War Room.** The saved tab is ignored on open, and so is the URL hash. This
  includes a saved tab that was Pitch, Rules or any other reference page. The "fall back to Pitch" case is gone.
- **Reference sub-buttons**, in this order: Rules, Turn Guide, Fate Deck, Factions, Pitch. Rules is first because it is what
  people look up mid-game. Pitch is last because it is the story, read once.
- **First time on a device:** Reference opens on Rules. After that it opens on the last sub-page viewed on this device
  (remembered per device, not per campaign, and not shared with other players).
- **Highlighting:** while a reference page is showing, the Reference tab stays highlighted and the matching sub-button is
  shown as selected. Only one main tab and one sub-button are highlighted at a time.
- **The sub-button row** sits directly under the main tab bar, above the page. It is part of Reference only; no other tab shows it.
- **Switching main tabs and back:** leaving Reference for War Room and coming back returns to the remembered sub-page.
- **Hash (#) deep links:** the hash shows the page, not "reference": `#rules`, `#turn`, `#cards`, `#factions`, `#pitch` while
  reading, and `#war`, `#map`, `#roster`, `#tracker` on the others, as today. A hash change to any of the five reference ids
  opens Reference on that page.
- **Navigation links elsewhere in the app** (any `onNavigate` to rules, turn, cards, factions or pitch) open Reference on
  that page and remember it as the last-viewed sub-page.
- **Round crosses 0 to 1 live** (the organiser begins War Round 1 while you are looking at the app):
  - On a reference page (Pitch, Rules, Turn Guide, Fate Deck or Factions): you stay on that same page, now inside Reference.
  - On Setup: goes to the War Room (as today).
  - On War Room, Map, Roster or Players: stay put.
- **If the round goes back to 0** (Reset campaign): the flat tab set returns. If you were on a reference page you stay on
  that page as a normal tab.
- **Late joiner flow** (Players tab "play" button to the join screen and back): unchanged.
- **Unchanged:** the signed-out and campaign-list screens, Setup, the campaign header, all tab content, the Fate hand (it
  stays in the War Room and Players), permissions, data, saving, and the game module.

## Text and labels
- Main tab: **Reference** (new). All other labels as they are today.
- Sub-buttons: **Rules**, **Turn Guide**, **Fate Deck**, **Factions**, **Pitch**.
- Accessible names: main bar "Campaign sections"; sub-row "Reference pages".
- No new headings or body text.

## Acceptance criteria (check by hand at ~400px)
1. In a campaign at round 0, the tab bar is the full flat set and the campaign opens on Setup, as before.
2. At round 1 or later, the tab bar shows exactly War Room, Map, Roster, Players, Reference.
3. The tabs fit or scroll sideways in the tab bar. The page itself never scrolls sideways.
4. Open a started campaign from the list with the last saved tab being Pitch, Rules, Map or Players: it opens on War Room each time.
5. Tap Reference for the first time on a device (clear site data first): it opens on Rules. Reference is highlighted and
   Rules is selected in the sub-row.
6. The sub-row shows Rules, Turn Guide, Fate Deck, Factions, Pitch in that order, without the page overflowing. Each tap
   shows that page and selects its button.
7. Pick Factions, go to Map, return to Reference: it opens on Factions. Reload, open the campaign (lands on War Room), tap
   Reference: still Factions.
8. The sub-row is not shown on War Room, Map, Roster or Players.
9. The URL hash shows `#factions` (not `#reference`) while reading Factions. Changing the hash to `#cards` in an open
   campaign opens Reference on Fate Deck.
10. Any in-app link to a reference page lands on Reference with the right sub-button selected.
11. Begin War Round 1 from Setup on one device while a second device sits on Pitch: the second device stays on Pitch (now
    under Reference). A device on Setup moves to War Room.
12. The signed-out screen and the campaign list's reference view still show the flat Pitch, Rules, Turn Guide, Fate Deck
    and Factions tabs, unchanged.
13. A late joiner's "play" button still opens the join screen and returns to the Players tab.
14. A player's own Fate hand is still in the War Room and Players; Fate Deck in Reference shows the card list only.
15. `npm run build` and `npm run lint` pass.

## Edge cases
- Remembering a Reference page must not change which tab the signed-out screens open on, and a stale saved value cannot
  land a started campaign anywhere but War Room.
- The sub-row must not wrap into an ugly stack at 400px and must be comfortable to tap.
- Keyboard and screen reader: the Reference tab is selected while a sub-page shows; sub-buttons need a selected state that
  is not colour alone.
- Reset campaign while on a reference page: the page still shows (no blank screen).
- Moving between Reference and Map must not reset the map view (open planet).

## Out of scope
Changing Setup or the round-0 tabs. A dropdown or menu version. Changing the signed-out / list screens. Per-campaign or
per-account memory of the sub-page. Restoring last tab on open (always War Room). Editing any reference content. Moving
the Fate hand. Game, data, permission or AWS changes. Automated tests (project decision).
