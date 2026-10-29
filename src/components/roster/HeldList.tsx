/** What a unit holds, one row each: the name, what it does, and Remove when it can be taken off. */
export function HeldList({ items, tone, onRemove }: { items: readonly { n: string; e?: string; locked?: boolean }[]; tone: "hon" | "scar" | "train"; onRemove?(n: string): void }) {
  if (!items.length) return null;
  return (
    <ul className={`held ${tone}`}>
      {items.map((x) => (
        <li key={x.n}>
          <span className="txt">
            <b>{x.n}</b>
            {x.e && <small>{x.e}</small>}
          </span>
          {x.locked ? (
            <span className="lock">Locked</span>
          ) : onRemove ? (
            <button type="button" className="btn sm" aria-label={`Remove ${x.n}`} onClick={() => onRemove(x.n)}>
              Remove
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
