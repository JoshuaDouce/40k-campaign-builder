import { useEffect, useId, useMemo, useRef, useState } from "react";
import { applyEffects, campaignEffects, EFFECT_LABEL, importedUnits, matchUnits, reassign, statChip, titledName } from "../../game/index.ts";
import type { EffectChoices, ImportedUnit, Unit, UnitMatches, YsFetched } from "../../game/index.ts";
import { fetchArmy, postArmy } from "../../store/yellowscribe.ts";
import { copyText } from "../copyText.ts";
import { Overlay } from "./Overlay.tsx";

/** Owner-only "Export for" picker. */
export interface ExportOwner {
  players: readonly { id: string; name: string }[];
  playerId: string;
  onPlayer(id: string): void;
}

interface Props {
  /** The roster units an imported unit can be matched to. */
  candidates: readonly Unit[];
  /** Heading for candidates the army did not use. */
  absentLabel: string;
  owner?: ExportOwner;
  onClose(): void;
}

type Stage = "entry" | "fetching" | "error" | "review" | "generating" | "result";

const CODE_RE = /^[0-9a-f]{8}$/;

/** Every optional effect starts ticked. */
const defaultTicks = (u: Unit | undefined): string[] => (u ? campaignEffects(u).filter((e) => e.optional).map((e) => e.id) : []);
const tone = (chip: string): string => (chip.startsWith("+") ? "pos" : chip.startsWith("-") || chip.startsWith("−") ? "neg" : "neu");
const message = (e: unknown): string => (e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");

/** The export flow: enter a Yellowscribe code, review the effects, get a new code. Never touches the campaign. */
export function YellowscribeExport({ candidates, absentLabel, owner, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("entry");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [fetched, setFetched] = useState<YsFetched | null>(null);
  const [imported, setImported] = useState<ImportedUnit[]>([]);
  const [matches, setMatches] = useState<UnitMatches>({});
  const [ticks, setTicks] = useState<Record<string, string[]>>({});
  const [newCode, setNewCode] = useState("");
  const [copied, setCopied] = useState("");
  const token = useRef(0);
  const inputId = useId();
  const errId = useId();
  const whoId = useId();

  // Closing the sheet cancels anything in flight: its result is ignored.
  useEffect(
    () => () => {
      token.current++;
    },
    [],
  );

  /** Moves to a stage; any error shown belongs to that stage only. */
  const go = (next: Stage, err = "") => {
    setStage(next);
    setError(err);
  };

  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const unitOf = (key: string): Unit | undefined => byId.get(matches[key] ?? "");

  const clean = code.trim().toLowerCase();
  const valid = CODE_RE.test(clean);

  const doFetch = async () => {
    if (!valid) return;
    const mine = ++token.current;
    go("fetching");
    try {
      const f = await fetchArmy(clean);
      if (mine !== token.current) return;
      const imp = importedUnits(f);
      const m = matchUnits(imp, candidates);
      const t: Record<string, string[]> = {};
      for (const i of imp) t[i.key] = defaultTicks(byId.get(m[i.key] ?? ""));
      setFetched(f);
      setImported(imp);
      setMatches(m);
      setTicks(t);
      go("review");
    } catch (e) {
      if (mine !== token.current) return;
      go("error", message(e));
    }
  };

  const cancel = () => {
    token.current++;
    go(stage === "generating" ? "review" : "entry");
  };

  const pickUnit = (key: string, id: string) => {
    const next = reassign(matches, key, id || null);
    // The picked card and any card it took the unit from start again with every effect ticked.
    const nextTicks = { ...ticks };
    for (const k of Object.keys(next)) {
      if (k === key || next[k] !== matches[k]) nextTicks[k] = defaultTicks(byId.get(next[k] ?? ""));
    }
    setMatches(next);
    setTicks(nextTicks);
  };

  const toggle = (key: string, id: string) => {
    const cur = ticks[key] ?? [];
    setTicks({ ...ticks, [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  const generate = async () => {
    if (!fetched) return;
    const choices: EffectChoices = {};
    for (const i of imported) {
      const unit = unitOf(i.key);
      choices[i.key] = unit ? { unit, effectIds: ticks[i.key] ?? [] } : null;
    }
    const mine = ++token.current;
    go("generating");
    try {
      const units = applyEffects(fetched, choices);
      const c = await postArmy(fetched, units);
      if (mine !== token.current) return;
      setNewCode(c);
      setCopied("");
      go("result");
    } catch (e) {
      if (mine !== token.current) return;
      go("review", message(e));
    }
  };

  const copy = async () => {
    setCopied((await copyText(newCode)) ? `Copied ${newCode}` : "Could not copy. Select the code and copy it by hand.");
  };

  const startAgain = () => {
    token.current++;
    setCode("");
    setFetched(null);
    setNewCode("");
    setCopied("");
    go("entry");
  };

  const used = new Set(Object.values(matches).filter((v): v is string => !!v));
  const absent = candidates.filter((c) => !used.has(c.id));
  const matchedCount = imported.filter((i) => unitOf(i.key)).length;
  const effectCount = imported.reduce((n, i) => {
    const u = unitOf(i.key);
    const ticked = ticks[i.key] ?? [];
    return u ? n + campaignEffects(u).filter((e) => !e.optional || ticked.includes(e.id)).length : n;
  }, 0);
  const renames = imported.flatMap((i) => {
    const u = unitOf(i.key);
    return u && (ticks[i.key] ?? []).includes("title") ? [`${i.name} becomes ${titledName(u)}`] : [];
  });
  const busy = stage === "fetching" || stage === "generating";

  return (
    <Overlay
      title={stage === "review" ? "Review" : stage === "result" ? "Your new code" : "Export to Tabletop Simulator"}
      className="ys-sheet"
      locked={busy || stage === "review"}
      onClose={onClose}
    >
      {(stage === "entry" || stage === "error") && (
        <>
          {stage === "entry" && (
            <>
              {owner && owner.players.length > 1 && (
                <div className="field" style={{ marginTop: 8 }}>
                  <label htmlFor={whoId}>Export for</label>
                  <select id={whoId} value={owner.playerId} onChange={(e) => owner.onPlayer(e.target.value)}>
                    {owner.players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <p className="hint">Owner only. Matches against that player's roster.</p>
                </div>
              )}
              <ol className="ys-steps">
                <li>
                  <div>
                    Upload your list at <b>yellowscribe.link</b>.
                  </div>
                </li>
                <li>
                  <div>Paste the code it gives you here.</div>
                </li>
                <li>
                  <div>Copy the new code into the Yellowscribe mod in TTS.</div>
                </li>
              </ol>
              <div className="ys-note">Codes expire after about 10 minutes, so have the mod open before you start.</div>
            </>
          )}
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor={inputId}>Yellowscribe code</label>
            <input
              id={inputId}
              className={`ys-code${stage === "error" ? " bad" : ""}`}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={8}
              placeholder="3fa9c21b"
              value={code}
              aria-invalid={stage === "error" || undefined}
              aria-describedby={stage === "error" ? errId : undefined}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valid) void doFetch();
              }}
            />
          </div>
          {stage === "error" && (
            <div className="note ys-err" id={errId} role="alert">
              <b>Could not fetch that army</b>
              {error}
            </div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn primary" disabled={!valid} onClick={() => void doFetch()}>
              {stage === "error" ? "Try again" : "Fetch army"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}

      {busy && (
        <>
          <div className="ys-result" role="status" aria-live="polite">
            <div className="ys-spin" aria-hidden="true"></div>
            <div className="mono">{stage === "fetching" ? `Fetching army for ${clean}...` : "Generating new code..."}</div>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button type="button" className="btn" onClick={cancel}>
              Cancel
            </button>
          </div>
        </>
      )}

      {stage === "review" && (
        <>
          <p className="dim">
            {imported.length} unit{imported.length === 1 ? "" : "s"} fetched. {matchedCount} matched by datasheet name, {imported.length - matchedCount} left as {imported.length - matchedCount === 1 ? "it is" : "they are"}.
          </p>
          {renames.length > 0 && (
            <p className="hint" style={{ marginTop: 0 }}>
              Name changes: {renames.join("; ")}.
            </p>
          )}
          {imported.map((imp) => (
            <ReviewCard
              key={imp.key}
              imp={imp}
              unit={unitOf(imp.key)}
              candidates={candidates}
              used={used}
              ticked={ticks[imp.key] ?? []}
              onPick={(id) => pickUnit(imp.key, id)}
              onToggle={(id) => toggle(imp.key, id)}
            />
          ))}
          {absent.length > 0 && (
            <div className="ys-absent">
              {absentLabel}: {absent.map((u) => u.name).join(", ")}
            </div>
          )}
          <div className="mf-foot">
            {error && (
              <div className="note ys-err" role="alert" style={{ margin: 0 }}>
                <b>Could not generate a code</b>
                {error}
              </div>
            )}
            <button type="button" className="btn primary" onClick={() => void generate()}>
              Generate new code
            </button>
            <span className="hint">
              {effectCount} effect{effectCount === 1 ? "" : "s"} will be applied. The campaign is not changed.
            </span>
            <button type="button" className="btn" onClick={() => go("entry")}>
              Back
            </button>
          </div>
        </>
      )}

      {stage === "result" && (
        <>
          <div className="ys-result">
            <div className="lbl">Yellowscribe code</div>
            <div className="ys-big">{newCode}</div>
            <div className="row" style={{ justifyContent: "center" }}>
              <button type="button" className="btn primary" onClick={() => void copy()}>
                Copy code
              </button>
            </div>
            <div className="toast" role="status">
              {copied}
            </div>
            <p className="hint" style={{ marginInline: "auto" }}>
              Paste into the Yellowscribe mod in TTS within about 10 minutes.
            </p>
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
            <button type="button" className="btn" onClick={startAgain}>
              Start again
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </>
      )}
    </Overlay>
  );
}

function ReviewCard({
  imp,
  unit,
  candidates,
  used,
  ticked,
  onPick,
  onToggle,
}: {
  imp: ImportedUnit;
  unit: Unit | undefined;
  candidates: readonly Unit[];
  /** Roster units matched to any card. */
  used: ReadonlySet<string>;
  ticked: string[];
  onPick(id: string): void;
  onToggle(id: string): void;
}) {
  const selId = useId();
  const effects = unit ? campaignEffects(unit) : [];
  const titled = unit && ticked.includes("title") ? titledName(unit) : null;
  return (
    <div className={`unit ys-card${unit ? "" : " none"}`}>
      <div className="k">
        <span>Imported{imp.isCharacter ? " · Character" : ""}</span>
        {titled && <span className="badge char">Title applied</span>}
      </div>
      <div className="ys-head">
        <span className="t">{titled ?? imp.name}</span>
        {titled && <span className="was">{imp.name}</span>}
      </div>
      <div className="field">
        <label htmlFor={selId}>Roster unit</label>
        <select id={selId} value={unit?.id ?? ""} onChange={(e) => onPick(e.target.value)}>
          <option value="">No match</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {used.has(c.id) ? " (matched)" : ""}
            </option>
          ))}
        </select>
      </div>
      {!unit && <p className="ys-pass">No match · passes through unchanged</p>}
      {unit && effects.length === 0 && <p className="ys-pass">Nothing from the campaign to add to this unit.</p>}
      {effects
        .filter((e) => e.optional)
        .map((e) => {
          const on = ticked.includes(e.id);
          const chip = e.stat && statChip(e.stat);
          return (
            <button key={e.id} type="button" className={`ys-tick${e.temporary ? " temp" : ""}`} role="checkbox" aria-checked={on} onClick={() => onToggle(e.id)}>
              <span className="ys-box" aria-hidden="true"></span>
              <span>
                <span className="lbl">{EFFECT_LABEL[e.kind]}</span>
                <span className="nm">{e.name}</span>
                <span className="rule">{e.rule}</span>
                {e.temporary && <span className="temp-flag">Temporary · heals after next battle</span>}
              </span>
              {chip ? <span className={`chip ys-stat ${tone(chip)}`}>{chip}</span> : <span></span>}
            </button>
          );
        })}
      {effects
        .filter((e) => !e.optional)
        .map((e) => (
          <div className="ys-text" key={e.id}>
            <span className="lbl">{EFFECT_LABEL[e.kind]}</span>
            {e.rule}
          </div>
        ))}
    </div>
  );
}
