/* ============================
   不背日语 — SM-2 Spaced Repetition Algorithm
   ============================ */

/**
 * Calculate the next review state using the SM-2 algorithm.
 *
 * quality: 0-5 integer
 *   0 = complete blackout (no recall at all)
 *   1 = incorrect, but correct answer looked familiar
 *   2 = incorrect, but correct answer was easy to recall after seeing it
 *   3 = correct, but required serious effort
 *   4 = correct, after some hesitation
 *   5 = perfect, instant recall
 *
 * Returns updated: { easeFactor, interval, repetitions, nextReviewDate, status, lapses }
 */
function calculateNextReview(currentState, quality) {
  const {
    easeFactor = 2.5,
    interval = 0,
    repetitions = 0,
    lapses = 0,
    learnStreak = 0
  } = currentState;

  let newInterval, newRepetitions, newLapses = lapses;

  if (quality >= 3) {
    // CORRECT response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // INCORRECT response — reset
    newRepetitions = 0;
    newInterval = 1;
    newLapses = lapses + 1;
  }

  // Update ease factor (SM-2 formula)
  let newEase = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEase = Math.max(1.3, newEase); // Minimum ease factor

  // Calculate next review date
  const nextReviewDate = addDays(todayISO(), newInterval);

  // Determine new status
  let status;
  if (newRepetitions >= 5 && newInterval >= 21) {
    status = 'mastered';
  } else if (newRepetitions >= 1) {
    status = 'review';
  } else {
    status = 'learning';
  }

  // Leech detection: 5+ consecutive lapses
  const isLeech = newLapses >= 5;

  return {
    easeFactor: newEase,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate,
    status,
    lapses: newLapses,
    learnStreak,
    isLeech
  };
}

/**
 * Complete a rating for a word: log to history, update learning state with SM-2,
 * update daily stats.
 */
async function rateWord(wordId, quality, mode, timeSpent = 0) {
  const currentState = await getLearningState(wordId);
  if (!currentState) return null;

  const nextState = calculateNextReview(currentState, quality);

  await updateLearningState(wordId, nextState);
  await logReview(wordId, quality, mode, timeSpent);

  // Update daily stats
  if (mode === 'learn') {
    await updateDailyStats('wordsLearned', 1);
  } else {
    await updateDailyStats('wordsReviewed', 1);
  }
  await updateDailyStats(quality >= 3 ? 'correctCount' : 'incorrectCount', 1);
  if (timeSpent > 0) {
    await updateDailyStats('totalTimeSpent', timeSpent);
  }

  return nextState;
}

/**
 * Get words for new learning session.
 */
async function getWordsToLearn(lessonId, count = 10) {
  return getNewWords(lessonId, count);
}

/**
 * Check if there are words due for review today.
 */
async function hasDueReviews() {
  const summary = await getReviewQueueSummary();
  return summary.due > 0;
}

/**
 * Quality label mapping for UI display.
 */
const QUALITY_LABELS = [
  { label: '完全忘记', short: '忘记', color: '#FF4D4F' },
  { label: '模糊记得', short: '模糊', color: '#FF7875' },
  { label: '想起答案', short: '想起', color: '#FFA940' },
  { label: '困难想起', short: '困难', color: '#FADB14' },
  { label: '犹豫想起', short: '犹豫', color: '#73D13D' },
  { label: '瞬间想起', short: '瞬间', color: '#52C41A' }
];

function getQualityLabel(quality) {
  return QUALITY_LABELS[quality] || QUALITY_LABELS[0];
}
