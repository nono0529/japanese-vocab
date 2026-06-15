/* ============================
   不背日语 — Home (不背单词 Style)
   Two cards: Learn + Review
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

  const grads = [
    'linear-gradient(160deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
    'linear-gradient(160deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
    'linear-gradient(160deg, #141E30 0%, #243B55 100%)',
    'linear-gradient(160deg, #1B1B2F 0%, #2C2C54 50%, #3D3D6B 100%)',
  ];
  const bg = grads[Math.floor(Math.random() * grads.length)];

  return `
    <div class="learn-bg" style="background: ${bg};"></div>
    <div class="home-container fade-in">
      <div style="text-align:center; padding-top:12px;">
        <div style="font-size:0.9rem; color:rgba(255,255,255,0.6);">🔥 连续 ${streak} 天</div>
      </div>

      <div style="display:flex; justify-content:center; gap:24px; margin:16px 0; color:rgba(255,255,255,0.7); font-size:0.85rem;">
        <span>今日新学 ${learnedToday}</span>
        <span>今日复习 ${reviewedToday}</span>
      </div>

      <!-- Learn Card -->
      <div class="home-card" onclick="startLearn()">
        <div class="home-card-icon">📖</div>
        <div class="home-card-title">学习新词</div>
        <div class="home-card-count">${newCount > 0 ? newCount + ' 个待学' : '已全部学完 🎉'}</div>
        <div class="home-card-sub">Learn</div>
      </div>

      <!-- Review Card -->
      <div class="home-card" onclick="startReview()" style="animation-delay:0.1s">
        <div class="home-card-icon">🔄</div>
        <div class="home-card-title">复习巩固</div>
        <div class="home-card-count">${reviewSummary.due > 0 ? reviewSummary.due + ' 个待复习' : '暂无待复习 ✅'}</div>
        <div class="home-card-sub">Review</div>
      </div>

      <div style="text-align:center; margin-top:24px;">
        <button onclick="navigate('settings')" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15); color:rgba(255,255,255,0.7); padding:8px 20px; border-radius:20px; font-size:0.85rem; cursor:pointer; font-family:var(--font-mixed);">
          ⚙️ 设置
        </button>
      </div>
    </div>
  `;
}

function startLearn() { navigate('learn'); }
function startReview() { navigate('review'); }
