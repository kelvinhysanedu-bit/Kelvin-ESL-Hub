import { esc, AVATAR_COLORS, GLYPH_COUNT } from "./logic.js";

const GLYPHS = [
  null,
  '<path d="M3 19 10 7l4 7 2-3 5 8z"/>',
  '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  '<path d="M3 9c3-4 6-4 9 0s6 4 9 0M3 16c3-4 6-4 9 0s6 4 9 0"/>',
  '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
  '<path d="M5 19c0-9 6-14 14-14 0 8-5 14-14 14zM5 19l7-7"/>',
];

export const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const skillVar = (id) => `var(--sk-${id})`;
export const colorOf = (i) => AVATAR_COLORS[Number(i) % AVATAR_COLORS.length] || AVATAR_COLORS[0];
export const glyphOf = (g) => (Number(g) >= 0 && Number(g) < GLYPH_COUNT ? Number(g) : 0);

export function avatar(name, color, glyph, size = 36) {
  const g = glyphOf(glyph);
  const inner = g
    ? `<svg viewBox="0 0 24 24" width="${Math.round(size * 0.58)}" height="${Math.round(size * 0.58)}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[g]}</svg>`
    : esc([...String(name || "?")][0] || "?");
  return `<span class="avatar" style="--size:${size}px;background:${colorOf(color)}" aria-hidden="true">${inner}</span>`;
}

export function glyphIcon(g, size = 22) {
  const i = glyphOf(g);
  if (!i) return `<span style="font-family:Newsreader,serif;font-weight:600;font-size:${Math.round(size * 0.8)}px">Aa</span>`;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[i]}</svg>`;
}

export function brandHTML({ href = "./", nav = true, sub = "" } = {}) {
  const words = ["Tr.", "Kelvin's", "ESL", "Hub"].map((w, i) => `<span class="w" style="--n:${i}">${w}</span>`).join(" ");
  const bars = [[11, 17, 11], [19, 11, 17], [27, 20, 8]]
    .map(([x, y, h], i) => `<rect class="bar" style="--n:${i}" x="${x}" y="${y}" width="6" height="${h}" rx="1.5"/>`)
    .join("");
  return `<a class="brand" href="${href}" ${nav ? 'data-act="nav" data-v="home"' : ""}>
    <svg class="logo" viewBox="0 0 44 44" aria-hidden="true"><path class="bubble" d="M9 4h26a7 7 0 0 1 7 7v17a7 7 0 0 1-7 7H23l-8 7v-7H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"/>${bars}</svg>
    <span class="brand-t"><h1 class="t1">${words}</h1><span class="by">Weekly Quiz League${sub ? " &middot; " + sub : ""}<i class="ul"></i></span></span></a>`;
}

export function timeAgo(t) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  if (s < 7 * 86400) return Math.floor(s / 86400) + " d ago";
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const easeOut = (p) => 1 - Math.pow(1 - p, 3);

export function countUp(el, from, to, dur = 700) {
  if (RM || dur === 0 || from === to) {
    el.textContent = to;
    return;
  }
  const t0 = performance.now();
  const stamp = String(Math.random());
  el.dataset.cu = stamp;
  (function tick(t) {
    if (el.dataset.cu !== stamp) return;
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(from + (to - from) * easeOut(p));
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
  setTimeout(() => {
    if (el.dataset.cu === stamp) el.textContent = to;
  }, dur + 80);
}

export function captureRects(root) {
  return new Map([...root.querySelectorAll("[data-k]")].map((n) => [n.dataset.k, n.getBoundingClientRect()]));
}

export function playFlip(root, first, dur = 450) {
  if (RM) return;
  root.querySelectorAll("[data-k]").forEach((n) => {
    const f = first.get(n.dataset.k);
    if (!f) return;
    const l = n.getBoundingClientRect();
    const dx = f.left - l.left;
    const dy = f.top - l.top;
    if (dx || dy) n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: dur, easing: "cubic-bezier(.2,.7,.2,1)" });
  });
}
