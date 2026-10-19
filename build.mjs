import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = join(ROOT, "dist");

const site = JSON.parse(readFileSync(join(ROOT, "content", "site.json"), "utf8"));
const posts = JSON.parse(readFileSync(join(ROOT, "content", "posts.json"), "utf8"))
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

const CAT_SLUG = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ------------------------------------------------------------------ utils */
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const stripHtml = (html = "") =>
  html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#\d+;/g, "")
      .replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

const words = (html) => stripHtml(html).split(/\s+/).filter(Boolean).length;
const readingTime = (html) => Math.max(1, Math.round(words(html) / 200));

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmtDate = (iso, long = true) => {
  const [y, m, d] = iso.split("-").map(Number);
  return long ? `${d} ${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1].slice(0, 3)} ${y}`;
};

const excerpt = (html, len = 190) => {
  const t = stripHtml(html);
  if (t.length <= len) return t;
  const cut = t.slice(0, len);
  const at = cut.lastIndexOf(" ");
  return `${cut.slice(0, at > 60 ? at : len).trim()}…`;
};

const slugUrl = (p) => `/post/${p.slug}/`;

/* --------------------------------------------------- content transforms */
/**
 * Normalise post HTML:
 *  - demote in-body <h1> to <h2> so every page has exactly one <h1>
 *  - turn the puzzle's `spoiler` block into a real, accessible <details> reveal
 *  - add a drop cap to the opening paragraph of prose pieces
 */
function transformBody(p) {
  let html = p.body;

  // one <h1> per page
  html = html.replace(/<h1(\s[^>]*)?>/gi, (_m, attrs = "") => `<h2${attrs}>`)
             .replace(/<\/h1>/gi, "</h2>");

  // real, keyboard-accessible reveal (works without JavaScript)
  html = html.replace(
    /<div class="spoiler">([\s\S]*?)<\/div>/gi,
    (_m, inner) =>
      `<details class="answer"><summary class="answer__toggle">` +
      `<span class="answer__label">Reveal the answer</span>` +
      `<span class="answer__chev" aria-hidden="true"></span></summary>` +
      `<div class="answer__body">${inner}</div></details>`
  );

  // drop cap on prose openings
  if (!p.verse) {
    html = html.replace(/<p>/, '<p class="dropcap">');
  }
  return html;
}

/* --------------------------------------------------- versions of a headline */

/* ------------------------------------------------------------------ layout */
const ICONS = {
  sun: `<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  moon: `<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>`,
  up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
};

function header(active = "/") {
  const nav = site.nav
    .map((n) => {
      const isActive = n.href === active || (n.href !== "/" && active.startsWith(n.href));
      return `<a href="${n.href}"${isActive ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`;
    })
    .join("");
  return `
  <a class="skip" href="#main">Skip to content</a>
  <div class="progress" aria-hidden="true"></div>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="/" aria-label="${esc(site.title)} — home">
        <img class="brand__mark" src="/assets/uploads/site-icon.jpg" alt="" width="40" height="40" loading="eager" style="view-transition-name:brand-mark">
        <span class="brand__text">
          <span class="brand__name">${esc(site.title)}</span>
          <span class="brand__tag">${esc(site.tagline)}</span>
        </span>
      </a>
      <nav class="nav" aria-label="Primary">${nav}</nav>
      <button class="icon-btn theme-toggle" type="button" aria-label="Toggle theme">${ICONS.sun}${ICONS.moon}</button>
      <button class="icon-btn menu-toggle" type="button" aria-label="Open menu" aria-expanded="false">${ICONS.menu}</button>
    </div>
  </header>`;
}

function footer() {
  const cats = Object.keys(site.categories)
    .map((c) => `<li><a href="/category/${CAT_SLUG(c)}/">${esc(c)}</a></li>`)
    .join("");
  return `
  <footer class="site-footer">
    <div class="wrap footer-grid">
      <div class="footer-brand">
        <a class="brand" href="/">
          <img class="brand__mark" src="/assets/uploads/site-icon.jpg" alt="" width="40" height="40" loading="lazy">
          <span class="brand__text">
            <span class="brand__name">${esc(site.title)}</span>
            <span class="brand__tag">${esc(site.tagline)}</span>
          </span>
        </a>
        <p>${esc(site.description)}</p>
      </div>
      <div class="footer-col">
        <h4>Read</h4>
        <ul>${cats}</ul>
      </div>
      <div class="footer-col">
        <h4>Elsewhere</h4>
        <ul>
          <li><a href="/about/">About Pebbles</a></li>
          <li><a href="/contact/">Contact</a></li>
          <li><a href="/feed.xml">RSS feed</a></li>
          <li><a href="/archive/">Archive</a></li>
        </ul>
      </div>
    </div>
    <div class="wrap footer-bottom">
      <span>© ${site.author.since}–<span id="year">${new Date().getFullYear()}</span> ${esc(site.author.name)}. Written with love.</span>
      <span>${esc(site.title)} · ${esc(site.tagline)}</span>
    </div>
  </footer>
  <button class="icon-btn to-top" type="button" aria-label="Back to top">${ICONS.up}</button>`;
}

function shell({ title, description, active = "/", body, canonical, ogType = "website", extraHead = "" }) {
  const withSuffix = title ? `${title} — ${site.title}` : `${site.title} — ${site.tagline}`;
  const fullTitle = esc(withSuffix.length > 62 && title ? title : withSuffix);
  const url = canonical ? `${site.url}${canonical}` : site.url + "/";
  return `<!DOCTYPE html>
<html lang="en" class="no-js" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${fullTitle}</title>
<meta name="description" content="${esc(description || site.description)}">
<meta name="author" content="${esc(site.author.name)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${fullTitle}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:image" content="${site.url}/assets/uploads/site-icon.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#fbf7f0" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14110e" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/assets/uploads/site-icon.jpg">
<link rel="apple-touch-icon" href="/assets/uploads/site-icon.jpg">
<link rel="alternate" type="application/rss+xml" title="${esc(site.title)}" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Lora:ital,wght@0,400..700;1,400..700&family=Inter:wght@400..700&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
<script>(function(){var d=document.documentElement;d.classList.remove("no-js");d.classList.add("js");
/* Content starts hidden so it can animate in. If the motion engine never
   arrives or dies, drop the class again so the journal simply shows itself. */
window.__pebblesReady=false;
var fallback=function(){if(!window.__pebblesReady)d.classList.remove("js");};
window.addEventListener("error",fallback);
window.setTimeout(fallback,3000);
try{var t=localStorage.getItem("pebbles-theme");if(t)d.setAttribute("data-theme",t);else if(window.matchMedia("(prefers-color-scheme: dark)").matches)d.setAttribute("data-theme","dark");}catch(e){}})();</script>
${extraHead}</head>
<body class="page-${esc((canonical || "/").replace(/^\/|\/$/g, "") || "home")}">
<div class="cursor" aria-hidden="true"><span class="cursor__dot"></span><span class="cursor__ring"></span></div>
<canvas class="petals" aria-hidden="true"></canvas>
${header(active)}
<main id="main">
${body}
</main>
${footer()}
<script src="/assets/app.js" defer></script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ pieces */
const meta = (p, { showCat = true } = {}) => `
  <div class="meta">
    ${showCat ? `<a class="tag" href="/category/${CAT_SLUG(p.category)}/">${esc(p.category)}</a><span class="meta__dot"></span>` : ""}
    <time datetime="${p.date}">${fmtDate(p.date)}</time>
    <span class="meta__dot"></span>
    <span class="reading">${readingTime(p.body)} min read</span>
  </div>`;

function cardMedia(p, vtName) {
  const vt = vtName ? ` style="view-transition-name:${vtName}"` : "";
  if (p.image) {
    return `<div class="card__media"${vt}><img src="${p.image}" alt="" loading="lazy" decoding="async" width="600" height="375"></div>`;
  }
  const sym = site.categories[p.category]?.symbol || "❦";
  return `<div class="card__media card__media--verse"${vt} aria-hidden="true"><span class="card__glyph">${sym}</span></div>`;
}

function card(p, delay = 0) {
  return `
  <article class="card" data-category="${esc(p.category)}" data-search="${esc(`${p.title} ${p.category} ${stripHtml(p.body)}`)}" data-reveal="up" data-reveal-delay="${delay}" data-tilt>
    <a class="card__link" href="${slugUrl(p)}" tabindex="-1" aria-hidden="true">${cardMedia(p, `vt-img-${p.slug}`)}</a>
    <div class="card__body">
      <a class="tag" href="/category/${CAT_SLUG(p.category)}/">${esc(p.category)}</a>
      <h3 style="view-transition-name:vt-title-${p.slug}"><a href="${slugUrl(p)}">${esc(p.title)}</a></h3>
      <p class="excerpt">${esc(excerpt(p.body))}</p>
      <div class="meta" style="margin-top:1rem">
        <time datetime="${p.date}">${fmtDate(p.date)}</time>
        <span class="meta__dot"></span>
        <span class="reading">${readingTime(p.body)} min</span>
      </div>
    </div>
    <span class="card__spot" aria-hidden="true"></span>
  </article>`;
}

/* ------------------------------------------------------------------ pages */
function homePage() {
  const [featured, ...rest] = posts;
  const cats = ["all", ...Object.keys(site.categories)];
  const chips = cats
    .map((c) => `<button class="chip" type="button" data-filter="${esc(c)}" aria-pressed="${c === "all"}">${c === "all" ? "Everything" : esc(c)}</button>`)
    .join("");

  const years = [...new Set(posts.map((p) => p.date.slice(0, 4)))].sort((a, b) => b - a);
  const archive = years
    .map((y) => {
      const items = posts
        .filter((p) => p.date.startsWith(y))
        .map((p) => `<a class="year__item" href="${slugUrl(p)}"><span class="t">${esc(p.title)}</span><span class="d">${fmtDate(p.date, false)}</span></a>`)
        .join("");
      return `<div class="year" data-reveal="up"><div class="year__num">${y}</div><div class="year__list">${items}</div></div>`;
    })
    .join("");

  const featuredMedia = featured.image
    ? `<div class="featured__media" style="view-transition-name:vt-feat-img-${featured.slug}"><img src="${featured.image}" alt="" loading="eager" decoding="async" width="800" height="600"></div>`
    : `<div class="featured__media featured__media--empty"><span class="orbit" aria-hidden="true"></span><span class="orbit orbit--2" aria-hidden="true"></span></div>`;

  /* the poem you read slowly, line by line, as you scroll */
  const poem = posts.find((p) => p.slug === site.featuredPoem) || posts.find((p) => p.verse);
  const poemLines = poem
    ? `<div class="scrollpoem" data-scrollpoem>
        <div class="scrollpoem__rail" aria-hidden="true"><span class="scrollpoem__bead"></span></div>
        <div class="scrollpoem__verses">
          ${poem.body
            .split(/(?=<\/p>)/)
            .filter((s) => s.replace(/<[^>]+>/g, "").trim())
            .map((block, i) => `<div class="scrollpoem__block" data-line-index="${i}">${block}</div>`)
            .join("")}
        </div>
      </div>`
    : "";

  const ticker = (site.ticker || [])
    .map((t) => `<span class="ticker__item"><span class="ticker__text">${esc(t.text)}</span><span class="ticker__src">${esc(t.source)}</span><span class="ticker__sep" aria-hidden="true">❦</span></span>`)
    .join("");

  const body = `
  <section class="hero">
    <div class="hero__aurora" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="wrap hero__grid">
      <div class="hero__copy">
        <p class="eyebrow eyebrow--accent" data-reveal="fade">A journal of ${posts.length} pieces · since ${site.author.since}</p>
        <h1 class="hero__title" style="view-transition-name:hero-title" data-hero-title>
          <span class="line" data-line="0"><span class="line__inner">Adventures</span></span>
          <span class="line" data-line="1"><span class="line__inner">of <em>Pebbles</em></span></span>
        </h1>
        <p class="hero__tagline" data-reveal="up" data-reveal-delay="120">${esc(site.tagline)}.</p>
        <p class="hero__desc" data-reveal="up" data-reveal-delay="200">Poetry, stories and small reflections from a girl who dreams of becoming an architect and an author — and who writes simply because she loves to write.</p>
        <div class="hero__actions" data-reveal="up" data-reveal-delay="280">
          <a class="btn btn--primary" href="#latest" data-magnetic>Start reading <span aria-hidden="true">→</span></a>
          <a class="btn btn--ghost" href="/about/" data-magnetic>About Pebbles</a>
        </div>
      </div>
      <div class="hero__card" data-parallax="0.06" data-reveal="scale">
        <div class="hero__card-img"><img src="/assets/uploads/site-icon.jpg" alt="Illustration used as the journal's icon" width="640" height="800" fetchpriority="high"></div>
        <p class="hero__quote">“I write because I want to share my ideas to people.”</p>
      </div>
    </div>
    <div class="wrap">
      <div class="stats" data-reveal="up">
        <div><div class="stat__num" data-count="${posts.length}">0</div><div class="stat__label">Pieces written</div></div>
        <div><div class="stat__num" data-count="${Object.keys(site.categories).length}">0</div><div class="stat__label">Collections</div></div>
        <div><div class="stat__num" data-text="${years[years.length - 1]}–${years[0]}">${years[years.length - 1]}–${years[0]}</div><div class="stat__label">Years of writing</div></div>
        <div><div class="stat__num" data-count="${Number(site.subscribers) || 0}" data-count-suffix="">${esc(site.subscribers)}</div><div class="stat__label">Subscribers</div></div>
      </div>
    </div>
  </section>

  <div class="ticker" aria-hidden="true"><div class="ticker__track">${ticker}${ticker}</div></div>

  <section id="latest">
    <div class="wrap">
      <div class="section-head" data-reveal="up">
        <div>
          <p class="eyebrow">Latest</p>
          <h2>Fresh off the notebook</h2>
        </div>
        <p>The newest piece to arrive — start here, then wander through the rest.</p>
      </div>
      <article class="featured" data-reveal="scale">
        ${featuredMedia}
        <div class="featured__body">
          <span class="tag">${esc(featured.category)}</span>
          <h3><a href="${slugUrl(featured)}">${esc(featured.title)}</a></h3>
          <p class="excerpt">${esc(excerpt(featured.body, 240))}</p>
          <div class="meta">
            <time datetime="${featured.date}">${fmtDate(featured.date)}</time>
            <span class="meta__dot"></span>
            <span class="reading">${readingTime(featured.body)} min read</span>
          </div>
          <div class="hero__actions"><a class="btn btn--primary" href="${slugUrl(featured)}" data-magnetic>Read the piece <span aria-hidden="true">→</span></a></div>
        </div>
      </article>
    </div>
  </section>

  ${poem ? `
  <section class="poemsection">
    <div class="wrap">
      <div class="section-head section-head--center" data-reveal="up">
        <div>
          <p class="eyebrow eyebrow--accent">Slow reading</p>
          <h2>${esc(poem.title)}</h2>
          <p class="poemsection__sub">Scroll gently — the poem arrives a line at a time.</p>
        </div>
      </div>
      ${poemLines}
      <div class="poemsection__foot" data-reveal="up">
        <a class="btn btn--ghost" href="${slugUrl(poem)}" data-magnetic>Read “${esc(poem.title)}” in full <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </section>` : ""}

  <section>
    <div class="wrap">
      <div class="section-head" data-reveal="up">
        <div>
          <p class="eyebrow">The Journal</p>
          <h2>Every piece, all in one place</h2>
        </div>
        <p><span id="result-count">${posts.length}</span> pieces shown. Filter by collection, or press <kbd>/</kbd> to search.</p>
      </div>
      <div class="toolbar" data-reveal="up">
        <div class="chips" role="group" aria-label="Filter by collection">${chips}</div>
        <label class="search">
          ${ICONS.search}
          <span class="vh">Search the journal</span>
          <input id="search-input" type="search" placeholder="Search the journal…" autocomplete="off">
        </label>
      </div>
      <div class="grid" id="journal">
        ${posts.map((p, i) => card(p, (i % 3) * 60)).join("\n")}
      </div>
      <div class="empty" id="empty" style="display:none;margin-top:1.4rem">Nothing matches that search — try another word.</div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="section-head" data-reveal="up">
        <div>
          <p class="eyebrow">Archive</p>
          <h2>Browse by year</h2>
        </div>
        <p>From a first game-theory post in 2017 to a beach poem in 2021.</p>
      </div>
      <div class="archive">${archive}</div>
    </div>
  </section>

  <section>
    <div class="wrap">
      <div class="subscribe" data-reveal="scale">
        <div>
          <h2>Join ${esc(site.subscribers)} other subscribers</h2>
          <p>Get each new poem, story and reflection delivered to your inbox.</p>
        </div>
        <div>
          <form class="subscribe__form" action="mailto:${esc(site.author.email)}" method="post" enctype="text/plain">
            <input type="email" name="email" placeholder="you@example.com" aria-label="Your email address" required>
            <button class="btn btn--primary" type="submit" data-magnetic>Subscribe</button>
          </form>
          <p class="subscribe__note">No spam, ever. Unsubscribe any time.</p>
        </div>
      </div>
    </div>
  </section>`;

  return shell({ title: null, description: site.description, active: "/", body, canonical: "/" });
}

function postPage(p) {
  const idx = posts.findIndex((x) => x.slug === p.slug);
  const newer = posts[idx - 1];
  const older = posts[idx + 1];

  let bodyHtml = transformBody(p);
  if (p.verse) {
    let i = 0;
    bodyHtml = bodyHtml.replace(/<p>/g, () => `<p data-vline style="--i:${i++}">`);
  }

  const figure = p.image
    ? `<figure class="article-figure" data-reveal="scale"><img src="${p.image}" alt="${esc(p.title)}" loading="eager" decoding="async" width="900" height="600" style="view-transition-name:vt-img-${p.slug}">${p.imageCaption ? `<figcaption>${esc(p.imageCaption)}</figcaption>` : ""}</figure>`
    : "";

  const nav = `
    <div class="postnav">
      ${newer ? `<a class="prev" href="${slugUrl(newer)}" data-magnetic><div class="dir">← Newer</div><div class="t">${esc(newer.title)}</div></a>` : "<span></span>"}
      ${older ? `<a class="next" href="${slugUrl(older)}" data-magnetic><div class="dir">Older →</div><div class="t">${esc(older.title)}</div></a>` : "<span></span>"}
    </div>`;

  const related = posts
    .filter((x) => x.category === p.category && x.slug !== p.slug)
    .slice(0, 3);

  const body = `
  <article>
    <header class="article-head">
      <div class="narrow">
        <div class="progress-dot" aria-hidden="true"></div>
        <a class="tag" href="/category/${CAT_SLUG(p.category)}/" data-reveal="fade">${esc(p.category)}</a>
        <h1 class="article-title" style="view-transition-name:vt-title-${p.slug}" data-reveal="mask">${esc(p.title)}</h1>
        <div class="article-meta meta" data-reveal="up" data-reveal-delay="150">
          <time datetime="${p.date}">${fmtDate(p.date)}</time>
          <span class="meta__dot"></span>
          <span class="reading">${readingTime(p.body)} min read</span>
          ${p.comments ? `<span class="meta__dot"></span><span>${p.comments} ${p.comments === 1 ? "comment" : "comments"} on the original post</span>` : ""}
        </div>
      </div>
    </header>
    <div class="narrow article-body${p.verse ? " is-verse" : ""}"${p.verse ? " data-verse" : ' data-reveal="up"'}>
      ${figure}
      ${bodyHtml}
      ${p.note ? `<p class="note">${esc(p.note)}</p>` : ""}
    </div>
    <div class="narrow endmark">
      <div class="endmark__glyph" aria-hidden="true" data-spin>❦</div>
      <p class="meta">Written by ${esc(site.author.name)} · ${fmtDate(p.date)}</p>
    </div>
    <div class="narrow" style="padding-bottom:3rem" data-reveal="up">${nav}</div>
  </article>

  ${related.length ? `
  <section class="related">
    <div class="wrap">
      <div class="section-head" data-reveal="up"><div><p class="eyebrow">Keep reading</p><h2>More ${esc(p.category.toLowerCase())}</h2></div></div>
      <div class="grid">${related.map((r, i) => card(r, i * 70)).join("")}</div>
    </div>
  </section>` : ""}`;

  return shell({
    title: p.title,
    description: excerpt(p.body, 160),
    active: `/category/${CAT_SLUG(p.category)}/`,
    body,
    canonical: `/post/${p.slug}/`,
    ogType: "article",
    extraHead: `<meta property="article:published_time" content="${p.date}">`,
  });
}

function categoryPage(name) {
  const catPosts = posts.filter((p) => p.category === name);
  const metaCat = site.categories[name] || {};
  const used = ["all", ...Object.keys(site.categories)];
  const chips = used
    .map((c) => {
      const target = c === "all" ? "/" : `/category/${CAT_SLUG(c)}/`;
      const pressed = c === name;
      return `<a class="chip" style="${pressed ? "background:var(--ink);color:var(--paper);border-color:var(--ink)" : ""}" href="${target}">${c === "all" ? "Everything" : esc(c)}</a>`;
    })
    .join("");

  const body = `
  <section class="page-head">
    <div class="wrap">
      <p class="eyebrow eyebrow--accent" data-reveal="fade">Collection</p>
      <h1 data-reveal="mask">${esc(metaCat.symbol || "❦")} ${esc(name)}</h1>
      <p class="lede" style="margin-top:1rem;max-width:52ch" data-reveal="up" data-reveal-delay="120">${esc(metaCat.blurb || "")}</p>
      <p class="meta" style="margin-top:1rem" data-reveal="up" data-reveal-delay="160">${catPosts.length} ${catPosts.length === 1 ? "piece" : "pieces"}</p>
      <div class="chips" style="margin-top:1.6rem" data-reveal="up" data-reveal-delay="200">${chips}</div>
    </div>
  </section>
  <section class="pt0">
    <div class="wrap">
      <div class="grid">${catPosts.map((p, i) => card(p, (i % 3) * 60)).join("")}</div>
    </div>
  </section>`;

  return shell({
    title: name,
    description: `${metaCat.blurb || ""} ${catPosts.length} pieces by ${site.author.name}.`,
    active: `/category/${CAT_SLUG(name)}/`,
    body,
    canonical: `/category/${CAT_SLUG(name)}/`,
  });
}

function aboutPage() {
  const body = `
  <section class="page-head">
    <div class="wrap">
      <p class="eyebrow eyebrow--accent" data-reveal="fade">Hello there</p>
      <h1 data-reveal="mask">About Pebbles Martinez</h1>
    </div>
  </section>
  <section class="pt0">
    <div class="wrap about-grid">
      <div data-reveal="scale">
        <div class="portrait" data-parallax="0.04"><img src="/assets/uploads/site-icon.jpg" alt="Illustration used as Pebbles' avatar" width="640" height="800"></div>
      </div>
      <div class="prose" data-reveal="up" data-reveal-delay="100">
        <p class="lede">Hi, my name is Pebbles Martinez. I am a girl who wants to contribute my best to world.</p>
        <p>My dream is to become an architect and an author of books. I write articles about my adventures as a teenager. I write because I want to share my ideas to people, and simply because I love writing.</p>
        <p>In my blog, you will be able to read random ideas that make me happy. Join my articles and let us be jolly!</p>
        <p class="pullquote">“Join my articles and let us be jolly!”</p>
        <div class="facts">
          <div class="fact"><span class="k">Name</span><span class="v">Pebbles Martinez</span></div>
          <div class="fact"><span class="k">Pen name</span><span class="v">betaether</span></div>
          <div class="fact"><span class="k">Website</span><span class="v"><a href="https://betaether.wordpress.com">betaether.wordpress.com</a></span></div>
          <div class="fact"><span class="k">Email</span><span class="v"><a href="mailto:${esc(site.author.email)}">${esc(site.author.email)}</a></span></div>
          <div class="fact"><span class="k">Writing since</span><span class="v">${site.author.since}</span></div>
          <div class="fact"><span class="k">Dreams</span><span class="v">Architect · Author</span></div>
        </div>
        <h2 style="margin-top:2rem">Why “Betaether”?</h2>
        <p>My username was made by my father since I was very little, before I had my Gmail account. The word <em>ether</em> was chosen carefully, and <em>beta</em> — meaning second, or medium — was added before it. According to my father, beta means second, and he used it to mean that I am still growing: I have a lot to learn more before I can be alpha. Maybe it’s a way of telling that inside, I am still a kid, and the world has a lot more to teach before I can go to the next level.</p>
        <div class="hero__actions"><a class="btn btn--primary" href="/" data-magnetic>Read the journal <span aria-hidden="true">→</span></a><a class="btn btn--ghost" href="/contact/" data-magnetic>Say hello</a></div>
      </div>
    </div>
  </section>`;
  return shell({ title: "About Pebbles Martinez", description: site.author.bio, active: "/about/", body, canonical: "/about/" });
}

function contactPage() {
  const body = `
  <section class="page-head">
    <div class="wrap">
      <p class="eyebrow eyebrow--accent" data-reveal="fade">Say hello</p>
      <h1 data-reveal="mask">Contact</h1>
      <p class="lede" style="margin-top:1rem;max-width:48ch" data-reveal="up" data-reveal-delay="120">Thoughts on a poem? A kind word? A story of your own? Pebbles would love to hear from you.</p>
    </div>
  </section>
  <section class="pt0">
    <div class="wrap">
      <div class="contact-card" data-reveal="scale">
        <div class="contact-card__media"><img src="${site.contactImage}" alt="" loading="lazy" width="800" height="600"></div>
        <div class="contact-card__body">
          <span class="k">Name</span><span class="v">Pebbles Martinez</span>
          <span class="k">E-mail address</span><span class="v"><a href="mailto:${esc(site.author.email)}">${esc(site.author.email)}</a></span>
          <span class="k">Website</span><span class="v"><a href="https://betaether.wordpress.com">betaether.wordpress.com</a></span>
          <div class="hero__actions"><a class="btn btn--primary" href="mailto:${esc(site.author.email)}" data-magnetic>Send an email <span aria-hidden="true">→</span></a></div>
        </div>
      </div>
    </div>
  </section>
  <section class="pt0">
    <div class="wrap">
      <div class="subscribe" data-reveal="scale">
        <div>
          <h2>Or follow along quietly</h2>
          <p>Join ${esc(site.subscribers)} other subscribers and get new pieces by email.</p>
        </div>
        <div>
          <form class="subscribe__form" action="mailto:${esc(site.author.email)}" method="post" enctype="text/plain">
            <input type="email" name="email" placeholder="you@example.com" aria-label="Your email address" required>
            <button class="btn btn--primary" type="submit" data-magnetic>Subscribe</button>
          </form>
          <p class="subscribe__note">No spam, ever. Unsubscribe any time.</p>
        </div>
      </div>
    </div>
  </section>`;
  return shell({ title: "Contact", description: `Get in touch with ${site.author.name} — send a note about a poem, a story, or just to say hello.`, active: "/contact/", body, canonical: "/contact/" });
}

function archivePage() {
  const years = [...new Set(posts.map((p) => p.date.slice(0, 4)))].sort((a, b) => b - a);
  const list = years
    .map((y) => {
      const items = posts
        .filter((p) => p.date.startsWith(y))
        .map((p) => `<a class="year__item" href="${slugUrl(p)}"><span class="t">${esc(p.title)}</span><span class="d">${fmtDate(p.date, false)} · ${esc(p.category)}</span></a>`)
        .join("");
      return `<div class="year" data-reveal="up"><div class="year__num">${y}</div><div class="year__list">${items}</div></div>`;
    })
    .join("");
  const body = `
  <section class="page-head">
    <div class="wrap">
      <p class="eyebrow eyebrow--accent" data-reveal="fade">Everything</p>
      <h1 data-reveal="mask">The Archive</h1>
      <p class="lede" style="margin-top:1rem" data-reveal="up" data-reveal-delay="120">All ${posts.length} pieces, newest first.</p>
    </div>
  </section>
  <section class="pt0"><div class="wrap"><div class="archive">${list}</div></div></section>`;
  return shell({ title: "Archive", description: `Every piece published on ${site.title} — all ${posts.length} poems, stories, letters, reflections and guides, newest first.`, active: "/archive/", body, canonical: "/archive/" });
}

function notFoundPage() {
  const body = `
  <section class="hero hero--center">
    <div class="hero__aurora" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="narrow" style="display:grid;justify-items:center;gap:1rem;text-align:center">
      <p class="eyebrow eyebrow--accent" data-reveal="fade">404</p>
      <h1 style="font-weight:300" data-reveal="mask">This page wandered off</h1>
      <p class="lede" data-reveal="up" data-reveal-delay="120">Like a poem half-written, it isn’t here. But the journal is.</p>
      <div class="hero__actions" data-reveal="up" data-reveal-delay="200"><a class="btn btn--primary" href="/" data-magnetic>Back to the journal <span aria-hidden="true">→</span></a></div>
    </div>
  </section>`;
  return shell({ title: "Page not found", description: "That page isn’t here — but the poetry, stories and reflections of Pebbles Martinez are. Head back to the journal.", active: "/404", body, canonical: "/404/" });
}

/* ------------------------------------------------------------------ feeds */
function rssFeed() {
  const items = posts
    .slice(0, 25)
    .map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${site.url}/post/${p.slug}/</link>
      <guid isPermaLink="true">${site.url}/post/${p.slug}/</guid>
      <pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>
      <category>${esc(p.category)}</category>
      <description>${esc(excerpt(p.body, 300))}</description>
    </item>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${site.url}</link>
    <description>${esc(site.description)}</description>
    <language>en</language>
    <atom:link href="${site.url}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function sitemap() {
  const urls = [
    { loc: "/", pri: "1.0" },
    { loc: "/about/", pri: "0.7" },
    { loc: "/contact/", pri: "0.6" },
    { loc: "/archive/", pri: "0.6" },
    ...Object.keys(site.categories).map((c) => ({ loc: `/category/${CAT_SLUG(c)}/`, pri: "0.7" })),
    ...posts.map((p) => ({ loc: `/post/${p.slug}/`, pri: "0.8", lastmod: p.date })),
  ];
  const body = urls
    .map((u) => `  <url><loc>${site.url}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.pri}</priority></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/* ------------------------------------------------------------------ write */
const write = (rel, content) => {
  const file = join(DIST, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return rel;
};

if (existsSync(DIST)) rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

const written = [];
written.push(write("index.html", homePage()));
written.push(write("about/index.html", aboutPage()));
written.push(write("contact/index.html", contactPage()));
written.push(write("archive/index.html", archivePage()));
written.push(write("404.html", notFoundPage()));
for (const p of posts) written.push(write(`post/${p.slug}/index.html`, postPage(p)));
for (const c of Object.keys(site.categories)) written.push(write(`category/${CAT_SLUG(c)}/index.html`, categoryPage(c)));
written.push(write("feed.xml", rssFeed()));
written.push(write("sitemap.xml", sitemap()));
written.push(write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`));

cpSync(join(ROOT, "src", "styles.css"), join(DIST, "assets", "styles.css"));
cpSync(join(ROOT, "src", "app.js"), join(DIST, "assets", "app.js"));
cpSync(join(ROOT, "assets", "uploads"), join(DIST, "assets", "uploads"), { recursive: true });

console.log(`Built ${written.length} files into dist/`);
console.log(`Posts: ${posts.length} · Categories: ${Object.keys(site.categories).length}`);
