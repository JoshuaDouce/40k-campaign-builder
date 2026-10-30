# Battle Training and Relics switches

Added 2026-10-30.

Two campaign rules in the owner's Campaign rules panel (Rules tab), both on by default.

- **Battle Training off:** no Battle Training can be bought. The Promotion sheet only offers "Veteran becomes
  Character", and the unit dialog shows no training. Battle Honours are still earned as normal. Training already held
  is hidden and doesn't count toward points until the switch goes back on (see `invisible-when-off.md`).
- **Relics off:** no new relics, and relics already held are hidden and don't count toward points until the switch goes
  back on. The engine refuses `addRelic` while off.
- **Refund (organiser):** each Battle Training on a unit card has a "Refund 1 RP (organiser)" button for the campaign
  owner, with a confirm tap. It removes the training and gives the player back the Promotion's 1 RP (not capped at
  10, since it returns what was spent). It's logged. Available whether the switch is on or off.
- The Rules tab hides the Relics and Battle Training sections, and the Rewards tab their tables, when their switch is off.
