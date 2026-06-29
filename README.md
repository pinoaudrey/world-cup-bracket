# World Cup 2026 Bracket Challenge

A small, static single-page app for running a **knockout-bracket prediction
competition** among friends for the 2026 FIFA World Cup (Round of 32 onward).
Friends fill out a bracket, an admin enters the real results, and the app scores
everyone and shows a leaderboard.

Built with **React + TypeScript + Vite** and the **[Mantine](https://mantine.dev/)**
component library (theming + UI components; a small CSS module covers the custom
bracket layout). No backend — all data lives as JSON committed to the repo and is
fetched on load. Designed for **GitHub Pages**.

---

## How it works (the publishing model)

The published site is **static hosting** — there is no server and nothing
writes data at runtime. The flow is intentionally admin-driven:

1. Friends open the published site, fill out a bracket on their own device for
   fun, **screenshot it, and send the picture to the admin**.
2. The **admin is the source of truth**. They run the app **locally**
   (`npm run dev`) and re-enter each person's picks, then enter match results as
   games finish.
3. On localhost, every edit **auto-saves straight to
   `public/data/brackets.json` and `results.json`** (via a dev-only Vite
   endpoint — see [`vite.config.ts`](vite.config.ts)). No export step.
4. The admin just **commits and pushes** — that push redeploys the site and is
   what publishes new data to everyone.

> The auto-save only exists under `npm run dev`; it is never in the production
> build, so the published static site stays read-only. Editing the live site
> only ever changes *your own browser* — and the Admin page still has manual
> **Export / Import** as a fallback there. The Admin "password" is a casual gate
> to prevent accidental edits — **it is not security** (it ships in the bundle).

---

## Pages

- **Leaderboard** (`#/`) — every player's total, per-round breakdown, and max
  reachable score, sorted descending with ties sharing a rank.
- **Create / Edit Bracket** (`#/create`) — enter a username and pick a winner
  for all 31 matches. Picks **cascade**: advancing a team feeds it into the next
  round, and changing an earlier pick automatically clears any later picks that
  depended on it. You can only pick a team for a slot it can actually reach.
- **Brackets** (`#/brackets`) — list of all saved brackets; view, edit, delete.
- **View Bracket** (`#/view/:username`) — a person's full bracket, color-coded,
  with running total and per-round breakdown.
- **Admin** (`#/admin`) — enter results, manage brackets, import/export JSON.

---

## Scoring (advancement-based)

You earn points for every match where **your predicted advancing team actually
won its slot** — it does **not** matter whether you predicted the right opponent.

| Round | Name          | Matches | Points each | Round max |
| ----- | ------------- | ------- | ----------- | --------- |
| R32   | Round of 32   | 16      | 1           | 16        |
| R16   | Round of 16   | 8       | 2           | 16        |
| QF    | Quarterfinals | 4       | 4           | 16        |
| SF    | Semifinals    | 2       | 8           | 16        |
| F     | Final         | 1       | 16          | 16        |

**Maximum possible score = 80.**

*Example:* if Round-of-16 match 91 is really Brazil vs Norway and Brazil wins, a
player who had it as "Brazil vs Ivory Coast, Brazil advances" still earns the 2
R16 points — they correctly advanced Brazil; the wrong opponent is irrelevant.
(See [`src/scoring.test.ts`](src/scoring.test.ts) for this exact case.)

### View-page colors

- **Green** — correct: the match has a result and your pick matches it.
- **Red + strikethrough** — wrong: the match has a result your pick missed, **or**
  your picked team has already been eliminated in reality (lost an earlier real
  match), even if this slot hasn't been played yet.
- **Gray** — pending: no result yet and your picked team is still alive.

---

## Data files (`public/data/`)

- **`tournament.json`** — the fixed bracket structure: rounds, the 32 teams, and
  all 31 matches. R32 matches carry their seeded `teams`; later matches carry
  `feeders` (the two match ids whose winners meet there).
- **`brackets.json`** — everyone's picks: `[{ username, picks: { matchId: team } }]`.
  Starts as `[]`.
- **`results.json`** — actual outcomes: `{ "winners": { matchId: team } }`.
  Starts as `{ "winners": {} }`.

> **Note on seed data:** the team matchups in `tournament.json` are illustrative.
> Kickoff times for matches **82** and **87** were cut off in the source image
> and are filled with estimates that fit each day's morning/afternoon/evening
> pattern (82 → Wed Jul 1, 1:00 PM PT; 87 → Fri Jul 3, 7:00 PM PT). All team
> names, matchups, and times are editable — correct them in `tournament.json`
> before sharing if the real bracket differs.

---

## Admin guide (step by step)

Run the app locally so your edits save straight to the repo:

1. `npm run dev` and open the local URL, then go to **Admin** (`#/admin`) and
   unlock with the admin password (configured as `ADMIN_PASSWORD` in
   [`src/pages/Admin.tsx`](src/pages/Admin.tsx)). The gate only prevents
   accidental edits — it is **not security** (see below).
2. **Enter each friend's picks:** from a screenshot, go to **Brackets → + New
   bracket** (or *Edit* an existing one), type their username, fill the bracket,
   Save.
3. **Enter results** as matches finish. A match becomes enterable once both of
   its real participants are known (R32 always; later rounds derive from earlier
   winners). Changing an earlier result clears any now-impossible later results.
4. Each edit **auto-writes** `public/data/brackets.json` and `results.json`.
   Just commit and push:
   ```sh
   git add public/data/brackets.json public/data/results.json
   git commit -m "Update picks and results"
   git push
   ```
5. The deploy workflow rebuilds and the published site shows the new data.

> **Fallback (no local checkout):** the Admin page also has manual **Export /
> Import** buttons. On the published site that's the only option, since it can't
> write files. "Reset to published" discards local edits and reloads the
> committed JSON — handy if your browser's working copy has drifted from the repo.

---

## Local development

```sh
npm install
npm run dev      # start the dev server (http://localhost:3000/<base>/)
npm test         # run the scoring/topology unit tests
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

---

## Deployment (GitHub Pages)

The app uses `HashRouter` and a configured `base`, so deep links never 404 on
Pages' static hosting.

1. **Set the base path.** In [`vite.config.ts`](vite.config.ts), `base` must
   match your repo name. It is currently:
   ```ts
   base: '/fifa-world-cup-2026-sticker-tracker/'
   ```
   Change it if you rename the repo (keep the leading and trailing slashes).

2. **Enable Pages.** In the GitHub repo: **Settings → Pages → Build and
   deployment → Source → GitHub Actions**.

3. **Deploy.** Push to `main`. The workflow in
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) installs
   deps, runs the tests, builds, and publishes `dist/`. The live URL is
   `https://<your-user>.github.io/<repo-name>/`.

   *Alternative:* deploy from your machine with the bundled script:
   ```sh
   npm run deploy   # builds and pushes dist/ to the gh-pages branch
   ```
   (If you use this instead, set Pages Source to the `gh-pages` branch.)

---

## Out of scope

Third-place match (not scored), the group stage (knockout only), real
authentication, real-time multi-user sync, and a native mobile app.
