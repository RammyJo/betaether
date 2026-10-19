/* ==========================================================================
   Adventures of Pebbles — motion & interaction engine
   Everything degrades gracefully: with no JavaScript, with reduced motion,
   or on touch devices the journal stays fully readable and calm.
   ========================================================================== */
(() => {
  const doc = document;
  const root = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const motionOK = () => !reduce.matches;

  /* ------------------------------------------------------------------------
     A single frame pump. Tasks run together in one rAF tick instead of each
     effect fighting for its own frame. A task returns true to ask for
     another frame (used by the easing cursor); otherwise we idle until the
     next scroll or pointer event.
     ------------------------------------------------------------------------ */
  const tasks = [];
  let rafId = 0;
  const schedule = () => {
    if (!rafId) rafId = requestAnimationFrame(runAll);
  };
  const runAll = () => {
    rafId = 0;
    let again = false;
    for (const t of tasks) {
      try {
        if (t() === true) again = true;
      } catch { /* a single effect must never break the page */ }
    }
    if (again) schedule();
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("pointermove", schedule, { passive: true });
  schedule();

  /* ============================================================== 1. theme */
  const THEME_KEY = "pebbles-theme";
  const themeBtn = $(".theme-toggle");
  if (themeBtn) {
    const sync = () =>
      themeBtn.setAttribute(
        "aria-label",
        root.getAttribute("data-theme") === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    sync();
    themeBtn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
      sync();
    });
  }

  /* ========================================================= 2. mobile nav */
  const nav = $(".nav");
  const menuBtn = $(".menu-toggle");
  if (nav && menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    $$(".nav a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        menuBtn.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ================================================ 3. hero title on load */
  requestAnimationFrame(() => {
    $$("[data-hero-title]").forEach((el) => el.classList.add("is-ready"));
  });

  /* ============================================== 4. reveal on scroll (IO) */
  const revealTargets = $$("[data-reveal], [data-verse]");
  const pending = new Set(revealTargets);
  const show = (el) => {
    const delay = Number(el.dataset.revealDelay || 0);
    if (delay && motionOK()) window.setTimeout(() => el.classList.add("is-in"), delay);
    else el.classList.add("is-in");
    pending.delete(el);
  };
  if (revealTargets.length) {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            show(e.target);
            io.unobserve(e.target);
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
      );
      revealTargets.forEach((el) => io.observe(el));

      /* Safety sweep. Observers are throttled in hidden tabs and some low-power
         modes, and if nothing ever reported we would ship a blank page. On load
         and whenever the tab becomes visible, anything sitting in the viewport
         is revealed directly. */
      const sweep = () => {
        if (doc.hidden) return;
        const vh = window.innerHeight;
        for (const el of Array.from(pending)) {
          const r = el.getBoundingClientRect();
          if (r.top < vh * 0.96 && r.bottom > 0) {
            show(el);
            io.unobserve(el);
          }
        }
      };
      window.addEventListener("load", sweep);
      doc.addEventListener("visibilitychange", () => {
        if (!doc.hidden) { sweep(); schedule(); }
      });
    } else {
      revealTargets.forEach((el) => el.classList.add("is-in"));
    }
  }

  /* ======================================== 5. sticky header & progress bar */
  const header = $(".site-header");
  const progress = $(".progress");
  const toTop = $(".to-top");
  let lastStuck = null;
  let lastPct = -1;
  tasks.push(() => {
    const y = window.scrollY;
    if (header) {
      const stuck = y > 8;
      if (stuck !== lastStuck) {
        header.classList.toggle("is-stuck", stuck);
        lastStuck = stuck;
      }
    }
    if (toTop) toTop.classList.toggle("is-visible", y > 700);
    if (progress) {
      const max = doc.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, (y / max) * 100) : 0;
      const rounded = Math.round(pct * 10) / 10;
      if (rounded !== lastPct) {
        progress.style.width = `${rounded}%`;
        progress.style.setProperty("--progress-mark", pct > 1 ? "1" : "0");
        lastPct = rounded;
      }
    }
  });
  if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: motionOK() ? "smooth" : "auto" }));

  /* ================================================= 6. the slow poem read */
  const poem = $("[data-scrollpoem]");
  if (poem) {
    const blocks = $$(".scrollpoem__block", poem);
    const bead = $(".scrollpoem__bead", poem);
    if ("IntersectionObserver" in window) {
      const pio = new IntersectionObserver(
        (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-in"); }),
        { rootMargin: "-38% 0px -38% 0px", threshold: 0 }
      );
      blocks.forEach((b) => pio.observe(b));
    } else {
      blocks.forEach((b) => b.classList.add("is-in"));
    }
    if (bead) {
      tasks.push(() => {
        const r = poem.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.bottom < -100 || r.top > vh + 100) return;
        const p = Math.min(1, Math.max(0, (vh * 0.5 - r.top) / Math.max(1, r.height)));
        bead.style.setProperty("--bead", `${Math.round(p * r.height)}px`);
      });
    }
  }

  /* ======================================================= 7. stat counters */
  const counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          cio.unobserve(el);
          const target = Number(el.dataset.count || 0);
          const suffix = el.dataset.countSuffix || "";
          if (!motionOK() || target === 0) {
            el.textContent = String(target) + suffix;
            return;
          }
          const dur = 1200;
          const start = performance.now();
          const tick = (now) => {
            const t = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = String(Math.round(target * eased)) + suffix;
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => cio.observe(c));
  }

  /* ========================================================= 8. the cursor */
  if (fine.matches && motionOK()) {
    const cursor = $(".cursor");
    if (cursor) {
      const dot = $(".cursor__dot", cursor);
      const ring = $(".cursor__ring", cursor);
      let mx = window.innerWidth / 2, my = window.innerHeight / 2;
      let dx = mx, dy = my, rx = mx, ry = my;
      let on = false, settled = true;

      window.addEventListener(
        "pointermove",
        (e) => {
          mx = e.clientX;
          my = e.clientY;
          settled = false;
          if (!on) { on = true; cursor.classList.add("is-on"); }
          const t = e.target instanceof Element ? e.target.closest("a, button, summary, input, [data-tilt]") : null;
          cursor.classList.toggle("is-hot", !!t);
        },
        { passive: true }
      );
      window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
      window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
      doc.addEventListener("mouseleave", () => { on = false; cursor.classList.remove("is-on"); });
      doc.addEventListener("mouseenter", () => { on = true; cursor.classList.add("is-on"); });

      tasks.push(() => {
        dx += (mx - dx) * 0.55;
        dy += (my - dy) * 0.55;
        rx += (mx - rx) * 0.16;
        ry += (my - ry) * 0.16;
        dot.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
        ring.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
        if (Math.abs(mx - rx) < 0.4 && Math.abs(my - ry) < 0.4) {
          if (settled) return false;
          settled = true;
          return false;
        }
        return true; // keep easing
      });
    }
  }

  /* ================================================ 9. magnetic + spotlight */
  if (fine.matches && motionOK()) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointerenter", () => el.classList.add("is-magnetic"));
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.transform = `translate3d(${((px - 0.5) * 10).toFixed(2)}px, ${((py - 0.5) * 8 - 2).toFixed(2)}px, 0)`;
      });
      el.addEventListener("pointerleave", () => {
        el.classList.remove("is-magnetic");
        el.style.transform = "";
      });
    });

    $$("[data-tilt]").forEach((card) => {
      const MAX = 4;
      let queued = false, px = 0.5, py = 0.5;
      const apply = () => {
        queued = false;
        card.style.transform =
          `perspective(900px) rotateX(${((0.5 - py) * MAX * 2).toFixed(2)}deg) ` +
          `rotateY(${((px - 0.5) * MAX * 2).toFixed(2)}deg) translateY(-5px)`;
      };
      card.addEventListener("pointerenter", () => card.classList.add("is-tilting"));
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width;
        py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        if (!queued) { queued = true; requestAnimationFrame(apply); }
      });
      card.addEventListener("pointerleave", () => {
        card.classList.remove("is-tilting");
        card.style.transform = "";
      });
    });
  }

  /* ========================================================== 10. parallax */
  const parallaxEls = $$("[data-parallax]");
  if (parallaxEls.length && motionOK()) {
    const layers = parallaxEls
      .map((el) => ({ el, depth: Number(el.dataset.parallax) || 0.05, inner: el.querySelector(".hero__card-img, img") }))
      .filter((l) => l.inner);
    if (layers.length) {
      tasks.push(() => {
        const vh = window.innerHeight;
        layers.forEach(({ el, depth, inner }) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          const offset = (r.top + r.height / 2 - vh / 2) * depth;
          inner.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
        });
      });
    }
  }

  /* ====================================================== 11. petals canvas */
  const canvas = $(".petals");
  if (canvas && motionOK()) {
    const ctx = canvas.getContext("2d");
    let petals = [];
    let w = 0, h = 0, raf = 0, running = true, lastDraw = 0, scrollY = window.scrollY;
    const COLORS = ["#c98a3c", "#a8452b", "#64775a", "#d9a441"];

    const spawn = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : -20 - Math.random() * 60,
      s: 3 + Math.random() * 5,
      vy: 0.18 + Math.random() * 0.45,
      sway: 0.5 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.012,
      a: 0.18 + Math.random() * 0.4,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    });

    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(8, Math.min(20, Math.round(w / 95)));
      petals = Array.from({ length: count }, () => spawn(true));
    };

    const loop = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (now - lastDraw < 32) return;       // cap at ~30fps to spare the battery
      const dt = Math.min(80, now - lastDraw);
      lastDraw = now;
      const dark = root.getAttribute("data-theme") === "dark";
      const drift = (window.scrollY - scrollY) * 0.05;
      scrollY = window.scrollY;

      ctx.clearRect(0, 0, w, h);
      for (const p of petals) {
        p.phase += dt * 0.0007;
        p.rot += p.vr * dt * 0.06;
        p.y += p.vy * dt * 0.06 - drift;
        if (p.y > h + 40 || p.y < -100) Object.assign(p, spawn(false));
        ctx.save();
        ctx.translate(p.x + Math.sin(p.phase) * p.sway * 14, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = dark ? p.a * 0.7 : p.a;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    size();
    raf = requestAnimationFrame(loop);

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { size(); schedule(); }, 180);
    });
    doc.addEventListener("visibilitychange", () => {
      if (doc.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; lastDraw = 0; raf = requestAnimationFrame(loop); }
    });
    const stop = () => {
      if (reduce.matches) {
        running = false;
        cancelAnimationFrame(raf);
        ctx.clearRect(0, 0, w, h);
        canvas.style.display = "none";
      }
    };
    reduce.addEventListener?.("change", stop);
    stop();
  }

  /* ============================================ 12. journal filter + search */
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
        const okCat = activeCat === "all" || card.dataset.category === activeCat;
        const okText = !q || (card.dataset.search || "").toLowerCase().includes(q);
        const show = okCat && okText;
        card.style.display = show ? "" : "none";
        if (show) shown += 1;
      });
      if (empty) empty.style.display = shown === 0 ? "" : "none";
      if (count) count.textContent = String(shown);
    };

    chips.forEach((chip) =>
      chip.addEventListener("click", () => {
        activeCat = chip.dataset.filter;
        chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
        apply();
      })
    );
    input?.addEventListener("input", apply);
    apply();
  }

  /* ================================================== 13. keyboard shortcuts */
  doc.addEventListener("keydown", (e) => {
    const tag = doc.activeElement?.tagName || "";
    if (e.key === "/" && !/input|textarea|select/i.test(tag)) {
      const input = $("#search-input");
      if (input) { e.preventDefault(); input.focus(); }
    }
    if (e.key === "Escape" && nav?.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      menuBtn?.setAttribute("aria-expanded", "false");
    }
  });

  /* ============================================================ 14. the year */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* The motion engine is alive: cancel the "show everything statically" net. */
  window.__pebblesReady = true;
})();
