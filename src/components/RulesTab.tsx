import { ACTIONS, BATTLE_SIZES, HONOUR_PTS, LIGHT_FORCES_MAX_PTS, ORBITS, SMALL_GAME_TWISTS, PTYPES, toggleOn, TOGGLE_KEYS, TOGGLE_NAMES, TWISTS, typeGains, VTYPES } from "../game/index.ts";
import type { ProvinceType, ToggleKey } from "../game/index.ts";
import { useOptionalCampaign } from "../store/useCampaign.ts";
import type { TabId } from "../store/useDevicePrefs.ts";

const TOGGLE_DESC: Record<ToggleKey, string> = {
  training: "Characters can buy Battle Training with a Promotion. Off: no new training; the organiser can refund training already bought.",
  relics: "Characters earn relics from Shrines and Fate Cards. Off: no new relics; held relics stay.",
  twists: `Battles roll Mission Twists. Off: none are rolled. Light Forces and Close Quarters still apply at ${LIGHT_FORCES_MAX_PTS} pts or fewer.`,
  datasheetLimit: "5 datasheets, +1 for each Extra Datasheet bought with RP.",
  toughnessStages: "No unit above T11 in War Rounds 1–2, until supply reaches 1250.",
  knights: "Armigers and War Dogs count as Battleline; one may be the Setup Warlord.",
};

/** The owner's switches for the four campaign rules. Hidden from players: the rules text below follows whatever is on. */
function CampaignRules() {
  const campaign = useOptionalCampaign();
  if (!campaign?.viewer.isOwner) return null;
  const { state, dispatch } = campaign;
  return (
    <div className="rt-panel">
      <h3>Campaign rules</h3>
      <p className="rt-who">You are the owner: switch rules at any time. Players don't see these switches.</p>
      {TOGGLE_KEYS.map((k) => {
        const on = toggleOn(state, k);
        return (
          <div className="rt-row" key={k}>
            <div className="rt-name">
              {TOGGLE_NAMES[k]}
              <span className={`badge ${on ? "rt-on" : "rt-off"}`}>{on ? "On" : "Off"}</span>
            </div>
            <p className="rt-desc">{TOGGLE_DESC[k]}</p>
            <button type="button" className="rt-sw" aria-pressed={on} aria-label={TOGGLE_NAMES[k]} onClick={() => dispatch({ type: "setToggle", key: k, on: !on })} />
          </div>
        );
      })}
    </div>
  );
}

export function RulesTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const campaign = useOptionalCampaign();
  const toggled = campaign ? (k: ToggleKey) => toggleOn(campaign.state, k) : (k: ToggleKey) => toggleOn({}, k);
  return (
    <section className="tab" id="rules">
      <h2>Rules</h2>
      <p className="dim">Everything the War Room does, as plain rules you can also play on paper.</p>

      <CampaignRules />

      <h3>The War Round</h3>
      <ol className="steps">
        <li><div><b>Income</b>+1 RP for your Capital and each Hive City. 1 Fate Card for each Refinery (hand limit 5).</div></li>
        <li><div><b>Plan</b>Everyone secretly picks an action and a target, then marks Ready.</div></li>
        <li><div><b>Reveal</b>Once everyone is Ready, the owner reveals all picks at once.</div></li>
        <li><div><b>Play</b>Everyone plays their pick at the same time.</div></li>
        <li><div><b>Round end</b>When every pick is done. Hold the Hollowgate now and you win the Reach.</div></li>
      </ol>
      <ul className="rl">
        <li>Two picks on the same province: the weaker player goes first. The other waits, or switches pick.</li>
        <li>A pick that's no longer possible when its turn comes: choose again.</li>
        <li>Weakest = fewest provinces. Ties: roll off.</li>
        <li>A War Round can stretch over a couple of weeks.</li>
      </ul>

      <h3>Your warband</h3>
      <h4 className="rl-h">In Setup (before War Round 1)</h4>
      <ul className="rl">
        <li>A 750 pt roster.</li>
        <li>Exactly 1 Character: your Warlord.</li>
        <li>At least 2 Battleline.</li>
        <li>No unit at Toughness 10 or higher.</li>
        <li>At most 1 non-Battleline unit at Toughness 9.</li>
        <li>No Epic Heroes, ever.</li>
        <li>Add, remove and resize units freely.</li>
      </ul>
      <h4 className="rl-h">From War Round 1</h4>
      <ul className="rl">
        <li>Units can't be removed. Only a third Battle Scar takes them off your roster.</li>
        <li>Units can grow but never shrink: base points can't go down.</li>
        <li>Field at least 1 Character and 2 Battleline.</li>
        <li>Add Characters through Promotion or as your supply grows, up to your Character slots.</li>
        <li>One Warlord per roster.</li>
        <li>Your supply limit caps your roster's total points.</li>
        {toggled("toughnessStages") && <li><b>Toughness stages:</b> no unit at Toughness 12 or higher in War Rounds 1 and 2. Lifts from War Round 3, or once your supply limit reaches 1250.</li>}
      </ul>

      <h4 className="rl-h">Roles</h4>
      <ul className="rl">
        <li>Every unit has one role: Character, Battleline, Non-Monster / Vehicle, Vehicle / Monster or Other.</li>
        <li>Picking a datasheet sets the role from its keywords, first match wins: Character, then Battleline, then Other (Dedicated Transport, Fortification), then Vehicle / Monster (Vehicle, Monster, Aircraft).</li>
        <li>Everything else is Non-Monster / Vehicle: Infantry, Mounted, Beasts, Swarms, bikes, jump packs.</li>
        <li>Allies, Agents and Psykers take the role their own datasheet gives them.</li>
      </ul>

      <h4 className="rl-h">Character slots</h4>
      <ul className="rl">
        <li>1 Character slot, +1 per Shrine held (up to +3).</li>
        <li>Held at 1 in Setup.</li>
        <li>No slots for other roles.</li>
      </ul>

      {toggled("datasheetLimit") && (
        <>
          <h4 className="rl-h">Datasheet limit</h4>
          <ul className="rl">
            <li>At most 5 different datasheets on your roster.</li>
            <li>Units sharing a datasheet count once. Units with none named don't count.</li>
            <li>+1 for each Extra Datasheet bought (1 RP each, no cap).</li>
            <li>At the limit, you can't add a new datasheet until you buy one.</li>
          </ul>
        </>
      )}

      {toggled("knights") && (
        <>
          <h4 className="rl-h">Knights</h4>
          <ul className="rl">
            <li>Armigers and War Dogs count as Battleline, so the Toughness 9 limit doesn't apply to them.</li>
            <li>In Setup, your Warlord may be an Armiger or War Dog: Warlord trait only, no title, backstory, enhancement or relics.</li>
            <li>From War Round 1, field at least 1 Character. It may become your Warlord.</li>
          </ul>
        </>
      )}

      <h4 className="rl-h">Mustering for a battle</h4>
      <ul className="rl">
        <li>You can field a unit at a smaller size than it is on your roster.</li>
        <li>You can't split a unit: ten Intercessors on your roster take the field as one squad of up to ten, never two squads of five.</li>
        <li>Build each game's army from your roster with the normal 40k muster rules.</li>
      </ul>

      <h3>Characters</h3>
      <ul className="rl">
        <li>Use their own Battle Honour and Battle Scar tables.</li>
        {(toggled("relics") || toggled("training")) && <li>Up to {[toggled("relics") && "3 relics", toggled("training") && "3 Battle Training"].filter(Boolean).join(" and ")} each.</li>}
        <li>Fallen Characters go to the Hall of Heroes.</li>
      </ul>

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
      <ul className="rl">
        <li>One outer world per player, plus middle and inner worlds (at least 4 worlds). 5 to 7 provinces each.</li>
        <li>Inner worlds sit nearest the Hollowgate.</li>
        <li>Each player starts with a Capital on an outer world, bordered by a 500, a 750 and a 1000 pt battle.</li>
      </ul>
      <h4 className="rl-h">Late arrivals (joining after War Round 1 begins)</h4>
      <ul className="rl">
        <li>A new outer world and Capital, and 1 extra Fate Card.</li>
        <li>Supply limit: the other players' average (to the nearest 50) minus 150, never below 750.</li>
        <li>They join the turn order next round.</li>
      </ul>

      <h3>Where you can attack</h3>
      <ol className="steps">
        <li><div><b>Overland</b>Any province that borders one you hold on the same world.</div></li>
        <li><div><b>Planetfall</b>If you hold a Spaceport on a world, you can attack any province on a world linked to it by a warp lane.</div></li>
        <li><div><b>The rift</b>Once the Hollowgate opens, anyone holding a province on an inner world can attack it.</div></li>
        <li><div><b>No foothold</b>A player with no provinces can attack any unclaimed province on an outer world.</div></li>
      </ol>

      <h3>Battle size</h3>
      <ul className="rl">
        <li>The province's points, set by its type (see Province types). The world's orbit doesn't change them.</li>
        <li>The Hollowgate is a fixed 2000 pt war.</li>
        <li>Supply limits don't change the battle size. If your roster is smaller, you field what you have.</li>
        <li><b>Underdog:</b> an attacker with fewer provinces than the defender gets +10% points.</li>
        <li><b>Small battles</b> ({LIGHT_FORCES_MAX_PTS} pts or fewer) always use {SMALL_GAME_TWISTS.map((i) => `${TWISTS[i].t} (${TWISTS[i].e.replace(/\.$/, "")})`).join(" and ")}, even with Mission Twists off.</li>
        <li>The battle's points set the board and detachment points. Garrison and Underdog bonuses don't change them.{toggled("twists") && ' The Close Quarters twist still shrinks the board to 44" x 30".'}</li>
      </ul>
      <div className="tbl"><table>
        <thead><tr><th>Size</th><th>Points</th><th>Board</th><th>Detachment points</th></tr></thead>
        <tbody>
          {BATTLE_SIZES.map((b) => (
            <tr key={b.n}><td><b>{b.n}</b></td><td>{b.pts}</td><td>{b.board}</td><td className="n">{b.dp}</td></tr>
          ))}
        </tbody>
      </table></div>
      {toggled("twists") && (
        <>
          <ul className="rl">
            <li>The world's orbit sets how many Mission Twists you roll:</li>
          </ul>
          <div className="tbl"><table>
            <thead><tr><th>Orbit</th><th>Twists</th></tr></thead>
            <tbody>
              {Object.entries(ORBITS).map(([k, o]) => (
                <tr key={k}><td><b>{o.name}</b></td><td className="n">{o.twists}</td></tr>
              ))}
              <tr><td><b>The Hollowgate</b></td><td className="n">2</td></tr>
            </tbody>
          </table></div>
        </>
      )}
      <h4 className="rl-h">Garrison battles (unclaimed provinces)</h4>
      <ul className="rl">
        <li>Another player (never the attacker) plays the garrison. You must fight it.</li>
        <li>The garrison player is chosen once picks are revealed, before the battle is rolled.</li>
        <li>No Underdog bonus.</li>
        <li>Choose your edge: +20% points for you, or −20% for the garrison.</li>
        <li>Light Forces, Close Quarters and Fate Cards go by the base size, before the 20%.</li>
        <li>The garrison player gains nothing: no RP, Fate Cards, wins or supply.</li>
        <li><b>Decisive win:</b> win having lost under 25% of your army for +1 RP.</li>
      </ul>

      <h3>Province types</h3>
      <div className="tbl"><table>
        <thead><tr><th>Type</th><th>Base pts</th><th>Holder's bonus</th></tr></thead>
        <tbody>
          {Object.entries(VTYPES).map(([k, t]) => (
            <tr key={k}><td><b>{t.n}</b></td><td className="n">{t.size}</td><td>{typeGains(k as ProvinceType)}</td></tr>
          ))}
        </tbody>
      </table></div>

      <h3>World types</h3>
      <p>Every battle on a world uses its trait{toggled("twists") ? ", on top of any twists" : ""}.</p>
      <div className="tbl"><table>
        <thead><tr><th>World</th><th>Trait</th></tr></thead>
        <tbody>
          {Object.entries(PTYPES).map(([k, t]) => (
            <tr key={k}><td><span className="dot" style={{ background: t.c }}></span> <b>{t.n}</b></td><td>{t.trait}</td></tr>
          ))}
        </tbody>
      </table></div>

      {toggled("twists") && (
        <>
          <h3>Mission Twists (D12)</h3>
          <div className="tbl"><table>
            <thead><tr><th>D12</th><th>Twist</th><th>Effect</th></tr></thead>
            <tbody>
              {TWISTS.map((c, i) => (
                <tr key={c.t}><td className="n">{i + 1}</td><td>{c.t}</td><td>{c.e}</td></tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}

      <h3>After each battle</h3>
      <ol className="steps">
        <li><div><b>Award XP</b>+1 to every unit that fought and survived. +1 per enemy unit it destroyed. A unit earns at most 2 XP a War Round from these. +1 to one unit you <i>Marked for Glory</i> before the game, on top of the cap.</div></li>
        <li><div><b>Roll for the fallen</b>Each destroyed unit rolls a D6 (Hard to Kill adds 1). On a 1 it gains a Battle Scar, Characters on a 1–2. The Warlord never rolls.</div></li>
        <li><div><b>Requisition</b>+1 RP to the winner. Nothing for a loss or a draw. Bank up to 10.</div></li>
        <li><div><b>Spoils</b>The winner draws 1 Fate Card. A Conquer winner takes the province. A Raid winner steals 1 RP and a random Fate Card.</div></li>
      </ol>

      <p className="rw-pointer">
        The rank, honour, scar, relic and training tables are on the{" "}
        <button type="button" className="lnk" onClick={() => onNavigate("rewards")}>Rewards</button> page.
      </p>

      <h3>Ranks</h3>
      <ul className="rl">
        <li>Green 0 XP, Blooded 3, Veteran 8, Elite 15, Legend of the Reach 25 (the unit gets a name in the campaign log).</li>
        <li>Each rank gained: roll or pick 1 Battle Honour, straight after the battle.</li>
        <li>No duplicate honours: re-roll or pick another.</li>
        <li>Each Battle Honour adds {HONOUR_PTS} pts to the unit.</li>
      </ul>

      <h3>Battle Scars (roll D3)</h3>
      <ul className="rl">
        <li>No duplicate scars: re-roll.</li>
        <li>Worn Gear: choose the weapon when the scar is gained.</li>
        <li>Scars never change a unit's points.</li>
        <li>Third scar: the unit is removed from your roster. Characters too, except the Warlord.</li>
      </ul>
      <p className="dim">My Warband tracks XP, ranks, honours, scars and relics, with a post-battle helper for the rolls.</p>

      <h3>Character Battle Honours (roll D6 or pick)</h3>
      <ul className="rl">
        <li>Characters use their own table, other units the Battle Honours table.</li>
        <li>No duplicates across both tables.</li>
      </ul>

      <h3>Character Battle Scars (roll D3)</h3>
      <ul className="rl">
        <li>Grievous Wound is temporary: it counts toward the three-scar limit until it heals after the unit's next battle.</li>
      </ul>
      <h4 className="rl-h">The Warlord</h4>
      <ul className="rl">
        <li>Never rolls for the fallen. If destroyed, it takes a Character Battle Scar (D3, re-roll scars it holds).</li>
        <li>Never removed, and no RP penalty.</li>
        <li>Already at three scars: the new scar replaces the oldest.</li>
      </ul>

      {toggled("relics") && (
        <>
          <h3>Relics (roll D6 or pick)</h3>
          <ul className="rl">
            <li>A Character earns one when its player claims a Shrine, or from a Fate Card.</li>
            <li>Up to 3 per Character, no duplicates: re-roll or pick another.</li>
            <li>+10 pts each.</li>
          </ul>
        </>
      )}

      {toggled("training") && (
        <>
          <h3>Battle Training (roll D12 or pick)</h3>
          <ul className="rl">
            <li>Bought with a Promotion (1 RP).</li>
            <li>Not a detachment Enhancement: those are still paid in points when you muster.</li>
            <li>Up to 3 per Character, no duplicates. +10 pts each.</li>
            <li>Only the organiser can remove it, refunding the 1 RP.</li>
          </ul>
        </>
      )}

      <h3>Spending Requisition</h3>
      <p>Spend RP at any time outside a battle.</p>
      <div className="tbl"><table>
        <thead><tr><th>Cost</th><th>Requisition</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td className="n">1 RP</td><td>Reinforcements</td><td>+200 pts to your supply limit.</td></tr>
          {toggled("datasheetLimit") && <tr><td className="n">1 RP</td><td>Extra Datasheet</td><td>+1 to your datasheet limit, for the rest of the campaign.</td></tr>}
          <tr><td className="n">1 RP</td><td>Field Surgeon</td><td>Remove one Battle Scar.</td></tr>
          <tr><td className="n">1 RP</td><td>Requisition the Deck</td><td>Draw one Fate Card.</td></tr>
          <tr><td className="n">1 RP</td><td>Promotion</td><td>{toggled("training") ? "Give a Character Battle Training, or make" : "Make"} a Veteran (8+ XP) unit's sergeant a Character.</td></tr>
          <tr><td className="n">2 RP</td><td>Seasoned Recruits</td><td>Add a new unit that starts at 3 XP (Blooded), with its first Battle Honour.</td></tr>
        </tbody>
      </table></div>
    </section>
  );
}
