# Feature: Munitorum factions and datasheet pick-list

> Scoped 2026-10-23. Extends The Varkesh Reach from 12 factions to about 28 and lets a player pick a datasheet by name, with its points filled in, when adding a roster unit. No rule, card, twist or look changes. Not a rules database.

## Description
Today players choose from 12 factions, and the Datasheet field on the roster unit form is free text with points typed by hand. This feature adds every faction in the Munitorum Field Manual (MFM, the BSData `wh40k-11e-mfm` repo, version 1.6) except the two Titan Legions. That is about 28 factions. Space Marine chapters (Black Templars, Blood Angels, Dark Angels, Deathwatch, Space Wolves) are separate factions. Each new faction has a colour, a side (Imperium, Chaos or Xenos), a "want" line and a "first force" line, written fresh in the prototype's voice. These feed the Factions tab and the rivalry hooks.

On the roster unit form, Datasheet becomes a searchable pick-list showing only the player's faction. Picking a datasheet fills in the datasheet name and the base points. If points vary with squad size, the player chooses a model count. Both fields stay editable, and free text is still allowed. Honours and relics still add on top of base points as they do now.

The datasheet data is a small file committed to the repo. A developer-run script builds it from the MFM. The app never calls GitHub at runtime, and nothing new runs on AWS.

## Decisions (user-confirmed)
1. **Factions:** all MFM factions except `titan-legions` and `chaos-titan-legions`, about 28 in total. The five Space Marine chapters are separate factions.
2. **Chapter pick-lists:** a chapter shows its own units plus all generic Space Marines units.
3. **Fate Cards:** new factions get the generic Fate Cards only, with no new faction cards.
4. **Legends:** Legends units appear in the list with a "Legends" marker.

## Assumptions baked in (flag if wrong)
- The existing 12 factions keep their exact wording, colours and Fate Cards. Prototype names map to MFM slugs, for example "T'au Empire" to `tau-empire`.
- Base points are the first (standard) pricing tier only. The "3rd+ units" requisition tiers are ignored.
- Data for each faction loads only when needed, so the app stays fast.
- The MFM version (for example "MFM 1.6") is shown small in the form.
- If a player's faction has no data, the Datasheet field stays plain free text.

## Scope: in
- **New factions:** about 16 more, each with colour, side, want and first-force text. Each appears everywhere factions are listed or chosen.
- **Datasheet pick-list:**
  - It is searchable by typing, filtered to the player's faction (chapters also get generic Space Marines units).
  - Legends entries carry a "Legends" marker.
  - Picking fills datasheet name and base points.
  - A model-count choice appears only when a datasheet has more than one points option.
- **Editing:** the datasheet name and base points remain editable after picking, and a typed name that isn't in the list is allowed.
- **Data refresh:** a developer-run script fetches the MFM YAML and writes the trimmed data file. The script's short usage is documented.
- **Version label:** the MFM version is shown small in the unit form.

## Scope: out
- Rules text, stats, wargear, detachments, enhancements, or any datasheet content beyond name and points.
- Titan Legions and Chaos Titan Legions.
- Faction-specific Fate Cards for the new factions.
- Points for 3rd-and-later unit tiers.
- Updating existing units when the data changes. Saved units keep their stored points.
- Fetching from GitHub at runtime, or any new AWS resource.
- Army-list validation, points limits per datasheet, and unit rosters of models or wargear.
- Migrating old campaigns. Existing campaigns and players keep their factions unchanged.

## Acceptance criteria (check by hand at ~400px)
**Factions available**
1. The Join screen, the Setup tab faction dropdown and the Factions tab chip list all show the full list of factions (the original 12 plus the new ones), with no Titan Legions.
2. On the Join screen, 28 faction cards are usable on a phone: the page scrolls normally, the chosen card is clearly marked, no sideways scroll, and the Join button stays reachable.
3. The five Space Marine chapters are separate factions in every list. "Space Marines" (generic) remains.
4. Existing campaigns open unchanged. Players keep their factions, colours, hands and map.
5. The original 12 factions look and read exactly as before (colour, want, first force, Fate Cards).

**New faction content**
6. Each new faction has a distinct colour and a side. Its want and first-force text read in the prototype's voice, with no copied official rules text.
7. On the Factions tab, selecting any new faction shows its want and first-force lines, a dot, and a rivalry card against every other selected faction. The hook text matches the pair of sides (for example two Chaos factions show "Rival warbands").
8. With many factions selected (up to all of them), the web diagram stays readable and the chips wrap on a phone.
9. The Fate Deck tab and in-game draws work for new factions using generic cards only. No errors when a new faction has no faction cards.

**Datasheet pick-list**
10. In the Add unit form, a player on a faction with data sees a Datasheet field they can type into. The list narrows as they type, and shows only their faction's datasheets.
11. A Black Templars player sees Black Templars units and generic Space Marines units, and no Blood Angels units. The same applies to every chapter.
12. A Legends datasheet shows a visible "Legends" marker in the list.
13. Picking a datasheet with one price fills the name and the Base points field. Effective points on the form update straight away.
14. Picking a datasheet with several prices (for example 5 or 10 models) offers a model-count choice. Choosing one sets the Base points. Switching the choice changes the points.
15. After picking, the player can change the name text and the Base points freely. The values they typed are what get saved.
16. A player can type a datasheet that isn't in the list and save it as before, with their own points.
17. Honours add 10% and relics add 10 on top of the picked base points, exactly as before.
18. Edit unit on an existing unit opens with its saved datasheet and points untouched. Nothing is re-filled or changed unless the player picks again.
19. Seasoned Recruits mode also gets the pick-list, with its fixed 3 XP and honour rules unchanged.
20. The form works at ~400px: the list opens without covering the field being typed in, the keyboard doesn't hide it, rows are comfortable to tap, and no sideways scroll.
21. If the player's faction has no data, or the data fails to load, the Datasheet field behaves as plain text and the player can still save a unit. The form shows no error that blocks saving.
22. The small "MFM 1.6" label is visible in the form when data is in use.
23. Refreshing the data file never changes the points of units already on a roster, in any campaign.

**Data refresh (developer)**
24. Running the script produces the trimmed data file with the factions in scope and the version from `meta.yaml`. It skips the two Titan Legions, and a rerun with no upstream change produces no diff.
25. The built app makes no network call to GitHub or any MFM source.

## Edge cases
- **Faction list on phones:** 28 factions on the Join screen and in the Setup dropdown. Consider grouping by side (Imperium, Chaos, Xenos), keeping the current look.
- **Factions tab web:** all factions selected means about 378 rivalry cards and a crowded diagram. Keep the "pick what your group plays" model, with grouping by side.
- **Name mapping:** MFM faction names may differ from the prototype's ("T'au Empire"). Names in saved campaigns must not change, so the mapping needs one clear source.
- **Duplicates:** a chapter list may contain the same datasheet name from both the chapter and generic sets. Show it once.
- **Odd price tables:** the picker chooses a sensible default and shows no confusing labels.
- **Size:** load per faction on demand, with a brief loading state that doesn't block typing.
- **Search matching:** apostrophes, curly quotes and case don't stop a match.
- **Unknown saved datasheet:** a saved unit naming a datasheet no longer in the data still displays and edits normally.
- **Legends:** listed below current units and marked.
- **Same-side pairings** share hook text (three sides only). Accepted.

## For the architect
1. **Faction type:** extend `FactionName` without breaking saved campaigns; decide where side, colour, want and open text live.
2. **Data file and script:** location, shape (per-faction chunks, version, Legends flag, ordered price options), faction → MFM slug mapping, chapters inheriting generic Space Marines units.
3. **Unit form:** search pick-list, model-count choice, plain-text fallback. Saved `Unit` shape unchanged.
4. **Where factions are listed:** Join screen, Setup dropdown, Factions tab chips and web, any other picker.
5. **Cards and colours:** generic-only Fate Cards need no draw-pool change; distinct colours.
6. **Cost and deploy:** no new AWS resource, no runtime fetch; static assets only.
7. **Licence:** MFM is MIT; place the attribution notice.
