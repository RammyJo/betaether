/* Adventures of Pebbles — interactions */
(() => {
  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- theme ---------- */
  const THEME_KEY = "pebbles-theme";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) root.setAttribute("data-theme", stored);
  else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");

  const themeBtn = $(".theme-toggle");
  if (themeBtn) {
    const sync = () => themeBtn.setAttribute("aria-label", root.getAttribute("data-theme") === "dark" ? "Switch to light theme" : "Switch to dark theme");
    sync();
    themeBtn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      sync();
    });
  }

  /* ---------- mobile nav ---------- */
  const nav = $(".nav");
  const menuBtn = $(".menu-toggle");
  if (nav && menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    $$(".nav a").forEach((a) => a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      menuBtn.setAttribute("aria-expanded", "false");
    }));
  }

  /* ---------- sticky header ---------- */
  const header = $(".site-header");
  const progress = $(".progress");
  const toTop = $(".to-top");
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("is-stuck", y > 8);
    if (toTop) toTop.classList.toggle("is-visible", y > 600);
    if (progress) {
      const max = doc.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = max > 0 ? `${(y / max) * 100}%` : "0%";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------- reveal on scroll ---------- */
  const reveals = $$("[data-reveal]");
  if (reveals.length) {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const delay = Number(e.target.dataset.revealDelay || 0);
            setTimeout(() => e.target.classList.add("is-in"), delay);
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      reveals.forEach((el) => io.observe(el));
    } else {
      reveals.forEach((el) => el.classList.add("is-in"));
    }
  }

  /* ---------- journal filter + search ---------- */
  const grid = $("#journal");
  if (grid) {
    const cards = $$(".card", grid);
    const chips = $$(".chip[data-filter]");
    const input = $("#search-input");
    const empty = $("#empty");
    const count = $("#result-count");
    let activeCat = "all";

    const apply = () => {
      const q = (input?.value || "").trim().toLowerCase();
      let shown = 0;
      cards.forEach((card) => {
        const cat = card.dataset.category || "";
        const text = (card.dataset.search || "").toLowerCase();
        const okCat = activeCat === "all" || cat === activeCat;
        const okText = !q || text.includes(q);
        const show = okCat && okText;
        card.style.display = show ? "" : "none";
        if (show) shown += 1;
      });
      if (empty) empty.style.display = shown === 0 ? "" : "none";
      if (count) count.textContent = String(shown);
    };

    chips.forEach((chip) => chip.addEventListener("click", () => {
      activeCat = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      apply();
    }));
    input?.addEventListener("input", apply);
    apply();
  }

  /* ---------- keyboard shortcut: / focuses search ---------- */
  doc.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea/i.test(doc.activeElement?.tagName || "")) {
      const input = $("#search-input");
      if (input) { e.preventDefault(); input.focus(); }
    }
    if (e.key === "Escape" && nav?.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      menuBtn?.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
