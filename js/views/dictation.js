/* ============================
   不背日语 — Dictation View
   Listen to audio → type the word
   ============================ */

let dictationSession = null;
let dictationAnswered = false;

const DICT_GRADS = [
  'linear-gradient(160deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
  'linear-gradient(160deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
  'linear-gradient(160deg, #141E30 0%, #243B55 100%)',
  'linear-gradient(160deg, #1B1B2F 0%, #2C2C54 50%, #3D3D6B 100%)',
];

async function renderDictation() {
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));
  const allWords = await db.words.toArray();
  if (allWords.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-title">词库为空</div>
      <div class="empty-state-desc">请先导入词汇数据</div>
    </div>`;
  }

  const shuffled = shuffleArray(allWords).slice(0, dailyGoal);

  dictationSession = {
    words: shuffled,
    currentIndex: 0,
    correct: [],
    wrong: [],
    startTime: Date.now(),
    gradient: DICT_GRADS[Math.floor(Math.random() * DICT_GRADS.length)],
  };

  return renderDictationCard(dictationSession);
}

function renderDictationCard(session) {
  const word = session.words[session.currentIndex];
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
      </div>

      <div class="learn-word-display" style="margin-top:24px;">
        <div style="font-size:0.9rem; color:rgba(255,255,255,0.5); margin-bottom:20px;">听发音，输入对应的日语</div>
        <button class="learn-audio-btn" style="width:64px; height:64px; font-size:1.5rem;"
                id="dictAudioBtn"
                onclick="playDictationAudio()">
          🔊
        </button>
        <div style="margin-top:20px; font-size:0.85rem; color:rgba(255,255,255,0.4);">
          点击播放 · 可重复播放
        </div>
      </div>

      <div class="dict-input-area">
        <input type="text" class="dict-input" id="dictInput"
               placeholder="输入日语..."
               autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
               onkeydown="if(event.key==='Enter')checkDictation()">
        <button class="learn-btn learn-btn-known" style="width:100%; margin-top:12px;"
                onclick="checkDictation()">
          确认
        </button>
      </div>

      <div class="learn-detail" id="dictDetail">
        <div class="learn-detail-correct" id="dictDetailResult"></div>
        <div style="font-size:1.3rem; font-weight:700; margin:12px 0; color:rgba(255,255,255,0.95);">
          ${escapeHTML(word.japanese)}
        </div>
        <div style="font-size:1rem; color:rgba(255,255,255,0.65);">
          ${escapeHTML(word.reading)}
        </div>
        <div style="font-size:1.1rem; color:rgba(255,255,255,0.8); margin-top:8px;">
          ${escapeHTML(word.meaning)}
        </div>
        <button class="learn-btn learn-btn-known" style="width:100%; margin-top:16px;"
                onclick="onDictNext()">
          下一词 →
        </button>
      </div>
    </div>
  `;
}

function playDictationAudio() {
  if (!dictationSession) return;
  const word = dictationSession.words[dictationSession.currentIndex];
  TTS.speakWord(word.japanese);
  const btn = document.getElementById('dictAudioBtn');
  if (btn) {
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => { if (btn) btn.style.transform = ''; }, 300);
  }
}

function checkDictation() {
  if (!dictationSession || dictationAnswered) return;
  dictationAnswered = true;

  const word = dictationSession.words[dictationSession.currentIndex];
  const input = document.getElementById('dictInput');
  const userAnswer = input ? input.value.trim() : '';

  // Compare: check against both japanese and reading
  const isCorrect = userAnswer === word.japanese ||
                    userAnswer === word.reading ||
                    userAnswer === word.japanese.replace(/[・、。「」]/g, '');

  const detail = document.getElementById('dictDetail');
  const result = document.getElementById('dictDetailResult');
  if (detail) detail.classList.add('show');
  if (result) {
    result.textContent = isCorrect ? '✓ 正确！' : '✗ 不对哦';
    result.style.color = isCorrect ? '#34C759' : '#FF3B30';
  }

  if (isCorrect) dictationSession.correct.push(word);
  else dictationSession.wrong.push(word);

  if (input) input.disabled = true;
}

async function onDictNext() {
  const word = dictationSession.words[dictationSession.currentIndex];
  const isCorrect = dictationSession.correct.includes(word);
  await rateWord(word.localId, isCorrect ? 4 : 1, 'quiz', 0);

  dictationSession.currentIndex++;
  dictationAnswered = false;

  if (dictationSession.currentIndex >= dictationSession.words.length) {
    await renderDictationComplete();
  } else {
    if (dictationSession.currentIndex % 5 === 0) {
      dictationSession.gradient = DICT_GRADS[Math.floor(Math.random() * DICT_GRADS.length)];
    }
    const app = document.getElementById('app');
    app.innerHTML = renderDictationCard(dictationSession);
  }
}

async function renderDictationComplete() {
  const total = dictationSession.words.length;
  const correct = dictationSession.correct.length;
  const wrong = dictationSession.wrong.length;
  const accuracy = Math.round((correct / total) * 100);
  const bg = dictationSession.gradient;

  if (accuracy >= 80) setTimeout(showConfetti, 300);

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="learn-complete fade-in">
      <div class="learn-complete-icon">${accuracy >= 80 ? '🎉' : '💪'}</div>
      <div class="learn-complete-title">听写完成</div>
      <div class="learn-complete-stats">
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#34C759;">${correct}</div>
          <div class="learn-complete-stat-label">正确</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="color:#FF3B30;">${wrong}</div>
          <div class="learn-complete-stat-label">错误</div>
        </div>
        <div class="learn-complete-stat">
          <div class="learn-complete-stat-val" style="font-size:1.5rem;">${accuracy}%</div>
          <div class="learn-complete-stat-label">正确率</div>
        </div>
      </div>
      <div class="learn-complete-actions">
        <button class="learn-complete-btn" onclick="navigate('home')">返回首页</button>
        <button class="learn-complete-btn primary" onclick="navigate('dictation')">再来一组</button>
      </div>
    </div>
  `;
}

function setupDictationListeners() {
  // Auto-play audio on load
  setTimeout(() => playDictationAudio(), 500);
}
