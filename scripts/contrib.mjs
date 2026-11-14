// Draws the past year of GitHub contributions as an isometric "3D city" in the
// portfolio palette, writing assets/contrib-city-light.svg and -dark.svg.
//
// The city sits between two seas. An original kaiju rises at random spots
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
// A loop is three normal attacks plus one "berserk" event, in a date-seeded
// order, so each daily render plays a different sequence.
const seed = Number(days.at(-1).date.replace(/-/g, ""));
const R = rng(seed);
const MOUTH = [70, -127]; // kaiju mouth relative to its feet (after scaling)
const SEA = { back: { sea: -2.0, land: 1.4 }, front: { sea: 8.9, land: 5.4 } };
const DEPTH = 178; // how far below the waterline the kaiju hides
const DUR = { attack: 11, berserk: 15.5 };

const order = ["attack", "attack", "attack"];
order.splice(Math.floor(R() * 4), 0, "berserk");

const events = [];
let clock = 0.5;
for (const [k, type] of order.entries()) {
  const side = R() < 0.5 ? "back" : "front";
  let gx;
  if (type === "berserk") gx = 12 + Math.floor(R() * (NW - 25));
  else
    do gx = 4 + Math.floor(R() * (NW - 9));
    while (events.some((e) => e.type === "attack" && Math.abs(e.gx - gx) < 10));
  const s = clock;
  clock += DUR[type];
  const [seaX, seaY] = iso(gx + 0.5, SEA[side].sea);
  const [kx, ky] = iso(gx + 0.5, SEA[side].land);
  const dir = kx < 260 ? 1 : kx > 740 ? -1 : R() < 0.5 ? 1 : -1;
  const mouth = [kx + dir * MOUTH[0], ky + MOUTH[1]];
  const e = { k, type, side, gx, gy: SEA[side].land - 0.5, s, sea: [seaX, seaY], land: [kx, ky], dir, mouth };
  // timeline (absolute seconds)
  e.surfaced = s + 2.2;
  e.stomp = s + 3.4;
  e.wadeBack = type === "berserk" ? s + 9.6 : s + 7.0;
  e.sinkStart = e.wadeBack + 1.2;
  e.sinkEnd = e.sinkStart + 2.2;
  if (type === "attack") {
    e.hitAt = s + 5.2; // breath reaches the helicopter
    e.hit = [mouth[0] + dir * (150 + R() * 110), Math.min(255, Math.max(160, mouth[1] - 10 - R() * 50))];
    e.flyDir = R() < 0.5 ? 1 : -1;
  } else {
    e.beamStart = s + 5.6; // 360° sweep lasts 3 s
    e.beamEnd = s + 8.6;
    e.a0 = dir > 0 ? 0 : 180;
    // a news helicopter hovering nearby, caught by the sweep
    e.chopper = [Math.min(930, Math.max(70, kx + (R() < 0.5 ? -1 : 1) * (180 + R() * 160))), 175 + R() * 50];
    const ang = (Math.atan2(e.chopper[1] - mouth[1], e.chopper[0] - mouth[0]) * 180) / Math.PI;
    e.chopperHit = e.beamStart + ((((ang - e.a0) % 360) + 360) % 360 / 360) * 3;
  }
  events.push(e);
}
const T = Number((clock + 0.5).toFixed(2)); // seconds per loop

const at = (sec) => `${Math.min(100, Math.max(0, (sec / T) * 100)).toFixed(3)}%`;
/** @keyframes from absolute [seconds, declarations] pairs, padding 0% and 100%. */
function keyframes(name, frames) {
  const sorted = [...frames].sort((a, b) => a[0] - b[0]);
  const out = [];
  if (sorted[0][0] > 0) out.push(`0%{${sorted[0][1]}}`);
  for (const [sec, css] of sorted) out.push(`${at(sec)}{${css}}`);
  if (sorted.at(-1)[0] < T) out.push(`100%{${sorted.at(-1)[1]}}`);
  return `@keyframes ${name}{${out.join("")}}`;
}
/** Same, but times are relative; the element's animation-delay places it in the loop. */
const relKeyframes = keyframes;
const tr = ([x, y], dy = 0, extra = "") => `transform:translate(${x.toFixed(1)}px,${(y + dy).toFixed(1)}px)${extra}`;
const EASE_OUT = "animation-timing-function:cubic-bezier(.16,.8,.3,1)";
const EASE_IN = "animation-timing-function:cubic-bezier(.6,0,.85,.35)";

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
  const smokeFill = t.name === "dark" ? "#cfc6b8" : "#6f7f80";
  const R2 = rng(seed + 7); // separate stream so both themes get identical scenes
  const css = [];
  let defs = "";
  let fx = ""; // debris, dust, splashes (above the city, below the actors)
  let smokeFx = ""; // smoke and fire, drawn in front of the kaiju so it never hides them
  let actors = "";

  /* ---------- shared relative keyframes (placed in the loop with animation-delay) ---------- */
  css.push(
    relKeyframes("crumble", [
      [0, "transform:none"],
      [0.25, "transform:skewX(8deg) scaleY(.92)"],
      [0.6, "transform:skewX(-6deg) scaleY(.5)"],
      [1.1, "transform:skewX(-14deg) scaleY(.1)"],
      [8, "transform:skewX(-14deg) scaleY(.1)"],
      [8.5, "transform:scaleY(1.08)"],
      [8.8, "transform:none"],
    ]),
    `.cr{animation:crumble ${T}s linear infinite;transform-box:fill-box;transform-origin:50% 100%}`,
    relKeyframes("nova", [
      [0, "transform:none"],
      [0.2, "transform:skewX(12deg) scaleY(.85)"],
      [0.55, "transform:skewX(-18deg) scaleY(.07)"],
      [7, "transform:skewX(-18deg) scaleY(.07)"],
      [7.5, "transform:scaleY(1.1)"],
      [7.8, "transform:none"],
    ]),
    `.nv{animation:nova ${T}s linear infinite;transform-box:fill-box;transform-origin:50% 100%}`,
    relKeyframes("smoke", [
      [0, "transform:translate(0,0) scale(.3);opacity:0"],
      [0.4, "transform:translate(0,-8px) scale(.6);opacity:.85"],
      [5, "transform:translate(8px,-95px) scale(2.1);opacity:0"],
    ]),
    `.sm{animation:smoke ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`,
    relKeyframes("fire", [
      [0, "transform:scale(.2);opacity:0"],
      [0.3, "transform:scale(1);opacity:.95"],
      [3.4, "transform:scale(.85);opacity:.7"],
      [4.4, "transform:scale(.2);opacity:0"],
    ]),
    `.fi{animation:fire ${T}s linear infinite;transform-box:fill-box;transform-origin:50% 100%;opacity:0}`
  );

  const plume = (x, y, delay, n = 4, big = 1, cls = "") => {
    let out = "";
    for (let j = 0; j < n; j++)
      out += `<circle cx="${(x + (R2() - 0.5) * 8).toFixed(1)}" cy="${y.toFixed(1)}" r="${(12 * big).toFixed(1)}" fill="${smokeFill}" class="sm${cls && j === 1 ? ` ${cls}` : ""}" style="animation-delay:${(delay + j * 0.75).toFixed(2)}s"/>`;
    return out;
  };
  const fire = (x, y, delay) =>
    `<g class="fi" style="animation-delay:${delay.toFixed(2)}s"><path d="M${x - 7},${y} Q${x - 6},${y - 14} ${x},${y - 22} Q${x + 6},${y - 13} ${x + 7},${y} Z" fill="${C.red}"/><path d="M${x - 3.5},${y} Q${x - 3},${y - 8} ${x},${y - 13} Q${x + 3},${y - 7} ${x + 3.5},${y} Z" fill="#ffb36b"/></g>`;
  let debrisN = 0;
  const debris = (x, y, delay, spread = 1) => {
    const i = debrisN++;
    const dx = (R2() - 0.5) * 90 * spread;
    const up = 25 + R2() * 45 * spread;
    const fall = 10 + R2() * 25;
    const rot = (R2() - 0.5) * 540;
    css.push(
      relKeyframes(`db${i}`, [
        [0, "transform:translate(0,0) rotate(0deg);opacity:0"],
        [0.05, "transform:translate(0,0) rotate(0deg);opacity:1"],
        [0.5, `transform:translate(${(dx * 0.55).toFixed(1)}px,${(-up).toFixed(1)}px) rotate(${(rot / 2).toFixed(0)}deg);opacity:1`],
        [1.3, `transform:translate(${dx.toFixed(1)}px,${fall.toFixed(1)}px) rotate(${rot.toFixed(0)}deg);opacity:0`],
      ])
    );
    const s = 2 + R2() * 3;
    return `<rect x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="${tops[1 + Math.floor(R2() * 4)]}" style="animation:db${i} ${T}s linear ${delay.toFixed(2)}s infinite;transform-box:fill-box;transform-origin:center;opacity:0"/>`;
  };

  /* ---------- towers ---------- */
  const crumbleDelay = new Map();
  const firstAttack = events.find((e) => e.type === "attack");
  for (const e of events.filter((x) => x.type === "attack"))
    for (let gx = e.gx - 2; gx <= e.gx + 2; gx++)
      for (let gy = 0; gy < 7; gy++) {
        const dist = Math.hypot(gx - e.gx, (gy - e.gy) * 0.6);
        if (Math.abs(gy - e.gy) <= 2.6 && R2() > 0.1) crumbleDelay.set(`${gx},${gy}`, { delay: e.stomp + dist * 0.07, freeze: e === firstAttack });
      }
  const berserk = events.find((e) => e.type === "berserk");

  const cells = [];
  weeks.forEach((w, gx) => w.forEach((d) => cells.push({ gx, gy: d.weekday, d })));
  cells.sort((a, b) => a.gy - b.gy || a.gx - b.gx); // back to front

  let bars = "";
  for (const { gx, gy, d } of cells) {
    const top = tops[level(d.contributionCount)];
    const h = d.contributionCount ? 4 + Math.log1p(d.contributionCount) * 15 : 1.5;
    const g = 0.12;
    const [a, b, c, e] = [gx + g, gy + g, gx + 1 - g, gy + 1 - g];
    const cr = crumbleDelay.get(`${gx},${gy}`);
    const [cx, cy] = iso(gx + 0.5, gy + 0.5);
    const nvDelay = berserk.beamStart + 0.15 + Math.hypot(cx - berserk.land[0], cy - berserk.land[1]) / 650;
    bars += `<g class="bar" style="animation-delay:${(0.2 + gx * 0.025).toFixed(2)}s">${
      cr ? `<g class="cr${cr.freeze ? " crF" : ""}" style="animation-delay:${cr.delay.toFixed(2)}s">` : "<g>"
    }<g class="nv" style="animation-delay:${nvDelay.toFixed(2)}s">
<polygon points="${pt(a, e, h)} ${pt(c, e, h)} ${pt(c, e, 0)} ${pt(a, e, 0)}" fill="${shade(top, 0.62)}"/>
<polygon points="${pt(c, b, h)} ${pt(c, e, h)} ${pt(c, e, 0)} ${pt(c, b, 0)}" fill="${shade(top, 0.8)}"/>
<polygon points="${pt(a, b, h)} ${pt(c, b, h)} ${pt(c, e, h)} ${pt(a, e, h)}" fill="${top}"/></g></g></g>`;
  }

  /* ---------- earthquakes: one keyframes track for the whole city ---------- */
  const quakes = [];
  for (const e of events) {
    quakes.push([e.stomp, 0.8, 2.6]);
    if (e.type === "berserk") quakes.push([e.s + 3.7, 1.8, 1.3], [e.beamStart, 3.3, 5]);
  }
  quakes.sort((a, b) => a[0] - b[0]);
  const qf = [[0, "transform:none"]];
  for (const [t0, d, amp] of quakes) {
    qf.push([t0 - 0.01, "transform:none"]);
    for (let tt = t0; tt < t0 + d; tt += 0.06) {
      const fade = 1 - (tt - t0) / d;
      qf.push([tt, `transform:translate(${((R2() - 0.5) * 2 * amp * fade).toFixed(2)}px,${((R2() - 0.5) * 1.4 * amp * fade).toFixed(2)}px)`]);
    }
    qf.push([t0 + d, "transform:none"]);
  }
  css.push(keyframes("quake", qf), `.quake{animation:quake ${T}s linear infinite}`);

  /* ---------- per-event actors ---------- */
  defs += `<clipPath id="wl" clipPathUnits="userSpaceOnUse"><rect x="-500" y="-700" width="1000" height="706"/></clipPath>`;
  defs += `<radialGradient id="aura"><stop offset="0" stop-color="#b98cff" stop-opacity=".75"/><stop offset=".6" stop-color="#7a6bff" stop-opacity=".35"/><stop offset="1" stop-color="#7a6bff" stop-opacity="0"/></radialGradient>`;

  for (const e of events) {
    const { k, s, sea: sp, land, dir, mouth } = e;

    // kaiju: position track (surface → wade in → hold → wade out → sink) + depth track
    css.push(
      keyframes(`kz${k}`, [
        [s - 0.01, `${tr(sp)};opacity:0`],
        [s, `${tr(sp)};opacity:1`],
        [e.surfaced, `${tr(sp)};opacity:1`],
        [e.stomp, `${tr(land)};opacity:1`],
        [e.wadeBack, `${tr(land)};opacity:1`],
        [e.sinkStart, `${tr(sp)};opacity:1`],
        [e.sinkEnd, `${tr(sp)};opacity:1`],
        [e.sinkEnd + 0.01, `${tr(sp)};opacity:0`],
      ]),
      `.kz${k}{animation:kz${k} ${T}s linear infinite;opacity:0}`,
      keyframes(`rs${k}`, [
        [s, `transform:translateY(${DEPTH}px);${EASE_OUT}`],
        [e.surfaced, "transform:translateY(0)"],
        [e.sinkStart, `transform:translateY(0);${EASE_IN}`],
        [e.sinkEnd, `transform:translateY(${DEPTH}px)`],
      ]),
      `.rs${k}{animation:rs${k} ${T}s linear infinite}`,
      keyframes(`fm${k}`, [
        [s, "opacity:0"],
        [s + 0.2, "opacity:1"],
        [e.surfaced + 0.4, "opacity:1"],
        [e.surfaced + 0.9, "opacity:0"],
        [e.wadeBack + 0.7, "opacity:0"],
        [e.sinkStart, "opacity:1"],
        [e.sinkEnd + 0.3, "opacity:1"],
        [e.sinkEnd + 0.8, "opacity:0"],
      ]),
      `.fm${k}{animation:fm${k} ${T}s linear infinite;opacity:0}`
    );
    const aura =
      e.type === "berserk"
        ? `<circle cx="0" cy="-95" r="105" fill="url(#aura)" class="au${k}"/>`
        : "";
    actors += `<g class="kz${k}">
      <g clip-path="url(#wl)"><g class="rs${k}">${aura}<g transform="scale(${dir},1)">${kaiju(t)}</g></g></g>
      <ellipse cx="0" cy="1" rx="44" ry="9" fill="none" stroke="${C.cream}" stroke-width="2" class="fm${k}">
        <animate attributeName="rx" values="38;54;38" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="8;12;8" dur="1.6s" repeatCount="indefinite"/>
      </ellipse>
    </g>`;

    // splash droplets as the head breaks the surface, and again as it goes under
    for (let i = 0; i < 9; i++) {
      const dx = (i - 4) * 9 + (R2() - 0.5) * 6;
      const up = 30 + R2() * 40;
      css.push(
        relKeyframes(`dr${k}_${i}`, [
          [0, "transform:translate(0,0);opacity:0"],
          [0.05, "transform:translate(0,0);opacity:1"],
          [0.45, `transform:translate(${(dx * 0.6).toFixed(1)}px,${(-up).toFixed(1)}px);opacity:1`],
          [1.0, `transform:translate(${dx.toFixed(1)}px,8px);opacity:0`],
        ])
      );
      for (const delay of [s + 0.15, e.sinkEnd - 0.75])
        fx += `<circle cx="${sp[0].toFixed(1)}" cy="${(sp[1] - 4).toFixed(1)}" r="${(2 + R2() * 2).toFixed(1)}" fill="${C.cream}" style="animation:dr${k}_${i} ${T}s linear ${delay.toFixed(2)}s infinite;opacity:0"/>`;
    }

    // stomp: dust ring, debris, smoke
    css.push(
      keyframes(`du${k}`, [
        [e.stomp - 0.05, "transform:scale(.2);opacity:0"],
        [e.stomp + 0.05, "transform:scale(.4);opacity:.85"],
        [e.stomp + 1.3, "transform:scale(1.6);opacity:0"],
      ]),
      `.du${k}{animation:du${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`
    );
    fx += `<ellipse cx="${land[0].toFixed(1)}" cy="${(land[1] - 4).toFixed(1)}" rx="62" ry="16" fill="${C.cream}" class="du${k}"/>`;

    if (e.type === "attack") {
      for (let i = 0; i < 12; i++) {
        const [px, py] = iso(e.gx + 0.5 + (R2() - 0.5) * 4, e.gy + (R2() - 0.5) * 4, 10 + R2() * 20);
        fx += debris(px, py, e.stomp + R2() * 0.4);
      }
      for (let i = 0; i < 4; i++) {
        const [px, py] = iso(e.gx + 0.5 + (R2() - 0.5) * 7, e.gy + (R2() - 0.5) * 4, 6);
        smokeFx += plume(px, py, e.stomp + 0.3 + i * 0.25, 5, 1, i === 0 ? "smF" : "");
      }

      // breath at a helicopter
      const { hit, hitAt, flyDir } = e;
      const len = Math.hypot(hit[0] - mouth[0], hit[1] - mouth[1]).toFixed(0);
      defs += `<linearGradient id="beam${k}" gradientUnits="userSpaceOnUse" x1="${mouth[0].toFixed(1)}" y1="${mouth[1].toFixed(1)}" x2="${hit[0].toFixed(1)}" y2="${hit[1].toFixed(1)}"><stop offset="0" stop-color="#7a8cff"/><stop offset=".55" stop-color="#9b6bff"/><stop offset="1" stop-color="#c25cff"/></linearGradient>`;
      css.push(
        keyframes(`ch${k}`, [
          [hitAt - 1.2, "transform:scale(.2);opacity:0"],
          [hitAt - 0.5, "transform:scale(1.2);opacity:1"],
          [hitAt + 0.7, "transform:scale(1);opacity:1"],
          [hitAt + 1.1, "transform:scale(.2);opacity:0"],
        ]),
        `.ch${k}{animation:ch${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`,
        keyframes(`bm${k}`, [
          [hitAt - 0.45, `stroke-dashoffset:${len};opacity:0`],
          [hitAt - 0.4, `stroke-dashoffset:${len};opacity:1`],
          [hitAt, "stroke-dashoffset:0;opacity:1"],
          [hitAt + 0.7, "stroke-dashoffset:0;opacity:1"],
          [hitAt + 1.1, "stroke-dashoffset:0;opacity:0"],
        ]),
        `.bm${k}{animation:bm${k} ${T}s linear infinite;stroke-dasharray:${len};opacity:0}`
      );
      actors += `
        <circle cx="${mouth[0].toFixed(1)}" cy="${mouth[1].toFixed(1)}" r="13" fill="url(#beam${k})" filter="url(#glow)" class="ch${k}"/>
        <line x1="${mouth[0].toFixed(1)}" y1="${mouth[1].toFixed(1)}" x2="${hit[0].toFixed(1)}" y2="${hit[1].toFixed(1)}" stroke="url(#beam${k})" stroke-width="16" stroke-linecap="round" filter="url(#glow)" class="bm${k}"/>
        <line x1="${mouth[0].toFixed(1)}" y1="${mouth[1].toFixed(1)}" x2="${hit[0].toFixed(1)}" y2="${hit[1].toFixed(1)}" stroke="#eef0ff" stroke-width="4" stroke-linecap="round" class="bm${k}"/>`;

      const v = 80;
      css.push(
        keyframes(`hc${k}`, [
          [hitAt - 5.5, `${tr([hit[0] - flyDir * v * 5.5, hit[1]])};opacity:0`],
          [hitAt - 5, `${tr([hit[0] - flyDir * v * 5, hit[1]])};opacity:1`],
          [hitAt, `${tr(hit)};opacity:1`],
          [hitAt + 0.5, `${tr([hit[0] + flyDir * 14, hit[1] + 20], 0, ` rotate(${flyDir * 30}deg)`)};opacity:1`],
          [hitAt + 1.8, `${tr([hit[0] + flyDir * 40, hit[1] + 160], 0, ` rotate(${flyDir * 160}deg)`)};opacity:0`],
        ]),
        `.hc${k}{animation:hc${k} ${T}s linear infinite;opacity:0}`,
        keyframes(`ex${k}`, [
          [hitAt - 0.05, "transform:scale(.1);opacity:0"],
          [hitAt, "transform:scale(.3);opacity:1"],
          [hitAt + 0.9, "transform:scale(1.6);opacity:0"],
        ]),
        `.ex${k}{animation:ex${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`
      );
      actors += `<g class="hc${k}"><g transform="scale(${flyDir},1)">${heli(t)}</g></g>
        <g class="ex${k}"><circle cx="${hit[0].toFixed(1)}" cy="${hit[1].toFixed(1)}" r="26" fill="${C.red}"/><circle cx="${hit[0].toFixed(1)}" cy="${hit[1].toFixed(1)}" r="16" fill="#ffb36b"/><circle cx="${hit[0].toFixed(1)}" cy="${hit[1].toFixed(1)}" r="8" fill="${C.cream}"/></g>`;
    } else {
      /* ---------- BERSERK: charge, 360° ultra beam, shockwave, city-wide ruin ---------- */
      const { beamStart, beamEnd, a0, chopper, chopperHit } = e;
      css.push(
        keyframes(`au${k}`, [
          [s + 3.6, "transform:scale(.4);opacity:0"],
          [s + 4.2, "transform:scale(.9);opacity:.6"],
          [s + 4.6, "transform:scale(1.15);opacity:.35"],
          [s + 5.0, "transform:scale(.95);opacity:.75"],
          [beamStart, "transform:scale(1.25);opacity:.95"],
          [beamEnd, "transform:scale(1.2);opacity:.9"],
          [beamEnd + 0.8, "transform:scale(.6);opacity:0"],
        ]),
        `.au${k}{animation:au${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`,
        keyframes(`orb${k}`, [
          [s + 4.0, "transform:scale(.1);opacity:0"],
          [beamStart - 0.05, "transform:scale(1.6);opacity:1"],
          [beamEnd, "transform:scale(1.3);opacity:1"],
          [beamEnd + 0.3, "transform:scale(.1);opacity:0"],
        ]),
        `.orb${k}{animation:orb${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`,
        keyframes(`ub${k}`, [
          [beamStart - 0.01, `transform:rotate(${a0}deg);opacity:0`],
          [beamStart, `transform:rotate(${a0}deg);opacity:1`],
          [beamEnd, `transform:rotate(${a0 + 360}deg);opacity:1`],
          [beamEnd + 0.25, `transform:rotate(${a0 + 360}deg);opacity:0`],
        ]),
        `.ub${k}{animation:ub${k} ${T}s linear infinite;opacity:0}`,
        keyframes(`sw${k}`, [
          [beamStart + 0.1, "transform:scale(.01);opacity:0"],
          [beamStart + 0.15, "transform:scale(.02);opacity:1"],
          [beamStart + 2.15, "transform:scale(1.3);opacity:0"],
        ]),
        `.sw${k}{animation:sw${k} ${T}s linear infinite;opacity:0}`,
        keyframes(`fl${k}`, [
          [beamStart - 0.02, "opacity:0"],
          [beamStart + 0.08, "opacity:.3"],
          [beamStart + 0.7, "opacity:0"],
        ]),
        `.fl${k}{animation:fl${k} ${T}s linear infinite;opacity:0}`
      );
      defs += `<linearGradient id="ultra" x1="0" x2="1"><stop offset="0" stop-color="#eef0ff"/><stop offset=".08" stop-color="#9aa6ff"/><stop offset=".5" stop-color="#9b6bff"/><stop offset="1" stop-color="#c25cff" stop-opacity="0"/></linearGradient>`;
      actors += `
        <circle cx="${mouth[0].toFixed(1)}" cy="${mouth[1].toFixed(1)}" r="16" fill="#c9b8ff" filter="url(#glow)" class="orb${k}"/>
        <g transform="translate(${mouth[0].toFixed(1)} ${mouth[1].toFixed(1)})"><g class="ub${k}">
          <rect x="0" y="-13" width="1400" height="26" rx="13" fill="url(#ultra)" filter="url(#glow)"/>
          <rect x="0" y="-3.5" width="1400" height="7" rx="3.5" fill="url(#ultra)"/>
        </g></g>
        <g transform="translate(${land[0].toFixed(1)} ${land[1].toFixed(1)})"><g class="sw${k}">
          <ellipse rx="1000" ry="320" fill="none" stroke="#9b6bff" stroke-width="7" vector-effect="non-scaling-stroke" filter="url(#glow)"/>
          <ellipse rx="1000" ry="320" fill="none" stroke="#eef0ff" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </g></g>
        <rect width="${W}" height="${H}" fill="#9b6bff" class="fl${k}"/>`;

      // the news helicopter caught by the sweep
      const enter = [chopper[0] + (chopper[0] > 500 ? 1 : -1) * 520, chopper[1] - 30];
      const hd = chopper[0] > enter[0] ? 1 : -1;
      css.push(
        keyframes(`hk${k}`, [
          [s + 0.5, `${tr(enter)};opacity:0`],
          [s + 1.0, `${tr(enter)};opacity:1`],
          [s + 3.6, `${tr(chopper)};opacity:1`],
          [chopperHit, `${tr(chopper)};opacity:1`],
          [chopperHit + 0.5, `${tr([chopper[0] + hd * 14, chopper[1] + 22], 0, ` rotate(${hd * 35}deg)`)};opacity:1`],
          [chopperHit + 1.8, `${tr([chopper[0] + hd * 40, chopper[1] + 170], 0, ` rotate(${hd * 170}deg)`)};opacity:0`],
        ]),
        `.hk${k}{animation:hk${k} ${T}s linear infinite;opacity:0}`,
        keyframes(`hx${k}`, [
          [chopperHit - 0.05, "transform:scale(.1);opacity:0"],
          [chopperHit, "transform:scale(.3);opacity:1"],
          [chopperHit + 0.9, "transform:scale(1.7);opacity:0"],
        ]),
        `.hx${k}{animation:hx${k} ${T}s linear infinite;transform-box:fill-box;transform-origin:center;opacity:0}`
      );
      actors += `<g class="hk${k}"><g transform="scale(${hd},1)">${heli(t)}</g></g>
        <g class="hx${k}"><circle cx="${chopper[0].toFixed(1)}" cy="${chopper[1].toFixed(1)}" r="28" fill="${C.red}"/><circle cx="${chopper[0].toFixed(1)}" cy="${chopper[1].toFixed(1)}" r="17" fill="#ffb36b"/><circle cx="${chopper[0].toFixed(1)}" cy="${chopper[1].toFixed(1)}" r="8" fill="${C.cream}"/></g>`;

      // city-wide smoke, fires and debris, arriving with the shockwave
      for (let i = 0; i < 26; i++) {
        const gx = Math.floor(R2() * NW);
        const gy = Math.floor(R2() * 7);
        const [px, py] = iso(gx + 0.5, gy + 0.5, 4);
        const delay = beamStart + 0.2 + Math.hypot(px - land[0], py - land[1]) / 650;
        smokeFx += plume(px, py, delay + R2() * 0.4, 6, 1.2);
        if (i % 2 === 0) smokeFx += fire(px, py + 2, delay + 0.1);
      }
      for (let i = 0; i < 34; i++) {
        const gx = R2() * NW;
        const gy = R2() * 7;
        const [px, py] = iso(gx, gy, 10 + R2() * 25);
        fx += debris(px, py, beamStart + 0.15 + Math.hypot(px - land[0], py - land[1]) / 650, 1.4);
      }
    }
  }

  // helicopters that get away (only during normal attacks, never in a berserk sweep)
  events
    .filter((e) => e.type === "attack")
    .slice(0, 2)
    .forEach((e, i) => {
      const ltr = i % 2 === 0;
      const from = ltr ? [-60, 178 + R2() * 30] : [1060, 190 + R2() * 30];
      const to = ltr ? [1060, 180 + R2() * 30] : [-60, 176 + R2() * 30];
      const [t0, t1] = [e.s + 0.4, e.s + 10.4];
      css.push(
        keyframes(`hs${i}`, [
          [t0 - 0.01, `${tr(from)};opacity:0`],
          [t0, `${tr(from)};opacity:1`],
          [t1, `${tr(to)};opacity:1`],
          [t1 + 0.01, `${tr(to)};opacity:0`],
        ]),
        `.hs${i}{animation:hs${i} ${T}s linear infinite;opacity:0}`
      );
      actors += `<g class="hs${i}"><g transform="scale(${ltr ? 1 : -1},1)">${heli(t)}</g></g>`;
    });

  // Freeze-frame for "reduce motion" (all animations off): the first attack mid-breath.
  const fa = firstAttack;
  css.push(`@media (prefers-reduced-motion:reduce){
    .kz${fa.k}{opacity:1;${tr(fa.land)}}
    .rs${fa.k}{transform:none}
    .bm${fa.k}{opacity:1;stroke-dashoffset:0}
    .ch${fa.k}{opacity:1}
    .ex${fa.k}{opacity:.9;transform:scale(1)}
    .crF{transform:skewX(-14deg) scaleY(.1)}
    .smF{opacity:.55;transform:translate(4px,-40px) scale(1.5)}
  }`);

  const plate = [iso(0, 0), iso(NW, 0), iso(NW, 7), iso(0, 7)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" ");
  const legend = tops.map((c, i) => `<rect x="${830 + i * 18}" y="${H - 44}" width="13" height="13" rx="2" fill="${c}"/>`).join("");

  const body = `
    ${eyebrow(40, 44, "+", "Contributions · 3d city", t.muted, t.accentInk)}
    ${statRow(t, 108)}
    <g class="quake">
      ${sea(t, -4.6, -0.35, "wv")}
      <polygon points="${plate}" fill="none" stroke="${t.line}" stroke-width="1.5" stroke-dasharray="4 5" transform="translate(0 6)"/>
      ${bars}
      ${sea(t, 7.35, 11.4, "wv")}
    </g>
    ${fx}
    ${actors}
    ${smokeFx}
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
    desc: `Isometric 3D chart of ${LOGIN}'s GitHub contributions between two seas. Each day is a tower whose height follows its contribution count. A giant lizard kaiju rises from the sea at random spots, shakes the ground, crumbles blocks of towers into smoke, and shoots down helicopters with a blue-purple breath; once per loop it goes berserk and sweeps a 360-degree beam that levels the whole city before it rebuilds. Longest streak ${longest} days, ${activeDays} active days, best day ${best.contributionCount} on ${fmt(best.date)}.`,
    body,
  });
}

const out = new URL("../assets/", import.meta.url);
mkdirSync(out, { recursive: true });
for (const t of Object.values(THEMES)) writeFileSync(new URL(`contrib-city-${t.name}.svg`, out), city(t));
console.log(`✓ contrib-city (${cal.totalContributions} contributions, ${activeDays} active days, longest streak ${longest}d)`);
console.log(`  loop ${T}s: ${events.map((e) => `${e.type} @${e.s.toFixed(1)}s from ${e.side} sea (week ${e.gx})`).join(", ")}`);
