/* Quiz areas for B1-C1 adult learners. Order here is the order shown everywhere. */
export const SKILLS = [
  { id: "grammar", label: "Grammar", name: "Grammar", short: "GR", title: "Grammar Architect", hint: "tenses, conditionals, modals, passives, reported speech, gap-fill" },
  { id: "vocabulary", label: "Vocabulary & collocations", name: "Vocabulary", short: "VO", title: "Lexicon Master", hint: "collocations, fixed phrases, shades of meaning, topic vocabulary" },
  { id: "phrasal", label: "Phrasal verbs & idioms", name: "Phrasal verbs", short: "PV", title: "Idiom Ace", hint: "multi-word verbs and common idioms in context" },
  { id: "wordform", label: "Word formation", name: "Word formation", short: "WF", title: "Word Builder", hint: "prefixes, suffixes and word families (CREATE to creativity)" },
  { id: "functional", label: "Functional language & register", name: "Functional", short: "FL", title: "Diplomat", hint: "polite requests, disagreeing, suggesting, formal and informal choices" },
  { id: "reading", label: "Reading", name: "Reading", short: "RD", title: "Sharp Reader", hint: "detail, opinion, tone, inference, vocabulary in context" },
  { id: "writing", label: "Rewriting & error correction", name: "Rewriting", short: "WR", title: "Editor's Eye", hint: "key-word transformations, word order, finding and fixing errors" },
  { id: "listening", label: "Listening", name: "Listening", short: "LS", title: "Sharp Ears", hint: "short talks and announcements: gist, detail, attitude" },
];
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const LEVELS = ["B1", "B2", "C1"];
export const AVATAR_COLORS = ["#4a64c8", "#b8446f", "#2f8f7b", "#b88a2e", "#8059a8", "#c9603f", "#2f86b5", "#6c8f2f"];
export const GLYPH_COUNT = 7; // 0 = initial letter, 1..6 = icons (see ui.js)

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function norm(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”"]/g, "")
    .replace(/[,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "")
    .trim();
}

export const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
export const makeSid = (code, nick) => slug(code) + "_" + slug(nick);
export const nameColor = (s) => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;

export async function hashPin(code, nick, pin) {
  const data = new TextEncoder().encode(`${slug(code)}|${slug(nick)}|${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------ scoring */

export function isCorrect(q, given) {
  if (given === undefined || given === null || given === "") return false;
  if (q.type === "mcq") return Number(given) === q.answer;
  const accepted = (Array.isArray(q.answer) ? q.answer : [q.answer]).map(norm);
  return accepted.includes(norm(given));
}

export function scoreQuiz(quiz, answers) {
  const bySkill = {};
  const detail = {};
  let total = 0;
  let max = 0;
  for (const q of quiz.questions) {
    const pts = q.points ?? 1;
    const ok = isCorrect(q, answers[q.id]);
    const s = (bySkill[q.skill] ??= { got: 0, max: 0 });
    s.max += pts;
    max += pts;
    if (ok) {
      s.got += pts;
      total += pts;
    }
    detail[q.id] = ok;
  }
  return { total, max, bySkill, detail };
}

/* --------------------------------------------------- plain-text format */

const KEY = /^(title|date|q|passage|script|audio|accent|answer|why|points)\s*:\s*(.*)$/i;
const OPT = /^(\*?)\s*([a-h])\)\s*(.*)$/i;

function resolveSkill(raw) {
  const n = norm(raw);
  const hit = SKILLS.find((s) => [s.id, s.label, s.name, s.short].some((x) => norm(x) === n));
  return hit ? hit.id : null;
}

export function parseQuizText(text) {
  const errors = [];
  const quiz = { title: "", date: "", questions: [] };
  const ctx = { passage: "", script: "", audio: "", accent: "" };
  let skill = null;
  let q = null;
  let cur = null;

  const flush = () => {
    if (!q) return;
    const label = q.prompt.slice(0, 40);
    const out = { skill: q.skill, type: q.options.length ? "mcq" : "text", prompt: q.prompt.trim() };
    if (q.options.length) {
      out.options = q.options;
      out.answer = q.answerIdx;
      if (q.answerIdx < 0) errors.push(`Question "${label}": put * before the correct option, like *b) text.`);
    } else {
      out.answer = !q.texts ? "" : q.texts.length === 1 ? q.texts[0] : q.texts;
      if (!out.answer) errors.push(`Question "${label}": add options (a) b) c)) or an Answer: line.`);
    }
    if (q.passage) out.passage = q.passage;
    if (q.script) out.script = q.script;
    if (q.audio) out.audio = q.audio;
    if (q.accent) out.accent = q.accent;
    if (q.explanation) out.explanation = q.explanation.trim();
    if (q.points) out.points = q.points;
    quiz.questions.push(out);
    q = null;
    cur = null;
  };

  text.split(/\r?\n/).forEach((raw, i) => {
    const n = i + 1;
    const line = raw.trim();
    if (line.startsWith("#")) return;
    if (!line) {
      if (cur && cur.obj === ctx) ctx[cur.key] += "\n";
      return;
    }
    const sec = line.match(/^\[(.+)\]$/);
    if (sec) {
      flush();
      skill = resolveSkill(sec[1]);
      if (!skill) errors.push(`Line ${n}: "${sec[1]}" is not a quiz area. Use one of: ${SKILLS.map((s) => s.id).join(", ")}.`);
      Object.assign(ctx, { passage: "", script: "", audio: "", accent: "" });
      cur = null;
      return;
    }
    const m = line.match(KEY);
    if (m) {
      const k = m[1].toLowerCase();
      const v = m[2].trim();
      if (k === "title" && !skill) { quiz.title = v; cur = null; return; }
      if (k === "date" && !skill) { quiz.date = v; cur = null; return; }
      if (k === "passage" || k === "script") { flush(); ctx[k] = v; cur = { obj: ctx, key: k }; return; }
      if (k === "audio") { ctx.audio = v; return; }
      if (k === "accent") { ctx.accent = v.toLowerCase(); return; }
      if (k === "q") {
        flush();
        if (!skill) errors.push(`Line ${n}: add an area line such as [grammar] before the first question.`);
        q = { skill, prompt: v, options: [], answerIdx: -1, texts: null, passage: ctx.passage.trim(), script: ctx.script.trim(), audio: ctx.audio, accent: ctx.accent };
        cur = { obj: q, key: "prompt" };
        return;
      }
      if (q && k === "answer") { q.texts = v.split("|").map((s) => s.trim()).filter(Boolean); cur = null; return; }
      if (q && k === "why") { q.explanation = v; cur = { obj: q, key: "explanation" }; return; }
      if (q && k === "points") { q.points = Number(v) || undefined; cur = null; return; }
      if (!q) { errors.push(`Line ${n}: "${m[1]}:" belongs after a Q: line.`); return; }
    }
    const o = line.match(OPT);
    if (o && q) {
      q.options.push(o[3].trim());
      if (o[1] === "*") {
        if (q.answerIdx >= 0) errors.push(`Line ${n}: only one option can have a *.`);
        q.answerIdx = q.options.length - 1;
      }
      cur = { opt: true };
      return;
    }
    if (cur && cur.opt) { q.options[q.options.length - 1] += " " + line; return; }
    if (cur) {
      const sep = cur.obj[cur.key] && !cur.obj[cur.key].endsWith("\n") ? " " : "";
      cur.obj[cur.key] += sep + line;
      return;
    }
    errors.push(`Line ${n}: I don't understand "${line.slice(0, 40)}".`);
  });
  flush();
  if (!quiz.title) errors.push('Start with a "Title: ..." line.');
  return { quiz, errors };
}

export function quizToText(quiz) {
  const L = [`Title: ${quiz.title}`];
  if (quiz.date) L.push(`Date: ${quiz.date}`);
  let sk = null, ps = null, sc = null, au = null, ac = null;
  for (const x of quiz.questions) {
    if (x.skill !== sk) { L.push("", `[${x.skill}]`); sk = x.skill; ps = sc = au = ac = null; }
    if ((x.passage || null) !== ps) { L.push(`Passage: ${x.passage || ""}`); ps = x.passage || null; }
    if ((x.script || null) !== sc) { L.push(`Script: ${x.script || ""}`); sc = x.script || null; }
    if ((x.audio || null) !== au) { L.push(`Audio: ${x.audio || ""}`); au = x.audio || null; }
    if ((x.accent || null) !== ac) { L.push(`Accent: ${x.accent || ""}`); ac = x.accent || null; }
    L.push(`Q: ${x.prompt}`);
    if (x.type === "mcq") x.options.forEach((o, i) => L.push(`${i === x.answer ? "*" : ""}${"abcdefgh"[i]}) ${o}`));
    else L.push(`Answer: ${[].concat(x.answer).join(" | ")}`);
    if (x.explanation) L.push(`Why: ${x.explanation}`);
    if (x.points && x.points !== 1) L.push(`Points: ${x.points}`);
    L.push("");
  }
  return L.join("\n").trim() + "\n";
}

/* ---------------------------------------------------------- validation */

export function validateQuiz(input) {
  let obj = input;
  if (typeof input === "string") {
    const t = input.trim();
    if (!t) return { errors: ["Paste or upload a quiz first."], quiz: null };
    if (t.startsWith("{")) {
      try {
        obj = JSON.parse(t);
      } catch (e) {
        return { errors: ["This looks like JSON but isn't valid: " + e.message], quiz: null };
      }
    } else {
      const parsed = parseQuizText(t);
      if (parsed.errors.length) return { errors: parsed.errors, quiz: null };
      obj = parsed.quiz;
    }
  }
  const errors = [];
  if (!obj || typeof obj !== "object") return { errors: ["The quiz must be an object."], quiz: null };
  if (!obj.title || typeof obj.title !== "string") errors.push('Add a "Title".');
  if (obj.date && !/^\d{4}-\d{2}-\d{2}$/.test(obj.date)) errors.push("Date must look like 2026-10-09.");
  if (!Array.isArray(obj.questions) || !obj.questions.length) {
    errors.push("Add at least one question.");
    return { errors, quiz: null };
  }
  const ids = new Set();
  const questions = obj.questions.map((q, i) => {
    const n = i + 1;
    const id = q.id ? String(q.id) : "q" + n;
    if (ids.has(id)) errors.push(`Question ${n}: the id "${id}" is used twice.`);
    ids.add(id);
    if (!SKILL[q.skill]) errors.push(`Question ${n}: area must be one of ${SKILLS.map((s) => s.id).join(", ")}.`);
    if (!q.prompt || typeof q.prompt !== "string") errors.push(`Question ${n}: add the question text.`);
    if (q.type !== "mcq" && q.type !== "text") errors.push(`Question ${n}: type must be "mcq" or "text".`);
    if (q.type === "mcq") {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8) errors.push(`Question ${n}: needs 2 to 8 options.`);
      else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) errors.push(`Question ${n}: mark the correct option.`);
    }
    if (q.type === "text") {
      const a = Array.isArray(q.answer) ? q.answer : [q.answer];
      if (!a.length || a.some((x) => typeof x !== "string" || !x.trim())) errors.push(`Question ${n}: add the accepted answer(s).`);
    }
    if (q.points !== undefined && !(q.points > 0)) errors.push(`Question ${n}: points must be above 0.`);
    return { ...q, id };
  });
  if (errors.length) return { errors, quiz: null };
  return { errors, quiz: { ...obj, questions } };
}

/* --------------------------------------------------------- leaderboard */

export function buildBoard(results) {
  const by = new Map();
  for (const r of results) {
    let e = by.get(r.sid);
    if (!e) {
      e = { sid: r.sid, nickname: r.nickname, color: r.color, glyph: r.glyph || 0, level: r.level || "", total: 0, max: 0, bySkill: {}, takenAt: r.takenAt, quizzes: 0, crowns: [] };
      by.set(r.sid, e);
    }
    e.total += r.total;
    e.max += r.max;
    e.quizzes += 1;
    e.takenAt = Math.min(e.takenAt, r.takenAt);
    for (const [k, v] of Object.entries(r.bySkill || {})) {
      const s = (e.bySkill[k] ??= { got: 0, max: 0 });
      s.got += v.got;
      s.max += v.max;
    }
  }
  const rows = [...by.values()];
  rows.sort((a, b) => b.total - a.total || b.total / b.max - a.total / a.max || a.takenAt - b.takenAt);
  let rank = 0;
  rows.forEach((r, i) => {
    if (i === 0 || r.total !== rows[i - 1].total) rank = i + 1;
    r.rank = rank;
  });

  for (const sk of SKILLS) {
    let best = 0;
    for (const r of rows) {
      const s = r.bySkill[sk.id];
      if (s && s.max >= 2) best = Math.max(best, s.got / s.max);
    }
    if (best < 0.75) continue;
    for (const r of rows) {
      const s = r.bySkill[sk.id];
      if (s && s.max >= 2 && Math.abs(s.got / s.max - best) < 1e-9) r.crowns.push(sk.id);
    }
  }

  for (const r of rows) {
    r.crowns = r.crowns.sort((a, b) => r.bySkill[b].max - r.bySkill[a].max).slice(0, 1);
    let top = null;
    let low = null;
    for (const sk of SKILLS) {
      const s = r.bySkill[sk.id];
      if (!s || s.max < 2) continue;
      const p = s.got / s.max;
      if (!top || p > top.p || (p === top.p && s.max > top.max)) top = { id: sk.id, p, max: s.max };
      if (p < 1 && (!low || p < low.p)) low = { id: sk.id, p };
    }
    r.title = top && top.p >= 0.7 ? SKILL[top.id].title : "On the rise";
    r.titleSkill = top && top.p >= 0.7 ? top.id : null;
    r.weakest = low ? low.id : null;
  }
  return rows;
}

export function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export const pct = (got, max) => (max ? Math.round((got / max) * 100) : 0);
