import { parseQuizText, SKILLS } from "./logic.js";
import { idiomFor, quoteFor, today } from "./content.js";

export function isoOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nextFriday(from = 0) {
  const d = new Date();
  d.setDate(d.getDate() + from);
  return isoOffset(from + ((5 - d.getDay() + 7) % 7));
}

export const sampleText = () => `Title: Week 1: Work and Life
Date: ${nextFriday()}

# Lines starting with # are notes for you. Students never see them.
# Mark the correct option with a *. For typed answers use "Answer:" and separate accepted answers with |

[grammar]
Q: By the time we arrived, the film ___.
*a) had already started
b) already started
c) has already started
d) was already starting
Why: Use the past perfect for an action completed before another moment in the past.
Q: If I ___ the job offer last year, I would be living in Berlin now.
a) accepted
*b) had accepted
c) would accept
d) have accepted
Why: This is a mixed conditional: a past condition (had + past participle) with a present result (would + infinitive).
Q: She suggested ___ the meeting until next week.
a) to postpone
*b) postponing
c) postpone
d) to postponing
Why: After "suggest" we use an -ing form, or a that-clause.

[vocabulary]
Q: He was fined for ___ the speed limit.
a) crossing
*b) breaking
c) passing
d) missing
Why: The collocation is "break the speed limit".
Q: It is a ___ misconception that we only use ten per cent of our brains.
*a) common
b) usual
c) frequent
d) ordinary
Why: "Common misconception" is a fixed collocation. "Usual" and "ordinary" do not collocate with "misconception".
Q: I'm afraid I can't ___ a new laptop at the moment.
a) allow
*b) afford
c) pay
d) spend
Why: "Afford" means to have enough money for something.

[phrasal]
Q: The meeting was ___ because the manager was ill.
*a) called off
b) called out
c) called up
d) called in
Why: "Call off" means to cancel.
Q: It took her months to ___ the shock of losing her job.
*a) get over
b) get off
c) get away
d) get along
Why: "Get over" means to recover from something difficult.
Q: When someone says "It's not my cup of tea", they mean that...
*a) it isn't something they enjoy
b) they would like a drink
c) it costs too much
d) they are not hungry
Why: "Not my cup of tea" is an idiom for something you don't particularly like.

[wordform]
Q: She showed great ___ in finding a solution. (CREATE)
Answer: creativity
Why: Noun from the verb: create, creativity.
Q: His behaviour at the interview was completely ___. (PROFESSION)
Answer: unprofessional
Why: Adjective with a negative prefix: professional, unprofessional.
Q: The ___ of the new software saved us hours of work. (INTRODUCE)
Answer: introduction
Why: Noun from the verb: introduce, introduction.

[functional]
Q: A colleague asks you to cover her shift, but you can't. Which reply is the most polite?
a) No, I can't.
*b) I'd love to help, but I'm afraid I already have plans.
c) That's not my problem.
d) Ask someone else.
Why: Softening phrases ("I'd love to... but I'm afraid...") refuse while keeping the relationship friendly.
Q: You want to disagree politely in a meeting. What do you say?
a) You're wrong.
*b) I see your point, but I'm not sure I agree.
c) That's nonsense.
d) No way.
Why: Acknowledge the other view first, then disagree with a hedge such as "I'm not sure".
Q: Which sentence makes a tentative suggestion?
a) You must try the new system.
*b) How about trying the new system?
c) Try the new system now.
d) The new system is better.
Why: "How about + -ing" is soft. "Must" and imperatives sound like orders.

[reading]
Passage: When companies first allowed staff to work from home, many managers feared that productivity would fall. In practice, the picture has been more complicated. Some employees report that they concentrate better without the interruptions of an open-plan office, while others say that the lack of casual conversation leaves them feeling isolated. Researchers have also noticed that the boundary between work and leisure can blur: people who work at their kitchen tables often find it hard to switch off in the evening. As a result, a growing number of firms are now experimenting with hybrid schedules, in which staff spend part of the week in the office and part at home.
Q: What did managers originally fear about working from home?
a) Staff would feel isolated.
*b) Productivity would fall.
c) Offices would be too crowded.
d) Workers would want higher pay.
Why: The first sentence says managers feared that productivity would fall.
Q: According to the text, why do some employees prefer working at home?
a) They save money.
*b) They are interrupted less.
c) They chat with colleagues more.
d) They work shorter hours.
Why: The text says they "concentrate better without the interruptions of an open-plan office".
Q: The word "blur" in the text is closest in meaning to...
*a) become less clear
b) become more obvious
c) disappear completely
d) change quickly
Why: If the boundary between work and leisure blurs, it becomes harder to see where one ends and the other begins.

[writing]
Q: Rewrite so it means the same, starting with "The last time": I haven't seen her for three years.
Answer: The last time I saw her was three years ago | The last time I saw her was 3 years ago
Why: "Haven't seen for three years" becomes "The last time I saw her was three years ago".
Q: Correct the mistake: She suggested me to take a break.
Answer: She suggested that I take a break | She suggested I take a break | She suggested that I should take a break | She suggested I should take a break | She suggested that I took a break | She suggested I took a break
Why: After "suggest" you cannot use an object + to-infinitive. Use a that-clause (or an -ing form).
Q: Put the words in order: never / such / I / have / seen / beautiful / a / view
Answer: I have never seen such a beautiful view
Why: "Never" goes between the auxiliary and the past participle, and we say "such a + adjective + noun".

[listening]
Accent: uk
Script: Good morning, everyone. Before we start, a quick change to today's schedule. The budget meeting has been moved from ten o'clock to half past eleven, because the finance director is stuck in traffic. The training session on the new software will go ahead as planned at two in the afternoon, in Room 4, not Room 2. Please bring your laptops.
Q: Why has the budget meeting been moved?
a) The room is not available.
*b) The finance director is delayed.
c) The software isn't ready.
d) Several staff are absent.
Why: The speaker says the finance director is stuck in traffic.
Q: What time will the budget meeting now start?
a) 10:00
*b) 11:30
c) 14:00
d) 10:30
Why: It moves from ten o'clock to half past eleven.
Q: Where will the training session take place?
a) Room 2
*b) Room 4
c) The canteen
d) Online
Why: The speaker says "in Room 4, not Room 2".
`;

export function sampleQuiz() {
  const { quiz } = parseQuizText(sampleText());
  quiz.questions = quiz.questions.map((q, i) => ({ id: "q" + (i + 1), ...q }));
  return quiz;
}

const DEMO = [
  ["amira", "Amira", 0, 0, "C1", [3, 3, 3, 2, 3, 3, 2, 3]],
  ["diego", "Diego", 1, 3, "B2", [3, 2, 3, 3, 2, 3, 3, 2]],
  ["mei", "Mei", 2, 4, "B2", [2, 3, 2, 3, 3, 2, 1, 3]],
  ["tomasz", "Tomasz", 6, 1, "B2", [3, 2, 2, 1, 3, 3, 2, 2]],
  ["sofia", "Sofia", 5, 6, "B1", [2, 2, 3, 2, 2, 2, 2, 1]],
  ["yusuf", "Yusuf", 3, 2, "B1", [1, 2, 1, 2, 2, 2, 1, 2]],
  ["chloe", "Chloé", 4, 5, "", [2, 1, 1, 1, 2, 1, 2, 2]],
];

export function demoSeed() {
  const quiz = { ...sampleQuiz(), id: "week-1", status: "open", createdAt: Date.now() };
  const students = {};
  const profiles = {};
  const results = {};
  DEMO.forEach(([user, name, color, glyph, level, got], i) => {
    const sid = "demo_" + user;
    students[sid] = { sid, nickname: user, classCode: "demo", pinHash: "demo", createdAt: Date.now() - 86400000 };
    profiles[sid] = { sid, name, color, glyph, level, updatedAt: Date.now() };
    const bySkill = {};
    let total = 0;
    SKILLS.forEach((s, k) => {
      bySkill[s.id] = { got: got[k], max: 3 };
      total += got[k];
    });
    results[`${quiz.id}__${sid}`] = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      quizDate: quiz.date,
      sid,
      nickname: user,
      total,
      max: 24,
      bySkill,
      attempt: 1,
      takenAt: Date.now() - (i + 1) * 3600000,
    };
  });
  /* Chloé took the quiz again and scored higher. The leaderboard still shows her first try until she picks attempt 2. */
  const retry = [3, 2, 2, 2, 3, 2, 2, 2];
  results[`${quiz.id}__demo_chloe__2`] = {
    ...results[`${quiz.id}__demo_chloe`],
    attempt: 2,
    total: retry.reduce((a, b) => a + b, 0),
    bySkill: Object.fromEntries(SKILLS.map((s, k) => [s.id, { got: retry[k], max: 3 }])),
    takenAt: Date.now() - 1800000,
  };
  const idiom = idiomFor(today());
  const quote = quoteFor(today());
  const now = Date.now();
  const comments = {
    c1: { kind: "idiom", key: idiom.key, sid: "demo_amira", name: "Amira", text: `This one is new for me. I'll try to use "${idiom.item.text}" in an email this week.`, createdAt: now - 5400000, loves: ["demo_diego", "demo_mei"] },
    c2: { kind: "idiom", key: idiom.key, sid: "demo_diego", name: "Diego", text: "We have a similar expression in Spanish, so it was easy to remember.", createdAt: now - 2700000 },
    c3: { kind: "quote", key: quote.key, sid: "demo_mei", name: "Mei", text: "This really resonates with me. I'm going to think about it every morning before I study.", createdAt: now - 7200000 },
  };
  return {
    classCode: "demo",
    comments,
    settings: {
      nextQuiz: {
        title: "Week 2: Travel and Culture",
        date: nextFriday(7),
        note: "Revise: the passive, reporting verbs, and phrases for making a complaint politely.",
      },
      sections: [
        { id: "s1", title: "", body: "" },
        { id: "s2", title: "", body: "" },
      ],
    },
    quizzes: { [quiz.id]: quiz },
    students,
    profiles,
    results,
  };
}
