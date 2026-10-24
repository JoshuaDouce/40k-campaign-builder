# Feature: Simultaneous Turns (Plan, Reveal, Resolve)

> Scoped 2026-10-24 by the product-owner agent, checked against the War Round engine. Owner decisions: replaces sequential picking in every round (no toggle); picks include the target; picks are hidden by honour system only; changeable until the owner reveals; only the owner reveals, once everyone has locked in; resolution order is fixed at round start; one weakest-first order for every action, quiet ones included; an illegal pick falls through to a re-pick in its slot; two players may pick the same province. Sits alongside [battle-undo-history.md](battle-undo-history.md) and [late-joiner-catch-up.md](late-joiner-catch-up.md).

Nobody sits waiting for their turn to choose. Each War Round now has three steps: everyone secretly plans, the owner reveals, then the campaign resolves picks one at a time.

## Description
When a War Round begins, as today (RP collected, cards drawn, turn order set: fewest provinces first, ties random), every player picks their campaign action on their own phone at the same time. For Conquer and Raid that means the province, plus the garrison player if the province is unclaimed. For Fortify it means the province. Nobody else sees a pick; everyone sees only who has locked in. A player can unlock and change their pick until the owner reveals. When every player has locked in, the owner taps Reveal. All picks appear at once as one list in resolution order. The campaign then resolves them one at a time, weakest first, each with today's steps: roll twists, play the battle, record the result, or apply the quiet action. Defenders make no choice and are told who is attacking them.

## Behaviour (decided)

**Round flow**
1. **Begin War Round (unchanged):** any member can begin. RP, card draws and turn order are set exactly as today. The round enters **Planning**.
2. **Planning:** every player in the turn order picks and locks in at the same time.
3. **Reveal:** owner only, only when every present player in the order has locked in. This starts **Resolution**.
4. **Resolution:** picks resolve one at a time in the turn order fixed at round start. When the last slot is done, the round ends as today (Hollowgate win check included).

**Planning**
- **Pick:** action, plus target where the action has one (Conquer, Raid, Fortify). Scout, Muster and Recuperate have no target.
- **Targets offered:** the same legal targets as today, worked out from the map at planning time. Fortify offers the player's own provinces.
- **Garrison player:** for an unclaimed province, the pick includes who fields the garrison (not the picker).
- **Hidden:** other players' picks are never shown during Planning. Others see only "Locked in" or "Choosing…". Honour system, UI only, like Fate hands.
- **Change of mind:** a locked pick shows "Unlock to change". Unlocking returns the player to "Choosing…". Picks can change any number of times until Reveal.
- **Own pick on own phone:** after locking in, the player sees a one-line summary of their own pick.
- **Same province:** two or more players may pick the same province, with no warning during Planning (that would leak picks).
- **Owner:** can pick, lock in and unlock for any player (absent phone), and presses Reveal.
- **Fate Cards and RP:** unchanged. Nothing is committed in Planning. Cards are played and RP spent at any time as today.
- **Late joiners:** join the next round. They are not in this round's order and never block Reveal.
- **Removed player:** their pick is dropped and their slot skipped. They never block Reveal.

**Reveal**
- One list in resolution order. Each row: number, player, action, target (province and world, plus garrison player if relevant).
- **Shared-target flag:** a province picked by more than one player shows "Also targeted by {Name}" on each row involved.
- After Reveal, picks are final, except through fall-through below. Reveal cannot be undone.
- The list stays visible through Resolution; done rows are marked, the current row is highlighted.

**Resolution**
- **Order:** fixed at round start, never re-sorted.
- **A slot comes up:** the pick is set up as that player's action. For Conquer and Raid the battle is ready to roll twists (the player or owner taps Roll as today, so the table sees it happen). For quiet actions the player or owner confirms it. Same permissions as today.
- **Province changed hands since planning:** the battle goes ahead against whoever holds it now, as long as it is still a legal target for the attacker (today's rules). A garrison pick on a province someone has since claimed becomes a normal battle against the new holder; the chosen garrison player is dropped.
- **Fall-through:** if the pick is no longer legal when its slot comes (the attacker now holds the province, it is out of reach because the attacker lost the province that reached it, Fortify on a province they no longer hold, the chosen garrison player has left, and so on), the app shows "{Player}'s pick fell through: {reason}. Choose again." and that player picks a new action and target then and there, as a normal turn works today.
- **"Change action":** not offered on a revealed pick. A pick that has fallen through uses the normal action picker.
- **Waiting screen:** players not on the clock see the reveal list with "{Name} is up". A defender being attacked sees "{Attacker} attacks you at {Province}".
- **Battle undo:** unchanged. It takes back only the latest result and returns that slot to "battle rolled, not yet resolved". It never un-reveals and never changes anyone's pick.
- **Hollowgate, round end, win state:** unchanged.

**Saves from before this feature:** a campaign that is mid-round when this ships has no picks. Its remaining slots run as today: the player on the clock picks their action in their slot. Any slot without a pick works that way.

## Acceptance criteria (check by hand at ~400px)
1. After Begin War Round, every player sees the action picker at once on their own phone. Nobody waits.
2. Conquer and Raid ask for the province, and the garrison player if it is unclaimed (Conquer only; Raid never offers unclaimed provinces). Fortify asks for one of your provinces. Scout, Muster and Recuperate ask for nothing.
3. Only legal targets are offered, using today's rules.
4. After Lock in, the player sees their own one-line pick. Others see only "Locked in" or "Choosing…".
5. No phone shows another player's action or target before Reveal.
6. Unlock lets the player change their pick. Reveal stays disabled while anyone present is unlocked.
7. Reveal shows only to the owner, is disabled until everyone present has locked in, and shows all picks at once in resolution order.
8. The owner can pick, lock in and unlock for another player.
9. Two players picking the same province both lock in with no warning. After Reveal both rows show "Also targeted by {Name}".
10. Resolution runs one slot at a time in the round-start order, each through today's steps, with results recorded as today.
11. If an earlier win changed who holds a province, the later attacker fights the new holder. If they now hold it themselves, or it is out of reach, the "fell through" message appears and they choose again.
12. A garrison pick on a province claimed earlier in the round becomes a normal battle against the new holder.
13. A Fortify on a province lost earlier in the round falls through. A Fortify in a later slot on a province attacked (but held) earlier applies after that attack.
14. During Resolution a non-active player sees the list, "{Name} is up", and (if attacked) "{Attacker} attacks you at {Province}".
15. Fate Cards and RP spending work as today. Nothing is spent or played by Planning.
16. Undo result still works and neither un-reveals nor alters anyone's pick.
17. A player joining mid-round takes no part this round and does not block Reveal. They plan next round.
18. Removing a player in Planning drops their pick and unblocks Reveal. Removing one in Resolution skips their slot.
19. Round end, Hollowgate and win state behave as today.
20. After a reload the phase, locked-in states and revealed list are the same.
21. A campaign mid-round from before this feature carries on with today's one-at-a-time picking for its remaining slots.
22. The Rules tab and War Room wording describe plan, reveal, resolve (see Text changes). Other text unchanged.
23. All screens work at ~400px with no sideways scroll.

## Text changes (final wording)
- **Planning heading:** "Plan your move"
- **Planning hint:** "Choose your action in secret. Nobody sees it until the owner reveals."
- **Status per player:** "Locked in" / "Choosing…"
- **Buttons:** "Lock in" / "Unlock to change"
- **Own pick line:** "You: {Action} {Province} on {World}" (quiet: "You: {Action}")
- **Waiting on others:** "Waiting for {n} more to lock in."
- **Reveal button (owner):** "Reveal all picks"; disabled note: "Everyone must lock in first."
- **Reveal list heading:** "The orders, weakest first"
- **Shared target tag:** "Also targeted by {Name}"
- **Resolution status:** "{Name} is up"; defender line: "{Attacker} attacks you at {Province}"
- **Fall-through:** "{Player}'s pick fell through: {reason}. Choose again."
- **Rules tab (War Round):** "Each War Round has three steps. Plan: every player secretly chooses an action and target at the same time. Reveal: once everyone has locked in, the owner reveals all picks at once. Resolve: picks play out one at a time, weakest first, as normal. If a pick is no longer possible when its turn comes, that player chooses again."
- **War Room intro:** "Runs the campaign round by round: plan in secret, reveal, then resolve weakest first. Battle results update the map and players automatically. Record XP and scars on your own rosters."
- All other rule, card and twist text: verbatim.

## Edge cases
- Picks live in the shared campaign document, so they are technically readable. Accepted (honour system).
- Many phones lock in at once: each lock-in is its own small change, so the save conflict-retry re-applies it cleanly.
- The owner's "Held by" override during Resolution can also make a pick fall through. Same rule.
- Reveal closes the battle Undo window from the previous round, as any other War Room step does.

## Out of scope
A toggle back to the old flow; timers or auto-lock; server-enforced hidden picks; clash warnings during Planning; re-sorting the order; committing cards or RP in Planning; defender responses; undoing the reveal; changing a revealed pick other than by fall-through; notifications; new AWS resources; automated tests (project decision).
