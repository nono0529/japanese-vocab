/* ============================
   不背日语 — Home (不背单词 Style) v2
   Light theme · Two cards: Learn + Review
   ============================ */

async function renderHome() {
  const today = todayISO();
  const streak = await getSetting('streak', 0);
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));
  const dailyStats = await getDailyStats(today);
  const reviewSummary = await getReviewQueueSummary();

  const learnedToday = dailyStats ? dailyStats.wordsLearned : 0;
  const reviewedToday = dailyStats ? dailyStats.wordsReviewed : 0;

  const newCount = await db.learningState.where('status').equals('new').count();

  return `
    <div class="home-container fade-in" style="padding-top:20px;">
      <!-- Header -->
      <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:2rem; font-weight:700; color:var(--color-text); letter-spacing:0.04em;">不背日语</div>
        <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:4px;">🔥 连续 ${streak} 天</div>
      </div>

      <!-- Today stats -->
      <div style="display:flex; justify-content:center; gap:28px; margin-bottom:24px;">
        <div style="text-align:center;">
          <div style="font-size:1.5rem; font-weight:700; color:var(--color-primary);">${learnedToday}<span style="font-size:0.8rem; font-weight:400; color:var(--color-text-secondary);">/${dailyGoal}</span></div>
          <div style="font-size:0.78rem; color:var(--color-text-secondary);">今日新学</div>
        </div>
        <div style="width:1px; background:var(--color-border);"></div>
        <div style="text-align:center;">
          <div style="font-size:1.5rem; font-weight:700; color:var(--color-warning);">${reviewedToday}</div>
          <div style="font-size:0.78rem; color:var(--color-text-secondary);">今日复习</div>
        </div>
      </div>

      <!-- Learn Card -->
      <div class="home-card" onclick="startLearn()">
        <div class="home-card-icon">📖</div>
        <div class="home-card-title">学习新词</div>
        <div class="home-card-count">${newCount > 0 ? newCount + ' 个单词待学习' : '已全部学完 🎉'}</div>
        <div class="home-card-sub">LEARN</div>
      </div>

      <!-- Review Card -->
      <div class="home-card" onclick="startReview()" style="animation-delay:0.1s">
        <div class="home-card-icon">🔄</div>
        <div class="home-card-title">复习巩固</div>
        <div class="home-card-count">${reviewSummary.due > 0 ? reviewSummary.due + ' 个单词待复习' : '暂无待复习 ✅'}</div>
        <div class="home-card-sub">REVIEW</div>
      </div>

      <!-- Motto -->
      <div style="text-align:center; margin-top:auto; padding:24px 0; opacity:0.4; font-size:0.8rem;">
        不背日语 · 自然的词汇习得
      </div>
    </div>
  `;
}

function startLearn() { navigate('learn'); }
function startReview() { navigate('review'); }
