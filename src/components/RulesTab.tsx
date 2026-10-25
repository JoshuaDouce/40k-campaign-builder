import { ACTIONS, CHAR_HONOURS, CHAR_SCARS, HONOURS, LIGHT_FORCES_MAX_PTS, LIGHT_FORCES_TWIST, ORBITS, PTYPES, RELICS, SCARS, TRAINING, toggleOn, TOGGLE_KEYS, TOGGLE_NAMES, TWISTS, typeGains, VTYPES } from "../game/index.ts";
import type { ProvinceType, ToggleKey } from "../game/index.ts";
import { useOptionalCampaign } from "../store/useCampaign.ts";

const TOGGLE_DESC: Record<ToggleKey, string> = {
  forceOrg: "Role slots, minimums and over-limit warnings. Can't be on with the Datasheet limit.",
  datasheetLimit: "5 datasheets, +1 for each Extra Datasheet bought with RP. Replaces Force Organisation slots.",
  toughnessStages: "No unit above T11 in War Rounds 1–2, until supply reaches 1250.",
  knights: "Armigers and War Dogs count as Battleline; one may be the Setup Warlord.",
};

/** The four owner-switched campaign rules. Everyone sees the state; only the owner gets the switches. */
function CampaignRules() {
  const campaign = useOptionalCampaign();
  if (!campaign) return null;
  const { state, viewer, dispatch } = campaign;
  return (
    <div className="rt-panel">
      <h3>Campaign rules</h3>
      <p className="rt-who">{viewer.isOwner ? "You are the owner: switch rules at any time" : "Only the campaign owner can change these"}</p>
      {TOGGLE_KEYS.map((k) => {
        const on = toggleOn(state, k);
        return (
          <div className="rt-row" key={k}>
            <div className="rt-name">
              {TOGGLE_NAMES[k]}
              <span className={`badge ${on ? "rt-on" : "rt-off"}`}>{on ? "On" : "Off"}</span>
            </div>
            <p className="rt-desc">{TOGGLE_DESC[k]}</p>
            {viewer.isOwner && <button type="button" className="rt-sw" aria-pressed={on} aria-label={TOGGLE_NAMES[k]} onClick={() => dispatch({ type: "setToggle", key: k, on: !on })} />}
          </div>
        );
      })}
    </div>
  );
}

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
  const campaign = useOptionalCampaign();
  const toggled = campaign ? (k: ToggleKey) => toggleOn(campaign.state, k) : (k: ToggleKey) => toggleOn({}, k);
  const slots = toggled("forceOrg");
  return (
    <section className="tab" id="rules">
      <h2>Rules</h2>
      <p className="dim">Everything the War Room does, written out so you can play it on paper too.</p>

      <CampaignRules />

      <h3>The War Round</h3>
      <ol className="steps">
        <li><div><b>Income</b>+1 RP for your Capital and each Hive City you hold. Draw 1 Fate Card for each Refinery you hold (hand limit 5).</div></li>
      </ol>
      <p>Each War Round has four steps. Plan: every player secretly chooses an action and target at the same time, then marks Ready. Reveal: once everyone is Ready, the owner reveals all picks at once. Play: everyone plays their own pick at the same time. If two players picked the same province, the weaker goes first and the other waits, or switches to something else. Round end: when every pick is done. If a pick is no longer possible when its turn comes, that player chooses again.</p>
      <p>If someone holds the Hollowgate when the round ends, they win the Reach. Otherwise start the next War Round. The weakest is whoever holds the fewest provinces; break ties with a roll-off.</p>
      <p className="dim">Can't get every game played in one evening? Fine. A War Round can stretch over a couple of weeks. Non-battle turns take a minute and can be done over the group chat.</p>

      <h3>Characters</h3>
      <p>Your warband starts with exactly one Character: your Warlord. More only through Promotion, or by adding them later as your supply limit grows. One Warlord per roster.</p>
      <p>Characters use their own Battle Honour and Battle Scar tables, and can carry up to three relics. Give your Character a title and a few lines of backstory; its battles and kills are kept on its record. Fallen Characters are remembered in the Hall of Heroes.</p>
      <p><b>Setup limits.</b> Until War Round 1 begins, your warband has exactly one Character: your Warlord. No unit may have Toughness 10 or higher, and only one unit other than Battleline may have Toughness 9: the heavy armour comes later. No Epic Heroes, ever: your warband is built from named Characters of your own, not the galaxy's legends.</p>
      {slots ? (
        <p><b>Force Organisation.</b> Every unit has one role: Character, Battleline, Non-Monster / Vehicle (anything that is not a Monster or Vehicle: Infantry, Mounted, Beasts and Swarms), Vehicle / Monster (Aircraft included) or Other (Dedicated Transports and Fortifications). A unit fills one slot, whatever its size or keywords. Battleline has no slots of its own: Battleline units fill Non-Monster / Vehicle slots. A Character always fills a Character slot, even a Monster or Vehicle. Your Warlord is a Character and fills the Character slot. Each warband should field at least 1 Character and 2 Battleline, and no more of each role than its slots allow. Every warband starts with 1 Character, 6 Non-Monster / Vehicle (shared with Battleline), 1 Vehicle / Monster and 2 Other slots. Slots grow with your conquests: each Shrine held adds a Character slot, each Fortress, Hive City or Settlement a Non-Monster / Vehicle, each Forge or Refinery a Vehicle / Monster, and each Spaceport an Other, up to +3 per role (+6 for Non-Monster / Vehicle). Lose the ground and you lose the slot, and any units left over are over limit. This is the Reach's guidance, not a law: your group decides how strictly to hold each other to it. Your supply limit still caps total points. Until War Round 1 begins, the Character row is held at 1: your Warlord.</p>
      ) : (
        <p><b>Roles.</b> Every unit can be given a role: Character, Battleline, Non-Monster / Vehicle (anything that is not a Monster or Vehicle: Infantry, Mounted, Beasts and Swarms), Vehicle / Monster (Aircraft included) or Other (Dedicated Transports and Fortifications). This campaign does not use slots, so there are no limits or minimums. Roles still matter for the Battleline exception to the Toughness 9 limit and for the Knights exemption.</p>
      )}
      <p><b>Which role?</b> Picking a datasheet from the list fills in its role from the datasheet's keywords, in this order: Character, then Battleline, then Dedicated Transport or Fortification (Other), then Vehicle, Monster or Aircraft (Vehicle / Monster), and everything else is Non-Monster / Vehicle. Non-Monster / Vehicle covers foot troops of every kind, Beasts, Swarms, Jump Pack infantry, bikes, cavalry and jetbikes. Walkers, tanks, big monsters and Aircraft are Vehicle / Monster. Dedicated Transports and Fortifications are Other. Psykers take the role their datasheet gives them, usually Character. Allied units and Agents take whatever role their own datasheet gives them.</p>
      {toggled("datasheetLimit") && (
        <p><b>Datasheet limit.</b> This rule replaces Force Organisation slots: switching it on turns slots off. A roster may use at most 5 different datasheets. Several units of the same datasheet count once, and so does your Warlord's. A unit with no datasheet named isn't counted. The limit does not grow on its own: spend 1 RP on an Extra Datasheet for +1 to your limit for the rest of the campaign, as many times as you like. At the limit, you can't add a unit of a new datasheet until you buy one.</p>
      )}
      {toggled("toughnessStages") && (
        <p><b>Toughness stages.</b> In War Rounds 1 and 2, no unit may have Toughness 12 or higher. From War Round 3, or as soon as your supply limit reaches 1250 pts, the cap is gone. The Setup limits still apply first.</p>
      )}
      {toggled("knights") && (
        <p><b>Knights.</b> For Imperial Knights and Chaos Knights players: Armigers and War Dogs count as Battleline, so the one Toughness 9 limit doesn't apply to them. In Setup, your Warlord may be an Armiger or War Dog instead of a Character. It carries the Warlord trait, but no title, backstory, enhancement or relics. From War Round 1 the normal rules apply, and you may make a Character your Warlord.</p>
      )}
      <p><b>Slots hold models, not fixed units.</b> Your roster is the supply of models you can draw on for a battle. A slot can hold a bigger unit than you field in one go: ten Intercessors in one Battleline {slots ? "slot" : "unit"} can take the field as two squads of five. When you pick your army for a game, build it from the models on your roster using the normal 40k muster rules (unit sizes, points and how many of each datasheet you may take).</p>

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
      <p>The system is charted for your group: one outer world for each player, plus middle and inner worlds nearer the Hollowgate (at least 4 worlds), each with 5 to 7 provinces. Every player starts with a Capital on an outer world, bordered by a 500, a 750 and a 1000 pt battle. Inner worlds sit nearest the Hollowgate.</p>

      <p><b>Late arrivals.</b> A player who joins after War Round 1 has begun gets a new outer world and Capital, 1 extra Fate Card, and a supply limit set to the average of the other players' limits (rounded to the nearest 50) minus 150, but never below 750. They join the turn order next round.</p>

      <h3>Where you can attack</h3>
      <ol className="steps">
        <li><div><b>Overland</b>Any province that borders one you hold on the same world.</div></li>
        <li><div><b>Planetfall</b>If you hold a Spaceport on a world, you can attack any province on a world linked to it by a warp lane.</div></li>
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
      <p><b>Garrison battles.</b> Attacking an unclaimed province means fighting its garrison, played by another player (never the attacker). You must fight it. Only your supply limit caps the size, Underdog doesn't apply, and you choose your edge: +20% points for you, or -20% points for the garrison. The garrison is a favour: that player gains no RP, Fate Cards, wins or supply. Light Forces and Fate Cards still go by the base size, before the 20%. If you win and lost under 25% of your army, it's a <b>Decisive win</b>: +1 RP.</p>
      <p>Battles of {LIGHT_FORCES_MAX_PTS} pts or fewer automatically use the <b>Light Forces</b> rule. {TWISTS[LIGHT_FORCES_TWIST].e}</p>

      <h3>Province types</h3>
      <div className="tbl"><table>
        <thead><tr><th>Type</th><th>Base pts</th><th>Holder's bonus</th></tr></thead>
        <tbody>
          {Object.entries(VTYPES).map(([k, t]) => (
            <tr key={k}><td><b>{t.n}</b></td><td className="n">{t.size}</td><td>{typeGains(k as ProvinceType, slots)}</td></tr>
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
        <li><div><b>Requisition</b>+1 RP to the winner. Nothing for a loss or a draw. Bank up to 10. (Garrison battles: the garrison player never gains RP.)</div></li>
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
      <p className="dim">The My Warband tab tracks all of this: XP, ranks, honours, scars, relics, each unit's career record and points, with a post-battle helper for the rolls. Fallen Characters are kept in its Hall of Heroes.</p>

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

      <h3>Battle Training (roll D12 or pick)</h3>
      <p>Spend 1 RP on a Promotion to give a Character Battle Training. It is not a detachment Enhancement; those are still chosen and paid for in points when you muster. A Character can hold up to three, never the same one twice (re-roll or pick another), and each adds 10 pts to its cost.</p>
      <RollTable die="D12" label="Training" rows={TRAINING} />

      <h3>Spending Requisition</h3>
      <div className="tbl"><table>
        <thead><tr><th>Cost</th><th>Requisition</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td className="n">1 RP</td><td>Reinforcements</td><td>+200 pts to your supply limit. Besides Muster, Outposts and Ruins, this is the only way it grows.</td></tr>
          {toggled("datasheetLimit") && <tr><td className="n">1 RP</td><td>Extra Datasheet</td><td>+1 to your datasheet limit, for the rest of the campaign.</td></tr>}
          <tr><td className="n">1 RP</td><td>Field Surgeon</td><td>Remove one Battle Scar.</td></tr>
          <tr><td className="n">1 RP</td><td>Requisition the Deck</td><td>Draw one Fate Card.</td></tr>
          <tr><td className="n">1 RP</td><td>Promotion</td><td>Give a Character Battle Training, or make a Veteran (8+ XP) unit's sergeant a Character.</td></tr>
          <tr><td className="n">2 RP</td><td>Seasoned Recruits</td><td>Add a new unit that starts at 3 XP (Blooded), with its first Battle Honour.</td></tr>
        </tbody>
      </table></div>
      <p className="dim">Spend RP at any time outside a battle.</p>
    </section>
  );
}
