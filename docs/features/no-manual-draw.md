# No manual Fate Card draws

Added 2026-10-25.

The Players tab no longer has a **Draw card** button. Fate Cards come only from the rules: the start of each
War Round (plus Refineries), a victory, Underdog's grit, Muster, Scout and the late-arrival bonus.

**Requisition the Deck** (1 RP: draw one Fate Card) is now a button with the other RP spends on the Roster tab.
It takes the RP and draws the card in one step, and is disabled when the hand is full or the player has no RP.
The action is `requisitionDeck { playerId }`; the old `drawCard` action is gone. Same permissions: that player or
the owner.
