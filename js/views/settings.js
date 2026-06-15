/* ============================
   不背日语 — Settings View
   ============================ */

async function renderSettings() {
  const dailyGoal = await getSetting('dailyNewWordGoal', '10');
  const reviewBatch = await getSetting('reviewBatchSize', '20');
  const ttsEnabled = await getSetting('ttsEnabled', 'true');
  const ttsRate = await getSetting('ttsRate', '0.9');
  const quizSize = await getSetting('quizSize', '10');

  return `
    <div class="fade-in" style="padding-bottom:12px;">

      <!-- Learning Settings -->
      <div class="section-header">
        <span class="section-title">学习设置</span>
      </div>
      <div class="settings-list">
        <div class="settings-item">
          <span class="settings-item-label">每日新词量</span>
          <select onchange="updateSetting('dailyNewWordGoal', this.value)">
            ${[5,10,15,20].map(n => `<option value="${n}" ${dailyGoal == n ? 'selected' : ''}>${n} 个</option>`).join('')}
          </select>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">每次复习量</span>
          <select onchange="updateSetting('reviewBatchSize', this.value)">
            ${[10,20,30,50].map(n => `<option value="${n}" ${reviewBatch == n ? 'selected' : ''}>${n} 个</option>`).join('')}
          </select>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">测验题数</span>
          <select onchange="updateSetting('quizSize', this.value)">
            ${[5,10,15,20].map(n => `<option value="${n}" ${quizSize == n ? 'selected' : ''}>${n} 题</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Voice Settings -->
      <div class="section-header">
        <span class="section-title">语音设置</span>
      </div>
      <div class="settings-list">
        <div class="settings-item">
          <span class="settings-item-label">语音朗读</span>
          <div class="toggle ${ttsEnabled === 'true' ? 'on' : ''}"
               onclick="toggleTTSSetting()" id="ttsToggle"></div>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">朗读速度</span>
          <select onchange="updateTTSSpeed(this.value)" ${ttsEnabled !== 'true' ? 'disabled' : ''}>
            <option value="0.7" ${ttsRate == '0.7' ? 'selected' : ''}>慢速 (0.7x)</option>
            <option value="0.9" ${ttsRate == '0.9' ? 'selected' : ''}>标准 (0.9x)</option>
            <option value="1.0" ${ttsRate == '1.0' ? 'selected' : ''}>正常 (1.0x)</option>
            <option value="1.2" ${ttsRate == '1.2' ? 'selected' : ''}>快速 (1.2x)</option>
          </select>
        </div>
      </div>

      <!-- Data Management -->
      <div class="section-header">
        <span class="section-title">数据管理</span>
      </div>
      <div class="settings-list">
        <div class="settings-item" onclick="resetProgress()" style="cursor:pointer;">
          <span class="settings-item-label" style="color:var(--color-danger);">重置学习进度</span>
          <span style="font-size:0.85rem; color:var(--color-text-light);">↗</span>
        </div>
      </div>

      <!-- About -->
      <div class="section-header">
        <span class="section-title">关于</span>
      </div>
      <div class="settings-list">
        <div class="settings-item">
          <span class="settings-item-label">应用版本</span>
          <span class="settings-item-value">1.0.0</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">教材</span>
          <span class="settings-item-value">新经典日本语基础教程第一册</span>
        </div>
        <div class="settings-item">
          <span class="settings-item-label">词库版本</span>
          <span class="settings-item-value">1.0.0</span>
        </div>
      </div>

      <div style="text-align:center; padding:24px; font-size:0.85rem; color:var(--color-text-light);">
        <div>不背日语 🇯🇵</div>
        <div style="margin-top:4px;">基于 SM-2 记忆曲线的日语单词学习应用</div>
      </div>
    </div>
  `;
}

async function updateSetting(key, value) {
  await setSetting(key, value);
  showToast('设置已保存 ✓', 1500);
}

async function toggleTTSSetting() {
  const enabled = await TTS.toggle();
  const toggle = document.getElementById('ttsToggle');
  if (toggle) {
    toggle.classList.toggle('on', enabled);
  }
  showToast(enabled ? '语音朗读已开启 🔊' : '语音朗读已关闭 🔇', 1500);
}

async function updateTTSSpeed(rate) {
  await TTS.setRate(parseFloat(rate)); // TTS.setRate already saves to settings
  showToast('朗读速度已更新 ✓', 1500);
}

async function resetProgress() {
  // Show confirmation modal
  const modal = el(`
    <div class="modal-overlay" id="resetModal">
      <div class="modal">
        <div class="modal-title">⚠️ 确认重置</div>
        <div class="modal-body">
          这将清除所有学习进度、复习记录和统计数据。<br>
          单词库本身不会被删除。<br><br>
          <strong style="color:var(--color-danger);">此操作不可撤销！</strong>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="document.getElementById('resetModal').remove()">取消</button>
          <button class="btn btn-danger" onclick="confirmResetProgress()">确认重置</button>
        </div>
      </div>
    </div>
  `);
  document.body.appendChild(modal);
}

async function confirmResetProgress() {
  const modal = document.getElementById('resetModal');
  if (modal) modal.remove();

  try {
    await db.transaction('rw', db.learningState, db.reviewHistory, db.dailyStats, db.lessonProgress, async () => {
      // Reset all learning states to 'new'
      const allStates = await db.learningState.toArray();
      for (const s of allStates) {
        await db.learningState.update(s.wordId, {
          status: 'new',
          easeFactor: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewDate: '',
          lastReviewDate: '',
          lapses: 0
        });
      }

      // Clear review history
      await db.reviewHistory.clear();

      // Clear daily stats
      await db.dailyStats.clear();

      // Reset lesson progress
      const allProgress = await db.lessonProgress.toArray();
      for (const lp of allProgress) {
        await db.lessonProgress.update(lp.lessonId, {
          learnedWords: 0,
          completed: false
        });
      }
    });

    showToast('学习进度已重置 ✓', 2000);

    // Reload home
    setTimeout(() => navigate('home'), 500);
  } catch (err) {
    console.error('[Settings] Reset failed:', err);
    showToast('重置失败，请重试', 2000);
  }
}
