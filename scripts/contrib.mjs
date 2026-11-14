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
const H = 470;

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

function city(t) {
  const s = 9.6;
  const ox = 118;
  const oy = 250;
  // flattened isometric projection: weeks run left→right, weekdays recede down-left
  const iso = (gx, gy, z = 0) => [ox + gx * s * 1.62 - gy * s * 0.95, oy + gx * s * 0.2 + gy * s * 0.62 - z];
  const p = (x, y, z) => iso(x, y, z).map((v) => v.toFixed(1)).join(",");
  const tops = [t.name === "dark" ? "#2a4a55" : "#e9cfa8", C.sage, "#d86a4f", C.red, "#ff9a7d"];

  const cells = [];
  weeks.forEach((w, gx) => w.forEach((d) => cells.push({ gx, gy: d.weekday, d })));
  // painter's order: back row (Sunday) first, and left to right within a row,
  // so nearer towers are drawn over farther ones
  cells.sort((a, b) => a.gy - b.gy || a.gx - b.gx);

  let bars = "";
  for (const { gx, gy, d } of cells) {
    const top = tops[level(d.contributionCount)];
    const h = d.contributionCount ? 4 + Math.log1p(d.contributionCount) * 15 : 1.5;
    const g = 0.12;
    const [a, b, c, e] = [gx + g, gy + g, gx + 1 - g, gy + 1 - g];
    bars += `<g class="bar" style="animation-delay:${(0.2 + gx * 0.025).toFixed(2)}s">
<polygon points="${p(a, e, h)} ${p(c, e, h)} ${p(c, e, 0)} ${p(a, e, 0)}" fill="${shade(top, 0.62)}"/>
<polygon points="${p(c, b, h)} ${p(c, e, h)} ${p(c, e, 0)} ${p(c, b, 0)}" fill="${shade(top, 0.8)}"/>
<polygon points="${p(a, b, h)} ${p(c, b, h)} ${p(c, e, h)} ${p(a, e, h)}" fill="${top}"/></g>`;
  }
  const plate = [iso(0, 0), iso(weeks.length, 0), iso(weeks.length, 7), iso(0, 7)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
  const legend = tops.map((c, i) => `<rect x="${830 + i * 18}" y="${H - 44}" width="13" height="13" rx="2" fill="${c}"/>`).join("");

  const body = `
    ${eyebrow(40, 44, "+", "Contributions · 3d city", t.muted, t.accentInk)}
    ${statRow(t, 108)}
    <polygon points="${plate}" fill="none" stroke="${t.line}" stroke-width="1.5" stroke-dasharray="4 5" transform="translate(0 6)"/>
    ${bars}
    ${text("mono", "LESS", 820, H - 34, 9.5, { anchor: "end", ls: 1.4, fill: t.muted })}${legend}${text("mono", "MORE", 928, H - 34, 9.5, { ls: 1.4, fill: t.muted })}
    ${text("mono", `UPDATED ${fmt(days.at(-1).date).toUpperCase()}`, 40, H - 34, 9.5, { ls: 1.4, fill: t.muted })}`;

  return doc({
    w: W,
    h: H,
    bg: t.bg,
    css: `@keyframes grow{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}.bar{animation:grow .8s cubic-bezier(.22,1,.36,1) both}`,
    title: `${cal.totalContributions} contributions in the past year`,
    desc: `Isometric 3D chart of ${LOGIN}'s GitHub contributions: each day is a tower whose height follows its contribution count. Longest streak ${longest} days, ${activeDays} active days, best day ${best.contributionCount} on ${fmt(best.date)}.`,
    body,
  });
}

const out = new URL("../assets/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const t of Object.values(THEMES)) writeFileSync(new URL(`contrib-city-${t.name}.svg`, out), city(t));
console.log(`✓ contrib-city (${cal.totalContributions} contributions, ${activeDays} active days, longest streak ${longest}d)`);
