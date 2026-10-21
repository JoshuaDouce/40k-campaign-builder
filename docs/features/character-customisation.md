# Character customisation — scope (product-owner, 2026-10-21)

Extends the Roster tab (PR #6). Characters only (`isCharacter`, the Warlord included), except the career record, which every unit gets.

## User decisions
- Warlord death: when destroyed it does **not** roll for the fallen; it automatically takes a Character Battle Scar (D3). No RP penalty. The Warlord is never removed.
- Relics: random (D6 or pick), earned from claiming a Shrine or playing a Fate Card (honour-system). Max 3 per Character, no duplicates. +10 pts flat each.
- Tables drafted by PO, reviewed by the user with the design.
- Hall of Heroes is visible to the whole campaign.

## Stories and acceptance criteria (check by hand at ~400px)

**A. Identity**
- Unit editor shows Title and Backstory (plain text, max 280, live counter) only for Characters; Warlord trait (free text) only for the Warlord.
- Card shows "Name, the Title"; trait, enhancement and backstory in a secondary/collapsed block. A Character with none set looks as today.
- Non-Characters drop leftover title/backstory/trait on save (as `enhancement` does today).

**B. Character tables**
- Post-battle helper: Characters roll/pick on Character Honours (D6) and Character Scars (D3); other units keep the generic tables.
- Rules tab lists both new tables next to the generic ones, with a note on who uses which.
- No duplicates per unit across both honour lists.
- Existing generic honours/scars on Characters stay valid (no migration). A legacy Hard to Kill still gives +1 to the fallen roll.

**C. Relics**
- Character card: "Roll a relic" → pick source ("Claimed a Shrine" / "Played a Fate Card") → roll D6 or pick; duplicates prompt re-roll/pick.
- Log: "X of Y finds Orrin's Ward (Shrine)."
- At 3 relics the button is disabled with a short note. Relics can be removed manually (mistake fix, not logged).
- Points = honours-adjusted points (rounded to 5, as today) + 10 × relics. Roster total reflects it.
- Text only; no automated effects; sources not verified.

**D. Career record**
- Every unit: `battles`, `kills` (0 if missing; no backfill).
- Post-battle helper: units marked fought get battles +1; entered kills add to career kills (same eligibility as XP). XP override doesn't affect kills.
- Characters show "7 battles · 12 kills" prominently; others small. Editable in the unit editor.

**E. Hall of Heroes**
- Sub-view/toggle in the Roster tab (not a new top-level tab), visible to all members for all players, grouped by player in player colour.
- Living: name, title, datasheet, rank, relic count, battles, kills.
- Fallen (memorial, newest first): name, title, datasheet, rank at death, battles, kills, cause, player.
- Removing a Character moves it to the memorial. Manual removal asks "Why did they fall?" (optional; default "Retired from the roster"). Third-scar removal: cause "Third Battle Scar". Non-Characters: unchanged.
- Removing a player keeps their memorial entries. Memorial is read-only except owner can delete an entry.

**F. Warlord**
- Warlord marked destroyed: no fallen roll; takes a Character Scar (roll D3 or pick). No RP penalty.
- Never removed. At three scars, a new scar replaces the oldest.
- Other Characters: fallen roll on 1–2, third scar removes them (to the memorial).

## Tables (draft — user to review)

**Character Battle Honours (D6)**
| D6 | Honour | Effect |
|---|---|---|
| 1 | Tactical Genius | Once per battle, gain 1 CP. |
| 2 | Duellist | +1 to hit rolls in melee against Characters. |
| 3 | Fearful Reputation | Enemy units within 6" subtract 1 from their Battle-shock tests. |
| 4 | Unyielding | Once per battle, ignore the damage from one wound allocated to this model. |
| 5 | Master of Arms | +1 Attack on one of its melee weapons. |
| 6 | Voice of Command | Friendly units within 6" re-roll their charge rolls. |

**Character Battle Scars (D3)**
| D3 | Scar | Effect |
|---|---|---|
| 1 | Grievous Wound | Starts its next battle with 1 fewer Wound. After that battle, the scar heals and is removed. |
| 2 | Lost an Eye | −1 BS on its ranged weapons. |
| 3 | Withered Arm | −1 Strength on its melee weapons. |

Grievous Wound is the only temporary scar: it counts toward the three-scar limit until it heals. It heals after the next battle the unit fights (based on scars held before that battle; one gained this battle is not cleared in the same report).

**Relics (D6)**
| D6 | Relic | Effect |
|---|---|---|
| 1 | Orrin's Ward | The bearer gains a 5+ invulnerable save, or improves an existing one by 1 (best 4+). |
| 2 | Tomb-Shard of Kell | Once per battle, the bearer may re-roll one hit, wound or damage roll. |
| 3 | Thessaly Blade | One of the bearer's melee weapons gains +1 Damage. |
| 4 | Lantern of Cinderfall | The bearer's ranged attacks ignore the benefit of cover. |
| 5 | Choirhold Bell | Friendly units within 6" add 1 to their Battle-shock tests. |
| 6 | Vesk Rosary | Once per battle, when the bearer would be destroyed, roll a D6. On a 4+ it stays on 1 wound instead. |

## Rules tab wording
- **Characters:** "Characters use their own Battle Honour and Battle Scar tables, and can carry up to three relics. Give your Character a title and a few lines of backstory; its battles and kills are kept on its record. Fallen Characters are remembered in the Hall of Heroes."
- **Warlord (under Battle Scars):** "Your Warlord never rolls for the fallen. If it is destroyed, it automatically takes a Character Battle Scar: roll a D3 on the Character Battle Scars table (re-roll scars it already holds). A Warlord is never removed, and there is no RP penalty. A Warlord that already holds three scars and is destroyed again replaces its oldest scar with the new one. Other Characters still roll for the fallen on a 1–2, and a third scar removes them."
- **Relics:** "A Character can earn a relic when its player claims a Shrine province, or plays a Fate Card. A Character holds at most three relics, never the same one twice (re-roll or pick another). Each relic adds 10 pts to the Character's cost, after Battle Honours are counted."
- Update "A Character's third scar removes it like any other unit" to exclude the Warlord.

## Data model (all optional; old saves load unchanged; `cleanUnit` keeps/validates)
- `Unit`: `title?`, `backstory?` (≤280), `warlordTrait?` (Warlord only), `relics?: string[]` (≤3, unique, from table, Characters only), `battles?`, `kills?` (non-negative ints).
- `data.ts`: `CHAR_HONOURS`, `CHAR_SCARS`, `RELICS`. Honour/scar validation accepts generic ∪ Character names.
- State: `fallen?: FallenCharacter[]` — snapshot {id, playerId, playerName, name, title, datasheet, rank, battles, kills, relics, cause, round}.
- `applyPostBattleTo`: Warlord-destroyed path (no fallen roll, Character scar), Grievous Wound heal, battles/kills.
- New actions: add relic (with source), remove relic, delete memorial entry (owner). Permissions as other roster actions.
- `effectivePoints` adds 10 × relics after rounding.
- Field Surgeon / Recuperate work on Character scars, including the Warlord's.

## Out of scope
Automated effects, images, source verification, relic trading/loss, non-Character relics, backfill, titles on non-Characters, memorial edits beyond owner delete, Warlord succession, chat/notifications.
