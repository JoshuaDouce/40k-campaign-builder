import { useState } from "react";
import { hollowgateRound, isV12, musterCutFromLog, musterGain, provinceSupply, REINFORCE_CUT, reinforceCost, REINFORCE_SUPPLY, reinforcementsInLog, rpCap, supplyOf } from "../game/index.ts";
import { useCampaign } from "../store/useCampaign.ts";

/** The 1.1 and 1.2 rules, read before the campaign is on 1.2. */
const V11 = {} as const;
const V12 = { rules: "1.2" } as const;
const NEW_RP_CAP = rpCap(V12);

/** Owner-only panel on a 1.1 campaign: move it to Varkesh Reach 1.2, with each player's supply cut checked first. */
export function RulesUpgrade() {
  const { state, dispatch } = useCampaign();
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(state.players.map((p) => [p.id, String(reinforcementsInLog(state, p))])),
  );
  const [confirm, setConfirm] = useState(false);
  if (isV12(state)) return null;

  const cutOf = (id: string, sup: number) => Math.min(sup, Math.max(0, Math.floor(Number(counts[id]) || 0)) * REINFORCE_CUT);
  const go = () => {
    if (!confirm) return setConfirm(true);
    dispatch({ type: "upgradeRules", cuts: Object.fromEntries(state.players.map((p) => [p.id, cutOf(p.id, p.sup || 0)])) });
  };

  return (
    <div className="rt-up">
      <div className="rt-name">Upgrade to Varkesh Reach 1.2</div>
      <ul className="rl">
        <li><b>Worlds sized by orbit.</b> Unclaimed provinces are re-charted: 500–750 pts on outer worlds, 750–1000 on middle worlds, up to a 1500 pt Titan Graveyard on each inner world. Held provinces, Capitals and Spaceports keep their type.</li>
        <li><b>Reinforcements cost {reinforceCost(V12)} RP</b> for +{REINFORCE_SUPPLY} supply. Each one already bought loses half its supply ({REINFORCE_CUT} pts).</li>
        <li><b>Muster gives +{musterGain(V12, false)} supply</b> (was +{musterGain(V11, false)}), and +{musterGain(V12, true)} with a Forge (was +{musterGain(V11, true)}), still with 1 Fate Card. Each Muster already taken loses {musterGain(V11, false) - musterGain(V12, false)} supply, or {musterGain(V11, true) - musterGain(V12, true)} if it had a Forge.</li>
        <li><b>Province supply drops.</b> Outposts give +{provinceSupply(V12, "outpost")}, Ruins +{provinceSupply(V12, "ruins")} and Titan Graveyards +{provinceSupply(V12, "graveyard")}.</li>
        <li><b>Scout is gone.</b> It is no longer an action.</li>
        <li><b>RP banks up to {NEW_RP_CAP}.</b> Anyone holding more loses the extra.</li>
        <li><b>The Hollowgate opens by War Round {hollowgateRound(V12)}</b> (or once 60% is claimed). If it's already open, it stays open.</li>
      </ul>
      <p className="rt-desc">Reinforcements counted from the log, which keeps only the latest 60 entries. Check each count before upgrading. Musters are counted from the log too.</p>
      <div className="tbl"><table>
        <thead><tr><th>Player</th><th>Reinforcements</th><th>Supply</th><th>RP</th></tr></thead>
        <tbody>
          {state.players.map((p) => {
            const supply = supplyOf(state, p);
            const cut = cutOf(p.id, p.sup || 0);
            // After: 1.2 province supply, less the Reinforcements cut and the Muster cut (taken from what is left).
            const after = supplyOf({ ...state, rules: V12.rules }, p) - cut - Math.min(musterCutFromLog(state, p), (p.sup || 0) - cut);
            return (
              <tr key={p.id}>
                <td><b>{p.name}</b></td>
                <td className="rt-up-n">
                  <input type="number" inputMode="numeric" min={0} step={1} aria-label={`Reinforcements ${p.name} bought`} value={counts[p.id] ?? "0"} onChange={(e) => setCounts({ ...counts, [p.id]: e.target.value })} />
                </td>
                <td className="n">{after !== supply ? `${supply} → ${after}` : supply}</td>
                <td className="n">{p.rp > NEW_RP_CAP ? `${p.rp} → ${NEW_RP_CAP}` : p.rp}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className={confirm ? "btn primary" : "btn"} onClick={go}>
          {confirm ? "Confirm: upgrade now (can't be undone)" : "Upgrade to 1.2"}
        </button>
        {confirm && <button type="button" className="btn" onClick={() => setConfirm(false)}>Cancel</button>}
      </div>
    </div>
  );
}
