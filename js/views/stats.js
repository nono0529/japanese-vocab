/* ============================
   不背日语 — Statistics View
   Features: daily learn count, daily review count, daily study duration
   ============================ */

async function renderStats() {
  const recentStats = await getRecentDailyStats(30);
  const streak = await getSetting('streak', 0);
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));

  // Overall totals
  const totalWordsLearned = await db.learningState.where('status').notEqual('new').count();
  const totalWords = await db.words.count();
  const totalReviews = await db.reviewHistory.where('mode').equals('review').count();
  const totalQuizAnswers = await db.reviewHistory.where('mode').equals('quiz').count();

  // Reverse to show newest first
  const days = [...recentStats].reverse();

  return `
    <div class="fade-in" style="padding-bottom:12px;">
      <!-- Summary Cards -->
      <div style="display:flex; gap:8px; padding:12px var(--space-md);">
        <div class="stat-card" style="flex:1;">
          <div class="stat-value">🔥 ${streak}</div>
          <div class="stat-label">连续天数</div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-value">${totalWordsLearned}/${totalWords}</div>
          <div class="stat-label">已学单词</div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-value">${totalReviews}</div>
          <div class="stat-label">总复习次数</div>
        </div>
      </div>

      <!-- Today's Goals -->
      ${(() => {
        const today = days.find(d => d.date === todayISO()) || {
          wordsLearned: 0, wordsReviewed: 0, totalTimeSpent: 0
        };
        return `
          <div class="card" style="text-align:center; margin:0 var(--space-md) 12px;">
            <div style="font-size:0.9rem; color:var(--color-text-secondary); margin-bottom:8px;">
              📅 今日学习情况
            </div>
            <div style="display:flex; justify-content:center; gap:16px;">
              <div>
                <div style="font-size:1.1rem; font-weight:700;">
                  ${today.wordsLearned}<span style="font-size:0.75rem;color:var(--color-text-secondary);">/${dailyGoal}</span>
                </div>
                <div style="font-size:0.75rem; color:var(--color-text-light);">新学单词</div>
              </div>
              <div style="width:1px; background:var(--color-border);"></div>
              <div>
                <div style="font-size:1.1rem; font-weight:700;">${today.wordsReviewed}</div>
                <div style="font-size:0.75rem; color:var(--color-text-light);">复习单词</div>
              </div>
              <div style="width:1px; background:var(--color-border);"></div>
              <div>
                <div style="font-size:1.1rem; font-weight:700;">${formatMinutes(today.totalTimeSpent)}</div>
                <div style="font-size:0.75rem; color:var(--color-text-light);">学习时长</div>
              </div>
            </div>
          </div>
        `;
      })()}

      <!-- Daily Log -->
      <div class="section-header">
        <span class="section-title">每日记录</span>
        <span class="section-action">最近30天</span>
      </div>

      <div class="day-list">
        ${days.map(day => {
          const hasActivity = day.wordsLearned > 0 || day.wordsReviewed > 0;
          const isToday = day.date === todayISO();
          const dateLabel = isToday ? '今天' : getRelativeDateLabel(day.date);
          const dayOfWeek = new Date(day.date).getDay();
          const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

          return `
            <div class="day-item fade-in" style="${!hasActivity ? 'opacity:0.5;' : ''}${isToday ? 'border-left:3px solid var(--color-primary);' : ''}">
              <div>
                <div class="day-item-date">
                  ${isToday ? '● ' : ''}${dateLabel}
                  <span style="font-weight:400; color:var(--color-text-light); font-size:0.8rem;">
                    周${weekDays[dayOfWeek]}
                  </span>
                </div>
              </div>
              ${hasActivity ? `
                <div class="day-item-stats">
                  ${day.wordsLearned > 0 ? `<span>📖 ${day.wordsLearned}</span>` : ''}
                  ${day.wordsReviewed > 0 ? `<span>🔄 ${day.wordsReviewed}</span>` : ''}
                  <span>⏱ ${formatMinutes(day.totalTimeSpent)}</span>
                </div>
              ` : `
                <div style="font-size:0.8rem; color:var(--color-text-light);">无记录</div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
