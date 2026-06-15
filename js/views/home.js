/* ============================
   不背日语 — Home (不背单词 Style) v3
   Rich visual design
   ============================ */

const HOME_BGS = [
  'linear-gradient(160deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(160deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(160deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(160deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(160deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(160deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(160deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(160deg, #30cfd0 0%, #330867 100%)',
];

async function renderHome() {
  const today = todayISO();
  const streak = await getSetting('streak', 0);
  const dailyGoal = parseInt(await getSetting('dailyNewWordGoal', '10'));
  const dailyStats = await getDailyStats(today);
  const reviewSummary = await getReviewQueueSummary();

  const learnedToday = dailyStats ? dailyStats.wordsLearned : 0;
  const reviewedToday = dailyStats ? dailyStats.wordsReviewed : 0;
  const newCount = await db.learningState.where('status').equals('new').count();
  const bg = HOME_BGS[new Date().getDate() % HOME_BGS.length];

  return `
    <!-- Hero Banner -->
    <div style="background: ${bg}; padding: 40px 24px 32px; text-align:center; position:relative; overflow:hidden;">
      <div style="position:absolute; top:-40px; right:-40px; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.08);"></div>
      <div style="position:absolute; bottom:-30px; left:-30px; width:100px; height:100px; border-radius:50%; background:rgba(255,255,255,0.06);"></div>
      <div style="position:relative; z-index:1;">
        <div style="font-size:2.2rem; font-weight:800; color:#fff; letter-spacing:0.06em; text-shadow:0 2px 8px rgba(0,0,0,0.15);">不背日语</div>
        <div style="font-size:0.85rem; color:rgba(255,255,255,0.7); margin-top:6px; letter-spacing:0.04em;">自然的词汇习得</div>
        <div style="display:inline-flex; align-items:center; gap:4px; margin-top:14px; background:rgba(255,255,255,0.15); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); padding:6px 16px; border-radius:20px; color:#fff; font-size:0.85rem; font-weight:600;">
          🔥 连续 ${streak} 天
        </div>
      </div>
    </div>

    <div class="fade-in" style="position:relative; z-index:1; margin-top:-16px; border-radius:24px 24px 0 0; background:var(--color-bg); padding:20px var(--space-lg) 0;">

      <!-- Today Mini Stats -->
      <div style="display:flex; gap:12px; margin-bottom:20px;">
        <div style="flex:1; background:var(--color-card); border-radius:16px; padding:16px; text-align:center; box-shadow:var(--shadow-sm);">
          <div style="font-size:1.6rem; font-weight:700; color:var(--color-primary);">${learnedToday}<span style="font-size:0.8rem; font-weight:400; color:var(--color-text-secondary);"> /${dailyGoal}</span></div>
          <div style="font-size:0.75rem; color:var(--color-text-secondary); margin-top:2px;">今日新学</div>
        </div>
        <div style="flex:1; background:var(--color-card); border-radius:16px; padding:16px; text-align:center; box-shadow:var(--shadow-sm);">
          <div style="font-size:1.6rem; font-weight:700; color:var(--color-warning);">${reviewedToday}</div>
          <div style="font-size:0.75rem; color:var(--color-text-secondary); margin-top:2px;">今日复习</div>
        </div>
      </div>

      <!-- Learn Card -->
      <div class="home-card" onclick="startLearn()" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:#fff; border:none;">
        <div class="home-card-icon">📖</div>
        <div class="home-card-title" style="color:#fff;">学习新词</div>
        <div class="home-card-count" style="color:rgba(255,255,255,0.8);">
          ${newCount > 0 ? '还有 ' + newCount + ' 个新词等你探索' : '已全部学完 🎉'}
        </div>
        <div class="home-card-sub" style="color:rgba(255,255,255,0.5);">LEARN</div>
      </div>

      <!-- Review Card -->
      <div class="home-card" onclick="startReview()" style="animation-delay:0.1s; background:linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color:#fff; border:none;">
        <div class="home-card-icon">🔄</div>
        <div class="home-card-title" style="color:#fff;">复习巩固</div>
        <div class="home-card-count" style="color:rgba(255,255,255,0.8);">
          ${reviewSummary.due > 0 ? reviewSummary.due + ' 个单词等你复习' : '暂无待复习 ✅'}
        </div>
        <div class="home-card-sub" style="color:rgba(255,255,255,0.5);">REVIEW</div>
      </div>
    </div>
  `;
}

function startLearn() { navigate('learn'); }
function startReview() { navigate('review'); }
