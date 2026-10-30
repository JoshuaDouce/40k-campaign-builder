// The step graph behind both views: what a player decides, rolls and gains during one War Round turn.
// Every number and rule here comes from the written rules (Rules, Pitch, Fate Deck and War Room wording).
import { ACTIONS, battleSizeOf, hollowgateRound, isV12, LIGHT_FORCES_MAX_PTS, ORBITS, rpCap, SCOUT_NO_TWISTS, TWISTS, VTYPES } from "../../game/index.ts";
import type { ActionId, ProvinceType } from "../../game/index.ts";
import { cardLimit, sizeInfo, SUPPLY_SHORTAGE } from "./battleMath.ts";
import type { Ctx, Effects, Env, Scenario, Step, StepOption, Tier } from "./guideTypes.ts";

export const START = "turn";

export const DEFAULT_SCENARIO: Scenario = {
  players: 4,
  provinces: true,
  spaceport: true,
  middleHold: false,
  innerHold: false,
  enemyInReach: true,
  unclaimedOuter: true,
  hollowOpen: false,
  forge: false,
  scouted: false,
  rp: 3,
  hand: 2,
  supply: 900,
};

export const EMPTY_CTX: Ctx = {
  action: null,
  tier: null,
  holder: null,
  prov: null,
  underdog: false,
  fortified: false,
  twists: [],
  result: null,
  decisive: false,
};

const actionText = (id: string, sc?: Scenario) => (id === "scout" && sc?.noTwists ? SCOUT_NO_TWISTS : (ACTIONS.find((a) => a.id === id)?.d ?? ""));
const NO_FOOTHOLD = "You hold no provinces, so you can only attack unclaimed provinces on an outer world.";
const NO_ENEMY = "No enemy holds a province you could reach.";

const twistCount = (c: Ctx): number => (c.tier === "holl" ? 2 : c.tier ? ORBITS[c.tier].twists : 1);
const isGarrison = (c: Ctx) => c.action === "conquer" && c.holder === "unclaimed";

// ---------- Options ----------

const finish = (label: string, next: string, effects?: StepOption["effects"]): StepOption => ({ id: "go", label, crumb: null, next, effects });

function tierOption(tier: Tier): StepOption {
  const label = { outer: "Outer world", middle: "Middle world", inner: "Inner world", holl: "The Hollowgate" }[tier];
  return {
    id: tier,
    label,
    crumb: tier === "holl" ? "The Hollowgate" : `${label} province`,
    ...(tier === "holl" && { hint: "A 2000 pt war." }),
    set: (c) => ({ ...c, tier }),
    next: (c) => (c.action === "raid" ? "prov" : "holder"),
    available: ({ sc, ctx }) => {
      const raid = ctx.action === "raid";
      if (raid && tier === "holl") return "This guide treats the Hollowgate as a Conquer target only, so a Raid can't hit it.";
      if (!sc.provinces) {
        if (tier !== "outer") return NO_FOOTHOLD;
        if (raid) return NO_FOOTHOLD;
        return sc.unclaimedOuter ? true : "No unclaimed outer-world province is left.";
      }
      if (tier === "middle" && !(sc.spaceport || sc.middleHold)) return "You need a province on a middle world, or a Spaceport with a warp lane to one.";
      if (tier === "inner" && !(sc.spaceport || sc.innerHold)) return "You need a province on an inner world, or a Spaceport with a warp lane to one.";
      if (tier === "holl") {
        if (!sc.hollowOpen) return `The Hollowgate hasn't opened yet. It opens once 60% of the Reach is claimed, or by War Round ${hollowgateRound(sc)}.`;
        if (!sc.innerHold) return "Only a player holding a province on an inner world can attack the Hollowgate.";
      }
      if (raid && !sc.enemyInReach) return NO_ENEMY;
      return true;
    },
  };
}

const PROV_ORDER: ProvinceType[] = ["capital", "spaceport", "hive", "forge", "fortress", "shrine", "refinery", "settlement", "outpost", "ruins", "graveyard"];
const provOptions: StepOption[] = PROV_ORDER.map((k) => ({
  id: k,
  label: VTYPES[k].n,
  hint: `${VTYPES[k].size} pts. ${VTYPES[k].bonus}`,
  set: (c) => ({ ...c, prov: k }),
  next: (c) => (c.holder === "unclaimed" ? "garrison" : "underdog"),
  available: ({ ctx }) =>
    k === "capital" && ctx.holder === "unclaimed"
      ? "A Capital belongs to a player, so it can't be unclaimed."
      : k === "graveyard" && ctx.tier !== "inner"
        ? "Titan Graveyards are only on inner worlds."
        : true,
  // Titan Graveyards only exist in a 1.2 Reach.
  hidden: k === "graveyard" ? (sc) => !isV12(sc) : undefined,
}));

const twistOptions = (): StepOption[] =>
  TWISTS.map((t, i) => ({
    id: `t${i}`,
    label: `${i + 1} · ${t.t}`,
    crumb: `Twist: ${t.t}`,
    hint: t.e,
    set: (c) => ({ ...c, twists: [...c.twists, i] }),
    next: (c) => (c.twists.length < twistCount(c) ? "twist2" : "size"),
    available: ({ ctx }) => (ctx.twists.includes(i) ? "Already rolled for this battle. A repeat is rolled again." : true),
  }));

function resultEffects(ctx: Ctx, outcome: "win" | "lose" | "draw"): Effects {
  // You are the attacker: Requisition goes to the winner only.
  let rp = 0;
  let cards = 0;
  let provinces = 0;
  if (outcome === "win") {
    rp += 1;
    cards += 1;
    if (ctx.action === "conquer") {
      provinces += 1;
      if (ctx.prov === "capital" && !isGarrison(ctx)) rp += 2;
    } else {
      rp += 1;
      cards += 1;
    }
  }
  return { rp, cards, provinces, supply: 0 };
}

// ---------- Text ----------

function twistText({ ctx, sc }: Env): string {
  const lines = [
    twistCount(ctx) === 1
      ? "Roll a D12 for the Mission Twist."
      : ctx.twists.length === 0
        ? `${ctx.tier === "holl" ? "The Hollowgate" : "An inner world"} has 2 twists. Roll a D12 for the first.`
        : "Roll a D12 for the second twist.",
  ];
  if (sc.scouted) lines.push("You scouted: you may swap one rolled twist for any twist you choose.");
  return lines.join("\n");
}

function sizeLine(pts: number, twists: readonly number[]): string {
  const b = battleSizeOf(pts, twists);
  return `${b.n}: ${b.board} board, ${b.dp} detachment points.`;
}

function sizeText(env: Env): string {
  const { ctx } = env;
  const s = sizeInfo(env);
  const l: string[] = [];
  l.push(ctx.tier === "holl" ? "The Hollowgate is a fixed 2000 pt war." : `${VTYPES[ctx.prov ?? "outpost"].n}: ${s.base} pts.`);
  ctx.twists.forEach((i) => {
    if (TWISTS[i].m !== 1) l.push(`${TWISTS[i].t}: ×${TWISTS[i].m}.`);
  });
  if (s.raid) l.push("Raid: half size.");
  l.push(`Battle size: ${s.size} pts (this guide rounds to the nearest 50 pts and keeps battles to a 500 pt minimum).`);
  l.push(`${sizeLine(s.size, ctx.twists)} Garrison and Underdog bonuses don't change it.`);
  l.push("Supply limits don't change the battle size. If your roster is smaller, you field what you have.");
  if (s.garrison) l.push(`Garrison fight: choose +20% points for you (${s.yours} pts against ${s.size}) or -20% points for the garrison (${s.size} pts against ${s.garrisonLess}), rounded to the nearest 5. Underdog doesn't apply.`);
  else if (ctx.underdog) l.push(`You are the Underdog: +10% points, which this guide works out as ${s.yours} pts (rounded to the nearest 5).`);
  s.auto.forEach((i) =>
    l.push(`${s.size} pts is ${LIGHT_FORCES_MAX_PTS} or fewer, so ${TWISTS[i].t} applies automatically: ${TWISTS[i].e}${s.garrison ? " (It goes by the base size, before the 20%.)" : ""}`),
  );
  return l.join("\n");
}

function cardsText(env: Env): string {
  const held = env.sc.hand + env.tally.cards;
  const l = [`Fate Cards: each side may play up to ${cardLimit(env)} in this battle (1 per 500 pts, minimum 1).`];
  if (env.ctx.twists.includes(SUPPLY_SHORTAGE)) l.push("Supply Shortage limits both sides to 1 Fate Card.");
  l.push(`You hold ${held} card${held === 1 ? "" : "s"}.`);
  l.push("This is your last chance to spend RP before the fight. RP can be spent at any time outside a battle.");
  return l.join("\n");
}

function battleText(env: Env): string {
  const { ctx } = env;
  const s = sizeInfo(env);
  const l: string[] = [];
  const kind = ctx.action === "raid" ? "Raid" : s.garrison ? "Garrison battle" : "Battle";
  l.push(`${kind}: ${s.size} pts${s.garrison ? ` for the garrison and ${s.yours} pts for you, or ${s.garrisonLess} pts for the garrison and ${s.size} pts for you` : ctx.underdog ? ` (${s.yours} pts for you as the Underdog)` : ""}.`);
  l.push(sizeLine(s.size, ctx.twists));
  ctx.twists.forEach((i) => l.push(`Twist (D12 ${i + 1}), ${TWISTS[i].t}: ${TWISTS[i].e}`));
  s.auto.forEach((i) => l.push(`${TWISTS[i].t}: ${TWISTS[i].e}`));
  l.push(`Every battle on a world also uses that world's trait${env.sc.noTwists ? "" : ", on top of any twists"}.`);
  if (ctx.fortified || (ctx.prov === "fortress" && ctx.holder !== "unclaimed")) l.push("Fortified: the defender gets +1 CP and one extra piece of terrain.");
  if (ctx.prov === "capital" && ctx.holder === "enemy" && ctx.action === "conquer") l.push("This is the defender's Capital: if you win, you also steal 2 RP.");
  if (ctx.prov === "shrine") l.push("Shrine: +1 XP to both players' Marked for Glory units in any battle fought here (this guide plays it that way).");
  if (s.garrison) l.push("Garrison: another player runs the defence as a favour and gains nothing.");
  l.push("Before the game, name one unit Marked for Glory (+1 XP after). Play with normal force rules, then record the result.");
  return l.join("\n");
}

/** XP, scar and bookkeeping reminders for the turn-end summary. */
export function afterReminders(ctx: Ctx, sc: Scenario): string[] {
  if (!ctx.result) {
    if (ctx.action === "recuperate") return ["Remove up to 2 Battle Scars from your roster."];
    if (ctx.action === "muster") return ["Add the supply to your supply limit."];
    if (ctx.action === "fortify") return ["Remember which province is fortified: the next defender there gets the bonus."];
    if (ctx.action === "scout") return sc.noTwists ? [] : ["In your next battle you may swap one rolled twist for any twist you choose."];
    return [];
  }
  const l = [
    "1. XP: +1 to every unit that fought and was not destroyed and +1 per enemy unit it destroyed (at most 2 XP a War Round from these), and +1 to the unit you Marked for Glory.",
    "2. Rank-up and honour: a unit that reaches a new rank rolls a D6 (or picks) for 1 Battle Honour per rank gained. No duplicates: re-roll or pick another.",
    "3. Roll for the fallen: each destroyed unit rolls a D6 (Hard to Kill adds 1). On a 1 it gains a Battle Scar; Characters on a 1–2.",
    "4. Battle Scar: roll a D3 on the Battle Scars table and re-roll duplicates. Three scars and the unit is gone.",
    "5. RP and spoils: collect your Requisition and spoils as listed above.",
  ];
  if (ctx.prov === "shrine") l.push("Shrine: both players' Marked for Glory units also get +1 XP.");
  if (ctx.result === "win" && ctx.action === "conquer" && ctx.prov === "shrine") l.push("You now hold a Shrine: +1 XP to your Marked for Glory unit in any battle fought there.");
  if (isGarrison(ctx)) l.push("The garrison player gains no RP, Fate Cards, wins or supply.");
  if (sc.scouted) l.push("Your Scout swap is used up.");
  return l;
}

function aftermathText({ ctx, sc }: Env): string {
  const garrison = isGarrison(ctx);
  const r = ctx.result;
  const l: string[] = [];
  l.push(
    r === "win"
      ? ctx.action === "conquer"
        ? `You take the province.${ctx.prov === "capital" && !garrison ? " It was a Capital, so you steal 2 RP too." : ""}`
        : "Raid won: you steal 1 RP and a random Fate Card from the defender. The province does not change hands."
      : r === "draw"
        ? "A draw. Nobody wins the spoils and the province does not change hands."
        : garrison
          ? "The garrison holds. The province stays unclaimed."
          : "You lose. The province stays with its holder.",
  );
  l.push(
    garrison
      ? `Requisition: ${r === "win" ? "as the winner you gain +1 RP" : "nothing for a loss or a draw"}. The garrison player gets nothing.`
      : `Requisition: ${r === "win" ? "as the winner you gain +1 RP" : "only the winner gains RP, so nothing this time"}.`,
  );
  if (r === "win") l.push("Spoils: the winner draws 1 Fate Card.");
  l.push(`Bank up to ${rpCap(sc)} RP; hand limit 5.`);
  return l.join("\n");
}

function endText({ ctx }: Env): string {
  const l: string[] = [];
  if (ctx.tier === "holl" && ctx.action === "conquer" && ctx.result === "win")
    l.push("You hold the Hollowgate. If it is still yours when the War Round ends, you win the Reach.");
  l.push("Next: the next player in turn order takes their turn (fewest provinces goes first).");
  l.push("After the last player the War Round ends. If someone holds the Hollowgate they win the Reach. Otherwise a new War Round begins: everyone collects RP from Capitals and Hive Cities, and a Fate Card for each Refinery.");
  return l.join("\n");
}

// ---------- Steps ----------

const quiet = (id: Exclude<ActionId, "conquer" | "raid">, label: string, hint: string, next: string, extra?: Partial<StepOption>): StepOption => ({
  id,
  label,
  hint,
  set: (c) => ({ ...c, action: id }),
  next,
  ...extra,
});

const turnOptions: StepOption[] = [
  {
    id: "conquer",
    label: "Conquer",
    hint: "Battle. Win and the province is yours.",
    set: (c) => ({ ...c, action: "conquer" }),
    next: "where",
    available: ({ sc }) =>
      sc.players < 2
        ? "Conquer needs another player to fight."
        : !sc.provinces && !sc.unclaimedOuter
          ? "You hold no provinces and no unclaimed outer-world province is left, so there is nothing you can attack."
          : true,
  },
  {
    id: "raid",
    label: "Raid",
    hint: "Battle at half size. Win to steal 1 RP and a random Fate Card.",
    set: (c) => ({ ...c, action: "raid", holder: "enemy" }),
    next: "where",
    available: ({ sc }) =>
      sc.players < 2
        ? "Raid needs another player to fight."
        : !sc.provinces
          ? "A Raid needs an enemy-held province, and with no provinces you can only reach unclaimed ones."
          : !sc.enemyInReach
            ? NO_ENEMY
            : true,
  },
  quiet("recuperate", "Recuperate", "+1 RP, remove up to 2 Battle Scars.", "recuperate"),
  quiet("muster", "Muster", "+250 supply and 1 Fate Card.", "muster"),
  quiet("fortify", "Fortify", "Your next defender there gets +1 CP and extra terrain.", "fortify", {
    available: ({ sc }) => (sc.provinces ? true : "You hold no province to fortify."),
  }),
  quiet("scout", "Scout", "Draw 1 Fate Card.", "scout"),
];

const resultOption = (id: "win" | "lose" | "draw", label: string, crumb: string): StepOption => ({
  id,
  label,
  crumb,
  set: (c) => ({ ...c, result: id }),
  effects: ({ ctx }) => resultEffects(ctx, id),
  next: (c) => (id === "win" && isGarrison(c) ? "decisive" : "aftermath"),
});

const afterUnderdog = (c: Ctx) => (c.tier === "holl" || c.prov === "fortress" ? "twist1" : "fortified");

const STEP_LIST: Step[] = [
  {
    id: "turn",
    kind: "decision",
    title: "Your turn begins",
    blurb: "Choose one campaign action.",
    text: "It's your turn. Choose your campaign action.",
    options: turnOptions,
    side: ["rp"],
    notes: [
      { cat: "dead", text: "A player who has lost every province can only attack unclaimed outer-world provinces. Once none are left there is no way back onto the map, and no rule removes a player from the campaign." },
      { cat: "nochoice", text: "With no provinces, Raid and Fortify are out and only Conquer can win anything back, so the choice of action is made for you." },
      { cat: "judged", text: "There is no rule for passing or skipping a turn. A quiet action can be settled over the group chat, but a battle needs two players, and nothing covers a defender who can't play." },
      { cat: "nodown", text: "Nothing limits how often a quiet action can be taken, or charges anything for it. Muster can be taken every turn." },
    ],
  },
  {
    id: "where",
    kind: "decision",
    title: "Which world?",
    blurb: "Which world the province is on.",
    text: ({ ctx, sc }) =>
      `${ctx.action === "raid" ? "Raid: which world is the enemy province on?" : "Conquer: which world is the province on?"}${sc.noTwists ? "" : ` The orbit sets the number of twists: ${ORBITS.outer.twists} on outer and middle worlds, ${ORBITS.inner.twists} on inner worlds and the Hollowgate.`}`,
    options: (["outer", "middle", "inner", "holl"] as const).map(tierOption),
    notes: [
      { cat: "judged", text: "A Raid hits 'an enemy province you could reach', and the rules don't say whether the Hollowgate counts. This guide treats the Hollowgate as Conquer-only, so a Raid can't hit it. The rules also don't say whether an unclaimed Hollowgate is fought as a garrison." },
    ],
  },
  {
    id: "holder",
    kind: "decision",
    title: "Who holds it?",
    blurb: "Another player's province, or unclaimed ground.",
    text: "Is the province held by another player, or unclaimed?",
    options: [
      {
        id: "enemy",
        label: "Held by an enemy",
        hint: "You fight its holder.",
        set: (c) => ({ ...c, holder: "enemy" }),
        next: (c) => (c.tier === "holl" ? "underdog" : "prov"),
        available: ({ sc }) => (!sc.provinces ? NO_FOOTHOLD : !sc.enemyInReach ? NO_ENEMY : true),
      },
      {
        id: "unclaimed",
        label: "Unclaimed",
        hint: "You fight its garrison, played by another player.",
        set: (c) => ({ ...c, holder: "unclaimed" }),
        next: (c) => (c.tier === "holl" ? "garrison" : "prov"),
      },
    ],
    notes: [
      { cat: "quirk", text: "A garrison fight needs another player to give up a game as a favour. They gain no RP, Fate Cards, wins or supply, and nothing in the rules gives them a reason to volunteer." },
    ],
  },
  {
    id: "prov",
    kind: "decision",
    title: "What kind of province?",
    blurb: "The type sets the base size.",
    text: "What kind of province is it? Its type sets the base size, and some types matter when they change hands.",
    options: provOptions,
    notes: [
      { cat: "judged", text: "The Shrine is listed as the holder's bonus: +1 XP to 'your' Marked for Glory unit. The rules don't say whether the attacking player gets the same XP in a fight there. This guide gives it to both players' Marked for Glory units." },
    ],
  },
  {
    id: "garrison",
    kind: "decision",
    title: "Find a garrison player",
    blurb: "Another player plays the defence, as a favour.",
    text: "Unclaimed ground has a garrison, and another player (never you) must play it. It's a favour: they gain no RP, Fate Cards, wins or supply. You must fight it, with +20% points for you or -20% points for the garrison (your choice).",
    options: [
      { id: "volunteer", label: "Someone agrees to play it", crumb: "Garrison: a volunteer", next: "twist1" },
      { id: "nobody", label: "Nobody is free to play it", crumb: "No garrison player", next: "stalled" },
    ],
    notes: [],
  },
  {
    id: "underdog",
    kind: "decision",
    title: "Compare empires",
    blurb: "Fewer provinces than the defender? +10% points.",
    text: "Count provinces. If you hold fewer than the defender, you are the Underdog and get +10% points.",
    options: [
      { id: "yes", label: "I hold fewer", crumb: "Underdog (+10%)", hint: "+10% points for you.", set: (c) => ({ ...c, underdog: true }), next: afterUnderdog },
      { id: "no", label: "Equal or more", crumb: "Not the Underdog", next: afterUnderdog },
    ],
    notes: [
      { cat: "judged", text: "The Underdog gets '+10% points', but the rules don't say how to round it, or whether the extra counts toward the Fate Card limit." },
    ],
  },
  {
    id: "fortified",
    kind: "decision",
    title: "Is it fortified?",
    blurb: "A Fortify mark gives the defender +1 CP and extra terrain.",
    text: "Did its holder use Fortify on it? If so the defender gets +1 CP and one extra piece of terrain. (A Fortress always counts as fortified.)",
    options: [
      { id: "no", label: "Not fortified", next: "twist1" },
      { id: "yes", label: "Fortified", hint: "+1 CP and one extra piece of terrain for the defender.", set: (c) => ({ ...c, fortified: true }), next: "twist1" },
    ],
    notes: [{ cat: "judged", text: "The rules say 'one extra piece of terrain' but not who places it, or where." }],
  },
  {
    id: "twist1",
    kind: "roll",
    title: "Mission Twist",
    blurb: "Roll a D12 on the Mission Twists table.",
    text: twistText,
    roll: { die: 12, outcome: (v) => `t${v - 1}` },
    options: twistOptions(),
    notes: [],
  },
  {
    id: "twist2",
    kind: "roll",
    title: "Second Mission Twist",
    blurb: "Inner worlds and the Hollowgate carry 2 twists.",
    text: twistText,
    roll: { die: 12, outcome: (v) => `t${v - 1}` },
    options: twistOptions(),
    notes: [{ cat: "judged", text: "Nothing says what happens if the same twist comes up twice: whether it stacks or is rolled again. This guide rolls again when the second twist repeats the first." }],
  },
  {
    id: "size",
    kind: "info",
    title: "Battle size",
    blurb: "Province size and its adjustments.",
    text: sizeText,
    side: ["rp"],
    options: [finish("Next: Fate Cards", "cards")],
    notes: [
      { cat: "judged", text: "A Raid is 'half size' while battles run from 500 to 2000 pts. A Raid on a small province, or Vanguard Only on a 500 pt outpost, drops below 500 and the rules don't say which wins." },
      { cat: "quirk", text: "The Hollowgate is a 2000 pt war, but rosters are capped by supply, which starts at 750. Until a player has grown it through many Musters, Reinforcements, Outposts and Ruins, they field far fewer points than the battle size." },
    ],
  },
  {
    id: "cards",
    kind: "info",
    title: "Fate Cards and last-minute spending",
    blurb: "Up to 1 Fate Card per 500 pts. Spend RP now if you want to.",
    text: cardsText,
    side: ["rp"],
    options: [finish("Next: play the battle", "battle")],
    notes: [
      { cat: "quirk", text: "With a hand limit of 5 but only 1 card per 500 pts, a small battle lets you play just 1 card, so a full hand mostly sits unused in small fights." },
    ],
  },
  {
    id: "battle",
    kind: "info",
    title: "Play the battle",
    blurb: "Set it up, play it, record who won.",
    text: battleText,
    side: ["battle"],
    options: [finish("The battle is finished", "result")],
    notes: [],
  },
  {
    id: "result",
    kind: "roll",
    title: "Who won?",
    blurb: "Win, lose or draw.",
    text: "How did the battle end? If you're only exploring, let a die stand in for the table.",
    roll: { die: 6, outcome: (v) => (v <= 3 ? "win" : v <= 5 ? "lose" : "draw"), legend: "Practice roll: 1–3 win, 4–5 lose, 6 draw." },
    options: [resultOption("win", "I won", "You win"), resultOption("lose", "I lost", "You lose"), resultOption("draw", "It was a draw", "A draw")],
    notes: [],
  },
  {
    id: "decisive",
    kind: "decision",
    title: "Decisive win?",
    blurb: "Lost under 25% of your army: +1 RP.",
    text: "You beat the garrison. Did you lose under 25% of your army? That's a Decisive win: +1 RP.",
    options: [
      { id: "yes", label: "Yes, under 25% lost", crumb: "Decisive win", effects: { rp: 1 }, set: (c) => ({ ...c, decisive: true }), next: "aftermath" },
      { id: "no", label: "No", crumb: "Not decisive", next: "aftermath" },
    ],
    notes: [{ cat: "judged", text: "'Under 25% of your army' isn't defined: points, models or units, and who counts them." }],
  },
  {
    id: "aftermath",
    kind: "info",
    title: "After the battle",
    blurb: "XP, scars, requisition, supply, spoils.",
    text: aftermathText,
    side: ["rp"],
    options: [finish("Finish my turn", "end")],
    notes: [
      { cat: "quirk", text: "RP stops at 10 and a hand at 5. Anything gained beyond that is simply lost, so a full hand or bank wastes Muster, Scout, spoils and Recuperate." },
      { cat: "judged", text: "A Raid steals a random Fate Card, but the rules don't say what happens if your hand is already at the limit of 5." },
    ],
  },
  {
    id: "recuperate",
    kind: "info",
    title: "Recuperate",
    blurb: "A quiet turn: +1 RP and heal scars.",
    text: actionText("recuperate"),
    side: ["rp"],
    options: [finish("Do it", "end", { rp: 1 })],
    notes: [{ cat: "nodown", text: "Recuperate costs nothing and has no limit. The only ceiling is the RP you can bank." }],
  },
  {
    id: "muster",
    kind: "info",
    title: "Muster",
    blurb: "A quiet turn: more supply and a card.",
    text: ({ sc }) => `${actionText("muster")}${sc.forge ? " Your Forge gives +150 more supply." : ""}`,
    side: ["rp"],
    options: [finish("Do it", "end", ({ sc }) => ({ supply: 250 + (sc.forge ? 150 : 0), cards: 1 }))],
    notes: [{ cat: "nodown", text: "Muster gives supply and a Fate Card for nothing, every time it's taken. The only ceiling is the hand limit of 5." }],
  },
  {
    id: "fortify",
    kind: "info",
    title: "Fortify",
    blurb: "Mark a province you hold.",
    text: actionText("fortify"),
    side: ["rp"],
    options: [finish("Do it", "end")],
    notes: [],
  },
  {
    id: "scout",
    kind: "info",
    title: "Scout",
    blurb: "A quiet turn for a Fate Card.",
    text: ({ sc }) => actionText("scout", sc),
    side: ["rp"],
    options: [finish("Do it", "end", { cards: 1 })],
    notes: [{ cat: "judged", text: "Scout allows a swap 'in your next battle', but the rules don't say what happens if you Scout twice before fighting." }],
  },
  {
    id: "stalled",
    kind: "end",
    title: "Nobody can play the garrison",
    blurb: "The rules don't say what happens next.",
    text: "You must fight the garrison, but nobody is free to play it. The written rules don't cover this: settle it at the table, for example by waiting for a volunteer or choosing another action.",
    options: [],
    notes: [{ cat: "judged", text: "A garrison fight can't be declined, but the rules don't say what happens when nobody is free to play it." }],
  },
  {
    id: "end",
    kind: "end",
    title: "Turn over",
    blurb: "What happens next.",
    text: endText,
    options: [],
    notes: [
      { cat: "quirk", text: "The Hollowgate is only checked at the end of the War Round. A player who takes it on the last turn of the round wins with no one able to answer, while one who takes it earlier gives everyone after them a turn to retake it." },
    ],
  },
];

export const STEPS: Record<string, Step> = Object.fromEntries(STEP_LIST.map((s) => [s.id, s]));
export const STEP_COUNT = STEP_LIST.length;
