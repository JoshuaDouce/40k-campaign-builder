import { ACTIONS, CHAR_HONOURS, CHAR_SCARS, HONOURS, LIGHT_FORCES_MAX_PTS, LIGHT_FORCES_TWIST, ORBITS, PTYPES, RELICS, SCARS, TWISTS, VTYPES } from "../game/index.ts";

/** A D6/D3 table of named results: honours, scars, relics. */
function RollTable({ die, label, rows }: { die: string; label: string; rows: readonly { n: string; e: string }[] }) {
  return (
    <div className="tbl"><table>
      <thead><tr><th>{die}</th><th>{label}</th><th>Effect</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.n}><td className="n">{i + 1}</td><td>{r.n}</td><td>{r.e}</td></tr>
        ))}
      </tbody>
    </table></div>
  );
}

export function RulesTab() {
  return (
    <section className="tab" id="rules">
      <h2>Rules</h2>
      <p className="dim">Everything the War Room does, written out so you can play it on paper too.</p>

      <h3>The War Round</h3>
      <ol className="steps">
        <li><div><b>Muster</b>Every player draws 1 Fate Card (hand limit 5).</div></li>
        <li><div><b>Income</b>+1 RP for your Capital and each Hive City you hold. Refineries draw extra cards.</div></li>
        <li><div><b>Turn order</b>Fewest provinces goes first. Break ties with a roll-off.</div></li>
        <li><div><b>Each player's turn</b>Choose one campaign action. If it starts a battle, generate it, play it, and apply the outcome before the next player goes.</div></li>
        <li><div><b>End of round</b>If someone holds the Hollowgate, they win the Reach. Otherwise start the next War Round.</div></li>
      </ol>
      <p className="dim">Can't get every game played in one evening? Fine. A War Round can stretch over a couple of weeks. Non-battle turns take a minute and can be done over the group chat.</p>

      <h3>Characters</h3>
      <p>Your warband starts with exactly one Character: your Warlord. More only through Promotion, or by adding them later as your supply limit grows. One Warlord per roster.</p>
      <p>Characters use their own Battle Honour and Battle Scar tables, and can carry up to three relics. Give your Character a title and a few lines of backstory; its battles and kills are kept on its record. Fallen Characters are remembered in the Hall of Heroes.</p>
      <p><b>Force Organisation.</b> Every unit has one role: Character, Battleline, Infantry, Mounted, Vehicle / Monster or Other. A unit fills the slot of its role only, whatever its size or keywords: a Battleline Infantry unit fills Battleline and not Infantry. The one overlap is your Warlord, who is a Character and fills the Character slot. Each warband should field at least 1 Character and 2 Battleline, and no more of each role than its slots allow. Slots grow with your conquests: each Shrine held adds a Character slot, each Fortress a Battleline, each Hive City an Infantry, each Settlement a Mounted, each Forge or Refinery a Vehicle / Monster, and each Spaceport (your Capital counts) an Other, up to +3 per role. Lose the ground and you lose the slot, and any units left over are over limit. This is the Reach's guidance, not a law: your group decides how strictly to hold each other to it. Your supply limit still caps total points. Until War Round 1 begins, the Character row is held at 1: your Warlord. Until War Round 1 begins, no unit may have Toughness 10 or higher, and only one unit other than Battleline may have Toughness 9: the heavy armour comes later. No Epic Heroes, ever: your warband is built from named Characters of your own, not the galaxy's legends.</p>
      <p><b>Which role?</b> Infantry covers foot troops of every kind, Beasts and Swarms included. Jump Pack and other flying infantry are Infantry. Bikes, cavalry and jetbikes are Mounted. Walkers, tanks and big monsters are Vehicle / Monster. Dedicated Transports, Aircraft and Fortifications are Other. Psykers take the role their datasheet gives them, usually Character. Allied units and Agents take whatever role their own datasheet gives them.</p>
      <p><b>Slots hold models, not fixed units.</b> Your roster is the supply of models you can draw on for a battle. A slot can hold a bigger unit than you field in one go: ten Intercessors in one Battleline slot can take the field as two squads of five. When you pick your army for a game, build it from the models on your roster using the normal 40k muster rules (unit sizes, points and how many of each datasheet you may take).</p>

      <h3>Campaign actions</h3>
      <div className="tbl"><table>
        <thead><tr><th>Action</th><th>Battle?</th><th>Effect</th></tr></thead>
        <tbody>
          {ACTIONS.map((a) => (
            <tr key={a.id}><td><b>{a.n}</b></td><td>{a.battle ? "Yes" : "No"}</td><td>{a.d}</td></tr>
          ))}
        </tbody>
      </table></div>

      <h3>The Reach</h3>
      <p>The system is charted for your group: one outer world for each player, plus middle and inner worlds nearer the Hollowgate (at least 4 worlds), each with 5 to 7 provinces. Every player starts with a Capital on an outer world. Inner worlds sit nearest the Hollowgate.</p>

      <p><b>Late arrivals.</b> A player who joins after War Round 1 has begun gets a new outer world and Capital, 1 extra Fate Card, and a supply limit set to the average of the other players' limits (rounded to the nearest 50) minus 150, but never below 750. They join the turn order next round.</p>

      <h3>Where you can attack</h3>
      <ol className="steps">
        <li><div><b>Overland</b>Any province that borders one you hold on the same world.</div></li>
        <li><div><b>Planetfall</b>If you hold a Spaceport or your Capital on a world, you can attack any province on a world linked to it by a warp lane.</div></li>
        <li><div><b>The rift</b>Once the Hollowgate opens, anyone holding a province on an inner world can attack it.</div></li>
        <li><div><b>No foothold</b>A player with no provinces can attack any unclaimed province on an outer world.</div></li>
      </ol>

      <h3>Battle size</h3>
      <p>Province size × the world's orbit. A little outpost stays a small fight all campaign, but a hive city on an inner world is a 2000 pt war.</p>
      <div className="tbl"><table>
        <thead><tr><th>Orbit</th><th>Multiplier</th><th>Twists</th></tr></thead>
        <tbody>
          {Object.entries(ORBITS).map(([k, o]) => (
            <tr key={k}><td><b>{o.name}</b></td><td className="n">×{o.mult}</td><td className="n">{o.twists}</td></tr>
          ))}
          <tr><td><b>The Hollowgate</b></td><td className="n">2000</td><td className="n">2</td></tr>
        </tbody>
      </table></div>
      <p>If either player's supply limit is lower than the battle size, play at the lower number. An attacker with fewer provinces than the defender is the <b>Underdog</b> and gets +10% points.</p>
      <p><b>Garrison battles.</b> Attacking an unclaimed province means fighting its garrison, played by another player (never the attacker). You must fight it. Only your supply limit caps the size, Underdog doesn't apply, and you get +20% points. The garrison is a favour: that player gains no RP, Fate Cards, wins or supply. Light Forces still goes by the base size, before the +20%. If you win and lost under 25% of your army, it's a <b>Decisive win</b>: +1 RP.</p>
      <p>Battles of {LIGHT_FORCES_MAX_PTS} pts or fewer automatically use the <b>Light Forces</b> rule. {TWISTS[LIGHT_FORCES_TWIST].e}</p>

      <h3>Province types</h3>
      <div className="tbl"><table>
        <thead><tr><th>Type</th><th>Base pts</th><th>Holder's bonus</th></tr></thead>
        <tbody>
          {Object.entries(VTYPES).map(([k, t]) => (
            <tr key={k}><td><b>{t.n}</b></td><td className="n">{t.size}</td><td>{t.bonus}</td></tr>
          ))}
        </tbody>
      </table></div>

      <h3>World types</h3>
      <p>Every battle on a world uses its trait, on top of any twists.</p>
      <div className="tbl"><table>
        <thead><tr><th>World</th><th>Trait</th></tr></thead>
        <tbody>
          {Object.entries(PTYPES).map(([k, t]) => (
            <tr key={k}><td><span className="dot" style={{ background: t.c }}></span> <b>{t.n}</b></td><td>{t.trait}</td></tr>
          ))}
        </tbody>
      </table></div>

      <h3>Mission Twists (D12)</h3>
      <div className="tbl"><table>
        <thead><tr><th>D12</th><th>Twist</th><th>Effect</th></tr></thead>
        <tbody>
          {TWISTS.map((c, i) => (
            <tr key={c.t}><td className="n">{i + 1}</td><td>{c.t}</td><td>{c.e}</td></tr>
          ))}
        </tbody>
      </table></div>

      <h3>After each battle</h3>
      <ol className="steps">
        <li><div><b>Award XP</b>+1 to every unit that fought and was not destroyed. +1 per enemy unit it destroyed. +2 to one unit you <i>Marked for Glory</i> before the game.</div></li>
        <li><div><b>Roll for the fallen</b>Every unit destroyed rolls a D6 (Hard to Kill adds 1). On a 1 it gains a Battle Scar; Characters on a 1–2. Roll a D3 on the Battle Scars table. The Warlord never rolls: see Battle Scars.</div></li>
        <li><div><b>Requisition</b>+1 RP to both players, +1 more to the winner. Bank up to 10. (Garrison battles: the attacker only.)</div></li>
        <li><div><b>Supply</b>Both players' supply limits grow by 150 pts. (Garrison battles: the attacker only.)</div></li>
        <li><div><b>Spoils</b>The winner draws 1 Fate Card. A Conquer winner takes the province. A Raid winner steals 1 RP and a random Fate Card.</div></li>
        <li><div><b>Underdog's grit</b>Any player now holding the fewest provinces in the campaign draws 1 Fate Card.</div></li>
      </ol>

      <h3>Ranks</h3>
      <div className="tbl"><table>
        <thead><tr><th>Rank</th><th>XP</th><th>Battle Honours</th></tr></thead>
        <tbody>
          <tr><td>Green</td><td className="n">0</td><td>—</td></tr>
          <tr><td>Blooded</td><td className="n">3</td><td>1</td></tr>
          <tr><td>Veteran</td><td className="n">8</td><td>2</td></tr>
          <tr><td>Elite</td><td className="n">15</td><td>3</td></tr>
          <tr><td>Legend of the Reach</td><td className="n">25</td><td>4, and the unit gets a name in the campaign log</td></tr>
        </tbody>
      </table></div>
      <p>Each Battle Honour adds 10% of the unit's base points to its cost, worked out on the total and rounded to the nearest 5, so veterans take up real space in your list.</p>
      <p>When a unit reaches a new rank, roll or pick 1 Battle Honour for each rank gained, straight after the battle. A unit can't hold the same honour twice: re-roll, or pick another.</p>

      <h3>Battle Honours (roll D6 or pick)</h3>
      <RollTable die="D6" label="Honour" rows={HONOURS} />

      <h3>Battle Scars (roll D3)</h3>
      <RollTable die="D3" label="Scar" rows={SCARS} />
      <p>A unit can't hold the same scar twice: re-roll duplicates. Worn Gear: choose the weapon when the scar is gained and note it on your roster. Scars never change a unit's points.</p>
      <p className="dim">Three scars and the unit is gone: remove it from your roster. That's the cost of a long war. A Character's third scar removes it like any other unit, except the Warlord, which is never removed.</p>
      <p className="dim">Example: Breach Team Seven is destroyed and rolls a 1: a scar. The D3 comes up 2: Crippled. With one scar already, one more and the squad is gone.</p>
      <p className="dim">The Roster tab tracks all of this: XP, ranks, honours, scars, relics, each unit's career record and points, with a post-battle helper for the rolls. Fallen Characters are kept in its Hall of Heroes.</p>

      <h3>Character Battle Honours (roll D6 or pick)</h3>
      <RollTable die="D6" label="Honour" rows={CHAR_HONOURS} />
      <p className="dim">Characters use this table. Other units use the one above. No duplicates across both lists.</p>

      <h3>Character Battle Scars (roll D3)</h3>
      <RollTable die="D3" label="Scar" rows={CHAR_SCARS} />
      <p className="dim">Grievous Wound is the only temporary scar: it counts toward the three-scar limit until it heals, after the next battle the unit fights.</p>
      <p>Your Warlord never rolls for the fallen. If it is destroyed, it automatically takes a Character Battle Scar: roll a D3 on the Character Battle Scars table (re-roll scars it already holds). A Warlord is never removed, and there is no RP penalty. A Warlord that already holds three scars and is destroyed again replaces its oldest scar with the new one. Other Characters still roll for the fallen on a 1–2, and a third scar removes them.</p>

      <h3>Relics (roll D6 or pick)</h3>
      <p>A Character can earn a relic when its player claims a Shrine province, or plays a Fate Card. A Character holds at most three relics, never the same one twice (re-roll or pick another). Each relic adds 10 pts to the Character's cost, after Battle Honours are counted.</p>
      <RollTable die="D6" label="Relic" rows={RELICS} />

      <h3>Spending Requisition</h3>
      <div className="tbl"><table>
        <thead><tr><th>Cost</th><th>Requisition</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td className="n">1 RP</td><td>Reinforcements</td><td>+200 pts to your supply limit.</td></tr>
          <tr><td className="n">1 RP</td><td>Field Surgeon</td><td>Remove one Battle Scar.</td></tr>
          <tr><td className="n">1 RP</td><td>Requisition the Deck</td><td>Draw one Fate Card.</td></tr>
          <tr><td className="n">1 RP</td><td>Promotion</td><td>Give a Character an enhancement, or make a Veteran (8+ XP) unit's sergeant a Character.</td></tr>
          <tr><td className="n">2 RP</td><td>Seasoned Recruits</td><td>Add a new unit that starts at 3 XP (Blooded), with its first Battle Honour.</td></tr>
        </tbody>
      </table></div>
      <p className="dim">Spend RP at any time outside a battle.</p>
    </section>
  );
}
