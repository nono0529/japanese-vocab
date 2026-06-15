/* ============================
   不背日语 — SRS Review View v2
   不背单词 Style · Brighter gradients
   ============================ */

let reviewSession = null;
let reviewRevealed = false;

const REVIEW_GRADIENTS = [
  'linear-gradient(160deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(160deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(160deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(160deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(160deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(160deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(160deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
  'linear-gradient(160deg, #8E2DE2 0%, #4A00E0 100%)',
];

async function renderReviewFlow() {
  const batchSize = parseInt(await getSetting('reviewBatchSize', '20'));
  const dueWordsState = await getWordsDueForReview(batchSize);

  const dueWords = [];
  for (const state of dueWordsState) {
    const word = await getWord(state.wordId);
    if (word) {
      dueWords.push({ ...word, state });
    }
  }

  if (dueWords.length === 0) {
    return `
      <div class="empty-state" style="padding-top:80px;">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-title">没有需要复习的单词！</div>
        <div class="empty-state-desc">太棒了，今天不需要复习。学点新词吧！</div>
        <button class="btn btn-primary mt-md" onclick="navigate('home')">去学习</button>
      </div>
    `;
  }

  reviewSession = {
    words: dueWords,
    currentIndex: 0,
    ratings: [],
    startTime: Date.now(),
    gradient: REVIEW_GRADIENTS[Math.floor(Math.random() * REVIEW_GRADIENTS.length)],
  };

  reviewRevealed = false;

  return renderReviewCard(reviewSession);
}

function renderReviewCard(session) {
  const word = session.words[session.currentIndex];
  const progress = session.currentIndex + 1;
  const total = session.words.length;
  const bg = session.gradient;

  const statusLabel = word.state.status === 'learning' ? '新学' : '复习';
  const lapseInfo = word.state.lapses > 0 ? ` · 遗忘${word.state.lapses}次` : '';

  return `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-container fade-in">
      <!-- Progress -->
      <div class="learn-progress">
        <div class="learn-progress-bar-wrap">
          <div class="learn-progress-bar-fill" style="width:${(progress / total) * 100}%"></div>
        </div>
        <span class="learn-progress-text">${progress}/${total}</span>
        <button class="learn-menu-btn" onclick="event.stopPropagation(); showLearnMenu('${word.localId}')">⋯</button>
      </div>

      <!-- Status info -->
      <div style="text-align:center; padding-top:4px;">
        <span style="font-size:0.8rem; color:rgba(255,255,255,0.5);">
          ${statusLabel} · 第${word.lessonId}課${lapseInfo}
        </span>
      </div>

      <!-- Word Area -->
      <div class="learn-word-area" id="reviewWordArea" onclick="revealReviewMeaning()">
        <div class="learn-word-japanese">${escapeHTML(word.japanese)}</div>
        <div class="learn-word-reading">${escapeHTML(word.reading)}</div>
        ${word.partOfSpeech ? `
          <div class="learn-word-pos">
            <span class="learn-word-pos-badge">${escapeHTML(word.partOfSpeech)}</span>
          </div>
        ` : ''}
        <div class="learn-word-hint" id="reviewHint">轻触屏幕 回想答案</div>
      </div>

      <!-- Meaning reveal -->
      <div class="learn-reveal-area" id="reviewRevealArea">
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
        <button class="learn-audio-btn" id="reviewAudioBtn"
                onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.reading).replace(/'/g, "\\'")}')">
          🔊
        </button>
      </div>

      <!-- Rating buttons (visible after reveal) -->
      <div class="learn-actions" id="reviewActions">
        <button class="learn-btn learn-btn-unknown" style="font-size:0.9rem;" onclick="onReviewRate(1)">
          忘记了
        </button>
        <button class="learn-btn" style="flex:1; padding:16px; border:none; border-radius:14px; font-size:0.9rem; font-weight:600; font-family:var(--font-mixed); cursor:pointer; background:rgba(255,255,255,0.18); color:rgba(255,255,255,0.85); transition:all var(--transition-fast); letter-spacing:0.02em;" onclick="onReviewRate(3)">
          模糊
        </button>
        <button class="learn-btn learn-btn-known" style="font-size:0.9rem;" onclick="onReviewRate(5)">
          记得
        </button>
      </div>
    </div>
  `;
}

function revealReviewMeaning() {
  if (reviewRevealed) return;
  reviewRevealed = true;

  const revealArea = document.getElementById('reviewRevealArea');
  const actions = document.getElementById('reviewActions');
  const hint = document.getElementById('reviewHint');

  if (revealArea) revealArea.classList.add('show');
  if (actions) actions.classList.add('show');
  if (hint) hint.style.opacity = '0';

  // Auto-play pronunciation on reveal
  const word = reviewSession.words[reviewSession.currentIndex];
  if (word && word.reading) {
    setTimeout(() => TTS.speakWord(word.reading), 300);
  }
}

function setupReviewCardListener() {
  reviewRevealed = false;
}

async function onReviewRate(quality) {
  if (!reviewSession || !reviewRevealed) return;

  const word = reviewSession.words[reviewSession.currentIndex];

  await rateWord(word.localId, quality, 'review', 0);

  reviewSession.ratings.push({ word, quality });
  reviewSession.currentIndex++;

  if (reviewSession.currentIndex >= reviewSession.words.length) {
    await renderReviewComplete();
  } else {
    reviewRevealed = false;
    if (reviewSession.currentIndex % 5 === 0) {
      reviewSession.gradient = REVIEW_GRADIENTS[Math.floor(Math.random() * REVIEW_GRADIENTS.length)];
    }
    const app = document.getElementById('app');
    app.innerHTML = renderReviewCard(reviewSession);
  }
}

async function renderReviewComplete() {
  const total = reviewSession.words.length;
  const correct = reviewSession.ratings.filter(r => r.quality >= 3).length;
  const incorrect = total - correct;
  const accuracy = Math.round((correct / total) * 100);
  const bg = reviewSession.gradient;

  if (accuracy >= 80) setTimeout(showConfetti, 300);

  await updateStreak();
  const streak = await getSetting('streak', 0);

  const tomorrow = await getWordsDueForReview(100);
  const tomorrowCount = tomorrow.length;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-complete fade-in">
      <div class="learn-complete-icon">${accuracy >= 80 ? '🎉' : '💪'}</div>
      <div class="learn-complete-title">复习完成</div>
      <div style="font-size:1.1rem; opacity:0.7; margin-bottom:8px;">🔥 ${streak} 天连续</div>

      <div class="learn-complete-stats">
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#34C759;">${correct}</div>
          <div class="learn-complete-stat-label">记得</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#FF3B30;">${incorrect}</div>
          <div class="learn-complete-stat-label">需加强</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="font-size:1.5rem; color:var(--color-primary);">${accuracy}%</div>
          <div class="learn-complete-stat-label">正确率</div>
        </div>
      </div>

      <div class="learn-complete-card">
        <div style="font-size:0.9rem; opacity:0.7;">明天约有 ${tomorrowCount} 个单词需要复习</div>
      </div>

      <div class="learn-complete-actions">
        <button class="learn-complete-btn" onclick="navigate('home')">返回首页</button>
        ${tomorrowCount > 0 ? `
          <button class="learn-complete-btn primary" onclick="navigate('review')">继续复习</button>
        ` : ''}
      </div>
    </div>
  `;
}
