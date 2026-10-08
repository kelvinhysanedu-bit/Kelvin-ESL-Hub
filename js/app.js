import { createStore } from "./store.js";
import { padletEmbedUrl } from "./config.js";
import { SKILLS, SKILL, LEVELS, AVATAR_COLORS, GLYPH_COUNT, esc, makeSid, hashPin, scoreQuiz, buildBoard, fmtDate, pct, slug, nameColor, attemptOf, effectiveResults, pickedAttempt } from "./logic.js";
import { avatar, glyphIcon, skillVar, countUp, captureRects, playFlip, brandHTML, timeAgo, RM } from "./ui.js";
import { idiomFor, quoteFor, today, isPreviewDate, msToNextDay, formatCountdown } from "./content.js";

const $app = document.getElementById("app");
const $modal = document.getElementById("modal");
const ME_KEY = "eslhub.me";
const SEEN_KEY = "eslhub.seen";
const MAX_PLAYS = 3;
const MAX_COMMENT = 500;

let store;
let settings = { nextQuiz: null, sections: [] };
let quizzes = [];
let results = [];
let profiles = new Map();
let me = loadMe();
let view = "home";
let joinTab = "new";
let activeQuiz = null;
let shown = null;
let lbMode = "week";
let lbQuizId = null;
let lbLevel = "";
let warned = false;
let reviewAll = false;
let profileMsg = null;
let pickMsg = null;
let listenItems = [];
let plays = new Map();
let enterTimer;
const lastScores = new Map();
let daily = computeDaily();
let comments = {};
let commentUnsubs = [];
let modalKind = null;
let ready = false;

function computeDaily() {
  const d = today();
  return { idiom: idiomFor(d), quote: quoteFor(d) };
}
function seenKeys() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function markSeen(key) {
  const s = seenKeys();
  s.add(key);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-60)));
  } catch {}
}

function loadMe() {
  try {
    return JSON.parse(localStorage.getItem(ME_KEY));
  } catch {
    return null;
  }
}
function saveMe(s) {
  try {
    s ? localStorage.setItem(ME_KEY, JSON.stringify(s)) : localStorage.removeItem(ME_KEY);
  } catch {}
}

/* ------------------------------------------------------------ helpers */

const nl2br = (s) => esc(s).replace(/\n/g, "<br>");
const prof = (sid, fallback) => profiles.get(sid) || { sid, name: fallback || "Student", color: nameColor(fallback || sid), glyph: 0, level: "" };
/* The leaderboard counts one attempt per student per quiz: their first, unless they picked another in their profile. */
const decorated = () =>
  effectiveResults(results, (sid) => profiles.get(sid)).map((r) => {
    const p = prof(r.sid, r.nickname);
    return { ...r, nickname: p.name, color: p.color, glyph: p.glyph, level: p.level };
  });
const myAttempts = (quizId) => results.filter((r) => r.quizId === quizId && r.sid === me?.sid).sort((a, b) => attemptOf(a) - attemptOf(b));
const quizById = (id) => quizzes.find((q) => q.id === id);
const cells = (bySkill) =>
  SKILLS.map((s) => {
    const v = bySkill[s.id];
    return `<span class="cell" style="--c:${skillVar(s.id)};--h:${v ? v.got / v.max : 0}" title="${esc(s.name)}: ${v ? v.got + "/" + v.max : "not in this quiz"}"><i class="${v ? "" : "none"}"></i><em>${s.short}</em></span>`;
  }).join("");
const summary = (bySkill) =>
  SKILLS.filter((s) => bySkill[s.id]).map((s) => `${s.name} ${bySkill[s.id].got} of ${bySkill[s.id].max}`).join(", ");

function topbar() {
  const p = me ? prof(me.sid, me.nickname) : null;
  const here = view === "profile" || (view === "result" && shown?.from === "profile") ? "profile" : "home";
  return `<header class="topbar">
    ${brandHTML()}
    ${
      me
        ? `<nav class="nav" aria-label="Main">
            <button data-act="nav" data-v="home" ${here === "home" ? 'aria-current="page"' : ""}>Dashboard</button>
            <button data-act="nav" data-v="profile" ${here === "profile" ? 'aria-current="page"' : ""}>Profile</button></nav>
           <button class="me" data-act="nav" data-v="profile" aria-label="Your profile">${avatar(p.name, p.color, p.glyph, 34)}
             <span><span class="name">${esc(p.name)}</span><br><span class="lvl-line">${p.level ? "Level " + esc(p.level) : "Level not set"}</span></span></button>`
        : ""
    }
  </header>`;
}

/* ---------------------------------------------------------------- join */

function joinView() {
  const isNew = joinTab === "new";
  return `<div class="join card rise" style="--i:0">
    <h2>${isNew ? "Create your profile" : "Welcome back"}</h2>
    <p class="sub">No email needed. Use your first name or a nickname.</p>
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-act="tab" data-tab="new" aria-selected="${isNew}">I'm new</button>
      <button class="tab" role="tab" data-act="tab" data-tab="back" aria-selected="${!isNew}">I've played before</button>
    </div>
    <div class="msg err" id="joinMsg" hidden></div>
    <form id="joinForm" autocomplete="off">
      <label class="field"><span>Class code</span><input type="text" name="code" required autocapitalize="off" spellcheck="false"><small>Your teacher will give you this.</small></label>
      <label class="field"><span>Username</span><input type="text" name="user" required maxlength="16" autocapitalize="off" spellcheck="false">
        <small>${isNew ? "2 to 16 letters or numbers, no spaces. You use it to sign back in." : "The username you chose when you joined."}</small></label>
      <label class="field"><span>${isNew ? "Choose a 4-digit PIN" : "Your 4-digit PIN"}</span>
        <input type="password" name="pin" required inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="off"></label>
      ${
        isNew
          ? `<label class="field"><span>Name on the leaderboard</span><input type="text" name="name" maxlength="24" spellcheck="false"><small>Optional. You can change it any time in your profile.</small></label>
             <label class="field"><span>Your level</span><select name="level"><option value="">Not sure yet</option>${LEVELS.map((l) => `<option>${l}</option>`).join("")}</select></label>`
          : ""
      }
      <button class="btn" type="submit">${isNew ? "Join the league" : "Sign in"}</button>
    </form>
  </div>`;
}

async function onJoin(form) {
  const f = new FormData(form);
  const code = String(f.get("code")).trim();
  const user = String(f.get("user")).trim();
  const pin = String(f.get("pin")).trim();
  const msg = document.getElementById("joinMsg");
  const say = (t) => {
    msg.hidden = false;
    msg.textContent = t;
  };
  if (!slug(code)) return say("Type the class code from your teacher.");
  if (!/^[\p{L}\p{N}_-]{2,16}$/u.test(user) || slug(user).length < 2) return say("Your username needs 2 to 16 letters or numbers, with no spaces.");
  if (!/^\d{4}$/.test(pin)) return say("Your PIN must be exactly 4 numbers.");

  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const sid = makeSid(code, user);
    const pinHash = await hashPin(code, user, pin);
    if (joinTab === "new") {
      const name = String(f.get("name") || "").trim().replace(/\s+/g, " ") || user;
      if (!/^[\p{L}\p{N} '._-]{2,24}$/u.test(name)) return say("Your leaderboard name needs 2 to 24 letters or numbers.");
      const profile = { sid, name, color: nameColor(name), glyph: 0, level: String(f.get("level") || ""), updatedAt: Date.now() };
      await store.createStudent({ sid, nickname: user, classCode: slug(code), pinHash, createdAt: Date.now() }, profile);
      profiles.set(sid, profile);
    } else {
      const s = await store.findStudent(sid);
      if (!s || s.pinHash !== pinHash) return say("We can't find that username with that PIN. Check the class code, username and PIN.");
      if (!(await store.getProfile(sid))) {
        const profile = { sid, name: user, color: nameColor(user), glyph: 0, level: "", updatedAt: Date.now() };
        await store.saveProfile(profile);
        profiles.set(sid, profile);
      }
    }
    me = { sid, nickname: user };
    saveMe(me);
    go("home");
  } catch (e) {
    if (e.code === "exists") say("That username is taken. Pick another, or choose \"I've played before\" if it's yours.");
    else if (e.code === "bad-class-code") say("That class code isn't right. Ask your teacher.");
    else say("Something went wrong. Check your internet and try again.");
  } finally {
    btn.disabled = false;
  }
}

/* ---------------------------------------------------------------- home */

function skillCounts(quiz) {
  const c = {};
  quiz.questions.forEach((q) => (c[q.skill] = (c[q.skill] || 0) + 1));
  return SKILLS.filter((s) => c[s.id]).map((s) => ({ ...s, n: c[s.id] }));
}

function heroCard(quiz, i) {
  const attempts = myAttempts(quiz.id);
  const last = attempts[attempts.length - 1];
  const done = new Set(results.filter((r) => r.quizId === quiz.id).map((r) => r.sid)).size;
  return `<article class="card hero rise" style="--i:${i}">
    <div class="label">This week's quiz</div>
    <h2>${esc(quiz.title)}</h2>
    <div class="hero-meta"><span>${quiz.questions.length} questions</span>${quiz.date ? `<span>${esc(fmtDate(quiz.date))}</span>` : ""}<span>Take it any time</span></div>
    <div class="chips">${skillCounts(quiz).map((s) => `<span class="chip"><i style="--c:${skillVar(s.id)}"></i>${esc(s.name)} &middot; ${s.n}</span>`).join("")}</div>
    <div class="hero-foot">
      ${
        last
          ? `<button class="btn" data-act="start" data-id="${esc(quiz.id)}">Take it again</button>
             <button class="btn ghost" data-act="result" data-id="${esc(quiz.id)}">See my latest result (${last.total}/${last.max})</button>`
          : `<button class="btn" data-act="start" data-id="${esc(quiz.id)}">Start the quiz</button>`
      }
      <span class="count">${done} ${done === 1 ? "player has" : "players have"} finished${attempts.length ? ` &middot; you've taken it ${attempts.length} ${attempts.length === 1 ? "time" : "times"}` : ""}</span>
    </div>
  </article>`;
}

function weeksList(all) {
  const m = new Map();
  all.forEach((r) => {
    if (!m.has(r.quizId)) m.set(r.quizId, { id: r.quizId, title: r.quizTitle, date: r.quizDate || "", t: r.takenAt });
  });
  return [...m.values()].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.t - a.t);
}

function leaderboardCard(idx) {
  const all = decorated();
  const weeks = weeksList(all);
  if (!weeks.find((w) => w.id === lbQuizId)) lbQuizId = (quizzes.find((q) => q.status === "open" && weeks.some((w) => w.id === q.id)) || weeks[0] || {}).id;
  const levels = LEVELS.filter((l) => all.some((r) => r.level === l));
  if (lbLevel && !levels.includes(lbLevel)) lbLevel = "";
  let subset = lbMode === "all" ? all : all.filter((r) => r.quizId === lbQuizId);
  if (lbLevel) subset = subset.filter((r) => r.level === lbLevel);
  const rows = buildBoard(subset);

  const head = `<div class="card-head">
    <div><h2>Leaderboard</h2><p class="sub"><span class="live">Live</span> &nbsp;Ranked by points. Tags show each player's strongest area.</p></div>
    <div class="lb-tools">
      <div class="toggle" role="group" aria-label="Leaderboard range">
        <button data-act="lb" data-mode="week" aria-pressed="${lbMode === "week"}">This week</button>
        <button data-act="lb" data-mode="all" aria-pressed="${lbMode === "all"}">All time</button>
      </div>
      ${lbMode === "week" && weeks.length > 1 ? `<select class="compact" id="weekSelect" aria-label="Choose week">${weeks.map((w) => `<option value="${esc(w.id)}" ${w.id === lbQuizId ? "selected" : ""}>${esc(w.title)}</option>`).join("")}</select>` : ""}
      ${levels.length ? `<select class="compact" id="levelSelect" aria-label="Filter by level"><option value="">All levels</option>${levels.map((l) => `<option ${l === lbLevel ? "selected" : ""}>${l}</option>`).join("")}</select>` : ""}
    </div></div>`;

  if (!rows.length) return `<section class="card rise" style="--i:${idx}">${head}<p class="empty">Nobody has finished a quiz yet. Be the first on the board!</p></section>`;

  const legend = `<div class="legend" aria-hidden="true">${SKILLS.map((s) => `<span><i class="dot" style="--c:${skillVar(s.id)}"></i><b>${s.short}</b> ${esc(s.name)}</span>`).join("")}</div>`;
  const list = rows
    .map((r, i) => {
      const titleTag = `<span class="tag" style="--c:${r.titleSkill ? skillVar(r.titleSkill) : "var(--muted)"}">${esc(r.title)}</span>`;
      const crowns = r.crowns.map((id) => `<span class="tag crown" style="--c:${skillVar(id)}" title="Top score in ${esc(SKILL[id].name)}">&#9733; ${esc(SKILL[id].name)}</span>`).join("");
      const you = r.sid === me?.sid;
      return `<li class="row ${r.rank === 1 ? "top1" : ""} ${you ? "you" : ""}" data-k="${esc(r.sid)}" style="--i:${i}">
        <span class="rk">${String(r.rank).padStart(2, "0")}</span>
        <div class="who">${avatar(r.nickname, r.color, r.glyph, 36)}<div class="who-t">
          <div class="nm">${esc(r.nickname)}${r.level ? `<span class="lvl">${esc(r.level)}</span>` : ""}${you ? '<span class="you-tag">YOU</span>' : ""}</div>
          <div class="tg">${titleTag}${crowns}</div></div></div>
        <div class="mt" role="img" aria-label="${esc(summary(r.bySkill))}">${cells(r.bySkill)}</div>
        <div class="sc"><b class="num" data-v="${r.total}" data-sk="${esc([lbMode, lbQuizId, lbLevel, r.sid].join("|"))}">${r.total}</b><small>/ ${r.max}</small></div>
      </li>`;
    })
    .join("");
  return `<section class="card rise" style="--i:${idx}">${head}${legend}<ol class="board">${list}</ol></section>`;
}

function railCards() {
  const n = settings.nextQuiz;
  const next =
    n && (n.title || n.date || n.note)
      ? `<article class="card rail-card rise" style="--i:2"><div class="label">Next quiz</div>${n.date ? `<div class="big-date">${esc(fmtDate(n.date))}</div>` : ""}
        <h3>${esc(n.title || "")}</h3>${n.note ? `<p>${nl2br(n.note)}</p>` : ""}</article>`
      : `<article class="card rail-card rise" style="--i:2"><div class="label">Next quiz</div><h3>To be announced</h3><p>Your teacher will post the date here.</p></article>`;
  const secs = settings.sections && settings.sections.length ? settings.sections : [{}, {}];
  return (
    next +
    dailyCard("idiom", 3) +
    dailyCard("quote", 4) +
    secs
      .map((s, i) =>
        s.title || s.body
          ? `<article class="card rail-card rise" style="--i:${5 + i}"><h3>${esc(s.title || "")}</h3><p>${nl2br(s.body || "")}</p></article>`
          : `<article class="card rail-card blank rise" style="--i:${5 + i}"><p>More coming soon.</p></article>`
      )
      .join("")
  );
}

function homeView() {
  const open = quizzes.filter((q) => q.status === "open").sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
  const hero = open.length
    ? open.map((q, i) => heroCard(q, i)).join("")
    : `<article class="card hero rise" style="--i:0"><div class="label">This week's quiz</div><h2>No quiz is open right now</h2><p class="sub">Check the next quiz date on the right. You can review your past quizzes in your profile.</p></article>`;
  const idx = open.length || 1;
  return `<div class="dash"><div class="stack">${hero}${leaderboardCard(idx)}${padletCard(idx + 1)}</div><aside class="stack">${railCards()}</aside></div>`;
}

function padletCard(i) {
  if (!padletEmbedUrl) return "";
  return `<section class="card rise" style="--i:${i}">
    <div class="card-head"><div><h2>Class Padlet</h2><p class="sub">Share ideas, questions and examples with the class.</p></div></div>
    <div class="padlet-embed"><iframe src="${esc(padletEmbedUrl)}" title="Class Padlet" loading="lazy" frameborder="0"></iframe></div>
  </section>`;
}

/* ------------------------------------------- idiom of the day, quote of the week */

const changeText = (kind) => (isPreviewDate() ? "Preview" : kind === "idiom" ? `Changes in ${formatCountdown(msToNextDay())}` : "New one on Monday");
const quoteMark = (s) => `&ldquo;${esc(s)}&rdquo;`;

function dailyCard(kind, i) {
  const d = daily[kind];
  const it = d.item;
  const count = (comments[d.key] || []).length;
  const isNew = !seenKeys().has(d.key);
  return `<button class="daily rise ${kind}" style="--i:${i}" data-act="open" data-kind="${kind}" aria-haspopup="dialog">
    <span class="label">${kind === "idiom" ? "Idiom of the day" : "Quote of the week"}${isNew ? '<span class="new">New</span>' : ""}</span>
    <span class="big">${kind === "idiom" ? esc(it.text) : quoteMark(it.text)}</span>
    ${kind === "quote" ? `<span class="by-line">&mdash; ${esc(it.author)}</span>` : ""}
    <span class="meaning">${esc(it.meaning)}</span>
    ${kind === "idiom" ? `<span class="ex-line">${quoteMark(it.example)}</span>` : ""}
    <span class="foot"><span class="cta-text">Tap to read and share</span>
      <span class="meta"><span data-countdown="${kind}">${changeText(kind)}</span> &middot; ${count} ${count === 1 ? "comment" : "comments"}</span></span>
  </button>`;
}

function modalHTML(kind) {
  const d = daily[kind];
  const it = d.item;
  const idiom = kind === "idiom";
  return `<div class="md">
    <div class="md-head"><div class="label">${idiom ? "Idiom of the day" : "Quote of the week"} &middot; ${idiom ? esc(fmtDate(d.date)) : "week of " + esc(fmtDate(d.date))}</div>
      <button class="x" data-act="close-modal" aria-label="Close">&times;</button></div>
    <h2 id="mdTitle" class="md-title">${idiom ? esc(it.text) : quoteMark(it.text)}</h2>
    ${idiom ? "" : `<p class="md-by">&mdash; ${esc(it.author)}</p>`}
    <div class="md-grid">
      <section><div class="label">In simple words</div><p>${esc(it.meaning)}</p></section>
      <section><div class="label">Example</div><p class="ex">${esc(it.example)}</p></section>
    </div>
    <form id="commentForm" class="md-form" autocomplete="off">
      <h3>${idiom ? "Make it yours" : "Share what it means to you"}</h3>
      <p class="sub">${esc(it.prompt)}</p>
      <textarea name="text" rows="3" maxlength="${MAX_COMMENT}" aria-label="Your comment" placeholder="${idiom ? "Write your own sentence, or tell us about a time this idiom fits." : "Tell us what this quote makes you think about."}"></textarea>
      <div class="md-foot"><span class="count num" id="cmCount">0 / ${MAX_COMMENT}</span><span class="msg" id="cmMsg" role="status" hidden></span><button class="btn" type="submit">Post comment</button></div>
    </form>
    <div class="md-list"><div class="label" id="cmHead"></div><div id="cmList"></div></div>
  </div>`;
}

function renderComments() {
  if (!modalKind || !$modal.open) return;
  const list = [...(comments[daily[modalKind].key] || [])].sort((a, b) => b.createdAt - a.createdAt);
  document.getElementById("cmHead").textContent = list.length ? `${list.length} ${list.length === 1 ? "comment" : "comments"}` : "";
  document.getElementById("cmList").innerHTML = list.length
    ? list
        .map((c) => {
          const p = prof(c.sid, c.name);
          return `<article class="cm">${avatar(p.name, p.color, p.glyph, 32)}<div><div class="cm-h"><strong>${esc(p.name)}</strong>${c.sid === me?.sid ? '<span class="you-tag">YOU</span>' : ""}<span class="when">${esc(timeAgo(c.createdAt))}</span></div>
            <p>${nl2br(c.text)}</p></div></article>`;
        })
        .join("")
    : `<p class="empty">Nobody has shared yet. Be the first!</p>`;
}

function openModal(kind) {
  modalKind = kind;
  markSeen(daily[kind].key);
  document.querySelector(`.daily.${kind} .new`)?.remove();
  $modal.innerHTML = modalHTML(kind);
  if (!$modal.open) $modal.showModal();
  renderComments();
}

async function onComment(form) {
  const text = String(new FormData(form).get("text")).trim();
  const msg = document.getElementById("cmMsg");
  const say = (t, kind) => {
    msg.hidden = false;
    msg.className = "msg " + kind;
    msg.textContent = t;
  };
  if (!text) return say("Write a few words first.", "err");
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const p = prof(me.sid, me.nickname);
    await store.addComment({ kind: modalKind, key: daily[modalKind].key, sid: me.sid, name: p.name, text, createdAt: Date.now() });
    form.elements.text.value = "";
    document.getElementById("cmCount").textContent = `0 / ${MAX_COMMENT}`;
    say("Thanks for sharing!", "ok");
  } catch {
    say("We couldn't post that. Check your internet and try again.", "err");
  } finally {
    btn.disabled = false;
  }
}

function subscribeDaily() {
  commentUnsubs.forEach((u) => u && u());
  commentUnsubs = [];
  daily = computeDaily();
  return Promise.all(
    ["idiom", "quote"].map(
      (kind) =>
        new Promise((res) => {
          const key = daily[kind].key;
          commentUnsubs.push(
            store.onComments(key, (list) => {
              comments[key] = list;
              res();
              if (ready) {
                rerender();
                renderComments();
              }
            })
          );
        })
    )
  );
}

function checkNewDay() {
  const next = computeDaily();
  if (next.idiom.key !== daily.idiom.key || next.quote.key !== daily.quote.key) {
    if ($modal.open) $modal.close();
    subscribeDaily();
    rerender();
  }
  document.querySelectorAll("[data-countdown]").forEach((el) => (el.textContent = changeText(el.dataset.countdown)));
}

/* ---------------------------------------------------------------- quiz */

function quizView() {
  const quiz = activeQuiz;
  listenItems = [];
  plays = new Map();
  let n = 0;
  const sections = SKILLS.filter((s) => quiz.questions.some((q) => q.skill === s.id))
    .map((s) => {
      let lastKey = null;
      const items = quiz.questions
        .filter((q) => q.skill === s.id)
        .map((q) => {
          n += 1;
          let pre = "";
          const key = (q.passage || "") + "|" + (q.script || "") + "|" + (q.audio || "");
          if (key !== lastKey) {
            if (q.passage) pre += `<div class="passage" style="--c:${skillVar(s.id)}">${nl2br(q.passage)}</div>`;
            if (q.audio) pre += `<div class="listen" style="--c:${skillVar(s.id)}"><audio controls preload="none" src="${esc(q.audio)}"></audio></div>`;
            else if (q.script) {
              const id = listenItems.push({ script: q.script, accent: q.accent }) - 1;
              pre += `<div class="listen" style="--c:${skillVar(s.id)}"><button type="button" class="btn small" data-act="play" data-id="${id}">Play the recording (${MAX_PLAYS} plays)</button>
                <span class="sub">You can listen ${MAX_PLAYS} times. Use headphones if you can.</span></div>`;
            }
            lastKey = key;
          }
          const input =
            q.type === "mcq"
              ? `<div class="opts" role="radiogroup">${q.options.map((o, i) => `<label class="opt"><input type="radio" name="q_${esc(q.id)}" value="${i}"><span>${esc(o)}</span></label>`).join("")}</div>`
              : `<input type="text" name="q_${esc(q.id)}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Your answer">`;
          return `${pre}<div class="q"><p class="q-prompt"><em>${n}</em>${esc(q.prompt)}</p>${input}</div>`;
        })
        .join("");
      return `<section class="q-section card"><div class="label"><i class="dot" style="--c:${skillVar(s.id)}"></i>${esc(s.label)}</div>${items}</section>`;
    })
    .join("");
  return `<form id="quizForm" novalidate>
    <div class="quiz-top"><strong>${esc(quiz.title)}</strong><div class="bar"><i id="barFill"></i></div><span class="count" id="barCount">0 of ${quiz.questions.length}</span></div>
    <div class="stack">${sections}
      <div class="submit-row"><button class="btn" type="submit">Finish and see my score</button>
        <button class="link-btn" type="button" data-act="home">Leave the quiz</button><span class="msg" id="submitMsg" hidden></span></div>
    </div></form>`;
}

function play(id, btn) {
  const item = listenItems[id];
  if (!item || !("speechSynthesis" in window)) {
    btn.textContent = "Audio isn't available on this device";
    btn.disabled = true;
    return;
  }
  const used = plays.get(id) || 0;
  if (used >= MAX_PLAYS) return;
  plays.set(id, used + 1);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(item.script);
  u.lang = item.accent === "us" ? "en-US" : "en-GB";
  u.rate = 0.95;
  const v = speechSynthesis.getVoices().find((x) => x.lang.replace("_", "-") === u.lang);
  if (v) u.voice = v;
  speechSynthesis.speak(u);
  const left = MAX_PLAYS - used - 1;
  btn.textContent = left ? `Play again (${left} left)` : "No plays left";
  btn.disabled = left === 0;
}

function readAnswers(form) {
  const a = {};
  activeQuiz.questions.forEach((q) => {
    const name = `q_${q.id}`;
    if (q.type === "mcq") {
      const el = form.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
      if (el) a[q.id] = Number(el.value);
    } else {
      const v = form.elements[name]?.value.trim();
      if (v) a[q.id] = v;
    }
  });
  return a;
}

function updateProgress(form) {
  const done = Object.keys(readAnswers(form)).length;
  const total = activeQuiz.questions.length;
  document.getElementById("barFill").style.width = (done / total) * 100 + "%";
  document.getElementById("barCount").textContent = `${done} of ${total}`;
  warned = false;
  document.getElementById("submitMsg").hidden = true;
}

async function onSubmitQuiz(form) {
  const answers = readAnswers(form);
  const empty = activeQuiz.questions.length - Object.keys(answers).length;
  const msg = document.getElementById("submitMsg");
  if (empty > 0 && !warned) {
    warned = true;
    msg.hidden = false;
    msg.className = "msg";
    msg.textContent = `${empty} ${empty === 1 ? "question is" : "questions are"} empty. Press the button again to finish anyway.`;
    return;
  }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const sc = scoreQuiz(activeQuiz, answers);
  const prior = myAttempts(activeQuiz.id);
  let attempt = prior.length ? Math.max(...prior.map(attemptOf)) + 1 : 1;
  const base = {
    quizId: activeQuiz.id,
    quizTitle: activeQuiz.title,
    quizDate: activeQuiz.date || "",
    sid: me.sid,
    nickname: me.nickname,
    total: sc.total,
    max: sc.max,
    bySkill: sc.bySkill,
    answers,
    takenAt: Date.now(),
  };
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  let result = null;
  try {
    // If another device just saved the same attempt number, try the next one.
    for (let tries = 0; tries < 5 && !result; tries++) {
      try {
        await store.submitResult({ ...base, attempt });
        result = { ...base, attempt };
      } catch (e) {
        if (e.code !== "already") throw e;
        attempt += 1;
      }
    }
    if (!result) throw { code: "busy" };
  } catch (e) {
    console.error("Saving the score failed:", e);
    btn.disabled = false;
    msg.hidden = false;
    msg.className = "msg err";
    msg.textContent =
      e.code === "denied"
        ? "The server refused your score. Ask your teacher to check that this quiz is set to Open and that the Firebase rules are published."
        : `We couldn't save your score (${e.code || e.message || "unknown error"}). Check your internet and press the button again.`;
    return;
  }
  shown = { quiz: activeQuiz, result, from: "home" };
  lbMode = "week";
  lbQuizId = activeQuiz.id;
  reviewAll = false;
  try {
    go("result");
  } catch (e) {
    console.error("Showing the result failed:", e);
    $app.innerHTML = topbar() + `<div class="card"><h2>Your score was saved</h2><p class="sub">Refresh the page to see your result.</p></div>`;
  }
}

/* ----------------------------------------------------- result + review */

const showAnswer = (q, v) => (q.type === "mcq" ? q.options[v] : Array.isArray(v) ? v.join("  /  ") : v);

function reviewItem(q, n, ok, given) {
  const blank = given === undefined || given === "";
  const text = q.passage
    ? `<details><summary>Show the reading text</summary><p>${nl2br(q.passage)}</p></details>`
    : q.script
    ? `<details><summary>Show the transcript</summary><p>${nl2br(q.script)}</p></details>`
    : "";
  return `<div class="review-item ${ok ? "right" : blank ? "blank-ans" : ""}">
    <div class="ri-status">${ok ? "Correct" : blank ? "No answer" : "Not quite"} &middot; question ${n}</div>
    <p class="ri-q">${esc(q.prompt)}</p>
    <div class="ri-a">Your answer: <b>${esc(blank ? "(no answer)" : showAnswer(q, given))}</b></div>
    ${ok ? "" : `<div class="ri-a">Correct answer: <b class="good">${esc(showAnswer(q, q.answer))}</b></div>`}
    ${q.explanation ? `<div class="ri-why"><strong>Why:</strong> ${esc(q.explanation)}</div>` : ""}${text}</div>`;
}

function reviewCard(quiz, result) {
  const answers = result.answers || {};
  const sc = scoreQuiz(quiz, answers);
  let n = 0;
  const groups = SKILLS.filter((s) => quiz.questions.some((q) => q.skill === s.id)).map((s) => {
    const qs = quiz.questions.filter((q) => q.skill === s.id).map((q) => ({ q, n: ++n }));
    const wrong = qs.filter((x) => !sc.detail[x.q.id]).length;
    return { s, qs, wrong };
  });
  const totalWrong = groups.reduce((a, g) => a + g.wrong, 0);
  const chips = groups
    .filter((g) => g.wrong)
    .map((g) => `<span class="tag" style="--c:${skillVar(g.s.id)}">${esc(g.s.name)}: ${g.wrong} to review</span>`)
    .join("");
  const body = groups
    .map((g) => {
      const items = g.qs.filter((x) => reviewAll || !sc.detail[x.q.id]);
      if (!items.length) return "";
      return `<div class="rv-group"><div class="label"><i class="dot" style="--c:${skillVar(g.s.id)}"></i>${esc(g.s.label)}</div>${items.map((x) => reviewItem(x.q, x.n, sc.detail[x.q.id], answers[x.q.id])).join("")}</div>`;
    })
    .join("");
  return `<section class="card rise" style="--i:1">
    <div class="review-head"><div><h2>Review your answers</h2>
      <p class="sub">${totalWrong ? `${totalWrong} ${totalWrong === 1 ? "question" : "questions"} to learn from.` : "No mistakes. Excellent work!"}</p></div>
      <div class="toggle" role="group" aria-label="Which questions to show">
        <button data-act="rv" data-all="0" aria-pressed="${!reviewAll}">Mistakes only</button>
        <button data-act="rv" data-all="1" aria-pressed="${reviewAll}">All questions</button></div></div>
    ${chips ? `<div class="mistake-chips">${chips}</div>` : ""}${body || '<p class="empty">Nothing to show here.</p>'}</section>`;
}

function resultView() {
  const { quiz, result, from } = shown;
  const attempt = attemptOf(result);
  const picked = pickedAttempt(profiles.get(me.sid), quiz.id);
  const isCounted = attempt === picked;
  const countedRes = results.find((r) => r.quizId === quiz.id && r.sid === me.sid && attemptOf(r) === picked);
  const rows = buildBoard(decorated().filter((r) => r.quizId === quiz.id));
  const mine = isCounted ? rows.find((r) => r.sid === me.sid) : buildBoard([result])[0];
  const bars = SKILLS.filter((s) => result.bySkill[s.id])
    .map((s) => {
      const v = result.bySkill[s.id];
      return `<div class="sb" style="--c:${skillVar(s.id)}"><span>${esc(s.label)}</span><div class="track"><i style="width:${pct(v.got, v.max)}%"></i></div><span>${v.got}/${v.max}</span></div>`;
    })
    .join("");
  return `<div class="stack"><section class="card rise" style="--i:0">
    <div class="label">${esc(quiz.title)}${attempt > 1 ? ` &middot; attempt ${attempt}` : ""}</div>
    <div class="result-top">
      <div class="big-score"><span class="num" data-v="${result.total}" data-sk="big|${esc(quiz.id)}|${attempt}">${result.total}</span><small> / ${result.max}</small></div>
      <div>${
        isCounted
          ? mine ? `<h2>You are #${mine.rank} on this quiz</h2><p class="sub">Your tag: <strong>${esc(mine.title)}</strong>${mine.crowns.length ? " &middot; Best at " + mine.crowns.map((c) => SKILL[c].name).join(", ") : ""}</p>` : ""
          : `<h2>Attempt ${attempt}</h2>${countedRes ? `<p class="sub">On the leaderboard: your attempt ${picked} (${countedRes.total} points).</p>` : ""}`
      }
      ${mine && mine.weakest ? `<p class="sub">Practise next: <strong>${esc(SKILL[mine.weakest].label)}</strong></p>` : ""}</div>
    </div>
    <div class="skill-bars">${bars}</div>
    <button class="btn" data-act="nav" data-v="${from === "profile" ? "profile" : "home"}">${from === "profile" ? "Back to my profile" : "Back to the leaderboard"}</button>
  </section>${reviewCard(quiz, result)}</div>`;
}

/* ------------------------------------------------------------- profile */

function pickerHTML(p) {
  const colors = AVATAR_COLORS.map(
    (c, i) => `<label class="pick"><input type="radio" name="color" value="${i}" ${Number(p.color) === i ? "checked" : ""} aria-label="Colour ${i + 1}">${avatar(p.name, i, 0, 38)}</label>`
  ).join("");
  const glyphs = Array.from({ length: GLYPH_COUNT }, (_, g) => `<label class="pick"><input type="radio" name="glyph" value="${g}" ${Number(p.glyph) === g ? "checked" : ""} aria-label="${g ? "Icon " + g : "Your initial"}"><span class="glyph-btn">${glyphIcon(g, 20)}</span></label>`).join("");
  return `<div class="field"><span>Colour</span><div class="picker">${colors}</div></div><div class="field"><span>Picture</span><div class="picker">${glyphs}</div></div>`;
}

function previewHTML(name, color, glyph, level) {
  return `${avatar(name, color, glyph, 56)}<div><div class="nm">${esc(name || "Your name")}</div><div class="sub">${level ? "Level " + esc(level) : "Level not set"}</div></div>`;
}

function profileView() {
  const p = prof(me.sid, me.nickname);
  const allMine = results.filter((r) => r.sid === me.sid);
  const row = buildBoard(decorated().filter((r) => r.sid === me.sid))[0];
  const avg = row ? pct(row.total, row.max) : 0;
  const bars = row
    ? SKILLS.filter((s) => row.bySkill[s.id])
        .map((s) => {
          const v = row.bySkill[s.id];
          return `<div class="sb" style="--c:${skillVar(s.id)}"><span>${esc(s.label)}</span><div class="track"><i style="width:${pct(v.got, v.max)}%"></i></div><span>${pct(v.got, v.max)}%</span></div>`;
        })
        .join("")
    : "";
  const groups = new Map();
  allMine.forEach((r) => {
    if (!groups.has(r.quizId)) groups.set(r.quizId, []);
    groups.get(r.quizId).push(r);
  });
  const hist = [...groups.entries()]
    .map(([quizId, list]) => {
      list.sort((a, b) => attemptOf(a) - attemptOf(b));
      return { quizId, list, latest: Math.max(...list.map((r) => r.takenAt)) };
    })
    .sort((a, b) => b.latest - a.latest)
    .map(({ quizId, list }) => {
      const q = quizById(quizId);
      const multi = list.length >= 2;
      const want = pickedAttempt(p, quizId);
      const onAttempt = attemptOf(list.find((r) => attemptOf(r) === want) || list[0]);
      const first = list[0];
      const rowsHTML = list
        .map((r) => {
          const a = attemptOf(r);
          const on = a === onAttempt;
          return `<div class="att ${multi && on ? "on" : ""}">
            <div class="att-main"><strong>Attempt ${a}</strong><span class="when">${esc(timeAgo(r.takenAt))}</span></div>
            <div class="att-score"><b class="num">${r.total}</b><small> / ${r.max}</small></div>
            <div class="mt" role="img" aria-label="${esc(summary(r.bySkill))}">${cells(r.bySkill)}</div>
            <div class="att-actions"><button class="btn ghost small" data-act="review" data-id="${esc(quizId)}" data-attempt="${a}" ${q ? "" : "disabled"}>${q ? "Review" : "Not available"}</button>
              ${multi ? (on ? '<span class="pill">On the leaderboard</span>' : `<button class="btn small" data-act="pick" data-id="${esc(quizId)}" data-attempt="${a}">Use this score</button>`) : ""}</div></div>`;
        })
        .join("");
      return `<div class="hist-item"><h3>${esc(first.quizTitle)}</h3>
        <div class="sub">${first.quizDate ? esc(fmtDate(first.quizDate)) + " &middot; " : ""}taken ${list.length} ${list.length === 1 ? "time" : "times"}</div>
        <div class="attempts">${rowsHTML}</div>
        ${multi ? '<p class="sub att-note">The leaderboard shows your first try unless you choose a different attempt. You can change your choice at any time.</p>' : ""}</div>`;
    })
    .join("");
  return `<div class="profile-grid">
    <section class="card rise" style="--i:0"><h2>Your profile</h2>
      <p class="sub">Sign-in username: <strong>${esc(me.nickname)}</strong> (this stays the same).</p>
      ${profileMsg ? `<div class="msg ${profileMsg.kind}" role="status" style="margin-top:14px">${esc(profileMsg.text)}</div>` : ""}
      <form id="profileForm" autocomplete="off" style="margin-top:16px">
        <div class="preview" id="pvw">${previewHTML(p.name, p.color, p.glyph, p.level)}</div>
        <label class="field"><span>Name on the leaderboard</span><input type="text" name="name" value="${esc(p.name)}" maxlength="24" required></label>
        <label class="field"><span>Level</span><select name="level"><option value="">Not set</option>${LEVELS.map((l) => `<option ${p.level === l ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        ${pickerHTML(p)}
        <div class="actions"><button class="btn" type="submit">Save profile</button><button class="link-btn" type="button" data-act="signout">Sign out</button></div>
      </form></section>
    <div class="stack"><section class="card rise" style="--i:1"><h2>Your progress</h2>
      ${
        row
          ? `<div class="stats"><div class="stat"><b class="num">${row.quizzes}</b><span>${row.quizzes === 1 ? "quiz" : "quizzes"} taken</span></div>
             <div class="stat"><b class="num">${allMine.length}</b><span>${allMine.length === 1 ? "attempt" : "attempts"} in total</span></div>
             <div class="stat"><b class="num">${avg}%</b><span>average on the leaderboard</span></div>
             <div class="stat"><b>${esc(row.title)}</b><span>your tag</span></div></div>
             <div class="skill-bars" style="margin-top:0">${bars}</div>
             ${row.weakest ? `<p class="sub">Practise next: <strong>${esc(SKILL[row.weakest].label)}</strong></p>` : ""}`
          : `<p class="sub">Take your first quiz and your strengths will show up here.</p>`
      }</section>
      <section class="card rise" style="--i:2"><h2>My quizzes</h2><p class="sub" style="margin-bottom:6px">Review an attempt to see every mistake with the right answer and why.</p>
        ${pickMsg ? `<div class="msg ${pickMsg.kind}" role="status" style="margin-top:12px">${esc(pickMsg.text)}</div>` : ""}
        <div class="hist">${hist || '<p class="empty">No quizzes yet.</p>'}</div></section></div></div>`;
}

function updatePreview(form) {
  const f = new FormData(form);
  document.getElementById("pvw").innerHTML = previewHTML(String(f.get("name") || "").trim(), f.get("color"), f.get("glyph"), f.get("level"));
  form.querySelectorAll(".pick .avatar").forEach((a) => {
    a.textContent = ([...String(f.get("name") || "?").trim()][0] || "?").toUpperCase();
  });
}

async function onSaveProfile(form) {
  const f = new FormData(form);
  const name = String(f.get("name")).trim().replace(/\s+/g, " ");
  if (!/^[\p{L}\p{N} '._-]{2,24}$/u.test(name)) {
    profileMsg = { kind: "err", text: "Your name needs 2 to 24 letters or numbers." };
    return render(false);
  }
  const profile = { sid: me.sid, name, color: Number(f.get("color")), glyph: Number(f.get("glyph")), level: String(f.get("level") || ""), picks: { ...(profiles.get(me.sid)?.picks || {}) }, updatedAt: Date.now() };
  try {
    await store.saveProfile(profile);
    profiles.set(me.sid, profile);
    profileMsg = { kind: "ok", text: "Saved. The leaderboard shows your new profile." };
  } catch {
    profileMsg = { kind: "err", text: "We couldn't save that. Check your internet and try again." };
  }
  render(false);
}

/* --------------------------------------------------------------- shell */

function render(enter = false) {
  const first = view === "home" && me ? captureRects($app) : null;
  const body = !me ? joinView() : view === "quiz" ? quizView() : view === "result" && shown ? resultView() : view === "profile" ? profileView() : homeView();
  $app.innerHTML = topbar() + body;
  $app.classList.toggle("enter", enter && !RM);
  if (enter) {
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => $app.classList.remove("enter"), 1800);
  }
  if (first) playFlip($app, first);
  $app.querySelectorAll(".num[data-v]").forEach((el) => {
    const key = el.dataset.sk || "";
    const to = Number(el.dataset.v);
    const prev = lastScores.get(key);
    if (prev === undefined && enter) countUp(el, 0, to);
    else if (prev !== undefined && prev !== to) {
      countUp(el, prev, to);
      el.closest(".row")?.classList.add("glow");
    }
    lastScores.set(key, to);
  });
}

function go(next) {
  view = next;
  if (next !== "result") shown = next === "quiz" ? shown : null;
  profileMsg = null;
  pickMsg = null;
  render(true);
  window.scrollTo(0, 0);
}

const busy = () =>
  !me ||
  view === "quiz" || (view === "profile" && document.activeElement && document.activeElement.closest("#profileForm") && /^(INPUT|SELECT)$/.test(document.activeElement.tagName));
const rerender = () => {
  if (!busy()) render(false);
};

function renderDemoBar() {
  document.getElementById("demo").innerHTML = `<div class="demo-bar"><span><strong>Demo mode.</strong> Data stays in this browser. Class code: <strong>demo</strong>.</span>
    <a href="admin.html" style="color:inherit">Teacher page</a><button data-act="reset-demo">Reset demo</button></div>`;
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (el.tagName === "A") e.preventDefault();
  if (act === "tab") {
    joinTab = el.dataset.tab;
    render(true);
  } else if (act === "nav") {
    go(el.dataset.v);
  } else if (act === "signout") {
    me = null;
    saveMe(null);
    joinTab = "back";
    go("home");
  } else if (act === "start") {
    activeQuiz = quizById(el.dataset.id);
    if (!activeQuiz) return;
    warned = false;
    view = "quiz";
    render(true);
    window.scrollTo(0, 0);
  } else if (act === "result" || act === "review") {
    const quiz = quizById(el.dataset.id);
    const list = myAttempts(el.dataset.id);
    const want = Number(el.dataset.attempt) || (list.length ? attemptOf(list[list.length - 1]) : 0);
    const result = list.find((r) => attemptOf(r) === want);
    if (!quiz || !result) return;
    shown = { quiz, result, from: act === "review" ? "profile" : "home" };
    reviewAll = false;
    go("result");
  } else if (act === "pick") {
    const quizId = el.dataset.id;
    const attempt = Number(el.dataset.attempt);
    const old = profiles.get(me.sid) || prof(me.sid, me.nickname);
    const profile = { sid: me.sid, name: old.name, color: old.color, glyph: old.glyph, level: old.level || "", picks: { ...(old.picks || {}), [quizId]: attempt }, updatedAt: Date.now() };
    const title = (results.find((r) => r.quizId === quizId) || {}).quizTitle || "this quiz";
    try {
      await store.saveProfile(profile);
      profiles.set(me.sid, profile);
      pickMsg = { kind: "ok", text: `Done. The leaderboard now shows your attempt ${attempt} for ${title}.` };
    } catch {
      pickMsg = { kind: "err", text: "We couldn't save that. Check your internet and try again." };
    }
    render(false);
  } else if (act === "home") {
    go("home");
  } else if (act === "lb") {
    lbMode = el.dataset.mode;
    render(false);
  } else if (act === "rv") {
    reviewAll = el.dataset.all === "1";
    render(false);
  } else if (act === "play") {
    play(Number(el.dataset.id), el);
  } else if (act === "open") {
    openModal(el.dataset.kind);
  } else if (act === "close-modal") {
    $modal.close();
  } else if (act === "reset-demo") {
    await store.resetDemo();
    me = null;
    saveMe(null);
    profiles = new Map();
    go("home");
  }
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "joinForm") onJoin(e.target);
  if (e.target.id === "quizForm") onSubmitQuiz(e.target);
  if (e.target.id === "profileForm") onSaveProfile(e.target);
  if (e.target.id === "commentForm") onComment(e.target);
});
$modal.addEventListener("click", (e) => {
  if (e.target === $modal) $modal.close();
});
$modal.addEventListener("close", () => {
  modalKind = null;
});
document.addEventListener("visibilitychange", () => !document.hidden && checkNewDay());
setInterval(checkNewDay, 60000);
document.addEventListener("input", (e) => {
  if (e.target.closest("#commentForm")) {
    document.getElementById("cmCount").textContent = `${e.target.value.length} / ${MAX_COMMENT}`;
    document.getElementById("cmMsg").hidden = true;
  }
  if (e.target.closest("#quizForm")) updateProgress(e.target.closest("#quizForm"));
  if (e.target.closest("#profileForm")) updatePreview(e.target.closest("#profileForm"));
});
document.addEventListener("change", (e) => {
  if (e.target.id === "weekSelect") {
    lbQuizId = e.target.value;
    render(false);
  }
  if (e.target.id === "levelSelect") {
    lbLevel = e.target.value;
    render(false);
  }
  if (e.target.closest("#profileForm")) updatePreview(e.target.closest("#profileForm"));
});

(async function boot() {
  try {
    store = await createStore();
    await store.init();
  } catch (err) {
    console.error(err);
    $app.innerHTML = topbar() + `<div class="card"><h2>We can't connect right now</h2><p class="sub">Check your internet and refresh the page.</p></div>`;
    return;
  }
  if (store.mode === "demo") renderDemoBar();
  const waits = [
    subscribeDaily(),
    new Promise((res) => {
      store.onSettings((s) => {
        settings = s || { nextQuiz: null, sections: [] };
        res();
        if (ready) rerender();
      });
    }),
    new Promise((res) => {
      store.onQuizzes((q) => {
        quizzes = q;
        res();
        if (ready) rerender();
      });
    }),
    new Promise((res) => {
      store.onResults((r) => {
        results = r;
        res();
        if (ready) rerender();
      });
    }),
    new Promise((res) => {
      store.onProfiles((l) => {
        profiles = new Map(l.map((p) => [p.sid || p.id, p]));
        res();
        if (ready) rerender();
      });
    }),
  ];
  await Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 2500))]);
  ready = true;
  render(true);
})();
