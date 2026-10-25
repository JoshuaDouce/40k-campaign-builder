# Confirm RP spends

Added 2026-10-25.

On My Warband, the one-tap RP spends (Reinforcements, Requisition the Deck, Extra Datasheet) now open a small
confirm sheet first: what it does, what it costs, and the RP left after. **Spend N RP** goes ahead; Cancel, Escape or
a tap outside backs out. Field Surgeon, Promotion and Seasoned Recruits already had their own sheets with a Spend
button, so they are unchanged.

Frontend only: `ConfirmSpendDialog` and `QuickSpend` in `src/components/roster/RpDialogs.tsx`, opened from the
rp-row in `RosterTab.tsx`.
