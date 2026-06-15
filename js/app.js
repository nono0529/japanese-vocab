/* ============================
   不背日语 — App Bootstrap & Router v3
   不背单词风格 · 3-Tab: 学习 | 听写 | 统计
   ============================ */

const AppState = {
  currentRoute: '',
  previousRoute: null,
  isOnline: navigator.onLine,
};

/* ---- Router ---- */

const routes = {
  '#home':      { render: renderHome,      title: '不背日语', tab: 'home' },
  '#learn':     { render: renderLearnFlow,  title: '学习新词', tab: 'home' },
  '#review':    { render: renderReviewFlow, title: '复习',     tab: 'home' },
  '#dictation': { render: renderDictation,  title: '听写',     tab: 'dictation' },
  '#stats':     { render: renderStats,      title: '统计',     tab: 'stats' },
  '#settings':  { render: renderSettings,   title: '设置',     tab: 'stats' },
};

function matchRoute(hash) {
  return routes[hash] || routes['#home'];
}

async function handleRoute() {
  const hash = window.location.hash || '#home';
  if (hash === AppState.currentRoute) return;

  AppState.previousRoute = AppState.currentRoute;
  AppState.currentRoute = hash;

  const route = matchRoute(hash);

  updateTopBar(route.title || '');
  updateTabBar(route.tab || 'home');

  const app = document.getElementById('app');
  app.innerHTML = '';

  try {
    const viewContent = await route.render();
    if (typeof viewContent === 'string') {
      app.innerHTML = viewContent;
    }
  } catch (err) {
    console.error('[Router] Error:', err);
    app.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">出了点问题</div>
      <div class="empty-state-desc">请刷新页面重试</div>
    </div>`;
  }

  window.scrollTo(0, 0);

  requestAnimationFrame(() => {
    if (typeof setupCurrentView === 'function') {
      setupCurrentView(hash);
    }
  });
}

/* ---- Top Bar ---- */

function updateTopBar(title) {
  let topBar = document.querySelector('.top-bar');
  if (!topBar) {
    topBar = el(`<div class="top-bar"></div>`);
    document.body.insertBefore(topBar, document.getElementById('app'));
  }

  const isImmersive = AppState.currentRoute === '#learn' ||
                      AppState.currentRoute === '#review';
  if (isImmersive) {
    topBar.classList.add('transparent');
  } else {
    topBar.classList.remove('transparent');
  }

  const showBack = AppState.currentRoute === '#learn' ||
                   AppState.currentRoute === '#review' ||
                   AppState.currentRoute === '#settings';

  topBar.innerHTML = `
    ${showBack ? `<button class="top-bar-back" onclick="navigate('home')">←</button>` : ''}
    <span class="top-bar-title">${escapeHTML(title)}</span>
  `;
}

/* ---- Tab Bar (3-tab) ---- */

function updateTabBar(activeTab) {
  let tabBar = document.querySelector('.tab-bar');
  if (!tabBar) {
    tabBar = el(`<div class="tab-bar"></div>`);
    document.body.appendChild(tabBar);
  }

  const tabs = [
    { id: 'home',       icon: '📖', label: '学习' },
    { id: 'dictation',  icon: '✍️', label: '听写' },
    { id: 'stats',      icon: '📊', label: '统计' },
  ];

  tabBar.innerHTML = tabs.map(t => `
    <button class="tab-item${activeTab === t.id ? ' active' : ''}"
            onclick="navigate('${t.id === 'home' ? 'home' : t.id}')">
      <span class="tab-icon">${t.icon}</span>
      <span>${t.label}</span>
    </button>
  `).join('');
}

/* ---- Per-view Setup ---- */

function setupCurrentView(hash) {
  if (hash === '#learn' && typeof setupLearnFlowListeners === 'function') {
    setupLearnFlowListeners();
  }
  if (hash === '#review' && typeof setupReviewCardListener === 'function') {
    setupReviewCardListener();
  }
  if (hash === '#dictation' && typeof setupDictationListeners === 'function') {
    setupDictationListeners();
  }
}

/* ---- Navigation ---- */

function navigate(route) {
  let hash = route.startsWith('#') ? route : `#${route}`;
  window.location.hash = hash;
}

/* ---- Offline Banner ---- */

function updateOfflineBanner() {
  let banner = document.querySelector('.offline-banner');
  if (!banner) {
    banner = el(`<div class="offline-banner">离线模式</div>`);
    document.body.appendChild(banner);
  }
  if (navigator.onLine) {
    banner.classList.remove('show');
  } else {
    banner.classList.add('show');
  }
}

/* ---- Bootstrap ---- */

async function bootstrap() {
  console.log('[App] Bootstrapping...');

  await initSettings();

  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js', { scope: './' }); } catch (err) {}
  }

  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }

  await seedVocabularyIfNeeded();
  await TTS.init();
  await updateStreak();

  window.addEventListener('hashchange', handleRoute);

  // Prevent browser swipe-back
  let tsX = 0, tsY = 0;
  document.addEventListener('touchstart', e => {
    if (e.touches.length === 1) { tsX = e.touches[0].clientX; tsY = e.touches[0].clientY; }
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return;
    const dx = Math.abs(e.touches[0].clientX - tsX);
    const dy = Math.abs(e.touches[0].clientY - tsY);
    if (dx > dy && dx > 10 && (tsX < 25 || tsX > window.innerWidth - 25)) e.preventDefault();
  }, { passive: false });

  window.addEventListener('online', () => { AppState.isOnline = true; updateOfflineBanner(); });
  window.addEventListener('offline', () => { AppState.isOnline = false; updateOfflineBanner(); });
  updateOfflineBanner();

  await handleRoute();
  console.log('[App] Ready!');
}

bootstrap().catch(err => {
  console.error('[App] Bootstrap failed:', err);
  document.getElementById('app').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">启动失败</div>
      <div class="empty-state-desc">请检查浏览器是否支持 IndexedDB</div>
      <button class="btn btn-primary mt-md" onclick="location.reload()">刷新页面</button>
    </div>`;
});
