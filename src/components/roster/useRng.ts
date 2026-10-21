import { useState } from "react";
import { mulberry } from "../../game/index.ts";
import type { Rng } from "../../game/index.ts";

/** A seeded RNG that lives as long as the component, for dice rolls and ids. */
export function useRng(): Rng {
  const [rng] = useState(() => mulberry(Math.floor(Math.random() * 2 ** 31)));
  return rng;
}
