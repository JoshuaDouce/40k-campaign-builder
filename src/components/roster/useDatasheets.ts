import { useEffect, useMemo, useState } from "react";
import { MFM_SLUGS } from "../../data/mfm/slugs.ts";
import type { FactionName, Role } from "../../game/index.ts";

/** One datasheet in the pick-list. `sizes` are [models, points] pairs, smallest squad first. */
export interface Datasheet {
  name: string;
  sizes: readonly (readonly [number, number])[];
  legends: boolean;
  /** Toughness (highest T across the unit's models), if known. */
  t?: number;
  /** An Epic Hero: hidden from the picker and not allowed on a roster. */
  epic?: boolean;
  /** Force Organisation role from the datasheet's keywords, if known. */
  role?: Role;
  /** Name with case, accents and apostrophes folded away, for matching. */
  folded: string;
  /** For each character of `folded`, the index of the character it came from in `name`. */
  map: readonly number[];
}

export interface Datasheets {
  status: "loading" | "ready" | "none";
  units: readonly Datasheet[];
  version: string;
}

interface RawFile {
  units: { n: string; p: [number, number][]; l?: 1; t?: number; e?: 1; r?: RoleCode }[];
}
interface RawMeta {
  version: string;
}

/** Role codes written by scripts/update-points.mjs from each datasheet's keywords. */
type RoleCode = "c" | "b" | "i" | "v" | "o";
const ROLE_CODES: Record<RoleCode, Role> = { c: "Character", b: "Battleline", i: "Non-Monster / Vehicle", v: "Vehicle / Monster", o: "Other" };

const QUOTES = /['‘’`]/;

/** Fold text for matching: lower case, accents and apostrophes/curly quotes removed. Keeps a map back to the original. */
export function fold(text: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (QUOTES.test(ch)) continue;
    const plain = ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (const p of plain) {
      folded += p;
      map.push(i);
    }
  }
  return { folded, map };
}

/** Matching key for an Epic Hero name: folded, dashes unified, spaces collapsed, trimmed. */
const epicKey = (name: string): string =>
  fold(name.trim())
    .folded.replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const epicSets = new WeakMap<readonly Datasheet[], Set<string>>();

/** True if `name` matches an Epic Hero datasheet in `units` (ignores case, apostrophes, dashes and surrounding spaces). */
export function isEpicName(units: readonly Datasheet[], name: string): boolean {
  const key = epicKey(name);
  if (!key) return false;
  let set = epicSets.get(units);
  if (!set) {
    set = new Set(units.filter((u) => u.epic).map((u) => epicKey(u.name)));
    epicSets.set(units, set);
  }
  return set.has(key);
}

/** Name matcher for the faction's Epic Heroes. Always false until the data is ready (honour system). */
export function useIsEpicName(faction: FactionName | undefined): (name: string) => boolean {
  const { units } = useDatasheets(faction);
  return useMemo(() => (name: string) => isEpicName(units, name), [units]);
}

// Lazy and non-eager: each faction's JSON becomes its own chunk, fetched only when a roster, Setup checklist or unit form needs it.
const files = import.meta.glob<RawFile>(["../../data/mfm/*.json", "!**/meta.json"], { import: "default" });
const metas = import.meta.glob<RawMeta>("../../data/mfm/meta.json", { import: "default" });
const fileFor = (slug: string) => files[`../../data/mfm/${slug}.json`];
const metaLoader = metas["../../data/mfm/meta.json"];

const NONE: Datasheets = { status: "none", units: [], version: "" };
const LOADING: Datasheets = { status: "loading", units: [], version: "" };
const cache = new Map<FactionName, Datasheets>();
const pending = new Map<FactionName, Promise<Datasheets>>();
// Parsed per slug, so the five chapters share one copy of the generic Space Marines list.
const slugUnits = new Map<string, Promise<Datasheet[]>>();
let versionP: Promise<string> | undefined;
const version = () => (versionP ??= metaLoader ? metaLoader().then((m) => m.version, () => "") : Promise.resolve(""));

function unitsFor(slug: string): Promise<Datasheet[]> {
  let p = slugUnits.get(slug);
  if (!p) {
    const loader = fileFor(slug);
    if (!loader) return Promise.reject(new Error(`No MFM data for ${slug}`));
    p = loader().then(
      (file) => file.units.map((u) => ({ name: u.n, sizes: [...u.p].sort((a, b) => a[0] - b[0]), legends: u.l === 1, ...(u.t !== undefined && { t: u.t }), ...(u.e === 1 && { epic: true }), ...(u.r && ROLE_CODES[u.r] && { role: ROLE_CODES[u.r] }), ...fold(u.n) })),
      (err: unknown) => {
        slugUnits.delete(slug); // a failed chunk (e.g. after a deploy) is retried next time
        throw err;
      },
    );
    slugUnits.set(slug, p);
  }
  return p;
}

async function build(faction: FactionName): Promise<Datasheets> {
  const [v, ...lists] = await Promise.all([version(), ...MFM_SLUGS[faction].map(unitsFor)]);
  const seen = new Set<string>();
  const units: Datasheet[] = [];
  for (const unit of lists.flat()) {
    if (seen.has(unit.name)) continue; // earlier slug (the chapter) wins
    seen.add(unit.name);
    units.push(unit);
  }
  if (units.length === 0) return NONE;
  units.sort((a, b) => Number(a.legends) - Number(b.legends) || a.name.localeCompare(b.name));
  return { status: "ready", units, version: v };
}

function load(faction: FactionName): Promise<Datasheets> {
  let p = pending.get(faction);
  if (!p) {
    p = build(faction).then(
      (r) => {
        cache.set(faction, r);
        return r;
      },
      () => {
        pending.delete(faction); // not cached, so the next form open retries
        return NONE;
      },
    );
    pending.set(faction, p);
  }
  return p;
}

/** Datasheets for a faction (chapters also get generic Space Marines), merged, deduped and cached. Falls back to "none". */
export function useDatasheets(faction: FactionName | undefined): Datasheets {
  const [, rerender] = useState(0);
  // A failed load isn't cached (so reopening the form retries); this form falls back to plain text meanwhile.
  const [failed, setFailed] = useState<FactionName | null>(null);

  useEffect(() => {
    if (!faction || cache.has(faction)) return;
    let live = true;
    void load(faction).then(() => {
      if (!live) return;
      if (cache.has(faction)) rerender((n) => n + 1);
      else setFailed(faction);
    });
    return () => {
      live = false;
    };
  }, [faction]);

  if (!faction) return NONE;
  return cache.get(faction) ?? (failed === faction ? NONE : LOADING);
}
