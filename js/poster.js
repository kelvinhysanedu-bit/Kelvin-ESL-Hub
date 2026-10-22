import { esc } from "./logic.js";
import { avatar } from "./ui.js";

/* Weekly announcement poster. Drawn at full size (width x height in pixels) and scaled down for the preview. */
export const FORMATS = {
  portrait: { label: "Portrait 1080 x 1350 (Instagram, Facebook)", w: 1080, h: 1350 },
  square: { label: "Square 1080 x 1080 (posts, group chats)", w: 1080, h: 1080 },
  story: { label: "Story 1080 x 1920 (Stories, TikTok, status)", w: 1080, h: 1920 },
  a4: { label: "A4 print 1240 x 1754", w: 1240, h: 1754 },
};

const LOGO = `<svg class="p-logo" viewBox="0 0 44 44" aria-hidden="true"><path fill="#2f45c9" d="M9 4h26a7 7 0 0 1 7 7v17a7 7 0 0 1-7 7H23l-8 7v-7H9a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"/>
  <rect fill="#fff" x="9.5" y="16" width="7" height="12" rx="1.5"/><rect fill="#fff" x="18.5" y="9" width="7" height="19" rx="1.5"/><rect fill="#fff" x="27.5" y="19" width="7" height="9" rx="1.5"/></svg>`;

const AREA_COLORS = { grammar: "#4a64c8", vocabulary: "#b88a2e", phrasal: "#b8446f", wordform: "#2f86b5", functional: "#c9603f", reading: "#2f8f7b", writing: "#8059a8", listening: "#6c8f2f" };

function leaderboardHTML(lb, s) {
  const rows = lb.rows.length
    ? lb.rows
        .map(
          (r) => `<li><span class="p-rank r${r.rank <= 3 ? r.rank : 0}">${r.rank}</span>${avatar(r.name, r.color, r.glyph, Math.round(46 * s))}
        <div class="p-who"><b>${esc(r.name)}</b><span>${esc(r.title)}${r.level ? " &middot; " + esc(r.level) : ""}</span></div>
        <div class="p-score">${r.total}<small> / ${r.max}</small></div></li>`
        )
        .join("")
    : `<li class="p-empty">No scores yet. Be the first on the leaderboard!</li>`;
  return `<section class="p-card lb"><div class="p-k">Leaderboard sneak peek<span>${lb.label ? " &middot; " + esc(lb.label) : ""}</span></div><ol class="p-lb">${rows}</ol></section>`;
}

export function posterHTML(d) {
  const f = FORMATS[d.fmt] || FORMATS.portrait;
  const s = f.w / 1080;
  const cards = [];
  if (d.idiom)
    cards.push(`<section class="p-card idiom"><div class="p-k">Idiom of the day</div><div class="p-big">${esc(d.idiom.text)}</div>
      <div class="p-mean">${esc(d.idiom.meaning)}</div><div class="p-ex">&ldquo;${esc(d.idiom.example)}&rdquo;</div></section>`);
  if (d.quote)
    cards.push(`<section class="p-card quote"><div class="p-k">Quote of the week</div><div class="p-big">&ldquo;${esc(d.quote.text)}&rdquo;</div>
      <div class="p-by">&mdash; ${esc(d.quote.author)}</div><div class="p-mean">${esc(d.quote.meaning)}</div></section>`);
  const chips = d.chips && d.chips.length ? `<div class="p-chips">${d.chips.map((c) => `<span class="p-chip"><i style="background:${AREA_COLORS[c.id] || "#4a64c8"}"></i>${esc(c.name)}</span>`).join("")}</div>` : "";
  const note = d.note ? `<div class="p-sticky"><span>${esc(d.note)}</span></div>` : "";
  return `<div class="poster fmt-${d.fmt}" style="--s:${s};width:${f.w}px;height:${f.h}px"><div class="p-inner">
    <div class="p-top">${LOGO}<div><div class="p-brand">Tr. Kelvin's ESL Hub</div><div class="p-sub">Weekly Quiz League</div></div></div>
    <div class="p-hero"><span class="p-badge">${esc(d.badge)}</span><h1 class="p-title">${esc(d.title)}</h1><p class="p-meta">${esc(d.meta)}</p>${chips}</div>
    ${cards.length ? `<div class="p-cards ${cards.length === 1 ? "one" : ""}">${cards.join("")}</div>` : ""}
    ${d.lb ? leaderboardHTML(d.lb, s) : ""}
    <div class="p-bottom ${note ? "with-note" : ""}">${note}<div class="p-cta"><div class="p-qr"></div><div class="p-cta-t"><div class="p-cta-h">Take the quiz</div>
      <div class="p-cta-p">Scan or open the link</div><div class="p-link">${esc(d.linkText)}</div></div></div></div>
    ${d.perk ? `<div class="p-perk">${esc(d.perk)}</div>` : ""}
  </div></div>`;
}

/* Draws the poster into a container and returns true if the content is too tall for the chosen size. */
export function renderPoster(container, d) {
  container.innerHTML = posterHTML(d);
  const f = FORMATS[d.fmt] || FORMATS.portrait;
  const qr = container.querySelector(".p-qr");
  if (window.QRCode && d.link) {
    const size = Math.round((d.fmt === "square" ? 92 : 112) * (f.w / 1080));
    new window.QRCode(qr, { text: d.link, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.M });
  }
  const inner = container.querySelector(".p-inner");
  return inner.scrollHeight > inner.clientHeight + 2;
}

export async function posterToBlob(d) {
  const f = FORMATS[d.fmt] || FORMATS.portrait;
  const stage = document.createElement("div");
  stage.style.cssText = `position:absolute;left:-30000px;top:0;width:${f.w}px;height:${f.h}px;`;
  document.body.appendChild(stage);
  try {
    renderPoster(stage, d);
    if (document.fonts) {
      await Promise.all(['600 40px "Newsreader"', '700 30px "Hanken Grotesk"', '600 40px "Caveat"'].map((x) => document.fonts.load(x).catch(() => null)));
      await document.fonts.ready;
    }
    const canvas = await window.html2canvas(stage.firstElementChild, { width: f.w, height: f.h, scale: 1, useCORS: true, backgroundColor: null, logging: false });
    return await new Promise((res) => canvas.toBlob(res, "image/png"));
  } finally {
    stage.remove();
  }
}
