import { createStore } from "./store.js";
import { SKILLS, esc, validateQuiz, quizToText, fmtDate, slug, attemptOf, effectiveResults } from "./logic.js";
import { sampleText } from "./sample.js";
import { brandHTML, timeAgo } from "./ui.js";
import { idiomFor, quoteFor, today, IDIOMS, QUOTES } from "./content.js";

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
      <p class="sub" style="margin-top:10px">Saved as "${esc(slug(classCode) || "not set")}". Capitals and spaces don't matter.</p></section>
    <section class="card"><div class="card-head"><div><h2>Students</h2>
      <p class="sub">If a student forgets their PIN, press <strong>Reset PIN</strong>. They sign up again with the same username and keep all their results.</p></div></div>
      ${people.length ? `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Level</th><th>Joined</th><th></th></tr></thead><tbody>
      ${people.map((s) => `<tr><td>${esc(nameOf(s.sid, s.nickname))}</td><td>${esc(s.nickname)}</td><td>${esc(profiles.get(s.sid)?.level || "")}</td>
        <td>${s.createdAt ? esc(new Date(s.createdAt).toLocaleDateString("en-GB")) : ""}</td>
        <td><button class="btn danger small" data-act="reset-pin" data-sid="${esc(s.sid)}">Reset PIN</button></td></tr>`).join("")}
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
  const tabs = [["quizzes", "Quizzes"], ["announce", "Announcements"], ["daily", "Idioms & quotes"], ["class", "Class"]];
  const panel = tab === "quizzes" ? quizzesPanel() : tab === "announce" ? (draft ? announcePanel() : "<p>Loading…</p>") : tab === "daily" ? dailyPanel() : classPanel();
  $app.innerHTML =
    header() +
    `<nav class="admin-nav tabs" role="tablist">${tabs.map(([id, l]) => `<button class="tab" role="tab" data-act="tab" data-tab="${id}" aria-selected="${tab === id}">${l}</button>`).join("")}</nav>` +
    `<div class="stack">${tab === "quizzes" ? flashHTML() : ""}${panel}</div>`;
}

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
  else if (act === "reset-pin") {
    if (confirm("Reset this student's PIN? They sign up again with the same username and keep their results.")) {
      await store.removeStudent(el.dataset.sid);
      say("PIN reset. Ask the student to sign up again with the same username.");
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
    if (tab !== "announce" && !typing()) render();
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
    if (tab === "class" && !typing()) render();
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
    if (tab === "class") render();
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
