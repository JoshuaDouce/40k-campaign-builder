/** Name and effect as plain text, for phones where a hover title can't be read. */
export function EffectList({ items, tone }: { items: readonly { n: string; e?: string }[]; tone: "hon" | "scar" | "train" }) {
  if (!items.length) return null;
  return (
    <ul className={`fxlist ${tone}`}>
      {items.map((x) => (
        <li key={x.n}>
          <b>{x.n}</b> {x.e}
        </li>
      ))}
    </ul>
  );
}
