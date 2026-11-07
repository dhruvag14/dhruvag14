// Shared drawing helpers: fonts → SVG paths, wrapping, shapes, themes.
import opentype from "opentype.js";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const fontFile = (pkg, file) => path.join(path.dirname(require.resolve(`${pkg}/package.json`)), "files", file);
const load = (pkg, file) => opentype.loadSync(fontFile(pkg, file));

export const FONTS = {
  display: load("@fontsource/syne", "syne-latin-800-normal.woff"),
  displayBold: load("@fontsource/syne", "syne-latin-700-normal.woff"),
  serif: load("@fontsource/instrument-serif", "instrument-serif-latin-400-normal.woff"),
  serifItalic: load("@fontsource/instrument-serif", "instrument-serif-latin-400-italic.woff"),
  sans: load("@fontsource/instrument-sans", "instrument-sans-latin-400-normal.woff"),
  sansBold: load("@fontsource/instrument-sans", "instrument-sans-latin-600-normal.woff"),
  mono: load("@fontsource/jetbrains-mono", "jetbrains-mono-latin-400-normal.woff"),
  monoBold: load("@fontsource/jetbrains-mono", "jetbrains-mono-latin-700-normal.woff"),
};

export const C = {
  teal: "#244855",
  tealDeep: "#0f2229",
  red: "#e64833",
  rust: "#874f41",
  sage: "#90aead",
  cream: "#fbe9d0",
};

export const THEMES = {
  light: { name: "light", bg: "#fbe9d0", surface: "#f6dcb8", ink: "#1a3640", muted: "#4f6b70", line: "rgba(36,72,85,0.22)", accentInk: "#b8321f", ring: "rgba(26,54,64,0.55)" },
  dark: { name: "dark", bg: "#0f2229", surface: "#17323b", ink: "#fbe9d0", muted: "#90aead", line: "rgba(144,174,173,0.25)", accentInk: "#f0705e", ring: "rgba(251,233,208,0.6)" },
};

const warned = new Set();
function checkGlyphs(font, str) {
  for (const ch of str) {
    if (ch === " ") continue;
    if (font.charToGlyph(ch).index === 0 && !warned.has(font.names.fullName?.en + ch)) {
      warned.add(font.names.fullName?.en + ch);
      console.warn(`  ! missing glyph "${ch}" in ${font.names.fullName?.en}`);
    }
  }
}

export function measure(fontKey, str, size, ls = 0) {
  const f = FONTS[fontKey];
  if (!ls) return f.getAdvanceWidth(str, size, { kerning: true });
  let w = 0;
  for (const ch of str) w += f.getAdvanceWidth(ch, size) + ls;
  return w - ls;
}

/** Text as an SVG <path>. anchor: start | middle | end. */
export function text(fontKey, str, x, y, size, { ls = 0, anchor = "start", fill = "currentColor", cls = "", attrs = "", stroke } = {}) {
  const f = FONTS[fontKey];
  checkGlyphs(f, str);
  const w = measure(fontKey, str, size, ls);
  let x0 = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  let d = "";
  if (!ls) d = f.getPath(str, x0, y, size, { kerning: true }).toPathData(1);
  else
    for (const ch of str) {
      d += f.getPath(ch, x0, y, size).toPathData(1);
      x0 += f.getAdvanceWidth(ch, size) + ls;
    }
  const paint = stroke ? `fill="none" stroke="${stroke}" stroke-width="1.4"` : `fill="${fill}"`;
  return `<path d="${d}" ${paint}${cls ? ` class="${cls}"` : ""}${attrs ? ` ${attrs}` : ""}/>`;
}

/** One <path> per letter, for staggered animations. */
export function letters(fontKey, str, x, y, size, { fill, cls = "", delay = 0, stagger = 0.05, ls = 0 } = {}) {
  const f = FONTS[fontKey];
  checkGlyphs(f, str);
  let cx = x;
  const out = [];
  [...str].forEach((ch, i) => {
    if (ch !== " ") {
      const d = f.getPath(ch, cx, y, size).toPathData(1);
      out.push(`<path d="${d}" fill="${fill}" class="${cls}" style="animation-delay:${(delay + i * stagger).toFixed(2)}s"/>`);
    }
    cx += f.getAdvanceWidth(ch, size) + ls;
  });
  return out.join("");
}

/** Greedy word wrap by measured width. */
export function wrap(fontKey, str, size, maxW, ls = 0) {
  const words = str.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (measure(fontKey, t, size, ls) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Text placed around a circle (for rotating badges). */
export function circleText(fontKey, str, cx, cy, R, size, fill) {
  const f = FONTS[fontKey];
  checkGlyphs(f, str);
  const chars = [...str];
  const adv = chars.map((ch) => f.getAdvanceWidth(ch, size));
  const total = adv.reduce((a, b) => a + b, 0);
  const extra = (2 * Math.PI * R - total) / chars.length;
  let acc = 0;
  return chars
    .map((ch, i) => {
      const a = (acc + adv[i] / 2) / R;
      acc += adv[i] + extra;
      if (ch === " ") return "";
      const d = f.getPath(ch, -adv[i] / 2, 0, size).toPathData(1);
      const deg = (a * 180) / Math.PI;
      return `<path d="${d}" fill="${fill}" transform="translate(${cx} ${cy}) rotate(${deg.toFixed(2)}) translate(0 ${-R})"/>`;
    })
    .join("");
}

/** 8-point "✺" star and 4-point "✦" sparkle as paths (fonts lack these glyphs). */
export function star(cx, cy, r, fill, points = 8, inner = 0.42) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
}
export const spark = (cx, cy, r, fill) => star(cx, cy, r, fill, 4, 0.28);

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const BASE_CSS = `
@keyframes rise{from{transform:translateY(46px);opacity:0}to{transform:none;opacity:1}}
.rise{animation:rise .9s cubic-bezier(.22,1,.36,1) both}
@keyframes fade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.fade{animation:fade .8s cubic-bezier(.22,1,.36,1) both}
@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin 20s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes ping{0%{transform:scale(1);opacity:.7}80%,100%{transform:scale(2.6);opacity:0}}
.ping{animation:ping 1.6s cubic-bezier(0,0,.2,1) infinite;transform-box:fill-box;transform-origin:center}
@keyframes blink{50%{opacity:0}}
.blink{animation:blink 1s steps(1) infinite}
@keyframes twinkle{0%,100%{opacity:.15}50%{opacity:.9}}
.tw{animation:twinkle 3.2s ease-in-out infinite}
@keyframes pop{from{transform:scale(.4) rotate(var(--r0));opacity:0}to{transform:scale(1) rotate(var(--r));opacity:1}}
@keyframes wordlight{from{opacity:.14}to{opacity:1}}
.word{animation:wordlight .5s ease both}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

/** Wrap content in a standalone SVG document. */
export function doc({ w, h, title, desc = "", body, css = "", defs = "", bg, radius = 28 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc || title)}</desc>
<style>${BASE_CSS}${css}</style>
<defs><clipPath id="frame"><rect width="${w}" height="${h}" rx="${radius}"/></clipPath>${defs}</defs>
<g clip-path="url(#frame)">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${body}</g>
</svg>`;
}

/** "( 02 ) ——— EXPERIENCE" eyebrow. */
export function eyebrow(x, y, index, label, color, indexColor) {
  const a = text("mono", `( ${index} )`, x, y, 12, { ls: 2.6, fill: indexColor });
  const iw = measure("mono", `( ${index} )`, 12, 2.6);
  const line = `<rect x="${x + iw + 14}" y="${y - 5}" width="40" height="1.2" fill="${color}" opacity=".5"/>`;
  const b = text("mono", label.toUpperCase(), x + iw + 68, y, 12, { ls: 2.6, fill: color });
  return a + line + b;
}
