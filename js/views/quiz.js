/* ============================
   不背日语 — Quiz View
   ============================ */

let quizSession = null;

async function renderQuiz(lessonId) {
  const quizSize = parseInt(await getSetting('quizSize', '10'));

  // Get lesson words
  const allWords = await getWordsByLesson(lessonId);
  if (allWords.length === 0) {
    return `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">本课暂无单词</div></div>`;
  }

  // Get all words for distractor pool
  const allWordsPool = await db.words.toArray();

  // Show mode selection
  quizSession = {
    lessonId,
    words: allWords,
    allWordsPool,
    quizSize: Math.min(quizSize, allWords.length),
    mode: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    retryQueue: [],
    retryRound: 0,
    startTime: Date.now(),
  };

  return `
    <div class="fade-in" style="padding:16px;">
      <div class="card" style="text-align:center; margin-bottom:16px;">
        <div style="font-size:1.1rem; font-weight:600;">选择测验模式</div>
        <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:4px;">
          本课共 ${allWords.length} 个单词
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="card" style="border:none; cursor:pointer; text-align:left; padding:16px;"
                onclick="startQuizMode('jp-to-cn')">
          <div style="font-size:1.1rem; font-weight:600;">🇯🇵 → 🇨🇳 看日文选中文</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:4px;">看日语单词，选择正确的中文意思</div>
        </button>

        <button class="card" style="border:none; cursor:pointer; text-align:left; padding:16px;"
                onclick="startQuizMode('cn-to-jp')">
          <div style="font-size:1.1rem; font-weight:600;">🇨🇳 → 🇯🇵 看中文选日文</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:4px;">看中文意思，选择正确的日语单词</div>
        </button>

        <button class="card" style="border:none; cursor:pointer; text-align:left; padding:16px;"
                onclick="startQuizMode('true-false')">
          <div style="font-size:1.1rem; font-weight:600;">✅❌ 判对错</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:4px;">判断日语单词和中文意思是否匹配</div>
        </button>

        <button class="card" style="border:none; cursor:pointer; text-align:left; padding:16px;"
                onclick="startQuizMode('jp-to-cn-input')">
          <div style="font-size:1.1rem; font-weight:600;">✍️ 看日文回想中文</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:4px;">看日语单词，回忆中文意思后点击揭晓</div>
        </button>
      </div>
    </div>
  `;
}

function startQuizMode(mode) {
  if (!quizSession) return;
  quizSession.mode = mode;
  quizSession.questions = generateQuizQuestions(
    quizSession.words,
    quizSession.allWordsPool,
    mode,
    quizSession.quizSize
  );
  quizSession.currentIndex = 0;
  quizSession.answers = [];
  quizSession.retryQueue = [];
  quizSession.retryRound = 0;
  quizSession.questionStartTime = Date.now();

  const app = document.getElementById('app');
  app.innerHTML = renderQuizQuestion(quizSession);
}

function generateQuizQuestions(words, allWordsPool, mode, count) {
  const selected = shuffleArray([...words]).slice(0, Math.min(count, words.length));

  switch (mode) {
    case 'jp-to-cn':
      return selected.map(w => generateMultipleChoiceJPtoCN(w, words, allWordsPool));
    case 'cn-to-jp':
      return selected.map(w => generateMultipleChoiceCNtoJP(w, words, allWordsPool));
    case 'true-false':
      return selected.map(w => generateTrueFalse(w, words));
    case 'jp-to-cn-input':
      return selected.map(w => generateRecallCard(w));
  }
}

function generateMultipleChoiceJPtoCN(word, lessonWords, allPool) {
  const distractors = getDistractors(word, lessonWords, allPool, 'meaning', 3);
  const options = shuffleArray([word.meaning, ...distractors]);
  return {
    question: { japanese: word.japanese, reading: word.reading },
    options,
    answer: word.meaning,
    word
  };
}

function generateMultipleChoiceCNtoJP(word, lessonWords, allPool) {
  const distractors = getDistractors(word, lessonWords, allPool, 'japanese', 3);
  const options = shuffleArray([word.japanese, ...distractors]);
  return {
    question: { meaning: word.meaning },
    options,
    answer: word.japanese,
    word
  };
}

function generateTrueFalse(word, lessonWords) {
  const isTrue = Math.random() > 0.5;
  let shownMeaning;
  if (isTrue) {
    shownMeaning = word.meaning;
  } else {
    const others = lessonWords.filter(w => w.localId !== word.localId && w.meaning !== word.meaning);
    if (others.length === 0) {
      shownMeaning = word.meaning + '（×）';
    } else {
      shownMeaning = others[Math.floor(Math.random() * others.length)].meaning;
    }
  }
  return {
    question: {
      japanese: word.japanese,
      reading: word.reading,
      claimedMeaning: shownMeaning
    },
    answer: isTrue ? 'true' : 'false',
    correctMeaning: word.meaning,
    word
  };
}

function generateRecallCard(word) {
  return {
    question: { japanese: word.japanese, reading: word.reading },
    answer: word.meaning,
    word
  };
}

function getDistractors(word, lessonWords, allPool, field, count) {
  const candidates = [];
  // Same lesson first
  const sameLesson = lessonWords.filter(w =>
    w.localId !== word.localId && w[field] !== word[field]
  );
  candidates.push(...sameLesson);

  // If not enough, get from other lessons
  if (candidates.length < count * 2) {
    const others = allPool.filter(w =>
      w.localId !== word.localId &&
      w[field] !== word[field] &&
      !candidates.find(c => c[field] === w[field])
    );
    candidates.push(...others);
  }

  // Shuffle and pick
  const shuffled = shuffleArray(candidates);
  const unique = [];
  const seen = new Set();
  for (const c of shuffled) {
    if (!seen.has(c[field]) && unique.length < count) {
      seen.add(c[field]);
      unique.push(c);
    }
  }
  return unique.map(c => c[field]);
}

function renderQuizQuestion(session) {
  const q = session.questions[session.currentIndex];
  const mode = session.mode;
  const progress = session.currentIndex + 1;
  const total = session.questions.length;

  let questionHTML = '';

  switch (mode) {
    case 'jp-to-cn':
      questionHTML = `
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:2rem; font-weight:700; font-family:var(--font-jp); margin-bottom:4px;">
            ${escapeHTML(q.question.japanese)}
          </div>
          <div style="font-size:0.95rem; font-family:var(--font-jp); color:var(--color-text-secondary);">
            ${escapeHTML(q.question.reading)}
          </div>
        </div>
        ${q.options.map((opt, i) => `
          <button class="option-btn" onclick="onQuizSelect('${escapeHTML(opt).replace(/'/g, "\\'")}')">
            ${String.fromCharCode(65 + i)}. ${escapeHTML(opt)}
          </button>
        `).join('')}
      `;
      break;

    case 'cn-to-jp':
      questionHTML = `
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:1.3rem; font-weight:600;">
            ${escapeHTML(q.question.meaning)}
          </div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">选择对应的日语单词</div>
        </div>
        ${q.options.map((opt, i) => `
          <button class="option-btn" onclick="onQuizSelect('${escapeHTML(opt).replace(/'/g, "\\'")}')" style="font-family:var(--font-jp);">
            ${String.fromCharCode(65 + i)}. ${escapeHTML(opt)}
          </button>
        `).join('')}
      `;
      break;

    case 'true-false':
      questionHTML = `
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:2rem; font-weight:700; font-family:var(--font-jp); margin-bottom:8px;">
            ${escapeHTML(q.question.japanese)}
          </div>
          <div style="font-size:1.1rem; color:var(--color-text-secondary);">
            = ${escapeHTML(q.question.claimedMeaning)} ？
          </div>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-success btn-block" style="flex:1; padding:16px;" onclick="onQuizSelect('true')">
            ✓ 对
          </button>
          <button class="btn btn-danger btn-block" style="flex:1; padding:16px;" onclick="onQuizSelect('false')">
            ✗ 错
          </button>
        </div>
      `;
      break;

    case 'jp-to-cn-input':
      questionHTML = `
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:2rem; font-weight:700; font-family:var(--font-jp); margin-bottom:4px;">
            ${escapeHTML(q.question.japanese)}
          </div>
          <div style="font-size:0.95rem; font-family:var(--font-jp); color:var(--color-text-secondary); margin-bottom:16px;">
            ${escapeHTML(q.question.reading)}
          </div>
          <button class="btn btn-primary btn-large" onclick="showQuizAnswer()">揭晓答案</button>
          <div id="quizAnswerArea" style="margin-top:16px;"></div>
        </div>
        <div style="display:flex; gap:12px; justify-content:center;">
          <button class="btn btn-success btn-large" onclick="onQuizSelect('${escapeHTML(q.answer).replace(/'/g, "\\'")}')" style="display:none;" id="btnCorrect">
            ✓ 我答对了
          </button>
          <button class="btn btn-danger btn-large" onclick="onQuizSelect('wrong')" style="display:none;" id="btnWrong">
            ✗ 我答错了
          </button>
        </div>
      `;
      break;
  }

  return `
    <div class="quiz-screen fade-in">
      <!-- Header -->
      <div style="padding:12px var(--space-md); display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.85rem; color:var(--color-text-secondary);">
          ${typeof LESSON_TITLES !== 'undefined' ? (LESSON_TITLES[session.lessonId] || `第${session.lessonId}課`) : `第${session.lessonId}課`} · ${getQuizModeName(session.mode)}
          ${session.retryRound > 0 ? ` · 第${session.retryRound + 1}轮` : ''}
        </span>
        <span style="font-size:0.85rem; font-weight:600;">${progress} / ${total}</span>
      </div>
      <div class="progress-bar" style="margin:0 var(--space-md) 12px;">
        <div class="progress-bar-fill" style="width:${(progress / total) * 100}%"></div>
      </div>

      <!-- Question -->
      <div style="padding:0 var(--space-md);">
        ${questionHTML}
      </div>
    </div>
  `;
}

function showQuizAnswer() {
  const q = quizSession.questions[quizSession.currentIndex];
  const area = document.getElementById('quizAnswerArea');
  if (area) {
    area.innerHTML = `
      <div style="font-size:1.5rem; font-weight:600; color:var(--color-primary); margin:8px 0;">
        ${escapeHTML(q.answer)}
      </div>
      <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:8px;">
        ${escapeHTML(q.word.exampleSentence || '')}
      </div>
    `;
  }
  const btnCorrect = document.getElementById('btnCorrect');
  const btnWrong = document.getElementById('btnWrong');
  if (btnCorrect) btnCorrect.style.display = '';
  if (btnWrong) btnWrong.style.display = '';
}

function getQuizModeName(mode) {
  const names = {
    'jp-to-cn': '看日文选中文',
    'cn-to-jp': '看中文选日文',
    'true-false': '判对错',
    'jp-to-cn-input': '看日文回想',
  };
  return names[mode] || mode;
}

async function onQuizSelect(userAnswer) {
  if (!quizSession) return;
  const q = quizSession.questions[quizSession.currentIndex];
  const correctAnswer = q.answer;

  let isCorrect;
  if (quizSession.mode === 'true-false') {
    isCorrect = (userAnswer === correctAnswer);
  } else {
    isCorrect = (userAnswer === correctAnswer);
  }

  // Highlight all option buttons
  document.querySelectorAll('.option-btn').forEach(btn => {
    const text = btn.textContent.replace(/^[A-D]\. /, '').replace(/ [✓✗]$/, '');
    if (text === correctAnswer) btn.classList.add('correct');
    else if (text === userAnswer && !isCorrect) btn.classList.add('wrong');
    btn.style.pointerEvents = 'none';
  });

  // Log review
  const quality = isCorrect ? 4 : 1;
  const timeSpent = Date.now() - quizSession.questionStartTime;
  await rateWord(q.word.localId, quality, 'quiz', timeSpent);

  quizSession.answers.push({ question: q, userAnswer, isCorrect, timeSpent });
  if (!isCorrect) {
    quizSession.retryQueue.push(q);
  }

  // Show feedback then continue
  await new Promise(resolve => setTimeout(resolve, 600));

  quizSession.currentIndex++;
  if (quizSession.currentIndex >= quizSession.questions.length) {
    if (quizSession.retryQueue.length > 0 && quizSession.retryRound < 2) {
      quizSession.retryRound++;
      quizSession.questions = [...quizSession.retryQueue];
      quizSession.retryQueue = [];
      quizSession.currentIndex = 0;
      const app = document.getElementById('app');
      app.innerHTML = renderQuizQuestion(quizSession);
    } else {
      await renderQuizComplete();
    }
  } else {
    quizSession.questionStartTime = Date.now();
    const app = document.getElementById('app');
    app.innerHTML = renderQuizQuestion(quizSession);
  }
}

async function renderQuizComplete() {
  const total = quizSession.answers.length;
  const correct = quizSession.answers.filter(a => a.isCorrect).length;
  const accuracy = Math.round((correct / total) * 100);

  if (accuracy >= 80) setTimeout(showConfetti, 300);

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="scale-in" style="text-align:center; padding:var(--space-xl) var(--space-md);">
      <div style="font-size:3rem; margin-bottom:12px;">${accuracy >= 80 ? '🎉' : '💪'}</div>
      <h2>测验完成！</h2>

      <div style="display:flex; justify-content:center; gap:32px; margin:20px 0;">
        <div>
          <div style="font-size:2rem; font-weight:700; color:var(--color-success);">${correct}</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">正确</div>
        </div>
        <div>
          <div style="font-size:2rem; font-weight:700; color:var(--color-danger);">${total - correct}</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">错误</div>
        </div>
        <div>
          <div style="font-size:1.5rem; font-weight:700; color:var(--color-primary);">${accuracy}%</div>
          <div style="font-size:0.85rem; color:var(--color-text-secondary);">正确率</div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div style="font-size:0.85rem; color:var(--color-text-secondary);">
          模式：${getQuizModeName(quizSession.mode)} · 第${quizSession.lessonId}課
        </div>
      </div>

      <div style="display:flex; gap:12px; margin-top:20px; justify-content:center;">
        <button class="btn btn-outline" onclick="navigate('lesson', {lessonId: ${quizSession.lessonId}})">
          返回课程
        </button>
        <button class="btn btn-primary" onclick="navigate('quiz', {lessonId: ${quizSession.lessonId}})">
          再来一次
        </button>
      </div>
    </div>
  `;
}

/* Utils */

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
