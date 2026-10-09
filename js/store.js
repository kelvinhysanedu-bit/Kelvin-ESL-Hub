import { firebaseConfig } from "./config.js";
import { demoSeed } from "./sample.js";
import { slug, resultId } from "./logic.js";

/* Add ?demo=1 to the address to try the hub with practice data that stays in this browser. */
export function createStore({ admin = false } = {}) {
  const forceDemo = new URLSearchParams(location.search).has("demo");
  return firebaseConfig && !forceDemo ? firebaseStore(admin) : demoStore();
}

const clean = (o) => JSON.parse(JSON.stringify(o));
const quizId = (q) => q.id || slug(q.title) + "-" + Date.now().toString(36);

/* ---------------------------------------------------------------- demo */

function demoStore() {
  const KEY = "eslhub.demo.v3";
  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return demoSeed();
  };
  let db = load();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {}
  };
  const subs = { settings: new Set(), quizzes: new Set(), results: new Set(), students: new Set(), profiles: new Set(), comments: new Set() };
  const commentRows = () => Object.entries(db.comments || {}).map(([id, c]) => ({ id, ...c }));
  const notify = (...keys) => (keys.length ? keys : Object.keys(subs)).forEach((k) => subs[k].forEach((f) => f()));
  const on = (key, cb, get) => {
    const fn = () => cb(get());
    subs[key].add(fn);
    fn();
    return () => subs[key].delete(fn);
  };
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      db = load();
      notify();
    }
  });

  return {
    mode: "demo",
    async init() {},
    onSettings: (cb) => on("settings", cb, () => db.settings),
    onQuizzes: (cb, { all = false } = {}) =>
      on("quizzes", cb, () => Object.values(db.quizzes).filter((q) => all || q.status !== "draft")),
    onResults: (cb) => on("results", cb, () => Object.entries(db.results).map(([id, r]) => ({ id, ...r }))),
    onProfiles: (cb) => on("profiles", cb, () => Object.values(db.profiles)),
    onStudents: (cb) => on("students", cb, () => Object.values(db.students)),
    onComments: (key, cb) => on("comments", cb, () => commentRows().filter((c) => c.key === key)),
    onRecentComments: (cb) => on("comments", cb, () => commentRows().sort((a, b) => b.createdAt - a.createdAt).slice(0, 150)),
    async addComment(c) {
      (db.comments ||= {})["c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)] = c;
      save();
      notify("comments");
    },
    async updateComment(id, patch) {
      if (!db.comments?.[id]) throw { code: "not-found" };
      db.comments[id] = { ...db.comments[id], ...patch };
      save();
      notify("comments");
    },
    async deleteComment(id) {
      delete (db.comments || {})[id];
      save();
      notify("comments");
    },
    async toggleLove(id, sid, on) {
      const c = db.comments?.[id];
      if (!c) throw { code: "not-found" };
      const set = new Set(c.loves || []);
      on ? set.add(sid) : set.delete(sid);
      c.loves = [...set];
      save();
      notify("comments");
    },
    uid() {
      try {
        let u = localStorage.getItem("eslhub.demo.uid");
        if (!u) localStorage.setItem("eslhub.demo.uid", (u = "demo-" + Math.random().toString(36).slice(2, 10)));
        return u;
      } catch {
        return "demo-device";
      }
    },

    async findStudent(sid) {
      return db.students[sid] || null;
    },
    async createStudent(doc, profile) {
      if (db.students[doc.sid]) throw { code: "exists" };
      if (doc.classCode !== db.classCode) throw { code: "bad-class-code" };
      db.students[doc.sid] = doc;
      db.profiles[doc.sid] = profile;
      save();
      notify("students", "profiles");
    },
    async getProfile(sid) {
      return db.profiles[sid] || null;
    },
    async saveProfile(p) {
      db.profiles[p.sid] = p;
      save();
      notify("profiles");
    },
    async submitResult(res) {
      const id = resultId(res);
      if (db.results[id]) throw { code: "already" };
      db.results[id] = res;
      save();
      notify("results");
    },

    onAuth(cb) {
      cb({ email: "demo teacher" });
      return () => {};
    },
    async signIn() {},
    async signOut() {},
    async saveQuiz(quiz) {
      const id = quizId(quiz);
      db.quizzes[id] = { ...clean(quiz), id, createdAt: quiz.createdAt || Date.now() };
      save();
      notify("quizzes");
      return id;
    },
    async setQuizStatus(id, status) {
      db.quizzes[id].status = status;
      save();
      notify("quizzes");
    },
    async deleteQuiz(id) {
      delete db.quizzes[id];
      save();
      notify("quizzes");
    },
    async saveSettings(s) {
      db.settings = clean(s);
      save();
      notify("settings");
    },
    async getClassCode() {
      return db.classCode;
    },
    async setClassCode(code) {
      db.classCode = code;
      save();
    },
    async deleteResult(id) {
      delete db.results[id];
      save();
      notify("results");
    },
    async removeStudent(sid) {
      delete db.students[sid];
      save();
      notify("students");
    },
    async resetDemo() {
      db = demoSeed();
      save();
      notify();
    },
  };
}

/* ------------------------------------------------------------ firebase */

async function firebaseStore(admin) {
  const base = "https://www.gstatic.com/firebasejs/10.12.2/";
  const [{ initializeApp }, fs, au] = await Promise.all([
    import(base + "firebase-app.js"),
    import(base + "firebase-firestore.js"),
    import(base + "firebase-auth.js"),
  ]);
  const app = admin ? initializeApp(firebaseConfig, "teacher") : initializeApp(firebaseConfig);
  const db = fs.getFirestore(app);
  const auth = au.getAuth(app);
  const fail = (e) => console.error(e);
  const col = (name) => fs.collection(db, name);
  const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  let ready;

  return {
    mode: "live",
    init() {
      if (!ready) ready = admin ? Promise.resolve() : au.signInAnonymously(auth);
      return ready;
    },
    onSettings: (cb) =>
      fs.onSnapshot(fs.doc(db, "settings", "main"), (s) => cb(s.exists() ? s.data() : { nextQuiz: null, sections: [] }), fail),
    onQuizzes(cb, { all = false } = {}) {
      if (all) return fs.onSnapshot(col("quizzes"), (s) => cb(rows(s)), fail);
      let open = [];
      let closed = [];
      const emit = () => cb([...open, ...closed]);
      const u1 = fs.onSnapshot(fs.query(col("quizzes"), fs.where("status", "==", "open")), (s) => { open = rows(s); emit(); }, fail);
      const u2 = fs.onSnapshot(fs.query(col("quizzes"), fs.where("status", "==", "closed")), (s) => { closed = rows(s); emit(); }, fail);
      return () => { u1(); u2(); };
    },
    onResults: (cb) => fs.onSnapshot(col("results"), (s) => cb(rows(s)), fail),
    onProfiles: (cb) => fs.onSnapshot(col("profiles"), (s) => cb(rows(s)), fail),
    onStudents: (cb) => fs.onSnapshot(col("students"), (s) => cb(rows(s)), fail),
    onComments: (key, cb) => fs.onSnapshot(fs.query(col("comments"), fs.where("key", "==", key)), (s) => cb(rows(s)), fail),
    onRecentComments: (cb) => fs.onSnapshot(fs.query(col("comments"), fs.orderBy("createdAt", "desc"), fs.limit(150)), (s) => cb(rows(s)), fail),
    addComment: (c) => fs.addDoc(col("comments"), c),
    updateComment: (id, patch) => fs.updateDoc(fs.doc(db, "comments", id), patch),
    deleteComment: (id) => fs.deleteDoc(fs.doc(db, "comments", id)),
    toggleLove: (id, sid, on) => fs.updateDoc(fs.doc(db, "comments", id), { loves: on ? fs.arrayUnion(sid) : fs.arrayRemove(sid) }),
    uid: () => auth.currentUser?.uid || "",

    async findStudent(sid) {
      const s = await fs.getDoc(fs.doc(db, "students", sid));
      return s.exists() ? s.data() : null;
    },
    async createStudent(doc, profile) {
      const ref = fs.doc(db, "students", doc.sid);
      if ((await fs.getDoc(ref)).exists()) throw { code: "exists" };
      try {
        await fs.setDoc(ref, doc);
      } catch (e) {
        throw e.code === "permission-denied" ? { code: "bad-class-code" } : e;
      }
      await fs.setDoc(fs.doc(db, "profiles", doc.sid), profile);
    },
    async getProfile(sid) {
      const s = await fs.getDoc(fs.doc(db, "profiles", sid));
      return s.exists() ? s.data() : null;
    },
    saveProfile: (p) => fs.setDoc(fs.doc(db, "profiles", p.sid), p),
    async submitResult(res) {
      const ref = fs.doc(db, "results", resultId(res));
      if ((await fs.getDoc(ref)).exists()) throw { code: "already" };
      try {
        await fs.setDoc(ref, res);
      } catch (e) {
        throw e.code === "permission-denied" ? { code: "denied" } : e;
      }
    },

    onAuth: (cb) => au.onAuthStateChanged(auth, (u) => cb(u && !u.isAnonymous ? { email: u.email } : null)),
    signIn: () => au.signInWithPopup(auth, new au.GoogleAuthProvider()),
    signOut: () => au.signOut(auth),
    async saveQuiz(quiz) {
      const id = quizId(quiz);
      await fs.setDoc(fs.doc(db, "quizzes", id), { ...clean(quiz), id, createdAt: quiz.createdAt || Date.now() });
      return id;
    },
    setQuizStatus: (id, status) => fs.updateDoc(fs.doc(db, "quizzes", id), { status }),
    deleteQuiz: (id) => fs.deleteDoc(fs.doc(db, "quizzes", id)),
    saveSettings: (s) => fs.setDoc(fs.doc(db, "settings", "main"), clean(s)),
    async getClassCode() {
      const s = await fs.getDoc(fs.doc(db, "private", "class"));
      return s.exists() ? s.data().classCode : "";
    },
    setClassCode: (code) => fs.setDoc(fs.doc(db, "private", "class"), { classCode: code }),
    deleteResult: (id) => fs.deleteDoc(fs.doc(db, "results", id)),
    removeStudent: (sid) => fs.deleteDoc(fs.doc(db, "students", sid)),
    async resetDemo() {},
  };
}
