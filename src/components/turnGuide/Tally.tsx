import { HAND_LIMIT as HAND_CAP } from "../../game/index.ts";
import { RP_CAP } from "./battleMath.ts";
import type { Env } from "./guideTypes.ts";

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Running gains and losses this turn. */
export function Tally({ env }: { env: Env }) {
  const { tally: t, sc } = env;
  const items: ReadonlyArray<readonly [string, number]> = [
    ["RP", t.rp],
    ["Fate Cards", t.cards],
    ["Provinces", t.provinces],
    ["Supply", t.supply],
  ];
  const rp = sc.rp + t.rp;
  const hand = sc.hand + t.cards;
  const warn: string[] = [];
  if (rp > RP_CAP) warn.push(`${rp - RP_CAP} RP over the cap of ${RP_CAP} is wasted.`);
  if (hand > HAND_CAP) warn.push(`${hand - HAND_CAP} card${hand - HAND_CAP > 1 ? "s" : ""} over the hand limit of ${HAND_CAP} would be lost.`);
  return (
    <div className="tg-tally" role="group" aria-label="Running tally this turn">
      <div className="stats">
        {items.map(([label, v]) => (
          <div key={label} className="stat">
            <div className="l">{label}</div>
            <div className={`v ${v > 0 ? "gain" : v < 0 ? "loss" : ""}`}>{signed(v)}</div>
          </div>
        ))}
      </div>
      <p className="dim mono tg-now">
        Now: {Math.min(RP_CAP, rp)} RP · {Math.min(HAND_CAP, hand)} cards
        {t.supply ? ` · supply ${sc.supply + t.supply}` : ""}
      </p>
      {warn.map((w) => (
        <p key={w} className="tg-warn">
          {w}
        </p>
      ))}
    </div>
  );
}
