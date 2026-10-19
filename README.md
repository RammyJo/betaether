# Adventures of Pebbles

> *Understandings of Betaether*

A beautiful, fast, static journal for the poetry, stories and reflections of
**Pebbles Martinez** (pen name **betaether**) — rebuilt from
[betaether.wordpress.com](https://betaether.wordpress.com) with every piece,
date and image preserved, wrapped in a warm editorial design.

**Live:** https://adventures-of-pebbles.ram-a15.workers.dev

---

## What's inside

| | |
|---|---|
| **Pieces** | 37 (every post from the original blog, 2017 – 2021) |
| **Collections** | Poetry · Reflections · Stories · Letters · Guides |
| **Pages** | Home, About, Contact, Archive, 5 collection pages, 404 |
| **Extras** | RSS feed, XML sitemap, robots.txt, per-post prev/next, related posts |

Nothing was cut. Every poem, essay, letter, story and guide keeps its original
wording, its original date, and its original artwork.

## Features

- **Warm editorial design** — Fraunces display serif + Lora body, paper texture,
  soft ambient wash, and a considered type scale.
- **Cinematic motion** — a hero whose headline rises line by line out of a mask,
  a drifting aurora behind it, a marquee of verse fragments, cards that tilt and
  catch the light under the pointer, magnetic buttons, a blend-mode cursor, and
  slowly falling petals. All of it is transform/opacity only and capped at 30 fps
  for the canvas, so it stays smooth on a laptop or a phone.
- **Page-to-page morphs** — the View Transitions API carries the header mark and
  each card's image and title into the post you open, so navigation reads as one
  continuous page rather than a reload.
- **A poem you read slowly** — the featured poem on the home page reveals one
  stanza at a time against a travelling bead as you scroll, like a finger
  following the lines.
- **Poetry reading mode** — verse pieces switch to a larger, tighter display
  serif and cascade in line by line so poems read like poems.
- **Light & dark themes** — respects the OS preference, remembers your choice,
  no flash of the wrong theme on load.
- **Instant search & filter** — filter by collection, full-text search, press
  `/` anywhere to jump to the search box.
- **Archive timeline** — every piece grouped by year, with animated counters.
- **Polished details** — reading-progress bar with a glowing marker, sticky
  header, drop caps on essays, reading-time estimates, back-to-top, and a real
  `<details>` reveal for the Monty Hall answer.
- **Zero JavaScript frameworks** — one small vanilla `app.js` (~5 KB gzip). The
  HTML is generated ahead of time.
- **Degrades gracefully, by design** — nothing is hidden unless the motion
  engine is alive to reveal it again. With JS disabled, if the script fails, or
  after a 3-second safety net, the journal simply shows itself. A viewport sweep
  covers throttled tabs. `prefers-reduced-motion` turns all of it off.
- **Fast & private** — no trackers, no cookies, self-hosted images, ~2 MB total.

## Project layout

```
content/
  site.json          # title, author, collections, navigation, ticker, featured poem
  posts.json         # all 37 pieces, faithfully transcribed
src/
  styles.css         # the design system + motion system
  app.js             # theme, nav, reveals, cursor, tilt, petals, search
build.mjs            # static site generator (no dependencies)
scripts/
  audit.mjs          # headings, titles, meta, link rel
  check.mjs          # every internal link and asset resolves
  check-vt.mjs       # no duplicate view-transition-name on any page
  verify.mjs         # graceful-degradation guards
server.mjs           # tiny local preview server
wrangler.jsonc       # Cloudflare deployment config
assets/uploads/      # the original artwork
dist/                # generated site (git-ignored)
```

## Local development

```bash
npm run build     # generate dist/
npm run serve     # preview at http://localhost:4173
npm run dev       # build + serve
npm run check     # build, then run every audit and guard
```

`build.mjs` has **no dependencies** — plain Node, no toolchain to install.

## Deploying to Cloudflare

The site is a static bundle served by a Cloudflare Worker with static assets.

```bash
npm run build
npx wrangler deploy
```

### Connect the GitHub repo to Cloudflare (auto-deploy on push)

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
2. Select the **adventures-of-pebbles** worker → **Settings** → **Builds** → *Connect*.
3. Choose **GitHub** → authorise → pick the **RammyJo/betaether** repository.
4. Build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Root directory:** `/` (leave default)
5. Save. Every push to `main` now rebuilds and redeploys the journal.

### Custom domain

In the same dashboard page → **Settings** → **Domains & Routes** → *Add* →
*Custom domain*, then point your domain at the worker. Afterwards update
`site.url` in `content/site.json` so canonical links, the RSS feed and the
sitemap use the new address, and push.

## Editing content

- **Add or change a piece:** edit `content/posts.json`. Fields:
  `slug`, `title`, `date` (ISO `YYYY-MM-DD`), `category`, `body` (HTML),
  `image`, `imageCaption`, `note`, `verse` (true for poems), `comments`.
- **Add a collection:** add it to `categories` in `content/site.json` and give
  the piece that `category`.
- **Change the home-page verse** — set `featuredPoem` in `content/site.json` to
  a post slug, and edit the `ticker` array for the marquee of fragments.
- Then run `npm run build`.

## Credits

Words and artwork © Pebbles Martinez. Design and build: a modern reimagining
of the original WordPress.com site.
