# Roadmap — The Varkesh Reach
> Drafted 2026-10-19 by the product-owner agent from CLAUDE.md + the prototype. Edit freely.
> Acceptance criteria are meant to be checked by hand on a phone (~400px wide).

Stage mapping: stage 2 = game engine; stage 3 = ported tabs on local storage;
stage 4 = accounts, campaigns, sync; stage 5 = deploy.

## MVP

### 1. Accounts and display name (stage 4)
Sign up with email and password, verify the email, sign in, sign out, reset a forgotten
password. On first sign-in you set a display name.
- A new email can sign up, enter the emailed code and land on the display-name prompt.
- You cannot reach "My campaigns" until a display name is set.
- Sign out returns to the sign-in screen. Signing back in shows the same campaigns.
- Forgotten password: you get a reset email and can sign in with the new password.
- Edge: the sign-up email can land in spam. Show a "check spam" hint.
- Edge: an empty or very long display name is rejected (sensible limit).

### 2. My campaigns: create, join, copy invite code (stage 4)
- First run (no campaigns): two clear buttons, "Create campaign" and "Join with code". No blank list.
- Create asks for a campaign name, then you add yourself as a player: warband name
  (defaults to your display name, editable) and a faction. Then you land in the campaign.
- "Copy invite code" is on the campaign list and inside the campaign, and confirms the copy.
- Joining with a valid code → pick-your-faction step → into the campaign. A wrong code shows
  a plain error and loses nothing.
- Codes are easy to read aloud (no 0/O/1/I) and not case-sensitive when typed.
- Edge: joining a campaign you are already in just opens it. No second player.
- Edge: a member who joined but hasn't picked a faction is returned to the pick step.
- Edge: a campaign with only the owner is valid. The War Room shows "Waiting for players.
  Share the code." and Begin War Round is disabled until at least 2 players exist.

### 3. Charting the Reach before round 1 (stages 3–4)
- Before round 1, the owner sees "Chart a new Reach". Other members do not.
- Charting gives every current player a Capital on an outer world of their own: one outer world per
  player plus the middle and inner worlds (minimum 4 worlds, **no cap**).
- With many players the system map scales up rather than overlapping worlds, and stays
  readable and tappable on a phone.
- Every player has a distinct colour, however many there are.
- After War Round 1 begins, the button is gone. The owner can still Reset campaign (with confirmation).
- Others see "Waiting for the owner to chart the Reach" before round 1.

### 4. Late joiner expands the Reach (stages 2 and 4)
- Joining after the map is charted adds a **new outer world** to the Reach, with the joiner's
  Capital on it. Existing worlds and holdings are unchanged.
- The new world sits in the widest gap on the outer ring, with warp lanes to its ring
  neighbours and the nearest middle world, so it's reachable like any other.
- A mid-round joiner isn't in the current turn order. The War Room says "Joins at the next War Round".
- The log records the arrival, the new world and the Capital.
- Joining after the Hollowgate opens works the same way. (Adding provinces lowers the
  claimed %, but the Hollowgate never closes once open.)

### 5. The ported tabs (stage 3, shared in stage 4)
- Rule, card and twist wording and the look match the prototype.
- A full War Round can be played: begin, draw, turn order, action, generate battle, result,
  rewards + map update, next player, round end.
- Underdog's grit: after a battle, *any* player now holding the fewest provinces draws 1 Fate Card.
- Campaign log entries are plain text, newest first. "Copy pitch for group chat" works on a phone.
- Players tab shows RP, supply, provinces and stats. Only the owner sees +/- buttons.
- Factions selection and War Room province/defender dropdowns are local to the viewer until
  "Generate battle". The rolled battle is shared.
- The Hollowgate win screen shows for everyone.

### 6. Hidden hands (stages 3–4)
- Your own hand shows card faces. Other players show a count and the hand-limit bar (owner too).
- Raids that steal a random card still work. The thief sees the card, the victim sees the count drop.
- UI-only (honour system). Never claim real secrecy.

### 7. Permissions (stage 2 logic, stages 3–4 UI)
Buttons you can't use are hidden or disabled, with a short reason.
- Any member can begin a War Round.
- Turn, cards, RP: that player or the owner. Battle result: attacker, defender or owner.
- Owner only: map "Held by" override, stat +/-, remove player, reset, chart a new Reach.
- Check with two phones: a non-owner sees no owner-only controls and can't take another's turn.
- Accepted for MVP: if the owner is away and a player doesn't act, the round stalls.

### 8. Live updates and save conflicts (stage 4)
- A result recorded on one phone appears on another within seconds, no reload.
- Two simultaneous saves: both apply, or the second sees "Updated, please try again". No silent overwrite.
- Rolls show only after the save succeeds.
- Small "Saving…" / "Offline" indicator. Offline actions are blocked with a message, not queued.
- On reconnect the page catches up without a manual reload.

### 9. Phone layout (all stages)
- No horizontal scrolling except the tab bar and tables that already scroll in the prototype.
- Buttons and map provinces are comfortably tappable.
- Sign-in, campaign list and join screens match the prototype's look (designed under `design/`).
- The keyboard doesn't hide the invite-code or name field.

## Next up (post-MVP)

Gameplay first: flesh out and test the campaign before the accounts work in Stage 4.

**Campaign and gameplay (no accounts needed)**
- Campaign setup (PR #10)
- "Build roster" opens the chosen player's roster
- Undo a battle result
- Battle history per player
- Install to home screen / offline rules

**Done**
- Catch-up bonus for late joiners
- Unit rosters, with force organisation and character customisation

**Needs user accounts (Stage 4)**
- Sign-up, My campaigns, invite codes, live sync
- Shareable invite link
- Rename, delete or leave a campaign
- Owner transfer
- Campaign archive and rematch
- "It's your turn" notifications

**Only if the group grows beyond friends**
- Real hidden hands
- Server-enforced turns

## Out of scope
Unit rosters/XP (for now), images and uploads, chat, notifications, admin tools, payments,
server-enforced permissions and truly secret hands, automated tests of any kind (until the app grows),
redesigning the rules, tabs or look.

## Open questions (defaults proposed — say if you disagree)
1. **Duplicate factions:** allowed. The prototype already gives the second one a different colour.
2. **Removing a player:** their provinces become unclaimed (as the prototype does) and their
   Capital stays a Capital province, now unclaimed.
3. **Player count:** 2 minimum to begin, no maximum (decided 2026-10-19: the map expands).
4. **Mid-round joiner:** new world + Capital created immediately; they enter the turn order next round.
