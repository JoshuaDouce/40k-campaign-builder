import type { ReactNode } from "react";
import type { Card } from "../game/index.ts";

interface Props {
  card: Card & { n?: number };
  isNew?: boolean;
  children?: ReactNode;
}

export function FateCard({ card, isNew, children }: Props) {
  const cls = ["card", card.fac ? "fac" : "", isNew ? "new" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className="k">
        <span>{card.fac ?? "Generic"}</span>
        {card.n ? <span>×{card.n}</span> : null}
      </div>
      <div className="t">{card.t}</div>
      <div className="e">{card.e}</div>
      {children}
    </div>
  );
}
