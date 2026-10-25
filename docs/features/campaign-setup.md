# Feature: Campaign Setup

> Scoped 2026-10-22 by the product-owner agent. Owner decisions: setup mode before round 1 (tab bar stays),
> starting positions are a checklist only, short briefing, advisory Begin gate. Step order changed by the
> orchestrator: Chart the Reach comes before Starting positions, because the Capital row depends on the chart.

Collects every "get ready for War Round 1" action into one guided place, so setup is *done* there and
*explained* elsewhere. Pitch, Rules and Turn Guide stay as reference. In-play controls (stats, Fate Cards,
supply) stay out of setup. No rule, card or twist changes.

## Description
Before War Round 1 the app opens on a **Setup** tab, first in the tab bar. The tab bar stays, so anyone can
leave to read Rules or the Map and come back. Setup is one scrolling page of numbered step cards, each marked
Done or To do, with the first unfinished step marked Next: **1 Briefing, 2 Players, 3 Chart the Reach,
4 Starting positions, 5 Begin.** Step 4 gives each player a checklist (Warlord, roster, 5 RP, Capital) that
mostly ticks itself from the Roster tab and map, plus a Ready tick set by that player (or the owner). Begin
starts War Round 1 and the Setup tab disappears. Late joiners after round 1 use the existing Players tab and
catch-up bonus, with no setup.

## Decided rules
**Entering and leaving setup**
- Setup mode is not a stored switch: it is "War Round 1 has not begun" (round 0).
- The Setup tab shows only at round 0, first in the bar (before Pitch).
- On load at round 0 the app opens on Setup, ignoring the device's saved tab. An explicit URL hash
  (e.g. `#rules`) still wins.
- Users can leave and return freely. Step state is derived or stored in the campaign, never in the page.
- **Begin War Round 1** starts the round, removes the Setup tab and switches to the War Room.
- Being on `#setup` when the tab no longer exists lands on the War Room.
- **Reset campaign** (owner, Players tab, as today) returns to round 0, Setup returns and the app switches to it.
  Reset keeps players, wipes rosters, ready ticks and the old chart, as today.

**Steps and what Done means**
1. **Briefing.** Informational. No marker, nothing stored.
2. **Players.** Every player with editable warband name and faction, Add player and Remove (existing
   controls and actions reused). Done when there are 2+ players and none still carries a shipped example name
   (ending "(example)"). Example players are tagged "Example".
3. **Chart the Reach.** Done when the chart matches the current player list: every player has a Capital
   and the world count equals the charting rule (max(3, players + 1)). Uses the existing "Chart a new Reach
   for N players" action, no confirmation needed at round 0. Adding a player already grafts a world and
   Capital; removing one leaves a spare world, so the step reads "Out of date" until re-charted.
4. **Starting positions.** One block per player with colour dot and name. Done when every player's Ready
   tick is set; partial reads "2 of 4 ready".
5. **Begin.** Disabled with a plain reason until 2+ players and the chart matches; those are the only hard
   gates. Advisory warnings above the button, never blocking: not-ready players and example names. Any
   member may begin.

**Per-player checklist (step 4).** Three rows tick themselves (derived, not stored); Ready is manual and stored.

| Row | Auto-ticks when | Shown |
|---|---|---|
| Warlord | roster has a unit marked Warlord | Warlord's name, or "No Warlord yet" |
| 750 pt roster | roster has at least one unit and total points do not exceed supply | "620 / 750 pts" |
| 5 RP | player has 5 or more RP | "5 RP" |
| Capital | player has a Capital on the current chart | Capital and world name, or "Chart the Reach first (step 3)" |

- Under the roster row, unmet Force Organisation minimums show with the existing wording ("Needs 1 more
  Battleline"). Guidance only; doesn't affect the tick.
- Ready is independent of the auto-ticks. Each block links to the Roster tab ("Build roster").
- Ready ticks clear only on Reset, on removing that player, or when War Round 1 begins.

**What stays elsewhere**
- **War Room before round 1:** the old Setup card (Chart and Begin buttons) is removed. One card: "Campaign
  setup is under way" with "Go to Setup". Log stays. After round 1, "Begin War Round N" is unchanged.
- **Players tab before round 1:** Add player and Remove hidden, with a pointer line to Setup. Everything else
  stays (name, faction, stats, supply, hand, Reset). After round 1, exactly as today.
- **Pitch tab:** wording unchanged. At round 0 only, a one-line pointer at the top.
- **Rules and Turn Guide:** unchanged.

**Briefing copy** (condensed from the Pitch)
1. **The setting.** The Hollowgate rift tore open three years ago and the Reach is a scatter of worlds, each
   split into provinces. More players, more worlds.
2. **Your start.** A 750 pt roster led by one Warlord, 5 Requisition Points, and a Capital province on an
   outer world. No Epic Heroes or named characters.
3. **The War Round.** Everyone draws a Fate Card, then each player takes one turn, smallest empire first.
4. **Your turn.** Pick one action: Conquer, Raid, Recuperate, Muster, Fortify or Scout. Conquer and Raid start
   a battle.
5. **Winning.** Once 60% of the Reach is claimed (or by War Round 8) the Hollowgate opens. Hold it at the end
   of a War Round to win.

Then three links: "Read the full Pitch", "Rules", "Turn Guide". (Check each point against the Pitch and
rules text; the Pitch wins where they differ.)

**Persistence:** one new piece of campaign state, which players are Ready. Missing on old saves = nobody
ready. Set by a new small action, round 0 only, no log entry. Everything else derived.

**Permissions** (UI only, per CLAUDE.md): a player edits their own name/faction; the owner edits anyone
and adds/removes players. Ready: that player or the owner. Chart: owner only (others see "Waiting for the
owner to chart the Reach."). Begin: any member. Disabled buttons show a short reason.

**Stage 4 layout:** each player's step 2 row and step 4 block are self-contained so an invitee can later be
shown only their own. Steps 1, 3 and 5 are the owner's view.

## Acceptance criteria (check by hand at ~400px)
1. A new or reset campaign opens on a Setup tab, first in the bar; step cards 1–5 stack with no sideways scroll.
2. Reload at round 0 opens Setup even if another tab was last used. `/#rules` opens Rules.
3. The tab bar stays; other tabs work mid-setup and Setup returns with progress intact.
4. Steps 2–5 show Done or To do; the first unfinished step is marked Next. The briefing has no marker.
5. The briefing shows five points and three working links (Pitch, Rules, Turn Guide).
6. Step 2: edit name and faction, add a player, remove one (existing two-step confirm). Examples are tagged
   "Example". Not Done while an "(example)" name remains or there are fewer than 2 players.
7. Step 3 reads "Out of date" with "Chart a new Reach for N players" after a player is removed, and Done once
   charted. Charting needs no confirmation and never touches ready ticks.
8. Step 4 shows one block per player with the four rows, a "Build roster" link and a Ready tickbox.
9. Adding a Warlord on the Roster tab ticks the Warlord row on return, no refresh. Likewise the roster row
   ("X / supply pts") and the Capital row.
10. An over-supply roster does not tick the roster row. An unmet Force Organisation minimum shows its warning
    under the roster row and blocks nothing.
11. Ready can be ticked with unticked rows. Ticks survive re-charting and tab switches, and clear on Reset, on
    removing that player and when round 1 begins.
12. Begin is disabled with a reason with fewer than 2 players or an out-of-date chart; otherwise enabled even
    with unready players or example names.
13. The Begin card lists not-ready players and example names when true, neither when false.
14. Begin starts War Round 1, the Setup tab disappears and the War Room shows the round started.
15. Before round 1 the War Room has no Chart or Begin buttons, only the setup card with a working
    "Go to Setup". The log still shows.
16. Before round 1 the Players tab has no Add/Remove and shows the pointer. After round 1 they return and a
    late joiner gets the existing catch-up bonus with no setup.
17. Reset returns to round 0, switches to Setup, clears ready ticks and rosters, keeps players.
18. Pitch wording is unchanged; at round 0 only it shows the pointer line. "Copy pitch" output is unchanged.
19. An old save at round 0 opens on Setup with nobody ready and no errors. An old save past round 0 shows no
    Setup tab.
20. With 6+ players the page scrolls without layout breakage; all targets are tappable.

## New copy
- Tab: "Setup". Steps: "1 · Briefing", "2 · Players", "3 · Chart the Reach", "4 · Starting positions",
  "5 · Begin". Markers: "Done", "To do", "Next".
- Step 2 hint: "Name each warband and pick a faction. Rename or remove the example players."
- Step 3 out of date: "The Reach does not match your players. Chart a new Reach so everyone has a Capital."
- Step 3 non-owner: "Waiting for the owner to chart the Reach."
- Step 4 hint: "Each warband needs a Warlord, a 750 pt roster, 5 RP and a Capital. Build rosters on the Roster tab."
- Capital row before charting: "Chart the Reach first (step 3)".
- Begin disabled: "You need at least 2 players." / "Chart the Reach for the current players first."
- Begin warnings: "N players are not ready: …" / "Still using example names: …", then "You can still begin.
  This is a reminder, not a rule."
- War Room card: "Campaign setup is under way. Finish it on the Setup tab to start War Round 1."
- Pitch pointer: "Ready to start? Go to Setup."
- Players pointer: "Setting up? Use the Setup tab to add players and begin."

## Edge cases
- Verify the "chart matches" test against what `addPlayer`/`removePlayer` actually do.
- Removing a player drops their Ready tick (roster already removed today).
- Re-charting moves Capitals (Capital rows can change); Ready ticks untouched.
- Example detection is by the "(example)" suffix.
- Owner RP +/- at round 0 changes the RP row.
- Empty roster: Warlord and roster rows untick; Begin still allowed.
- Reuse name-commit-on-blur so switching tabs never loses an edit.
- Zero/one player: Begin stays disabled.

## Out of scope
Accounts, invites, anything stage 4. A Next/Back wizard or locking users into setup. Blocking Begin for
unready players, example names, missing Warlord or bad rosters. Auto-building rosters. Editing rosters inside
Setup. Rewording Pitch, Rules or Turn Guide beyond the pointers. Setup-complete screen, notifications, log
entries for ticks. Setup for late joiners. Moving Reset into Setup. Changes to charting, supply, RP or Capitals.
