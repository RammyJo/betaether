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

const plainBody = (p) => p.body.replace(/<div class="spoiler">/g, "").replace(/<\/div>/g, "");

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
        <img class="brand__mark" src="/assets/uploads/site-icon.jpg" alt="" width="40" height="40" loading="eager">
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
  const fullTitle = title ? `${esc(title)} — ${esc(site.title)}` : `${esc(site.title)} — ${esc(site.tagline)}`;
  const url = canonical ? `${site.url}${canonical}` : site.url + "/";
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
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
<script>(function(){try{var t=localStorage.getItem("pebbles-theme");if(t)document.documentElement.setAttribute("data-theme",t);else if(window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.setAttribute("data-theme","dark");}catch(e){}})();</script>
${extraHead}</head>
<body>
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

function cardMedia(p) {
  if (p.image) {
    return `<div class="card__media"><img src="${p.image}" alt="" loading="lazy" decoding="async" width="600" height="375"></div>`;
  }
  const sym = site.categories[p.category]?.symbol || "❦";
  return `<div class="card__media card__media--verse" aria-hidden="true"><span>${sym}</span></div>`;
}

function card(p, delay = 0) {
  return `
  <article class="card" data-category="${esc(p.category)}" data-search="${esc(`${p.title} ${p.category} ${stripHtml(p.body)}`)}" data-reveal data-reveal-delay="${delay}">
    <a class="card__link" href="${slugUrl(p)}" tabindex="-1" aria-hidden="true">${cardMedia(p)}</a>
    <div class="card__body">
      <a class="tag" href="/category/${CAT_SLUG(p.category)}/">${esc(p.category)}</a>
      <h3><a href="${slugUrl(p)}">${esc(p.title)}</a></h3>
      <p class="excerpt">${esc(excerpt(p.body))}</p>
      <div class="meta" style="margin-top:1rem">
        <time datetime="${p.date}">${fmtDate(p.date)}</time>
        <span class="meta__dot"></span>
        <span class="reading">${readingTime(p.body)} min</span>
      </div>
    </div>
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
      return `<div class="year" data-reveal><div class="year__num">${y}</div><div class="year__list">${items}</div></div>`;
    })
    .join("");

  const featuredMedia = featured.image
    ? `<div class="featured__media"><img src="${featured.image}" alt="" loading="eager" width="800" height="600"></div>`
    : `<div class="featured__media featured__media--empty"></div>`;

  const body = `
  <section class="hero">
    <div class="wrap hero__grid">
      <div data-reveal>
        <p class="eyebrow eyebrow--accent">A journal of ${posts.length} pieces · since ${site.author.since}</p>
        <h1 class="hero__title">Adventures<br>of <em>Pebbles</em></h1>
        <p class="hero__tagline">${esc(site.tagline)}.</p>
        <p class="hero__desc">Poetry, stories and small reflections from a girl who dreams of becoming an architect and an author — and who writes simply because she loves to write.</p>
        <div class="hero__actions">
          <a class="btn btn--primary" href="#latest">Start reading <span aria-hidden="true">→</span></a>
          <a class="btn btn--ghost" href="/about/">About Pebbles</a>
        </div>
      </div>
      <div class="hero__card" data-reveal data-reveal-delay="120">
        <img src="/assets/uploads/site-icon.jpg" alt="Illustration used as the journal's icon" width="640" height="800" fetchpriority="high">
        <p class="hero__quote">“I write because I want to share my ideas to people.”</p>
      </div>
    </div>
    <div class="wrap">
      <div class="stats" data-reveal>
        <div><div class="stat__num">${posts.length}</div><div class="stat__label">Pieces written</div></div>
        <div><div class="stat__num">${Object.keys(site.categories).length}</div><div class="stat__label">Collections</div></div>
        <div><div class="stat__num">${years[years.length - 1]}–${years[0]}</div><div class="stat__label">Years of writing</div></div>
        <div><div class="stat__num">${esc(site.subscribers)}</div><div class="stat__label">Subscribers</div></div>
      </div>
    </div>
  </section>

  <section id="latest" style="padding-top:0">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <div>
          <p class="eyebrow">Latest</p>
          <h2>Fresh off the notebook</h2>
        </div>
        <p>The newest piece to arrive — start here, then wander through the rest.</p>
      </div>
      <article class="featured" data-reveal>
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
          <div class="hero__actions"><a class="btn btn--primary" href="${slugUrl(featured)}">Read the piece <span aria-hidden="true">→</span></a></div>
        </div>
      </article>
    </div>
  </section>

  <section style="padding-top:0">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <div>
          <p class="eyebrow">The Journal</p>
          <h2>Every piece, all in one place</h2>
        </div>
        <p><span id="result-count">${posts.length}</span> pieces shown. Filter by collection, or press <kbd>/</kbd> to search.</p>
      </div>
      <div class="toolbar" data-reveal>
        <div class="chips" role="group" aria-label="Filter by collection">${chips}</div>
        <label class="search">
          ${ICONS.search}
          <span class="skip">Search the journal</span>
          <input id="search-input" type="search" placeholder="Search the journal…" autocomplete="off">
        </label>
      </div>
      <div class="grid" id="journal">
        ${posts.map((p, i) => card(p, (i % 3) * 60)).join("\n")}
      </div>
      <div class="empty" id="empty" style="display:none;margin-top:1.4rem">Nothing matches that search — try another word.</div>
    </div>
  </section>

  <section style="padding-top:0">
    <div class="wrap">
      <div class="section-head" data-reveal>
        <div>
          <p class="eyebrow">Archive</p>
          <h2>Browse by year</h2>
        </div>
        <p>From a first game-theory post in 2017 to a beach poem in 2021.</p>
      </div>
      <div class="archive">${archive}</div>
    </div>
  </section>

  <section style="padding-top:0">
    <div class="wrap">
      <div class="subscribe" data-reveal>
        <div>
          <h2>Join ${esc(site.subscribers)} other subscribers</h2>
          <p>Get each new poem, story and reflection delivered to your inbox.</p>
        </div>
        <div>
          <form class="subscribe__form" action="mailto:${esc(site.author.email)}" method="post" enctype="text/plain">
            <input type="email" name="email" placeholder="you@example.com" aria-label="Your email address" required>
            <button class="btn btn--primary" type="submit">Subscribe</button>
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

  const figure = p.image
    ? `<figure class="article-figure"><img src="${p.image}" alt="${esc(p.title)}" loading="eager" decoding="async" width="900" height="600">${p.imageCaption ? `<figcaption>${esc(p.imageCaption)}</figcaption>` : ""}</figure>`
    : "";

  const nav = `
    <div class="postnav">
      ${newer ? `<a class="prev" href="${slugUrl(newer)}"><div class="dir">← Newer</div><div class="t">${esc(newer.title)}</div></a>` : "<span></span>"}
      ${older ? `<a class="next" href="${slugUrl(older)}"><div class="dir">Older →</div><div class="t">${esc(older.title)}</div></a>` : "<span></span>"}
    </div>`;

  const related = posts
    .filter((x) => x.category === p.category && x.slug !== p.slug)
    .slice(0, 3);

  const body = `
  <article>
    <header class="article-head">
      <div class="narrow">
        <a class="tag" href="/category/${CAT_SLUG(p.category)}/">${esc(p.category)}</a>
        <h1 class="article-title">${esc(p.title)}</h1>
        <div class="article-meta meta">
          <time datetime="${p.date}">${fmtDate(p.date)}</time>
          <span class="meta__dot"></span>
          <span class="reading">${readingTime(p.body)} min read</span>
          ${p.comments ? `<span class="meta__dot"></span><span>${p.comments} ${p.comments === 1 ? "comment" : "comments"} on the original post</span>` : ""}
        </div>
      </div>
    </header>
    <div class="narrow article-body${p.verse ? " is-verse" : ""}" data-reveal>
      ${figure}
      ${p.body}
      ${p.note ? `<p class="note">${esc(p.note)}</p>` : ""}
    </div>
    <div class="narrow endmark">
      <div class="endmark__glyph" aria-hidden="true">❦</div>
      <p class="meta">Written by ${esc(site.author.name)} · ${fmtDate(p.date)}</p>
    </div>
    <div class="narrow" style="padding-bottom:3rem">${nav}</div>
  </article>

  ${related.length ? `
  <section style="padding-top:0">
    <div class="wrap">
      <div class="section-head"><div><p class="eyebrow">Keep reading</p><h2>More ${esc(p.category.toLowerCase())}</h2></div></div>
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
      <p class="eyebrow eyebrow--accent" data-reveal>Collection</p>
      <h1 data-reveal>${esc(metaCat.symbol || "❦")} ${esc(name)}</h1>
      <p class="lede" style="margin-top:1rem;max-width:52ch" data-reveal>${esc(metaCat.blurb || "")}</p>
      <p class="meta" style="margin-top:1rem">${catPosts.length} ${catPosts.length === 1 ? "piece" : "pieces"}</p>
      <div class="chips" style="margin-top:1.6rem" data-reveal>${chips}</div>
    </div>
  </section>
  <section style="padding-top:0">
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
      <p class="eyebrow eyebrow--accent" data-reveal>Hello there</p>
      <h1 data-reveal>About Pebbles Martinez</h1>
    </div>
  </section>
  <section style="padding-top:0">
    <div class="wrap about-grid">
      <div data-reveal>
        <div class="portrait"><img src="/assets/uploads/site-icon.jpg" alt="Illustration used as Pebbles' avatar" width="640" height="800"></div>
      </div>
      <div class="prose" data-reveal data-reveal-delay="100">
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
        <div class="hero__actions"><a class="btn btn--primary" href="/">Read the journal <span aria-hidden="true">→</span></a><a class="btn btn--ghost" href="/contact/">Say hello</a></div>
      </div>
    </div>
  </section>`;
  return shell({ title: "About Pebbles Martinez", description: site.author.bio, active: "/about/", body, canonical: "/about/" });
}

function contactPage() {
  const body = `
  <section class="page-head">
    <div class="wrap">
      <p class="eyebrow eyebrow--accent" data-reveal>Say hello</p>
      <h1 data-reveal>Contact</h1>
      <p class="lede" style="margin-top:1rem;max-width:48ch" data-reveal>Thoughts on a poem? A kind word? A story of your own? Pebbles would love to hear from you.</p>
    </div>
  </section>
  <section style="padding-top:0">
    <div class="wrap">
      <div class="contact-card" data-reveal>
        <div class="contact-card__media"><img src="${site.contactImage}" alt="" loading="lazy" width="800" height="600"></div>
        <div class="contact-card__body">
          <span class="k">Name</span><span class="v">Pebbles Martinez</span>
          <span class="k">E-mail address</span><span class="v"><a href="mailto:${esc(site.author.email)}">${esc(site.author.email)}</a></span>
          <span class="k">Website</span><span class="v"><a href="https://betaether.wordpress.com">betaether.wordpress.com</a></span>
          <div class="hero__actions"><a class="btn btn--primary" href="mailto:${esc(site.author.email)}">Send an email <span aria-hidden="true">→</span></a></div>
        </div>
      </div>
    </div>
  </section>
  <section style="padding-top:0">
    <div class="wrap">
      <div class="subscribe" data-reveal>
        <div>
          <h2>Or follow along quietly</h2>
          <p>Join ${esc(site.subscribers)} other subscribers and get new pieces by email.</p>
        </div>
        <div>
          <form class="subscribe__form" action="mailto:${esc(site.author.email)}" method="post" enctype="text/plain">
            <input type="email" name="email" placeholder="you@example.com" aria-label="Your email address" required>
            <button class="btn btn--primary" type="submit">Subscribe</button>
          </form>
          <p class="subscribe__note">No spam, ever. Unsubscribe any time.</p>
        </div>
      </div>
    </div>
  </section>`;
  return shell({ title: "Contact", description: `Get in touch with ${site.author.name}.`, active: "/contact/", body, canonical: "/contact/" });
}

function archivePage() {
  const years = [...new Set(posts.map((p) => p.date.slice(0, 4)))].sort((a, b) => b - a);
  const list = years
    .map((y) => {
      const items = posts
        .filter((p) => p.date.startsWith(y))
        .map((p) => `<a class="year__item" href="${slugUrl(p)}"><span class="t">${esc(p.title)}</span><span class="d">${fmtDate(p.date, false)} · ${esc(p.category)}</span></a>`)
        .join("");
      return `<div class="year" data-reveal><div class="year__num">${y}</div><div class="year__list">${items}</div></div>`;
    })
    .join("");
  const body = `
  <section class="page-head">
    <div class="wrap">
      <p class="eyebrow eyebrow--accent" data-reveal>Everything</p>
      <h1 data-reveal>The Archive</h1>
      <p class="lede" style="margin-top:1rem" data-reveal>All ${posts.length} pieces, newest first.</p>
    </div>
  </section>
  <section style="padding-top:0"><div class="wrap"><div class="archive">${list}</div></div></section>`;
  return shell({ title: "Archive", description: `Every piece published on ${site.title}.`, active: "/archive/", body, canonical: "/archive/" });
}

function notFoundPage() {
  const body = `
  <section class="hero" style="text-align:center">
    <div class="narrow" style="display:grid;justify-items:center;gap:1rem">
      <p class="eyebrow eyebrow--accent">404</p>
      <h1 style="font-weight:300">This page wandered off</h1>
      <p class="lede">Like a poem half-written, it isn’t here. But the journal is.</p>
      <div class="hero__actions"><a class="btn btn--primary" href="/">Back to the journal <span aria-hidden="true">→</span></a></div>
    </div>
  </section>`;
  return shell({ title: "Page not found", description: "Page not found.", active: "/404", body, canonical: "/404/" });
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
