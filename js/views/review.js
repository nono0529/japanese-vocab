/* ============================
   不背日语 — SRS Review View
   ============================ */

let reviewSession = null;

async function renderReview() {
  const batchSize = parseInt(await getSetting('reviewBatchSize', '20'));
  const dueWordsState = await getWordsDueForReview(batchSize);

  // Fetch full word data for each due word
  const dueWords = [];
  for (const state of dueWordsState) {
    const word = await getWord(state.wordId);
    if (word) {
      dueWords.push({ ...word, state });
    }
  }

  if (dueWords.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <div class="empty-state-title">没有需要复习的单词！</div>
        <div class="empty-state-desc">太棒了，今天不需要复习。学点新词吧！</div>
        <button class="btn btn-primary mt-md" onclick="navigate('lessons')">去学习</button>
      </div>
    `;
  }

  reviewSession = {
    words: dueWords,
    currentIndex: 0,
    ratings: [],
    startTime: Date.now(),
  };

  return renderReviewCard(reviewSession);
}

function renderReviewCard(session) {
  const word = session.words[session.currentIndex];
  const progress = session.currentIndex + 1;
  const total = session.words.length;

  return `
    <div class="review-screen fade-in">
      <!-- Progress -->
      <div style="padding:0 var(--space-md); margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:0.85rem; color:var(--color-text-secondary);">
            ${word.state.status === 'learning' ? '📗 学习' : '📘 复习'} · 第${word.lessonId}課
          </span>
          <span style="font-size:0.85rem; font-weight:600;">${progress} / ${total}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width:${(progress / total) * 100}%"></div>
        </div>
      </div>

      <!-- Review Card -->
      <div style="padding:0 var(--space-md);">
        <div class="card-flip" style="height:300px;">
          <div class="card-flip-inner" id="reviewCard">
            <!-- Front: Japanese (try to recall) -->
            <div class="card-front">
              <div style="text-align:center;">
                <div style="font-size:2rem; font-weight:700; font-family:var(--font-jp); margin-bottom:8px;">
                  ${escapeHTML(word.japanese)}
                </div>
                <div style="font-size:1rem; font-family:var(--font-jp); color:var(--color-text-secondary);">
                  ${escapeHTML(word.reading)}
                </div>
                <div style="margin-top:20px; font-size:0.9rem; color:var(--color-text-light);">
                  👆 点击回想答案
                </div>
              </div>
              <button class="btn btn-ghost btn-small" style="position:absolute; top:8px; right:8px;"
                      onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.japanese).replace(/'/g, "\\'")}');">
                🔊
              </button>
            </div>

            <!-- Back: Answer + Example -->
            <div class="card-back">
              <div style="text-align:center;">
                <div style="font-size:1.5rem; font-weight:600; margin-bottom:4px;">
                  ${escapeHTML(word.meaning)}
                </div>
                ${word.exampleSentence ? `
                  <div style="margin-top:12px; padding:10px; background:var(--color-bg); border-radius:var(--radius-sm); text-align:left;">
                    <div style="font-size:0.85rem; font-family:var(--font-jp);">
                      ${escapeHTML(word.exampleSentence)}
                    </div>
                    <div style="font-size:0.8rem; color:var(--color-text-secondary); margin-top:4px;">
                      ${escapeHTML(word.exampleMeaning)}
                    </div>
                  </div>
                ` : ''}
                ${word.state.lapses > 0 ? `
                  <div style="margin-top:8px; font-size:0.8rem; color:var(--color-danger);">
                    已忘记 ${word.state.lapses} 次
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Hint: tap to reveal -->
      <div style="text-align:center; margin-top:8px;">
      </div>

      <!-- Quality Rating -->
      <div style="padding:12px var(--space-md);">
        <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:8px; text-align:center;">
          你的记忆程度如何？
        </div>
        <div class="quality-buttons">
          ${[0,1,2,3,4,5].map(q => `
            <button class="quality-btn q${q}" onclick="onReviewRate(${q})">
              <span class="quality-num">${q}</span>
              <span class="quality-label">${getQualityLabel(q).short}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

async function onReviewRate(quality) {
  if (!reviewSession) return;
  const word = reviewSession.words[reviewSession.currentIndex];

  // Show feedback
  await new Promise(resolve => {
    showRatingFeedback(quality, resolve);
  });

  // Apply SM-2 algorithm
  await rateWord(word.localId, quality, 'review', 0);

  reviewSession.ratings.push({ word, quality });
  reviewSession.currentIndex++;

  if (reviewSession.currentIndex >= reviewSession.words.length) {
    await renderReviewComplete();
  } else {
    const app = document.getElementById('app');
    app.innerHTML = renderReviewCard(reviewSession);
  }
}

async function renderReviewComplete() {
  const total = reviewSession.words.length;
  const correct = reviewSession.ratings.filter(r => r.quality >= 3).length;
  const incorrect = total - correct;
  const accuracy = Math.round((correct / total) * 100);

  if (accuracy >= 80) setTimeout(showConfetti, 300);

  // Update streak
  await updateStreak();
  const streak = await getSetting('streak', 0);

  const tomorrow = await getWordsDueForReview(100);
  const tomorrowCount = tomorrow.length;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="scale-in" style="text-align:center; padding:var(--space-xl) var(--space-md);">
      <div style="font-size:3rem; margin-bottom:12px;">${accuracy >= 80 ? '🎉' : '💪'}</div>
      <h2>复习完成！</h2>
      <div class="streak-badge" style="justify-content:center; margin:8px 0;">
        🔥 ${streak} 天
      </div>

      <div style="display:flex; justify-content:center; gap:32px; margin:20px 0;">
        <div>
          <div style="font-size:2rem; font-weight:700; color:var(--color-success);">${correct}</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">正确</div>
        </div>
        <div>
          <div style="font-size:2rem; font-weight:700; color:var(--color-danger);">${incorrect}</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">需要加强</div>
        </div>
        <div>
          <div style="font-size:1.5rem; font-weight:700; color:var(--color-primary);">${accuracy}%</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">正确率</div>
        </div>
      </div>

      <div class="card" style="text-align:center; margin-top:12px;">
        <div style="font-size:0.9rem; color:var(--color-text-secondary);">
          明天约有 ${tomorrowCount} 个单词需要复习
        </div>
      </div>

      <div style="display:flex; gap:12px; margin-top:20px; justify-content:center;">
        <button class="btn btn-outline" onclick="navigate('home')">返回首页</button>
        ${tomorrowCount > 0 ? `
          <button class="btn btn-primary" onclick="navigate('review')">继续复习</button>
        ` : ''}
      </div>
    </div>
  `;
}

function setupReviewCardListener() {
  const card = document.querySelector('#reviewCard');
  if (card) {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      card.classList.toggle('flipped');
    });
  }
}
