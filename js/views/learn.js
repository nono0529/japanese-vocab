/* ============================
   不背日语 — Learn Flow v3
   不背单词 Style: 10词/组, 答对3次毕业, 自动发音, 结果页
   ============================ */

let learnSession = null;

const GRADS = [
  'linear-gradient(160deg, #0F2027 0%, #203A43 40%, #2C5364 100%)',
  'linear-gradient(160deg, #1A1A2E 0%, #16213E 40%, #0F3460 100%)',
  'linear-gradient(160deg, #141E30 0%, #243B55 100%)',
  'linear-gradient(160deg, #1B1B2F 0%, #2C2C54 40%, #3D3D6B 100%)',
  'linear-gradient(160deg, #0C0C1D 0%, #1A1A3E 40%, #16213E 100%)',
  'linear-gradient(160deg, #2C3E50 0%, #1A252F 100%)',
  'linear-gradient(160deg, #0D1525 0%, #1A2840 40%, #243D58 100%)',
  'linear-gradient(160deg, #121A2A 0%, #1C2D48 40%, #2A4060 100%)',
];

async function renderLearnFlow() {
  const batchSize = 10; // 10 words per batch like 不背单词
  const newWordIds = new Set(
    (await db.learningState.where('status').equals('new').toArray()).map(s => s.wordId)
  );
  const allWords = await db.words.toArray();
  const newWords = allWords.filter(w => newWordIds.has(w.localId));

  if (newWords.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">🎉</div>
      <div class="empty-state-title">没有新词了！</div>
      <div class="empty-state-desc">所有单词都已学过，去复习吧</div>
      <button class="btn btn-primary mt-md" onclick="navigate('home')">返回首页</button>
    </div>`;
  }

  const batch = shuffleArray(newWords).slice(0, batchSize);

  learnSession = {
    words: batch,
    currentIndex: 0,
    phase: 'question', // 'question' | 'result'
    correct: [],
    wrong: [],
    correctCounts: {},  // wordId -> consecutive correct count
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

/* ---- Result View (after answering) ---- */
function renderResultView(session) {
  const word = session.words[session.currentIndex];
  const wasCorrect = session.lastCorrect;
  const progress = session.currentIndex + 1;
  const total = session.words.length;

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
      <button class="learn-next-btn" onclick="onLearnContinue()">
        ${session.currentIndex + 1 >= session.words.length ? '完成学习 →' : '下一词 →'}
      </button>
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

  // Track
  learnSession.lastCorrect = isCorrect;
  if (isCorrect) {
    learnSession.correct.push(word);
    learnSession.correctCounts[word.localId] = (learnSession.correctCounts[word.localId] || 0) + 1;
  } else {
    learnSession.wrong.push(word);
    learnSession.correctCounts[word.localId] = 0;
  }

  learnSession.phase = 'result';

  // Transition to result view after brief delay
  setTimeout(() => {
    const app = document.getElementById('app');
    app.innerHTML = renderResultView(learnSession);
  }, 350);
}

/* ---- Continue to Next Word ---- */
async function onLearnContinue() {
  const word = learnSession.words[learnSession.currentIndex];
  const correctCount = learnSession.correctCounts[word.localId] || 0;
  const graduated = correctCount >= 3;

  // Apply SM-2: quality 4 for correct, 1 for wrong
  const quality = learnSession.lastCorrect ? 4 : 1;
  await rateWord(word.localId, quality, 'learn', 0);

  // If graduated (3 correct), set proper review interval (not today)
  if (graduated) {
    const state = await getLearningState(word.localId);
    if (state) {
      await updateLearningState(word.localId, {
        ...state,
        status: 'learning',
        interval: 1,
        repetitions: 1,
        nextReviewDate: addDays(todayISO(), 1), // Review tomorrow, not today
      });
    }
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
  }
}

/* ---- Complete Screen ---- */
async function renderLearnFlowComplete() {
  const total = learnSession.words.length;
  const known = learnSession.correct.length;
  const unknown = learnSession.wrong.length;
  const duration = Date.now() - learnSession.startTime;
  const bg = learnSession.gradient;

  if (known >= total * 0.7) setTimeout(showConfetti, 300);
  await updateStreak();
  const streak = await getSetting('streak', 0);
  const reviewSummary = await getReviewQueueSummary();

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-complete fade-in">
      <div class="learn-complete-icon">${known >= total * 0.7 ? '🎉' : '💪'}</div>
      <div class="learn-complete-title">本组学习完成</div>
      <div style="opacity:0.6;">🔥 ${streak} 天连续</div>
      <div class="learn-complete-stats">
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#34C759;">${known}</div>
          <div class="learn-complete-stat-label">正确</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#FF3B30;">${unknown}</div>
          <div class="learn-complete-stat-label">需加强</div>
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
  const menu = document.createElement('div');
  menu.className = 'learn-popup-menu';
  menu.innerHTML = `
    <div class="learn-popup-item" onclick="markWordKnown('${wordId}'); this.parentElement.remove();">✅ 标记为熟词</div>
    <div class="learn-popup-item" onclick="this.parentElement.remove();">📋 加入生词本</div>
    <div class="learn-popup-item" style="color:rgba(255,255,255,0.4);" onclick="this.parentElement.remove();">取消</div>
  `;
  document.body.appendChild(menu);
  menu.addEventListener('click', (e) => { if (e.target === menu) menu.remove(); });
  setTimeout(() => menu.classList.add('show'), 10);
}

async function markWordKnown(wordId) {
  const id = parseInt(wordId);
  const word = await db.words.get(id);
  if (!word) return;
  await updateLearningState(id, {
    status: 'mastered',
    interval: 30, repetitions: 5, easeFactor: 2.5,
    nextReviewDate: addDays(todayISO(), 30), lapses: 0,
    lessonId: word.lessonId
  });
  showToast('已标记为熟词');
}

function setupLearnFlowListeners() {
  // Auto-play TTS when card loads
  setTimeout(() => {
    if (learnSession && learnSession.phase === 'question') {
      const word = learnSession.words[learnSession.currentIndex];
      if (word && word.reading) TTS.speakWord(word.reading);
    }
  }, 400);
}
