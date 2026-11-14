// Draws the past year of GitHub contributions as an isometric "3D city" in the
// portfolio palette, writing assets/contrib-city-light.svg and -dark.svg.
//
// Needs a token that can read public profile data:
//   - in GitHub Actions: GITHUB_TOKEN (see .github/workflows/contrib-city.yml)
//   - locally: GITHUB_TOKEN=$(gh auth token) node scripts/contrib.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { C, THEMES, doc, eyebrow, text } from "./lib.mjs";

const LOGIN = process.env.GH_LOGIN ?? "dhruvag14";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN is not set");
  process.exit(1);
}

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount weekday } } }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": `${LOGIN}-profile-readme` },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
});
const json = await res.json();
if (!res.ok || json.errors) {
  console.error("GitHub API error:", JSON.stringify(json.errors ?? json));
  process.exit(1);
}
const cal = json.data.user.contributionsCollection.contributionCalendar;
const weeks = cal.weeks.map((w) => w.contributionDays);
const days = weeks.flat();

/* ---------- stats ---------- */
let longest = 0;
let run = 0;
for (const d of days) {
  run = d.contributionCount > 0 ? run + 1 : 0;
  longest = Math.max(longest, run);
}
const best = days.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a));
const activeDays = days.filter((d) => d.contributionCount > 0).length;
const level = (n) => (n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 12 ? 3 : 4);
const fmt = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/* ---------- drawing ---------- */
const W = 1000;
const H = 500;

function statRow(t, y) {
  return [
    [String(cal.totalContributions), "contributions, past year"],
    [`${longest}d`, "longest streak"],
    [String(activeDays), "active days"],
    [String(best.contributionCount), `best day · ${fmt(best.date)}`],
  ]
    .map(([v, l], i) => {
      const x = 40 + i * 235;
      return text("display", v, x, y, 40, { fill: i === 0 ? C.red : t.ink, ls: -1 }) + text("mono", l.toUpperCase(), x, y + 22, 9.5, { ls: 1.6, fill: t.muted });
    })
    .join("");
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
}

/**
 * An original kaiju: a giant teal lizard with a sand belly, small horns and rust
 * back plates. Drawn facing right with its feet at (0,0); legs, tail and body are
 * animated with SMIL in place; its walk across the city is a CSS animation (see
 * .walker in city()) so it shares a clock with the tower-smash animations.
 */
function kaiju(t, start) {
  const skin = t.name === "dark" ? "#5f8584" : C.teal;
  const skinDark = t.name === "dark" ? "#46696a" : "#1a3640";
  const belly = "#e9cfa8";
  const step = 0.9; // seconds per stride
  const leg = (hipX, phase, fill) => `
    <g>
      <path d="M${hipX - 7},-30 C${hipX - 10},-18 ${hipX - 8},-8 ${hipX - 6},0 L${hipX + 9},0 C${hipX + 8},-10 ${hipX + 9},-20 ${hipX + 7},-30 Z" fill="${fill}"/>
      <path d="M${hipX - 8},0 L${hipX + 13},0 L${hipX + 15},-4 L${hipX - 6},-5 Z" fill="${fill}"/>
      <animateTransform attributeName="transform" type="rotate" dur="${step}s" repeatCount="indefinite"
        values="${phase ? "16" : "-16"} ${hipX} -28; ${phase ? "-16" : "16"} ${hipX} -28; ${phase ? "16" : "-16"} ${hipX} -28"/>
    </g>`;
  const plates = [
    [-22, -62],
    [-16, -76],
    [-8, -88],
    [2, -96],
    [-28, -46],
    [-34, -32],
  ]
    .map(([x, y], i) => {
      const s = i < 4 ? 9 : 7;
      return `<path d="M${x - s * 0.6},${y + 3} L${x - s * 0.9},${y - s} L${x + s * 0.5},${y + 1} Z" fill="${C.rust}"/>`;
    })
    .join("");
  const puff = (x, delay) =>
    `<circle cx="${x}" cy="-2" r="3" fill="${C.cream}" opacity="0">
       <animate attributeName="r" values="2;11" dur="${step}s" begin="${delay}s" repeatCount="indefinite"/>
       <animate attributeName="opacity" values=".75;0" dur="${step}s" begin="${delay}s" repeatCount="indefinite"/>
     </circle>`;
  return `<g class="walker" transform="translate(${start})"><g transform="scale(1.3)">
    <ellipse cx="0" cy="2" rx="46" ry="7" fill="${C.tealDeep}" opacity=".28"/>
    ${puff(-12, 0)}${puff(14, step / 2)}
    ${leg(-14, 0, skinDark)}
    <g>
      <animateTransform attributeName="transform" type="translate" dur="${step / 2}s" repeatCount="indefinite" values="0 0; 0 -3; 0 0"/>
      <g>
        <path d="M-26,-34 C-48,-30 -70,-18 -92,-6 C-74,-10 -52,-14 -22,-20 Z" fill="${skin}"/>
        <animateTransform attributeName="transform" type="rotate" dur="${step * 2}s" repeatCount="indefinite" values="-5 -24 -28; 5 -24 -28; -5 -24 -28"/>
      </g>
      ${plates}
      <path d="M-30,-22 C-38,-56 -22,-90 4,-99 C24,-104 34,-86 30,-62 C27,-42 22,-26 10,-16 C-2,-12 -20,-12 -30,-22 Z" fill="${skin}"/>
      <path d="M6,-90 C20,-80 22,-52 14,-24 L4,-22 C10,-50 9,-74 1,-87 Z" fill="${belly}" opacity=".9"/>
      <path d="M16,-62 L33,-58 L34,-52 L30,-50 L28,-54 L15,-56 Z" fill="${skinDark}"/>
      <g>
        <path d="M2,-96 C10,-114 40,-117 54,-106 C60,-101 58,-93 50,-91 L31,-89 C21,-87 10,-88 2,-92 Z" fill="${skin}"/>
        <path d="M30,-89 L50,-91 C54,-91 56,-88 53,-85 L33,-84 Z" fill="${skinDark}"/>
        <path d="M17,-108 L13,-121 L24,-111 Z" fill="${belly}"/>
        <path d="M27,-111 L27,-123 L34,-112 Z" fill="${belly}"/>
        <circle cx="39" cy="-103" r="3" fill="${C.red}"/>
        <circle cx="39" cy="-103" r="6" fill="${C.red}" opacity=".25"/>
        <animateTransform attributeName="transform" type="rotate" dur="${step}s" repeatCount="indefinite" values="-3 6 -94; 3 6 -94; -3 6 -94"/>
      </g>
    </g>
    ${leg(6, 1, skin)}
    </g>
  </g>`;
}

function city(t) {
  const s = 9.6;
  const ox = 118;
  const oy = 285;
  // flattened isometric projection: weeks run left→right, weekdays recede down-left
  const iso = (gx, gy, z = 0) => [ox + gx * s * 1.62 - gy * s * 0.95, oy + gx * s * 0.2 + gy * s * 0.62 - z];
  const p = (x, y, z) => iso(x, y, z).map((v) => v.toFixed(1)).join(",");
  const tops = [t.name === "dark" ? "#2a4a55" : "#e9cfa8", C.sage, "#d86a4f", C.red, "#ff9a7d"];

  const cells = [];
  weeks.forEach((w, gx) => w.forEach((d) => cells.push({ gx, gy: d.weekday, d })));
  // painter's order: back row (Sunday) first, and left to right within a row,
  // so nearer towers are drawn over farther ones
  cells.sort((a, b) => a.gy - b.gy || a.gx - b.gx);

  // The kaiju walks down the middle of the city from START to END (grid units),
  // taking T seconds; each column is flattened as it passes and regrows later.
  const T = 24;
  const START = -7;
  const END = weeks.length + 8;
  const LANE = 3.5;
  const passAt = (gx) => (((gx + 0.5 - START) / (END - START)) * T).toFixed(2);

  let bars = "";
  for (const { gx, gy, d } of cells) {
    const top = tops[level(d.contributionCount)];
    const h = d.contributionCount ? 4 + Math.log1p(d.contributionCount) * 15 : 1.5;
    const g = 0.12;
    const [a, b, c, e] = [gx + g, gy + g, gx + 1 - g, gy + 1 - g];
    bars += `<g class="bar" style="animation-delay:${(0.2 + gx * 0.025).toFixed(2)}s"><g class="smash" style="animation-delay:${passAt(gx)}s">
<polygon points="${p(a, e, h)} ${p(c, e, h)} ${p(c, e, 0)} ${p(a, e, 0)}" fill="${shade(top, 0.62)}"/>
<polygon points="${p(c, b, h)} ${p(c, e, h)} ${p(c, e, 0)} ${p(c, b, 0)}" fill="${shade(top, 0.8)}"/>
<polygon points="${p(a, b, h)} ${p(c, b, h)} ${p(c, e, h)} ${p(a, e, h)}" fill="${top}"/></g></g>`;
  }
  const [sx, sy] = iso(START, LANE);
  const [ex, ey] = iso(END, LANE);
  const from = `${sx.toFixed(1)}px,${(sy + 4).toFixed(1)}px`;
  const to = `${ex.toFixed(1)}px,${(ey + 4).toFixed(1)}px`;
  const monster = kaiju(t, from.replace(/px/g, "").replace(",", " "));
  const plate = [iso(0, 0), iso(weeks.length, 0), iso(weeks.length, 7), iso(0, 7)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
  const legend = tops.map((c, i) => `<rect x="${830 + i * 18}" y="${H - 44}" width="13" height="13" rx="2" fill="${c}"/>`).join("");

  const body = `
    ${eyebrow(40, 44, "+", "Contributions · 3d city", t.muted, t.accentInk)}
    ${statRow(t, 108)}
    <polygon points="${plate}" fill="none" stroke="${t.line}" stroke-width="1.5" stroke-dasharray="4 5" transform="translate(0 6)"/>
    ${bars}
    ${monster}
    ${text("mono", "LESS", 820, H - 34, 9.5, { anchor: "end", ls: 1.4, fill: t.muted })}${legend}${text("mono", "MORE", 928, H - 34, 9.5, { ls: 1.4, fill: t.muted })}
    ${text("mono", `UPDATED ${fmt(days.at(-1).date).toUpperCase()}`, 40, H - 34, 9.5, { ls: 1.4, fill: t.muted })}`;

  return doc({
    w: W,
    h: H,
    bg: t.bg,
    css: `@keyframes grow{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}.bar{animation:grow .8s cubic-bezier(.22,1,.36,1) both}
      @keyframes smash{0%{transform:none}1.4%{transform:scaleY(.12) skewX(-10deg)}70%{transform:scaleY(.12) skewX(-10deg)}74%{transform:scaleY(1.08)}77%,100%{transform:none}}
      .smash{animation:smash ${T}s linear infinite;transform-box:fill-box;transform-origin:50% 100%}
      @keyframes walk{from{transform:translate(${from})}to{transform:translate(${to})}}
      .walker{animation:walk ${T}s linear infinite}`,
    title: `${cal.totalContributions} contributions in the past year`,
    desc: `Isometric 3D chart of ${LOGIN}'s GitHub contributions: each day is a tower whose height follows its contribution count, while a giant lizard kaiju stomps through the city flattening towers that later regrow. Longest streak ${longest} days, ${activeDays} active days, best day ${best.contributionCount} on ${fmt(best.date)}.`,
    body,
  });
}

const out = new URL("../assets/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const t of Object.values(THEMES)) writeFileSync(new URL(`contrib-city-${t.name}.svg`, out), city(t));
console.log(`✓ contrib-city (${cal.totalContributions} contributions, ${activeDays} active days, longest streak ${longest}d)`);
