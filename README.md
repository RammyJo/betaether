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
- **Poetry reading mode** — verse pieces switch to a larger, tighter display
  serif so poems read like poems.
- **Light & dark themes** — respects the OS preference, remembers your choice,
  no flash of the wrong theme on load.
- **Instant search & filter** — filter by collection, full-text search, press
  `/` anywhere to jump to the search box.
- **Archive timeline** — every piece grouped by year.
- **Polished details** — reading-progress bar, scroll reveals, sticky header,
  reading time estimates, back-to-top, spoiler reveal for the Monty Hall answer,
  and full keyboard/screen-reader support.
- **Zero JavaScript frameworks** — one small vanilla `app.js` (~5 KB). The HTML
  is generated ahead of time, so it works even with JS disabled.
- **Fast & private** — no trackers, no cookies, self-hosted images, ~2 MB total.

## Project layout

```
content/
  site.json          # title, author, collections, navigation
  posts.json         # all 37 pieces, faithfully transcribed
src/
  styles.css         # the design system
  app.js             # theme, search, nav, reveals
build.mjs            # static site generator (no dependencies)
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
- Then run `npm run build`.

## Credits

Words and artwork © Pebbles Martinez. Design and build: a modern reimagining
of the original WordPress.com site.
