import { useMemo, useState } from "react";
import { DesignNotes, NoteBadge, NoteSummary, Paras } from "./DesignNote.tsx";
import { buildTree, pathTrail, stepText } from "./walk.ts";
import type { Choices, TreeChild, TreeNode } from "./walk.ts";
import { KIND_LABEL } from "./guideTypes.ts";
import type { Scenario, TrailItem } from "./guideTypes.ts";

interface Props {
  sc: Scenario;
  choices: Choices;
  setChoices(c: Choices): void;
  showNotes: boolean;
  onWalk(trail: TrailItem[]): void;
}

interface ViewProps {
  showNotes: boolean;
  choose(stepId: string, optionId: string): void;
}

function Child({ child, ...rest }: { child: TreeChild } & ViewProps) {
  if (child.stub) {
    return <p className="tg-stub dim">Continues at “{child.step.title}” (shown above).</p>;
  }
  return <Node node={child.node} {...rest} />;
}

function Node({ node, showNotes, choose }: { node: TreeNode } & ViewProps) {
  const [open, setOpen] = useState(false);
  const { step, env } = node;
  const chips = step.kind === "decision" || step.kind === "roll";
  const bodyId = `tg-body-${step.id}`;
  const unavailable = node.options.flatMap((o) => (o.available === true ? [] : [{ opt: o.opt, why: o.available }]));
  const selectedHint = node.options.find((o) => o.selected)?.opt.hint;
  return (
    <div className={`tg-node ${step.kind}`}>
      <button className="tg-head" aria-expanded={open} aria-controls={open ? bodyId : undefined} onClick={() => setOpen(!open)}>
        <span className="tg-kind">{step.kind === "end" ? "End" : KIND_LABEL[step.kind]}</span>
        <span className="tg-ntitle">{step.title}</span>
        {showNotes && <NoteBadge notes={step.notes} />}
        <span className="tg-blurb">{step.blurb}</span>
      </button>
      {open && (
        <div id={bodyId} className="tg-nbody">
          <Paras text={stepText(step, env)} />
          {showNotes && <DesignNotes notes={step.notes} />}
        </div>
      )}
      {chips && (
        <div className="tg-chips" role="group" aria-label={`Options: ${step.title}`}>
          {node.options.map((o) => (
            <button
              key={o.opt.id}
              className="chip tg-chip"
              aria-pressed={o.selected}
              disabled={o.available !== true}
              title={o.opt.hint}
              onClick={() => choose(step.id, o.opt.id)}
            >
              {o.opt.label}
            </button>
          ))}
        </div>
      )}
      {chips && selectedHint && <p className="tg-hint dim">{selectedHint}</p>}
      {unavailable.length > 0 && step.kind === "decision" && (
        <ul className="tg-why dim">
          {unavailable.map((o) => (
            <li key={o.opt.id}>
              <b>{o.opt.label}:</b> {o.why}
            </li>
          ))}
        </ul>
      )}
      {node.joined && <Child child={node.joined} showNotes={showNotes} choose={choose} />}
      {node.options.map(
        (o) =>
          o.child && (
            <div key={o.opt.id} className="tg-branch">
              <span className="tg-via mono">↳ {o.opt.crumb ?? o.opt.label}</span>
              <Child child={o.child} showNotes={showNotes} choose={choose} />
            </div>
          ),
      )}
    </div>
  );
}

/** The whole turn as a tree: pick an option and its branch opens beneath it. */
export function FlowTree({ sc, choices, setChoices, showNotes, onWalk }: Props) {
  const [showAll, setShowAll] = useState(false);
  const tree = useMemo(() => buildTree(sc, choices, showAll), [sc, choices, showAll]);
  const choose = (stepId: string, optionId: string) => setChoices({ ...choices, [stepId]: optionId });
  return (
    <div className="tg-tree">
      <div className="row tg-nav">
        <button className="btn tg-tap" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show one path" : "Show all branches"}
        </button>
        <button className="btn primary tg-tap" onClick={() => onWalk(pathTrail(sc, choices))}>
          Walk this path
        </button>
      </div>
      {showNotes && <NoteSummary />}
      {showAll && <p className="dim" style={{ fontSize: 14 }}>Steps that several branches share are shown once, the first time they appear.</p>}
      <Child child={tree} showNotes={showNotes} choose={choose} />
    </div>
  );
}
