/* ============================
   不背日语 — Learn Flow (不背单词 Style)
   See word → pick meaning → see details → next
   ============================ */

let learnSession = null;

const LEARN_GRADS = [
  'linear-gradient(160deg, #0b1a2a 0%, #142d42 40%, #1e4d5c 100%)',
  'linear-gradient(160deg, #1a1a30 0%, #1e2a4a 40%, #2d4a6e 100%)',
  'linear-gradient(160deg, #0f1729 0%, #1a2740 40%, #283b5c 100%)',
  'linear-gradient(160deg, #121a2a 0%, #1c2d48 40%, #2a4060 100%)',
  'linear-gradient(160deg, #0d1525 0%, #1a2840 40%, #243d58 100%)',
  'linear-gradient(160deg, #141e30 0%, #1f3248 40%, #2e4a64 100%)',
  'linear-gradient(160deg, #0a1622 0%, #152838 40%, #1d3e50 100%)',
  'linear-gradient(160deg, #111d2e 0%, #1c2e46 40%, #29405c 100%)',
];

async function renderLearnFlow() {
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));
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

  const shuffled = shuffleArray(newWords).slice(0, dailyGoal);

  learnSession = {
    words: shuffled,
    currentIndex: 0,
    answered: false,
    known: [],
    unknown: [],
    startTime: Date.now(),
    gradient: LEARN_GRADS[Math.floor(Math.random() * LEARN_GRADS.length)],
  };

  return renderLearnCard(learnSession);
}

function renderLearnCard(session) {
  const word = session.words[session.currentIndex];
  const progress = session.currentIndex + 1;
  const total = session.words.length;
  const bg = session.gradient;
  const options = generateLearnOptions(word);

  return `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-container fade-in">
      <div class="learn-progress">
        <div class="learn-progress-bar-wrap">
          <div class="learn-progress-bar-fill" style="width:${(progress/total)*100}%"></div>
        </div>
        <span class="learn-progress-text">${progress}/${total}</span>
      </div>

      <div class="learn-word-display">
        <div class="learn-word-jp-lg">${escapeHTML(word.japanese)}</div>
        <div class="learn-word-rd">${escapeHTML(word.reading)}</div>
        <button class="learn-audio-btn" style="margin-top:12px;"
                onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.japanese).replace(/'/g, "\\'")}')">
          🔊 发音
        </button>
      </div>

      <div class="learn-options" id="learnOptions">
        ${options.map((opt, i) => `
          <button class="learn-option-btn" data-meaning="${escapeHTML(opt)}"
                  onclick="onLearnChoice('${escapeHTML(opt).replace(/'/g, "\\'")}', this)"
                  style="animation-delay:${i*0.05}s">
            ${escapeHTML(opt)}
          </button>
        `).join('')}
      </div>

      <div class="learn-detail" id="learnDetail">
        <div class="learn-detail-correct" id="learnDetailCorrect"></div>
        <div class="learn-meaning-text" style="font-size:1.3rem; margin:12px 0;">${escapeHTML(word.meaning)}</div>
        ${word.exampleSentence ? `
          <div class="learn-example-box">
            <div class="learn-example-jp">${escapeHTML(word.exampleSentence)}</div>
            ${word.exampleReading ? `<div class="learn-example-reading">${escapeHTML(word.exampleReading)}</div>` : ''}
            ${word.exampleMeaning ? `<div class="learn-example-cn">${escapeHTML(word.exampleMeaning)}</div>` : ''}
          </div>
        ` : ''}
        <button class="learn-btn learn-btn-known" style="width:100%; margin-top:16px;"
                onclick="onLearnNextWord()">
          下一词 →
        </button>
      </div>
    </div>
  `;
}

function generateLearnOptions(word) {
  const allMeanings = learnSession.words
    .filter(w => w.localId !== word.localId && w.meaning !== word.meaning)
    .map(w => w.meaning);
  const unique = [...new Set(allMeanings)];
  const distractors = shuffleArray(unique).slice(0, 3);
  while (distractors.length < 3) distractors.push('（不确定）');
  return shuffleArray([word.meaning, ...distractors]);
}

function onLearnChoice(choice, btnEl) {
  if (learnSession.answered) return;
  learnSession.answered = true;

  const word = learnSession.words[learnSession.currentIndex];
  const isCorrect = choice === word.meaning;

  const allBtns = document.querySelectorAll('.learn-option-btn');
  allBtns.forEach(b => {
    b.style.pointerEvents = 'none';
    if (b.dataset.meaning === word.meaning) {
      b.style.borderColor = '#34C759';
      b.style.background = 'rgba(52,199,89,0.2)';
      b.style.color = '#34C759';
    } else if (b === btnEl && !isCorrect) {
      b.style.borderColor = '#FF3B30';
      b.style.background = 'rgba(255,59,48,0.2)';
      b.style.color = '#FF3B30';
    }
  });

  const detail = document.getElementById('learnDetail');
  const correct = document.getElementById('learnDetailCorrect');
  if (detail) {
    detail.classList.add('show');
    if (correct) {
      correct.textContent = isCorrect ? '✓ 回答正确' : '✗ 回答错误';
      correct.style.color = isCorrect ? '#34C759' : '#FF3B30';
    }
  }

  if (isCorrect) learnSession.known.push(word);
  else learnSession.unknown.push(word);
}

async function onLearnNextWord() {
  const word = learnSession.words[learnSession.currentIndex];
  const quality = learnSession.known.includes(word) ? 4 : 1;

  await rateWord(word.localId, quality, 'learn', 0);
  await updateLearningState(word.localId, {
    status: 'learning', interval: 0, repetitions: 0,
    easeFactor: 2.5, nextReviewDate: todayISO(),
    lapses: quality < 3 ? 1 : 0, lessonId: word.lessonId
  });

  learnSession.currentIndex++;
  learnSession.answered = false;

  if (learnSession.currentIndex >= learnSession.words.length) {
    await renderLearnFlowComplete();
  } else {
    if (learnSession.currentIndex % 5 === 0) {
      learnSession.gradient = LEARN_GRADS[Math.floor(Math.random() * LEARN_GRADS.length)];
    }
    const app = document.getElementById('app');
    app.innerHTML = renderLearnCard(learnSession);
  }
}

async function renderLearnFlowComplete() {
  const total = learnSession.words.length;
  const known = learnSession.known.length;
  const unknown = learnSession.unknown.length;
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
      <div style="font-size:0.9rem; opacity:0.6;">🔥 ${streak} 天连续</div>
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

function setupLearnFlowListeners() {}
