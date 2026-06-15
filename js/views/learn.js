/* ============================
   不背日语 — Learn Flow v6
   固定10词/组, 答对3次毕业, 答错回炉, 点击空白发音
   ============================ */

let learnSession = null;

const GRADS = [
  'linear-gradient(160deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(160deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(160deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(160deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(160deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(160deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(160deg, #0F2027 0%, #203A43 40%, #2C5364 100%)',
  'linear-gradient(160deg, #8E2DE2 0%, #4A00E0 100%)',
  'linear-gradient(160deg, #f12711 0%, #f5af19 100%)',
  'linear-gradient(160deg, #11998e 0%, #38ef7d 100%)',
];

async function getStoredBatch() {
  const raw = await getSetting('learnBatchIds', '');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function saveStoredBatch(ids) {
  await setSetting('learnBatchIds', JSON.stringify(ids));
}

async function renderLearnFlow() {
  const batchSize = 10;
  const allWords = await db.words.toArray();
  const allStates = await db.learningState.toArray();
  const stateMap = {};
  allStates.forEach(s => { stateMap[s.wordId] = s; });

  // Try to load existing batch
  let storedIds = await getStoredBatch();
  let batchWords = [];

  if (storedIds.length > 0) {
    // Filter: words still in learning (not graduated, not mastered)
    batchWords = storedIds
      .map(id => allWords.find(w => w.localId === id))
      .filter(w => {
        if (!w) return false;
        const s = stateMap[w.localId];
        if (!s) return true; // no state yet = fresh
        if (s.status === 'mastered') return false;
        if (s.status === 'review' && (s.learnStreak || 0) >= 3) return false;
        return (s.learnStreak || 0) < 3;
      });
  }

  // If no stored batch or all graduated, pick new words
  if (batchWords.length === 0) {
    // Get words in learning pool: status = 'new' or 'learning', learnStreak < 3
    const existingIds = new Set(allStates.map(s => s.wordId));
    const poolWords = allWords.filter(w => {
      if (!existingIds.has(w.localId)) return true; // fresh word
      const s = stateMap[w.localId];
      if (s.status === 'mastered') return false;
      if (s.status === 'review' && (s.learnStreak || 0) >= 3) return false;
      return (s.learnStreak || 0) < 3;
    });

    if (poolWords.length === 0) {
      return `<div class="empty-state" style="padding-top:80px;">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-title">没有需要学习的词了！</div>
        <div class="empty-state-desc">所有单词都已完成学习，去复习吧</div>
        <button class="btn btn-primary mt-md" onclick="navigate('review')">去复习</button>
      </div>`;
    }

    batchWords = shuffleArray(poolWords).slice(0, batchSize);
    await saveStoredBatch(batchWords.map(w => w.localId));
  }

  // Load existing learnStreak from DB into session counts
  const correctCounts = {};
  for (const w of batchWords) {
    const s = stateMap[w.localId];
    if (s && s.learnStreak > 0) {
      correctCounts[w.localId] = s.learnStreak;
    }
  }

  learnSession = {
    words: batchWords,
    currentIndex: 0,
    phase: 'question',
    correct: [],
    wrong: [],
    correctCounts: correctCounts,
    startTime: Date.now(),
    gradient: GRADS[Math.floor(Math.random() * GRADS.length)],
  };

  return renderQuestionView(learnSession);
}

/* ---- Question View ---- */
function renderQuestionView(session) {
  const word = session.words[session.currentIndex];
  const progress = session.currentIndex + 1;
  const total = session.words.length;
  const options = generateLearnOptions(word);

  const streak = session.correctCounts[word.localId] || 0;
  const streakDots = streak > 0
    ? `<div style="margin-top:4px; font-size:0.75rem; color:rgba(255,255,255,0.5);">${'●'.repeat(streak)}${'○'.repeat(3 - streak)}</div>`
    : '';

  return `
    <div class="learn-bg" style="background: ${session.gradient};"></div>
    <div class="learn-container fade-in" onclick="onTapBlankArea(event)">
      <div class="learn-progress">
        <div class="learn-progress-bar-wrap">
          <div class="learn-progress-bar-fill" style="width:${(progress/total)*100}%"></div>
        </div>
        <span class="learn-progress-text">${progress}/${total}</span>
        <button class="learn-menu-btn" onclick="event.stopPropagation(); showLearnMenu('${word.localId}')">⋯</button>
      </div>

      <div class="learn-word-display" id="learnWordDisplay">
        <div class="learn-word-jp-lg">${escapeHTML(word.japanese)}</div>
        <div class="learn-word-rd">${escapeHTML(word.reading)}</div>
        ${streakDots}
        <div class="learn-word-hint" style="margin-top:8px; color:rgba(255,255,255,0.25); font-size:0.75rem; letter-spacing:0.04em;">点按空白处听发音</div>
      </div>

      <div class="learn-options" id="learnOptions">
        ${options.map((opt, i) => `
          <button class="learn-option-btn" data-meaning="${escapeHTML(opt)}"
                  onclick="event.stopPropagation(); onLearnAnswer('${escapeHTML(opt).replace(/'/g, "\\'")}', this)"
                  style="animation-delay:${i*0.06}s">
            ${escapeHTML(opt)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

/* ---- Tap blank area → replay audio ---- */
function onTapBlankArea(e) {
  // Only trigger if clicking the container itself or the word display area
  if (e.target.closest('.learn-option-btn') || e.target.closest('.learn-menu-btn') ||
      e.target.closest('.learn-progress') || e.target.closest('#learnAudioBtn')) {
    return;
  }
  if (learnSession && learnSession.phase === 'question') {
    const word = learnSession.words[learnSession.currentIndex];
    if (word && word.reading) {
      TTS.speakWord(word.reading);
    }
  }
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
          已连续答对 <b style="color:${streak >= 3 ? '#34C759' : wasCorrect ? '#34C759' : '#FF3B30'};">${streak}/3</b> 次
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

  // Play audio immediately while still in user-gesture context
  if (isCorrect && word.reading) {
    TTS.speakWord(word.reading);
  }

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

  const existingState = await getLearningState(word.localId);
  const baseState = existingState || {
    status: 'new', easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0,
    lessonId: word.lessonId,
  };

  if (graduated) {
    // Graduate! Move to review queue & count as learned
    await updateLearningState(word.localId, {
      ...baseState,
      status: 'review',
      interval: 1,
      repetitions: 1,
      easeFactor: 2.5,
      learnStreak: streak,
      nextReviewDate: addDays(todayISO(), 1),
    });
    await logReview(word.localId, 4, 'learn', 0);
    await updateDailyStats('wordsLearned', 1);

    // Remove from stored batch
    const batchIds = await getStoredBatch();
    const updated = batchIds.filter(id => id !== word.localId);
    await saveStoredBatch(updated);
  } else if (wasCorrect) {
    // Correct but not graduated — don't count as learned yet
    await updateLearningState(word.localId, {
      ...baseState,
      status: 'learning',
      learnStreak: streak,
    });
  } else {
    // Wrong → reset streak, keep in learning
    await updateLearningState(word.localId, {
      ...baseState,
      status: 'learning',
      learnStreak: 0,
    });

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
    TTS.speakWord(word.reading);
  }
}

/* ---- Complete Screen ---- */
async function renderLearnFlowComplete() {
  const uniqueWords = [...new Set([...learnSession.correct, ...learnSession.wrong].map(w => w.localId))];
  const graduated = uniqueWords.filter(id => (learnSession.correctCounts[id] || 0) >= 3).length;
  const totalCorrect = learnSession.correct.length;
  const duration = Date.now() - learnSession.startTime;
  const bg = learnSession.gradient;

  if (graduated >= uniqueWords.length * 0.5) {
    setTimeout(showConfetti, 300);
  }

  await updateStreak();
  const streak = await getSetting('streak', 0);
  const reviewSummary = await getReviewQueueSummary();

  // Check if stored batch is now empty
  const batchIds = await getStoredBatch();
  const allDone = batchIds.length === 0;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-complete fade-in">
      <div class="learn-complete-icon">${allDone ? '🎉' : '💪'}</div>
      <div class="learn-complete-title">${allDone ? '本组全部掌握！' : '本轮学习完成'}</div>
      <div style="opacity:0.6;">🔥 ${streak} 天连续</div>
      <div class="learn-complete-stats">
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#34C759;">${totalCorrect}</div>
          <div class="learn-complete-stat-label">正确次数</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:var(--color-primary);">${graduated}/${uniqueWords.length}</div>
          <div class="learn-complete-stat-label">已掌握 ✓3</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="font-size:1.5rem;">${formatMinutes(duration)}</div>
          <div class="learn-complete-stat-label">用时</div>
        </div>
      </div>
      ${!allDone ? `
        <div class="learn-complete-card" style="text-align:center;">
          <div style="opacity:0.7;">还有 ${uniqueWords.length - graduated} 个词需要继续练习</div>
          <button class="learn-complete-btn primary" style="width:100%; margin-top:12px;" onclick="navigate('learn')">继续学习 →</button>
        </div>
      ` : `
        <div class="learn-complete-card" style="text-align:center;">
          <div style="opacity:0.7;">待复习 ${reviewSummary.due} 词</div>
        </div>
      `}
      <div class="learn-complete-actions">
        <button class="learn-complete-btn" onclick="navigate('home')">返回首页</button>
        ${!allDone ? `` : `<button class="learn-complete-btn primary" onclick="navigate('review')">去复习</button>`}
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
  // Remove from stored batch
  const batchIds = await getStoredBatch();
  await saveStoredBatch(batchIds.filter(bid => bid !== id));
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

function setupLearnFlowListeners() {
  autoPlayLearnWord();
}
