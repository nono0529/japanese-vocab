/* ============================
   不背日语 — Statistics View v2
   Bar chart for daily learn/review counts
   ============================ */

async function renderStats() {
  const recentStats = await getRecentDailyStats(30);
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
  const todayTime = today ? formatMinutes(today.totalTimeSpent || 0) : '0分钟';

  // Max value for chart scaling
  const maxVal = Math.max(1, ...days.map(d => Math.max(d.wordsLearned || 0, d.wordsReviewed || 0)));

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
          <div class="stat-label">总复习</div>
        </div>
      </div>

      <!-- Today -->
      <div class="card" style="text-align:center; margin:0 var(--space-md) 12px;">
        <div style="font-size:0.85rem; opacity:0.5; margin-bottom:8px;">📅 今日</div>
        <div style="display:flex; justify-content:center; gap:20px;">
          <div><span style="font-size:1.2rem; font-weight:700;">${todayLearned}</span><span style="font-size:0.7rem; opacity:0.4;">/${dailyGoal}</span><div style="font-size:0.7rem; opacity:0.45;">新学</div></div>
          <div style="width:1px; background:rgba(255,255,255,0.08);"></div>
          <div><span style="font-size:1.2rem; font-weight:700;">${todayReviewed}</span><div style="font-size:0.7rem; opacity:0.45;">复习</div></div>
          <div style="width:1px; background:rgba(255,255,255,0.08);"></div>
          <div><span style="font-size:1.2rem; font-weight:700;">${todayTime}</span><div style="font-size:0.7rem; opacity:0.45;">时长</div></div>
        </div>
      </div>

      <!-- Bar Chart -->
      <div class="section-header">
        <span class="section-title">最近30天</span>
      </div>

      <div style="padding:12px var(--space-md);">
        <div class="bar-chart">
          ${days.map((day, i) => {
            const learnH = maxVal > 0 ? ((day.wordsLearned || 0) / maxVal * 100) : 0;
            const reviewH = maxVal > 0 ? ((day.wordsReviewed || 0) / maxVal * 100) : 0;
            const isToday = day.date === todayISO();
            const dateStr = day.date.slice(5); // MM-DD
            const dayOfWeek = new Date(day.date).getDay();
            const weekDays = ['日','一','二','三','四','五','六'];
            const hasData = (day.wordsLearned || 0) + (day.wordsReviewed || 0) > 0;

            return `
              <div class="bar-col ${isToday ? 'today' : ''}" title="${dateStr} 周${weekDays[dayOfWeek]}: 学${day.wordsLearned||0} 复${day.wordsReviewed||0}">
                <div class="bar-stack">
                  ${reviewH > 0 ? `<div class="bar-review" style="height:${reviewH}%"></div>` : ''}
                  ${learnH > 0 ? `<div class="bar-learn" style="height:${learnH}%"></div>` : ''}
                  ${!hasData ? `<div class="bar-empty"></div>` : ''}
                </div>
                <div class="bar-label">${dateStr.slice(3)}</div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Legend -->
        <div style="display:flex; justify-content:center; gap:16px; margin-top:12px; font-size:0.75rem; opacity:0.5;">
          <span><span style="display:inline-block; width:10px; height:10px; border-radius:2px; background:var(--color-primary); margin-right:4px;"></span>新学</span>
          <span><span style="display:inline-block; width:10px; height:10px; border-radius:2px; background:rgba(255,255,255,0.3); margin-right:4px;"></span>复习</span>
        </div>
      </div>
    </div>
  `;
}
