# Feature: Simultaneous Turns (Plan, Ready, Reveal, Resolve in parallel)

> Scoped 2026-10-24, revised 2026-10-25 by the product-owner agent, checked against the War Round engine. The original decisions of 2026-10-24 still stand where not overridden. They are: it replaces sequential picking in every round (no toggle); picks include the target; picks are hidden by honour system only; an illegal pick falls through to a re-pick; two players may pick the same province.
>
> **New decisions, 2026-10-25 (these override the old spec).** The goal is speed: nobody should bottleneck the table. It is not a punishment.
> 1. Locking in is now a **Ready** step. Players pick in secret and mark Ready, and can un-Ready until Reveal. Only the owner reveals, once everyone present is Ready.
> 2. After Reveal, picks **resolve in parallel**, not one at a time. Any pick whose province no other pick shares can be played at once, in any order, at different tables.
> 3. A **clash** is two or more picks on the **same province** only. A player defending in two battles at once is not a clash.
> 4. In a clash, the **weakest goes first** and the others wait. Each then goes ahead against whoever holds the province now.
> 5. **Flex:** a waiting player may switch to another action or target at once, with no penalty.
> 6. The round ends when every slot is resolved.
> 7. Owner confirmations: a switch may only go to a free province (never join a clash); battle figures are fixed when twists are rolled; Undo lasts until anyone else acts; the one campaign in flight moves to the new flow at once.
>
> **Dropped from the 2026-10-24 spec:** the single fixed resolution order and "one slot on the clock at a time". The fixed order now only decides who goes first in a clash. Sits alongside [battle-undo-history.md](battle-undo-history.md) and [late-joiner-catch-up.md](late-joiner-catch-up.md).

Nobody waits for a turn to choose, and nobody waits for a turn to play. Each War Round has four steps. Everyone secretly plans and marks Ready. The owner reveals. Everyone plays their own pick, and only players who picked the same province wait for each other.

## Description
When a War Round begins, as today (RP collected, cards drawn, turn order set: fewest provinces first, ties random), every player picks their campaign action on their own phone at the same time. For Conquer and Raid that means the province, plus the garrison player if the province is unclaimed. For Fortify it means the province. The player then taps **Ready**. Nobody else sees the pick. Everyone sees only who is Ready. A player can un-Ready and change their pick until the owner reveals. When everyone present is Ready, the owner taps Reveal and all picks appear at once.

From then on, each player plays their own pick when they are ready, with the usual steps: roll twists, play the battle, record the result, or confirm a quiet action. A pick that no other pick shares can be played straight away, at any time, at a separate table. If two or more players picked the same province, the weakest goes first and the others wait until that result is recorded. A waiting player can switch to something else instead. The round ends when every pick is done.

## Behaviour (decided)

**Round flow**
1. **Begin War Round (unchanged):** any member can begin. RP, card draws and turn order are set as today. The round enters **Planning**.
2. **Planning:** every player in the order picks and marks Ready at the same time.
3. **Reveal:** owner only, only when every present player in the order is Ready. This starts **Resolution**. It cannot be undone.
4. **Resolution:** picks are played in parallel (see below). When the last slot is done, the round ends as today, with the Hollowgate win check.

**Planning**
- **Pick:** action, plus target where the action has one (Conquer, Raid, Fortify). Scout, Muster and Recuperate have no target.
- **Targets offered:** the same legal targets as today. Fortify offers the player's own provinces.
- **Garrison player:** for an unclaimed province, the pick includes who fields the garrison (not the picker).
- **Ready:** needs a complete pick. A Ready player sees a one-line summary of their own pick and an "Unready to change" button.
- **Hidden:** other players' picks are never shown. Others see only "Ready" or "Choosing…". Honour system, UI only.
- **Same province:** two or more players may pick the same province with no warning during Planning, because a warning would leak picks.
- **Owner:** can pick, mark Ready and un-Ready for any player, and presses Reveal.
- **Fate Cards and RP:** unchanged. Nothing is committed in Planning.
- **Late joiners:** join the next round. They are not in this round's order and never block Reveal.
- **Removed player:** their pick is dropped and they never block Reveal.

**Reveal**
- One list, in round-start order (weakest first). Each row shows: player, action, target (province and world, plus the garrison player if relevant), and a status.
- **Clash tag:** every row in a clash shows "Clash at {Province}: {Name} first". The queue is in priority order.
- The list stays visible all through Resolution.

**Status of each pick (shown to everyone)**
- **Ready to play:** no other unfinished pick shares its province. It can be played now.
- **In battle:** twists are rolled and the result is not yet recorded.
- **Waiting on {Name}:** another unfinished pick on the same province is ahead in the queue. {Name} is the nearest one ahead.
- **Choose again:** the pick fell through (see below).
- **Done:** result recorded or quiet action confirmed. A removed player's slot counts as Done.

**Playing a pick**
- **Who:** the same people as today. The player or the owner rolls twists and confirms quiet actions. The attacker, defender or owner records a battle result.
- **Quiet actions:** Scout, Muster, Recuperate, and Fortify on a province no other unfinished pick shares can be confirmed at once, in any order. Their effects (RP, supply, card draws, the fortified marker) apply when confirmed, as today.
- **Several battles at once:** each battle has its own twists. Twists are rolled when that battle's attacker (or the owner) taps Roll, and use that province's orbit. Re-roll works per battle, as today. Any number of battles can be In battle together.
- **Fixed battle figures:** a battle's points, supply cap and notes (including Underdog and Fortified) are worked out when its twists are rolled. They do not change while it is being played, even if other results land elsewhere. A re-roll works them out again.
- **Defending in two battles:** allowed. It is not a clash. The defender's phone lists every battle they are in. Only the table can decide how to play them in turn.
- **Results:** recorded one at a time, in the order they are tapped. Each uses the state at that moment. That covers province counts, Underdog's grit (every player on the campaign minimum draws 1 card), RP stolen, the capital steal and the log. History and log are in record order.
- **Province changed hands since planning:** only a clash result (or the owner's override) can change who holds a picked province. A clash player who comes up next goes ahead against whoever holds it now, as long as it is still a legal target. An unclaimed-garrison pick on a province claimed since becomes a normal battle against the new holder, and the chosen garrison player is dropped. If a removed player's province is now unclaimed, the attacker chooses the garrison player when they start the battle.

**Clashes**
- **Definition:** two or more unfinished picks (Conquer, Raid, Fortify, or a garrison Conquer) on the same province, the Hollowgate included.
- **Priority:** weakest first. That is the round-start order, which is fewest provinces first with ties as drawn. It is fixed and never re-sorted.
- **Going ahead:** the first pick in the clash can be played at once. The others show "Waiting on {Name}". When the first result is recorded, the next one becomes Ready to play, and so on. Anyone waiting is also freed if the player ahead of them switches away or is removed.
- **Fortify in a clash:** a Fortify on a province another pick attacks is a clash. It is played in its queue position. If the fortifier is first, the attacker meets the Fortified bonus. If the attacker is first and takes the province, the Fortify falls through.
- **A battle in flight is never blocked or displaced.** A pick already In battle keeps its place.

**Flex (switch while waiting)**
- A player whose pick is Waiting, or Choose again, may switch to any other action and target at any time. There is no penalty and no cost. The old pick is gone.
- The new pick must be legal today, and its province must not be tied up. A province is tied up if any other unfinished pick is on it. Tied-up provinces are shown greyed with "In use by another pick". Quiet actions are always available.
- Because a switch can never join a clash, it can never push back someone who is Ready to play. A new pick on a free province is Ready to play at once.
- A pick that is Ready to play or In battle cannot be switched.
- The owner can switch a pick for any player.

**Fall-through**
- A pick that is not yet In battle is checked all the time. If another table's result makes it illegal, it turns to "Choose again" straight away on every phone. This includes the attacker's route being cut by an earlier result, the attacker now holding the province, a Fortify on a province no longer held, or a chosen garrison player who has left.
- The message reads "{Player}'s pick fell through: {reason}. Choose again." That player picks again under the Flex rules.
- A pick that is In battle is not checked for reach. It goes ahead. It is cancelled only if the attacker or defender is removed. The remaining attacker then gets "Choose again".

**Undo**
- Undo takes back the latest recorded result only. It is available only while nothing else has happened in the campaign since: no other player's roll, result, confirm or switch, and no post-battle report. Roster actions leave the window open, as today.
- It puts that slot back to In battle with the same twists. It never un-reveals and never changes any other pick or battle.
- Any other action closes the window. This is shorter than today. It is accepted for now.

**Round end**
- The round ends the moment the last slot is Done. The Hollowgate check, win state and "War Round ends" are as today.

**Removed player and late joiner**
- **Planning:** the removed player's pick is dropped. Reveal is unblocked if they were the only one not Ready.
- **Resolution:** their slot is Done. Their pick is cancelled. If they were first in a clash, the next player in the queue is freed. Battles they were in are cancelled and the other side gets "Choose again".
- **Late joiner:** takes no part this round and never blocks Reveal. They have no slot, so nothing waits on them. They can be named as a garrison player.

**Saves from before this feature (owner decision 2026-10-25: switch over at once).** A campaign that is mid-round when this ships moves to the new flow straight away; there is no old-way finish. On first load:
- Players whose slot in the old order has already passed count as **Done**.
- The player on the clock: if their battle has twists rolled, it becomes their pick, **In battle**. If they had chosen an action but not rolled, the action is dropped and they plan like everyone else.
- Everyone else still to act this round enters **Planning**. When they are all Ready, the owner reveals and Resolution runs as normal.
- A campaign between rounds (no round in progress) is unaffected; its next War Round uses the new flow.

**What each phone shows during Resolution**
- **Own pick front and centre:** the player's own pick, with its status and the one next step (Roll twists, Record result, Confirm, or Choose again). While Waiting, a "Switch to something else" button is also shown.
- **Defending:** below the own pick, one line for each battle where the player is the defender: "{Attacker} attacks you at {Province}", with the status.
- **All picks:** the list of every pick, each with its status (Ready to play / In battle / Waiting on {Name} / Choose again / Done), clash tags included.
- **Everyone done:** a player with nothing left sees "Your move is done" and the list.

## Acceptance criteria (check by hand at ~400px)
1. After Begin War Round, every player sees the action picker at once. Nobody waits.
2. Conquer and Raid ask for the province, and the garrison player if it is unclaimed (Conquer only). Fortify asks for one of your provinces. Scout, Muster and Recuperate ask for nothing. Only legal targets are offered.
3. Ready needs a complete pick. After Ready the player sees their own one-line pick, and others see only "Ready" or "Choosing…".
4. No phone shows another player's action or target before Reveal.
5. Un-Ready lets the player change their pick. Reveal stays disabled while anyone present is not Ready.
6. Reveal shows only to the owner, is disabled until everyone present is Ready, and shows all picks at once.
7. The owner can pick, Ready and un-Ready for another player.
8. Two players picking the same province can both mark Ready with no warning. After Reveal both rows show the clash tag.
9. After Reveal, a player whose province no one else picked can roll twists or confirm at once. No one else needs to have finished.
10. Two unrelated battles can be In battle at the same time, each with its own twists. Both can be recorded in either order.
11. Scout, Muster, Recuperate and an unshared Fortify can be confirmed at once, in any order.
12. Two players on the same province: the weaker shows Ready to play. The other shows "Waiting on {Name}" and cannot roll.
13. After the first result is recorded, the waiting player becomes Ready to play and fights whoever holds the province now.
14. If the first player took the province and the second now holds nothing useful, the "fell through" message appears and the second player chooses again.
15. A Fortify and an attack on the same province are a clash. If the fortifier goes first, the battle shows the Fortified note. If the attacker takes the province first, the Fortify falls through.
16. One player defending two battles at once is allowed. Their phone lists both.
17. A waiting player can switch to a free province or a quiet action. Their old place is gone. The player behind them moves up.
18. A greyed province in the switch list cannot be picked and says "In use by another pick". A Ready-to-play or In-battle pick shows no switch button.
19. Recording a result elsewhere that cuts a not-yet-started attacker's route turns their pick to "Choose again" on all phones. A battle already In battle is not affected.
20. A battle's points and notes do not change after twists are rolled, even when other results are recorded. Re-roll recalculates them.
21. Underdog's grit, RP steals and the capital steal use the counts at the moment each result is recorded. The log and history are in record order.
22. Undo works on the latest result only. It disappears once any other player acts. It never un-reveals or changes other slots.
23. Removing a player in Planning drops their pick and unblocks Reveal. Removing one in Resolution marks their slot Done, frees anyone waiting behind them, and cancels their battles.
24. A player joining mid-round takes no part this round and does not block Reveal.
25. The round ends as soon as the last slot is Done. Hollowgate and win state behave as today.
26. After a reload, the phase, Ready states, picks and statuses are the same.
27. A campaign mid-round from before this feature switches to the new flow on load: players who have acted are Done, a rolled battle stays In battle, and everyone else is in Planning.
28. The Rules tab and War Room wording match Text changes. All other text is unchanged.
29. All screens work at ~400px with no sideways scroll.

## Text changes (final wording)
- **Planning heading:** "Plan your move"
- **Planning hint:** "Choose your action in secret. Nobody sees it until the owner reveals."
- **Status per player (Planning):** "Ready" / "Choosing…"
- **Buttons:** "Ready" / "Unready to change"
- **Own pick line:** "You: {Action} {Province} on {World}" (quiet: "You: {Action}")
- **Waiting on others:** "Waiting for {n} more to be Ready."
- **Reveal button (owner):** "Reveal all picks"; disabled note: "Everyone must be Ready first."
- **Reveal list heading:** "The orders, weakest first"
- **Clash tag:** "Clash at {Province}: {Name} first"
- **Pick statuses:** "Ready to play" / "In battle" / "Waiting on {Name}" / "Choose again" / "Done"
- **Defender line:** "{Attacker} attacks you at {Province}"
- **Switch button:** "Switch to something else"
- **Tied-up target note:** "In use by another pick"
- **Fall-through:** "{Player}'s pick fell through: {reason}. Choose again."
- **All done (player):** "Your move is done."
- **Rules tab (War Round):** "Each War Round has four steps. Plan: every player secretly chooses an action and target at the same time, then marks Ready. Reveal: once everyone is Ready, the owner reveals all picks at once. Play: everyone plays their own pick at the same time. If two players picked the same province, the weaker goes first and the other waits, or switches to something else. Round end: when every pick is done. If a pick is no longer possible when its turn comes, that player chooses again."
- **War Room intro:** "Runs the campaign round by round: plan in secret, reveal, then play your picks side by side. Battle results update the map and players automatically. Record XP and scars on your own rosters."
- All other rule, card and twist text: verbatim.

## Edge cases
- Picks live in the shared campaign document, so they are technically readable. Accepted (honour system).
- Many phones act at once: each tap is its own small change, and the save conflict-retry re-applies it on the latest state. This matters more now, because several battles are changing the map at the same moment. The architect should check that two results recorded at the same instant both land.
- Two results recorded close together can each trigger Underdog's grit for the same player. That is the same as it would be one after the other.
- The owner's "Held by" override during Resolution can make a pick fall through, or change a clash province's holder. Same rules apply.
- A clash first-player who is slow or has left the table blocks the others. The owner can act for them, and the waiting players can switch away. There is no skip button.
- A player who is the attacker at one table and the defender at another cannot be in two places. This is a table matter, not an app rule.
- Scout swaps and the Scout flag belong to the player's own next battle, so they are unaffected.
- A battle ends the Undo window of the previous round's result, as any other War Room step does.
- The Hollowgate can open in the middle of Resolution if results push claims past 60%. Picks already made are unaffected, and later re-picks may offer it.
- Round-0 setup also uses a "Ready" idea. The two should not be confused.

## Out of scope
A toggle back to the old flow; timers or auto-lock; server-enforced hidden picks; clash warnings in Planning; live re-sorting of clash priority; "joining the queue" when switching; a skip or force-resolve for slow players; undoing more than the latest result; undoing the reveal; changing a revealed pick other than by Flex or fall-through; committing cards or RP in Planning; defender responses; notifications; the strategic-depth ideas parked by the owner; new AWS resources; automated tests (project decision).
