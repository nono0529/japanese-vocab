/* ============================
   不背日语 — Home Dashboard View
   ============================ */

async function renderHome() {
  const today = todayISO();
  const streak = await getSetting('streak', 0);
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));
  const dailyStats = await getDailyStats(today);
  const reviewSummary = await getReviewQueueSummary();
  const lessonProgress = await getAllLessonProgress();

  const learnedToday = dailyStats ? dailyStats.wordsLearned : 0;
  const reviewedToday = dailyStats ? dailyStats.wordsReviewed : 0;
  const totalNewCount = reviewSummary.newToday;
  const totalLearned = lessonProgress.reduce((sum, lp) => sum + lp.learnedWords, 0);
  const totalWords = lessonProgress.reduce((sum, lp) => sum + lp.totalWords, 0);
  const overallProgress = totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0;

  // Time spent today
  const todayTimeMs = dailyStats ? (dailyStats.totalTimeSpent || 0) : 0;
  const timeStr = formatMinutes(todayTimeMs);

  const lessonTitles = {
    1: '初対面', 2: '私の家族', 3: '私の寮', 4: '私の一日',
    5: '好きな音楽', 6: '外出', 7: '買い物', 8: 'プレゼント',
    9: 'スポーツ', 10: '料理', 11: '着物', 12: '計画',
    13: '思い出', 14: '見物'
  };

  return `
    <!-- Today's Stats Card -->
    <div class="card fade-in" style="text-align:center; padding: var(--space-lg);">
      <div class="streak-badge" style="justify-content:center; margin-bottom:12px;">
        🔥 连续学习 <span style="font-size:1.4rem;">${streak}</span> 天
      </div>
      <div style="display:flex; justify-content:center; gap:24px; margin-bottom:16px;">
        <div class="stat-card" style="flex:1; max-width:120px;">
          <div class="stat-value" style="font-size:1.5rem;">${learnedToday}<span style="font-size:0.85rem;color:var(--color-text-secondary);">/${dailyGoal}</span></div>
          <div class="stat-label">今日新学</div>
        </div>
        <div class="stat-card" style="flex:1; max-width:120px;">
          <div class="stat-value" style="font-size:1.5rem;">${reviewedToday}</div>
          <div class="stat-label">今日复习</div>
        </div>
        <div class="stat-card" style="flex:1; max-width:120px;">
          <div class="stat-value" style="font-size:1.2rem;">${timeStr}</div>
          <div class="stat-label">学习时长</div>
        </div>
      </div>
      <div class="progress-bar" style="margin-bottom:4px;">
        <div class="progress-bar-fill" style="width:${overallProgress}%"></div>
      </div>
      <div style="font-size:0.85rem; color:var(--color-text-secondary);">
        总进度 ${overallProgress}%（${totalLearned}/${totalWords} 词）
      </div>
    </div>

    <!-- Quick Actions -->
    <div style="display:flex; gap:12px; padding: var(--space-md);">
      <button class="btn btn-primary btn-block" onclick="navigate('lessons')" style="flex:1;">
        🆕 学习新词
      </button>
      <button class="btn btn-outline btn-block" onclick="navigate('review')" style="flex:1;">
        🔄 复习 (${reviewSummary.due})
      </button>
    </div>

    <!-- Lesson Grid -->
    <div class="section-header">
      <span class="section-title">课程进度</span>
    </div>
    <div class="lesson-grid">
      ${Array.from({length: 14}, (_, i) => {
        const lp = lessonProgress.find(l => l.lessonId === i + 1) || { progress: 0, learnedWords: 0, totalWords: 0 };
        return `
          <div class="lesson-card fade-in" onclick="navigate('lesson', {lessonId: ${i + 1}})"
               style="animation-delay:${i * 0.03}s">
            <div class="lesson-card-num">${i + 1}</div>
            ${lp.totalWords > 0 ? `
              <div class="lesson-card-progress">
                <div class="lesson-card-progress-fill" style="width:${lp.progress}%"></div>
              </div>
            ` : ''}
            <div class="lesson-card-title">${lessonTitles[i + 1] || ''}</div>
            ${lp.totalWords > 0 ? `
              <div style="font-size:0.65rem; color:var(--color-text-light);">${lp.learnedWords}/${lp.totalWords}</div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}
