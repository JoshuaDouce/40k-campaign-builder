# Battle Training and Relics switches

Added 2026-10-30.

Two campaign rules in the owner's Campaign rules panel (Rules tab), both on by default.

- **Battle Training off:** no Battle Training can be bought. The Promotion sheet only offers "Veteran becomes
  Character", and the unit dialog says training is off. Battle Honours are still earned as normal. Training already
  held stays and still adds +10 pts.
- **Relics off:** no new relics. The "Roll a relic" bar is hidden on unit cards; held relics stay (and can still be
  removed by their player). The engine refuses `addRelic` while off.
- **Refund (organiser):** each Battle Training on a unit card has a "Refund 1 RP (organiser)" button for the campaign
  owner, with a confirm tap. It removes the training and gives the player back the Promotion's 1 RP (not capped at
  10, since it returns what was spent). It's logged. Available whether the switch is on or off.
- The Rules tab and Rewards tab hide or reword the Relics and Battle Training rules when their switch is off.
