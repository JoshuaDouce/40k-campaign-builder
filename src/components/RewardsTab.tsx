import { CHAR_HONOURS, CHAR_SCARS, HONOUR_PTS, HONOURS, MAX_RELICS, MAX_TRAINING, RANKS, RELIC_PTS, RELICS, SCARS, TRAINING, TRAINING_PTS } from "../game/index.ts";
import { toggleOn } from "../game/index.ts";
import type { EffectRow, ToggleKey } from "../game/index.ts";
import { useOptionalCampaign } from "../store/useCampaign.ts";
import type { TabId } from "../store/useDevicePrefs.ts";

/** One roll table: die number, name and what it does. */
function RollTable({ die, label, rows }: { die: string; label: string; rows: readonly EffectRow[] }) {
  return (
    <div className="tbl"><table>
      <thead><tr><th>{die}</th><th>{label}</th><th>Effect</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.n}><td className="n">{i + 1}</td><td><b>{r.n}</b></td><td>{r.e}</td></tr>
        ))}
      </tbody>
    </table></div>
  );
}

const TABLES: ReadonlyArray<{ id: string; title: string; die: string; pick: boolean; label: string; rows: readonly EffectRow[]; how: string; rule?: ToggleKey }> = [
  { id: "rw-honours", title: "Battle Honours", die: "D6", pick: true, label: "Honour", rows: HONOURS, how: `Units that aren't Characters. One for each rank gained. +${HONOUR_PTS} pts each. No duplicates.` },
  { id: "rw-char-honours", title: "Character Battle Honours", die: "D6", pick: true, label: "Honour", rows: CHAR_HONOURS, how: `Characters. One for each rank gained. +${HONOUR_PTS} pts each. No duplicates across both honour tables.` },
  { id: "rw-scars", title: "Battle Scars", die: "D3", pick: false, label: "Scar", rows: SCARS, how: "Units that aren't Characters, when a destroyed unit rolls a 1 on a D6 after the battle. No points change. A third scar removes the unit." },
  { id: "rw-char-scars", title: "Character Battle Scars", die: "D3", pick: false, label: "Scar", rows: CHAR_SCARS, how: "Characters, on a 1–2 after the battle. The Warlord takes one whenever it is destroyed and is never removed. Grievous Wound heals after the next battle." },
  { id: "rw-relics", title: "Relics", die: "D6", pick: true, label: "Relic", rule: "relics", rows: RELICS, how: `Characters, from claiming a Shrine or a Fate Card. Up to ${MAX_RELICS} each, +${RELIC_PTS} pts each.` },
  { id: "rw-training", title: "Battle Training", die: "D12", pick: true, label: "Training", rule: "training", rows: TRAINING, how: `Characters, bought with a Promotion (1 RP). Up to ${MAX_TRAINING} each, +${TRAINING_PTS} pts each.` },
];

const jump = (id: string) => {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
};

/** Every honour, scar, relic and training at a glance. When and how you earn them is on the Rules page. */
export function RewardsTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  // Outside a campaign every table shows; inside one, a table whose rule is off is left out.
  const campaign = useOptionalCampaign();
  const tables = TABLES.filter((t) => !t.rule || !campaign || toggleOn(campaign.state, t.rule));
  return (
    <section className="tab rw" id="rewards">
      <h2>Rewards</h2>
      <p className="dim">
        Every {["Battle Honour", "Scar", ...tables.filter((t) => t.rule).map((t) => t.label === "Relic" ? "Relic" : t.title)].join(", ").replace(/, (?=[^,]*$)/, " and ")}, and what it does. When you roll for them is on the{" "}
        <button type="button" className="lnk" onClick={() => onNavigate("rules")}>Rules</button> page.
      </p>
      <div className="chips" role="group" aria-label="Jump to a table">
        {[{ id: "rw-ranks", title: "Ranks" }, ...tables].map((t) => (
          <button key={t.id} type="button" className="chip" onClick={() => jump(t.id)}>
            {t.title}
          </button>
        ))}
      </div>

      <h3 id="rw-ranks">Ranks</h3>
      <p className="dim">Each rank gained gives 1 Battle Honour. A Legend of the Reach also gets a name in the campaign log.</p>
      <div className="tbl"><table>
        <thead><tr><th>Rank</th><th>XP</th><th>Battle Honours</th></tr></thead>
        <tbody>
          {RANKS.map((r) => (
            <tr key={r.n}><td><b>{r.n}</b></td><td className="n">{r.xp}</td><td className="n">{r.slots || "—"}</td></tr>
          ))}
        </tbody>
      </table></div>

      {tables.map((t) => (
        <div key={t.id}>
          <h3 id={t.id}>{t.title} (roll {t.die}{t.pick ? " or pick" : ""})</h3>
          <p className="dim">{t.how}</p>
          <RollTable die={t.die} label={t.label} rows={t.rows} />
        </div>
      ))}
    </section>
  );
}
