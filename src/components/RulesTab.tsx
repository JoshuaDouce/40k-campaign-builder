import { ACTIONS, LIGHT_FORCES_MAX_PTS, LIGHT_FORCES_TWIST, ORBITS, PTYPES, TWISTS, VTYPES } from "../game/index.ts";

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
      <p>The system is charted for your group: one more world than players (at least 3 worlds), each with 5 to 7 provinces. Every player starts with a Capital on an outer world. Inner worlds sit nearest the Hollowgate.</p>

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
        <li><div><b>Roll for the fallen</b>Every unit destroyed rolls a D6. On a 1 it gains a Battle Scar. Characters roll on a 1–2.</div></li>
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
      <p>Each Battle Honour adds 10% of the unit's points (round to nearest 5) to its cost, so veterans take up real space in your list.</p>

      <h3>Battle Honours (roll D6 or pick)</h3>
      <div className="tbl"><table>
        <thead><tr><th>D6</th><th>Honour</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td className="n">1</td><td>Steady Aim</td><td>Re-roll hit rolls of 1 with ranged attacks.</td></tr>
          <tr><td className="n">2</td><td>Brawlers</td><td>Re-roll wound rolls of 1 in melee.</td></tr>
          <tr><td className="n">3</td><td>Grizzled</td><td>+1 to Battle-shock and Leadership tests.</td></tr>
          <tr><td className="n">4</td><td>Fleet</td><td>+1" to Move.</td></tr>
          <tr><td className="n">5</td><td>Hard to Kill</td><td>+1 to its roll for the fallen after battle.</td></tr>
          <tr><td className="n">6</td><td>Objective Hunters</td><td>+1 OC.</td></tr>
        </tbody>
      </table></div>

      <h3>Battle Scars (roll D3)</h3>
      <div className="tbl"><table>
        <thead><tr><th>D3</th><th>Scar</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td className="n">1</td><td>Shaken</td><td>−1 to Battle-shock tests.</td></tr>
          <tr><td className="n">2</td><td>Crippled</td><td>−1" Move, cannot Advance and charge.</td></tr>
          <tr><td className="n">3</td><td>Worn Gear</td><td>Worsen BS or WS of one weapon by 1.</td></tr>
        </tbody>
      </table></div>
      <p className="dim">Three scars and the unit is gone: remove it from your roster. That's the cost of a long war.</p>

      <h3>Spending Requisition</h3>
      <div className="tbl"><table>
        <thead><tr><th>Cost</th><th>Requisition</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td className="n">1 RP</td><td>Reinforcements</td><td>+200 pts to your supply limit.</td></tr>
          <tr><td className="n">1 RP</td><td>Field Surgeon</td><td>Remove one Battle Scar.</td></tr>
          <tr><td className="n">1 RP</td><td>Requisition the Deck</td><td>Draw one Fate Card.</td></tr>
          <tr><td className="n">1 RP</td><td>Promotion</td><td>Give a Character an enhancement, or make a Veteran unit's sergeant a Character.</td></tr>
          <tr><td className="n">2 RP</td><td>Seasoned Recruits</td><td>Add a new unit that starts at 3 XP (Blooded).</td></tr>
        </tbody>
      </table></div>
      <p className="dim">Spend RP at any time outside a battle.</p>
    </section>
  );
}
