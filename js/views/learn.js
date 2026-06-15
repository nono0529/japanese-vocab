/* ============================
   不背日语 — Learn Flow v5
   不背单词 Style: 10词/组, 答对3次毕业, 答错回炉
   ============================ */

let learnSession = null;

const GRADS = [
  'linear-gradient(160deg, #0F2027 0%, #203A43 40%, #2C5364 100%)',
  'linear-gradient(160deg, #1A2980 0%, #26D0CE 100%)',
  'linear-gradient(160deg, #4CA1AF 0%, #2C3E50 100%)',
  'linear-gradient(160deg, #8E2DE2 0%, #4A00E0 100%)',
  'linear-gradient(160deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(160deg, #3A1C71 0%, #D76D77 50%, #FFAF7B 100%)',
  'linear-gradient(160deg, #1A1A2E 0%, #16213E 40%, #0F3460 100%)',
  'linear-gradient(160deg, #141E30 0%, #243B55 100%)',
  'linear-gradient(160deg, #2C3E50 0%, #3498DB 100%)',
  'linear-gradient(160deg, #0B0F19 0%, #1A2333 40%, #2D4059 100%)',
];

async function renderLearnFlow() {
  const batchSize = 10;

  // Get words in learning phase: status = 'new' or 'learning', with learnStreak < 3
  const allStates = await db.learningState.toArray();
  const learningPoolIds = new Set(
    allStates
      .filter(s => (s.status === 'new' || s.status === 'learning') && (s.learnStreak || 0) < 3)
      .map(s => s.wordId)
  );

  // Also include words that have NO learningState entry yet (fresh words)
  const allWords = await db.words.toArray();
  const existingIds = new Set(allStates.map(s => s.wordId));
  const freshWordIds = allWords.filter(w => !existingIds.has(w.localId)).map(w => w.localId);

  const poolIds = new Set([...learningPoolIds, ...freshWordIds]);
  const poolWords = allWords.filter(w => poolIds.has(w.localId));

  if (poolWords.length === 0) {
    return `<div class="empty-state" style="padding-top:80px;">
      <div class="empty-state-icon">🎉</div>
      <div class="empty-state-title">没有需要学习的词了！</div>
      <div class="empty-state-desc">所有单词都已完成学习，去复习吧</div>
      <button class="btn btn-primary mt-md" onclick="navigate('review')">去复习</button>
    </div>`;
  }

  // Prefer words with lower learnStreak, then random
  const batch = shuffleArray(poolWords).slice(0, batchSize);

  learnSession = {
    words: batch,
    currentIndex: 0,
    phase: 'question',
    correct: [],
    wrong: [],
    correctCounts: {},   // wordId -> consecutive correct count THIS session
    startTime: Date.now(),
    gradient: GRADS[Math.floor(Math.random() * GRADS.length)],
    batchNum: 1,
  };

  return renderQuestionView(learnSession);
}

/* ---- Question View ---- */
function renderQuestionView(session) {
  const word = session.words[session.currentIndex];
  const progress = session.currentIndex + 1;
  const total = session.words.length;
  const options = generateLearnOptions(word);

  // Show learnStreak indicator
  const streak = session.correctCounts[word.localId] || 0;
  const streakDots = streak > 0
    ? `<div style="margin-top:4px; font-size:0.75rem; color:rgba(255,255,255,0.5);">${'●'.repeat(streak)}${'○'.repeat(3 - streak)}</div>`
    : '';

  return `
    <div class="learn-bg" style="background: ${session.gradient};"></div>
    <div class="learn-container fade-in">
      <div class="learn-progress">
        <div class="learn-progress-bar-wrap">
          <div class="learn-progress-bar-fill" style="width:${(progress/total)*100}%"></div>
        </div>
        <span class="learn-progress-text">${progress}/${total}</span>
        <button class="learn-menu-btn" onclick="event.stopPropagation(); showLearnMenu('${word.localId}')">⋯</button>
      </div>

      <div class="learn-word-display">
        <div class="learn-word-jp-lg">${escapeHTML(word.japanese)}</div>
        <div class="learn-word-rd">${escapeHTML(word.reading)}</div>
        ${streakDots}
        <button class="learn-audio-btn" id="learnAudioBtn"
                onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.reading).replace(/'/g, "\\'")}')">
          🔊 发音
        </button>
      </div>

      <div class="learn-options" id="learnOptions">
        ${options.map((opt, i) => `
          <button class="learn-option-btn" data-meaning="${escapeHTML(opt)}"
                  onclick="onLearnAnswer('${escapeHTML(opt).replace(/'/g, "\\'")}', this)"
                  style="animation-delay:${i*0.06}s">
            ${escapeHTML(opt)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

/* ---- Result View ---- */
function renderResultView(session) {
  const word = session.words[session.currentIndex];
  const wasCorrect = session.lastCorrect;
  const progress = session.currentIndex + 1;
  const total = session.words.length;
  const streak = session.correctCounts[word.localId] || 0;

  return `
    <div class="learn-bg" style="background: ${session.gradient};"></div>
    <div class="learn-container fade-in">
      <div class="learn-progress">
        <div class="learn-progress-bar-wrap">
          <div class="learn-progress-bar-fill" style="width:${(progress/total)*100}%"></div>
        </div>
        <span class="learn-progress-text">${progress}/${total}</span>
        <button class="learn-menu-btn" onclick="event.stopPropagation(); showLearnMenu('${word.localId}')">⋯</button>
      </div>

      <!-- Result header -->
      <div class="learn-result-header ${wasCorrect ? 'correct' : 'wrong'}">
        <div class="learn-result-icon">${wasCorrect ? '✓' : '✗'}</div>
        <div class="learn-result-label">${wasCorrect ? '回答正确' : '回答错误'}</div>
      </div>

      <!-- Word + meaning -->
      <div class="learn-result-word">
        <div class="learn-word-jp-lg" style="font-size:2rem;">${escapeHTML(word.japanese)}</div>
        <div class="learn-word-rd">${escapeHTML(word.reading)}</div>
        <button class="learn-audio-btn" style="margin-top:8px;"
                onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.reading).replace(/'/g, "\\'")}')">
          🔊 发音
        </button>
        <div class="learn-meaning-big">${escapeHTML(word.meaning)}</div>
        <div style="margin-top:8px; font-size:0.85rem; color:rgba(255,255,255,0.5);">
          已连续答对 <b style="color:${wasCorrect ? '#34C759' : '#FF3B30'};">${streak}/3</b> 次
          ${streak >= 3 ? ' ✅ 已掌握' : ''}
        </div>
      </div>

      <!-- Example sentences -->
      ${word.exampleSentence ? `
        <div class="learn-result-example">
          <div class="learn-example-label">例句</div>
          <div class="learn-example-jp">${escapeHTML(word.exampleSentence)}</div>
          ${word.exampleReading ? `<div class="learn-example-reading">${escapeHTML(word.exampleReading)}</div>` : ''}
          ${word.exampleMeaning ? `<div class="learn-example-cn">${escapeHTML(word.exampleMeaning)}</div>` : ''}
        </div>
      ` : ''}

      <!-- Next button -->
      <button class="learn-next-btn" onclick="onLearnContinue()">继续 →</button>
    </div>
  `;
}

/* ---- Handling Answer ---- */
function onLearnAnswer(choice, btnEl) {
  if (learnSession.phase !== 'question') return;
  const word = learnSession.words[learnSession.currentIndex];
  const isCorrect = choice === word.meaning;

  // Highlight
  const allBtns = document.querySelectorAll('.learn-option-btn');
  allBtns.forEach(b => {
    b.style.pointerEvents = 'none';
    if (b.dataset.meaning === word.meaning) {
      b.style.borderColor = 'rgba(52,199,89,0.6)';
      b.style.background = 'rgba(52,199,89,0.15)';
      b.style.color = '#34C759';
    } else if (b === btnEl && !isCorrect) {
      b.style.borderColor = 'rgba(255,59,48,0.6)';
      b.style.background = 'rgba(255,59,48,0.15)';
      b.style.color = '#FF3B30';
    }
  });

  learnSession.lastCorrect = isCorrect;

  if (isCorrect) {
    learnSession.correct.push(word);
    learnSession.correctCounts[word.localId] = (learnSession.correctCounts[word.localId] || 0) + 1;
  } else {
    learnSession.wrong.push(word);
    learnSession.correctCounts[word.localId] = 0;
  }

  learnSession.phase = 'result';

  setTimeout(() => {
    const app = document.getElementById('app');
    app.innerHTML = renderResultView(learnSession);
  }, 350);
}

/* ---- Continue: advance or re-queue ---- */
async function onLearnContinue() {
  const word = learnSession.words[learnSession.currentIndex];
  const streak = learnSession.correctCounts[word.localId] || 0;
  const wasCorrect = learnSession.lastCorrect;
  const graduated = streak >= 3;

  // Persist learnStreak to DB
  const existingState = await getLearningState(word.localId);
  const baseState = existingState || {
    status: 'new', easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0,
    lessonId: word.lessonId,
  };

  if (graduated) {
    // Word mastered in learning phase → move to review queue
    await updateLearningState(word.localId, {
      ...baseState,
      status: 'review',
      interval: 1,
      repetitions: 1,
      easeFactor: 2.5,
      learnStreak: streak,
      nextReviewDate: addDays(todayISO(), 1),
    });
    // Log to review history for stats
    await logReview(word.localId, 4, 'learn', 0);
    await updateDailyStats('wordsLearned', 1);
  } else if (wasCorrect) {
    // Correct but not yet graduated
    await updateLearningState(word.localId, {
      ...baseState,
      status: 'learning',
      learnStreak: streak,
    });
    await updateDailyStats('wordsLearned', 1);
  } else {
    // Wrong → reset streak, keep in learning
    await updateLearningState(word.localId, {
      ...baseState,
      status: 'learning',
      learnStreak: 0,
    });
    await updateDailyStats('wordsLearned', 1);

    // Re-insert this word later in the batch for more practice
    const currentIdx = learnSession.currentIndex;
    const reinsertPos = Math.min(currentIdx + 3, learnSession.words.length);
    learnSession.words.splice(reinsertPos, 0, word);
  }

  learnSession.currentIndex++;
  learnSession.phase = 'question';

  if (learnSession.currentIndex >= learnSession.words.length) {
    await renderLearnFlowComplete();
  } else {
    if (learnSession.currentIndex % 5 === 0) {
      learnSession.gradient = GRADS[Math.floor(Math.random() * GRADS.length)];
    }
    const app = document.getElementById('app');
    app.innerHTML = renderQuestionView(learnSession);
    autoPlayLearnWord();
  }
}

/* ---- Auto-play TTS ---- */
function autoPlayLearnWord() {
  if (!learnSession || learnSession.phase !== 'question') return;
  const word = learnSession.words[learnSession.currentIndex];
  if (word && word.reading) {
    setTimeout(() => { TTS.speakWord(word.reading); }, 350);
  }
}

/* ---- Complete Screen ---- */
async function renderLearnFlowComplete() {
  const total = learnSession.correct.length + learnSession.wrong.length;
  const known = learnSession.correct.length;
  const graduated = Object.values(learnSession.correctCounts).filter(c => c >= 3).length;
  const duration = Date.now() - learnSession.startTime;
  const bg = learnSession.gradient;

  if (graduated >= learnSession.words.filter(w => (learnSession.correctCounts[w.localId] || 0) >= 3).length * 0.5) {
    setTimeout(showConfetti, 300);
  }

  await updateStreak();
  const streak = await getSetting('streak', 0);
  const reviewSummary = await getReviewQueueSummary();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-complete fade-in">
      <div class="learn-complete-icon">${graduated > 0 ? '🎉' : '💪'}</div>
      <div class="learn-complete-title">本组学习完成</div>
      <div style="opacity:0.6;">🔥 ${streak} 天连续</div>
      <div class="learn-complete-stats">
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#34C759;">${known}</div>
          <div class="learn-complete-stat-label">正确</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:var(--color-primary);">${graduated}</div>
          <div class="learn-complete-stat-label">已掌握 ✓3</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="font-size:1.5rem;">${formatMinutes(duration)}</div>
          <div class="learn-complete-stat-label">用时</div>
        </div>
      </div>
      <div class="learn-complete-card" style="text-align:center;">
        <div style="opacity:0.7;">待复习 ${reviewSummary.due} 词</div>
      </div>
      <div class="learn-complete-actions">
        <button class="learn-complete-btn" onclick="navigate('home')">返回首页</button>
        <button class="learn-complete-btn primary" onclick="navigate('review')">去复习</button>
      </div>
    </div>
  `;
}

/* ---- Helpers ---- */
function generateLearnOptions(word) {
  const allMeanings = learnSession.words
    .filter(w => w.localId !== word.localId && w.meaning !== word.meaning)
    .map(w => w.meaning);
  const unique = [...new Set(allMeanings)];
  const distractors = shuffleArray(unique).slice(0, 3);
  while (distractors.length < 3) distractors.push('（不确定）');
  return shuffleArray([word.meaning, ...distractors]);
}

function showLearnMenu(wordId) {
  const existing = document.querySelector('.learn-popup-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'learn-popup-menu';
  menu.innerHTML = `
    <div class="learn-popup-item" onclick="markWordKnown('${wordId}'); this.parentElement.remove();">✅ 标记为熟词</div>
    <div class="learn-popup-item" onclick="addToWordbook('${wordId}'); this.parentElement.remove();">📋 加入生词本</div>
    <div class="learn-popup-item" style="color:var(--color-text-secondary);" onclick="this.parentElement.remove();">取消</div>
  `;
  document.body.appendChild(menu);
  setTimeout(() => menu.classList.add('show'), 10);

  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 50);
}

async function markWordKnown(wordId) {
  const id = parseInt(wordId);
  const word = await db.words.get(id);
  if (!word) return;
  const existing = await getLearningState(id);
  await updateLearningState(id, {
    ...(existing || {}),
    status: 'mastered',
    interval: 30, repetitions: 5, easeFactor: 2.5,
    learnStreak: 3,
    nextReviewDate: addDays(todayISO(), 30), lapses: 0,
    lessonId: word.lessonId
  });
  showToast('已标记为熟词');
}

async function addToWordbook(wordId) {
  const id = parseInt(wordId);
  const existing = await getWordbookItems();
  if (!existing.includes(id)) {
    existing.push(id);
    await setSetting('wordbook', JSON.stringify(existing));
    showToast('已加入生词本');
  } else {
    showToast('已在生词本中');
  }
  const menu = document.querySelector('.learn-popup-menu');
  if (menu) menu.remove();
}

async function getWordbookItems() {
  const raw = await getSetting('wordbook', '[]');
  try { return JSON.parse(raw); } catch { return []; }
}

function setupLearnFlowListeners() {
  autoPlayLearnWord();
}
