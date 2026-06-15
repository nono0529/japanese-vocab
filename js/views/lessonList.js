/* ============================
   不背日语 — Lesson List View
   ============================ */

const LESSON_TITLES = {
  1: '第1課 李さんは中国人です', 2: '第2課 これは本です', 3: '第3課 ここはデパートです',
  4: '第4課 部屋に机といすがあります', 5: '第5課 森さんは7時に起きます',
  6: '第6課 吉田さんは来月中国へ行きます', 7: '第7課 李さんは毎日コーヒーを飲みます',
  8: '第8課 李さんは日本語で手紙を書きます', 9: '第9課 四川料理は辛いです',
  10: '第10課 京都の紅葉は有名です', 11: '第11課 小野さんは歌が好きです',
  12: '第12課 李さんは森さんより若いです', 13: '第13課 机の上に本が三冊あります',
  14: '第14課 昨日デパートへ行って買い物しました', 15: '第15課 小野さんは今新聞を読んでいます',
  16: '第16課 ホテルの部屋は広くて明るいです', 17: '第17課 わたしは新しい洋服が欲しいです',
  18: '第18課 携帯電話はとても小さくなりました', 19: '第19課 部屋のかぎを忘れないでください',
  20: '第20課 スミスさんはピアノを弾くことができます', 21: '第21課 わたしはすき焼きを食べたことがあります',
  22: '第22課 森さんは毎晩テレビを見る', 23: '第23課 休みの日は散歩したり買い物に行ったりします',
  24: '第24課 李さんはもうすぐ来ると思います'
};

async function renderLessonList() {
  const lessonProgress = await getAllLessonProgress();

  const rows = [];
  for (let i = 1; i <= 24; i++) {
    const lp = lessonProgress.find(l => l.lessonId === i);
    const total = lp ? lp.totalWords : 0;
    const learned = lp ? lp.learnedWords : 0;
    const progress = lp ? lp.progress : 0;

    rows.push(`
      <div class="card fade-in" onclick="navigate('lesson', {lessonId: ${i}})"
           style="display:flex; align-items:center; gap:12px; cursor:pointer; animation-delay:${i * 0.03}s; padding:14px 16px;">
        <div style="width:36px; height:36px; border-radius:50%; background:var(--color-primary-bg);
                    display:flex; align-items:center; justify-content:center;
                    font-weight:700; font-size:0.85rem; color:var(--color-primary); flex-shrink:0;">
          ${i}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:0.95rem; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
            ${LESSON_TITLES[i] || '第' + i + '課'}
          </div>
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

  const title = LESSON_TITLES[lessonId] || `第${lessonId}課`;
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
