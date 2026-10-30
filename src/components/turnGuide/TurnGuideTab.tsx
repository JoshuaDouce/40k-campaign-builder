import { useMemo, useState } from "react";
import { toggleOn } from "../../game/index.ts";
import { useOptionalCampaign } from "../../store/useCampaign.ts";
import { FlowTree } from "./FlowTree.tsx";
import { ScenarioPanel } from "./ScenarioPanel.tsx";
import { DEFAULT_SCENARIO } from "./stepGraph.ts";
import { Walkthrough } from "./Walkthrough.tsx";
import type { Scenario, SideUse, TrailItem } from "./guideTypes.ts";
import { trailChoices } from "./walk.ts";
import type { Choices } from "./walk.ts";

type View = "walk" | "tree";

/** A practice run of one War Round turn. Reads and changes nothing in the campaign. */
export function TurnGuideTab() {
  const [view, setView] = useState<View>("walk");
  const [showNotes, setShowNotes] = useState(true);
  const [sc, setSc] = useState<Scenario>(DEFAULT_SCENARIO);
  const [trail, setTrail] = useState<TrailItem[]>([]);
  const [sides, setSides] = useState<SideUse[]>([]);
  const [choices, setChoices] = useState<Choices>({});
  // In a campaign with Mission Twists off, the guide follows suit (outside a campaign every rule is on).
  const campaign = useOptionalCampaign();
  const noTwists = !!campaign && !toggleOn(campaign.state, "twists");
  const live = useMemo<Scenario>(() => (noTwists ? { ...sc, noTwists } : sc), [sc, noTwists]);

  const changeScenario = (next: Scenario) => {
    setSc(next);
    setTrail([]);
    setSides([]);
  };
  const seeInTree = () => {
    setChoices({ ...choices, ...trailChoices(trail) });
    setView("tree");
  };
  const walkPath = (path: TrailItem[]) => {
    setTrail(path);
    setSides([]);
    setView("walk");
  };

  return (
    <section className="tab" id="turn">
      <h2>Turn Guide</h2>
      <p className="dim">A practice run of one turn in a War Round: what you can choose, what it costs and what you gain. It changes nothing in your campaign.</p>

      <div className="row tg-top">
        <div className="tg-seg" role="group" aria-label="View">
          <button className="tg-tap" aria-pressed={view === "walk"} onClick={() => setView("walk")}>
            Walkthrough
          </button>
          <button className="tg-tap" aria-pressed={view === "tree"} onClick={() => setView("tree")}>
            Flow tree
          </button>
        </div>
        <button className="chip tg-tap" aria-pressed={showNotes} onClick={() => setShowNotes(!showNotes)}>
          Design notes: {showNotes ? "on" : "off"}
        </button>
      </div>

      <ScenarioPanel sc={live} onChange={changeScenario} />

      {view === "walk" ? (
        <Walkthrough
          sc={live}
          trail={trail}
          setTrail={setTrail}
          sides={sides}
          setSides={setSides}
          showNotes={showNotes}
          onSeeInTree={seeInTree}
          onNextTurn={changeScenario}
        />
      ) : (
        <FlowTree sc={live} choices={choices} setChoices={setChoices} showNotes={showNotes} onWalk={walkPath} />
      )}
    </section>
  );
}
