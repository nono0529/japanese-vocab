/* ============================
   不背日语 — Statistics View v4
   周/月对齐现实日历
   ============================ */

let statsMode = 'month'; // 'week' | 'month'

function formatISOLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/** Get dates for current calendar week (Mon ~ Sun) */
function getCurrentWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  // Monday of this week
  const monday = new Date(today);
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
  monday.setDate(today.getDate() + offset);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push({ date: formatISOLocal(d), day: d.getDate(), weekday: i });
  }
  return dates;
}

/** Get dates for current calendar month */
function getCurrentMonthDates() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based
  const lastDay = new Date(year, month + 1, 0).getDate(); // Last day of month

  const dates = [];
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d);
    dates.push({ date: formatISOLocal(date), day: d, weekday: date.getDay() });
  }
  return dates;
}

async function renderStats() {
  const weekDays = ['日','一','二','三','四','五','六'];
  const today = todayISO();

  // Generate calendar dates
  const calendarDates = statsMode === 'week'
    ? getCurrentWeekDates()
    : getCurrentMonthDates();

  // Batch-fetch all stats at once, preserving calendar metadata
  const dateKeys = calendarDates.map(cd => cd.date);
  const statRows = await db.dailyStats.bulkGet(dateKeys);
  const days = calendarDates.map((cd, i) => {
    const row = statRows[i];
    if (cd.date > today) {
      return { date: cd.date, day: cd.day, weekday: cd.weekday, wordsLearned: 0, wordsReviewed: 0, isFuture: true };
    }
    return { date: cd.date, day: cd.day, weekday: cd.weekday, wordsLearned: row?.wordsLearned || 0, wordsReviewed: row?.wordsReviewed || 0 };
  });

  const streak = await getSetting('streak', 0);
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));
  const totalWordsLearned = await db.learningState.where('status').notEqual('new').count();
  const totalWords = await db.words.count();
  const totalReviews = await db.reviewHistory.where('mode').equals('review').count();

  // Today stats
  const todayStats = days.find(d => d.date === today);
  const todayLearned = todayStats ? todayStats.wordsLearned : 0;
  const todayReviewed = todayStats ? todayStats.wordsReviewed : 0;

  // Max value for chart scaling
  const maxVal = Math.max(1, ...days.filter(d => !d.isFuture).map(d => Math.max(d.wordsLearned || 0, d.wordsReviewed || 0)));

  // Title
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth()+1}月`;
  const weekLabel = (() => {
    const cd = getCurrentWeekDates();
    const first = cd[0], last = cd[6];
    return `${first.date.slice(5)} ~ ${last.date.slice(5)}`;
  })();

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
        <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:8px;">📅 今日 ${today.slice(5)}</div>
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
        <span class="section-title">${statsMode === 'week' ? '本周 ' + weekLabel : monthLabel}</span>
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="segmented-control">
            <button class="segmented-item ${statsMode === 'week' ? 'active' : ''}" onclick="switchStatsMode('week')">周</button>
            <button class="segmented-item ${statsMode === 'month' ? 'active' : ''}" onclick="switchStatsMode('month')">月</button>
          </div>
          <button onclick="navigate('settings')" style="background:none; border:none; font-size:1.2rem; cursor:pointer; padding:4px;">⚙️</button>
        </div>
      </div>

      <!-- Bar Chart -->
      <div style="padding:8px var(--space-md) 0; overflow-x:auto;">
        <div class="bar-chart" style="${statsMode === 'month' ? 'gap:1px;' : ''}">
          ${days.map((d) => {
            const learnH = maxVal > 0 ? ((d.wordsLearned || 0) / maxVal * 100) : 0;
            const reviewH = maxVal > 0 ? ((d.wordsReviewed || 0) / maxVal * 100) : 0;
            const isToday = d.date === today;
            const isFuture = d.isFuture;
            const hasData = (d.wordsLearned || 0) + (d.wordsReviewed || 0) > 0;
            const showLearnCount = learnH > 15;
            const showReviewCount = reviewH > 15;
            const wd = d.weekday;

            return `
              <div class="bar-col ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''}"
                   title="${d.date.slice(5)} 周${weekDays[wd]}: 学${d.wordsLearned||0} 复${d.wordsReviewed||0}">
                <div class="bar-stack" style="${isFuture ? 'opacity:0.25;' : ''}">
                  ${reviewH > 0 ? `<div class="bar-review" style="height:${reviewH}%">${showReviewCount ? `<span class="bar-count">${d.wordsReviewed||0}</span>` : ''}</div>` : ''}
                  ${learnH > 0 ? `<div class="bar-learn" style="height:${learnH}%">${showLearnCount ? `<span class="bar-count">${d.wordsLearned||0}</span>` : ''}</div>` : ''}
                  ${!hasData ? `<div class="bar-empty"></div>` : ''}
                </div>
                <div class="bar-label" style="${isFuture ? 'opacity:0.3;' : ''}">
                  ${statsMode === 'week' ? weekDays[wd] : d.day}
                </div>
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
