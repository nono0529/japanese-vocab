/* ============================
   不背日语 — Statistics View v3
   不背单词 Style: Week/Month toggle, color bars
   ============================ */

let statsMode = 'month'; // 'week' | 'month'

async function renderStats() {
  const daysToShow = statsMode === 'week' ? 7 : 30;
  const recentStats = await getRecentDailyStats(daysToShow);
  const streak = await getSetting('streak', 0);
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));

  const totalWordsLearned = await db.learningState.where('status').notEqual('new').count();
  const totalWords = await db.words.count();
  const totalReviews = await db.reviewHistory.where('mode').equals('review').count();

  const days = [...recentStats].reverse(); // newest last for chart

  // Today
  const today = days.length > 0 ? days[days.length - 1] : null;
  const todayLearned = today ? today.wordsLearned : 0;
  const todayReviewed = today ? today.wordsReviewed : 0;

  // Max value for chart scaling
  const maxVal = Math.max(1, ...days.map(d => Math.max(d.wordsLearned || 0, d.wordsReviewed || 0)));

  // Weekday labels for week mode
  const weekDays = ['日','一','二','三','四','五','六'];

  return `
    <div class="fade-in" style="padding-bottom:12px;">
      <!-- Summary Cards -->
      <div style="display:flex; gap:8px; padding:12px var(--space-md);">
        <div class="stat-card" style="flex:1;">
          <div class="stat-value" style="color:#FF9500;">🔥 ${streak}</div>
          <div class="stat-label">连续天数</div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-value" style="color:var(--color-primary);">${totalWordsLearned}<span style="font-size:0.9rem; color:var(--color-text-secondary);">/${totalWords}</span></div>
          <div class="stat-label">已学单词</div>
        </div>
        <div class="stat-card" style="flex:1;">
          <div class="stat-value" style="color:#34C759;">${totalReviews}</div>
          <div class="stat-label">总复习</div>
        </div>
      </div>

      <!-- Today -->
      <div class="card" style="text-align:center; margin:0 var(--space-md) 14px;">
        <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:8px;">📅 今日</div>
        <div style="display:flex; justify-content:center; gap:24px;">
          <div>
            <span style="font-size:1.3rem; font-weight:700; color:var(--color-primary);">${todayLearned}</span>
            <span style="font-size:0.7rem; color:var(--color-text-secondary);">/${dailyGoal}</span>
            <div style="font-size:0.72rem; color:var(--color-text-secondary);">新学</div>
          </div>
          <div style="width:1px; background:var(--color-border);"></div>
          <div>
            <span style="font-size:1.3rem; font-weight:700; color:#FF9500;">${todayReviewed}</span>
            <div style="font-size:0.72rem; color:var(--color-text-secondary);">复习</div>
          </div>
        </div>
      </div>

      <!-- Week/Month Toggle -->
      <div class="stats-header">
        <span class="section-title">${statsMode === 'week' ? '最近7天' : '最近30天'}</span>
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="segmented-control">
            <button class="segmented-item ${statsMode === 'week' ? 'active' : ''}" onclick="switchStatsMode('week')">周</button>
            <button class="segmented-item ${statsMode === 'month' ? 'active' : ''}" onclick="switchStatsMode('month')">月</button>
          </div>
          <button onclick="navigate('settings')" style="background:none; border:none; font-size:1.2rem; cursor:pointer; padding:4px;">⚙️</button>
        </div>
      </div>

      <!-- Bar Chart -->
      <div style="padding:8px var(--space-md) 0;">
        <div class="bar-chart">
          ${days.map((day) => {
            const learnH = maxVal > 0 ? ((day.wordsLearned || 0) / maxVal * 100) : 0;
            const reviewH = maxVal > 0 ? ((day.wordsReviewed || 0) / maxVal * 100) : 0;
            const isToday = day.date === todayISO();
            const dateStr = day.date.slice(5); // MM-DD
            const dayOfWeek = new Date(day.date).getDay();
            const hasData = (day.wordsLearned || 0) + (day.wordsReviewed || 0) > 0;

            return `
              <div class="bar-col ${isToday ? 'today' : ''}" title="${dateStr} 周${weekDays[dayOfWeek]}: 学${day.wordsLearned||0} 复${day.wordsReviewed||0}">
                <div class="bar-stack">
                  ${reviewH > 0 ? `<div class="bar-review" style="height:${reviewH}%"></div>` : ''}
                  ${learnH > 0 ? `<div class="bar-learn" style="height:${learnH}%"></div>` : ''}
                  ${!hasData ? `<div class="bar-empty"></div>` : ''}
                </div>
                <div class="bar-label">${statsMode === 'week' ? weekDays[dayOfWeek] : dateStr.slice(3)}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Legend -->
        <div class="chart-legend">
          <span><span class="chart-legend-dot learn"></span>新学</span>
          <span><span class="chart-legend-dot review"></span>复习</span>
        </div>
      </div>
    </div>
  `;
}

function switchStatsMode(mode) {
  statsMode = mode;
  const app = document.getElementById('app');
  renderStats().then(html => { app.innerHTML = html; });
}
