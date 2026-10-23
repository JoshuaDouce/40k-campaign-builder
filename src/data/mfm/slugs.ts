// Which Munitorum Field Manual files (src/data/mfm/<slug>.json) each faction uses. Read by scripts/update-points.mjs and the datasheet picker.
import type { FactionName } from "../../game/types.ts";

/** Faction -> Munitorum Field Manual slug(s). For chapters the chapter's own list comes first, so it wins when merged with "space-marines". */
export const MFM_SLUGS: Record<FactionName, readonly string[]> = {
  "Space Marines":["space-marines"],
  "Astra Militarum":["astra-militarum"],
  "Adepta Sororitas":["adepta-sororitas"],
  "Adeptus Mechanicus":["adeptus-mechanicus"],
  "Chaos Space Marines":["chaos-space-marines"],
  "Death Guard":["death-guard"],
  "Orks":["orks"],
  "Necrons":["necrons"],
  "Tyranids":["tyranids"],
  "Genestealer Cults":["genestealer-cults"],
  "Aeldari":["aeldari"],
  "T'au Empire":["tau-empire"],
  "Adeptus Custodes":["adeptus-custodes"],
  "Black Templars":["black-templars", "space-marines"],
  "Blood Angels":["blood-angels", "space-marines"],
  "Chaos Daemons":["chaos-daemons"],
  "Chaos Knights":["chaos-knights"],
  "Dark Angels":["dark-angels", "space-marines"],
  "Deathwatch":["deathwatch", "space-marines"],
  "Drukhari":["drukhari"],
  "Emperor's Children":["emperors-children"],
  "Grey Knights":["grey-knights"],
  "Imperial Agents":["imperial-agents"],
  "Imperial Knights":["imperial-knights"],
  "Leagues of Votann":["leagues-of-votann"],
  "Space Wolves":["space-wolves", "space-marines"],
  "Thousand Sons":["thousand-sons"],
  "World Eaters":["world-eaters"]
};
