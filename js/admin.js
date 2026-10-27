import "./fx.js";
import { createStore } from "./store.js";
import { SKILLS, esc, validateQuiz, quizToText, fmtDate, slug, attemptOf, effectiveResults, hashPin, buildBoard } from "./logic.js";
import { sampleText } from "./sample.js";
import { brandHTML, timeAgo, avatar, skillVar } from "./ui.js";
import { idiomFor, quoteFor, today, IDIOMS, QUOTES } from "./content.js";
import { FORMATS, renderPoster, posterToBlob } from "./poster.js";

const $app = document.getElementById("app");

let store;
let user = null;
let subscribed = false;
let tab = "quizzes";
let quizzes = [];
let results = [];
let students = [];
let profiles = new Map();
let allComments = [];
let classCode = "";
let draft = null;
let editor = blankEditor();
let flash = null;

function blankEditor() {
  return { id: null, status: "draft", createdAt: undefined, text: "", errors: [], summary: "" };
}

const say = (text, kind = "ok") => {
  flash = { text, kind };
  render();
};

function header() {
  return `<header class="topbar">${brandHTML({ href: "admin.html", nav: false, sub: "teacher page" })}
    <a href="./" class="link-btn">Student view</a>${user && store.mode === "live" ? `<button class="link-btn" data-act="signout">Sign out</button>` : ""}</header>`;
}

const flashHTML = () => (flash ? `<div class="msg ${flash.kind}" role="status">${esc(flash.text)}</div>` : "");

function gate() {
  return `<div class="join card"><h2>Teacher sign-in</h2>
    <p class="sub">Sign in with the Google account you set as the teacher in your Firebase rules.</p>
    ${flashHTML()}<button class="btn" data-act="signin">Sign in with Google</button></div>`;
}

/* -------------------------------------------------------------- quizzes */

function helpHTML() {
  return `<details class="help"><summary>How to write a quiz</summary>
<p>Type or paste the quiz in plain text, or upload a .txt file. Start each area with its name in brackets. Put a <strong>*</strong> before the correct option.</p>
<pre>Title: Week 2: Travel and Culture
Date: 2026-10-16

[grammar]
Q: If I ___ the job offer last year, I would be living in Berlin now.
a) accepted
*b) had accepted
c) would accept
Why: A mixed conditional uses had + past participle, then would + infinitive.

[wordform]
Q: She showed great ___ in finding a solution. (CREATE)
Answer: creativity | creativeness

[reading]
Passage: The text students read goes here.
Q: What did the managers fear?
*a) A fall in productivity
b) Higher costs

[listening]
Accent: uk
Script: The words the device reads aloud go here.
Q: Why was the meeting moved?
*a) The director was delayed
b) The room was full</pre>
<ul>
<li><strong>Areas</strong> (use the word in brackets): ${SKILLS.map((s) => `<code>${s.id}</code> ${esc(s.label)}`).join("; ")}.</li>
<li><strong>Typed answers:</strong> list every acceptable answer after <code>Answer:</code>, separated by <code>|</code>. Capitals, extra spaces, commas and a final full stop are ignored. Apostrophes count, so add "doesn't" and "does not" as separate answers.</li>
<li><strong>Why:</strong> optional. It appears in the student's review, which helps them learn from mistakes.</li>
<li><strong>Passage / Script:</strong> shared by the questions that follow it, until the next area or the next Passage/Script line.</li>
<li><strong>Listening:</strong> the student's device reads the Script aloud (3 plays). Use <code>Audio: https://...mp3</code> instead if you have a recording online.</li>
<li><strong>Dialogues:</strong> don't start a line with <code>Q:</code>, <code>Answer:</code> or <code>Why:</code> inside a passage. Write "Anna - ..." instead.</li>
<li><strong>Points:</strong> add <code>Points: 2</code> under a question to weight it. The default is 1.</li>
<li>Lines starting with <code>#</code> are your own notes. Students never see them. JSON also works if you prefer it.</li>
</ul></details>`;
}

function quizzesPanel() {
  const list = [...quizzes].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
  const statusSel = (cur, attrs) => `<select class="compact" ${attrs}>${["draft", "open", "closed"].map((s) => `<option value="${s}" ${cur === s ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select>`;
  const rows = list.length
    ? list
        .map((q) => {
          const mine = results.filter((r) => r.quizId === q.id);
          const students = new Set(mine.map((r) => r.sid)).size;
          return `<div class="quiz-item"><div><h3>${esc(q.title)}</h3>
            <div class="sub">${q.questions.length} questions${q.date ? " &middot; " + esc(fmtDate(q.date)) : ""} &middot; ${students} ${students === 1 ? "student" : "students"}, ${mine.length} ${mine.length === 1 ? "attempt" : "attempts"}</div></div>
            <div class="actions"><span class="status ${esc(q.status)}">${esc(q.status)}</span>
              ${statusSel(q.status, `data-act="status" data-id="${esc(q.id)}" aria-label="Status of ${esc(q.title)}"`)}
              <button class="btn ghost small" data-act="edit" data-id="${esc(q.id)}">Edit</button>
              <button class="btn danger small" data-act="delete" data-id="${esc(q.id)}">Delete</button></div></div>`;
        })
        .join("")
    : `<p class="empty">No quizzes yet. Add your first one below.</p>`;

  return `<section class="card"><div class="card-head"><div><h2>Quizzes</h2>
      <p class="sub"><strong>Open</strong> quizzes can be taken. <strong>Closed</strong> quizzes can only be reviewed by students who took them. <strong>Draft</strong> stays hidden.</p></div></div>
      <div class="quiz-list">${rows}</div></section>
    <section class="card"><div class="card-head"><div><h2>${editor.id ? "Edit quiz" : "Add a quiz"}</h2>
      <p class="sub">Paste your quiz or upload a file. The check below tells you what to fix.</p></div>
      <div class="actions"><button class="btn ghost small" data-act="example">Load example</button>
        <button class="btn ghost small" data-act="pick-file">Upload file</button>
        <input type="file" id="quizFile" accept=".txt,.md,.json,text/plain,application/json" hidden></div></div>
      ${helpHTML()}
      ${editor.errors.length ? `<div class="msg err"><strong>Fix these first:</strong><ul>${editor.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}
      ${editor.summary ? `<div class="msg ok">${editor.summary}</div>` : ""}
      <label class="field"><span>Quiz</span><textarea id="quizText" rows="18" spellcheck="false" placeholder="Title: Week 2: Travel and Culture&#10;Date: 2026-10-16&#10;&#10;[grammar]&#10;Q: ...">${esc(editor.text)}</textarea></label>
      <div class="actions"><label class="field" style="margin:0"><span>Save as</span>${statusSel(editor.status, 'id="saveStatus"')}</label>
        <button class="btn ghost" data-act="check">Check quiz</button>
        <button class="btn" data-act="save-quiz">Save quiz</button>
        ${editor.id ? `<button class="link-btn" data-act="new">Start a new quiz instead</button>` : ""}</div></section>`;
}

function checkQuiz() {
  const { errors, quiz } = validateQuiz(editor.text);
  editor.errors = errors;
  if (!quiz) {
    editor.summary = "";
    return null;
  }
  const c = {};
  quiz.questions.forEach((q) => (c[q.skill] = (c[q.skill] || 0) + (q.points ?? 1)));
  const pts = Object.values(c).reduce((a, b) => a + b, 0);
  editor.summary = `Looks good: ${quiz.questions.length} questions, ${pts} points. ` + SKILLS.filter((s) => c[s.id]).map((s) => `${esc(s.name)} ${c[s.id]}`).join(" &middot; ");
  return quiz;
}

/* ------------------------------------------------------- announcements */

function announcePanel() {
  const n = draft.nextQuiz;
  return `<form id="announceForm"><section class="card"><div class="card-head"><div><h2>Next quiz announcement</h2>
      <p class="sub">Shown on the right of the student dashboard.</p></div></div>
      ${flashHTML()}
      <div class="two"><label class="field"><span>Title</span><input type="text" data-draft="nextQuiz.title" value="${esc(n.title)}"></label>
      <label class="field"><span>Date</span><input type="date" data-draft="nextQuiz.date" value="${esc(n.date)}"></label></div>
      <label class="field"><span>Note for students</span><textarea rows="3" data-draft="nextQuiz.note" style="font-family:inherit;font-size:14px">${esc(n.note)}</textarea></label>
    </section>
    <section class="card" style="margin-top:22px"><div class="card-head"><div><h2>Extra sections</h2>
      <p class="sub">Leave a section empty to show a quiet "More coming soon" placeholder.</p></div>
      <button type="button" class="btn ghost small" data-act="add-section">Add section</button></div>
      ${draft.sections
        .map(
          (s, i) => `<div class="${i ? "section-edit" : ""}"><label class="field"><span>Section ${i + 1} title</span><input type="text" data-draft="sections.${i}.title" value="${esc(s.title)}"></label>
          <label class="field"><span>Text</span><textarea rows="3" data-draft="sections.${i}.body" style="font-family:inherit;font-size:14px">${esc(s.body)}</textarea></label>
          <button type="button" class="btn danger small" data-act="remove-section" data-i="${i}">Remove section ${i + 1}</button></div>`
        )
        .join("")}
      <div style="margin-top:18px"><button class="btn" type="submit">Save changes</button></div></section></form>`;
}

/* -------------------------------------------------------- leaderboard */

/* The same live ranked board students see, plus a full-screen "Present" mode for projecting in class. */
const lbState = { mode: "week", quizId: null, level: "", newest: null };
let presenting = false;

const weekLabel = (w) => {
  const m = /^\s*week\s*(\d+)/i.exec(w.title || "");
  return m ? "Week " + m[1] : String(w.title || "Quiz").slice(0, 18);
};

function lbData() {
  const all = effectiveResults(results, (sid) => profiles.get(sid)).map((r) => {
    const p = profiles.get(r.sid);
    return { ...r, nickname: p?.name || r.nickname, color: p?.color ?? 0, glyph: p?.glyph || 0, level: p?.level || "" };
  });
  const m = new Map();
  quizzes.filter((q) => q.status !== "draft").forEach((q) => m.set(q.id, { id: q.id, title: q.title, date: q.date || "", status: q.status, t: q.createdAt || 0 }));
  all.forEach((r) => {
    if (!m.has(r.quizId)) m.set(r.quizId, { id: r.quizId, title: r.quizTitle, date: r.quizDate || "", status: "archived", t: r.takenAt || 0 });
  });
  const weeks = [...m.values()].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.t - a.t);
  const newest = (weeks.find((w) => w.status === "open") || weeks[0] || {}).id;
  if (newest && newest !== lbState.newest) {
    lbState.newest = newest;
    lbState.quizId = newest;
    lbState.mode = "week";
  } else if (!weeks.find((w) => w.id === lbState.quizId)) lbState.quizId = newest;
  const levels = ["B1", "B2", "C1"].filter((l) => all.some((r) => r.level === l));
  if (lbState.level && !levels.includes(lbState.level)) lbState.level = "";
  let subset = lbState.mode === "all" ? all : all.filter((r) => r.quizId === lbState.quizId);
  if (lbState.level) subset = subset.filter((r) => r.level === lbState.level);
  return { weeks, levels, rows: buildBoard(subset), current: weeks.find((w) => w.id === lbState.quizId) };
}

const cellsHTML = (bySkill) =>
  SKILLS.map((s) => {
    const v = bySkill[s.id];
    return `<span class="cell" style="--c:${skillVar(s.id)};--h:${v ? v.got / v.max : 0}" title="${esc(s.name)}: ${v ? v.got + "/" + v.max : "not in this quiz"}"><i class="${v ? "" : "none"}"></i><em>${s.short}</em></span>`;
  }).join("");

function lbHeader(d, present) {
  const tabs =
    d.weeks
      .map((w) => `<button class="wtab" data-act="lb-week" data-id="${esc(w.id)}" aria-pressed="${lbState.mode === "week" && w.id === lbState.quizId}" title="${esc(w.title)}">${esc(weekLabel(w))}${w.status === "open" ? '<i class="wdot" title="Open now"></i>' : ""}</button>`)
      .join("") + `<button class="wtab all" data-act="lb-all" aria-pressed="${lbState.mode === "all"}">All time</button>`;
  const line =
    lbState.mode === "all"
      ? "Points from every week added together."
      : d.current
      ? `${esc(d.current.title)}${d.current.date ? " &middot; " + esc(fmtDate(d.current.date)) : ""} &middot; ${d.rows.length} ${d.rows.length === 1 ? "player" : "players"}`
      : "";
  return `<div class="card-head"><div><h2>Leaderboard</h2><p class="sub"><span class="live">Live</span> &nbsp;The ranking students see. Each student counts once per week: their first attempt, unless they chose another.</p></div>
    <div class="lb-tools">${
      d.levels.length
        ? `<select class="compact" data-lblevel aria-label="Filter by level"><option value="">All levels</option>${d.levels.map((l) => `<option ${l === lbState.level ? "selected" : ""}>${l}</option>`).join("")}</select>`
        : ""
    }${present ? "" : '<button class="btn small" data-act="present">Present full screen</button>'}</div></div>
    <div class="week-tabs" role="group" aria-label="Choose a week">${tabs}</div><p class="wk-line">${line}</p>`;
}

function lbBoard(d) {
  if (!d.rows.length) return `<p class="empty">No scores here yet.</p>`;
  const legend = `<div class="legend" aria-hidden="true">${SKILLS.map((s) => `<span><i class="dot" style="--c:${skillVar(s.id)}"></i><b>${s.short}</b> ${esc(s.name)}</span>`).join("")}</div>`;
  const list = d.rows
    .map((r) => {
      const titleTag = `<span class="tag" style="--c:${r.titleSkill ? skillVar(r.titleSkill) : "var(--muted)"}">${esc(r.title)}</span>`;
      const crowns = r.crowns.map((id) => `<span class="tag crown" style="--c:${skillVar(id)}">&#9733; ${esc(SKILLS.find((s) => s.id === id).name)}</span>`).join("");
      return `<li class="row ${r.rank === 1 ? "top1" : ""}"><span class="rk">${String(r.rank).padStart(2, "0")}</span>
        <div class="who">${avatar(r.nickname, r.color, r.glyph, 36)}<div class="who-t"><div class="nm">${esc(r.nickname)}${r.level ? `<span class="lvl">${esc(r.level)}</span>` : ""}</div><div class="tg">${titleTag}${crowns}</div></div></div>
        <div class="mt">${cellsHTML(r.bySkill)}</div>
        <div class="sc"><b class="num">${r.total}</b><small>/ ${r.max}</small></div></li>`;
    })
    .join("");
  return `${legend}<ol class="board">${list}</ol>`;
}

function leaderboardPanel() {
  const d = lbData();
  return `<section class="card">${lbHeader(d, false)}${lbBoard(d)}</section>`;
}

function renderPresent() {
  const el = document.getElementById("present");
  if (!el) return;
  if (!presenting) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const d = lbData();
  el.hidden = false;
  el.innerHTML = `<div class="present-bar"><span class="label">Tr. Kelvin's ESL Hub &middot; Weekly Quiz League</span><button class="btn ghost small" data-act="present-close">Exit (Esc)</button></div>${lbHeader(d, true)}${lbBoard(d)}`;
}

function setPresent(on) {
  presenting = on;
  renderPresent();
  if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

document.addEventListener("keydown", (e) => e.key === "Escape" && presenting && setPresent(false));
document.addEventListener("fullscreenchange", () => !document.fullscreenElement && presenting && setPresent(false));

/* ------------------------------------------------- idioms, quotes, comments */

const shortDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

function dailyPanel() {
  const start = today();
  const days = Array.from({ length: 31 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return idiomFor(d);
  });
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    return quoteFor(d);
  });
  const label = (key) => {
    const [kind, date] = key.split(":");
    return (kind === "idiom" ? "Idiom, " : "Quote, week of ") + shortDate(date);
  };
  return `<section class="card"><div class="card-head"><div><h2>Comments</h2>
      <p class="sub">The latest comments from students. Remove anything that doesn't belong.</p></div></div>
      ${flashHTML()}
      ${
        allComments.length
          ? `<div class="table-wrap"><table><thead><tr><th>When</th><th>On</th><th>Student</th><th>Comment</th><th>Loves</th><th></th></tr></thead><tbody>
        ${allComments.map((c) => `<tr><td>${esc(timeAgo(c.createdAt))}</td><td>${esc(label(c.key))}</td><td>${esc(profiles.get(c.sid)?.name || c.name)}</td>
          <td style="white-space:normal;min-width:220px">${esc(c.text)}${c.editedAt ? ' <em class="sub">(edited)</em>' : ""}</td><td>${(c.loves || []).length || ""}</td><td><button class="btn danger small" data-act="del-comment" data-id="${esc(c.id)}">Delete</button></td></tr>`).join("")}
        </tbody></table></div>`
          : `<p class="empty">No comments yet.</p>`
      }</section>
    <section class="card"><div class="card-head"><div><h2>Idiom of the day: next 31 days</h2>
      <p class="sub">Changes by itself at midnight. ${IDIOMS.length} idioms in the list, then it starts again. To preview a day, add <code>?date=2026-11-20</code> to the student page address.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Date</th><th>Idiom</th><th>Simple meaning</th></tr></thead><tbody>
      ${days.map((d) => `<tr><td>${esc(shortDate(d.date))}</td><td><strong>${esc(d.item.text)}</strong></td><td style="white-space:normal;min-width:240px">${esc(d.item.meaning)}</td></tr>`).join("")}
      </tbody></table></div></section>
    <section class="card"><div class="card-head"><div><h2>Quote of the week: next 8 weeks</h2>
      <p class="sub">Changes every Monday. ${QUOTES.length} quotes in the list, then it starts again.</p></div></div>
      <div class="table-wrap"><table><thead><tr><th>Week of</th><th>Quote</th><th>Author</th></tr></thead><tbody>
      ${weeks.map((q) => `<tr><td>${esc(shortDate(q.date))}</td><td style="white-space:normal;min-width:260px">${esc(q.item.text)}</td><td>${esc(q.item.author)}</td></tr>`).join("")}
      </tbody></table></div></section>`;
}

/* --------------------------------------------------------------- class */

/* The link students use: the same page address with the class code filled in. */
function studentLink(includeCode = true) {
  const u = new URL("./", location.href);
  u.search = "";
  if (includeCode && slug(classCode)) u.searchParams.set("class", slug(classCode));
  return u.href;
}

/* ------------------------------------------------------------- poster */

let poster = null;
const isoOfDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOfIso = (iso) => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
};
const posterQuizList = () => [...quizzes].sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));

function quizTexts(q) {
  return { title: q.title, meta: `${q.questions.length} questions · Open now · Take it any time` };
}

function ensurePoster() {
  const list = posterQuizList();
  if (!list.length) return null;
  if (!poster || !quizzes.find((q) => q.id === poster.quizId)) {
    poster = {
      quizId: list[0].id,
      fmt: "portrait",
      date: isoOfDate(today()),
      badge: "NEW QUIZ",
      ...quizTexts(list[0]),
      perk: "Live leaderboard · Review your mistakes · New idiom every day",
      showIdiom: true,
      showQuote: true,
      showAreas: true,
      showLb: true,
      lbWeek: "auto",
      lbCount: "3",
      showNote: true,
      note: "Have you created your profile in our ESL Hub?",
      includeCode: true,
    };
  }
  return poster;
}

/* The leaderboard sneak peek: the best week with results (or all time), using each student's counted attempt. */
function leaderboardPeek() {
  const eff = effectiveResults(results, (sid) => profiles.get(sid)).map((r) => {
    const p = profiles.get(r.sid);
    return { ...r, nickname: p?.name || r.nickname, color: p?.color ?? 0, glyph: p?.glyph || 0, level: p?.level || "" };
  });
  const titles = Object.fromEntries(quizzes.map((q) => [q.id, q.title]));
  eff.forEach((r) => (titles[r.quizId] = titles[r.quizId] || r.quizTitle));
  let week = poster.lbWeek;
  if (week === "auto") {
    const byNewest = [...quizzes].sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
    week = (byNewest.find((q) => eff.some((r) => r.quizId === q.id)) || {}).id || "all";
  }
  const subset = week === "all" ? eff : eff.filter((r) => r.quizId === week);
  const rows = buildBoard(subset)
    .slice(0, Number(poster.lbCount) || 3)
    .map((r) => ({ rank: r.rank, name: r.nickname, title: r.title, total: r.total, max: r.max, color: r.color, glyph: r.glyph, level: r.level }));
  return { label: week === "all" ? "All time" : titles[week] || "", rows };
}

function posterData() {
  const q = quizzes.find((x) => x.id === poster.quizId);
  const dt = dateOfIso(poster.date);
  const counts = {};
  (q?.questions || []).forEach((x) => (counts[x.skill] = (counts[x.skill] || 0) + 1));
  const link = studentLink(poster.includeCode);
  return {
    fmt: poster.fmt,
    badge: poster.badge,
    title: poster.title,
    meta: poster.meta,
    perk: poster.perk,
    chips: poster.showAreas ? SKILLS.filter((s) => counts[s.id]).map((s) => ({ id: s.id, name: s.name })) : null,
    idiom: poster.showIdiom ? idiomFor(dt).item : null,
    quote: poster.showQuote ? quoteFor(dt).item : null,
    lb: poster.showLb ? leaderboardPeek() : null,
    note: poster.showNote && poster.note.trim() ? poster.note.trim() : null,
    link,
    linkText: link.replace(/^https?:\/\//, "").replace(/\?.*$/, "").replace(/\/$/, ""),
  };
}

function posterPanel() {
  const p = ensurePoster();
  if (!p) return `<section class="card"><h2>Poster</h2><p class="empty">Upload a quiz first. The poster fills itself from it.</p></section>`;
  const opts = (arr, cur) => arr.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`).join("");
  const f = FORMATS[p.fmt];
  return `<div class="poster-grid">
    <section class="card poster-controls"><h2>Weekly poster</h2>
      <p class="sub" style="margin-bottom:14px">Fills itself from the quiz, the week's quote, the day's idiom and your student link. Change anything you like, then download.</p>
      ${flashHTML()}
      <label class="field"><span>Quiz</span><select data-poster="quizId">${opts(posterQuizList().map((q) => [q.id, q.title + (q.status === "open" ? "" : " (" + q.status + ")")]), p.quizId)}</select></label>
      <label class="field"><span>Poster date</span><input type="date" data-poster="date" value="${esc(p.date)}"><small>Picks that day's idiom and that week's quote.</small></label>
      <label class="field"><span>Size</span><select data-poster="fmt">${opts(Object.entries(FORMATS).map(([k, v]) => [k, v.label]), p.fmt)}</select></label>
      <label class="field"><span>Label</span><input type="text" data-poster="badge" value="${esc(p.badge)}" maxlength="24"></label>
      <label class="field"><span>Title</span><input type="text" data-poster="title" value="${esc(p.title)}" maxlength="80"></label>
      <label class="field"><span>Line under the title</span><input type="text" data-poster="meta" value="${esc(p.meta)}" maxlength="90"></label>
      <label class="field"><span>Line at the bottom</span><input type="text" data-poster="perk" value="${esc(p.perk)}" maxlength="90"></label>
      <label class="field"><span>Sticky note (a question for your students)</span><textarea data-poster="note" rows="2" maxlength="90" style="font-family:inherit;font-size:14px">${esc(p.note)}</textarea></label>
      <label class="check"><input type="checkbox" data-poster="showNote" ${p.showNote ? "checked" : ""}>Show the sticky note</label>
      <label class="check"><input type="checkbox" data-poster="showLb" ${p.showLb ? "checked" : ""}>Show the leaderboard sneak peek</label>
      ${
        p.showLb
          ? `<div class="two" style="margin:0 0 6px"><label class="field"><span>Leaderboard of</span><select data-poster="lbWeek">${opts([["auto", "Latest week with results"], ["all", "All time"], ...posterQuizList().map((q) => [q.id, q.title])], p.lbWeek)}</select></label>
          <label class="field"><span>Rows</span><select data-poster="lbCount">${opts([["3", "Top 3"], ["5", "Top 5 (needs story or A4)"]], p.lbCount)}</select></label></div>
          <p class="sub" style="margin:0 0 10px">It shows students' names and scores. Turn it off for public posts if you prefer.</p>`
          : ""
      }
      <label class="check"><input type="checkbox" data-poster="showAreas" ${p.showAreas ? "checked" : ""}>Show the areas in the quiz</label>
      <label class="check"><input type="checkbox" data-poster="showIdiom" ${p.showIdiom ? "checked" : ""}>Show the idiom of the day</label>
      <label class="check"><input type="checkbox" data-poster="showQuote" ${p.showQuote ? "checked" : ""}>Show the quote of the week</label>
      <label class="check"><input type="checkbox" data-poster="includeCode" ${p.includeCode ? "checked" : ""}>Put my class code in the QR code</label>
      <p class="sub" style="margin:2px 0 14px">Anyone who scans a code with your class code in it can join your class. If you post publicly, untick this and tell students the code separately.</p>
      <div class="actions"><button class="btn" data-act="poster-download">Download PNG</button><button class="link-btn" data-act="poster-reset" style="color:var(--muted)">Reset the wording</button></div>
      <div class="msg err" id="posterWarn" hidden style="margin-top:14px">The text is too long for this size. Shorten the title or untick a section.</div>
    </section>
    <section class="card"><div class="card-head"><div><h2>Preview</h2><p class="sub" id="posterSize">${f.w} &times; ${f.h} pixels</p></div></div>
      <div class="poster-box" id="posterBox"><div class="poster-holder" id="posterHolder"></div></div></section></div>`;
}

function drawPoster() {
  const box = document.getElementById("posterBox");
  const holder = document.getElementById("posterHolder");
  if (!box || !holder || !poster) return;
  const f = FORMATS[poster.fmt];
  const width = box.clientWidth || (box.parentElement && box.parentElement.clientWidth) || 520;
  const k = Math.min(1, width / f.w);
  box.dataset.w = String(box.clientWidth);
  box.style.height = Math.round(f.h * k) + "px";
  holder.style.width = f.w + "px";
  holder.style.height = f.h + "px";
  holder.style.transform = `scale(${k})`;
  const tooLong = renderPoster(holder, posterData());
  document.getElementById("posterWarn").hidden = !tooLong;
  document.getElementById("posterSize").innerHTML = `${f.w} &times; ${f.h} pixels`;
}

async function downloadPoster() {
  if (!window.html2canvas) return say("The download tool didn't load. Check your internet and reload the page.", "err");
  const blob = await posterToBlob(posterData());
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `quiz-poster-${slug(poster.title) || "week"}-${poster.fmt}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function onPosterField(el) {
  const key = el.dataset.poster;
  if (key === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(el.value)) return;
  poster[key] = el.type === "checkbox" ? el.checked : el.value;
  if (key === "quizId") {
    const q = quizzes.find((x) => x.id === el.value);
    if (q) Object.assign(poster, quizTexts(q));
    render();
    return;
  }
  if (key === "fmt") poster.showAreas = el.value !== "square";
  if (key === "fmt" || key === "showLb") {
    render();
    return;
  }
  drawPoster();
}

function drawQR() {
  const el = document.getElementById("qr");
  if (!el || !window.QRCode || !slug(classCode)) return;
  el.innerHTML = "";
  new window.QRCode(el, { text: studentLink(), width: 168, height: 168, correctLevel: window.QRCode.CorrectLevel.M });
}

function classPanel() {
  const quizTitle = Object.fromEntries(quizzes.map((q) => [q.id, q.title]));
  const rows = [...results].sort((a, b) => b.takenAt - a.takenAt);
  const counted = new Set(effectiveResults(results, (sid) => profiles.get(sid)).map((r) => r.id));
  const people = [...students].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const nameOf = (sid, fb) => profiles.get(sid)?.name || fb;
  return `<section class="card"><div class="card-head"><div><h2>Class code</h2>
      <p class="sub">Students type this to create a profile. ${students.length} ${students.length === 1 ? "student has" : "students have"} joined.</p></div></div>
      ${flashHTML()}
      <form id="codeForm" class="actions"><input type="text" id="codeInput" value="${esc(classCode)}" style="max-width:240px" aria-label="Class code" placeholder="e.g. evening-b2-2026">
        <button class="btn" type="submit">Save code</button></form>
      <p class="sub" style="margin-top:10px">Saved as "${esc(slug(classCode) || "not set")}". Capitals and spaces don't matter.</p>
      ${
        slug(classCode)
          ? `<div class="share"><h3>Student link</h3>
        <p class="sub">Share this link or the QR code. The class code is filled in for students, so they only type their name and a PIN.</p>
        <div class="actions"><input type="text" readonly id="linkBox" value="${esc(studentLink())}" style="max-width:520px" aria-label="Student link" onclick="this.select()">
          <button class="btn small" data-act="copy-link">Copy link</button></div>
        <div id="qr" class="qr" aria-label="QR code for the student link"></div></div>`
          : ""
      }</section>
    <section class="card"><div class="card-head"><div><h2>Students</h2>
      <p class="sub">Press <strong>Set PIN</strong> to type a new PIN for a student who forgot theirs. PINs are stored scrambled, so the current one can't be shown. <strong>Remove</strong> deletes their sign-in only, and their results stay.</p></div></div>
      ${people.length ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Sign-in id</th><th>Level</th><th>Joined</th><th></th></tr></thead><tbody>
      ${people.map((s) => `<tr><td>${esc(nameOf(s.sid, s.nickname))}</td><td>${esc(s.nickname)}</td><td>${esc(profiles.get(s.sid)?.level || "")}</td>
        <td>${s.createdAt ? esc(new Date(s.createdAt).toLocaleDateString("en-GB")) : ""}</td>
        <td><div class="actions" style="flex-wrap:nowrap"><button class="btn ghost small" data-act="set-pin" data-sid="${esc(s.sid)}">Set PIN</button>
          <button class="btn danger small" data-act="remove-student" data-sid="${esc(s.sid)}">Remove</button></div></td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">Nobody has joined yet.</p>`}</section>
    <section class="card"><div class="card-head"><div><h2>Results</h2>
      <p class="sub">Every attempt is listed. <strong>On board</strong> marks the attempt that counts on the leaderboard: the first try, unless the student chose another. Delete an attempt to remove it.</p></div>
      <button class="btn ghost small" data-act="csv" ${rows.length ? "" : "disabled"}>Download CSV</button></div>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Quiz</th><th>Attempt</th><th>On board</th><th>Score</th>${SKILLS.map((s) => `<th title="${esc(s.label)}">${s.short}</th>`).join("")}<th></th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(nameOf(r.sid, r.nickname))}</td><td>${esc(quizTitle[r.quizId] || r.quizTitle)}</td><td>${attemptOf(r)}</td><td>${counted.has(r.id) ? "&#10003;" : ""}</td><td>${r.total}/${r.max}</td>
        ${SKILLS.map((s) => `<td>${r.bySkill[s.id] ? r.bySkill[s.id].got + "/" + r.bySkill[s.id].max : "&ndash;"}</td>`).join("")}
        <td><button class="btn danger small" data-act="del-result" data-id="${esc(r.id)}">Delete</button></td></tr>`).join("")}
      </tbody></table></div>` : `<p class="empty">No results yet.</p>`}</section>`;
}

/* --------------------------------------------------------------- shell */

function render() {
  if (!user) {
    $app.innerHTML = header() + gate();
    return;
  }
  const tabs = [["quizzes", "Quizzes"], ["leaderboard", "Leaderboard"], ["announce", "Announcements"], ["poster", "Poster"], ["daily", "Idioms & quotes"], ["class", "Class"]];
  const panel =
    tab === "quizzes"
      ? quizzesPanel()
      : tab === "leaderboard"
      ? leaderboardPanel()
      : tab === "announce"
      ? draft ? announcePanel() : "<p>Loading…</p>"
      : tab === "poster"
      ? posterPanel()
      : tab === "daily"
      ? dailyPanel()
      : classPanel();
  $app.innerHTML =
    header() +
    `<nav class="admin-nav tabs" role="tablist">${tabs.map(([id, l]) => `<button class="tab" role="tab" data-act="tab" data-tab="${id}" aria-selected="${tab === id}">${l}</button>`).join("")}</nav>` +
    `<div class="stack">${tab === "quizzes" ? flashHTML() : ""}${panel}</div>`;
  if (tab === "class") drawQR();
  if (presenting) renderPresent();
  if (tab === "poster") {
    drawPoster();
    const box = document.getElementById("posterBox");
    if (box && window.ResizeObserver) new ResizeObserver(() => box.isConnected && String(box.clientWidth) !== box.dataset.w && drawPoster()).observe(box);
  }
}

window.addEventListener("resize", () => tab === "poster" && drawPoster());

function csv() {
  const head = ["Student", "Username", "Quiz", "Date", "Attempt", "On leaderboard", "Total", "Max", ...SKILLS.map((s) => s.label)];
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const counted = new Set(effectiveResults(results, (sid) => profiles.get(sid)).map((r) => r.id));
  const lines = results.map((r) =>
    [profiles.get(r.sid)?.name || r.nickname, r.nickname, r.quizTitle, r.quizDate, attemptOf(r), counted.has(r.id) ? "yes" : "no", r.total, r.max, ...SKILLS.map((s) => (r.bySkill[s.id] ? `${r.bySkill[s.id].got}/${r.bySkill[s.id].max}` : ""))].map(q).join(",")
  );
  const blob = new Blob(["﻿" + [head.map(q).join(","), ...lines].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "esl-hub-results.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  let o = obj;
  keys.slice(0, -1).forEach((k) => (o = o[k]));
  o[keys.at(-1)] = value;
}

const guard = (fn) => async (...a) => {
  try {
    await fn(...a);
  } catch (e) {
    console.error(e);
    say(e.code === "permission-denied" ? "This Google account isn't allowed to change the hub. Check the teacher email in your Firebase rules." : "That didn't save. Check your internet and try again.", "err");
  }
};

document.addEventListener("click", guard(async (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "SELECT") return;
  const act = el.dataset.act;
  if (act === "signin") await store.signIn();
  else if (act === "signout") await store.signOut();
  else if (act === "tab") {
    tab = el.dataset.tab;
    flash = null;
    render();
  } else if (act === "example") {
    editor = { ...blankEditor(), text: sampleText() };
    render();
  } else if (act === "pick-file") {
    document.getElementById("quizFile").click();
  } else if (act === "new") {
    editor = blankEditor();
    render();
  } else if (act === "edit") {
    const q = quizzes.find((x) => x.id === el.dataset.id);
    const { id, status, createdAt, ...rest } = q;
    editor = { id, status, createdAt, text: quizToText(rest), errors: [], summary: "" };
    flash = null;
    render();
    document.getElementById("quizText")?.scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (act === "check") {
    editor.text = document.getElementById("quizText").value;
    checkQuiz();
    render();
  } else if (act === "save-quiz") {
    editor.text = document.getElementById("quizText").value;
    editor.status = document.getElementById("saveStatus").value;
    const quiz = checkQuiz();
    if (!quiz) return render();
    await store.saveQuiz({ ...quiz, id: editor.id || undefined, status: editor.status, createdAt: editor.createdAt });
    editor = blankEditor();
    say("Quiz saved.");
  } else if (act === "delete") {
    if (confirm("Delete this quiz? Student results stay on the leaderboard, but students can no longer review it.")) {
      await store.deleteQuiz(el.dataset.id);
      say("Quiz deleted.");
    }
  } else if (act === "add-section") {
    draft.sections.push({ id: "s" + Date.now().toString(36), title: "", body: "" });
    render();
  } else if (act === "remove-section") {
    draft.sections.splice(Number(el.dataset.i), 1);
    render();
  } else if (act === "csv") csv();
  else if (act === "lb-week") {
    lbState.mode = "week";
    lbState.quizId = el.dataset.id;
    render();
  } else if (act === "lb-all") {
    lbState.mode = "all";
    render();
  } else if (act === "present") {
    setPresent(true);
  } else if (act === "present-close") {
    setPresent(false);
  } else if (act === "poster-download") {
    await downloadPoster();
  } else if (act === "poster-reset") {
    const q = quizzes.find((x) => x.id === poster.quizId);
    if (q) Object.assign(poster, quizTexts(q), { badge: "NEW QUIZ", perk: "Live leaderboard · Review your mistakes · New idiom every day", note: "Have you created your profile in our ESL Hub?" });
    render();
  } else if (act === "copy-link") {
    const link = studentLink();
    try {
      await navigator.clipboard.writeText(link);
      say("Link copied. Paste it into your class chat.");
    } catch {
      document.getElementById("linkBox")?.select();
      say("Select the link above and press Ctrl+C to copy it.", "err");
    }
  } else if (act === "set-pin") {
    const s = students.find((x) => x.sid === el.dataset.sid);
    if (!s) return;
    const name = profiles.get(s.sid)?.name || s.nickname;
    const pin = prompt(`New 4-digit PIN for ${name}:`);
    if (pin === null) return;
    if (!/^\d{4}$/.test(pin.trim())) return say("The PIN must be exactly 4 numbers.", "err");
    await store.setStudentPin(s.sid, await hashPin(s.classCode, s.nickname, pin.trim()));
    say(`Done. ${name} can now sign in with the name they joined with and the PIN ${pin.trim()}.`);
  } else if (act === "remove-student") {
    if (confirm("Remove this student's sign-in? Their results stay, but they will need to join again. To only change their PIN, use Set PIN instead.")) {
      await store.removeStudent(el.dataset.sid);
      say("Sign-in removed.");
    }
  } else if (act === "del-comment") {
    if (confirm("Delete this comment?")) {
      await store.deleteComment(el.dataset.id);
      say("Comment deleted.");
    }
  } else if (act === "del-result") {
    if (confirm("Delete this attempt? This can't be undone.")) {
      await store.deleteResult(el.dataset.id);
      say("Attempt deleted.");
    }
  }
}));

document.addEventListener("change", guard(async (e) => {
  if (e.target.matches("[data-lblevel]")) {
    lbState.level = e.target.value;
    render();
  }
  if (e.target.dataset.poster && poster && (e.target.type === "checkbox" || e.target.tagName === "SELECT" || e.target.type === "date")) onPosterField(e.target);
  if (e.target.dataset.act === "status") {
    await store.setQuizStatus(e.target.dataset.id, e.target.value);
    say("Status updated.");
  }
  if (e.target.id === "quizFile" && e.target.files[0]) {
    const text = await e.target.files[0].text();
    editor = { ...blankEditor(), text };
    checkQuiz();
    render();
  }
}));

document.addEventListener("input", (e) => {
  if (e.target.dataset.poster && poster && e.target.type !== "checkbox" && e.target.tagName !== "SELECT") onPosterField(e.target);
  if (e.target.id === "quizText") editor.text = e.target.value;
  if (e.target.dataset.draft) setPath(draft, e.target.dataset.draft, e.target.value);
});

document.addEventListener("submit", guard(async (e) => {
  e.preventDefault();
  if (e.target.id === "announceForm") {
    await store.saveSettings(draft);
    say("Saved. Students see the change straight away.");
  }
  if (e.target.id === "codeForm") {
    classCode = slug(document.getElementById("codeInput").value);
    if (!classCode) return say("Type a class code first.", "err");
    await store.setClassCode(classCode);
    say("Class code saved. Tell your students.");
  }
}));

function start() {
  if (subscribed) return;
  subscribed = true;
  const typing = () => $app.contains(document.activeElement) && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  store.onQuizzes((q) => {
    quizzes = q;
    if (!typing()) render();
  }, { all: true });
  store.onResults((r) => {
    results = r;
    if ((tab !== "announce" || presenting) && !typing()) render();
  });
  store.onStudents((s) => {
    students = s;
    if (tab === "class" && !typing()) render();
  });
  store.onRecentComments((l) => {
    allComments = l.sort((a, b) => b.createdAt - a.createdAt);
    if (tab === "daily" && !typing()) render();
  });
  store.onProfiles((l) => {
    profiles = new Map(l.map((p) => [p.sid || p.id, p]));
    if ((tab === "class" || tab === "leaderboard" || presenting) && !typing()) render();
  });
  store.onSettings((s) => {
    if (!draft) {
      draft = {
        nextQuiz: { title: "", date: "", note: "", ...(s?.nextQuiz || {}) },
        sections: (s?.sections || []).map((x) => ({ id: x.id, title: x.title || "", body: x.body || "" })),
      };
      if (tab === "announce") render();
    }
  });
  store.getClassCode().then((c) => {
    classCode = c || "";
    if (tab === "class" || tab === "poster") render();
  });
}

(async function boot() {
  try {
    store = await createStore({ admin: true });
    await store.init();
  } catch (err) {
    console.error(err);
    $app.innerHTML = header() + `<div class="card"><h2>We can't connect right now</h2><p class="sub">Check your internet and refresh the page.</p></div>`;
    return;
  }
  if (store.mode === "demo")
    document.getElementById("demo").innerHTML = `<div class="demo-bar"><span><strong>Demo mode.</strong> Changes stay in this browser. Add your Firebase config to go live.</span></div>`;
  store.onAuth((u) => {
    user = u;
    if (u) start();
    render();
  });
  render();
})();
