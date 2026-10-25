# Slower RP and Fate Cards; Battleline shares Non-Monster / Vehicle slots

Added 2026-10-25.

## RP and Fate Cards
- **Battle RP goes to the winner only:** +1 RP. Losing or drawing earns nothing (it used to give both sides +1,
  plus +1 more to the winner). Capital and Hive income, Capital sacking, Raid steals, the garrison Decisive win
  and Recuperate are unchanged.
- **No free card at the start of a War Round.** Each Refinery held still draws 1. Victory, Underdog's grit,
  Muster, Scout and Requisition the Deck are unchanged.
- No migration is needed: banked RP and hands stay as they are.

## Force Organisation
- Battleline has no slots of its own. Battleline units fill **Non-Monster / Vehicle** slots: 6 base, +1 per
  Fortress, Hive City or Settlement held, up to +6.
- The Battleline row stays in the chart with its **minimum of 2** (the warning and the Setup checklist still
  use it) and reads "Fills Non-Monster / Vehicle slots".
- In the game module, `RoleDef.slotsIn` marks a role with no slots of its own, `RoleDef.cap` overrides
  `HOLDING_CAP`, and `slotRole(role)` gives the role whose slots a unit fills. `ForceOrgRow` now carries
  `short`, `over` and `cap`. Units over the shared limit are flagged in roster order across both roles.
