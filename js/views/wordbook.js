/* ============================
   不背日语 — Wordbook View (生词本)
   Saved words list
   ============================ */

async function renderWordbook() {
  const wordIds = await getWordbookItems();

  if (wordIds.length === 0) {
    return `<div class="empty-state" style="padding-top:80px;">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">生词本为空</div>
      <div class="empty-state-desc">学习时点击右上角 ⋯ 即可将单词加入生词本</div>
      <button class="btn btn-primary mt-md" onclick="navigate('home')">去学习</button>
    </div>`;
  }

  const words = [];
  for (const id of wordIds) {
    const word = await db.words.get(id);
    if (word) {
      const state = await getLearningState(id);
      words.push({ ...word, state: state || { status: 'new' } });
    }
  }

  // Status labels
  const statusMap = {
    'new': { label: '未学', cls: 'badge-new' },
    'learning': { label: '学习中', cls: 'badge-learning' },
    'review': { label: '复习中', cls: 'badge-review' },
    'mastered': { label: '已掌握', cls: 'badge-mastered' },
  };

  return `
    <div class="fade-in" style="padding-bottom:12px;">
      <div class="section-header">
        <span class="section-title">生词本 · ${words.length} 词</span>
        ${words.length > 0 ? `
          <button class="section-action" onclick="clearWordbook()">清空</button>
        ` : ''}
      </div>

      <div style="padding:0 var(--space-md);">
        ${words.map((word, i) => {
          const st = statusMap[word.state.status] || statusMap['new'];
          return `
            <div class="word-item" style="animation: fadeInUp 0.3s ease forwards; animation-delay:${i*0.03}s; border-radius:${i===0?'12px 12px 0 0':''}${i===words.length-1?'0 0 12px 12px':''};"
                 onclick="event.stopPropagation(); TTS.speakWord('${escapeHTML(word.reading).replace(/'/g, "\\'")}')">
              <div>
                <div class="word-item-jp">${escapeHTML(word.japanese)}</div>
                <div class="word-item-reading">${escapeHTML(word.reading)}</div>
              </div>
              <div class="word-item-meaning">${escapeHTML(word.meaning)}</div>
              <div class="word-item-status">
                <span class="badge ${st.cls}">${st.label}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

async function clearWordbook() {
  await setSetting('wordbook', '[]');
  showToast('生词本已清空');
  navigate('wordbook');
}

async function getWordbookItems() {
  const raw = await getSetting('wordbook', '[]');
  try { return JSON.parse(raw); } catch { return []; }
}
