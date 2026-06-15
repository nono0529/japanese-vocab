/* ============================
   不背日语 — Lesson List View
   ============================ */

async function renderLessonList() {
  const lessonProgress = await getAllLessonProgress();

  const lessonTitles = {
    1: '第1課 初対面', 2: '第2課 私の家族', 3: '第3課 私の寮', 4: '第4課 私の一日',
    5: '第5課 好きな音楽', 6: '第6課 外出', 7: '第7課 買い物', 8: '第8課 プレゼント',
    9: '第9課 スポーツ', 10: '第10課 料理', 11: '第11課 着物', 12: '第12課 計画',
    13: '第13課 思い出', 14: '第14課 見物'
  };

  const rows = [];
  for (let i = 1; i <= 14; i++) {
    const lp = lessonProgress.find(l => l.lessonId === i);
    const total = lp ? lp.totalWords : 0;
    const learned = lp ? lp.learnedWords : 0;
    const progress = lp ? lp.progress : 0;

    rows.push(`
      <div class="card fade-in" onclick="navigate('lesson', {lessonId: ${i}})"
           style="display:flex; align-items:center; gap:12px; cursor:pointer; animation-delay:${i * 0.04}s; padding:14px 16px;">
        <div style="width:36px; height:36px; border-radius:50%; background:var(--color-primary-bg);
                    display:flex; align-items:center; justify-content:center;
                    font-weight:700; font-size:0.9rem; color:var(--color-primary); flex-shrink:0;">
          ${i}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:0.95rem; font-weight:500;">${lessonTitles[i] || '第' + i + '課'}</div>
          <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
            <div class="progress-bar" style="flex:1;">
              <div class="progress-bar-fill${progress >= 100 ? ' success' : ''}" style="width:${progress}%"></div>
            </div>
            <span style="font-size:0.75rem; color:var(--color-text-light); white-space:nowrap;">
              ${total > 0 ? `${learned}/${total}` : '—'}
            </span>
          </div>
        </div>
        <div style="flex-shrink:0; width:30px; text-align:right;">
          ${progress >= 100 ? '✅' : progress > 0 ? '📖' : '📕'}
        </div>
      </div>
    `);
  }

  return `
    <div style="padding:12px 0;">
      ${rows.join('')}
    </div>
  `;
}

/**
 * Render word list for a specific lesson
 */
async function renderWordList(lessonId) {
  const words = await getLessonWordStates(lessonId);
  const progress = await getLessonProgress(lessonId);

  const lessonTitles = {
    1: '第1課 初対面', 2: '第2課 私の家族', 3: '第3課 私の寮', 4: '第4課 私の一日',
    5: '第5課 好きな音楽', 6: '第6課 外出', 7: '第7課 買い物', 8: '第8課 プレゼント',
    9: '第9課 スポーツ', 10: '第10課 料理', 11: '第11課 着物', 12: '第12課 計画',
    13: '第13課 思い出', 14: '第14課 見物'
  };

  const title = lessonTitles[lessonId] || `第${lessonId}課`;
  updateTopBar(title);

  const newCount = words.filter(w => w.state.status === 'new').length;

  const statusBadge = (status) => {
    const map = {
      'new': '<span class="badge badge-new">未学</span>',
      'learning': '<span class="badge badge-learning">学习中</span>',
      'review': '<span class="badge badge-review">复习中</span>',
      'mastered': '<span class="badge badge-mastered">已掌握</span>'
    };
    return map[status] || map['new'];
  };

  return `
    <!-- Lesson Header -->
    <div class="card" style="text-align:center; padding:16px;">
      <h2>${title}</h2>
      <div style="margin-top:8px; font-size:0.9rem; color:var(--color-text-secondary);">
        ${progress.learnedWords} / ${progress.totalWords} 个单词已学
      </div>
      <div class="progress-bar" style="margin-top:8px;">
        <div class="progress-bar-fill" style="width:${progress.progress}%"></div>
      </div>
    </div>

    <!-- Actions -->
    <div style="display:flex; gap:10px; padding:12px var(--space-md);">
      ${newCount > 0 ? `
        <button class="btn btn-primary btn-block" onclick="navigate('learn', {lessonId: ${lessonId}})" style="flex:1;">
          🆕 学习新词 (${newCount})
        </button>
      ` : `
        <button class="btn btn-primary btn-block" disabled style="flex:1; opacity:0.5;">
          ✅ 全部已学
        </button>
      `}
      <button class="btn btn-outline btn-block" onclick="navigate('quiz', {lessonId: ${lessonId}})" style="flex:1;">
        📝 测试本课
      </button>
    </div>

    <!-- Word List -->
    <div class="section-header">
      <span class="section-title">单词列表</span>
      <span class="section-action">共 ${words.length} 词</span>
    </div>
    <div style="padding-bottom:12px;">
      ${words.map((w, i) => `
        <div class="word-item fade-in" style="animation-delay:${i * 0.02}s">
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:baseline; gap:8px;">
              <span class="word-item-jp">${escapeHTML(w.japanese)}</span>
              <span class="word-item-reading">${escapeHTML(w.reading)}</span>
            </div>
            <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:2px;">
              ${escapeHTML(w.meaning)} · <span style="font-size:0.75rem;">${escapeHTML(w.partOfSpeech)}</span>
            </div>
          </div>
          <div class="word-item-status">
            ${statusBadge(w.state.status)}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
