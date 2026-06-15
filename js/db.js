/* ============================
   不背日语 — Database Layer (Dexie.js)
   ============================ */

const db = new Dexie('BubeiNihongoDB');

db.version(1).stores({
  words: `
    ++localId,
    &[lessonId+wordIndex],
    lessonId,
    wordIndex,
    partOfSpeech
  `,

  learningState: `
    &wordId,
    status,
    nextReviewDate,
    [status+nextReviewDate],
    lessonId
  `,

  reviewHistory: `
    ++id,
    wordId,
    date,
    quality,
    mode,
    [wordId+date],
    [date+quality]
  `,

  dailyStats: `
    &date,
    wordsLearned,
    wordsReviewed
  `,

  lessonProgress: `
    &lessonId,
    completed
  `,

  settings: `
    &key
  `
});

/* ============================
   Helper Functions
   ============================ */

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ---- Settings helpers ---- */

async function getSetting(key, defaultValue = null) {
  const row = await db.settings.get(key);
  return row ? row.value : defaultValue;
}

async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

/* ---- Words ---- */

async function getWordsByLesson(lessonId) {
  return db.words.where('lessonId').equals(lessonId).sortBy('wordIndex');
}

async function getWord(wordId) {
  return db.words.get(wordId);
}

async function getNewWords(lessonId, count) {
  const words = await db.words.where('lessonId').equals(lessonId).toArray();
  const states = await db.learningState.bulkGet(words.map(w => w.localId));
  const newWords = words.filter((_, i) => {
    const s = states[i];
    return !s || s.status === 'new';
  });
  return newWords.slice(0, count);
}

async function getTotalWordCount() {
  return db.words.count();
}

/* ---- Learning State ---- */

async function getLearningState(wordId) {
  return db.learningState.get(wordId);
}

async function updateLearningState(wordId, updates) {
  const existing = await db.learningState.get(wordId);
  if (existing) {
    await db.learningState.update(wordId, updates);
  } else {
    await db.learningState.put({ wordId, ...updates });
  }
}

async function getWordsDueForReview(limit = 20) {
  const today = todayISO();
  return db.learningState
    .where('nextReviewDate')
    .belowOrEqual(today)
    .filter(s => s.status === 'learning' || s.status === 'review')
    .sortBy('nextReviewDate')
    .then(results => results.slice(0, limit));
}

async function getReviewQueueSummary() {
  const today = todayISO();
  const allDue = await db.learningState
    .where('nextReviewDate')
    .belowOrEqual(today)
    .filter(s => s.status === 'learning' || s.status === 'review')
    .count();

  const overdue = await db.learningState
    .where('nextReviewDate')
    .below(today)
    .filter(s => s.status === 'learning' || s.status === 'review')
    .count();

  const newCount = await db.learningState
    .where('status')
    .equals('new')
    .count();

  return { due: allDue, overdue, newToday: newCount };
}

async function getLessonWordStates(lessonId) {
  const words = await db.words.where('lessonId').equals(lessonId).sortBy('wordIndex');
  const states = await db.learningState.bulkGet(words.map(w => w.localId));
  return words.map((w, i) => ({
    ...w,
    state: states[i] || { status: 'new', easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0 }
  }));
}

async function getLessonProgress(lessonId) {
  const words = await db.words.where('lessonId').equals(lessonId).toArray();
  if (words.length === 0) return { totalWords: 0, learnedWords: 0, completed: false, progress: 0 };

  const states = await db.learningState.bulkGet(words.map(w => w.localId));
  const learnedWords = states.filter(s => s && s.status !== 'new').length;

  return {
    totalWords: words.length,
    learnedWords,
    completed: learnedWords >= words.length,
    progress: Math.round((learnedWords / words.length) * 100)
  };
}

async function getAllLessonProgress() {
  const lessons = [];
  for (let i = 1; i <= 14; i++) {
    const progress = await getLessonProgress(i);
    if (progress.totalWords > 0) {
      lessons.push({ lessonId: i, ...progress });
    }
  }
  return lessons;
}

/* ---- Review History ---- */

async function logReview(wordId, quality, mode, timeSpent = 0) {
  await db.reviewHistory.add({
    wordId,
    date: todayISO(),
    quality,
    mode,
    timeSpent
  });
}

/* ---- Daily Stats ---- */

async function updateDailyStats(field, increment = 1) {
  const today = todayISO();
  const existing = await db.dailyStats.get(today);
  if (existing) {
    const updates = {};
    updates[field] = (existing[field] || 0) + increment;
    await db.dailyStats.update(today, updates);
  } else {
    const row = {
      date: today,
      wordsLearned: 0,
      wordsReviewed: 0,
      correctCount: 0,
      incorrectCount: 0,
      totalTimeSpent: 0
    };
    row[field] = increment;
    await db.dailyStats.put(row);
  }
}

async function getDailyStats(date) {
  return db.dailyStats.get(date || todayISO());
}

async function getRecentDailyStats(days = 30) {
  const stats = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const row = await db.dailyStats.get(iso);
    stats.push(row || { date: iso, wordsLearned: 0, wordsReviewed: 0, correctCount: 0, incorrectCount: 0, totalTimeSpent: 0 });
  }
  return stats;
}

/* ---- Streak ---- */

async function updateStreak() {
  const today = todayISO();
  const lastActive = await getSetting('lastActiveDate', '');
  const currentStreak = await getSetting('streak', 0);

  if (lastActive === today) return currentStreak;

  if (lastActive) {
    const lastDate = new Date(lastActive);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - lastDate) / 86400000);

    if (diffDays === 1) {
      await setSetting('streak', currentStreak + 1);
    } else if (diffDays > 1) {
      await setSetting('streak', 1);
    }
  } else {
    await setSetting('streak', 1);
  }

  await setSetting('lastActiveDate', today);
  return await getSetting('streak', 0);
}

/* ---- Settings defaults ---- */

async function initSettings() {
  const defaults = {
    dailyNewWordGoal: '10',
    reviewBatchSize: '20',
    ttsEnabled: 'true',
    ttsRate: '0.9',
    quizSize: '10',
    themeColor: '#4A90D9',
    vocabularyLoaded: false,
    onboardingComplete: false,
    streak: 0,
    lastActiveDate: ''
  };

  for (const [key, value] of Object.entries(defaults)) {
    const exists = await db.settings.get(key);
    if (!exists) {
      await db.settings.put({ key, value });
    }
  }
}
