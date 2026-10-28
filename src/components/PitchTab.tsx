import { useState } from "react";
import { useOptionalCampaign } from "../store/useCampaign.ts";
import type { TabId } from "../store/useDevicePrefs.ts";

const STEPS: ReadonlyArray<readonly [string, string]> = [
  ["The setting", "Three years ago the Hollowgate rift tore open at the heart of the Varkesh Reach. The Imperium's grip collapsed. The system is a scatter of worlds, each split into provinces, and every faction has its own reason for being here. The more players, the more worlds."],
  ["Build a 750 pt roster", "Name your warband and start with one Character, your Warlord, and at least 2 Battleline. No Epic Heroes or named characters, ever. Your leaders are nobodies who might become somebody. Start with 0 Requisition Points (RP) and a Capital province on one of the outer worlds. Earn RP from your Capital and by winning battles."],
  ["The War Round", "The campaign is played in War Rounds. At the start of each, everyone collects RP from their Capital and Hive Cities. Then everyone plans in secret and plays at the same time; only players on the same province wait."],
  ["Take a campaign action", "Pick one: Conquer, Raid, Recuperate, Muster, Fortify or Scout. Conquer and Raid start a battle. The others build you up without fighting."],
  ["Generate the battle", "The province sets the size: an outpost is small, a hive city is big. Then roll a Mission Twist like \"no Toughness 10+\" or \"−1 to hit at range\", two on the inner worlds closest to the rift. Otherwise it's a normal game of 40k."],
  ["Outcome and rewards", "Units gain XP and risk scars. The winner earns 1 RP and takes the province. The round ends when every pick is done."],
  ["Grow your empire", "Spread province by province across your world, seize a Spaceport, then jump along warp lanes to the next world. Inner worlds mean two twists at once."],
  ["The Hollowgate", "Once 60% of the Reach is claimed (or by War Round 8), the rift opens: a 2000 pt fight reached from the inner worlds. Whoever holds it at the end of a War Round wins the Reach."],
];

function pitchText(): string {
  const lines = ["THE VARKESH REACH — 40k narrative campaign", ""];
  STEPS.forEach(([title, body], i) => lines.push(`${i + 1}. ${title.toUpperCase()} — ${body}`));
  lines.push(
    "",
    "Battles are fought over provinces on a map of worlds. The province sets the size (500–2000 pts), plus a Mission Twist. No Epic Heroes or named characters.",
    "Who's in, and what are you playing?",
  );
  return lines.join("\n");
}

/** Old-browser fallback: select text in an off-screen textarea and use execCommand. */
function legacyCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("aria-hidden", "true");
  ta.tabIndex = -1;
  ta.style.position = "absolute";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    ta.remove();
  }
}

export function PitchTab({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const campaign = useOptionalCampaign();
  const [copyMsg, setCopyMsg] = useState("");

  const copy = () => {
    const txt = pitchText();
    const fallback = () => setCopyMsg(legacyCopy(txt) ? "Copied" : "Select and copy the text manually");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(() => setCopyMsg("Copied"), fallback);
    } else {
      fallback();
    }
  };

  return (
    <section className="tab" id="pitch">
      {campaign !== null && campaign.state.round === 0 && (
        <div className="su-pointer">
          Ready to start?{" "}
          <button className="lnk" onClick={() => onNavigate("setup")}>
            Go to Setup.
          </button>
        </div>
      )}
      <h2>How it works, step by step</h2>
      <p className="dim">Read this out to the group, or copy it into the group chat.</p>
      <ol className="steps">
        {STEPS.map(([title, body]) => (
          <li key={title}>
            <div>
              <b>{title}</b>
              {body}
            </div>
          </li>
        ))}
      </ol>
      <div className="row">
        <button className="btn primary" onClick={copy}>
          Copy pitch for group chat
        </button>
        <span className="msg" style={{ color: "var(--verd)" }} role="status">
          {copyMsg}
        </span>
      </div>
      <div className="note">
        <b>No epic heroes.</b> No unit with the Epic Hero keyword and no named character, even "counts-as". Your Characters are built from datasheets and named by you.
      </div>
    </section>
  );
}
