// "Any time" choices a player can slip in around the main steps.
import { HAND_LIMIT, reinforceCost, REINFORCE_SUPPLY } from "../../game/index.ts";
import { cardLimit } from "./battleMath.ts";
import type { Env, SideAction } from "./guideTypes.ts";

const needRp = (env: Env, cost: number): true | string => (env.sc.rp + env.tally.rp >= cost ? true : `You need ${cost} RP.`);

export const SIDE_ACTIONS: SideAction[] = [
  {
    id: "reinforcements",
    group: "rp",
    label: "Reinforcements",
    hint: (sc) => `${reinforceCost(sc)} RP: +${REINFORCE_SUPPLY} pts to your supply limit.`,
    effects: (sc) => ({ rp: -reinforceCost(sc), supply: REINFORCE_SUPPLY }),
    available: (env) => needRp(env, reinforceCost(env.sc)),
  },
  { id: "surgeon", group: "rp", label: "Field Surgeon", hint: "1 RP: remove one Battle Scar.", effects: { rp: -1 }, available: (env) => needRp(env, 1) },
  {
    id: "deck",
    group: "rp",
    label: "Requisition the Deck",
    hint: "1 RP: draw one Fate Card.",
    effects: { rp: -1, cards: 1 },
    available: (env) => (env.sc.hand + env.tally.cards >= HAND_LIMIT ? "Your hand is full (limit 5)." : needRp(env, 1)),
  },
  { id: "promotion", group: "rp", label: "Promotion", hint: "1 RP: give a Character Battle Training (+10 pts, up to 3), or make a Veteran unit's sergeant a Character.", effects: { rp: -1 }, available: (env) => needRp(env, 1) },
  { id: "recruits", group: "rp", label: "Seasoned Recruits", hint: "2 RP: add a new unit that starts at 3 XP (Blooded).", effects: { rp: -2 }, available: (env) => needRp(env, 2) },
  {
    id: "playcard",
    group: "battle",
    label: "Play a Fate Card",
    hint: "Reveal it, use it, then discard it.",
    effects: { cards: -1 },
    available: (env, used) => {
      if (env.sc.hand + env.tally.cards < 1) return "You have no Fate Cards in hand.";
      const lim = cardLimit(env);
      return used >= lim ? `You've reached the limit of ${lim} for this battle.` : true;
    },
  },
];
