# Feature: Private shared campaigns (Stage 4, organiser-only)

> Scoped 2026-10-22, revised the same day after user feedback. A small private group. The
> organiser (the site admin) creates every login and campaign. The rules stay public, and
> campaigns are private and kept in sync live between phones. No rule, card, twist or look changes.

## Description
- **Public:** anyone with the site address can read the public tabs: Pitch, Rules, Turn Guide,
  Fate Deck and Factions. These show general content and no campaign data.
- **Private:**
  - **Signing in:** campaigns need a sign-in. There's no sign-up, email verification or "Forgot
    password". The organiser creates each friend's login by hand with the AWS CLI and gives them a
    temporary password. On first sign-in, the friend chooses their own password.
  - **Campaigns:** only the organiser creates campaigns and decides who is in each one, by adding a
    member's email.
  - **First open:** when a member opens a campaign they're not yet playing in, they name their warband
    and pick a faction. After that, they're a player.
- **Playing:**
  - Every member sees the same campaign live on their own phone.
  - Hands and owner/player permissions follow the signed-in user. These are still UI-enforced and
    honour-system.
  - Saves are version-checked and show "Saving…" or "Offline".

## Decisions (user-confirmed)
1. **Organiser:**
   - The organiser is the user's own email+password account, placed in a Cognito `admins` group by
     CLI. It acts as owner in every campaign.
   - No GitHub login.
   - Letting others create campaigns or invite later means adding them to the group.
2. **No self sign-up:**
   - It's switched off in Cognito. Accounts are created by hand by the organiser with the AWS CLI,
     using a temporary password and a forced change on first sign-in.
   - No email verification step, and no in-app user creation (so no Lambda).
3. **No "Forgot password":** the organiser resets passwords with the CLI.
4. **Organiser-only actions:**
   - Create a campaign.
   - Add or remove member emails.
   - Delete a campaign.
   - Every existing owner-only control.
5. **Factions:** each member picks their own warband name and faction on first opening a campaign.
6. **Public and private tabs:**
   - Public (no sign-in): Pitch, Rules, Turn Guide, Fate Deck and Factions.
   - Private: everything that reads a campaign (Setup, War Room, Map, Roster, Players).
7. **Old campaign:**
   - The old localStorage campaign is dropped, with no import.
   - The app stops reading it, but leaves it on the device.
8. **Cost:**
   - Keep cost near zero:
     - A Cognito user pool (sign-up off).
     - AppSync, plus one on-demand DynamoDB table.
     - No Lambda, SES, custom domain, WAF or backups.
   - **Nothing is created in AWS until the user approves the architect's resource list.**

## Scope: in
- **Public site, signed out:** the five public tabs and a "Sign in" button.
- **Signing in:**
  - Sign in, including the forced new-password step on first sign-in.
  - Sign out.
- **Campaign list:**
  - A member's list shows only the campaigns they belong to.
  - The organiser sees every campaign and a "New campaign" button.
- **Organiser tools:**
  - Create a campaign by naming it.
  - Manage a campaign's member emails.
  - Delete a campaign, after confirming.
- **First open:** a member's first open of a campaign shows pick warband and faction. A mid-campaign
  pick follows the existing late-joiner rules (new outer world, joins next round).
- **Live sync:**
  - Live shared state, saved with a version check.
  - "Saving…" and "Offline" indicators.
  - Conflict handling, and a catch-up on reconnect.
- **Real viewer:** the signed-in user sees their own hand. Owner controls are for the organiser.
- **Organiser guide:** a short `docs/organiser.md` with the CLI commands to:
  - Create a login.
  - Make someone an admin.
  - Reset a password.
  - Delete a login.

## Scope: out
- Sign-up, email verification and forgotten-password self-service.
- Invite links and codes, the join Lambda, and display-name setup.
- In-app user creation.
- Anyone other than the organiser creating or inviting.
- Rename, leave, owner transfer, archive and notifications.
- Importing the old campaign.
- Offline play.
- Real secrecy for hands.
- New rules and automated tests.

## Acceptance criteria (check by hand at ~400px; O = organiser, B = friend, two phones)
**Public**
1. Signed out, the site shows Pitch, Rules, Turn Guide, Fate Deck, Factions and a "Sign in" button. No
   campaign names, players, map or log are visible anywhere.
2. The sign-in screen has no "Create account" and no "Forgot password".

**Accounts**
3. O creates B's login with the CLI command in `docs/organiser.md`. B signs in with the temporary
   password, must choose a new one, and then lands on their campaign list.
4. Sign out returns to the public site. Signing in again shows the same campaigns.

**Campaign list**
5. B sees only the campaigns their email is a member of. With none, it says "You haven't been added to
   a campaign yet."
6. O sees every campaign (name, players, last updated) and a "New campaign" button.
7. Some things are only possible signed in, or only for the organiser:
   - A signed-out visitor can't load campaign data, even by calling the API directly.
   - B can't see campaigns they aren't a member of.
   - Only O can create or delete a campaign, or change members.

   All of this is enforced by the backend.

**Organiser**
8. O names a new campaign and lands in it on the Setup tab, as owner.
9. O adds B's email as a member and can remove it, and the list shows whether each member has picked
   a faction yet. Emails aren't case-sensitive.
10. Removing a member takes away their access. Their warband stays in the campaign unless O also
    uses Remove player.
11. O can delete a campaign after a confirmation that names it. Members with it open see "This
    campaign was deleted."

**First open (member)**
12. **Picking a faction:**
    - B opens a campaign they belong to but aren't playing in.
    - B sees "Join {Campaign}" with a warband name and faction cards.
    - Picking adds B as a player linked to their account.
13. **Late join:** if War Round 1 has started, the existing late-joiner rules apply: a new outer
    world, and B joins the next round.
14. **Organiser's warband:** O can also pick a faction to play, through the same screen. Being
    organiser doesn't make O a player.
15. **Until they pick:**
    - B isn't in the turn order.
    - Others see "{email} is choosing a faction".
    - Begin War Round needs at least 2 players.

**Live sync, permissions, hands**
16. A result, card play or log line on one phone appears on the other within seconds, with no
    reload.
17. Each phone shows card faces for its own hand only. Other hands show a count and the limit bar,
    including O's.
18. B can't take another player's turn, play their cards or spend their RP. B sees no owner-only
    controls.
19. O sees every owner-only control and can act for any player. Any member can begin a War Round.
20. Two presses at the same moment either both apply or show "Updated, please try again". Nothing is
    lost silently.
21. Rolls (battles, card draws) show only after the save succeeds.
22. **Offline:**
    - It shows "Offline", and actions are blocked with a message.
    - On reconnect, the page catches up with no reload.
    - "Saving…" shows during a save.

**Hand-over and layout**
23. A device with an old localStorage campaign shows nothing of it and no errors.
24. Every new screen works at ~400px, with no sideways scroll and comfortable tap targets. The
    keyboard doesn't hide the fields.
25. Every campaign tab looks and behaves as before.

## Screens and copy
1. **Public header:**
   - The tab bar with the five public tabs.
   - A "Sign in" button. Once signed in, it shows the user's email and "Sign out".
2. **Sign in:**
   - The Amplify Authenticator, sign-in only, themed with the prototype tokens.
   - Title: "The Varkesh Reach".
   - The first-sign-in new-password step: "Choose a new password".
3. **Campaigns:**
   - The list of campaigns.
   - Empty state: "You haven't been added to a campaign yet."
   - For the organiser: "New campaign" and an "Organiser" badge.
4. **New campaign:**
   - "Campaign name".
   - Button: "Create campaign".
5. **Members panel (organiser, in the Players tab):**
   - Heading: "Members".
   - An email field and an "Add" button.
   - Each row: the email, with a status of "Playing as {warband}" or "Choosing a faction", and a
     "Remove" button.
   - Hint: "Create their login first (see the organiser guide)."
6. **Join {Campaign}:**
   - "Your warband", then faction cards.
   - Button: "Join campaign".
7. **Campaign header:**
   - "← Campaigns".
   - "Saving…" and "Offline".
   - "Updated, please try again".
8. **Delete:**
   - An "Organiser only" box in the Players tab.
   - Confirm: "Delete {name}? This removes it for every player and can't be undone." with
     "Delete campaign" / "Keep campaign".
   - "This campaign was deleted."

## Edge cases
- **Member email with no login yet:** adding it is allowed. Access starts once their login exists.
- **Removed member reopens the campaign:** they go back to the list and the campaign is gone.
- **Organiser also playing:** handled as a normal member pick.
- **Session expiry:** the app goes back to sign-in, then to the campaign.
- **Conflict:** the save retries or shows the message. A roll for a failed save is never shown.
- **Organiser-only campaign:** valid. Begin War Round is disabled under 2 players.

## For the architect
1. **Members and permissions:**
   - Members can be emails, using an email identity claim on the auth rule (for example
     `allow.ownersDefinedIn("members").identityClaim("email")`). That would avoid looking up user
     ids, and so avoid a Lambda.
   - Members update the whole document (honour-system). Check whether they could also edit
     `members` themselves, and say so.
2. **Organiser rights:** the `admins` group gets full access. The viewer gets `isOwner` from group
   membership.
3. **Who a player is:** players link to the signed-in user's id (`players[].userId`).
4. **Rolls:** rolls show only after a successful save, which changes how dispatch works today.
5. **Signed-out tabs:** the public tabs render with no campaign. Pitch and Factions currently read
   state, so they need a stateless mode.
6. **AWS:** the resource list with costs, and `amplify.yml` backend section, approved by the user
   before anything is created.
7. **Document size:** DynamoDB's 400 KB item limit against a growing log, history and rosters.
