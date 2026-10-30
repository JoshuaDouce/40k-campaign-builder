# Player log

Added 2026-10-30. An organiser-only panel at the foot of the Players tab that explains why a player's RP, supply limit or
Fate Card count changed. Design: `design/player-log.html`.

## What it shows

- Pick one player. Entries are newest first: War Round, a tag (Player, Organiser or Game), the campaign log line and the
  figures that moved (`RP 4 → 6`, `Supply limit`, `Cards in hand`).
- Supply limit is the full limit (base + provinces + Reinforcements), not only the Reinforcements part.
- Read-only. Non-organisers see nothing: no heading, no hint.

## How it is recorded

- `apply()` compares every player's RP, supply limit and hand size before and after each action
  (`src/game/playerLog.ts`) and adds an entry for each player whose figures changed. State: `state.plog`, by player id,
  newest first, latest 200 per player (800 shared out above 4 players, so 133 each at 6, 100 at 8). Missing = nothing recorded yet.
- The text is the campaign log line(s) the action added (those naming the player when any do), or a short fallback when
  the action adds none (playing or discarding a card, an organiser stat change, Undo).
- The first time a player is seen they get an opening entry: "History begins at War Round N" (existing players, with
  their figures before that action) or "Joined at War Round N" (late joiners).
- Backfill (added 2026-10-30): once, on load (`backfillPlayerLog`, flag `plogBackfilled`), the campaign log lines from
  before the Player log began are copied under each named player's opening entry, tagged "Campaign log", text only (the
  campaign log never held before and after figures, and keeps only the latest 60 lines). "Earlier" means older than every
  line the Player log has already picked up. New campaigns and resets start with the flag set.
- Tags: game-driven actions (begin a War Round, reveal, battle results, Undo, quiet picks) are Game. Organiser tools
  (stat +/-, Held by, Fate Card give/take, training refund, rules upgrade, remove player, chart, reset) are Organiser.
  Anything else is Player when the sender is that player, Organiser when the organiser acted for them, otherwise Game.
- A removed player's log is dropped. Reset clears every log. Charting a new Reach keeps them. Undo keeps them and adds
  a "Battle result undone." entry with the reversed figures.

## Size

The whole campaign is one DynamoDB item (400 KB). An entry is about 120 to 240 bytes of JSON (a battle line with
several bold names is the long end), and the log keeps at most 800 entries across all players, so it tops out at roughly
100 to 190 KB however many players there are. Lower `PLAYER_LOG_BUDGET` in `src/game/playerLog.ts` if a campaign nears
the limit. A reset now opens each log with "Campaign reset. History starts again."
