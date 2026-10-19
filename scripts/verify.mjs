import { readFileSync } from "node:fs";

const css = readFileSync("src/styles.css", "utf8");
const app = readFileSync("src/app.js", "utf8");
const html = readFileSync("dist/index.html", "utf8");

const pass = (label, ok) => console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);

pass("hero masked line scoped to .js", /\.js \.line__inner\s*\{[^}]*translate3d\(0,\s*110%/.test(css));
pass("no unscoped .line__inner translate", !/(^|\n)\.line__inner\s*\{[^}]*translate3d/.test(css));
pass(
  "stagger delayed above the shorthand",
  /\.js \.hero__title\.is-ready \.line\[data-line="1"\] \.line__inner\s*\{[^}]*animation-delay/.test(css)
);
pass("reveal hidden state scoped to .js", /\.js \[data-reveal\]\s*\{\s*opacity:\s*0/.test(css));
pass("safety net in <head>", /__pebblesReady=false/.test(html) && /addEventListener\("error",fallback\)/.test(html));
pass("3000ms static fallback", /setTimeout\(fallback,3000\)/.test(html));
pass("ready flag set by engine", /window\.__pebblesReady = true/.test(app));
pass("viewport sweep on visibilitychange", /visibilitychange/.test(app));
pass("swerve: reduced motion unmasks lines", /\.line__inner\s*\{\s*transform:\s*none !important/.test(css));
pass("prefers-reduced-motion block present", /prefers-reduced-motion:\s*reduce/.test(css));
pass("view transitions declared", /@view-transition\s*\{\s*navigation:\s*auto/.test(css));
pass("single frame pump (no per-effect rAF)", /const runAll = \(\) =>/.test(app));
pass("spoiler is a real <details>", /<details class="answer">/.test(readFileSync("dist/post/monty-hall-problem/index.html", "utf8")));
