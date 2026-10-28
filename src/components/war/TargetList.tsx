import { holderGains, ownerOf, planetOf, sizeOf, VTYPES } from "../../game/index.ts";
import type { CampaignState, Zone } from "../../game/index.ts";

interface Props {
  state: CampaignState;
  zones: Zone[];
  selected: string | null;
  onSelect(id: string): void;
  /** Provinces another unfinished pick is on: greyed and not selectable. */
  tiedUp?(id: string): boolean;
  label: string;
}

function meta(state: CampaignState, v: Zone): string {
  const holder = ownerOf(state, v.id)?.name ?? "Unclaimed";
  if (v.type === "rift") return `Warp rift · ${sizeOf(v)} pts · ${holder}`;
  const world = planetOf(state, v)?.name ?? "";
  return `${world} · ${VTYPES[v.type].n} · ${sizeOf(v)} pts · ${holder}`;
}

/** Legal targets as real buttons. Tied-up provinces are disabled and say why. */
export function TargetList({ state, zones, selected, onSelect, tiedUp, label }: Props) {
  return (
    <ul className="st-tg" aria-label={label}>
      {zones.map((v) => {
        const used = !!tiedUp?.(v.id);
        const sel = v.id === selected;
        return (
          <li key={v.id}>
            <button type="button" className={sel ? "sel" : undefined} aria-pressed={sel} disabled={used} onClick={() => onSelect(v.id)}>
              <span className="pv">{v.name}</span>
              <span className="mt">{meta(state, v)}</span>
              <span className="gn">{holderGains(state, v)}</span>
              {used ? <span className="use">In use by another pick</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
