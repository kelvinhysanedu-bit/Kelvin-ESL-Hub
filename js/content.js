/* Idiom of the day and quote of the week.
   Both rotate automatically from the calendar, so nothing needs updating by hand.
   - IDIOMS: one per day, starting on ANCHOR, repeating after the last one.
   - QUOTES: one per week (Monday to Sunday), starting on ANCHOR, repeating after the last one.
   To add your own, add an entry to the end of either list. */

export const IDIOMS = [
  { id: "piece-of-cake", text: "A piece of cake", meaning: "Something that is very easy to do.", example: "The grammar test was a piece of cake.", prompt: "What felt like a piece of cake for you this week?" },
  { id: "break-the-ice", text: "Break the ice", meaning: "To say or do something friendly so that people feel more relaxed, especially when they first meet.", example: "He told a short joke to break the ice at the start of the meeting.", prompt: "How do you break the ice when you meet someone new?" },
  { id: "hit-the-nail", text: "Hit the nail on the head", meaning: "To say exactly the right thing, or to describe a problem perfectly.", example: "You hit the nail on the head when you said the team needs better communication.", prompt: "Tell us about a time someone said exactly what you were thinking." },
  { id: "under-the-weather", text: "Under the weather", meaning: "Feeling a little ill or low in energy.", example: "I'm feeling under the weather, so I'm going to stay home today.", prompt: "What do you do when you feel under the weather?" },
  { id: "blue-moon", text: "Once in a blue moon", meaning: "Very rarely.", example: "My brother visits once in a blue moon, so it's always special.", prompt: "What do you do only once in a blue moon?" },
  { id: "ball-in-your-court", text: "The ball is in your court", meaning: "It is your turn to make the next decision or take the next action.", example: "I've sent you my offer, so the ball is in your court now.", prompt: "When was the last time the ball was in your court? What did you do?" },
  { id: "arm-and-a-leg", text: "Cost an arm and a leg", meaning: "To be extremely expensive.", example: "Tickets for the concert cost an arm and a leg.", prompt: "What is the most expensive thing you have bought? Was it worth it?" },
  { id: "bite-the-bullet", text: "Bite the bullet", meaning: "To do something difficult or unpleasant that you cannot avoid.", example: "I hate going to the dentist, but I decided to bite the bullet and book an appointment.", prompt: "What did you have to bite the bullet and do recently?" },
  { id: "spill-the-beans", text: "Spill the beans", meaning: "To tell a secret.", example: "Who spilled the beans about the surprise party?", prompt: "Have you ever spilled the beans? What happened?" },
  { id: "beat-around-the-bush", text: "Beat around the bush", meaning: "To avoid talking about the main point, often because it is difficult.", example: "Stop beating around the bush and tell me what happened.", prompt: "Do you prefer people to be direct or to beat around the bush? Why?" },
  { id: "cut-corners", text: "Cut corners", meaning: "To do something quickly or cheaply by skipping important steps.", example: "The builders cut corners, and now the roof leaks.", prompt: "Is it ever OK to cut corners? Give an example." },
  { id: "out-of-hand", text: "Get out of hand", meaning: "To become difficult to control.", example: "The meeting got out of hand when everyone started shouting.", prompt: "Tell us about a time when something got out of hand." },
  { id: "cat-out-of-the-bag", text: "Let the cat out of the bag", meaning: "To tell a secret by accident.", example: "I let the cat out of the bag when I mentioned her new job.", prompt: "What is the best secret you ever kept, or failed to keep?" },
  { id: "same-page", text: "On the same page", meaning: "Having the same understanding or agreeing about something.", example: "Before we start the project, let's make sure we're all on the same page.", prompt: "How do you make sure a group is on the same page?" },
  { id: "square-one", text: "Back to square one", meaning: "Having to start again from the beginning.", example: "The computer crashed and I lost my work, so it's back to square one.", prompt: "When did you last have to go back to square one?" },
  { id: "miss-the-boat", text: "Miss the boat", meaning: "To lose a chance because you acted too late.", example: "If you don't apply today, you'll miss the boat.", prompt: "Is there a chance you missed? What would you do differently?" },
  { id: "blessing-in-disguise", text: "A blessing in disguise", meaning: "Something that seems bad at first but has a good result later.", example: "Losing that job was a blessing in disguise because it led me to a better one.", prompt: "Tell us about a blessing in disguise in your life." },
  { id: "midnight-oil", text: "Burn the midnight oil", meaning: "To work or study very late at night.", example: "She burned the midnight oil to finish her report.", prompt: "When do you study best: early morning or late at night?" },
  { id: "call-it-a-day", text: "Call it a day", meaning: "To stop working because you have done enough.", example: "We've done enough for today. Let's call it a day.", prompt: "How do you know when it is time to call it a day?" },
  { id: "face-the-music", text: "Face the music", meaning: "To accept the criticism or punishment that you deserve.", example: "He broke the window, so he had to face the music and tell his parents.", prompt: "Describe a time when you had to face the music." },
  { id: "extra-mile", text: "Go the extra mile", meaning: "To make more effort than people expect.", example: "The waiter went the extra mile and found us a table by the window.", prompt: "Who has gone the extra mile for you?" },
  { id: "long-run", text: "In the long run", meaning: "Over a long period of time; in the end.", example: "Learning a language is hard now, but it will pay off in the long run.", prompt: "What are you doing now that will help you in the long run?" },
  { id: "bandwagon", text: "Jump on the bandwagon", meaning: "To start doing something because it has become popular.", example: "Everyone started using the app, so I jumped on the bandwagon.", prompt: "Have you jumped on any bandwagons recently?" },
  { id: "keep-an-eye-on", text: "Keep an eye on", meaning: "To watch someone or something carefully.", example: "Could you keep an eye on my bag while I buy a coffee?", prompt: "What do you need to keep an eye on at work or at home?" },
  { id: "pull-your-leg", text: "Pull someone's leg", meaning: "To joke with someone by telling them something that is not true.", example: "Are you serious, or are you pulling my leg?", prompt: "Who in your life likes to pull your leg?" },
  { id: "last-straw", text: "The last straw", meaning: "The final problem that makes you lose your patience.", example: "When the train was late again, that was the last straw. I bought a car.", prompt: "What is the last straw for you when you are travelling or waiting?" },
  { id: "play-it-by-ear", text: "Play it by ear", meaning: "To decide what to do as things happen, without a fixed plan.", example: "I don't know what we'll do on Saturday. Let's play it by ear.", prompt: "Do you like to plan everything, or do you prefer to play it by ear?" },
  { id: "between-the-lines", text: "Read between the lines", meaning: "To understand a hidden meaning that is not said directly.", example: "If you read between the lines, her email says she isn't happy.", prompt: "Tell us about a message where you had to read between the lines." },
  { id: "rain-on-parade", text: "Rain on someone's parade", meaning: "To spoil someone's plans or good mood.", example: "I don't want to rain on your parade, but the weather forecast is bad.", prompt: "Has someone ever rained on your parade? How did you feel?" },
  { id: "pinch-of-salt", text: "Take it with a pinch of salt", meaning: "To not completely believe something.", example: "He says he knows every celebrity, but I take it with a pinch of salt.", prompt: "What news or advice do you take with a pinch of salt?" },
  { id: "tip-of-the-iceberg", text: "The tip of the iceberg", meaning: "A small, visible part of a much bigger problem.", example: "The two complaints we received are only the tip of the iceberg.", prompt: "Think of a time when a small problem was the tip of the iceberg." },
  { id: "throw-in-the-towel", text: "Throw in the towel", meaning: "To give up because you feel you cannot win or continue.", example: "After three failed attempts, he threw in the towel.", prompt: "Is it ever right to throw in the towel? When?" },
  { id: "two-birds", text: "Kill two birds with one stone", meaning: "To solve two problems with one action.", example: "I'll walk to the shop and get some exercise. That kills two birds with one stone.", prompt: "How do you kill two birds with one stone in your day?" },
  { id: "drop-in-the-ocean", text: "A drop in the ocean", meaning: "A very small amount compared with what is needed.", example: "Fifty euros is a drop in the ocean compared with the repair costs.", prompt: "What small action can still make a difference, even if it is a drop in the ocean?" },
  { id: "ball-rolling", text: "Get the ball rolling", meaning: "To start something so that it can continue.", example: "Let's get the ball rolling with a quick introduction.", prompt: "What do you want to get rolling this month?" },
  { id: "hot-water", text: "In hot water", meaning: "In trouble.", example: "He's in hot water with his boss for missing the deadline.", prompt: "Have you ever been in hot water? What happened?" },
  { id: "no-stone-unturned", text: "Leave no stone unturned", meaning: "To try every possible way to find or achieve something.", example: "The police left no stone unturned in their search.", prompt: "What would you leave no stone unturned to achieve?" },
  { id: "top-of-my-head", text: "Off the top of my head", meaning: "Without checking or thinking carefully; from memory.", example: "Off the top of my head, I think the meeting is at three.", prompt: "Off the top of your head, name three things that make you happy." },
  { id: "sit-on-the-fence", text: "Sit on the fence", meaning: "To refuse to choose one side in an argument.", example: "You can't sit on the fence forever. You have to decide.", prompt: "Is there a topic where you sit on the fence? Why?" },
  { id: "wrap-your-head", text: "Wrap your head around something", meaning: "To understand something that is difficult or surprising.", example: "I still can't wrap my head around English prepositions.", prompt: "What are you trying to wrap your head around right now?" },
  { id: "elephant-in-the-room", text: "The elephant in the room", meaning: "An obvious problem that everyone knows about but nobody wants to discuss.", example: "Nobody mentioned the budget cuts, but they were the elephant in the room.", prompt: "Have you ever noticed an elephant in the room? What was it?" },
  { id: "double-edged-sword", text: "A double-edged sword", meaning: "Something that has both good and bad effects.", example: "Social media is a double-edged sword: it connects us, but it can waste our time.", prompt: "What is a double-edged sword in your life?" },
  { id: "bite-off-more", text: "Bite off more than you can chew", meaning: "To try to do more than you can manage.", example: "I bit off more than I could chew when I signed up for three courses.", prompt: "Have you ever bitten off more than you could chew?" },
];

export const QUOTES = [
  { id: "wittgenstein", text: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein", meaning: "The more words and grammar you know, the more of the world you can understand and talk about.", example: "Learning English has widened my world. Now I can talk to people in many countries.", prompt: "How has learning English widened your world?" },
  { id: "thousand-miles", text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu", meaning: "Every big goal starts with one small action.", example: "I was afraid of speaking English at work, so I started with one sentence a day.", prompt: "What is one small step you can take this week towards your English goal?" },
  { id: "slowly", text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius (attributed)", meaning: "Speed is not important. Not giving up is what matters.", example: "I only study for twenty minutes a day, but I never stop, so I keep improving.", prompt: "What helps you keep going when progress feels slow?" },
  { id: "shots", text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", meaning: "If you never try, you can never succeed.", example: "I almost didn't apply for the job, but I remembered: you miss 100% of the shots you don't take.", prompt: "What shot do you want to take this month?" },
  { id: "well-done", text: "Well done is better than well said.", author: "Benjamin Franklin", meaning: "Doing something good is more valuable than only talking about it.", example: "Don't just promise to help. Well done is better than well said.", prompt: "Who in your life shows kindness through actions rather than words?" },
  { id: "habit", text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant", meaning: "Your daily habits make you who you are. Success comes from doing small good things again and again.", example: "I read one article in English every morning. It is becoming a habit, and my vocabulary is growing.", prompt: "Which daily habit is helping you improve?" },
  { id: "fall-seven", text: "Fall seven times, stand up eight.", author: "Japanese proverb", meaning: "You will fail sometimes. What matters is that you try again every time.", example: "I failed my speaking exam twice, but I stood up eight times. This time I passed.", prompt: "Tell us about a time when you fell and got back up." },
  { id: "unexamined", text: "The unexamined life is not worth living.", author: "Socrates", meaning: "It is important to think carefully about your life, your choices and your goals.", example: "At the end of each week I think about what I learned. Socrates would say the unexamined life is not worth living.", prompt: "What would you like to understand better about yourself or your life?" },
  { id: "road-map", text: "Language is the road map of a culture.", author: "Rita Mae Brown", meaning: "A language shows you the history, values and way of life of its people.", example: "When I learned how many English idioms are about the weather, I understood something about British culture.", prompt: "What have you learned about a culture from its language?" },
  { id: "nothing-will-work", text: "Nothing will work unless you do.", author: "Maya Angelou (attributed)", meaning: "Good plans and wishes are not enough. You must make an effort.", example: "I downloaded five apps, but nothing will work unless I do. Today I'll practise for twenty minutes.", prompt: "What effort will you make today?" },
  { id: "beginner", text: "The expert in anything was once a beginner.", author: "Helen Hayes", meaning: "Everyone starts at zero. Experts were beginners first.", example: "Don't feel bad about your mistakes. The expert in anything was once a beginner.", prompt: "What were you a beginner at, and what are you good at now?" },
  { id: "read-more", text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss", meaning: "Reading and learning give you knowledge, and knowledge opens up new places and chances.", example: "I started reading the news in English every day. Now I can follow conversations at work more easily.", prompt: "What is the best thing you have read in English recently?" },
  { id: "you-can", text: "Whether you think you can, or you think you can't, you're right.", author: "Henry Ford (attributed)", meaning: "What you believe about yourself affects what you do. If you believe you can succeed, you are more likely to try.", example: "I used to say I couldn't speak in meetings. When I changed my thinking, I started to speak up.", prompt: "What belief about yourself would you like to change?" },
  { id: "make-days-count", text: "Don't count the days; make the days count.", author: "Muhammad Ali (attributed)", meaning: "Don't just wait for time to pass. Do something that matters every day.", example: "I stopped counting the days until my exam and started making every study session useful.", prompt: "How will you make today count?" },
];

/* Monday 5 October 2026: day 1 of the idiom list and week 1 of the quote list. */
const ANCHOR = Date.UTC(2026, 9, 5) / 86400000;
const mod = (n, m) => ((n % m) + m) % m;
export const dayNumber = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
const isoOf = (n) => new Date(n * 86400000).toISOString().slice(0, 10);

/* Today's date. Add ?date=2026-11-20 to the address to preview another day. */
export function today() {
  const p = new URLSearchParams(location.search).get("date");
  if (/^\d{4}-\d{2}-\d{2}$/.test(p || "")) {
    const [y, m, d] = p.split("-").map(Number);
    return new Date(y, m - 1, d, 12);
  }
  return new Date();
}
export const isPreviewDate = () => /^\d{4}-\d{2}-\d{2}$/.test(new URLSearchParams(location.search).get("date") || "");

export function idiomFor(d) {
  const n = dayNumber(d);
  return { kind: "idiom", item: IDIOMS[mod(n - ANCHOR, IDIOMS.length)], date: isoOf(n), key: `idiom:${isoOf(n)}` };
}

export function quoteFor(d) {
  const week = Math.floor((dayNumber(d) - ANCHOR) / 7);
  const monday = ANCHOR + week * 7;
  return { kind: "quote", item: QUOTES[mod(week, QUOTES.length)], date: isoOf(monday), key: `quote:${isoOf(monday)}` };
}

export function msToNextDay() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
}

export function formatCountdown(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
