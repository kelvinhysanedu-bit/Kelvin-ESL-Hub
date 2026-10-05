# Tr. Kelvin's ESL Hub

A live weekly-quiz dashboard for B1 to C1 adult learners. Students create a profile (username and PIN, no email), take the quiz, review their mistakes, and see a live leaderboard with skill tags such as "Grammar Architect" and "Diplomat". There is also an idiom of the day and a quote of the week that students can comment on. Hosted free on GitHub Pages, with live data in Firebase.

## Idiom of the day and quote of the week

- **Idiom of the day** changes by itself at midnight (the student's local time). 43 idioms are ready, so it runs for 43 days and then starts again.
- **Quote of the week** changes every Monday. 14 quotes are ready (14 weeks), then it starts again.
- Both sit in the right-hand column, below the next quiz. Each one has a simple meaning and an example sentence. Tapping the card opens a pop-up with a question to spark ideas and a space for students to share. Comments are tied to that day or week, so each new idiom starts a fresh conversation.
- You can remove comments on the teacher page, under **Idioms & quotes**. That tab also shows the next 31 idioms and the next 8 quotes.
- To preview another day, add `?date=2026-11-20` to the student page address.
- To add your own, add a line to `IDIOMS` or `QUOTES` in `js/content.js` (the format is the same as the lines already there). Quotes marked "attributed" are widely credited to that person but not firmly documented.

## Try it now (demo mode)

With no Firebase config the hub runs in demo mode. Data stays in your browser. Class code: `demo`.

Double-click **start.bat**. It starts a small local server and opens the teacher page. Keep its window open while you use the hub.

- Students: http://localhost:8080/
- Teacher: http://localhost:8080/admin.html

Don't double-click `index.html` or `admin.html` directly. Browsers block the page's scripts when opened as plain files.

## What students can do

- **Create a profile** with a class code, a username, a 4-digit PIN, a leaderboard name and a level (B1, B2, C1).
- **Take the weekly quiz** at any time, once.
- **See the leaderboard** live: rank, name, level, a title for their strongest area, a bar for each of the eight areas, and total points. Filter by week, all time, or level.
- **Edit their profile**: name on the leaderboard, level, colour and picture. The username they sign in with stays the same.
- **Review every quiz they've taken**: the right answer, their answer, and the "Why" you wrote, with the reading text or listening transcript. Open and closed quizzes can be reviewed.

## Quiz areas

Based on what Cambridge B2 First and C1 Advanced test (Reading and Use of English parts 1 to 4, reading, listening, and speaking and writing tasks).

| Area | Word to use | Tests |
|---|---|---|
| Grammar | `grammar` | tenses, conditionals, modals, passives, reported speech |
| Vocabulary & collocations | `vocabulary` | collocations, fixed phrases, shades of meaning |
| Phrasal verbs & idioms | `phrasal` | multi-word verbs and idioms in context |
| Word formation | `wordform` | prefixes, suffixes, word families |
| Functional language & register | `functional` | polite requests, disagreeing, suggesting, formal vs informal |
| Reading | `reading` | detail, opinion, tone, inference |
| Rewriting & error correction | `writing` | key-word transformations, word order, fixing errors |
| Listening | `listening` | short talks: gist, detail, attitude |

Free writing and speaking can't be marked automatically. Give feedback on those separately.

## Writing a quiz

On the teacher page, **Quizzes > Load example** shows a full quiz. You can paste text, upload a .txt file, or use JSON. The guide on that page lists every option. In short:

```
Title: Week 2: Travel and Culture
Date: 2026-10-16

[grammar]
Q: If I ___ the job offer last year, I would be living in Berlin now.
a) accepted
*b) had accepted
c) would accept
Why: A mixed conditional uses had + past participle, then would + infinitive.

[wordform]
Q: She showed great ___ in finding a solution. (CREATE)
Answer: creativity
```

- Put `*` before the correct option.
- For typed answers, list every acceptable answer after `Answer:` separated by `|`. Capitals, extra spaces, commas and a final full stop are ignored.
- `Passage:` (reading) and `Script:` (listening) are shared by the questions that follow.
- Listening: the student's device reads the Script aloud (3 plays, voice quality depends on the device). Use `Audio: https://...mp3` instead for a real recording.
- Quiz status: **Draft** is hidden, **Open** can be taken, **Closed** can only be reviewed by students who took it.

## Go live

### 1. Firebase (stores profiles, quizzes, scores)

1. Go to https://console.firebase.google.com and **Add project** (Analytics not needed).
2. **Build > Firestore Database > Create database**. Choose production mode and the region nearest your students.
3. **Build > Authentication > Get started > Sign-in method**. Enable **Anonymous** and **Google**.
4. **Authentication > Settings > Authorized domains**. Add `YOUR-GITHUB-USERNAME.github.io`.
5. **Project settings (gear) > Your apps > Web (`</>`)**. Register an app and copy the `firebaseConfig` values into `js/config.js`. These values are not secret; the rules protect the data.
6. **Firestore > Rules**. Paste in `firestore.rules`, replace `REPLACE_WITH_TEACHER_EMAIL` with your Google account email, and **Publish**. Do this every time you update the app, because the rules change with new features.

### 2. GitHub Pages (hosts the website)

1. Create a **public** repository (free Pages needs public).
2. Push this folder to it:
   ```
   git init
   git add .
   git commit -m "ESL Hub"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
3. Repo **Settings > Pages > Deploy from a branch > main / (root)**.
4. Your hub is at `https://YOUR-USERNAME.github.io/YOUR-REPO/`. The teacher page is `/admin.html`.

### 3. First time as teacher

1. Open `/admin.html` and sign in with Google.
2. **Class** tab: set a class code and tell your students.
3. **Quizzes** tab: paste a quiz, choose **Open**, and save.
4. **Announcements** tab: set the next quiz date and the extra sections.

If a student forgets their PIN, use **Class > Students > Reset PIN**. They sign up again with the same username and keep their results.

## How tags work

- Everyone gets a title from their strongest area (at least 70% and at least 2 points), such as Grammar Architect. Below that, "On the rise".
- A "Best at ..." crown goes to the top scorer in an area (75% or more). Ties share it. Each player shows at most one.
- After a quiz, students see which area to practise next.

## Limits to know about

This is classroom-grade, not exam-grade security.

- Quiz answers are stored in the quiz so the page can mark it, and closed quizzes stay readable for review. A student who opens the browser developer tools could find the answers of an open quiz.
- The PIN is checked in the browser. A student who knows a classmate's username could try PINs.
- Anyone signed in can edit any profile name and picture through the browser developer tools.
- Teacher rights depend on the one email in `firestore.rules`.
