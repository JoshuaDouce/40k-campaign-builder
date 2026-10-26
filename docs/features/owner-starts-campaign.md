# Only the owner starts the campaign

Added 2026-10-26.

- **War Round 1 is the owner's call.** On the Setup tab, Step 5's "Begin War Round 1" button is disabled for everyone
  but the campaign owner. The note under it reads "Only the campaign owner can begin" (owners see "Only you, the
  campaign owner, can begin"). `canPerform` refuses `beginRound` from non-owners while `state.round === 0`.
- **Later War Rounds are unchanged:** any member can begin War Round 2 onwards from the War Room.
- To try it as a player, use the owner's "View as" picker: the button is disabled.
