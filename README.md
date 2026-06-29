# World Cup 2026 — Knockout Bracket Competition

A small static single-page app for running a knockout-bracket prediction
competition among friends for the 2026 FIFA World Cup. It covers the **knockout
stage only** (Round of 32 → Final). Each participant fills out a full bracket;
the admin enters real results; the app scores everyone and shows a leaderboard.

Built with React + TypeScript + Vite. **No backend** — all data lives as JSON
files committed to the repo and is fetched on load. Hosted on GitHub Pages.

## How it works (the data model)

Three JSON files in [`public/data/`](public/data):

- `tournament.json` — the fixed bracket structure (rounds, 32 teams, matches and
  how winners feed forward). Already seeded.
- `brackets.json` — everyone's picks: `[{ "username", "picks": { matchId: team } }]`.
  Starts as `[]`.
- `results.json` — actual outcomes: `{ "winners": { matchId: team } }`. Starts as
  `{ "winners": {} }`.

The app fetches these on load. The admin edits in-browser; **state is mirrored to
`localStorage`** so a refresh doesn't lose work. **Export** buttons download the
updated JSON, which the admin commits to the repo to publish to everyone. There
is no live multi-user write — that's intentional. Anyone editing the public site
only changes their own local state and cannot affect published data.

## Scoring (advancement-based)

Points per correct pick by round:

| Round | Name          | Matches | Points each | Round max |
|-------|---------------|---------|-------------|-----------|
| R32   | Round of 32   | 16      | 1           | 16        |
| R16   | Round of 16   | 8       | 2           | 16        |
| QF    | Quarterfinals | 4       | 4           | 16        |
| SF    | Semifinals    | 2       | 8           | 16        |
| F     | Final         | 1       | 16          | 16        |

**Maximum possible score = 80.**

This is **advancement-based**: you only need the advancing team right, *not* the
matchup. If you had a team advancing from a slot and that team actually won its
real match, you score — regardless of whether you predicted the right opponent.
See [`src/lib/scoring.test.ts`](src/lib/scoring.test.ts) for the worked example.

## Pages

- **Create / Edit Bracket** (`#/create`) — pick a winner for each match. Picks
  cascade: advancing a team feeds it into the next match; changing an earlier
  pick clears any now-invalid later picks. You can only pick a team for a slot it
  can actually reach.
- **View Bracket** (`#/bracket/<username>`) — a person's full bracket, colored
  green (correct), red + strikethrough (wrong, or the picked team is already
  eliminated in reality), or gray (pending). Shows total and per-round breakdown.
- **Leaderboard** (`#/leaderboard`) — everyone ranked by total, with a per-round
  breakdown. Ties share a rank (alphabetical secondary sort).
- **Admin** (`#/admin`) — enter results, manage brackets, import/export JSON.
  A casual password gate avoids accidental edits. **This is not real security**;
  it only guards local state, never published data.

## Admin workflow (entering picks/results and publishing)

Friends fill out a bracket on their own device, screenshot it, and send it to the
admin. The **admin is the source of truth** and re-enters each person's picks
locally.

1. Go to `#/admin` and unlock (default password: `worldcup2026`, in
   [`src/pages/Admin.tsx`](src/pages/Admin.tsx)).
2. **Resume previous work:** use *Import brackets.json* / *Import results.json*
   to load the committed files (or just rely on `localStorage` from last session).
3. **Enter each friend's picks:** from *Manage brackets* (or the Create/Edit page)
   create a bracket per username and fill it in.
4. **Enter results as matches finish:** in *Enter results*, click the actual
   winner of each match. Later-round participants appear automatically once their
   feeder winners are entered. Changing/clearing a result clears dependent ones.
5. **Publish:** click *Export brackets.json* and *Export results.json*, drop the
   downloaded files into [`public/data/`](public/data), then commit and push:

   ```bash
   mv ~/Downloads/brackets.json ~/Downloads/results.json public/data/
   git add public/data/brackets.json public/data/results.json
   git commit -m "Update brackets/results"
   git push
   ```

   Pushing to `main` triggers the GitHub Actions deploy; the published site updates
   for everyone.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests (scoring)
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## Deployment (GitHub Pages)

- Routing uses `HashRouter` so deep links don't 404 on GitHub Pages.
- `vite.config.ts` sets `base: '/fifa-world-cup-2026-sticker-tracker/'`. **If you
  rename the repo, update that one value.**
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
  publishes `dist/` on every push to `main`. Enable it once in the repo settings:
  **Settings → Pages → Build and deployment → Source: GitHub Actions.**
