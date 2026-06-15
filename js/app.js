/* ============================
   不背日语 — App Bootstrap & Router
   ============================ */

/* ---- App State ---- */

const AppState = {
  currentRoute: '',
  currentLessonId: null,
  previousRoute: null,
  isOnline: navigator.onLine,
};

/* ---- Router ---- */

const routes = {
  '#home':      { render: renderHome,      title: '不背日语' },
  '#lessons':   { render: renderLessonList, title: '课程列表' },
  '#lesson/':   { render: renderWordList,   title: '' },
  '#learn/':    { render: renderLearn,      title: '学习新词' },
  '#review':    { render: renderReview,     title: '复习' },
  '#quiz/':     { render: renderQuiz,       title: '测验' },
  '#stats':     { render: renderStats,      title: '学习统计' },
  '#settings':  { render: renderSettings,   title: '设置' },
};

function matchRoute(hash) {
  // Dynamic routes
  for (const pattern of ['#lesson/', '#learn/', '#quiz/']) {
    if (hash.startsWith(pattern)) {
      const id = parseInt(hash.slice(pattern.length));
      if (id) return { route: routes[pattern], lessonId: id };
    }
  }
  return { route: routes[hash] || routes['#home'], lessonId: null };
}

async function handleRoute() {
  const hash = window.location.hash || '#home';
  // Don't re-render same route (unless dynamic with different lessonId)
  if (hash === AppState.currentRoute) return;

  AppState.previousRoute = AppState.currentRoute;
  AppState.currentRoute = hash;

  const { route, lessonId } = matchRoute(hash);
  if (lessonId) AppState.currentLessonId = lessonId;

  // Update top bar
  updateTopBar(route.title || '');

  // Render view
  const app = document.getElementById('app');
  app.innerHTML = '';

  // Show loading
  if (route.title === '') {
    // Dynamic route title will be set inside render
  }

  try {
    const viewContent = await route.render(lessonId);
    if (typeof viewContent === 'string') {
      app.innerHTML = viewContent;
    }
  } catch (err) {
    console.error('[Router] Error rendering view:', err);
    app.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">出了点问题</div>
      <div class="empty-state-desc">请刷新页面重试</div>
    </div>`;
  }

  // Update tab bar
  updateTabBar(hash);

  // Scroll to top
  window.scrollTo(0, 0);

  // Call per-view setup if defined
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

  const showBack = AppState.currentRoute.startsWith('#lesson/') ||
                   AppState.currentRoute.startsWith('#learn/') ||
                   AppState.currentRoute.startsWith('#quiz/');

  // Transparent top bar for learn/review screens (blends with gradient bg)
  const isImmersive = AppState.currentRoute.startsWith('#learn/') ||
                      AppState.currentRoute === '#review';
  if (isImmersive) {
    topBar.classList.add('transparent');
  } else {
    topBar.classList.remove('transparent');
  }

  topBar.innerHTML = `
    ${showBack ? `<button class="top-bar-back" onclick="window.history.back()">←</button>` : ''}
    <span class="top-bar-title">${escapeHTML(title)}</span>
  `;
}

/* ---- Tab Bar ---- */

function updateTabBar(currentHash) {
  let tabBar = document.querySelector('.tab-bar');
  if (!tabBar) {
    tabBar = el(`<div class="tab-bar"></div>`);
    document.body.appendChild(tabBar);
  }

  const tabs = [
    { hash: '#lessons',  icon: '📖', label: '学习' },
    { hash: '#review',   icon: '🔄', label: '复习' },
    { hash: '#home',     icon: '🏠', label: '首页' },
    { hash: '#stats',    icon: '📊', label: '统计' },
    { hash: '#settings', icon: '⚙️',  label: '设置' },
  ];

  tabBar.innerHTML = tabs.map(t => {
    const active = (currentHash === t.hash) ||
                   (currentHash.startsWith('#lesson/') && t.hash === '#lessons') ||
                   (currentHash.startsWith('#learn/') && t.hash === '#lessons') ||
                   (currentHash.startsWith('#quiz/') && t.hash === '#lessons');
    return `<button class="tab-item${active ? ' active' : ''}"
                   onclick="navigate('${t.hash.slice(1)}')">
      <span class="tab-icon">${t.icon}</span>
      <span>${t.label}</span>
    </button>`;
  }).join('');
}

/* ---- Per-view Setup ---- */

function setupCurrentView(hash) {
  if (hash.startsWith('#learn/') && typeof setupLearnCardListeners === 'function') {
    setupLearnCardListeners();
  }
  if (hash === '#review' && typeof setupReviewCardListener === 'function') {
    setupReviewCardListener();
  }
}

/* ---- Navigation ---- */

function navigate(route, params = {}) {
  AppState.previousRoute = AppState.currentRoute;
  let hash = route.startsWith('#') ? route : `#${route}`;

  if (params.lessonId) {
    hash = `${hash}/${params.lessonId}`;
  }

  window.location.hash = hash;
}

function goBack() {
  window.history.back();
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
  console.log('[App] Bootstrapping 不背日语...');

  // 1. Init settings
  await initSettings();

  // 2. Register Service Worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js', { scope: './' });
      console.log('[SW] Registered');
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  }

  // 3. Request persistent storage
  if (navigator.storage && navigator.storage.persist) {
    const persisted = await navigator.storage.persist();
    console.log(`[Storage] Persistent: ${persisted}`);
  }

  // 4. Seed vocabulary on first launch
  await seedVocabularyIfNeeded();

  // 5. Init TTS
  await TTS.init();

  // 6. Update streak
  await updateStreak();

  // 7. Start router
  window.addEventListener('hashchange', handleRoute);

  // 8. Online/offline events
  window.addEventListener('online', () => {
    AppState.isOnline = true;
    updateOfflineBanner();
  });
  window.addEventListener('offline', () => {
    AppState.isOnline = false;
    updateOfflineBanner();
  });
  updateOfflineBanner();

  // 9. Prevent browser swipe-back gesture
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    if (e.touches.length !== 1) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    // If primarily horizontal swipe near the edge of screen, block it
    if (dx > dy && dx > 10 && (touchStartX < 25 || touchStartX > window.innerWidth - 25)) {
      e.preventDefault();
    }
  }, { passive: false });

  // 10. Handle back button for sub-screens
  window.addEventListener('popstate', () => {
    // Hash change will trigger handleRoute
  });

  // 10. Initial route
  await handleRoute();

  console.log('[App] Ready!');
}

// Start the app
bootstrap().catch(err => {
  console.error('[App] Bootstrap failed:', err);
  document.getElementById('app').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-title">启动失败</div>
      <div class="empty-state-desc">请检查浏览器是否支持 IndexedDB</div>
      <button class="btn btn-primary mt-md" onclick="location.reload()">刷新页面</button>
    </div>
  `;
});
