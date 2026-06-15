/* ============================
   不背日语 — New Word Learning View
   不背单词 Style: Tap to reveal, beautiful gradients
   ============================ */

let learnSession = null;
let learnRevealed = false;

// Beautiful dark gradient wallpapers (不背单词 style)
const LEARN_GRADIENTS = [
  'linear-gradient(160deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
  'linear-gradient(160deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
  'linear-gradient(160deg, #141E30 0%, #243B55 100%)',
  'linear-gradient(160deg, #0B0F19 0%, #1A2333 50%, #2D4059 100%)',
  'linear-gradient(160deg, #1B1B2F 0%, #2C2C54 50%, #3D3D6B 100%)',
  'linear-gradient(160deg, #2C3E50 0%, #1A252F 100%)',
  'linear-gradient(160deg, #0C0C1D 0%, #1A1A3E 50%, #16213E 100%)',
  'linear-gradient(160deg, #232526 0%, #3A3D40 100%)',
];

function pickGradient() {
  return LEARN_GRADIENTS[Math.floor(Math.random() * LEARN_GRADIENTS.length)];
}

async function renderLearn(lessonId) {
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));
  const words = await getWordsToLearn(lessonId, dailyGoal);

  const lessonTitles = {};
  for (let i = 1; i <= 24; i++) {
    lessonTitles[i] = `第${i}課`;
  }

  if (words.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-title">本课已全部学完！</div>
        <div class="empty-state-desc">去复习已学单词，或学习其他课程吧</div>
        <button class="btn btn-primary mt-md" onclick="navigate('lessons')">返回课程</button>
      </div>
    `;
  }

  learnSession = {
    lessonId,
    words,
    currentIndex: 0,
    known: [],
    unknown: [],
    batchStartTime: Date.now(),
    lessonTitle: lessonTitles[lessonId] || `第${lessonId}課`,
    gradient: pickGradient(),
  };

  learnRevealed = false;

  return renderLearnCard(learnSession);
}

function renderLearnCard(session) {
  const word = session.words[session.currentIndex];
  const progress = session.currentIndex + 1;
  const total = session.words.length;
  const bg = session.gradient;

  return `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-container fade-in">
      <!-- Progress -->
      <div class="learn-progress">
        <div class="learn-progress-bar-wrap">
          <div class="learn-progress-bar-fill" style="width:${(progress / total) * 100}%"></div>
        </div>
        <span class="learn-progress-text">${progress}/${total}</span>
      </div>

      <!-- Word Area (tap to reveal) -->
      <div class="learn-word-area" id="learnWordArea" onclick="revealLearnMeaning()">
        <div class="learn-word-japanese">${escapeHTML(word.japanese)}</div>
        <div class="learn-word-reading">${escapeHTML(word.reading)}</div>
        ${word.partOfSpeech ? `
          <div class="learn-word-pos">
            <span class="learn-word-pos-badge">${escapeHTML(word.partOfSpeech)}</span>
          </div>
        ` : ''}
        <div class="learn-word-hint" id="learnHint">轻触屏幕 显示释义</div>
      </div>

      <!-- Reveal Area (hidden until tap) -->
      <div class="learn-reveal-area" id="learnRevealArea">
        <div class="learn-meaning-divider"></div>
        <div class="learn-meaning-text">${escapeHTML(word.meaning)}</div>
        ${word.exampleSentence ? `
          <div class="learn-example-box">
            <div class="learn-example-jp">${escapeHTML(word.exampleSentence)}</div>
            ${word.exampleReading ? `<div class="learn-example-reading">${escapeHTML(word.exampleReading)}</div>` : ''}
            ${word.exampleMeaning ? `<div class="learn-example-cn">${escapeHTML(word.exampleMeaning)}</div>` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Audio button -->
      <div style="display:flex; justify-content:center;">
        <button class="learn-audio-btn" id="learnAudioBtn"
                onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.japanese).replace(/'/g, "\\'")}')">
          🔊
        </button>
      </div>

      <!-- Action Buttons (visible after reveal) -->
      <div class="learn-actions" id="learnActions">
        <button class="learn-btn learn-btn-unknown" onclick="onLearnUnknown()">
          不认识
        </button>
        <button class="learn-btn learn-btn-known" onclick="onLearnKnown()">
          认识了
        </button>
      </div>
    </div>
  `;
}

function revealLearnMeaning() {
  if (learnRevealed) return;
  learnRevealed = true;

  const revealArea = document.getElementById('learnRevealArea');
  const actions = document.getElementById('learnActions');
  const hint = document.getElementById('learnHint');

  if (revealArea) revealArea.classList.add('show');
  if (actions) actions.classList.add('show');
  if (hint) hint.style.opacity = '0';
}

function setupLearnCardListeners() {
  learnRevealed = false;

  // Prevent horizontal swipe from triggering browser navigation
  const container = document.querySelector('.learn-container');
  if (container) {
    container.addEventListener('touchmove', function(e) {
      // Block horizontal swipe
      const touch = e.touches[0];
      if (!touch) return;
      // We allow vertical scroll, but block horizontal
      // This is handled by touch-action: pan-y in CSS
    }, { passive: true });
  }

  // TTS auto-play on card load (if setting enabled)
  (async () => {
    const autoPlay = await getSetting('autoPlayAudio', false);
    if (autoPlay && learnSession) {
      const word = learnSession.words[learnSession.currentIndex];
      setTimeout(() => TTS.speakWord(word.japanese), 400);
    }
  })();
}

async function onLearnKnown() {
  if (!learnSession || !learnRevealed) return;

  const word = learnSession.words[learnSession.currentIndex];

  await rateWord(word.localId, 3, 'learn', 0);
  await updateLearningState(word.localId, {
    status: 'learning',
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    nextReviewDate: todayISO(),
    lapses: 0,
    lessonId: learnSession.lessonId
  });

  learnSession.known.push(word);
  await advanceLearnCard();
}

async function onLearnUnknown() {
  if (!learnSession || !learnRevealed) return;

  const word = learnSession.words[learnSession.currentIndex];

  await rateWord(word.localId, 1, 'learn', 0);

  learnSession.unknown.push(word);
  await advanceLearnCard();
}

async function advanceLearnCard() {
  learnSession.currentIndex++;

  if (learnSession.currentIndex >= learnSession.words.length) {
    await renderLearnComplete();
  } else {
    learnRevealed = false;
    // Update gradient periodically
    if (learnSession.currentIndex % 5 === 0) {
      learnSession.gradient = pickGradient();
    }
    const app = document.getElementById('app');
    app.innerHTML = renderLearnCard(learnSession);
    setupLearnCardListeners();
  }
}

async function renderLearnComplete() {
  const total = learnSession.words.length;
  const known = learnSession.known.length;
  const unknown = learnSession.unknown.length;
  const duration = Date.now() - learnSession.batchStartTime;
  const bg = learnSession.gradient;

  const progress = await getLessonProgress(learnSession.lessonId);

  if (known >= total * 0.7) {
    setTimeout(showConfetti, 300);
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-complete fade-in">
      <div class="learn-complete-icon">${known >= total * 0.7 ? '🎉' : '📚'}</div>
      <div class="learn-complete-title">本组学习完成</div>

      <div class="learn-complete-stats">
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#34C759;">${known}</div>
          <div class="learn-complete-stat-label">认识</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#FF3B30;">${unknown}</div>
          <div class="learn-complete-stat-label">不认识</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="font-size:1.5rem;">${formatMinutes(duration)}</div>
          <div class="learn-complete-stat-label">用时</div>
        </div>
      </div>

      <div class="learn-complete-card">
        <div style="font-size:0.9rem; opacity:0.7;">${learnSession.lessonTitle}</div>
        <div style="display:flex; align-items:center; gap:8px; margin-top:8px; justify-content:center;">
          <div style="flex:1; height:4px; background:rgba(255,255,255,0.15); border-radius:2px; overflow:hidden;">
            <div style="height:100%; background:rgba(255,255,255,0.7); border-radius:2px; width:${progress.progress}%; transition:width 0.6s ease;"></div>
          </div>
          <span style="font-size:0.8rem; opacity:0.6;">${progress.learnedWords}/${progress.totalWords}</span>
        </div>
      </div>

      <div class="learn-complete-actions">
        <button class="learn-complete-btn" onclick="navigate('lesson', {lessonId: ${learnSession.lessonId}})">
          返回课程
        </button>
        <button class="learn-complete-btn primary" onclick="navigate('quiz', {lessonId: ${learnSession.lessonId}})">
          测验一下 📝
        </button>
      </div>
    </div>
  `;
}
