# View as a player (organiser)

Added 2026-10-25.

The organiser gets a **View as** picker under the account bar in a campaign: "Organiser (you)" or any player. Picking
a player shows every tab as that player sees it: their Fate hand (and no one else's), My Warband opened on them,
their War Room picks, and no owner-only buttons. It is a development and table-side convenience.

- Frontend only: `ViewAsProvider` (`src/components/account/ViewAs.tsx`) wraps the campaign and swaps the store's
  `viewer` for `{ userId, email, isOwner: false }` of the picked player. Switching remounts the tabs so pickers and
  drafts reset. The choice isn't saved: a reload goes back to the organiser view.
- Saves still go through as the organiser, so anything done in a player's view is done for that player.
- A player with no linked account (no `userId`) shows as a viewer with no hand visible.
