// Static game data, copied verbatim from reference/index.html (rule, card, twist and faction wording must not drift).
import type { ActionDef, Card, FactionInfo, FactionName, Hollowgate, OrbitDef, OrbitKey, PlanetType, PlanetTypeDef, ProvinceType, ProvinceTypeDef, SideKey, TwistDef } from "./types.ts";

export const FACTIONS: Record<FactionName, FactionInfo> = {
  "Space Marines":{c:"#4f7fc4",side:"imp",want:"to hold the Hollowgate until the fleet arrives",open:"A lone strike squad, cut off after their drop pod scattered."},
  "Astra Militarum":{c:"#8f9a5a",side:"imp",want:"to defend the hive they were born in",open:"A local defence regiment, the last one still answering vox."},
  "Adepta Sororitas":{c:"#c45a5a",side:"imp",want:"to recover a holy relic buried in the Vesk Ossuary",open:"A pilgrim escort that refused the order to evacuate."},
  "Adeptus Mechanicus":{c:"#b56b3a",side:"imp",want:"to salvage the STC fragment beneath Forge Thessaly",open:"A salvage team that arrived to strip the forge before anyone notices."},
  "Chaos Space Marines":{c:"#9b3a3a",side:"cha",want:"to widen the rift and make the Reach their own",open:"A raiding cell that came through the Hollowgate first."},
  "Death Guard":{c:"#7d8a3e",side:"cha",want:"to seed a plague in the agri-domes",open:"A plague-bearer vanguard testing a new contagion."},
  "Orks":{c:"#4f9a46",side:"xen",want:"a good fight, and the scrap from every wreck",open:"A mob of Boyz who crashed here and decided they liked it."},
  "Necrons":{c:"#47a89a",side:"xen",want:"to put the waking tomb under Kell back to order",open:"A tomb's first guardians, awake and very annoyed."},
  "Tyranids":{c:"#9a5ab0",side:"xen",want:"to consume every living thing in the Reach",open:"A splinter vanguard, the first scent of a hive fleet."},
  "Genestealer Cults":{c:"#a07ab8",side:"xen",want:"to welcome the Star Children by any means",open:"A cult cell revealing itself in the underhive."},
  "Aeldari":{c:"#d1b84a",side:"xen",want:"to seal the rift before it reaches their craftworld",open:"A small warhost following a farseer's warning."},
  "T'au Empire":{c:"#6aa3b8",side:"xen",want:"to win the Reach's survivors over to the Greater Good",open:"A hunter cadre offering protection to anyone who signs."}
};
export const SIDE_HOOK: Record<SideKey, readonly [string, string]> = {
  "imp-imp":["Uneasy allies","Both serve the Throne but neither trusts the other's orders. Their first clash is a misunderstanding in the dark that turns into a blood debt."],
  "cha-cha":["Rival warbands","The same dark gods, different masters. Only one of them will be chosen to open the rift."],
  "imp-cha":["Blood feud","Traitors were hiding inside the Imperial ranks when the rift opened. Someone here let them in."],
  "imp-xen":["Invaders","The Imperium sees only another xenos threat. The xenos see a dying empire too slow to hold what it claims."],
  "cha-xen":["Opportunists","Each sees the other as a tool. Every alliance ends with a knife in the back."],
  "xen-xen":["Ancient rivals","Both came for the Reach for reasons the humans cannot understand. Neither will share it."]
};
export const BATTLES: readonly string[] = ["Supply Drop: fight over a crashed lander in the middle of the board.","Night Raid: visibility capped at 18\" in battle round 1 and 2.","Recon: each side's first unit to reach the far table half scores 3 VP.","Ambush: the defender deploys first, the attacker can deep-strike one extra unit.","Last Stand: one side holds a ruin, the other has 5 turns to take it.","Breakthrough: score VP for every unit you move off the far edge."];

export const ORBITS: Record<OrbitKey, OrbitDef> = {
  outer:{name:"Outer worlds",mult:1,twists:1,r:146},
  middle:{name:"Middle worlds",mult:1.5,twists:1,r:100},
  inner:{name:"Inner worlds",mult:2,twists:2,r:56}};
export const PTYPES: Record<PlanetType, PlanetTypeDef> = {
  hive:{n:"Hive World",c:"#8a7d6e",trait:"Dense ruins: set up the table with heavy, tall terrain.",fav:"hive"},
  death:{n:"Death World",c:"#4d7744",trait:"Hostile wildlife: at the end of each turn, roll a D6 for each unit not in cover. On a 6 it suffers 1 mortal wound.",fav:"outpost"},
  forge:{n:"Forge World",c:"#9a5a35",trait:"Industrial sprawl: vehicles within 3\" of terrain count as being in cover.",fav:"forge"},
  agri:{n:"Agri World",c:"#a3934c",trait:"Open fields: lighter terrain. Crop fields count as light cover.",fav:"settlement"},
  shrine:{n:"Shrine World",c:"#b3a280",trait:"Fervour: both sides may re-roll Battle-shock tests.",fav:"shrine"},
  moon:{n:"Dead Moon",c:"#6c6863",trait:"Low gravity, no air: +1\" Move for Infantry. No Aircraft.",fav:"ruins"},
  ice:{n:"Ice World",c:"#86a7b5",trait:"Blizzards: nothing can be targeted from more than 24\" away.",fav:"outpost"},
  ash:{n:"Ash World",c:"#7d3b2f",trait:"Lava vents: a unit that Advances rolls a D6. On a 1 it suffers 1 mortal wound.",fav:"refinery"}};
export const VTYPES: Record<ProvinceType, ProvinceTypeDef> = {
  capital:{n:"Capital",size:750,bonus:"Home of a warband. +1 RP at the start of each War Round. Counts as a Spaceport. If lost, the taker also steals 2 RP.",suf:["Landing"]},
  spaceport:{n:"Spaceport",size:750,bonus:"From this planet you can attack any province on a planet linked by a warp lane.",suf:["Port","Docks","Landing Fields"]},
  hive:{n:"Hive City",size:1000,bonus:"+1 RP at the start of each War Round.",suf:["Spire","Hive","Stack"]},
  forge:{n:"Forge",size:750,bonus:"Your Muster action gives +150 more supply.",suf:["Works","Foundry","Forge"]},
  fortress:{n:"Fortress",size:1000,bonus:"Always counts as Fortified when its holder defends it.",suf:["Bastion","Keep","Citadel"]},
  shrine:{n:"Shrine",size:500,bonus:"+1 XP to your Marked for Glory unit in any battle fought here.",suf:["Ossuary","Reliquary","Chapel"]},
  refinery:{n:"Refinery",size:750,bonus:"Draw 1 extra Fate Card at the start of each War Round.",suf:["Sump","Refinery","Wells"]},
  settlement:{n:"Settlement",size:600,bonus:"No bonus. Quiet, cheap ground to grow an empire.",suf:["Hold","Stead","Township"]},
  outpost:{n:"Outpost",size:500,bonus:"No bonus. A small, sharp fight.",suf:["Watch","Post","Station"]},
  ruins:{n:"Ruins",size:1000,bonus:"No bonus. Wide open killing ground.",suf:["Wastes","Barrens","Ruins"]}};
export const HOLL: Hollowgate = {id:"holl",name:"The Hollowgate",type:"rift",pl:null};
export const PLANET_NAMES: readonly string[] = ["Varkesh Prime","Kell","Ostrava","Thessaly","Grael","Vesk","Orrin's Tomb","Cinderfall","Lantern","Choirhold","Sorrow","Aster"];

export const PREFIX: readonly string[] = ["Ash","Iron","Grey","Thorn","Saint's","Black","Hollow","Cinder","Mire","Vor","Kalt","Rust","Gallow","Dusk","Pale","Brine","Ember","Wyrm","Tallow","Scour","Red","Bone","Salt","Gilt","Ruin","Widow's","Ghost","Ochre","Slag","Weeping","Old","Low","High","Far","Cold","Dread"];

export const GENERIC: readonly (Card & { n: number })[] = [
  {t:"Grim Resolve",e:"One unit auto-passes every Battle-shock test this game.",n:3},
  {t:"Sudden Advance",e:"Before the first turn, one Infantry unit makes a 6\" move.",n:2},
  {t:"Hidden Cache",e:"Pick one unit. Its ranged weapons gain +1 Strength this game.",n:2},
  {t:"Lucky Shot",e:"Once, re-roll one hit, wound or damage roll.",n:4},
  {t:"Dug In",e:"One unit starting the game in cover gets +1 to its armour saves until it moves.",n:2},
  {t:"Scout Report",e:"After both sides deploy, redeploy up to two of your units.",n:2},
  {t:"Fog of War",e:"Your opponent cannot target your units more than 24\" away in round 1.",n:1},
  {t:"Field Medic",e:"After this battle, one destroyed unit automatically passes its roll for the fallen.",n:3},
  {t:"Inspired",e:"Your Marked for Glory unit gains +1 to hit this game.",n:2},
  {t:"Forced March",e:"One unit may Advance and still shoot this game (as if Assault).",n:2},
  {t:"Ambush Point",e:"One unit gains Deep Strike for this battle.",n:2},
  {t:"Sabotage",e:"Choose one enemy vehicle. It starts the game having lost D3 wounds.",n:1},
  {t:"Rallying Cry",e:"Once, a unit below half strength regains its full OC until your next turn.",n:2},
  {t:"Spoils of War",e:"If you win this battle, gain 1 extra RP.",n:2},
  {t:"Veteran Instinct",e:"Once, one unit can shoot or fight after a Fall Back.",n:2},
  {t:"Desperate Hour",e:"Play only if you are behind on VP at the start of round 4. Gain 1 extra CP.",n:2}
];
export const FACCARDS: Record<FactionName, readonly Card[]> = {
  "Space Marines":[{t:"Angels Descend",e:"One unit arriving from reserves may charge on the turn it arrives."},{t:"Oath of the Lost",e:"Re-roll wound rolls against one enemy unit chosen at the start of the game."}],
  "Astra Militarum":[{t:"Artillery Barrage",e:"Before round 1, roll a D6 for each enemy unit in their deployment zone: on a 6 it suffers D3 mortal wounds."},{t:"Hold the Line",e:"Infantry within 6\" of an objective get +1 OC this game."}],
  "Adepta Sororitas":[{t:"Martyr's Vow",e:"The first time a Character would be destroyed, it stays on 1 wound instead."},{t:"Relic Bearer",e:"One unit ignores Battle-shock and gains +1 to hit in melee."}],
  "Adeptus Mechanicus":[{t:"Salvage Protocol",e:"After the battle, gain 1 RP for every enemy vehicle destroyed (max 2)."},{t:"Overclocked",e:"One unit gains +1 Attack on its ranged weapons for one shooting phase."}],
  "Chaos Space Marines":[{t:"Dark Pact",e:"One unit gains Lethal Hits this game; it suffers 1 mortal wound at the end of each of your turns."},{t:"Through the Rift",e:"One unit sets up anywhere more than 9\" from enemies at the end of round 1."}],
  "Death Guard":[{t:"Bloated Resilience",e:"One unit gains a 5+ Feel No Pain this game."},{t:"Creeping Plague",e:"Enemy units within 3\" of one chosen objective get −1 Toughness."}],
  "Orks":[{t:"Waaagh! Early",e:"Your Waaagh! can be called in round 1 even if not normally allowed, or one unit gets +2\" charge."},{t:"Scavenged Kit",e:"One vehicle regains D3 wounds at the start of each of your turns."}],
  "Necrons":[{t:"Protocols Restored",e:"Reanimation Protocols on one unit restore 1 extra wound each time."},{t:"Tomb Defenders",e:"Units within 6\" of your home objective get +1 to saves."}],
  "Tyranids":[{t:"Burrowed Swarm",e:"One unit sets up from reserves at the end of round 1, more than 6\" from enemies."},{t:"Adaptive Carapace",e:"Choose a weapon type after deployment; one unit gets −1 Damage against it."}],
  "Genestealer Cults":[{t:"Cult Uprising",e:"Return one destroyed Infantry unit at full strength once this game."},{t:"Long Planned",e:"Pick an objective; you control it at the start of round 1."}],
  "Aeldari":[{t:"Fate Foreseen",e:"Gain one extra fate dice (or one re-roll if you don't use them)."},{t:"Webway Strike",e:"One unit can redeploy anywhere after both sides have deployed."}],
  "T'au Empire":[{t:"Coordinated Fire",e:"Two units can target the same enemy and both get +1 to hit."},{t:"Local Allies",e:"Add a free 5-model unit of friendly human auxiliaries (use Kroot or Guardsmen stats) for this game."}]
};

export const TWISTS: readonly TwistDef[] = [
  {t:"Clear Skies",e:"No twist. Fight as planned.",m:1},
  {t:"Vanguard Only",e:"Both sides field 25% fewer points.",m:0.75},
  {t:"Full Commitment",e:"Both sides field 25% more points (up to supply limit).",m:1.25},
  {t:"Light Forces",e:"No unit with Toughness 10 or higher.",m:1},
  {t:"Smoke and Ash",e:"Ranged attacks targeting a unit more than 12\" away get −1 to hit.",m:1},
  {t:"Night Fighting",e:"Nothing can be targeted from more than 18\" away in rounds 1 and 2.",m:1},
  {t:"Scattered Landing",e:"Half your units (rounding up) start in Strategic Reserves and arrive from round 2.",m:1},
  {t:"Close Quarters",e:"Play on a 44\" x 30\" table with extra ruins.",m:1},
  {t:"Supply Shortage",e:"Both sides start with 1 fewer CP and can play only 1 Fate Card.",m:1},
  {t:"Warp Storm",e:"All Battle-shock tests are taken at −1.",m:1},
  {t:"Blood Price",e:"Each unit gets +1 extra XP for every enemy unit it destroys.",m:1},
  {t:"Last Light",e:"The battle ends after round 4.",m:1}];
export const ACTIONS: readonly ActionDef[] = [
  {id:"conquer",n:"Conquer",battle:true,d:"Attack a province next to one you hold, or on a world linked by warp lane to one where you hold a Spaceport or your Capital. Win to take it."},
  {id:"raid",n:"Raid",battle:true,d:"Strike an enemy province you could reach, at half size. Win to steal 1 RP and a random Fate Card. The province does not change hands."},
  {id:"recuperate",n:"Recuperate",battle:false,d:"Gain 1 RP and remove up to 2 Battle Scars from your roster."},
  {id:"muster",n:"Muster",battle:false,d:"+250 pts to your supply limit and draw 1 Fate Card."},
  {id:"fortify",n:"Fortify",battle:false,d:"Mark a province you hold. The next defender there gets +1 CP and one extra piece of terrain."},
  {id:"scout",n:"Scout",battle:false,d:"Draw 1 Fate Card. In your next battle you may swap one rolled twist for any twist you choose."}];
export const ALT: readonly string[] = ["#c9c2b2","#5a8fd6","#d65a8f","#e0a23c","#58b8a8","#9c7ad6","#cc6b3d"];

/** Unit ranks by XP: [name, XP needed, Battle Honour slots]. Index order is rank order. */
export const RANKS: readonly { n: string; xp: number; slots: number }[] = [
  { n: "Green", xp: 0, slots: 0 },
  { n: "Blooded", xp: 3, slots: 1 },
  { n: "Veteran", xp: 8, slots: 2 },
  { n: "Elite", xp: 15, slots: 3 },
  { n: "Legend of the Reach", xp: 25, slots: 4 },
];
/** Battle Honours, in D6 order (index 0 = a roll of 1). */
export const HONOURS: readonly { n: string; e: string }[] = [
  { n: "Steady Aim", e: "Re-roll hit rolls of 1 with ranged attacks." },
  { n: "Brawlers", e: "Re-roll wound rolls of 1 in melee." },
  { n: "Grizzled", e: "+1 to Battle-shock and Leadership tests." },
  { n: "Fleet", e: '+1" to Move.' },
  { n: "Hard to Kill", e: "+1 to its roll for the fallen after battle." },
  { n: "Objective Hunters", e: "+1 OC." },
];
/** Battle Scars, in D3 order (index 0 = a roll of 1). */
export const SCARS: readonly { n: string; e: string }[] = [
  { n: "Shaken", e: "−1 to Battle-shock tests." },
  { n: "Crippled", e: '−1" Move, cannot Advance and charge.' },
  { n: "Worn Gear", e: "Worsen BS or WS of one weapon by 1." },
];
