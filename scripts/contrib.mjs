// Draws the past year of GitHub contributions as an isometric "3D city" in the
// portfolio palette, writing assets/contrib-city-light.svg and -dark.svg.
//
// The city sits between two seas. An original kaiju surfaces at random spots
// (seeded by the date, so every daily render differs), flattens a block of
// towers, shoots down helicopters with its breath, and sinks back. Everything
// runs on one CSS animation clock so the events stay in sync.
//
// Needs a token that can read public profile data:
//   - in GitHub Actions: GITHUB_TOKEN (see .github/workflows/contrib-city.yml)
//   - locally: GITHUB_TOKEN=$(gh auth token) node scripts/contrib.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { C, THEMES, doc, eyebrow, rng, text } from "./lib.mjs";

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

/* ---------- geometry ---------- */
const W = 1000;
const H = 560;
const CELL = 9.6;
const OX = 118;
const OY = 310;
// flattened isometric projection: weeks run left→right, weekdays recede down-left
const iso = (gx, gy, z = 0) => [OX + gx * CELL * 1.62 - gy * CELL * 0.95, OY + gx * CELL * 0.2 + gy * CELL * 0.62 - z];
const pt = (x, y, z) => iso(x, y, z).map((v) => v.toFixed(1)).join(",");
const NW = weeks.length;

/* ---------- the scene script (same for both themes) ---------- */
const T = 36; // seconds per loop
const seed = Number(days.at(-1).date.replace(/-/g, ""));
const R = rng(seed);
const MOUTH = [70, -127]; // kaiju mouth relative to its feet (after scaling)
const SEA = { back: { sea: -2.0, land: 1.4 }, front: { sea: 8.9, land: 5.4 } };

const attacks = [];
for (const [k, side] of ["back", "front", R() < 0.5 ? "back" : "front"].entries()) {
  let gx;
  do gx = 4 + Math.floor(R() * (NW - 9));
  while (attacks.some((a) => Math.abs(a.gx - gx) < 12));
  const s = 1 + k * 12;
  const [seaX, seaY] = iso(gx + 0.5, SEA[side].sea);
  const [kx, ky] = iso(gx + 0.5, SEA[side].land);
  const dir = kx < 260 ? 1 : kx > 740 ? -1 : R() < 0.5 ? 1 : -1;
  const mouth = [kx + dir * MOUTH[0], ky + MOUTH[1]];
  const hit = [mouth[0] + dir * (150 + R() * 110), Math.min(255, Math.max(160, mouth[1] - 10 - R() * 50))];
  const flyDir = R() < 0.5 ? 1 : -1;
  attacks.push({ k, side, gx, gy: (SEA[side].land - 0.5), s, sea: [seaX, seaY], land: [kx, ky], dir, mouth, hit, flyDir });
}

const at = (sec) => `${Math.min(100, Math.max(0, (sec / T) * 100)).toFixed(3)}%`;
/** Build @keyframes from [seconds, declarations] pairs, padding 0% and 100%. */
function keyframes(name, frames) {
  const sorted = [...frames].sort((a, b) => a[0] - b[0]);
  const out = [];
  if (sorted[0][0] > 0) out.push(`0%{${sorted[0][1]}}`);
  for (const [sec, css] of sorted) out.push(`${at(sec)}{${css}}`);
  if (sorted.at(-1)[0] < T) out.push(`100%{${sorted.at(-1)[1]}}`);
  return `@keyframes ${name}{${out.join("")}}`;
}
const tr = ([x, y], dy = 0, extra = "") => `transform:translate(${x.toFixed(1)}px,${(y + dy).toFixed(1)}px)${extra}`;

/* ---------- sprites ---------- */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
}

/** An original kaiju: teal lizard, sand belly, small horns, rust back plates. Feet at (0,0), facing right. */
function kaiju(t) {
  const skin = t.name === "dark" ? "#5f8584" : C.teal;
  const skinDark = t.name === "dark" ? "#46696a" : "#1a3640";
  const belly = "#e9cfa8";
  const step = 0.9;
  const leg = (hipX, phase, fill) => `
    <g>
      <path d="M${hipX - 7},-30 C${hipX - 10},-18 ${hipX - 8},-8 ${hipX - 6},0 L${hipX + 9},0 C${hipX + 8},-10 ${hipX + 9},-20 ${hipX + 7},-30 Z" fill="${fill}"/>
      <path d="M${hipX - 8},0 L${hipX + 13},0 L${hipX + 15},-4 L${hipX - 6},-5 Z" fill="${fill}"/>
      <animateTransform attributeName="transform" type="rotate" dur="${step}s" repeatCount="indefinite"
        values="${phase ? "12" : "-12"} ${hipX} -28; ${phase ? "-12" : "12"} ${hipX} -28; ${phase ? "12" : "-12"} ${hipX} -28"/>
    </g>`;
  const plates = [[-22, -62], [-16, -76], [-8, -88], [2, -96], [-28, -46], [-34, -32]]
    .map(([x, y], i) => {
      const s = i < 4 ? 9 : 7;
      return `<path d="M${x - s * 0.6},${y + 3} L${x - s * 0.9},${y - s} L${x + s * 0.5},${y + 1} Z" fill="${C.rust}"/>`;
    })
    .join("");
  return `<g transform="scale(1.3)">
    <ellipse cx="0" cy="2" rx="46" ry="7" fill="${C.tealDeep}" opacity=".28"/>
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
      <path d="M2,-96 C10,-114 40,-117 54,-106 C60,-101 58,-93 50,-91 L31,-89 C21,-87 10,-88 2,-92 Z" fill="${skin}"/>
      <path d="M30,-89 L50,-91 C54,-91 56,-88 53,-85 L33,-84 Z" fill="${skinDark}"/>
      <path d="M17,-108 L13,-121 L24,-111 Z" fill="${belly}"/>
      <path d="M27,-111 L27,-123 L34,-112 Z" fill="${belly}"/>
      <circle cx="39" cy="-103" r="3" fill="${C.red}"/>
      <circle cx="39" cy="-103" r="6" fill="${C.red}" opacity=".25"/>
    </g>
    ${leg(6, 1, skin)}
  </g>`;
}

/** Small helicopter centred on (0,0), facing right. */
function heli(t) {
  const body = t.name === "dark" ? C.cream : C.tealDeep;
  const glass = t.name === "dark" ? C.sage : "#cfe0df";
  return `<g>
    <rect x="-34" y="-3" width="22" height="3" rx="1.5" fill="${body}"/>
    <path d="M-36,-3 L-31,-11 L-28,-11 L-30,-1 Z" fill="${body}"/>
    <ellipse cx="0" cy="0" rx="16" ry="7.5" fill="${body}"/>
    <ellipse cx="8" cy="-1.5" rx="6.5" ry="4.2" fill="${glass}"/>
    <line x1="-2" y1="-7" x2="-2" y2="-11" stroke="${body}" stroke-width="2"/>
    <line x1="-24" y1="-12" x2="20" y2="-12" stroke="${body}" stroke-width="2" stroke-linecap="round" class="rotor"/>
    <path d="M-10,7 L-12,11 M6,7 L8,11 M-16,11 L14,11" stroke="${body}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="-14" cy="0" r="1.6" fill="${C.red}" class="blink"/>
  </g>`;
}

/* ---------- drawing ---------- */
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

function sea(t, gy0, gy1, cls) {
  const water = t.name === "dark" ? C.teal : C.sage;
  const poly = [iso(-8, gy0), iso(NW + 8, gy0), iso(NW + 8, gy1), iso(-8, gy1)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
  let waves = "";
  for (let i = 0; i < 4; i++) {
    const gy = gy0 + ((i + 0.5) * (gy1 - gy0)) / 4;
    const [x0, y0] = iso(-8, gy);
    const [x1, y1] = iso(NW + 8, gy);
    waves += `<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${C.cream}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="${10 + i * 3} ${22 + i * 5}" opacity=".45" class="${cls}${i % 2}"/>`;
  }
  return `<polygon points="${poly}" fill="${water}" opacity="${t.name === "dark" ? 0.9 : 0.6}"/>${waves}`;
}

function city(t) {
  const tops = [t.name === "dark" ? "#2a4a55" : "#e9cfa8", C.sage, "#d86a4f", C.red, "#ff9a7d"];
  const css = [];

  // which towers each attack flattens
  const smashedBy = new Map();
  for (const a of attacks) {
    for (let gx = a.gx - 2; gx <= a.gx + 2; gx++)
      for (let gy = 0; gy < 7; gy++) if (Math.abs(gy - a.gy) <= 2.6 && R() > 0.12) smashedBy.set(`${gx},${gy}`, a.k);
    const hitAt = a.s + 2.6;
    css.push(
      keyframes(`smash${a.k}`, [
        [hitAt - 0.01, "transform:none"],
        [hitAt + 0.35, "transform:scaleY(.1) skewX(-12deg)"],
        [hitAt + 8, "transform:scaleY(.1) skewX(-12deg)"],
        [hitAt + 8.6, "transform:scaleY(1.1)"],
        [hitAt + 8.9, "transform:none"],
      ]),
      `.smash${a.k}{animation:smash${a.k} ${T}s linear infinite;transform-box:fill-box;transform-origin:50% 100%}`
    );
  }

  const cells = [];
  weeks.forEach((w, gx) => w.forEach((d) => cells.push({ gx, gy: d.weekday, d })));
  cells.sort((a, b) => a.gy - b.gy || a.gx - b.gx); // back to front

  let bars = "";
  for (const { gx, gy, d } of cells) {
    const top = tops[level(d.contributionCount)];
    const h = d.contributionCount ? 4 + Math.log1p(d.contributionCount) * 15 : 1.5;
    const g = 0.12;
    const [a, b, c, e] = [gx + g, gy + g, gx + 1 - g, gy + 1 - g];
    const k = smashedBy.get(`${gx},${gy}`);
    bars += `<g class="bar" style="animation-delay:${(0.2 + gx * 0.025).toFixed(2)}s"><g${k !== undefined ? ` class="smash${k}"` : ""}>
<polygon points="${pt(a, e, h)} ${pt(c, e, h)} ${pt(c, e, 0)} ${pt(a, e, 0)}" fill="${shade(top, 0.62)}"/>
<polygon points="${pt(c, b, h)} ${pt(c, e, h)} ${pt(c, e, 0)} ${pt(c, b, 0)}" fill="${shade(top, 0.8)}"/>
<polygon points="${pt(a, b, h)} ${pt(c, b, h)} ${pt(c, e, h)} ${pt(a, e, h)}" fill="${top}"/></g></g>`;
  }

  // kaiju appearances, beams, helicopters, explosions
  let actors = "";
  let defs = "";
  for (const a of attacks) {
    const { k, s, sea: sp, land, dir, mouth, hit, flyDir } = a;
    // kaiju: surface, wade in, stomp, hold, wade out, sink
    css.push(
      keyframes(`kz${k}`, [
        [s - 0.01, `${tr(sp, 80)};opacity:0`],
        [s, `${tr(sp, 80)};opacity:1`],
        [s + 1.2, `${tr(sp)};opacity:1`],
        [s + 2.6, `${tr(land)};opacity:1`],
        [s + 6.6, `${tr(land)};opacity:1`],
        [s + 8, `${tr(sp)};opacity:1`],
        [s + 9, `${tr(sp, 80)};opacity:1`],
        [s + 9.01, `${tr(sp, 80)};opacity:0`],
      ]),
      `.kz${k}{animation:kz${k} ${T}s linear infinite;opacity:0}`
    );
    actors += `<g class="kz${k}"><g transform="scale(${dir},1)">${kaiju(t)}</g></g>`;

    // splash rings where it surfaces and sinks
    css.push(
      keyframes(`sp${k}`, [
        [s - 0.01, "transform:scale(.2);opacity:0"],
        [s + 0.1, "transform:scale(.3);opacity:.9"],
        [s + 1.4, "transform:scale(1.4);opacity:0"],
        [s + 8.4, "transform:scale(.3);opacity:0"],
        [s + 8.5, "transform:scale(.3);opacity:.9"],
        [s + 9.8, "transform:scale(1.4);opacity:0"],
      ]),
      `.sp${k}{animation:sp${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`
    );
    actors += `<ellipse cx="${sp[0].toFixed(1)}" cy="${sp[1].toFixed(1)}" rx="48" ry="12" fill="none" stroke="${C.cream}" stroke-width="2.5" class="sp${k}"/>`;

    // dust burst when it stomps the towers
    css.push(
      keyframes(`du${k}`, [
        [s + 2.55, "transform:scale(.2);opacity:0"],
        [s + 2.65, "transform:scale(.4);opacity:.85"],
        [s + 3.8, "transform:scale(1.5);opacity:0"],
      ]),
      `.du${k}{animation:du${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`
    );
    actors += `<ellipse cx="${land[0].toFixed(1)}" cy="${(land[1] - 6).toFixed(1)}" rx="60" ry="16" fill="${C.cream}" class="du${k}"/>`;

    // breath: charge glow at the mouth, then a beam to the helicopter
    const len = Math.hypot(hit[0] - mouth[0], hit[1] - mouth[1]).toFixed(0);
    defs += `<linearGradient id="beam${k}" gradientUnits="userSpaceOnUse" x1="${mouth[0].toFixed(1)}" y1="${mouth[1].toFixed(1)}" x2="${hit[0].toFixed(1)}" y2="${hit[1].toFixed(1)}"><stop offset="0" stop-color="#7a8cff"/><stop offset=".55" stop-color="#9b6bff"/><stop offset="1" stop-color="#c25cff"/></linearGradient>`;
    css.push(
      keyframes(`ch${k}`, [
        [s + 3.4, "transform:scale(.2);opacity:0"],
        [s + 4.1, "transform:scale(1.2);opacity:1"],
        [s + 5.3, "transform:scale(1);opacity:1"],
        [s + 5.7, "transform:scale(.2);opacity:0"],
      ]),
      `.ch${k}{animation:ch${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`,
      keyframes(`bm${k}`, [
        [s + 4.15, `stroke-dashoffset:${len};opacity:0`],
        [s + 4.2, `stroke-dashoffset:${len};opacity:1`],
        [s + 4.6, "stroke-dashoffset:0;opacity:1"],
        [s + 5.3, "stroke-dashoffset:0;opacity:1"],
        [s + 5.7, "stroke-dashoffset:0;opacity:0"],
      ]),
      `.bm${k}{animation:bm${k} ${T}s linear infinite;stroke-dasharray:${len};opacity:0}`
    );
    actors += `
      <circle cx="${mouth[0].toFixed(1)}" cy="${mouth[1].toFixed(1)}" r="13" fill="url(#beam${k})" filter="url(#glow)" class="ch${k}"/>
      <line x1="${mouth[0].toFixed(1)}" y1="${mouth[1].toFixed(1)}" x2="${hit[0].toFixed(1)}" y2="${hit[1].toFixed(1)}" stroke="url(#beam${k})" stroke-width="16" stroke-linecap="round" filter="url(#glow)" class="bm${k}"/>
      <line x1="${mouth[0].toFixed(1)}" y1="${mouth[1].toFixed(1)}" x2="${hit[0].toFixed(1)}" y2="${hit[1].toFixed(1)}" stroke="#eef0ff" stroke-width="4" stroke-linecap="round" class="bm${k}"/>`;

    // helicopter: flies in on a straight line, is hit at s+4.6, spirals down
    const v = 80;
    const tHit = s + 4.6;
    const start = [hit[0] - flyDir * v * 5.5, hit[1]];
    css.push(
      keyframes(`hc${k}`, [
        [tHit - 5.5, `${tr(start)};opacity:0`],
        [tHit - 5, `${tr([hit[0] - flyDir * v * 5, hit[1]])};opacity:1`],
        [tHit, `${tr(hit)};opacity:1`],
        [tHit + 0.5, `${tr([hit[0] + flyDir * 14, hit[1] + 20], 0, ` rotate(${flyDir * 30}deg)`)};opacity:1`],
        [tHit + 1.8, `${tr([hit[0] + flyDir * 40, hit[1] + 160], 0, ` rotate(${flyDir * 160}deg)`)};opacity:0`],
      ]),
      `.hc${k}{animation:hc${k} ${T}s linear infinite;opacity:0}`,
      keyframes(`ex${k}`, [
        [tHit - 0.05, "transform:scale(.1);opacity:0"],
        [tHit, "transform:scale(.3);opacity:1"],
        [tHit + 0.9, "transform:scale(1.6);opacity:0"],
      ]),
      `.ex${k}{animation:ex${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`
    );
    actors += `<g class="hc${k}"><g transform="scale(${flyDir},1)">${heli(t)}</g></g>
      <g class="ex${k}"><circle cx="${hit[0].toFixed(1)}" cy="${hit[1].toFixed(1)}" r="26" fill="${C.red}"/><circle cx="${hit[0].toFixed(1)}" cy="${hit[1].toFixed(1)}" r="16" fill="#ffb36b"/><circle cx="${hit[0].toFixed(1)}" cy="${hit[1].toFixed(1)}" r="8" fill="${C.cream}"/></g>`;
  }

  // two helicopters that get away
  const survivors = [
    { from: [-60, 178], to: [1060, 196], t0: 2, t1: 20 },
    { from: [1060, 214], to: [-60, 186], t0: 17, t1: 34 },
  ];
  survivors.forEach((h, i) => {
    const d = h.to[0] > h.from[0] ? 1 : -1;
    css.push(
      keyframes(`hs${i}`, [
        [h.t0 - 0.01, `${tr(h.from)};opacity:0`],
        [h.t0, `${tr(h.from)};opacity:1`],
        [h.t1, `${tr(h.to)};opacity:1`],
        [h.t1 + 0.01, `${tr(h.to)};opacity:0`],
      ]),
      `.hs${i}{animation:hs${i} ${T}s linear infinite;opacity:0}`
    );
    actors += `<g class="hs${i}"><g transform="scale(${d},1)">${heli(t)}</g></g>`;
  });

  // Freeze-frame for viewers with "reduce motion" on (all animations are disabled
  // for them): show the first attack mid-breath instead of an empty city.
  const a0 = attacks[0];
  css.push(`@media (prefers-reduced-motion:reduce){
    .kz0{opacity:1;${tr(a0.land)}}
    .bm0{opacity:1;stroke-dashoffset:0}
    .ch0{opacity:1}
    .ex0{opacity:.9;transform:scale(1)}
    .smash0{transform:scaleY(.1) skewX(-12deg)}
    .hs0{opacity:1;${tr([500, 186])}}
  }`);

  const plate = [iso(0, 0), iso(NW, 0), iso(NW, 7), iso(0, 7)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
  const legend = tops.map((c, i) => `<rect x="${830 + i * 18}" y="${H - 44}" width="13" height="13" rx="2" fill="${c}"/>`).join("");

  const body = `
    ${eyebrow(40, 44, "+", "Contributions · 3d city", t.muted, t.accentInk)}
    ${statRow(t, 108)}
    ${sea(t, -4.6, -0.35, "wv")}
    <polygon points="${plate}" fill="none" stroke="${t.line}" stroke-width="1.5" stroke-dasharray="4 5" transform="translate(0 6)"/>
    ${bars}
    ${sea(t, 7.35, 11.4, "wv")}
    ${actors}
    ${text("mono", "LESS", 820, H - 34, 9.5, { anchor: "end", ls: 1.4, fill: t.muted })}${legend}${text("mono", "MORE", 928, H - 34, 9.5, { ls: 1.4, fill: t.muted })}
    ${text("mono", `UPDATED ${fmt(days.at(-1).date).toUpperCase()}`, 40, H - 34, 9.5, { ls: 1.4, fill: t.muted })}`;

  return doc({
    w: W,
    h: H,
    bg: t.bg,
    defs: `${defs}<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>`,
    css: `@keyframes grow{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}.bar{animation:grow .8s cubic-bezier(.22,1,.36,1) both}
      @keyframes wave{to{stroke-dashoffset:-120}}.wv0{animation:wave 7s linear infinite}.wv1{animation:wave 9s linear infinite reverse}
      @keyframes rotor{from{transform:scaleX(1)}to{transform:scaleX(.15)}}.rotor{animation:rotor .12s linear infinite alternate;transform-box:fill-box;transform-origin:center}
      ${css.join("\n")}`,
    title: `${cal.totalContributions} contributions in the past year`,
    desc: `Isometric 3D chart of ${LOGIN}'s GitHub contributions between two seas. Each day is a tower whose height follows its contribution count. A giant lizard kaiju surfaces from the sea at random spots, flattens blocks of towers that later regrow, and shoots down helicopters with a blue-purple breath beam. Longest streak ${longest} days, ${activeDays} active days, best day ${best.contributionCount} on ${fmt(best.date)}.`,
    body,
  });
}

const out = new URL("../assets/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const t of Object.values(THEMES)) writeFileSync(new URL(`contrib-city-${t.name}.svg`, out), city(t));
console.log(`✓ contrib-city (${cal.totalContributions} contributions, ${activeDays} active days, longest streak ${longest}d)`);
console.log(`  attacks today: ${attacks.map((a) => `${a.side} sea at week ${a.gx}, firing ${a.dir > 0 ? "right" : "left"}`).join("; ")}`);
