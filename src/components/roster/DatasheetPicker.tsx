import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { SETUP_MAX_TOUGHNESS } from "../../game/index.ts";
import type { FactionName } from "../../game/index.ts";
import { fold, useDatasheets } from "./useDatasheets.ts";
import type { Datasheet } from "./useDatasheets.ts";

const MAX_ROWS = 50;
const optId = (listId: string, i: number) => `${listId}-o${i}`;

interface Props {
  /** Id of the text input (the form's label points at it). */
  id: string;
  faction: FactionName | undefined;
  /** The datasheet text. Whatever is in the field is what gets saved. */
  value: string;
  /** Base points as typed in the form. */
  points: string;
  onText(text: string): void;
  onPoints(points: string): void;
  /** Called with the datasheet's Toughness, or "" when it has none. */
  onToughness(t: string): void;
  /** True in Setup, when T10 or higher is over the limit. */
  setup?: boolean;
  /** The typed name is an Epic Hero in this faction: shows the block message. */
  epicBlock?: boolean;
}

interface Hit {
  unit: Datasheet;
  /** [start, end) in the original name to highlight. */
  at: [number, number];
}

function highlight(name: string, at: [number, number]): ReactNode {
  return (
    <>
      {name.slice(0, at[0])}
      <mark>{name.slice(at[0], at[1])}</mark>
      {name.slice(at[1])}
    </>
  );
}

/** Datasheet field for the unit form: a searchable pick-list when MFM data exists, else today's plain text input. */
export function DatasheetPicker({ id, faction, value, points, onText, onPoints, onToughness, setup, epicBlock }: Props) {
  const data = useDatasheets(faction);
  const listId = useId();
  const field = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState<Datasheet | null>(null);

  const ready = data.status === "ready";
  const q = fold(value.trim()).folded;
  const hits = useMemo<Hit[]>(() => {
    if (!ready || !q) return [];
    const out: Hit[] = [];
    for (const unit of data.units) {
      if (unit.epic) continue; // Epic Heroes are never offered
      const i = unit.folded.indexOf(q);
      if (i < 0) continue;
      out.push({ unit, at: [unit.map[i], unit.map[i + q.length - 1] + 1] });
      if (out.length >= MAX_ROWS) break;
    }
    return out;
  }, [ready, q, data.units]);

  const isOpen = open && hits.length > 0;
  const current = Math.min(active, Math.max(hits.length - 1, 0));

  // Keep the field in view above the on-screen keyboard when the list opens.
  useEffect(() => {
    if (!isOpen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    field.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }, [isOpen]);
  // Keep the keyboard-active row in view inside the list.
  useEffect(() => {
    if (isOpen) document.getElementById(optId(listId, current))?.scrollIntoView({ block: "nearest" });
  }, [isOpen, current, listId]);

  const pick = (unit: Datasheet) => {
    setPicked(unit);
    setOpen(false);
    onText(unit.name);
    if (unit.sizes.length > 0) onPoints(String(unit.sizes[0][1]));
    onToughness(unit.t != null ? String(unit.t) : "");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!ready) return;
    if (e.key === "Escape" && isOpen) {
      // Stops the native event before it reaches Overlay's document listener, so only the list closes.
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (hits.length === 0) return;
      e.preventDefault();
      if (!isOpen) {
        setOpen(true);
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + hits.length) % hits.length);
    } else if (e.key === "Enter" && isOpen) {
      e.preventDefault();
      pick(hits[current].unit);
    }
  };

  const plain = data.status === "none";
  const sizes = picked && picked.name === value && picked.sizes.length >= 2 ? picked.sizes : null;
  const now = points.trim() === "" ? NaN : Number(points);

  return (
    <div className={plain ? "field" : "field mf-ds"} ref={field}>
      <div className="mf-lblrow">
        <label htmlFor={id}>Datasheet</label>
        {ready && data.version && (
          <a className="mf-ver" href="https://github.com/BSData/wh40k-11e-mfm" target="_blank" rel="noreferrer" title="Points from BSData/wh40k-11e-mfm (MIT licence)">
            MFM {data.version}
          </a>
        )}
        {ready && (
          <a className="mf-ver" href="https://github.com/BSData/wh40k-11e" target="_blank" rel="noreferrer" title="Toughness from BSData/wh40k-11e">
            T: BSData 11e
          </a>
        )}
      </div>
      <input
        type="text"
        id={id}
        value={value}
        placeholder={plain ? "e.g. Intercessor Squad" : `Search ${faction ?? ""} datasheets`}
        autoComplete="off"
        className={isOpen ? "mf-open" : undefined}
        aria-invalid={epicBlock ? true : undefined}
        aria-describedby={epicBlock ? "f_epicblock" : "f_epichint"}
        {...(ready
          ? {
              role: "combobox",
              "aria-autocomplete": "list" as const,
              "aria-expanded": isOpen,
              "aria-controls": isOpen ? listId : undefined,
              "aria-activedescendant": isOpen ? optId(listId, current) : undefined,
            }
          : {})}
        onChange={(e) => {
          onText(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {data.status === "loading" && (
        <div className="mf-loading" role="status">
          <i></i>Loading datasheets…
        </div>
      )}
      {isOpen && (
        <ul className="mf-list" id={listId} role="listbox" aria-label="Datasheets" onMouseDown={(e) => e.preventDefault()}>
          {hits.map(({ unit, at }, i) => (
              <li
                key={unit.name}
                id={optId(listId, i)}
                role="option"
                aria-selected={i === current}
                className={`mf-opt${unit.legends ? " leg" : ""}${i === current ? " act" : ""}`}
                onClick={() => pick(unit)}
              >
                <span className="mf-nm">
                  <b>{highlight(unit.name, at)}</b>
                  {unit.legends && <span className="badge legend">Legends</span>}
                </span>
                <span className="mf-pts">
                  {unit.sizes.length > 1 && <s>from</s>}
                  {unit.sizes[0][1]}
                  {unit.sizes.length === 1 && " pts"}
                  {unit.t != null && (
                    <span className={`mono ${setup && unit.t > SETUP_MAX_TOUGHNESS ? "bad" : "dim"}`} title={setup && unit.t > SETUP_MAX_TOUGHNESS ? "Over the Setup Toughness limit" : undefined}>
                      {" "}T{unit.t}
                      {setup && unit.t > SETUP_MAX_TOUGHNESS && <span className="su-sr"> (over the Setup limit)</span>}
                    </span>
                  )}
                </span>
              </li>
            ))}
        </ul>
      )}
      {sizes && (
        <>
          <div className="lbl" style={{ marginTop: 8 }}>
            Models
          </div>
          <div className="mf-sizes" role="group" aria-label="Model count">
            {sizes.map(([models, pts]) => (
              <button key={models} type="button" aria-pressed={now === pts} onClick={() => onPoints(String(pts))}>
                {models} {models === 1 ? "model" : "models"} · <b>{pts} pts</b>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mono dim" id="f_epichint" style={{ fontSize: 11 }}>
        Epic Heroes are not allowed.
      </div>
      {epicBlock && (
        <div className="hint bad" id="f_epicblock" role="alert">
          ! No Epic Heroes. {value.trim()} is a named legend of the galaxy. Pick another Character or give your own hero a new name.
        </div>
      )}
    </div>
  );
}
