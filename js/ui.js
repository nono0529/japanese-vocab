/* ============================
   不背日语 — UI Helpers
   ============================ */

/* ---- DOM Helpers ---- */

function el(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, duration = 2000) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = el(`<div class="toast">${escapeHTML(message)}</div>`);
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ---- Card Flip ---- */

function setupCardFlip(cardInner) {
  cardInner.addEventListener('click', (e) => {
    // Don't flip if clicking buttons inside
    if (e.target.closest('button')) return;
    cardInner.classList.toggle('flipped');
  });
}

/* ---- Swipe Gestures ---- */

function setupSwipe(element, onSwipeLeft, onSwipeRight) {
  let startX = 0, currentX = 0, isDragging = false;

  element.addEventListener('touchstart', (e) => {
    if (element.classList.contains('flipped')) return;
    startX = e.touches[0].clientX;
    currentX = startX;
    isDragging = true;
    element.style.transition = 'none';
  }, { passive: true });

  element.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    const rotation = deltaX * 0.15;
    const opacity = 1 - Math.abs(deltaX) / 400;
    element.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
    element.style.opacity = Math.max(0.3, opacity);
  }, { passive: true });

  element.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    const deltaX = currentX - startX;

    element.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    if (deltaX > 80) {
      element.style.transform = 'translateX(150%) rotate(15deg)';
      element.style.opacity = '0';
      setTimeout(() => onSwipeRight(), 280);
    } else if (deltaX < -80) {
      element.style.transform = 'translateX(-150%) rotate(-15deg)';
      element.style.opacity = '0';
      setTimeout(() => onSwipeLeft(), 280);
    } else {
      element.style.transform = '';
      element.style.opacity = '1';
    }
  });
}

/* ---- Confetti ---- */

function showConfetti() {
  const container = el('<div class="confetti-container"></div>');
  document.body.appendChild(container);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8A5C'];
  const emojis = ['🎉', '🎊', '✨', '🌟', '💪', '🔥', '👏'];

  for (let i = 0; i < 50; i++) {
    const particle = el(`<span style="
      position: absolute;
      left: ${Math.random() * 100}%;
      top: -20px;
      font-size: ${Math.random() * 20 + 14}px;
      animation: confettiFall ${Math.random() * 2 + 2}s ease-in forwards;
      animation-delay: ${Math.random() * 0.5}s;
      color: ${colors[Math.floor(Math.random() * colors.length)]};
    ">${emojis[Math.floor(Math.random() * emojis.length)]}</span>`);
    container.appendChild(particle);
  }

  // Add confetti keyframes dynamically
  if (!document.getElementById('confetti-keyframes')) {
    const style = document.createElement('style');
    style.id = 'confetti-keyframes';
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => container.remove(), 3000);
}

/* ---- Rating Feedback ---- */

function showRatingFeedback(quality, callback) {
  const isCorrect = quality >= 3;
  const color = isCorrect ? 'var(--color-success)' : 'var(--color-danger)';
  const icon = isCorrect ? '✓' : '✗';

  const overlay = el(`
    <div style="
      position: fixed; inset: 0; z-index: 150;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none;
      animation: fadeIn 0.1s ease;
    ">
      <div style="
        width: 120px; height: 120px; border-radius: 50%;
        background: ${color}; color: white;
        display: flex; align-items: center; justify-content: center;
        font-size: 3rem; font-weight: 700;
        animation: scaleIn 0.2s ease;
      ">${icon}</div>
    </div>
  `);

  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.remove();
    if (callback) callback();
  }, 300);
}

/* ---- Progress Ring (SVG) ---- */

function createProgressRing(percentage, size = 60, strokeWidth = 4) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg)">
      <circle cx="${size/2}" cy="${size/2}" r="${radius}"
              fill="none" stroke="var(--color-border)" stroke-width="${strokeWidth}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${radius}"
              fill="none" stroke="var(--color-primary)" stroke-width="${strokeWidth}"
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
              stroke-linecap="round" style="transition: stroke-dashoffset 0.8s ease"/>
    </svg>
    <span style="position:absolute; font-size:0.8rem; font-weight:600; color:var(--color-primary)">
      ${percentage}%
    </span>
  `;
}

/* ---- Formatting ---- */

function formatMinutes(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining > 0 ? `${hours}小时${remaining}分钟` : `${hours}小时`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}

function getRelativeDateLabel(iso) {
  if (!iso) return '';
  const today = todayISO();
  if (iso === today) return '今天';
  const yesterday = addDays(today, -1);
  if (iso === yesterday) return '昨天';
  return formatDate(iso);
}
