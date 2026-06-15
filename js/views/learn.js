/* ============================
   不背日语 — New Word Learning View
   ============================ */

let learnSession = null;

async function renderLearn(lessonId) {
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));
  const words = await getWordsToLearn(lessonId, dailyGoal);

  const lessonTitles = {
    1: '第1課 初対面', 2: '第2課 私の家族', 3: '第3課 私の寮', 4: '第4課 私の一日',
    5: '第5課 好きな音楽', 6: '第6課 外出', 7: '第7課 買い物', 8: '第8課 プレゼント',
    9: '第9課 スポーツ', 10: '第10課 料理', 11: '第11課 着物', 12: '第12課 計画',
    13: '第13課 思い出', 14: '第14課 見物'
  };

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

  // Initialize session
  learnSession = {
    lessonId,
    words,
    currentIndex: 0,
    known: [],
    unknown: [],
    batchStartTime: Date.now(),
    lessonTitle: lessonTitles[lessonId] || `第${lessonId}課`,
  };

  return renderLearnCard(learnSession);
}

function renderLearnCard(session) {
  const word = session.words[session.currentIndex];
  const progress = session.currentIndex + 1;
  const total = session.words.length;

  return `
    <div class="learn-screen fade-in">
      <!-- Progress -->
      <div style="padding:0 var(--space-md); margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:0.85rem; color:var(--color-text-secondary);">${session.lessonTitle}</span>
          <span style="font-size:0.85rem; font-weight:600;">${progress} / ${total}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width:${(progress / total) * 100}%"></div>
        </div>
      </div>

      <!-- Flashcard -->
      <div style="padding:0 var(--space-md);">
        <div class="card-flip" style="height:320px;">
          <div class="card-flip-inner" id="learnCard"
               data-word-id="${word.localId}"
               data-flipped="false">
            <!-- Front: Japanese -->
            <div class="card-front">
              <div style="text-align:center;">
                <div style="font-size:2rem; font-weight:700; font-family:var(--font-jp); margin-bottom:8px;">
                  ${escapeHTML(word.japanese)}
                </div>
                <div style="font-size:1rem; font-family:var(--font-jp); color:var(--color-text-secondary);">
                  ${escapeHTML(word.reading)}
                </div>
                ${word.partOfSpeech ? `
                  <div style="margin-top:8px;">
                    <span class="badge badge-new">${escapeHTML(word.partOfSpeech)}</span>
                  </div>
                ` : ''}
                <div style="margin-top:24px; font-size:0.85rem; color:var(--color-text-light);">
                  👆 点击翻转 或 左右滑动
                </div>
              </div>
              <button class="btn btn-ghost btn-small" style="position:absolute; top:8px; right:8px;"
                      onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.japanese).replace(/'/g, "\\'")}')">
                🔊
              </button>
            </div>

            <!-- Back: Meaning + Example -->
            <div class="card-back">
              <div style="text-align:center;">
                <div style="font-size:1.5rem; font-weight:600; margin-bottom:8px;">
                  ${escapeHTML(word.meaning)}
                </div>
                ${word.exampleSentence ? `
                  <div style="margin-top:16px; padding:12px; background:var(--color-bg); border-radius:var(--radius-sm); text-align:left;">
                    <div style="font-size:0.9rem; font-family:var(--font-jp); margin-bottom:4px;">
                      ${escapeHTML(word.exampleSentence)}
                    </div>
                    ${word.exampleReading ? `
                      <div style="font-size:0.8rem; font-family:var(--font-jp); color:var(--color-text-secondary); margin-bottom:4px;">
                        ${escapeHTML(word.exampleReading)}
                      </div>
                    ` : ''}
                    <div style="font-size:0.85rem; color:var(--color-text-secondary);">
                      ${escapeHTML(word.exampleMeaning)}
                    </div>
                  </div>
                ` : ''}
              </div>
              <button class="btn btn-ghost btn-small" style="position:absolute; top:8px; right:8px;"
                      onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.japanese).replace(/'/g, "\\'")}')">
                🔊
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Buttons -->
      <div style="display:flex; gap:16px; padding:16px var(--space-md);">
        <button class="btn btn-danger btn-block" style="flex:1; padding:16px;"
                onclick="onLearnUnknown()">
          ✗ 不认识
        </button>
        <button class="btn btn-success btn-block" style="flex:1; padding:16px;"
                onclick="onLearnKnown()">
          ✓ 认识
        </button>
      </div>
    </div>
  `;
}

function setupLearnCardListeners() {
  const cardInner = document.querySelector('#learnCard');
  if (!cardInner) return;

  // Tap to flip
  cardInner.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    cardInner.classList.toggle('flipped');
  });

  // Swipe gestures
  setupSwipe(cardInner,
    () => onLearnUnknown(),  // swipe left = don't know
    () => onLearnKnown()     // swipe right = know
  );
}

async function onLearnKnown() {
  if (!learnSession) return;
  const word = learnSession.words[learnSession.currentIndex];

  // Mark as known, set initial learning state
  await rateWord(word.localId, 3, 'learn', 0);
  // Update to learning status with first review tomorrow
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
  await showFeedbackAndNext(true);
}

async function onLearnUnknown() {
  if (!learnSession) return;
  const word = learnSession.words[learnSession.currentIndex];

  // Mark as still new (quality 1 = incorrect)
  await rateWord(word.localId, 1, 'learn', 0);

  learnSession.unknown.push(word);
  await showFeedbackAndNext(false);
}

async function showFeedbackAndNext(isCorrect) {
  await new Promise(resolve => {
    showRatingFeedback(isCorrect ? 4 : 1, resolve);
  });

  learnSession.currentIndex++;

  if (learnSession.currentIndex >= learnSession.words.length) {
    // Session complete
    await renderLearnComplete();
  } else {
    // Next card
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

  // Update lesson progress
  const progress = await getLessonProgress(learnSession.lessonId);

  // Show mini celebration
  if (known >= total * 0.7) {
    setTimeout(showConfetti, 300);
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="scale-in" style="text-align:center; padding:var(--space-xl) var(--space-md);">
      <div style="font-size:3rem; margin-bottom:12px;">${known >= total * 0.7 ? '🎉' : '📚'}</div>
      <h2>本组学习完成！</h2>
      <div style="display:flex; justify-content:center; gap:32px; margin:20px 0;">
        <div>
          <div style="font-size:2rem; font-weight:700; color:var(--color-success);">${known}</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">认识</div>
        </div>
        <div>
          <div style="font-size:2rem; font-weight:700; color:var(--color-danger);">${unknown}</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">不认识</div>
        </div>
        <div>
          <div style="font-size:1.5rem; font-weight:700; color:var(--color-text-secondary);">${formatMinutes(duration)}</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">用时</div>
        </div>
      </div>

      <div class="card" style="margin-top:16px; text-align:center;">
        <div style="font-size:0.9rem; color:var(--color-text-secondary);">
          ${learnSession.lessonTitle}
        </div>
        <div class="progress-bar" style="margin-top:8px;">
          <div class="progress-bar-fill" style="width:${progress.progress}%"></div>
        </div>
        <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:4px;">
          本课进度 ${progress.learnedWords}/${progress.totalWords}
        </div>
      </div>

      <div style="display:flex; gap:12px; margin-top:20px; justify-content:center;">
        <button class="btn btn-outline" onclick="navigate('lesson', {lessonId: ${learnSession.lessonId}})">
          返回课程
        </button>
        <button class="btn btn-primary" onclick="navigate('quiz', {lessonId: ${learnSession.lessonId}})">
          测试一下 📝
        </button>
      </div>
    </div>
  `;
}

// setupLearnCardListeners is called by app.js setupCurrentView
