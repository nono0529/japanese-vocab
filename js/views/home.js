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
  const totalLearned = lessonProgress.reduce((sum, lp) => sum + lp.learnedWords, 0);
  const totalWords = lessonProgress.reduce((sum, lp) => sum + lp.totalWords, 0);
  const overallProgress = totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0;

  const todayTimeMs = dailyStats ? (dailyStats.totalTimeSpent || 0) : 0;
  const timeStr = formatMinutes(todayTimeMs);

  // 新标日 24课标题
  const lessonTitles = {
    1: '李さんは中国人です', 2: 'これは本です', 3: 'ここはデパートです',
    4: '部屋に机といすがあります', 5: '森さんは7時に起きます', 6: '吉田さんは来月中国へ行きます',
    7: '李さんは毎日コーヒーを飲みます', 8: '李さんは日本語で手紙を書きます',
    9: '四川料理は辛いです', 10: '京都の紅葉は有名です',
    11: '小野さんは歌が好きです', 12: '李さんは森さんより若いです',
    13: '机の上に本が三冊あります', 14: '昨日デパートへ行って買い物しました',
    15: '小野さんは今新聞を読んでいます', 16: 'ホテルの部屋は広くて明るいです',
    17: 'わたしは新しい洋服が欲しいです', 18: '携帯電話はとても小さくなりました',
    19: '部屋のかぎを忘れないでください', 20: 'スミスさんはピアノを弾くことができます',
    21: 'わたしはすき焼きを食べたことがあります', 22: '森さんは毎晩テレビを見る',
    23: '休みの日は散歩したり買い物に行ったりします', 24: '李さんはもうすぐ来ると思います'
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
      ${Array.from({length: 24}, (_, i) => {
        const lp = lessonProgress.find(l => l.lessonId === i + 1) || { progress: 0, learnedWords: 0, totalWords: 0 };
        return `
          <div class="lesson-card fade-in" onclick="navigate('lesson', {lessonId: ${i + 1}})"
               style="animation-delay:${i * 0.02}s">
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
