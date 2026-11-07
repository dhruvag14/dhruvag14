// Builds the profile README artwork into ./assets as <name>-light.svg / <name>-dark.svg.
// Run: npm install && npm run build
import { mkdirSync, writeFileSync } from "node:fs";
import { C, THEMES, circleText, doc, eyebrow, letters, measure, rng, spark, star, text, wrap } from "./lib.mjs";
import { DATA } from "./data.mjs";

const W = 1000;
const OUT = new URL("../assets/", import.meta.url);
mkdirSync(OUT, { recursive: true });

/* ======================================================================
   HERO: planet + dunes + name + crossing tapes
   ====================================================================== */
function hero(t) {
  const H = 756;
  const R = rng(7);
  const P = { x: 735, y: 250, r: 165 };
  const tile = 2 * P.r * 2; // band texture tile width

  // Planet band texture (two tiles side by side, scrolled for a rotation illusion)
  const bandColors = [C.rust, C.red, "#b0503a", C.red, C.cream, C.rust, "#c4583f", C.red, C.rust];
  const bands = [];
  const n = bandColors.length;
  for (let i = 0; i < n; i++) {
    const y0 = P.y - P.r + (i * 2 * P.r) / n;
    const h = (2 * P.r) / n + 6;
    const k = 1 + (i % 3);
    const amp = 5 + (i % 4) * 3;
    const ph = R() * Math.PI * 2;
    const top = [];
    const bot = [];
    for (let x = 0; x <= tile * 2; x += 12) {
      const yy = Math.sin((2 * Math.PI * k * x) / tile + ph) * amp;
      top.push(`${(x + P.x - P.r).toFixed(0)},${(y0 + yy).toFixed(1)}`);
      bot.unshift(`${(x + P.x - P.r).toFixed(0)},${(y0 + h + yy * 0.6).toFixed(1)}`);
    }
    const op = bandColors[i] === C.cream ? 0.55 : 1;
    bands.push(`<polygon points="${top.join(" ")} ${bot.join(" ")}" fill="${bandColors[i]}" opacity="${op}"/>`);
  }
  // storm spots, duplicated in both tiles so the loop is seamless
  for (let s = 0; s < 6; s++) {
    const sx = R() * tile;
    const sy = P.y - P.r * 0.7 + R() * P.r * 1.4;
    const rx = 14 + R() * 26;
    for (const off of [0, tile]) bands.push(`<ellipse cx="${(P.x - P.r + sx + off).toFixed(0)}" cy="${sy.toFixed(0)}" rx="${rx.toFixed(0)}" ry="${(rx * 0.45).toFixed(0)}" fill="${C.cream}" opacity=".45"/>`);
  }

  // Ring (tilted ellipse split into back and front halves)
  const ring = { rx: 270, ry: 48, rot: -14 };
  const arc = (sweep) =>
    `M ${P.x - ring.rx} ${P.y} A ${ring.rx} ${ring.ry} 0 0 ${sweep} ${P.x + ring.rx} ${P.y}`;
  const ringPath = (half, cls) =>
    `<path d="${arc(half === "back" ? 1 : 0)}" fill="none" stroke="${t.ring}" stroke-width="2.4" stroke-dasharray="1.5 7" stroke-linecap="round" class="${cls}" transform="rotate(${ring.rot} ${P.x} ${P.y})"/>` +
    `<path d="${arc(half === "back" ? 1 : 0)}" fill="none" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="1 13" stroke-linecap="round" class="${cls}2" transform="rotate(${ring.rot} ${P.x} ${P.y})" opacity=".85"/>`;
  const orbit = `M ${P.x - 300} ${P.y + 10} a 300 70 0 1 0 600 0 a 300 70 0 1 0 -600 0`;
  const moonOrbit = `M ${P.x - 360} ${P.y - 20} a 360 110 0 1 1 720 0 a 360 110 0 1 1 -720 0`;

  // Dust
  const dust = Array.from({ length: 46 }, (_, i) => {
    const x = 470 + R() * 520;
    const y = 30 + R() * 420;
    return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.8 + R() * 1.6).toFixed(1)}" fill="${i % 4 === 0 ? C.red : t.ink}" class="tw" style="animation-delay:${(R() * 3).toFixed(2)}s"/>`;
  }).join("");

  // Dunes
  const dunes = `
  <g class="drift1"><path d="M-40,560 C120,520 260,540 420,565 C620,600 760,500 960,515 C1010,520 1030,535 1040,540 L1040,${H} L-40,${H} Z" fill="${C.sage}" opacity=".55"/></g>
  <g class="drift2"><path d="M-40,590 C180,550 320,615 520,592 C720,570 860,530 1040,570 L1040,${H} L-40,${H} Z" fill="${C.rust}"/></g>
  <g class="drift1"><path d="M-40,622 C140,598 300,640 480,628 C700,614 840,585 1040,610 L1040,${H} L-40,${H} Z" fill="${C.red}"/></g>
  <path d="M0,650 C240,630 420,672 700,658 C900,648 960,640 1000,646 L1000,${H} L0,${H} Z" fill="${t.bg}"/>`;

  // Name
  const name1 = letters("display", "DHRUV", 34, 348, 150, { fill: t.ink, cls: "rise", delay: 0.15, stagger: 0.06, ls: -4 });
  const name2 = letters("serifItalic", "Agrawal", 112, 458, 128, { fill: C.red, cls: "rise", delay: 0.5, stagger: 0.06 });

  // Pitch
  const pitchLines = wrap("sans", DATA.pitch, 17, 380);
  const pitch = pitchLines.map((l, i) => text("sans", l, 40, 512 + i * 24, 17, { fill: t.muted, cls: "fade", attrs: `style="animation-delay:1s"` })).join("");

  // HUD
  const hud =
    `<circle cx="58" cy="52" r="22" fill="${t.ink}"/>` +
    text("display", "DA", 58, 58, 15, { anchor: "middle", fill: t.bg }) +
    text("mono", "DHRUV AGRAWAL", 90, 48, 11, { ls: 2.4, fill: t.muted }) +
    text("mono", "AI / ML", 90, 63, 11, { ls: 2.4, fill: t.accentInk }) +
    text("mono", "12.97°N · 77.59°E", 960, 48, 11, { ls: 2.2, fill: t.muted, anchor: "end" }) +
    `<circle cx="${960 - measure("mono", "AVAILABLE", 11, 2.2) - 12}" cy="59" r="4" fill="${C.red}"/><circle cx="${960 - measure("mono", "AVAILABLE", 11, 2.2) - 12}" cy="59" r="4" fill="${C.red}" class="ping"/>` +
    text("mono", "AVAILABLE", 960, 63, 11, { ls: 2.2, fill: t.muted, anchor: "end" }) +
    star(46, 196, 7, C.red) +
    text("mono", "AI/ML ENGINEER · BENGALURU", 62, 201, 13, { ls: 3, fill: t.accentInk, cls: "fade" });

  // Terminal badge
  const badge = `<g transform="translate(905 470)">
    <circle r="62" fill="${t.bg}" opacity=".88"/>
    <g class="spin">${circleText("mono", "LAUNCH TERMINAL ✦ DHRUV-OS ✦ V1.0 ✦ ".replace(/✦/g, "+"), 0, 0, 48, 10, t.ink)}</g>
    <circle r="30" fill="${C.red}"/>
    ${text("monoBold", ">_", 0, 7, 20, { anchor: "middle", fill: C.cream })}
  </g>`;

  // Tapes
  const tapeItems = DATA.tape;
  const tapeA = tape(tapeItems, { font: "display", size: 24, upper: true, fill: C.cream, sep: (x, y) => star(x, y - 8, 9, C.red), y: 0 });
  const tapeB = tape(tapeItems, { font: "serifItalic", size: 32, fill: C.cream, sep: (x, y) => spark(x, y - 9, 10, C.teal), y: 0 });
  const tapes = `
    <g transform="translate(0 682) rotate(-2.6 500 0)"><rect x="-60" y="-26" width="1120" height="52" fill="${C.teal}"/>
      <g class="mqL" style="--d:-${tapeA.seg}px">${tapeA.svg}</g></g>
    <g transform="translate(0 712) rotate(2.2 500 0)"><rect x="-60" y="-28" width="1120" height="56" fill="${C.red}"/>
      <g class="mqR" style="--d:${tapeB.seg}px">${tapeB.svg}</g></g>`;

  const css = `
  @keyframes bands{to{transform:translateX(-${tile}px)}}
  .bands{animation:bands 70s linear infinite}
  @keyframes dash{to{stroke-dashoffset:-170}}
  .ringb,.ringf{animation:dash 9s linear infinite}
  .ringb2,.ringf2{animation:dash 14s linear infinite reverse}
  @keyframes d1{50%{transform:translateX(-18px)}}
  @keyframes d2{50%{transform:translateX(14px)}}
  .drift1{animation:d1 14s ease-in-out infinite}
  .drift2{animation:d2 18s ease-in-out infinite}
  @keyframes mqL{from{transform:translateX(0)}to{transform:translateX(var(--d))}}
  .mqL{animation:mqL 26s linear infinite}
  .mqR{animation:mqL 30s linear infinite reverse}
  .planet{animation:fade 1.4s ease both}`;

  const defs = `
    <clipPath id="pc"><circle cx="${P.x}" cy="${P.y}" r="${P.r}"/></clipPath>
    <radialGradient id="shade" cx="34%" cy="30%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="${C.tealDeep}" stop-opacity="0"/><stop offset="1" stop-color="${C.tealDeep}" stop-opacity=".85"/></radialGradient>
    <radialGradient id="atmo"><stop offset=".72" stop-color="${C.sage}" stop-opacity=".55"/><stop offset="1" stop-color="${C.sage}" stop-opacity="0"/></radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="3"/></filter>`;

  const body = `
    ${dust}
    <g class="planet">
      <circle cx="${P.x}" cy="${P.y}" r="${P.r + 26}" fill="url(#atmo)"/>
      ${ringPath("back", "ringb")}
      <g clip-path="url(#pc)">
        <rect x="${P.x - P.r}" y="${P.y - P.r}" width="${2 * P.r}" height="${2 * P.r}" fill="${C.rust}"/>
        <g class="bands">${bands.join("")}</g>
        <ellipse cx="${P.x}" cy="${P.y - P.r + 6}" rx="${P.r * 0.55}" ry="26" fill="${C.cream}" opacity=".8"/>
        <ellipse cx="${P.x}" cy="${P.y + P.r - 4}" rx="${P.r * 0.4}" ry="18" fill="${C.cream}" opacity=".6"/>
        <circle cx="${P.x}" cy="${P.y}" r="${P.r}" fill="url(#shade)"/>
      </g>
      <circle cx="${P.x}" cy="${P.y}" r="${P.r}" fill="none" stroke="${C.sage}" stroke-width="3" opacity=".6" filter="url(#soft)"/>
      ${ringPath("front", "ringf")}
      <g><path d="M0,-9 L9,0 L0,9 L-9,0 Z" fill="none" stroke="${t.ink}" stroke-width="1.4"/><circle r="3.2" fill="${C.red}"/>
        <animateMotion dur="16s" repeatCount="indefinite" path="${orbit}"/></g>
      <circle r="9" fill="${C.sage}"><animateMotion dur="34s" repeatCount="indefinite" path="${moonOrbit}"/></circle>
    </g>
    ${hud}
    ${name1}${name2}
    ${pitch}
    ${dunes}
    ${badge}
    ${tapes}`;

  return doc({
    w: W,
    h: H,
    bg: t.bg,
    css,
    defs,
    title: `${DATA.name}, ${DATA.role}`,
    desc: `${DATA.pitch} Animated banner: a rotating desert planet above layered dunes, with crossing tapes listing ${DATA.tape.join(", ")}.`,
    body,
  });
}

/** Seamless marquee strip: returns svg of repeated items and the length of one segment. */
function tape(items, { font, size, upper = false, fill, sep, y }) {
  const gap = 28;
  let x = 0;
  let seg = "";
  for (const it of items) {
    const s = upper ? it.toUpperCase() : it;
    seg += text(font, s, x, y + size * 0.35, size, { fill });
    x += measure(font, s, size) + gap;
    seg += sep(x, y + size * 0.35);
    x += gap;
  }
  const segW = x;
  const copies = Math.ceil(1200 / segW) + 1;
  let svg = "";
  for (let i = 0; i < copies; i++) svg += `<g transform="translate(${-60 + i * segW} 0)">${seg}</g>`;
  return { svg, seg: segW.toFixed(1) };
}

/* ======================================================================
   SECTION HEADER (eyebrow + kinetic title)
   ====================================================================== */
function header(t, { index, label, solid, italic, outline, blurb, h = 190 }) {
  let x = 40;
  let body = eyebrow(40, 48, index, label, t.muted, t.accentInk);
  const full = `${solid ?? ""} ${outline ?? italic ?? ""}`.trim();
  const size = Math.min(86, (86 * (blurb ? 640 : 900)) / measure("display", full, 86, -2));
  if (solid) {
    body += letters("display", solid, x, 150, size, { fill: t.ink, cls: "rise", stagger: 0.04, ls: -2 });
    x += measure("display", solid, size, -2) + 22;
  }
  if (outline) body += text("display", outline, x, 150, size, { stroke: t.ink, ls: -2, cls: "fade", attrs: `style="animation-delay:.3s"` });
  if (italic) body += text("serifItalic", italic, x, 150, size + 6, { fill: C.red, cls: "fade", attrs: `style="animation-delay:.3s"` });
  if (blurb) wrap("serifItalic", blurb, 20, 230).forEach((l, i) => (body += text("serifItalic", l, 960, 106 + i * 24, 20, { fill: t.muted, anchor: "end" })));
  return doc({ w: W, h, bg: t.bg, title: `${label}`, body });
}

/* ======================================================================
   ABOUT: word-by-word statement + education
   ====================================================================== */
function about(t) {
  const size = 30;
  const lh = 38;
  const lines = wrap("displayBold", DATA.summary, size, 650);
  let body = eyebrow(40, 48, "01", "About", t.muted, t.accentInk);
  ["engineer,", "researcher,", "builder."].forEach((w, i) => (body += text("serifItalic", w, 40, 112 + i * 30, 26, { fill: t.muted })));
  let wi = 0;
  lines.forEach((line, li) => {
    let x = 270;
    for (const word of line.split(" ")) {
      body += text("displayBold", word, x, 104 + li * lh, size, { fill: t.ink, cls: "word", attrs: `style="animation-delay:${(0.2 + wi * 0.06).toFixed(2)}s"` });
      x += measure("displayBold", word + " ", size);
      wi++;
    }
  });
  const y = 104 + lines.length * lh + 30;
  body += `<rect x="270" y="${y}" width="690" height="2" fill="${t.ink}"/>`;
  body += text("mono", "EDUCATION", 270, y + 44, 12, { ls: 2.6, fill: t.accentInk });
  body += text("serifItalic", DATA.education.school, 400, y + 46, 27, { fill: t.ink });
  body += text("sans", DATA.education.degree, 270, y + 78, 16, { fill: t.muted });
  return doc({ w: W, h: y + 108, bg: t.bg, title: "About", desc: `${DATA.summary} Education: ${DATA.education.school}, ${DATA.education.degree}.`, body });
}

/* ======================================================================
   EXPERIENCE: three mission cards
   ====================================================================== */
function missions(t) {
  const cardW = 296;
  const gap = 16;
  const pal = [
    { bg: C.teal, accent: C.red },
    { bg: C.red, accent: C.tealDeep },
    { bg: C.rust, accent: C.sage },
  ];
  const cards = DATA.experience.map((x, i) => {
    const c = pal[i % pal.length];
    const cx = 40 + i * (cardW + gap);
    let y = 44;
    let s = "";
    s += text("mono", `MISSION 0${i + 1}`, 24, y, 10, { ls: 2, fill: C.cream });
    s += text("mono", x.period.toUpperCase(), cardW - 24, y, 10, { ls: 1.2, fill: C.cream, anchor: "end" });
    y += 44;
    for (const l of wrap("display", x.company.toUpperCase(), 25, cardW - 48)) {
      s += text("display", l, 24, y, 25, { fill: C.cream });
      y += 27;
    }
    y += 4;
    for (const l of wrap("serifItalic", x.role, 21, cardW - 48)) {
      s += text("serifItalic", l, 24, y, 21, { fill: c.accent });
      y += 22;
    }
    s += text("mono", x.location.toUpperCase(), 24, y + 2, 9.5, { ls: 1.4, fill: C.cream, attrs: 'opacity=".75"' });
    y += 28;
    for (const p of x.points) {
      s += text("mono", "->", 24, y, 12, { fill: C.cream, attrs: 'opacity=".7"' });
      for (const l of wrap("sans", p, 14, cardW - 72)) {
        s += text("sans", l, 50, y, 14, { fill: C.cream });
        y += 19;
      }
      y += 7;
    }
    return { s, y, cx, c, x, i };
  });
  const cardH = Math.max(...cards.map((c) => c.y)) + 60;
  let body = eyebrow(40, 48, "02", "Experience", t.muted, t.accentInk);
  body += letters("display", "MISSION", 40, 140, 78, { fill: t.ink, cls: "rise", stagger: 0.04, ls: -2 });
  body += text("serifItalic", "log", 48 + measure("display", "MISSION", 78, -2), 140, 86, { fill: C.red, cls: "fade", attrs: 'style="animation-delay:.35s"' });
  let defs = "";
  for (const k of cards) {
    const year = k.x.period.match(/\d{4}/)?.[0] ?? "";
    defs += `<clipPath id="mc${k.i}"><rect width="${cardW}" height="${cardH}" rx="26"/></clipPath>`;
    body += `<g transform="translate(${k.cx} 178)"><g class="fade" style="animation-delay:${0.2 + k.i * 0.15}s"><g clip-path="url(#mc${k.i})">
      <rect width="${cardW}" height="${cardH}" fill="${k.c.bg}"/>
      ${text("display", year, cardW + 10, cardH + 22, 120, { fill: C.cream, anchor: "end", attrs: 'opacity=".13"' })}
      ${k.s}
      ${k.x.tags
        .slice(0, 3)
        .reduce(
          (acc, tag) => {
            const tw = measure("mono", tag.toUpperCase(), 9.5, 1) + 20;
            if (acc.x + tw > cardW - 24) {
              acc.x = 24;
              acc.y += 28;
            }
            acc.out += `<rect x="${acc.x}" y="${acc.y}" width="${tw}" height="22" rx="11" fill="none" stroke="${C.cream}" stroke-opacity=".4"/>` + text("mono", tag.toUpperCase(), acc.x + 10, acc.y + 15, 9.5, { ls: 1, fill: C.cream });
            acc.x += tw + 6;
            return acc;
          },
          { x: 24, y: cardH - 46, out: "" }
        ).out}
    </g></g></g>`;
  }
  return doc({
    w: W,
    h: 178 + cardH + 40,
    bg: t.bg,
    defs,
    title: "Experience: mission log",
    desc: DATA.experience.map((x) => `${x.company}, ${x.role}, ${x.period}: ${x.points.join("; ")}`).join(". "),
    body,
  });
}

/* ======================================================================
   PROJECT CARD
   ====================================================================== */
function project(t, p, i) {
  const pal = [
    { bg: t.name === "dark" ? C.teal : C.tealDeep, ink: C.cream, accent: C.red, line: "rgba(251,233,208,.22)" },
    { bg: C.rust, ink: C.cream, accent: C.cream, line: "rgba(251,233,208,.25)" },
  ][i % 2];
  const leftW = 560;
  let s = "";
  s += text("display", `0${i + 1}`, 44, 128, 116, { fill: pal.ink, ls: -4, attrs: 'opacity=".9"' });
  // chips top-right
  let cx = 956;
  for (const label of [...p.chips].reverse()) {
    const w = measure("displayBold", label.toUpperCase(), 11, 1.2) + 34;
    cx -= w;
    const hot = label.toLowerCase().includes("demo");
    s += `<rect x="${cx}" y="40" width="${w}" height="34" rx="17" fill="${hot ? C.red : C.cream}"/>`;
    s += text("displayBold", label.toUpperCase(), cx + w / 2, 61, 11, { ls: 1.2, anchor: "middle", fill: hot ? C.cream : C.tealDeep });
    cx -= 8;
  }
  s += `<rect x="44" y="152" width="912" height="1.5" fill="${pal.line}"/>`;
  let y = 222;
  for (const l of wrap("display", p.name.toUpperCase(), 56, leftW, -1.5)) {
    s += text("display", l, 44, y, 56, { fill: pal.ink, ls: -1.5 });
    y += 56;
  }
  y -= 14;
  for (const l of wrap("serifItalic", p.tagline, 24, leftW)) {
    s += text("serifItalic", l, 44, y, 24, { fill: pal.accent });
    y += 28;
  }
  y += 14;
  for (const pt of p.points) {
    s += spark(52, y - 5, 6, pal.ink);
    for (const l of wrap("sans", pt, 15, leftW - 28)) {
      s += text("sans", l, 70, y, 15, { fill: pal.ink, attrs: 'opacity=".92"' });
      y += 21;
    }
    y += 8;
  }
  y += 8;
  let sx = 44;
  for (const st of p.stack) {
    const w = measure("mono", st.toUpperCase(), 10, 1) + 22;
    if (sx + w > 44 + leftW) {
      sx = 44;
      y += 30;
    }
    s += `<rect x="${sx}" y="${y - 16}" width="${w}" height="24" rx="12" fill="none" stroke="${pal.line}" stroke-width="1.4"/>`;
    s += text("mono", st.toUpperCase(), sx + 11, y, 10, { ls: 1, fill: pal.ink });
    sx += w + 6;
  }
  y += 46;
  s += text("display", "READ THE CASE STUDY  ->", 44, y, 15, { ls: 1.5, fill: pal.ink });
  s += `<rect x="44" y="${y + 8}" width="${measure("display", "READ THE CASE STUDY  ->", 15, 1.5)}" height="2.4" fill="${pal.ink}"/>`;
  // metrics column
  let my = 232;
  p.highlights.forEach((h, k) => {
    s += text("display", h.value, 660, my, 46, { fill: pal.ink, ls: -1 });
    s += text("mono", h.label.toUpperCase(), 662, my + 24, 10, { ls: 2, fill: pal.ink, attrs: 'opacity=".72"' });
    if (k < p.highlights.length - 1) s += `<rect x="660" y="${my + 44}" width="296" height="1.4" fill="${pal.line}"/>`;
    my += 92;
  });
  const H = Math.max(y + 50, my + 20);
  return doc({
    w: W,
    h: H,
    bg: pal.bg,
    title: `${p.name}: ${p.tagline}`,
    desc: `${p.points.join(" ")} Stack: ${p.stack.join(", ")}. ${p.highlights.map((h) => `${h.value} ${h.label}`).join(", ")}.`,
    body: `<g class="fade">${s}</g>`,
  });
}

/* ======================================================================
   RESEARCH: journal page on sage, spinning stamp
   ====================================================================== */
function research(t) {
  const p = DATA.paper;
  const pageX = 60;
  const pageW = 880;
  let s = "";
  let y = 70;
  s += text("monoBold", p.venue.toUpperCase(), 40, y, 11, { ls: 2, fill: C.red });
  s += text("mono", `DOI ${p.doi}`, 40 + measure("monoBold", p.venue.toUpperCase(), 11, 2) + 26, y, 11, { ls: 1.4, fill: C.tealDeep });
  s += `<rect x="40" y="${y + 16}" width="${pageW - 80}" height="2.4" fill="${C.tealDeep}"/>`;
  y += 78;
  for (const l of wrap("serif", p.title, 44, pageW - 220)) {
    s += text("serif", l, 40, y, 44, { fill: C.tealDeep });
    y += 46;
  }
  y += 10;
  let ax = 40;
  p.authors.forEach((a, i) => {
    const label = a + (i < p.authors.length - 1 ? ", " : "");
    const me = a === DATA.name;
    const w = measure(me ? "sansBold" : "sans", a, 15);
    if (me) s += `<rect x="${ax - 3}" y="${y - 15}" width="${w + 6}" height="21" fill="${C.red}"/>`;
    s += text(me ? "sansBold" : "sans", label, ax, y, 15, { fill: me ? C.cream : C.tealDeep, attrs: me ? "" : 'opacity=".75"' });
    ax += measure(me ? "sansBold" : "sans", label, 15);
  });
  y += 52;
  s += text("monoBold", "TL;DR", 40, y - 4, 11, { ls: 2, fill: C.red });
  for (const l of wrap("displayBold", p.tldr, 21, 470)) {
    s += `<rect x="108" y="${y - 6}" width="${measure("displayBold", l, 21)}" height="10" fill="${C.red}" opacity=".28"/>`;
    s += text("displayBold", l, 108, y, 21, { fill: C.tealDeep });
    y += 29;
  }
  // results column
  let ry = y - 29 * wrap("displayBold", p.tldr, 21, 470).length - 6;
  for (const r of p.results) {
    s += `<rect x="620" y="${ry - 34}" width="4" height="56" fill="${C.red}"/>`;
    s += text("display", r.value, 638, ry, 36, { fill: C.tealDeep });
    s += text("mono", r.label.toUpperCase(), 638, ry + 18, 9.5, { ls: 1.4, fill: C.tealDeep, attrs: 'opacity=".7"' });
    ry += 74;
  }
  y = Math.max(y, ry - 30) + 20;
  s += `<rect x="40" y="${y}" width="214" height="40" rx="20" fill="${C.tealDeep}"/>`;
  s += text("displayBold", "READ ON IEEE XPLORE", 147, y + 25, 11.5, { ls: 1.2, anchor: "middle", fill: C.cream });
  s += `<rect x="264" y="${y}" width="96" height="40" rx="20" fill="none" stroke="${C.tealDeep}" stroke-width="2"/>`;
  s += text("displayBold", "CITE", 312, y + 25, 11.5, { ls: 1.2, anchor: "middle", fill: C.tealDeep });
  const pageH = y + 74;

  const H = 150 + pageH + 46;
  // background marquee
  const bgWord = tape(["RESEARCH", "PUBLICATIONS"], { font: "display", size: 120, upper: true, fill: "none", sep: (x, yy) => spark(x, yy - 40, 30, C.tealDeep), y: 0 });
  const stamp = `<g transform="translate(${pageX + pageW - 90} 138)">
    <g class="spin">${circleText("monoBold", `PUBLISHED + ${p.venue.toUpperCase()} + `, 0, 0, 52, 10.5, C.red)}</g>
    ${text("display", String(p.year), 0, 9, 24, { anchor: "middle", fill: C.red })}
  </g>`;
  const body = `
    <g opacity=".22" transform="translate(0 112)"><g class="mqL" style="--d:-${bgWord.seg}px">${bgWord.svg.replace(/fill="none"/g, `fill="none" stroke="${C.tealDeep}" stroke-width="2"`)}</g></g>
    ${eyebrow(40, 48, "04", "Research", C.tealDeep, C.red)}
    <g transform="translate(${pageX} 150) rotate(-1 ${pageW / 2} ${pageH / 2})" class="fade">
      <rect width="${pageW}" height="${pageH}" fill="${C.cream}" filter="url(#paper)"/>
      ${s}
    </g>
    ${stamp}`;
  return doc({
    w: W,
    h: H,
    bg: C.sage,
    css: `@keyframes mqL{from{transform:translateX(0)}to{transform:translateX(var(--d))}}.mqL{animation:mqL 40s linear infinite}`,
    defs: `<filter id="paper" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="${C.tealDeep}" flood-opacity=".35"/></filter>`,
    title: `Research: ${p.title}`,
    desc: `${p.venue}. ${p.authors.join(", ")}. TL;DR: ${p.tldr} Results: ${p.results.map((r) => `${r.value} ${r.label}`).join(", ")}.`,
    body,
  });
}

/* ======================================================================
   SKILLS: kinetic marquee rows + achievement stickers
   ====================================================================== */
function skills(t) {
  const all = DATA.skills;
  const row1 = all.slice(0, 11);
  const row2 = all.slice(11);
  const mk = (items, alt) => {
    const gap = 22;
    let x = 0;
    let seg = "";
    items.forEach((it, i) => {
      if (alt === "display") {
        const s = it.toUpperCase();
        seg += text("display", s, x, 0, 50, i % 2 ? { stroke: t.ink } : { fill: t.ink });
        x += measure("display", s, 50) + gap;
        seg += star(x + 12, -17, 14, C.red);
        x += 24 + gap;
      } else {
        seg += text("serifItalic", it, x, 0, 54, { fill: i % 2 ? C.red : t.ink });
        x += measure("serifItalic", it, 54) + gap;
        seg += spark(x + 10, -18, 12, t.ink);
        x += 20 + gap;
      }
    });
    const copies = Math.ceil(1100 / x) + 1;
    let svg = "";
    for (let i = 0; i < copies; i++) svg += `<g transform="translate(${i * x} 0)">${seg}</g>`;
    return { svg, seg: x.toFixed(1) };
  };
  const r1 = mk(row1, "display");
  const r2 = mk(row2, "serif");

  // stickers
  const stickerPal = [
    { bg: C.red, fg: C.cream },
    { bg: C.teal, fg: C.cream },
    { bg: C.cream, fg: C.tealDeep, stroke: C.tealDeep },
    { bg: C.rust, fg: C.cream },
    { bg: C.sage, fg: C.tealDeep },
  ];
  const tilts = [-7, 5, -3, 8, -5, 4, -9];
  const boardX = 40;
  const boardW = 920;
  let sx = boardX + 30;
  let sy = 0;
  const rowsY = [];
  const placed = [];
  DATA.achievements.forEach((a, i) => {
    const w = Math.max(measure("display", a.title.toUpperCase(), 15, 0.5), measure("serifItalic", a.detail, 18)) + 36;
    if (sx + w > boardX + boardW - 30) {
      sx = boardX + 30;
      sy += 1;
    }
    rowsY[sy] = true;
    placed.push({ a, i, x: sx, w, row: sy });
    sx += w + 18;
  });
  const top = 300;
  const rowH = 92;
  // centre each row
  const rowWidths = {};
  placed.forEach((p) => (rowWidths[p.row] = (rowWidths[p.row] ?? -18) + p.w + 18));
  let stickers = "";
  const rowCursor = {};
  placed.forEach((p) => {
    const st = stickerPal[p.i % stickerPal.length];
    const startX = boardX + (boardW - rowWidths[p.row]) / 2;
    const x = (rowCursor[p.row] ?? startX);
    rowCursor[p.row] = x + p.w + 18;
    const y = top + 40 + p.row * rowH;
    const r = tilts[p.i % tilts.length];
    stickers += `<g transform="translate(${x + p.w / 2} ${y + 30})"><g style="--r:${r}deg;--r0:${r * 2}deg;animation:pop .7s cubic-bezier(.34,1.56,.64,1) ${(0.1 + p.i * 0.08).toFixed(2)}s both;transform-box:fill-box;transform-origin:center">
      <rect x="${-p.w / 2}" y="-30" width="${p.w}" height="62" rx="16" fill="${st.bg}" ${st.stroke ? `stroke="${st.stroke}" stroke-width="2"` : ""}/>
      ${text("display", p.a.title.toUpperCase(), -p.w / 2 + 18, -5, 15, { ls: 0.5, fill: st.fg })}
      ${text("serifItalic", p.a.detail, -p.w / 2 + 18, 18, 18, { fill: st.fg })}
    </g></g>`;
  });
  const boardH = 40 + placed.reduce((m, p) => Math.max(m, p.row), 0) * rowH + 100;
  const H = top + boardH + 40;

  const body = `
    ${eyebrow(40, 48, "05", "Skills & achievements", t.muted, t.accentInk)}
    <rect x="0" y="76" width="${W}" height="2" fill="${t.ink}"/>
    <g transform="translate(0 150)"><g class="mqL" style="--d:-${r1.seg}px">${r1.svg}</g></g>
    <g transform="translate(0 228)"><g class="mqL" style="--d:-${r2.seg}px;animation-direction:reverse">${r2.svg}</g></g>
    <rect x="0" y="256" width="${W}" height="2" fill="${t.ink}"/>
    <rect x="${boardX}" y="${top}" width="${boardW}" height="${boardH}" rx="30" fill="none" stroke="${t.line}" stroke-width="2" stroke-dasharray="8 8"/>
    ${text("mono", "ACHIEVEMENTS", boardX + 24, top + 26, 10.5, { ls: 2.4, fill: t.muted })}
    ${stickers}`;
  return doc({
    w: W,
    h: H,
    bg: t.bg,
    css: `@keyframes mqL{from{transform:translateX(0)}to{transform:translateX(var(--d))}}.mqL{animation:mqL 38s linear infinite}`,
    title: "Skills and achievements",
    desc: `Skills: ${DATA.skills.join(", ")}. Achievements: ${DATA.achievements.map((a) => `${a.title} (${a.detail})`).join(", ")}.`,
    body,
  });
}

/* ======================================================================
   CONTACT + FOOTER
   ====================================================================== */
function contact(t) {
  const H = 430;
  let body = eyebrow(40, 52, "06", "Contact", C.cream, C.tealDeep);
  const big = (100 * 920) / measure("display", "LET'S BUILD", 100, -4);
  body += `<g class="slideL">${text("display", "LET'S BUILD", 38, 170, big, { fill: C.cream, ls: (-4 * big) / 100 })}</g>`;
  body += `<g class="slideR">${text("serifItalic", "something.", 966, 262, 108, { fill: C.tealDeep, anchor: "end" })}</g>`;
  wrap("sans", DATA.contactLine, 17, 380).forEach((l, i) => (body += text("sans", l, 40, 320 + i * 25, 17, { fill: C.cream })));
  const ew = measure("displayBold", DATA.email, 22) + 110;
  const ex = 960 - ew;
  body += `<rect x="${ex}" y="318" width="${ew}" height="68" rx="34" fill="${C.tealDeep}"/>`;
  body += text("displayBold", DATA.email, ex + 32, 360, 22, { fill: C.cream });
  body += `<circle cx="${ex + ew - 38}" cy="352" r="24" fill="${C.red}"/>`;
  body += `<rect x="${ex + ew - 50}" y="344" width="24" height="17" rx="2" fill="none" stroke="${C.cream}" stroke-width="2"/><path d="M${ex + ew - 50},345 L${ex + ew - 38},355 L${ex + ew - 26},345" fill="none" stroke="${C.cream}" stroke-width="2"/>`;
  return doc({
    w: W,
    h: H,
    bg: C.red,
    css: `@keyframes sl{from{transform:translateX(-120px);opacity:0}to{transform:none;opacity:1}}@keyframes sr{from{transform:translateX(140px);opacity:0}to{transform:none;opacity:1}}.slideL{animation:sl 1.1s cubic-bezier(.22,1,.36,1) .1s both}.slideR{animation:sr 1.1s cubic-bezier(.22,1,.36,1) .35s both}`,
    title: "Let's build something",
    desc: `${DATA.contactLine} Email: ${DATA.email}`,
    body,
  });
}

function footer() {
  const H = 210;
  let body = "";
  body += text("mono", "© 2026 DHRUV AGRAWAL", 40, 44, 11, { ls: 2.2, fill: C.sage });
  body += text("mono", "BENGALURU -> ANYWHERE", 500, 44, 11, { ls: 2.2, fill: C.sage, anchor: "middle" });
  body += text("mono", "TRY /TERMINAL", 960, 44, 11, { ls: 2.2, fill: C.red, anchor: "end" });
  const base = 100;
  const size = (base * 900) / (measure("display", "DHRUV", base, -3.6) + measure("display", ".", base) + measure("display", "AG", base, -3.6));
  const ls = (-3.6 * size) / base;
  const w1 = measure("display", "DHRUV", size, ls);
  const w2 = measure("display", ".", size);
  const w3 = measure("display", "AG", size, ls);
  const x0 = (W - (w1 + w2 + w3)) / 2;
  body += text("display", "DHRUV", x0, 186, size, { fill: C.cream, ls });
  body += text("display", ".", x0 + w1, 186, size, { fill: C.red });
  body += text("display", "AG", x0 + w1 + w2, 186, size, { fill: C.cream, ls });
  return doc({ w: W, h: H, bg: C.tealDeep, title: "dhruv.ag", body });
}

/* ======================================================================
   Write everything
   ====================================================================== */
const jobs = {
  hero,
  about,
  missions,
  research,
  skills,
  contact: () => contact(),
  footer: () => footer(),
  "work-header": (t) => header(t, { index: "03", label: "Projects", solid: "SELECTED", outline: "WORK", blurb: "Models that leave the notebook: sensors, clouds and real users." }),
  ...Object.fromEntries(DATA.projects.map((p, i) => [`project-${p.slug}`, (t) => project(t, p, i)])),
};

for (const [name, fn] of Object.entries(jobs)) {
  for (const t of Object.values(THEMES)) {
    const svg = fn(t);
    writeFileSync(new URL(`${name}-${t.name}.svg`, OUT), svg);
  }
  console.log(`✓ ${name}`);
}
