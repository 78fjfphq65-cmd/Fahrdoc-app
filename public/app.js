/* ============================================
   FahrDoc v7 — app.js (Multi-Instructor + Week Grid + Images + New Students Widget)
   ============================================ */

// ============================================
// API CLIENT
// ============================================
var API_BASE = '.';

var ApiClient = {
  token: null,
  _ls: (function() { try { return window['local' + 'Storage']; } catch(e) { return null; } })(),
  _ss: (function() { try { return window['session' + 'Storage']; } catch(e) { return null; } })(),
  init: function() {
    // Try localStorage first (remember me), then sessionStorage
    this.token = (this._ls ? this._ls.getItem('fahrdoc_token') : null) || (this._ss ? this._ss.getItem('fahrdoc_token') : null);
  },
  setToken: function(t, remember) {
    this.token = t;
    // If remember param not given, check if token was in localStorage
    if (typeof remember === 'undefined') {
      remember = this._ls && this._ls.getItem('fahrdoc_token') ? true : false;
    }
    if (t) {
      if (remember && this._ls) {
        this._ls.setItem('fahrdoc_token', t);
        if (this._ss) this._ss.removeItem('fahrdoc_token');
      } else if (this._ss) {
        this._ss.setItem('fahrdoc_token', t);
        if (this._ls) this._ls.removeItem('fahrdoc_token');
      }
    } else {
      // Clear from both
      if (this._ls) this._ls.removeItem('fahrdoc_token');
      if (this._ss) this._ss.removeItem('fahrdoc_token');
    }
  },
  request: async function(method, path, body) {
    var opts = { method: method, headers: { 'Content-Type': 'application/json' } };
    if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
    if (body) opts.body = JSON.stringify(body);
    try {
      var res = await fetch(API_BASE + path, opts);
      var text = await res.text();
      var data;
      try { data = JSON.parse(text); } catch(e) {
        console.error('[API] Non-JSON response for ' + path + ':', text.substring(0, 200));
        throw new Error(t('serverfehler'));
      }
      if (!res.ok) throw new Error(data.error || t('serverfehler'));
      return data;
    } catch (err) {
      console.error('[API] Error for ' + method + ' ' + path + ':', err.message);
      if (err.message === t('sitzungAbgelaufen') || err.message === 'Nicht autorisiert') {
        this.setToken(null); App.navigate('welcome'); App.showToast(t('sitzungAbgelaufen')); throw err;
      }
      throw err;
    }
  },
  get: function(path) { return this.request('GET', path); },
  post: function(path, body) { return this.request('POST', path, body); },
  put: function(path, body) { return this.request('PUT', path, body); },
  del: function(path) { return this.request('DELETE', path); }
};

// ============================================
// TRANSLATION HELPER (for user-generated content like notes)
// ============================================
var TranslateHelper = {
  cache: {}, // key: text+targetLang → translated text
  translate: async function(text, targetLang) {
    if (!text || !text.trim()) return text;
    if (targetLang === 'de') return text; // Notes are stored in German, no translation needed
    var cacheKey = text + '|' + targetLang;
    if (this.cache[cacheKey]) return this.cache[cacheKey];
    try {
      var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=de&tl=' +
        encodeURIComponent(targetLang) + '&dt=t&q=' + encodeURIComponent(text);
      var resp = await fetch(url);
      var data = await resp.json();
      var translated = '';
      if (data && data[0]) {
        data[0].forEach(function(part) { if (part[0]) translated += part[0]; });
      }
      if (translated) {
        this.cache[cacheKey] = translated;
        return translated;
      }
      return text;
    } catch (e) {
      console.warn('Translation failed:', e);
      return text;
    }
  }
};

// ============================================
// SVG LOGOS
// ============================================
var FAHRDOC_LOGO_SVG = '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="FahrDoc Logo">' +
  '<rect x="8" y="6" width="24" height="32" rx="3" stroke="currentColor" stroke-width="2.5" fill="none"/>' +
  '<line x1="14" y1="14" x2="26" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '<line x1="14" y1="20" x2="26" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '<line x1="14" y1="26" x2="22" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '<path d="M30 28 C30 28, 36 20, 42 28 C42 28, 42 38, 36 42 C36 42, 30 38, 30 28Z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
  '<circle cx="36" cy="32" r="2" fill="currentColor"/>' +
  '</svg>';

var FAHRDOC_LOGO_SMALL = '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="FahrDoc" style="width:28px;height:28px;color:var(--color-primary)">' +
  '<rect x="8" y="6" width="24" height="32" rx="3" stroke="currentColor" stroke-width="2.5" fill="none"/>' +
  '<line x1="14" y1="14" x2="26" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '<line x1="14" y1="20" x2="26" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '<line x1="14" y1="26" x2="22" y2="26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
  '<path d="M30 28 C30 28, 36 20, 42 28 C42 28, 42 38, 36 42 C36 42, 30 38, 30 28Z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
  '<circle cx="36" cy="32" r="2" fill="currentColor"/>' +
  '</svg>';

// ============================================
// HELPERS & CONSTANTS
// ============================================
var AVATAR_COLORS = ['#0d8f8b', '#2563eb', '#7c3aed', '#ea580c', '#c53030', '#3a8a3e'];
var SKILL_LEVELS = [
  { level: 1, name: 'Anfänger', badgeClass: 'badge-error' },
  { level: 2, name: 'Fortgeschritten', badgeClass: 'badge-warning' },
  { level: 3, name: 'Sicher', badgeClass: 'badge-blue' },
  { level: 4, name: 'Prüfungsreif', badgeClass: 'badge-success' }
];
var SKILL_COLORS = { 1: 'var(--color-error)', 2: 'var(--color-warning)', 3: 'var(--color-blue)', 4: 'var(--color-success)' };
var SKILL_TASKS = ['Abbiegen', 'Spurwechsel', 'Vorfahrt', 'Einparken', 'Geschwindigkeit', 'Verkehrszeichen', 'Schulterblick', 'Allgemeines Fahrverhalten'];

var SCHEDULE_PRESETS = {
  'Übungsfahrt': 90, 'Überlandfahrt': 225, 'Autobahnfahrt': 180,
  'Nachtfahrt': 135, 'Prüfungsvorbereitung': 90, 'Praktische Prüfung': 55, 'Theoretische Prüfung': 45
};
var SCHEDULE_TYPES = Object.keys(SCHEDULE_PRESETS);
var DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
var DAY_NAMES_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// Type → CSS class mapping for colored slots
var SCHEDULE_TYPE_CLASS = {
  'Übungsfahrt': 'type-uebung', 'Überlandfahrt': 'type-ueberland', 'Autobahnfahrt': 'type-autobahn',
  'Nachtfahrt': 'type-nacht', 'Prüfungsvorbereitung': 'type-pruefvorb',
  'Praktische Prüfung': 'type-prakt-pruef', 'Theoretische Prüfung': 'type-theo-pruef'
};
var GRID_START_HOUR = 7;
var GRID_END_HOUR = 21;
var PX_PER_MIN = 1; // 1 minute = 1 pixel
var HOUR_HEIGHT = 60; // 60 min * 1px

function timeToMinutes(t) {
  var p = t.split(':');
  return parseInt(p[0]) * 60 + parseInt(p[1]);
}
function slotTopPx(startTime) {
  return (timeToMinutes(startTime) - GRID_START_HOUR * 60) * PX_PER_MIN;
}
function slotHeightPx(startTime, endTime) {
  return Math.max((timeToMinutes(endTime) - timeToMinutes(startTime)) * PX_PER_MIN, 20);
}
function slotTypeClass(type) {
  return SCHEDULE_TYPE_CLASS[type] || 'type-uebung';
}
function isPruefung(type) {
  return type === 'Praktische Prüfung' || type === 'Theoretische Prüfung';
}

function getAvatarColor(name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function getInitials(name) {
  return name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2);
}
function getSkillLevel(val) {
  var v = Math.round(val);
  if (v <= 0) v = 1;
  if (v > 4) v = 4;
  return SKILL_LEVELS[v - 1];
}

// ============================================
// HELPER: Format date as YYYY-MM-DD without timezone shift
// ============================================
function formatDateLocal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ============================================
// APP STATE
// ============================================
var AppState = {
  currentUser: null, currentScreen: 'welcome', signupRole: 'student',
  signupUserId: null, activeLesson: null, lessonTimer: null, lessonStartTime: null,
  charts: {}, navHistory: [], summaryRatings: {}, theme: 'light', language: 'de',
  _cachedData: {},
  // Schedule
  scheduleWeekStart: null, scheduleData: null, scheduleSelectedDay: 0,
  scheduleSelectedInstructor: null, scheduleManualEndTime: false,
  multiViewCount: 1, multiViewInstructors: [],
  // Slot offer mode
  slotOfferMode: false, slotOfferSelected: [], slotOfferDuration: 90,
  // Instructor view mode
  instructorViewMode: 'day', // 'day' or 'week'
  // Notifications
  notificationCount: 0,
  // Image uploads for lesson
  pendingImages: [],
  // Route tracking
  routePoints: [],
  routeMarkers: [],
  gpsWatchId: null,
  map: null,
  mapPolyline: null,
  mapCurrentPos: null,
  mapMarkerObjects: [],
  totalDistance: 0,
  lastGpsPosition: null,
  bestEffortPosition: null,
  kalmanLat: null,
  kalmanLng: null,
  kalmanVariance: null
};

// ============================================
// MAIN APP OBJECT
// ============================================
var App = {

  // ──── INIT ────
  init: function() {
    ApiClient.init();
    this.applyTheme();
    document.querySelectorAll('[data-theme-toggle]').forEach(function(btn) {
      btn.addEventListener('click', function() { App.toggleTheme(); });
    });
    ['fahrdoc-logo-welcome','fahrdoc-logo-login','fahrdoc-logo-signup'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = '<div style="width:72px;height:72px;color:var(--color-primary);">' + FAHRDOC_LOGO_SVG + '</div>';
    });
    ['topbar-logo-school','topbar-logo-instructor','topbar-logo-student'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = FAHRDOC_LOGO_SMALL + '<span>FahrDoc</span>';
    });
    // Add notification bells
    ['screen-school-dashboard', 'screen-instructor-dashboard'].forEach(function(screenId) {
      var topRight = document.querySelector('#' + screenId + ' .top-bar-right');
      if (topRight && !topRight.querySelector('.notif-bell-btn')) {
        var bellBtn = document.createElement('button');
        bellBtn.className = 'icon-btn notif-bell-btn';
        bellBtn.setAttribute('aria-label', t('benachrichtigungen'));
        bellBtn.onclick = function(e) { e.stopPropagation(); App.toggleNotifications(); };
        bellBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
          '<span class="notif-badge hidden">0</span>';
        topRight.insertBefore(bellBtn, topRight.firstChild);
      }
    });
    this.setupCodeInputs();
    this.setRole('student', document.querySelector('.role-toggle-btn[data-role="student"]'));
    // Close lang dropdown on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.lang-selector-wrapper')) {
        document.querySelectorAll('.lang-dropdown').forEach(function(d) { d.classList.add('hidden'); });
      }
      if (!e.target.closest('.dashboard-search-wrapper')) {
        var sr = document.getElementById('dashboard-search-results');
        if (sr) sr.classList.remove('visible');
      }
    });
    // Apply initial language
    applyLanguageToDOM();
    if (ApiClient.token) this.autoLogin();
    // Handle invite code from URL (?code=XXX) — persist across reloads via session store
    var urlParams = new URLSearchParams(window.location.search);
    var inviteCode = urlParams.get('code');
    var _ss = (function() { try { return window['session' + 'Storage']; } catch(e) { return null; } })();
    if (inviteCode) {
      try { if (_ss) _ss.setItem('fahrdoc_invite_code', inviteCode); } catch(e) {}
    } else {
      try { if (_ss) inviteCode = _ss.getItem('fahrdoc_invite_code'); } catch(e) {}
    }
    if (inviteCode) {
      AppState._pendingInviteCode = inviteCode;
      // Clean URL but keep code in sessionStorage until consumed
      if (window.location.search.indexOf('code=') !== -1) {
        window.history.replaceState({}, '', window.location.pathname);
      }
      // If not logged in, auto-navigate to signup
      if (!ApiClient.token) {
        setTimeout(function() { App.navigate('signup'); }, 600);
      }
    }
  },

  autoLogin: async function() {
    try {
      this.showLoading(true);
      var user = await ApiClient.get('/api/auth/me');
      AppState.currentUser = user;
      var dash = { school: 'school-dashboard', instructor: 'instructor-dashboard', student: 'student-dashboard' };
      this.navigate(dash[user.role]);
      // Handle Stripe redirect
      var params = new URLSearchParams(window.location.search);
      if (params.get('stripe') === 'success') {
        setTimeout(function() { App.showToast('Abo erfolgreich gestartet!'); if (user.role === 'school') App.switchSchoolTab('profile'); }, 500);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('stripe') === 'cancel') {
        setTimeout(function() { App.showToast('Checkout abgebrochen'); }, 500);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) { ApiClient.setToken(null); } finally { this.showLoading(false); }
  },

  showLoading: function(show) {
    var el = document.getElementById('loading-overlay');
    if (el) el.classList.toggle('hidden', !show);
  },

  // ──── THEME ────
  applyTheme: function() { document.documentElement.setAttribute('data-theme', AppState.theme); },
  toggleTheme: function() {
    AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    if (AppState.currentUser) {
      if (AppState.currentUser.role === 'school') this.renderSchoolDashboardTab();
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      if (AppState.currentUser.role === 'student') this.renderStudentOverview();
    }
  },

  // ──── LANGUAGE ────
  toggleLangMenu: function(btn) {
    var wrapper = btn.parentElement;
    var dropdown = wrapper.querySelector('.lang-dropdown');
    // Close all other dropdowns first
    document.querySelectorAll('.lang-dropdown').forEach(function(d) {
      if (d !== dropdown) d.classList.add('hidden');
    });
    var isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      var currentLang = AppState.language;
      var html = '';
      LANGUAGES.forEach(function(lang) {
        var isActive = lang.code === currentLang;
        html += '<button class="' + (isActive ? 'active' : '') + '" onclick="App.setLanguage(\'' + lang.code + '\')">' +
          '<span>' + lang.flag + '</span> <span>' + lang.name + '</span>' +
          '<span class="lang-check">✓</span></button>';
      });
      dropdown.innerHTML = html;
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  },

  setLanguage: function(lang) {
    AppState.language = lang;
    setLanguageDirection(lang);
    // Close all lang dropdowns
    document.querySelectorAll('.lang-dropdown').forEach(function(d) { d.classList.add('hidden'); });
    // Update data-i18n elements
    applyLanguageToDOM();
    // Re-render current view
    if (AppState.currentUser) {
      if (AppState.currentUser.role === 'school') { this.renderSchoolDashboardTab(); }
      else if (AppState.currentUser.role === 'instructor') { this.renderInstructorDashboardTab(); }
      else if (AppState.currentUser.role === 'student') { this.renderStudentOverview(); }
    }
    // Auto-translate notes on lesson review screen if visible
    var notesEl = document.getElementById('lesson-notes-text');
    if (notesEl) {
      var originalText = notesEl.getAttribute('data-original');
      if (lang === 'de') {
        notesEl.textContent = originalText;
        notesEl.setAttribute('data-translated', 'false');
        var btn = document.getElementById('translate-notes-btn');
        if (btn) btn.remove();
      } else {
        App.translateLessonNotes();
        // Translate marker notes too
        document.querySelectorAll('[data-marker-note]').forEach(async function(el) {
          var origNote = el.getAttribute('data-marker-note');
          if (origNote) {
            var translated = await TranslateHelper.translate(origNote, lang);
            el.textContent = translated;
          }
        });
      }
    }
  },

  // ──── NAVIGATION ────
  screenMap: {
    'welcome': 'screen-welcome', 'login': 'screen-login', 'signup': 'screen-signup',
    'verify-email': 'screen-verify-email', 'school-dashboard': 'screen-school-dashboard',
    'instructor-dashboard': 'screen-instructor-dashboard', 'student-dashboard': 'screen-student-dashboard',
    'lesson-setup': 'screen-lesson-setup', 'lesson-active': 'screen-lesson-active',
    'lesson-summary': 'screen-lesson-summary', 'lesson-review': 'screen-lesson-review',
    'student-detail': 'screen-student-detail', 'share-student': 'screen-share-student'
  },

  navigate: function(screen) {
    AppState.navHistory.push(AppState.currentScreen);
    AppState.currentScreen = screen;
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    var id = this.screenMap[screen] || ('screen-' + screen);
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
    // Auto-fill invite code when navigating to signup
    if (screen === 'signup' && AppState._pendingInviteCode) {
      var code = AppState._pendingInviteCode;
      AppState._pendingInviteCode = null;
      setTimeout(function() {
        var instField = document.getElementById('signup-school-code');
        var studField = document.getElementById('signup-invite-code');
        if (code.startsWith('FL') && instField) {
          App.setRole('instructor', document.querySelector('[data-role="instructor"]'));
          instField.value = code;
        } else if (studField) {
          App.setRole('student', document.querySelector('[data-role="student"]'));
          studField.value = code;
        }
      }, 100);
    }
    if (screen === 'school-dashboard') this.initSchoolDashboard();
    if (screen === 'instructor-dashboard') this.initInstructorDashboard();
    if (screen === 'student-dashboard') this.initStudentDashboard();
    if (screen === 'lesson-setup') this.initLessonSetup();
  },

  goBack: function() {
    var prev = AppState.navHistory.pop() || 'welcome';
    AppState.currentScreen = prev;
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    var id = this.screenMap[prev] || ('screen-' + prev);
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  // ──── AUTH ────
  togglePw: function(inputId, btn) {
    var inp = document.getElementById(inputId);
    if (!inp) return;
    var isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    var open = btn.querySelector('.eye-open');
    var closed = btn.querySelector('.eye-closed');
    if (open) open.style.display = isHidden ? 'none' : '';
    if (closed) closed.style.display = isHidden ? '' : 'none';
  },

  setRole: function(role, btn) {
    AppState.signupRole = role;
    document.querySelectorAll('.role-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.signup-conditional-fields').forEach(function(f) { f.classList.add('hidden'); });
    var fieldMap = { school: 'signup-school-fields', instructor: 'signup-instructor-fields', student: 'signup-student-fields' };
    var target = document.getElementById(fieldMap[role]);
    if (target) target.classList.remove('hidden');
  },

  handleLogin: async function(e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var pw = document.getElementById('login-password').value;
    var rememberEl = document.getElementById('login-remember');
    var remember = rememberEl ? rememberEl.checked : true;
    var errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden');
    try {
      this.showLoading(true);
      var result = await ApiClient.post('/api/auth/login', { email: email, password: pw });
      ApiClient.setToken(result.token, remember);
      AppState.currentUser = result.user;
      var dash = { school: 'school-dashboard', instructor: 'instructor-dashboard', student: 'student-dashboard' };
      this.navigate(dash[result.user.role]);
      this.showToast(t('willkommen') + ', ' + (result.user.admin_name || result.user.name) + '!');
    } catch (err) { errorEl.textContent = err.message; errorEl.classList.remove('hidden'); }
    finally { this.showLoading(false); }
  },

  handleSignup: async function(e) {
    e.preventDefault();
    var pw1 = document.getElementById('signup-password').value;
    var pw2 = document.getElementById('signup-password2').value;
    var errorEl = document.getElementById('signup-error');
    errorEl.classList.add('hidden');
    if (pw1 !== pw2) { errorEl.textContent = t('passwortNichtGleich'); errorEl.classList.remove('hidden'); return; }
    var body = {
      role: AppState.signupRole,
      firstName: document.getElementById('signup-firstname').value.trim(),
      lastName: document.getElementById('signup-lastname').value.trim(),
      email: document.getElementById('signup-email').value.trim(),
      password: pw1
    };
    if (AppState.signupRole === 'school') {
      body.schoolName = document.getElementById('signup-school-name').value.trim();
      body.schoolAddress = document.getElementById('signup-school-address').value.trim();
    } else if (AppState.signupRole === 'instructor') {
      body.inviteCode = document.getElementById('signup-school-code').value.trim();
    } else if (AppState.signupRole === 'student') {
      body.inviteCode = document.getElementById('signup-invite-code').value.trim();
    }
    try {
      this.showLoading(true);
      var result = await ApiClient.post('/api/auth/signup', body);
      AppState.signupUserId = result.userId;
      AppState.signupRole = result.role;
      this.navigate('verify-email');
    } catch (err) { errorEl.textContent = err.message; errorEl.classList.remove('hidden'); }
    finally { this.showLoading(false); }
  },

  setupCodeInputs: function() {
    var container = document.getElementById('code-inputs');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var inp = document.createElement('input');
      inp.className = 'code-input'; inp.type = 'text'; inp.maxLength = 1; inp.inputMode = 'numeric';
      inp.setAttribute('autocomplete', 'one-time-code');
      inp.addEventListener('input', function(ev) { if (ev.target.value && ev.target.nextElementSibling) ev.target.nextElementSibling.focus(); });
      inp.addEventListener('keydown', function(ev) { if (ev.key === 'Backspace' && !ev.target.value && ev.target.previousElementSibling) ev.target.previousElementSibling.focus(); });
      container.appendChild(inp);
    }
  },

  verifyCode: async function() {
    var inputs = document.querySelectorAll('#code-inputs .code-input');
    var code = '';
    inputs.forEach(function(i) { code += i.value; });
    if (code.length < 6) { var err = document.getElementById('verify-error'); err.textContent = t('codeVollstaendig'); err.classList.remove('hidden'); return; }
    try {
      this.showLoading(true);
      var result = await ApiClient.post('/api/auth/verify-email', { userId: AppState.signupUserId, role: AppState.signupRole, code: code });
      ApiClient.setToken(result.token);
      this.showToast(t('emailBestaetigt'));
      var user = await ApiClient.get('/api/auth/me');
      AppState.currentUser = user;
      var dash = { school: 'school-dashboard', instructor: 'instructor-dashboard', student: 'student-dashboard' };
      this.navigate(dash[user.role]);
    } catch (err) { var errEl = document.getElementById('verify-error'); errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    finally { this.showLoading(false); }
  },

  logout: async function() {
    try { await ApiClient.post('/api/auth/logout'); } catch(e) {}
    this.cleanupRouteTracking();
    ApiClient.setToken(null); AppState.currentUser = null; AppState.navHistory = [];
    AppState.activeLesson = null; AppState._cachedData = {}; AppState.scheduleData = null;
    AppState.scheduleWeekStart = null; AppState.pendingImages = [];
    if (AppState.lessonTimer) clearInterval(AppState.lessonTimer);
    this.navigate('welcome'); this.showToast(t('abgemeldet'));
  },

  // ──── TOAST & MODAL ────
  showToast: function(msg) {
    var t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 2500);
  },
  openModal: function(title, bodyHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-backdrop').classList.add('active');
  },
  closeModal: function(e) { if (e && e.target !== document.getElementById('modal-backdrop')) return; document.getElementById('modal-backdrop').classList.remove('active'); },
  closeModalForce: function() { document.getElementById('modal-backdrop').classList.remove('active'); },

  // ──── HELPERS ────
  formatDate: function(dateStr) {
    if (!dateStr) return '—';
    var parts = dateStr.split('-');
    return parts[2] + '.' + parts[1] + '.' + parts[0];
  },
  formatDuration: function(mins) {
    var h = Math.floor(mins / 60); var m = mins % 60;
    return h > 0 ? (h + 'h ' + m + 'min') : (m + ' min');
  },
  avatarHtml: function(name, size) {
    var cls = size === 'lg' ? 'avatar avatar-lg' : (size === 'sm' ? 'avatar avatar-sm' : 'avatar');
    return '<div class="' + cls + '" style="background:' + getAvatarColor(name) + '">' + getInitials(name) + '</div>';
  },
  skillLevelHtml: function(val) {
    var info = getSkillLevel(val);
    return '<span class="badge ' + info.badgeClass + '">' + tLevel(info.name) + '</span>';
  },
  avgRating: function(ratings) {
    if (!ratings) return 0;
    var keys = Object.keys(ratings);
    if (keys.length === 0) return 0;
    var sum = 0; keys.forEach(function(k) { sum += ratings[k]; });
    return sum / keys.length;
  },
  buildProgressRing: function(value, max, size) {
    var pct = (value / max) * 100;
    var r = (size - 8) / 2; var circ = 2 * Math.PI * r;
    var offset = circ - (pct / 100) * circ;
    var color = SKILL_COLORS[Math.round(value) || 1];
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle class="progress-ring-bg" cx="' + (size/2) + '" cy="' + (size/2) + '" r="' + r + '" fill="none" stroke-width="6"/>' +
      '<circle class="progress-ring-fill" cx="' + (size/2) + '" cy="' + (size/2) + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/>' +
      '</svg><div class="progress-ring-text"><span class="progress-ring-value" style="font-size:var(--text-sm);">' + value.toFixed(1) + '</span></div>';
  },
  timeAgo: function(dateStr) {
    var now = new Date(); var then = new Date(dateStr);
    var diff = Math.floor((now - then) / 60000);
    if (diff < 1) return t('geradeEben');
    if (diff < 60) return diff + ' ' + t('minuten');
    var hours = Math.floor(diff / 60);
    if (hours < 24) return hours + ' ' + t('stunden');
    var days = Math.floor(hours / 24);
    return days + ' ' + t('tage');
  },

  // ──── SCHEDULE HELPERS ────
  getWeekDates: function(baseDate) {
    var d = new Date(baseDate || new Date());
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    var monday = new Date(d.getFullYear(), d.getMonth(), diff);
    monday.setHours(0,0,0,0);
    var days = [];
    for (var i = 0; i < 6; i++) {
      var dd = new Date(monday); dd.setDate(monday.getDate() + i); days.push(dd);
    }
    return { monday: days[0], saturday: days[5], days: days };
  },

  initWeek: function() {
    if (!AppState.scheduleWeekStart) {
      var w = this.getWeekDates(new Date());
      AppState.scheduleWeekStart = w.monday;
    }
  },

  shiftWeek: function(dir) {
    this.initWeek();
    var d = new Date(AppState.scheduleWeekStart);
    d.setDate(d.getDate() + dir * 7);
    AppState.scheduleWeekStart = d;
    AppState.scheduleData = null;
    if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
    else this.renderSchoolScheduleTab();
  },

  selectDay: function(idx) {
    AppState.scheduleSelectedDay = idx;
    if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
    else this.renderSchoolScheduleTab();
  },

  setInstructorViewMode: function(mode) {
    AppState.instructorViewMode = mode;
    this.renderInstructorDashboardTab();
  },

  statusColor: function(status) {
    if (status === 'bestätigt') return 'var(--color-success)';
    if (status === 'geplant') return 'var(--color-blue)';
    if (status === 'offen') return 'var(--color-warning)';
    return 'var(--color-text-muted)';
  },

  statusBadgeClass: function(status) {
    if (status === 'bestätigt') return 'badge-success';
    if (status === 'geplant') return 'badge-blue';
    if (status === 'offen') return 'badge-warning';
    return 'badge-neutral';
  },

  weekLabel: function() {
    this.initWeek();
    var w = this.getWeekDates(AppState.scheduleWeekStart);
    var mon = w.monday; var sat = w.saturday;
    var oneJan = new Date(mon.getFullYear(), 0, 1);
    var weekNum = Math.ceil(((mon - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
    var months = getMonthNames();
    return 'KW ' + weekNum + ' · ' + mon.getDate() + '.–' + sat.getDate() + '. ' + months[mon.getMonth()] + ' ' + mon.getFullYear();
  },

  // Sunset time calculator for Germany (~51°N latitude)
  getSunsetTime: function(date) {
    var dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
    var lat = 51.0 * Math.PI / 180;
    var decl = -23.45 * Math.cos(2 * Math.PI * (dayOfYear + 10) / 365) * Math.PI / 180;
    var cosHA = -Math.tan(lat) * Math.tan(decl);
    if (cosHA < -1) cosHA = -1; if (cosHA > 1) cosHA = 1;
    var ha = Math.acos(cosHA) * 180 / Math.PI;
    var sunsetUTC = 12 + ha / 15;
    var sunsetLocal = sunsetUTC + 1;
    var isDST = date.getMonth() >= 2 && date.getMonth() <= 9;
    if (isDST) sunsetLocal += 1;
    var hours = Math.floor(sunsetLocal);
    var mins = Math.round((sunsetLocal - hours) * 60);
    return { hours: hours, minutes: mins, formatted: String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0') };
  },

  // Shared week grid renderer (admin + instructor)
  renderWeekGridHtml: function(days, slots, onCellClick, onSlotClick) {
    var totalMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60;
    var totalHeight = totalMinutes * PX_PER_MIN;
    var html = '<div class="week-grid-scroll-wrapper"><div class="week-grid' + (AppState.slotOfferMode ? ' week-grid-offer-mode' : '') + '">';
    // Header
    html += '<div class="week-grid-header"><div class="week-grid-time-gutter"></div>';
    days.forEach(function(day, idx) {
      var isToday = day.toDateString() === new Date().toDateString();
      html += '<div class="week-grid-day-header' + (isToday ? ' today' : '') + '">' +
        '<div class="week-grid-day-name">' + getDayNames()[idx] + '</div>' +
        '<div class="week-grid-day-date">' + day.getDate() + '.' + String(day.getMonth() + 1).padStart(2, '0') + '.</div></div>';
    });
    html += '</div>';
    // Body
    html += '<div class="week-grid-body" style="height:' + totalHeight + 'px;">';
    // Time gutter
    html += '<div class="week-grid-time-gutter">';
    for (var h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
      html += '<div class="week-grid-time-label" style="top:' + ((h - GRID_START_HOUR) * HOUR_HEIGHT) + 'px;height:' + HOUR_HEIGHT + 'px;">' + String(h).padStart(2, '0') + ':00</div>';
    }
    html += '</div>';
    // Day columns
    days.forEach(function(day, dayIdx) {
      var dayStr = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
      var isToday = day.toDateString() === new Date().toDateString();
      var daySlots = slots.filter(function(s) { return s.date === dayStr; });
      html += '<div class="week-grid-day-col' + (isToday ? ' today' : '') + '" onclick="App.onWeekGridCellClick(event, \'' + dayStr + '\', ' + JSON.stringify(onCellClick).replace(/"/g, '&quot;') + ')">';
      // Hour lines
      for (var hh = GRID_START_HOUR; hh < GRID_END_HOUR; hh++) {
        html += '<div class="week-grid-hour-line" style="top:' + ((hh - GRID_START_HOUR) * HOUR_HEIGHT) + 'px;"></div>';
      }
      // Sunset line
      var sunset = App.getSunsetTime(day);
      var sunsetMinFromStart = (sunset.hours * 60 + sunset.minutes) - GRID_START_HOUR * 60;
      if (sunsetMinFromStart > 0 && sunsetMinFromStart < totalMinutes) {
        var sunsetTopPx = sunsetMinFromStart * PX_PER_MIN;
        html += '<div class="sunset-line" style="top:' + sunsetTopPx + 'px;"><span class="sunset-label">\u2600\ufe0f\u2193 ' + sunset.formatted + '</span></div>';
      }
      // Slots
      daySlots.forEach(function(slot) {
        var top = slotTopPx(slot.start_time);
        var height = slotHeightPx(slot.start_time, slot.end_time);
        var isBlock = slot.slot_type === 'block';
        var typeCls = isBlock ? 'slot-block' : slotTypeClass(slot.type);
        var isOffen = !slot.student_id && !isBlock;
        var pruef = !isBlock && isPruefung(slot.type);
        var isUnconfirmed = !isBlock && slot.confirmed === false;
        var isRecurring = !isBlock && slot.notes && slot.notes.indexOf('[recurring:') !== -1;
        var isConfirmed = !isBlock && slot.confirmed !== false;
        var isTheory = slot.slot_type === 'theory';
        var typeCls = isBlock ? 'slot-block' : (isTheory ? (slot.instructor_id ? 'theory-slot-assigned' : 'theory-slot') : slotTypeClass(slot.type));
        var isOffen = !slot.student_id && !isBlock && !isTheory;
        var pruef = !isBlock && !isTheory && isPruefung(slot.type);
        var isUnconfirmed = !isBlock && !isTheory && slot.confirmed === false;
        var isConfirmed = !isBlock && !isTheory && slot.confirmed !== false;
        var isAdminView = AppState.currentUser && AppState.currentUser.role === 'school';
        var clickJs;
        if (isTheory) {
          clickJs = 'App.openTheoryDetail(&quot;' + slot.id + '&quot;)';
        } else if (isBlock) {
          clickJs = 'App.openBlockDetail(' + JSON.stringify(slot).replace(/"/g, '&quot;') + ')';
        } else {
          clickJs = onSlotClick.replace('{SLOT}', JSON.stringify(slot).replace(/"/g, '&quot;'));
        }
        html += '<div class="week-grid-slot ' + typeCls + (isOffen ? ' slot-offen' : '') + (pruef ? ' slot-pruefung' : '') + (isUnconfirmed ? ' slot-unconfirmed' : '') + '" ' +
          'style="top:' + top + 'px;height:' + height + 'px;" onclick="event.stopPropagation();' + clickJs + '">';
        // Green checkmark for confirmed slots in admin view
        if (isAdminView && isConfirmed && !isBlock && !isTheory) {
          html += '<span class="slot-confirmed-check" title="' + t('bestaetigt') + '">\u2713</span>';
        }
        if (isTheory) {
          // Theory block display
          if (height >= 40) {
            html += '<div class="theory-slot-label">' + t('theorieThema') + ' ' + (slot.theory_topic_number || '') + '</div>';
            html += '<div class="theory-slot-time">' + slot.start_time + '\u2013' + slot.end_time + '</div>';
            if (slot.instructor_name) {
              html += '<div class="theory-slot-time">' + slot.instructor_name + '</div>';
            }
          } else {
            html += '<div class="theory-slot-label">' + t('theorieThema') + ' ' + (slot.theory_topic_number || '') + '</div>';
          }
        } else if (isBlock) {
          // Block display
          if (height >= 40) {
            html += '<div class="week-grid-slot-time">' + slot.start_time + '\u2013' + slot.end_time + '</div>';
            if (slot.instructor_name) {
              html += '<div class="week-grid-slot-instructor">' + slot.instructor_name + '</div>';
            }
            html += '<div class="week-grid-slot-name">' + t('nichtVerfuegbar') + '</div>';
          } else {
            html += '<div class="week-grid-slot-time">' + slot.start_time + ' ' + t('nichtVerfuegbar') + '</div>';
          }
        } else if (height >= 40) {
          html += '<div class="week-grid-slot-time">' + slot.start_time + '\u2013' + slot.end_time + '</div>';
          if (slot.instructor_name) {
            html += '<div class="week-grid-slot-instructor">' + slot.instructor_name + '</div>';
          }
          html += '<div class="week-grid-slot-name">' + (slot.student_name || t('offen')) + '</div>';
          html += '<div class="week-grid-slot-type">' + tType(slot.type) + (pruef ? ' \ud83c\udfc1' : '') + (isUnconfirmed ? ' \u231b' : '') + (isRecurring ? ' <span class="recurring-badge">\uD83D\uDD01</span>' : '') + '</div>';
        } else {
          html += '<div class="week-grid-slot-time">' + slot.start_time + ' ' + (slot.instructor_name || slot.student_name || slot.type) + '</div>';
        }
        html += '</div>';
      });
      // Render selected offer slots as blue overlays
      if (AppState.slotOfferMode && AppState.slotOfferSelected.length > 0) {
        AppState.slotOfferSelected.forEach(function(sel) {
          if (sel.date === dayStr) {
            var selTop = slotTopPx(sel.start_time);
            var selH = sel.duration_min * PX_PER_MIN;
            html += '<div class="week-grid-slot-offer-selected" style="top:' + selTop + 'px;height:' + selH + 'px;" onclick="event.stopPropagation();App.toggleSlotSelection(\'' + sel.date + '\', \'' + sel.start_time + '\')">' +
              sel.start_time + '\u2013' + sel.end_time + '</div>';
          }
        });
      }
      html += '</div>';
    });
    html += '</div></div></div>';
    return html;
  },

  // ══════════════════════════════════════════
  //  NOTIFICATIONS
  // ══════════════════════════════════════════
  loadNotifications: async function() {
    try {
      var data = await ApiClient.get('/api/notifications');
      AppState.notificationCount = data.unreadCount;
      this.updateNotificationBadge();
    } catch(e) {}
  },

  updateNotificationBadge: function() {
    document.querySelectorAll('.notif-badge').forEach(function(el) {
      if (AppState.notificationCount > 0) {
        el.textContent = AppState.notificationCount;
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  },

  getNotifIcon: function(type) {
    var icons = {
      schedule_created: '<svg class="notif-type-icon notif-icon-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      schedule_updated: '<svg class="notif-type-icon notif-icon-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      schedule_deleted: '<svg class="notif-type-icon notif-icon-delete" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      schedule_confirmed: '<svg class="notif-type-icon notif-icon-confirm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      hu_reminder: '<svg class="notif-type-icon notif-icon-car" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 17h14v-5l-2-5H7L5 12v5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/></svg>',
      timeblock_created: '<svg class="notif-type-icon notif-icon-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
      lesson_reminder: '<svg class="notif-type-icon notif-icon-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
    };
    return icons[type] || '<svg class="notif-type-icon notif-icon-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  },

  toggleNotifications: async function() {
    var existing = document.getElementById('notif-panel');
    if (existing) { existing.remove(); return; }
    try {
      var data = await ApiClient.get('/api/notifications');
      var html = '<div id="notif-panel" class="notif-panel">' +
        '<div class="notif-panel-header"><span class="section-title" style="margin:0;">' + t('benachrichtigungen') + '</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="App.markAllRead()">' + t('alleGelesen') + '</button></div>';
      if (data.notifications.length === 0) {
        html += '<div class="notif-empty">' + t('keineBenachrichtigungen') + '</div>';
      } else {
        data.notifications.forEach(function(n) {
          var cls = n.is_read ? 'notif-item' : 'notif-item notif-unread';
          var icon = App.getNotifIcon(n.type);
          html += '<div class="' + cls + '" onclick="App.markNotifRead(\'' + n.id + '\')">' +
            '<div class="notif-item-row">' + icon +
            '<div class="notif-item-content">' +
            '<div class="notif-title">' + n.title + '</div>' +
            '<div class="notif-message">' + n.message + '</div>' +
            '<div class="notif-time">' + App.timeAgo(n.created_at) + '</div>' +
            '</div></div></div>';
        });
      }
      html += '</div>';
      document.body.insertAdjacentHTML('beforeend', html);
      setTimeout(function() {
        document.addEventListener('click', function closeNotif(e) {
          if (!e.target.closest('#notif-panel') && !e.target.closest('.notif-bell-btn')) {
            var p = document.getElementById('notif-panel'); if (p) p.remove();
            document.removeEventListener('click', closeNotif);
          }
        });
      }, 10);
    } catch(e) {}
  },

  markAllRead: async function() {
    try {
      await ApiClient.put('/api/notifications/read', {});
      AppState.notificationCount = 0; this.updateNotificationBadge();
      var panel = document.getElementById('notif-panel');
      if (panel) panel.querySelectorAll('.notif-unread').forEach(function(el) { el.classList.remove('notif-unread'); });
    } catch(e) {}
  },

  markNotifRead: async function(id) {
    try {
      await ApiClient.put('/api/notifications/read', { notificationId: id });
      AppState.notificationCount = Math.max(0, AppState.notificationCount - 1);
      this.updateNotificationBadge();
    } catch(e) {}
  },

  // ══════════════════════════════════════════
  //  SCHEDULE CRUD
  // ══════════════════════════════════════════
  createScheduleSlot: async function() {
    var form = document.getElementById('schedule-form');
    if (!form) return;
    var slotData = {
      date: document.getElementById('schedule-date').value,
      startTime: document.getElementById('schedule-start-time').value,
      endTime: document.getElementById('schedule-end-time').value,
      type: document.getElementById('schedule-type').value,
      licenseClass: document.getElementById('schedule-class').value,
      notes: document.getElementById('schedule-notes').value
    };
    var studentSel = document.getElementById('schedule-student');
    if (studentSel && studentSel.value) slotData.studentId = studentSel.value;
    var vehicleSel = document.getElementById('schedule-vehicle');
    if (vehicleSel && vehicleSel.value) slotData.vehicleId = vehicleSel.value;
    // Admin creating for instructor
    var instSel = document.getElementById('schedule-instructor-select');
    if (instSel && instSel.value) slotData.instructorId = instSel.value;

    // Check if recurring is enabled
    var recurringCb = document.getElementById('schedule-recurring');
    if (recurringCb && recurringCb.checked) {
      var frequency = document.getElementById('recurring-frequency').value;
      var endDate = document.getElementById('recurring-end-date').value;
      if (!endDate) {
        this.showToast(t('fehler') + ': ' + t('enddatum'));
        return;
      }
      slotData.frequency = frequency;
      slotData.end_date = endDate;
      slotData.skipConflicts = true;
      try {
        this.showLoading(true);
        var result = await ApiClient.post('/api/recurring-lessons', slotData);
        this.closeModalForce();
        var msg = t('termineErstellt', { count: result.created || 0 });
        if (result.skipped > 0) {
          msg += ' | ' + t('termineUebersprungen', { count: result.skipped });
        }
        this.showToast(msg);
        AppState.scheduleData = null;
        if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
        else this.renderSchoolScheduleTab();
      } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
      finally { this.showLoading(false); }
      return;
    }

    try {
      this.showLoading(true);
      await ApiClient.post('/api/schedule', slotData);
      this.closeModalForce(); this.showToast(t('terminErstellt'));
      AppState.scheduleData = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  updateScheduleSlot: async function(id) {
    var slotData = {
      date: document.getElementById('schedule-date').value,
      startTime: document.getElementById('schedule-start-time').value,
      endTime: document.getElementById('schedule-end-time').value,
      type: document.getElementById('schedule-type').value,
      licenseClass: document.getElementById('schedule-class').value,
      notes: document.getElementById('schedule-notes').value
    };
    var studentSel = document.getElementById('schedule-student');
    slotData.studentId = (studentSel && studentSel.value) ? studentSel.value : null;
    var vehicleSel = document.getElementById('schedule-vehicle');
    slotData.vehicleId = (vehicleSel && vehicleSel.value) ? vehicleSel.value : null;
    try {
      this.showLoading(true);
      await ApiClient.put('/api/schedule/' + id, slotData);
      this.closeModalForce(); this.showToast(t('terminAktualisiert'));
      AppState.scheduleData = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  deleteScheduleSlot: async function(id) {
    if (!confirm(t('terminWirklichLoeschen'))) return;
    try {
      this.showLoading(true);
      await ApiClient.del('/api/schedule/' + id);
      this.closeModalForce(); this.showToast(t('terminGeloescht'));
      AppState.scheduleData = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  confirmScheduleSlot: async function(id) {
    try {
      await ApiClient.post('/api/schedule/' + id + '/confirm');
      this.closeModalForce(); this.showToast(t('terminBestaetigt'));
      AppState.scheduleData = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  onScheduleTypeChange: function() {
    if (AppState.scheduleManualEndTime) return;
    var type = document.getElementById('schedule-type').value;
    var duration = SCHEDULE_PRESETS[type] || 90;
    var startEl = document.getElementById('schedule-start-time');
    var endEl = document.getElementById('schedule-end-time');
    if (startEl && startEl.value) {
      var parts = startEl.value.split(':');
      var startMin = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      var endMin = startMin + duration;
      endEl.value = String(Math.floor(endMin / 60)).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0');
    }
    this.updateDurationDisplay();
  },

  onScheduleStartChange: function() {
    AppState.scheduleManualEndTime = false;
    this.onScheduleTypeChange();
    this.updateDurationDisplay();
  },

  onScheduleEndManual: function() {
    AppState.scheduleManualEndTime = true;
    this.updateDurationDisplay();
  },

  // Click-to-time: calculate clicked time from mouse position in week grid column
  onWeekGridCellClick: function(event, dayStr, onCellClickTemplate) {
    var col = event.currentTarget;
    var rect = col.getBoundingClientRect();
    var yOffset = event.clientY - rect.top;
    var minutesFromStart = Math.round(yOffset / PX_PER_MIN);
    var totalMinutes = GRID_START_HOUR * 60 + minutesFromStart;
    // Round to nearest 30-min step
    totalMinutes = Math.round(totalMinutes / 30) * 30;
    if (totalMinutes < GRID_START_HOUR * 60) totalMinutes = GRID_START_HOUR * 60;
    if (totalMinutes >= GRID_END_HOUR * 60) totalMinutes = (GRID_END_HOUR - 1) * 60 + 30;
    var hours = Math.floor(totalMinutes / 60);
    var mins = totalMinutes % 60;
    var timeStr = String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
    // In slot offer mode, toggle slot selection instead of opening schedule modal
    if (AppState.slotOfferMode) {
      this.toggleSlotSelection(dayStr, timeStr);
      return;
    }
    var callStr = onCellClickTemplate.replace('{DAY}', dayStr).replace("'09:00'", "'" + timeStr + "'");
    eval(callStr);
  },

  // ──── SCHEDULE MODAL ────
  openScheduleModal: function(prefillDate, prefillTime, editSlot, instructorIdOverride) {
    AppState.scheduleManualEndTime = false;
    var isEdit = !!editSlot;
    var title = isEdit ? t('terminBearbeiten') : t('neuerTermin');

    var date = isEdit ? editSlot.date : (prefillDate || formatDateLocal(new Date()));
    var startTime = isEdit ? editSlot.start_time : (prefillTime || '09:00');
    var endTime = isEdit ? editSlot.end_time : '';
    var type = isEdit ? editSlot.type : 'Übungsfahrt';
    var cls = isEdit ? editSlot.license_class : 'B';
    var notes = isEdit ? (editSlot.notes || '') : '';
    var studentId = isEdit ? (editSlot.student_id || '') : '';

    if (!isEdit && !endTime) {
      var dur = SCHEDULE_PRESETS[type] || 90;
      var sp = startTime.split(':');
      var sm = parseInt(sp[0]) * 60 + parseInt(sp[1]);
      var em = sm + dur;
      endTime = String(Math.floor(em / 60)).padStart(2, '0') + ':' + String(em % 60).padStart(2, '0');
    }

    var html = '<form id="schedule-form" onsubmit="event.preventDefault();">';

    // If admin and creating new — show instructor selector
    if (AppState.currentUser.role === 'school' && !isEdit) {
      var insts = (AppState.scheduleData && AppState.scheduleData.instructors) || [];
      var selInstId = instructorIdOverride || AppState.scheduleSelectedInstructor || (insts.length > 0 ? insts[0].id : '');
      html += '<div class="form-group mb-3"><label class="form-label">' + t('fahrlehrer') + '</label><select class="form-select" id="schedule-instructor-select">';
      insts.forEach(function(inst) {
        html += '<option value="' + inst.id + '"' + (inst.id === selInstId ? ' selected' : '') + '>' + inst.name + '</option>';
      });
      html += '</select></div>';
    }

    html += '<div class="form-group mb-3"><label class="form-label">' + t('typ') + '</label>' +
      '<select class="form-select" id="schedule-type" onchange="App.onScheduleTypeChange()">';
    SCHEDULE_TYPES.forEach(function(st) {
      html += '<option value="' + st + '"' + (st === type ? ' selected' : '') + '>' + tType(st) + '</option>';
    });
    html += '</select></div>';

    html += '<div class="form-group mb-3"><label class="form-label">' + t('datum') + '</label>' +
      '<input class="form-input" type="date" id="schedule-date" value="' + date + '"></div>';

    html += '<div class="form-row form-row-2 mb-3">' +
      '<div class="form-group"><label class="form-label">' + t('start') + '</label>' +
        '<input class="form-input" type="time" id="schedule-start-time" value="' + startTime + '" onchange="App.onScheduleStartChange()"></div>' +
      '<div class="form-group"><label class="form-label">' + t('ende') + '</label>' +
        '<input class="form-input" type="time" id="schedule-end-time" value="' + endTime + '" onchange="App.onScheduleEndManual()"></div>' +
    '</div>';

    // Student selector
    html += '<div class="form-group mb-3"><label class="form-label">' + t('schuelerLeer') + '</label>' +
      '<select class="form-select" id="schedule-student"><option value="">— Offener Block —</option></select></div>';

    // Vehicle selector
    var vehicleId = isEdit ? (editSlot.vehicle_id || '') : '';
    html += '<div class="form-group mb-3"><label class="form-label">Fahrzeug</label>' +
      '<select class="form-select" id="schedule-vehicle"><option value="">— Kein Fahrzeug —</option></select></div>';

    html += '<div class="form-row form-row-2 mb-3">' +
      '<div class="form-group"><label class="form-label">' + t('klasse') + '</label>' +
        '<select class="form-select" id="schedule-class">' +
          '<option value="B"' + (cls === 'B' ? ' selected' : '') + '>B</option>' +
          '<option value="A"' + (cls === 'A' ? ' selected' : '') + '>A</option>' +
          '<option value="A1"' + (cls === 'A1' ? ' selected' : '') + '>A1</option>' +
          '<option value="A2"' + (cls === 'A2' ? ' selected' : '') + '>A2</option>' +
          '<option value="AM"' + (cls === 'AM' ? ' selected' : '') + '>AM</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">' + t('dauer') + '</label>' +
        '<div class="form-input" style="background:var(--color-surface-2);border:none;" id="schedule-duration-display">—</div></div>' +
    '</div>';

    html += '<div class="form-group mb-3"><label class="form-label">' + t('notizen') + '</label>' +
      '<textarea class="form-textarea" id="schedule-notes" placeholder="' + t('optional') + '">' + notes + '</textarea></div>';

    // Recurring toggle (only for new appointments, not edits)
    if (!isEdit) {
      html += '<div class="recurring-toggle">' +
        '<input type="checkbox" id="schedule-recurring" onchange="App.toggleRecurring()">' +
        '<label for="schedule-recurring">\uD83D\uDD01 ' + t('wiederkehrend') + '</label>' +
      '</div>';
      html += '<div id="recurring-options" class="recurring-options">' +
        '<div class="form-group mb-3"><label class="form-label">' + t('haeufigkeit') + '</label>' +
          '<select class="form-select" id="recurring-frequency" onchange="App.checkRecurringConflicts()">' +
            '<option value="weekly">' + t('woechentlich') + '</option>' +
            '<option value="biweekly">' + t('alleZweiWochen') + '</option>' +
          '</select></div>' +
        '<div class="form-group mb-3"><label class="form-label">' + t('enddatum') + '</label>' +
          '<input class="form-input" type="date" id="recurring-end-date" value="' + this.getDefaultRecurringEnd(date) + '" onchange="App.checkRecurringConflicts()"></div>' +
        '<div id="recurring-conflicts" class="recurring-conflicts"></div>' +
      '</div>';
    }

    if (isEdit) {
      // Show unconfirmed banner if applicable
      if (editSlot.confirmed === false) {
        html += '<div style="background:var(--color-warning-bg, #fff3cd);border:1px solid var(--color-warning, #f0ad4e);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);font-size:var(--text-sm);color:#856404;">' +
          '\u231b ' + t('wartaufBestaetigung') + '</div>';
      }
      html += '<div style="display:flex;gap:var(--space-3);flex-wrap:wrap;">';
      html += '<button type="button" class="btn btn-primary flex-1" onclick="App.updateScheduleSlot(\'' + editSlot.id + '\')">'+t('speichern')+'</button>';
      if (editSlot.status === 'geplant' || editSlot.confirmed === false) {
        html += '<button type="button" class="btn btn-success flex-1" onclick="App.confirmScheduleSlot(\'' + editSlot.id + '\')">'+t('bestaetigenBtn')+'</button>';
      }
      var isRecurringSlot = editSlot.notes && editSlot.notes.indexOf('[recurring:') !== -1;
      if (isRecurringSlot) {
        html += '<button type="button" class="btn btn-danger" onclick="App.showRecurringDeleteOptions(\'' + editSlot.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
      } else {
        html += '<button type="button" class="btn btn-danger" onclick="App.deleteScheduleSlot(\'' + editSlot.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
      }
      html += '</div>';
      // "Fahrstunde starten" button for instructor when student is assigned
      if (AppState.currentUser && AppState.currentUser.role === 'instructor' && editSlot.student_id) {
        html += '<button type="button" class="btn btn-full btn-lg mt-3" style="background:var(--color-success);color:#fff;" ' +
          'onclick="App.closeModalForce();App.startLessonFromSlot(\'' + editSlot.student_id + '\', \'' + editSlot.type + '\', \'' + editSlot.license_class + '\')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><polygon points="5,3 19,12 5,21 5,3"/></svg> '+t('fahrstundeStarten')+'</button>';
      }
    } else {
      html += '<button type="button" class="btn btn-primary btn-full btn-lg" onclick="App.createScheduleSlot()">'+t('terminErstellen')+'</button>';
    }
    html += '</form>';
    this.openModal(title, html);

    // Load students - for schedule modals load ALL school students
    this.loadScheduleStudents(studentId, isEdit ? editSlot.instructor_id : instructorIdOverride);
    this.loadScheduleVehicles(date, startTime, endTime, vehicleId);
    this.updateDurationDisplay();
  },

  loadScheduleVehicles: async function(date, startTime, endTime, preSelectId) {
    try {
      var sel = document.getElementById('schedule-vehicle');
      if (!sel) return;
      var data = await ApiClient.get('/api/vehicles/availability?date=' + date + '&startTime=' + startTime + '&endTime=' + endTime);
      var vehicles = data.vehicles || [];
      var optionsHtml = '<option value="">— Kein Fahrzeug —</option>';
      vehicles.forEach(function(v) {
        var disabled = !v.available;
        var label = v.brand + ' · ' + v.license_plate + ' (' + v.transmission + ')';
        if (disabled) {
          if (v.conflictReason) label += ' — ' + v.conflictReason;
          else if (v.conflictInstructor) label += ' — belegt von ' + v.conflictInstructor;
        }
        optionsHtml += '<option value="' + v.id + '"' +
          (v.id === preSelectId ? ' selected' : '') +
          (disabled && v.id !== preSelectId ? ' disabled style="color:var(--color-text-muted);"' : '') +
          '>' + label + '</option>';
      });
      sel.innerHTML = optionsHtml;
    } catch (err) { console.warn('Vehicle load error:', err); }
  },

  loadScheduleStudents: async function(preSelectId, instructorId) {
    try {
      var students;
      if (AppState.currentUser.role === 'instructor') {
        // Instructor sees ALL school students for scheduling
        students = await ApiClient.get('/api/instructor/school-students');
      } else {
        // Admin: get all students for the school
        var data = await ApiClient.get('/api/school/students');
        students = data.students || [];
      }
      var sel = document.getElementById('schedule-student');
      if (!sel) return;
      sel.innerHTML = '<option value="">— ' + t('offenerBlock') + ' —</option>';
      students.forEach(function(st) {
        var selected = st.id === preSelectId ? ' selected' : '';
        sel.innerHTML += '<option value="' + st.id + '"' + selected + '>' + st.name + ' (Klasse ' + st.license_class + ')</option>';
      });
    } catch(e) {}
  },

  // ──── TIME BLOCK (Zeitsperre) MODAL ────
  openBlockModal: function(prefillDate, prefillTime, instructorIdOverride) {
    var title = t('zeitsperreErstellen');
    var date = prefillDate || formatDateLocal(new Date());
    var startTime = prefillTime || '09:00';
    // Default 2 hour block
    var sp = startTime.split(':');
    var sm = parseInt(sp[0]) * 60 + parseInt(sp[1]);
    var em = sm + 120;
    var endTime = String(Math.floor(em / 60)).padStart(2, '0') + ':' + String(em % 60).padStart(2, '0');

    var html = '<form id="block-form" onsubmit="event.preventDefault();">';

    // If admin — show instructor selector
    if (AppState.currentUser.role === 'school') {
      var insts = (AppState.scheduleData && AppState.scheduleData.instructors) || [];
      var selInstId = instructorIdOverride || AppState.scheduleSelectedInstructor || (insts.length > 0 ? insts[0].id : '');
      html += '<div class="form-group mb-3"><label class="form-label">' + t('fahrlehrer') + '</label><select class="form-select" id="block-instructor-select">';
      insts.forEach(function(inst) {
        html += '<option value="' + inst.id + '"' + (inst.id === selInstId ? ' selected' : '') + '>' + inst.name + '</option>';
      });
      html += '</select></div>';
    }

    html += '<div class="form-group mb-3"><label class="form-label">' + t('datum') + '</label>' +
      '<input class="form-input" type="date" id="block-date" value="' + date + '"></div>';

    html += '<div class="form-row form-row-2 mb-3">' +
      '<div class="form-group"><label class="form-label">' + t('start') + '</label>' +
        '<input class="form-input" type="time" id="block-start-time" value="' + startTime + '" step="1800"></div>' +
      '<div class="form-group"><label class="form-label">' + t('ende') + '</label>' +
        '<input class="form-input" type="time" id="block-end-time" value="' + endTime + '" step="1800"></div>' +
    '</div>';

    html += '<div class="form-group mb-3"><label class="form-label">' + t('notizen') + '</label>' +
      '<textarea class="form-textarea" id="block-notes" placeholder="' + t('optional') + '"></textarea></div>';

    html += '<button type="button" class="btn btn-primary btn-full btn-lg" onclick="App.createBlock()">' + t('zeitsperreErstellen') + '</button>';
    html += '</form>';
    this.openModal(title, html);
  },

  openBlockDetail: function(block) {
    var title = t('zeitsperre');
    var html = '<div style="margin-bottom:var(--space-3);">';
    html += '<div class="form-group mb-2"><label class="form-label">' + t('datum') + '</label><div>' + block.date + '</div></div>';
    html += '<div class="form-group mb-2"><label class="form-label">' + t('start') + ' \u2013 ' + t('ende') + '</label><div>' + block.start_time + ' \u2013 ' + block.end_time + '</div></div>';
    if (block.instructor_name) {
      html += '<div class="form-group mb-2"><label class="form-label">' + t('fahrlehrer') + '</label><div>' + block.instructor_name + '</div></div>';
    }
    if (block.notes) {
      html += '<div class="form-group mb-2"><label class="form-label">' + t('notizen') + '</label><div>' + block.notes + '</div></div>';
    }
    html += '</div>';
    html += '<button type="button" class="btn btn-danger btn-full" onclick="App.deleteBlock(\'' + block.id + '\')">' + t('zeitsperreLoeschen') + '</button>';
    this.openModal(title, html);
  },

  createBlock: async function() {
    var blockData = {
      date: document.getElementById('block-date').value,
      startTime: document.getElementById('block-start-time').value,
      endTime: document.getElementById('block-end-time').value,
      notes: document.getElementById('block-notes').value
    };
    var instSel = document.getElementById('block-instructor-select');
    if (instSel && instSel.value) blockData.instructorId = instSel.value;
    try {
      this.showLoading(true);
      await ApiClient.post('/api/schedule/blocks', blockData);
      this.closeModalForce(); this.showToast(t('zeitsperreErstellt'));
      AppState.scheduleData = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  deleteBlock: async function(id) {
    if (!confirm(t('zeitsperreWirklichLoeschen'))) return;
    try {
      this.showLoading(true);
      await ApiClient.del('/api/schedule/blocks/' + id);
      this.closeModalForce(); this.showToast(t('zeitsperreGeloescht'));
      AppState.scheduleData = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  updateDurationDisplay: function() {
    var startEl = document.getElementById('schedule-start-time');
    var endEl = document.getElementById('schedule-end-time');
    var dispEl = document.getElementById('schedule-duration-display');
    if (!startEl || !endEl || !dispEl) return;
    if (startEl.value && endEl.value) {
      var sp = startEl.value.split(':'); var ep = endEl.value.split(':');
      var mins = (parseInt(ep[0]) * 60 + parseInt(ep[1])) - (parseInt(sp[0]) * 60 + parseInt(sp[1]));
      if (mins > 0) dispEl.textContent = this.formatDuration(mins);
      else dispEl.textContent = '—';
    }
  },

  // ══════════════════════════════════════════
  //  SCHOOL DASHBOARD
  // ══════════════════════════════════════════
  initSchoolDashboard: function() {
    var school = AppState.currentUser;
    document.getElementById('school-name-display').textContent = school.name;
    var banner = document.getElementById('school-trial-banner');
    var sub = school.subscription;
    if (sub) {
      var end = new Date(sub.trial_end); var now = new Date();
      var diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      if (diff > 0) { document.getElementById('school-trial-text').textContent = t('testphase') + ': ' + t('nochXTage', {n: diff}); banner.classList.remove('hidden'); }
      else banner.classList.add('hidden');
    }
    this.loadNotifications();
    this.switchSchoolTab('dashboard');
  },

  switchSchoolTab: function(tab, btn) {
    if (btn) {
      document.querySelectorAll('#school-nav .bottom-nav-item').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    } else {
      document.querySelectorAll('#school-nav .bottom-nav-item').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
      });
    }
    if (tab === 'dashboard') this.renderSchoolDashboardTab();
    else if (tab === 'schedule') this.renderSchoolScheduleTab();
    else if (tab === 'instructors') { this.dashboardViewMode = 'instructors'; this.renderSchoolDashboardTab(); }
    else if (tab === 'theory') this.showTheoryView();
    else if (tab === 'vehicles') this.renderSchoolVehiclesTab();
    else if (tab === 'abo') { this.switchSchoolTab('profile'); return; }
    else if (tab === 'profile') this.renderSchoolProfileTab();
  },

  dashboardViewMode: 'students',

  renderSchoolDashboardTab: async function() {
    var main = document.getElementById('school-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var data = await ApiClient.get('/api/school/dashboard');
      var studData = await ApiClient.get('/api/school/students');
      var instData = await ApiClient.get('/api/school/instructors');
      var school = AppState.currentUser;
      var mode = this.dashboardViewMode || 'students';
      var html = '<div class="page-padding">' +
        '<div class="welcome-msg"><h2>' + t('hallo') + ', ' + (school.admin_name || school.name) + '</h2><p>' + t('uebersichtSchule') + '</p></div>';

      // ──── SEARCH BAR ────
      html += '<div class="dashboard-search-wrapper">' +
        '<svg class="dashboard-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<input class="dashboard-search-input" type="text" id="dashboard-search" placeholder="' + t('sucheSchuelerFahrlehrer') + '" oninput="App.onDashboardSearch(this.value)" autocomplete="off">' +
        '<div class="dashboard-search-results" id="dashboard-search-results"></div></div>';

      // ──── NEW STUDENTS THIS WEEK WIDGET ────
      var newStudents = data.newStudentsThisWeek || [];
      html += '<div class="new-students-widget mb-4">' +
        '<div class="new-students-header">' +
          '<div class="new-students-icon-wrap">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>' +
          '</div>' +
          '<div class="new-students-text">' +
            '<div class="new-students-count">' + newStudents.length + '</div>' +
            '<div class="new-students-label">' + t('neueSchueler') + '</div>' +
          '</div>' +
        '</div>';
      if (newStudents.length > 0) {
        html += '<div class="new-students-list">';
        newStudents.forEach(function(st) {
          html += '<div class="new-student-chip">' + App.avatarHtml(st.name, 'sm') + '<span>' + st.name + '</span></div>';
        });
        html += '</div>';
      } else {
        html += '<div class="new-students-empty">' + t('keineNeueAnmeldungen') + '</div>';
      }
      html += '</div>';

      // ──── CLICKABLE STAT CARDS ────
      html += '<div class="stat-grid mb-4">' +
          '<div class="stat-card stat-card-clickable' + (mode === 'instructors' ? ' stat-card-active' : '') + '" onclick="App.dashboardViewMode=\'instructors\';App.renderDashboardContent();">' +
            '<div class="stat-card-label">' + t('fahrlehrer') + '</div><div class="stat-card-value">' + data.instructors.length + '</div></div>' +
          '<div class="stat-card stat-card-clickable' + (mode === 'students' ? ' stat-card-active' : '') + '" onclick="App.dashboardViewMode=\'students\';App.renderDashboardContent();">' +
            '<div class="stat-card-label">' + t('fahrschueler') + '</div><div class="stat-card-value">' + data.students.length + '</div></div>' +
        '</div>';

      // ──── DYNAMIC CONTENT AREA ────
      html += '<div id="dashboard-dynamic-content"></div>';
      html += '</div>';
      main.innerHTML = html;

      // Store data for toggling without re-fetching
      this._dashStudData = studData;
      this._dashInstData = instData;
      this.renderDashboardContent();
    } catch (err) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  _searchData: null,
  _loadSearchData: async function() {
    if (this._searchData) return;
    try {
      var studData = await ApiClient.get('/api/school/students');
      var instData = await ApiClient.get('/api/school/instructors');
      this._searchData = { students: studData.students || [], instructors: instData.instructors || [] };
    } catch(e) { this._searchData = { students: [], instructors: [] }; }
  },

  onDashboardSearch: async function(query) {
    var resultsEl = document.getElementById('dashboard-search-results');
    if (!resultsEl) return;
    if (!query || query.length < 2) { resultsEl.classList.remove('visible'); return; }
    await this._loadSearchData();
    var q = query.toLowerCase();
    var results = [];
    (this._searchData.instructors || []).forEach(function(inst) {
      if (inst.name.toLowerCase().indexOf(q) !== -1) {
        results.push({ id: inst.id, name: inst.name, role: 'fahrlehrer', type: 'instructor' });
      }
    });
    (this._searchData.students || []).forEach(function(stu) {
      if (stu.name.toLowerCase().indexOf(q) !== -1) {
        results.push({ id: stu.id, name: stu.name, role: 'fahrschueler', type: 'student', licenseClass: stu.license_class });
      }
    });
    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="dashboard-search-no-results">' + t('keineErgebnisse') + '</div>';
    } else {
      var html = '';
      results.slice(0, 10).forEach(function(r) {
        html += '<div class="dashboard-search-item" data-type="' + r.type + '" data-id="' + r.id + '">' +
          '<div>' + App.avatarHtml(r.name, 'sm') + '</div>' +
          '<div><div class="dashboard-search-item-name">' + r.name + '</div>' +
          '<div class="dashboard-search-item-role">' + t(r.role) + (r.licenseClass ? ' \u00b7 ' + t('klasse') + ' ' + r.licenseClass : '') + '</div></div></div>';
      });
      resultsEl.innerHTML = html;
      // Attach click handlers via event delegation
      resultsEl.querySelectorAll('.dashboard-search-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
          e.stopPropagation();
          var itemType = this.getAttribute('data-type');
          var itemId = this.getAttribute('data-id');
          resultsEl.classList.remove('visible');
          document.getElementById('dashboard-search').value = '';
          if (itemType === 'student') { App.viewStudentDetail(itemId); }
          else {
            // Navigate to Planung tab with this instructor selected
            AppState.scheduleSelectedInstructor = itemId;
            App.switchSchoolTab('schedule');
          }
        });
      });
    }
    resultsEl.classList.add('visible');
  },

  renderDashboardContent: function() {
    var container = document.getElementById('dashboard-dynamic-content');
    if (!container) return;
    var mode = this.dashboardViewMode || 'students';

    // Update active state on stat cards
    var cards = document.querySelectorAll('.stat-card-clickable');
    if (cards[0]) cards[0].classList.toggle('stat-card-active', mode === 'instructors');
    if (cards[1]) cards[1].classList.toggle('stat-card-active', mode === 'students');

    var html = '';
    if (mode === 'students') {
      var studData = this._dashStudData || { students: [], codes: [] };
      var codes = studData.codes || [];
      html += '<div class="section-header mt-4"><span class="section-title">' + t('schuelerCodes') + '</span>' +
        '<span class="section-action" onclick="App.generateNewCode(\'student\')">+ ' + t('neuerCode') + '</span></div>';
      codes.forEach(function(c) {
        html += '<div class="code-row"><div><span class="code-value">' + c.code + '</span></div>' +
          '<span class="badge ' + (c.status === 'offen' ? 'badge-success' : 'badge-neutral') + '">' + tStatus(c.status) + (c.used_by ? ' \u00b7 ' + c.used_by : '') + '</span></div>';
      });
      var students = studData.students || [];
      html += '<div class="section-header mt-4"><span class="section-title">' + t('fahrschueler') + ' (' + students.length + ')</span></div>';
      students.forEach(function(st) {
        html += '<div class="card card-interactive mb-3" onclick="App.viewStudentDetail(\'' + st.id + '\')"><div style="display:flex;align-items:center;gap:var(--space-3);">' +
          App.avatarHtml(st.name, '') +
          '<div class="flex-1"><div style="font-weight:600;font-size:var(--text-sm);">' + st.name + '</div>' +
          '<div class="text-xs text-muted">' + t('klasse') + ' ' + st.license_class + ' \u00b7 ' + st.lessonCount + ' ' + t('fahrstunden') + ' \u00b7 ' + (st.theoryCount || 0) + ' ' + t('theoriestunden') + '</div></div>' +
          '<div>' + App.skillLevelHtml(st.avgSkill || 0) + '</div></div></div>';
      });
    } else {
      var instData = this._dashInstData || { instructors: [], codes: [] };
      var instCodes = instData.codes || [];
      html += '<div class="section-header mt-4"><span class="section-title">' + t('einladungscodes') + '</span>' +
        '<span class="section-action" onclick="App.generateNewCode(\'instructor\')">+ ' + t('neuerCode') + '</span></div>';
      instCodes.forEach(function(c) {
        html += '<div class="code-row"><div><span class="code-value">' + c.code + '</span></div>' +
          '<span class="badge ' + (c.status === 'offen' ? 'badge-success' : 'badge-neutral') + '">' + tStatus(c.status) + (c.used_by ? ' \u00b7 ' + c.used_by : '') + '</span></div>';
      });
      var instructors = instData.instructors || [];
      html += '<div class="section-header mt-4"><span class="section-title">' + t('fahrlehrer') + ' (' + instructors.length + ')</span></div>';
      instructors.forEach(function(inst) {
        html += '<div class="card card-interactive mb-3"><div style="display:flex;align-items:center;gap:var(--space-3);">' +
          App.avatarHtml(inst.name, '') +
          '<div class="flex-1"><div style="font-weight:600;font-size:var(--text-sm);">' + inst.name + '</div>' +
          '<div class="text-xs text-muted">' + inst.email + ' \u00b7 ' + (inst.studentCount || 0) + ' ' + t('schueler') + '</div></div></div></div>';
      });
    }
    container.innerHTML = html;
  },


  renderSchoolScheduleTab: async function() {
    var main = document.getElementById('school-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    this.initWeek();
    var w = this.getWeekDates(AppState.scheduleWeekStart);
    var wsStr = formatDateLocal(w.monday);
    var weStr = formatDateLocal(w.saturday);
    var instFilter = AppState.scheduleSelectedInstructor || '';
    var url = '/api/schedule?weekStart=' + wsStr + '&weekEnd=' + weStr;
    if (instFilter) url += '&instructorId=' + instFilter;
    try {
      var data = await ApiClient.get(url);
      AppState.scheduleData = data;
      var instructors = data.instructors || [];
      if (!instFilter && instructors.length > 0) {
        AppState.scheduleSelectedInstructor = instructors[0].id;
        url = '/api/schedule?weekStart=' + wsStr + '&weekEnd=' + weStr + '&instructorId=' + instructors[0].id;
        data = await ApiClient.get(url);
        AppState.scheduleData = data;
        AppState.scheduleData.instructors = instructors;
      }

      var html = '<div class="page-padding' + (AppState.multiViewCount > 1 ? ' multi-view-active' : '') + '">';
      // Instructor filter (hidden in multi-view, each panel has its own)
      html += '<div class="schedule-toolbar">';
      if (AppState.multiViewCount === 1) {
        html += '<select class="form-select" id="school-instructor-filter" onchange="AppState.scheduleSelectedInstructor=this.value;AppState.scheduleData=null;App.renderSchoolScheduleTab()">';
        instructors.forEach(function(inst) {
          html += '<option value="' + inst.id + '"' + (inst.id === AppState.scheduleSelectedInstructor ? ' selected' : '') + '>' + inst.name + '</option>';
        });
        html += '</select>';
      }
      html += '<button class="btn btn-primary btn-sm" onclick="App.openScheduleModal(null, null, null, AppState.scheduleSelectedInstructor)">' + t('plusTermin') + '</button>' +
        '<button class="btn btn-ghost btn-sm" style="border:1px solid var(--color-border);" onclick="App.openBlockModal(null, null, AppState.scheduleSelectedInstructor)">' + t('plusZeitsperre') + '</button>' +
        '<button class="btn btn-sm' + (AppState.slotOfferMode ? ' btn-active-offer' : ' btn-ghost') + '" style="border:1px solid ' + (AppState.slotOfferMode ? 'var(--color-info)' : 'var(--color-border)') + ';" onclick="App.toggleSlotOfferMode()">' + t('termineAnbieten') + '</button>' +
        (AppState.slotOfferMode && AppState.slotOfferSelected.length > 0 ? '<button class="btn btn-sm" style="background:var(--color-info);color:#fff;border:none;" onclick="App.openSlotOfferDialog()">' + t('anbieten') + ' (' + AppState.slotOfferSelected.length + ')</button>' : '') +
        '<button class="btn btn-sm btn-ghost" style="border:1px solid var(--color-border);" onclick="App.showSlotOfferManagement()">' + t('meineAngebote') + '</button>' +
        '<div class="multi-view-toggle" style="margin-left:auto;display:flex;gap:2px;">' +
          '<button class="btn btn-ghost btn-sm' + (AppState.multiViewCount === 1 ? ' btn-active-view' : '') + '" style="border:1px solid var(--color-border);min-width:34px;padding:4px 6px;" onclick="App.setMultiView(1)" title="Einzelansicht"><svg viewBox="0 0 20 16" fill="currentColor" style="width:18px;height:14px;"><rect x="2" y="1" width="16" height="14" rx="2"/></svg></button>' +
          '<button class="btn btn-ghost btn-sm' + (AppState.multiViewCount === 2 ? ' btn-active-view' : '') + '" style="border:1px solid var(--color-border);min-width:34px;padding:4px 6px;" onclick="App.setMultiView(2)" title="Zweier-Ansicht"><svg viewBox="0 0 20 16" fill="currentColor" style="width:18px;height:14px;"><rect x="1" y="1" width="8" height="14" rx="1.5"/><rect x="11" y="1" width="8" height="14" rx="1.5"/></svg></button>' +
          '<button class="btn btn-ghost btn-sm' + (AppState.multiViewCount === 3 ? ' btn-active-view' : '') + '" style="border:1px solid var(--color-border);min-width:34px;padding:4px 6px;" onclick="App.setMultiView(3)" title="Dreier-Ansicht"><svg viewBox="0 0 22 16" fill="currentColor" style="width:20px;height:14px;"><rect x="1" y="1" width="5.5" height="14" rx="1.2"/><rect x="8.25" y="1" width="5.5" height="14" rx="1.2"/><rect x="15.5" y="1" width="5.5" height="14" rx="1.2"/></svg></button>' +
        '</div></div>';

      // Week nav
      html += '<div class="schedule-week-nav">' +
        '<button class="btn btn-ghost btn-sm" onclick="App.shiftWeek(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><polyline points="15,18 9,12 15,6"/></svg></button>' +
        '<span class="schedule-week-label">' + this.weekLabel() + '</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="App.shiftWeek(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><polyline points="9,18 15,12 9,6"/></svg></button></div>';

      // Slot offer mode hint
      if (AppState.slotOfferMode) {
        html += '<div class="slot-offer-hint"><svg viewBox="0 0 20 20" fill="currentColor" style="width:16px;height:16px;"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>' + t('slotAuswahlModus') + '</div>';
      }

      // Desktop week grid (absolute positioned)
      var slots = data.slots || [];

      // Fetch theory schedule for this week and merge into slots
      try {
        var theorySchedule = await ApiClient.get('/api/theory/schedule?week_start=' + wsStr);
        var selectedInst = AppState.scheduleSelectedInstructor;
        (theorySchedule || []).forEach(function(ts) {
          var isAssignedToSelected = ts.instructor_id && ts.instructor_id === selectedInst;
          var isUnassigned = !ts.instructor_id;
          // Show unassigned theory blocks (admin only) or assigned to selected instructor
          if (isUnassigned || isAssignedToSelected) {
            slots.push({
              id: ts.id,
              date: ts.date,
              start_time: ts.start_time,
              end_time: ts.end_time,
              slot_type: 'theory',
              theory_topic_number: ts.theory_topics ? ts.theory_topics.topic_number : '?',
              theory_topic_title: ts.theory_topics ? ts.theory_topics.title : '',
              instructor_id: ts.instructor_id,
              instructor_name: ts.instructor_name,
              status: ts.status
            });
          }
        });
      } catch(e) {}

      if (AppState.multiViewCount > 1) {
        // Multi view: 2 or 3 grids side by side, full width
        // Ensure multiViewInstructors array is populated
        this._ensureMultiViewInstructors(instructors);
        html += '<div class="multi-view-container multi-view-' + AppState.multiViewCount + '">';
        for (var mv = 0; mv < AppState.multiViewCount; mv++) {
          var mvInstId = AppState.multiViewInstructors[mv] || '';
          html += '<div class="multi-view-panel" data-panel="' + mv + '">';
          // Each panel gets its own instructor dropdown
          html += '<select class="form-select mb-2 multi-view-select" onchange="App.setMultiViewInstructor(' + mv + ', this.value)">';
          instructors.forEach(function(inst) {
            html += '<option value="' + inst.id + '"' + (inst.id === mvInstId ? ' selected' : '') + '>' + inst.name + '</option>';
          });
          html += '</select>';
          if (mv === 0) {
            // First panel uses already-loaded slots
            html += this.renderWeekGridHtml(
              w.days, slots,
              "App.openScheduleModal('{DAY}', '09:00', null, AppState.multiViewInstructors[0])",
              "App.openScheduleModal(null, null, {SLOT})"
            );
          } else {
            html += '<div id="multi-view-grid' + mv + '"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div>';
          }
          html += '</div>';
        }
        html += '</div>';
      } else {
        html += this.renderWeekGridHtml(
          w.days, slots,
          "App.openScheduleModal('{DAY}', '09:00', null, AppState.scheduleSelectedInstructor)",
          "App.openScheduleModal(null, null, {SLOT})"
        );
      }
      html += '</div>';
      main.innerHTML = html;

      // Load multi-view extra grids async
      if (AppState.multiViewCount > 1) {
        for (var g = 1; g < AppState.multiViewCount; g++) {
          this._loadMultiViewGrid(g, w, wsStr, instructors);
        }
        // Init drag-scroll on header row
        setTimeout(function() { App._initHeaderDragScroll(); }, 100);
      }
    } catch (err) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  // ══════════════════════════════════════════
  //  MULTI VIEW (1/2/3 instructors side by side)
  // ══════════════════════════════════════════
  setMultiView: function(count) {
    AppState.multiViewCount = count;
    var instructors = (AppState.scheduleData || {}).instructors || [];
    this._ensureMultiViewInstructors(instructors);
    // Sync first panel's instructor back to the main filter
    if (AppState.multiViewInstructors[0]) {
      AppState.scheduleSelectedInstructor = AppState.multiViewInstructors[0];
    }
    AppState.scheduleData = null;
    this.renderSchoolScheduleTab();
  },

  _ensureMultiViewInstructors: function(instructors) {
    if (!instructors || instructors.length === 0) return;
    // Make sure array has enough entries
    if (!AppState.multiViewInstructors[0]) {
      AppState.multiViewInstructors[0] = AppState.scheduleSelectedInstructor || instructors[0].id;
    }
    for (var idx = 1; idx < AppState.multiViewCount; idx++) {
      if (!AppState.multiViewInstructors[idx]) {
        // Pick a different instructor if possible
        var used = AppState.multiViewInstructors.slice(0, idx);
        var pick = null;
        for (var j = 0; j < instructors.length; j++) {
          if (used.indexOf(instructors[j].id) === -1) { pick = instructors[j].id; break; }
        }
        AppState.multiViewInstructors[idx] = pick || instructors[idx % instructors.length].id;
      }
    }
  },

  setMultiViewInstructor: function(panelIdx, instId) {
    AppState.multiViewInstructors[panelIdx] = instId;
    if (panelIdx === 0) {
      AppState.scheduleSelectedInstructor = instId;
      AppState.scheduleData = null;
    }
    this.renderSchoolScheduleTab();
  },

  _loadMultiViewGrid: async function(panelIdx, w, wsStr, instructors) {
    var container = document.getElementById('multi-view-grid' + panelIdx);
    if (!container) return;
    var instId = AppState.multiViewInstructors[panelIdx];
    if (!instId && instructors.length > 0) {
      instId = instructors[panelIdx % instructors.length].id;
      AppState.multiViewInstructors[panelIdx] = instId;
    }
    if (!instId) { container.innerHTML = '<p class="text-sm text-muted">' + t('keinFahrlehrer') + '</p>'; return; }
    try {
      var weStr = formatDateLocal(w.saturday);
      var data2 = await ApiClient.get('/api/schedule?weekStart=' + wsStr + '&weekEnd=' + weStr + '&instructorId=' + instId);
      var slots2 = data2.slots || [];
      try {
        var theorySchedule2 = await ApiClient.get('/api/theory/schedule?week_start=' + wsStr);
        (theorySchedule2 || []).forEach(function(ts) {
          var isAssigned = ts.instructor_id && ts.instructor_id === instId;
          var isUnassigned = !ts.instructor_id;
          if (isUnassigned || isAssigned) {
            slots2.push({
              id: ts.id, date: ts.date, start_time: ts.start_time, end_time: ts.end_time,
              slot_type: 'theory', theory_topic_number: ts.theory_topics ? ts.theory_topics.topic_number : '?',
              theory_topic_title: ts.theory_topics ? ts.theory_topics.title : '',
              instructor_id: ts.instructor_id, instructor_name: ts.instructor_name, status: ts.status
            });
          }
        });
      } catch(e) {}
      container.innerHTML = this.renderWeekGridHtml(
        w.days, slots2,
        "App.openScheduleModal('{DAY}', '09:00', null, AppState.multiViewInstructors[" + panelIdx + "])",
        "App.openScheduleModal(null, null, {SLOT})"
      );
      // Init drag-scroll on this panel after content loads
      this._initDragScrollOnPanel(container.closest('.multi-view-panel'));
    } catch (err) { container.innerHTML = '<p class="text-sm text-muted">' + t('fehler') + '</p>'; }
  },

  _initDragScrollOnPanel: function(panel) {
    if (!panel) return;
    var wrapper = panel.querySelector('.week-grid-scroll-wrapper');
    if (!wrapper || wrapper._dragScrollInit) return;
    wrapper._dragScrollInit = true;
    var isDragging = false;
    var startX = 0;
    var scrollLeft = 0;
    wrapper.style.cursor = 'grab';
    wrapper.addEventListener('mousedown', function(e) {
      // Only on header or empty area, not on slots
      if (e.target.closest('.week-grid-slot')) return;
      isDragging = true;
      wrapper.style.cursor = 'grabbing';
      startX = e.pageX;
      scrollLeft = wrapper.scrollLeft;
      e.preventDefault();
    });
    document.addEventListener('mouseup', function() {
      if (isDragging) { isDragging = false; wrapper.style.cursor = 'grab'; }
    });
    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      wrapper.scrollLeft = scrollLeft - (e.pageX - startX);
    });
  },

  _initHeaderDragScroll: function() {
    var panels = document.querySelectorAll('.multi-view-panel');
    var self = this;
    panels.forEach(function(panel) { self._initDragScrollOnPanel(panel); });
  },

  // ══════════════════════════════════════════
  //  SLOT OFFER MODE (Termine anbieten)
  // ══════════════════════════════════════════
  toggleSlotOfferMode: function() {
    AppState.slotOfferMode = !AppState.slotOfferMode;
    AppState.slotOfferSelected = [];
    this.renderSchoolScheduleTab();
  },

  toggleSlotSelection: function(date, startTime) {
    if (!AppState.slotOfferMode) return;
    var dur = AppState.slotOfferDuration;
    var parts = startTime.split(':');
    var endH = parseInt(parts[0]);
    var endM = parseInt(parts[1]) + dur;
    while (endM >= 60) { endH++; endM -= 60; }
    var endTime = (endH < 10 ? '0' : '') + endH + ':' + (endM < 10 ? '0' : '') + endM;
    var key = date + '|' + startTime + '|' + endTime;
    var idx = -1;
    for (var i = 0; i < AppState.slotOfferSelected.length; i++) {
      if (AppState.slotOfferSelected[i].key === key) { idx = i; break; }
    }
    if (idx >= 0) {
      AppState.slotOfferSelected.splice(idx, 1);
    } else {
      AppState.slotOfferSelected.push({ key: key, date: date, start_time: startTime, end_time: endTime, duration_min: dur });
    }
    this.renderSchoolScheduleTab();
  },

  openSlotOfferDialog: function() {
    if (!AppState.slotOfferSelected.length) return;
    var students = (AppState.scheduleData || {}).students || [];
    // If students not loaded yet, fetch from dashboard data
    if (!students.length && this._dashStudData) {
      students = this._dashStudData.students || [];
    }
    var slotsHtml = '';
    AppState.slotOfferSelected.forEach(function(s) {
      var d = new Date(s.date);
      var dayStr = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
      slotsHtml += '<div class="slot-offer-chip">' + dayStr + ' ' + s.start_time + '-' + s.end_time + '</div>';
    });
    // Fetch students
    var self = this;
    ApiClient.get('/api/school/dashboard').then(function(data) {
      var stuList = (data.students || []);
      var stuHtml = '';
      stuList.forEach(function(st) {
        stuHtml += '<label class="slot-offer-student-row"><input type="checkbox" value="' + st.id + '" class="slot-offer-stu-cb"> ' + st.name + ' <span class="text-xs text-muted">' + (st.license_class || '') + '</span></label>';
      });
      // Fetch vehicles
      ApiClient.get('/api/vehicles').then(function(vehicles) {
        var vehOptions = '<option value="">' + t('keinFahrzeug') + '</option>';
        (vehicles || []).forEach(function(v) {
          vehOptions += '<option value="' + v.id + '">' + v.make + ' ' + v.model + ' (' + v.plate + ')</option>';
        });
        self.showModal(
          '<div class="slot-offer-dialog">' +
            '<h3 style="margin-bottom:var(--space-3);">' + t('termineAnbieten') + '</h3>' +
            '<div class="slot-offer-slots-list mb-3">' + slotsHtml + '</div>' +
            '<div class="form-group mb-3"><label class="form-label">' + t('slotDauer') + '</label>' +
              '<div style="display:flex;gap:var(--space-2);">' +
                '<button class="btn btn-sm' + (AppState.slotOfferDuration === 45 ? ' btn-primary' : ' btn-ghost') + '" onclick="AppState.slotOfferDuration=45;App.openSlotOfferDialog()">45 min</button>' +
                '<button class="btn btn-sm' + (AppState.slotOfferDuration === 90 ? ' btn-primary' : ' btn-ghost') + '" onclick="AppState.slotOfferDuration=90;App.openSlotOfferDialog()">90 min</button>' +
              '</div></div>' +
            '<div class="form-group mb-3"><label class="form-label">' + t('fahrzeug') + '</label>' +
              '<select class="form-select" id="offer-vehicle">' + vehOptions + '</select></div>' +
            '<div class="form-group mb-3"><label class="form-label">' + t('ablaufzeit') + '</label>' +
              '<select class="form-select" id="offer-expires">' +
                '<option value="6">6 ' + t('stunden') + '</option>' +
                '<option value="12">12 ' + t('stunden') + '</option>' +
                '<option value="24" selected>24 ' + t('stunden') + '</option>' +
                '<option value="48">48 ' + t('stunden') + '</option>' +
                '<option value="72">72 ' + t('stunden') + '</option>' +
                '<option value="0">' + t('keinAblauf') + '</option>' +
              '</select></div>' +
            '<div class="form-group mb-3"><label class="form-label">' + t('absagefrist') + '</label>' +
              '<select class="form-select" id="offer-cancel-deadline">' +
                '<option value="24">24 ' + t('stunden') + '</option>' +
                '<option value="48">48 ' + t('stunden') + '</option>' +
                '<option value="72">72 ' + t('stunden') + '</option>' +
              '</select></div>' +
            '<div class="form-group mb-3"><label class="form-label">' + t('schuelerAuswaehlen') + '</label>' +
              '<div class="slot-offer-student-list">' +
                '<label class="slot-offer-student-row" style="font-weight:600;border-bottom:1px solid var(--color-border);padding-bottom:var(--space-2);margin-bottom:var(--space-2);"><input type="checkbox" id="offer-select-all" onchange="document.querySelectorAll(\'.slot-offer-stu-cb\').forEach(function(cb){cb.checked=document.getElementById(\'.offer-select-all\').checked})"> ' + t('alleAuswaehlen') + '</label>' +
                stuHtml +
              '</div></div>' +
            '<div class="form-group mb-3"><label class="form-label"><input type="checkbox" id="offer-recurring"> ' + t('woechentlichWiederholen') + '</label></div>' +
            '<button class="btn btn-primary btn-full btn-lg" onclick="App.submitSlotOffer()">' + t('abschicken') + '</button>' +
          '</div>'
        );
        // Fix select-all checkbox
        var selAll = document.getElementById('offer-select-all');
        if (selAll) {
          selAll.onchange = function() {
            document.querySelectorAll('.slot-offer-stu-cb').forEach(function(cb) { cb.checked = selAll.checked; });
          };
        }
      }).catch(function() {
        self.showModal('<div class="slot-offer-dialog"><h3>' + t('termineAnbieten') + '</h3><div class="slot-offer-slots-list mb-3">' + slotsHtml + '</div><div class="slot-offer-student-list">' + stuHtml + '</div><button class="btn btn-primary btn-full btn-lg" onclick="App.submitSlotOffer()">' + t('abschicken') + '</button></div>');
      });
    });
  },

  showSlotOfferManagement: async function() {
    var self = this;
    try {
      var offers = await ApiClient.get('/api/slot-offers/school');
      var html = '<div class="slot-offer-dialog" style="max-width:600px;">';
      html += '<h3 style="margin-bottom:var(--space-4);">' + t('meineAngebote') + '</h3>';
      if (!offers || offers.length === 0) {
        html += '<p class="text-sm text-muted">' + t('keineAngebote') + '</p>';
      } else {
        offers.forEach(function(offer) {
          var isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();
          var statusBadge = offer.status === 'active' && !isExpired
            ? '<span class="badge badge-success">' + t('aktiv') + '</span>'
            : '<span class="badge badge-muted">' + t('abgelaufen') + '</span>';
          html += '<div class="offer-card" style="margin-bottom:var(--space-3);">';
          html += '<div class="offer-card-header">' + statusBadge;
          if (offer.expires_at) {
            var expDate = new Date(offer.expires_at);
            html += '<div class="offer-card-expires">' + expDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</div>';
          }
          if (offer.recurring) html += '<span class="badge badge-blue" style="margin-left:var(--space-1);">\uD83D\uDD01 ' + t('woechentlichWiederholen') + '</span>';
          html += '</div>';
          html += '<div class="offer-card-slots">';
          (offer.slots || []).forEach(function(slot) {
            var d = new Date(slot.date);
            var dayStr2 = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
            var sClass = slot.status === 'booked' ? 'booked' : 'available';
            var sText = slot.status === 'booked' ? t('gebucht') : t('offen2');
            html += '<div class="offer-slot-row">' +
              '<div class="offer-slot-time">' + dayStr2 + ' \u00b7 ' + slot.start_time + '\u2013' + slot.end_time + '</div>' +
              '<span class="offer-slot-status ' + sClass + '">' + sText + '</span>' +
            '</div>';
          });
          html += '</div>';
          html += '<div class="text-xs text-muted" style="margin-top:var(--space-2);">' + t('empfaenger') + ': ' + (offer.recipients || []).length + ' ' + t('schueler') + '</div>';
          html += '</div>';
        });
      }
      html += '</div>';
      self.showModal(html);
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  submitSlotOffer: async function() {
    var selectedStudents = [];
    document.querySelectorAll('.slot-offer-stu-cb:checked').forEach(function(cb) {
      selectedStudents.push(cb.value);
    });
    if (!selectedStudents.length) {
      this.showToast(t('bitteSchuelerWaehlen'));
      return;
    }
    var expiresHours = parseInt(document.getElementById('offer-expires').value) || 0;
    var expiresAt = null;
    if (expiresHours > 0) {
      expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();
    }
    var cancelDeadline = parseInt(document.getElementById('offer-cancel-deadline').value) || 24;
    var vehicleId = document.getElementById('offer-vehicle') ? document.getElementById('offer-vehicle').value : null;
    var recurring = document.getElementById('offer-recurring') ? document.getElementById('offer-recurring').checked : false;
    try {
      await ApiClient.post('/api/slot-offers', {
        instructor_id: AppState.scheduleSelectedInstructor,
        slots: AppState.slotOfferSelected.map(function(s) {
          return { date: s.date, start_time: s.start_time, end_time: s.end_time, duration_min: s.duration_min };
        }),
        student_ids: selectedStudents,
        expires_at: expiresAt,
        cancel_deadline_hours: cancelDeadline,
        vehicle_id: vehicleId || null,
        recurring: recurring ? 'weekly' : null
      });
      this.closeModal();
      AppState.slotOfferMode = false;
      AppState.slotOfferSelected = [];
      this.showToast(t('termineAngeboten'));
      this.renderSchoolScheduleTab();
    } catch (err) {
      this.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  // ══════════════════════════════════════════
  //  THEORY PLANNING (Admin View)
  // ══════════════════════════════════════════
  _theoryRooms: [],
  _theoryTopics: [],
  _theoryRotations: [],
  _theoryShowRoomForm: false,
  _theoryEditRoomId: null,

  showTheoryView: async function() {
    var main = document.getElementById('school-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var rooms = await ApiClient.get('/api/theory/rooms');
      var topics = await ApiClient.get('/api/theory/topics');
      if ((!topics || topics.length === 0) && (!topics || !topics.message)) {
        topics = await ApiClient.post('/api/theory/topics', {});
        if (topics && topics.message) {
          topics = await ApiClient.get('/api/theory/topics');
        }
      }
      var rotations = await ApiClient.get('/api/theory/rotation');
      this._theoryRooms = rooms || [];
      this._theoryTopics = Array.isArray(topics) ? topics : [];
      this._theoryRotations = rotations || [];

      var html = '<div class="page-padding">';
      html += '<h2 style="margin-bottom:var(--space-4);">' + t('theorieVerwaltung') + '</h2>';

      // ── ROOMS SECTION ──
      html += '<div class="theory-section">';
      html += '<div class="theory-section-header"><span class="section-title">' + t('raeume') + '</span>' +
        '<button class="btn btn-primary btn-sm" onclick="App._theoryShowRoomForm=!App._theoryShowRoomForm;App._theoryEditRoomId=null;App.showTheoryView();">' + t('raumHinzufuegen') + '</button></div>';

      if (this._theoryShowRoomForm || this._theoryEditRoomId) {
        var editRoom = null;
        if (this._theoryEditRoomId) {
          for (var ri = 0; ri < this._theoryRooms.length; ri++) {
            if (this._theoryRooms[ri].id === this._theoryEditRoomId) { editRoom = this._theoryRooms[ri]; break; }
          }
        }
        html += '<div class="theory-room-form">' +
          '<div class="form-group"><label class="form-label">' + t('raumName') + '</label>' +
          '<input class="form-input" id="theory-room-name" value="' + (editRoom ? editRoom.name : '') + '"></div>' +
          '<div class="form-group"><label class="form-label">' + t('sitzplaetze') + '</label>' +
          '<input class="form-input" type="number" id="theory-room-seats" value="' + (editRoom ? editRoom.seat_limit : '25') + '" min="1"></div>' +
          '<button class="btn btn-primary btn-sm" onclick="App.saveTheoryRoom(\'' + (editRoom ? editRoom.id : '') + '\')">' + t('speichern') + '</button></div>';
      }

      if (this._theoryRooms.length === 0) {
        html += '<div class="text-sm text-muted" style="padding:var(--space-3);">' + t('keineRaeume') + '</div>';
      } else {
        this._theoryRooms.forEach(function(room) {
          html += '<div class="theory-room-card">' +
            '<div class="theory-room-info">' +
              '<div class="theory-room-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg></div>' +
              '<div><div class="theory-room-name">' + room.name + '</div>' +
              '<div class="theory-room-seats">' + room.seat_limit + ' ' + t('sitzplaetze') + '</div></div>' +
            '</div>' +
            '<div class="theory-room-actions">' +
              '<button class="btn btn-ghost btn-sm" onclick="App._theoryEditRoomId=\'' + room.id + '\';App._theoryShowRoomForm=true;App.showTheoryView();">' + t('bearbeiten') + '</button>' +
              '<button class="btn btn-ghost btn-sm" style="color:var(--color-error);" onclick="App.deleteTheoryRoom(\'' + room.id + '\')">' + t('loeschen') + '</button>' +
            '</div></div>';
        });
      }
      html += '</div>';

      // ── TOPICS SECTION ──
      html += '<div class="theory-section">';
      html += '<div class="theory-section-header"><span class="section-title">' + t('themen') + ' (14)</span></div>';
      html += '<div class="theory-topic-list">';
      this._theoryTopics.forEach(function(topic) {
        var badgeCls = topic.is_basic ? 'basic' : 'additional';
        var badgeText = topic.is_basic ? t('grundstoff') : t('zusatzstoff');
        html += '<div class="theory-topic-item">' +
          '<div class="theory-topic-number">' + topic.topic_number + '</div>' +
          '<div class="theory-topic-title">' + topic.title + '</div>' +
          '<span class="theory-topic-badge ' + badgeCls + '">' + badgeText + '</span></div>';
      });
      html += '</div></div>';

      // ── ROTATION SECTION ──
      html += '<div class="theory-section">';
      html += '<div class="theory-section-header"><span class="section-title">' + t('rotation') + '</span></div>';

      if (this._theoryRotations.length > 0) {
        html += '<div class="theory-rotation-current"><strong>' + t('aktuelleRotation') + ':</strong>';
        var dayLabels = [t('mo'), t('di'), t('mi'), t('do_'), t('fr'), t('sa')];
        this._theoryRotations.forEach(function(rot) {
          var dayName = dayLabels[rot.day_of_week] || ('Tag ' + rot.day_of_week);
          var roomName = rot.theory_rooms ? rot.theory_rooms.name : '';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-1) 0;">';
          html += '<span>' + dayName + ' ' + rot.start_time + '-' + rot.end_time + ' (' + roomName + ')</span>';
          html += '<button class="btn btn-ghost btn-sm" style="color:var(--color-error);padding:2px 8px;" onclick="App.deleteTheoryRotation(\'' + rot.id + '\')">&times;</button>';
          html += '</div>';
        });
        html += '<button class="btn btn-ghost btn-sm" style="color:var(--color-error);margin-top:var(--space-2);" onclick="App.deleteAllTheoryRotations()">' + t('alleRotationenLoeschen') + '</button>';
        html += '</div>';
      } else {
        html += '<div class="text-sm text-muted" style="padding:var(--space-3);margin-bottom:var(--space-3);">' + t('keineRotation') + '</div>';
      }

      html += '<div class="theory-rotation-form">';
      html += '<div class="form-group"><label class="form-label">' + t('wochentage') + '</label>';
      html += '<div class="theory-rotation-days">';
      var weekDays = [
        { idx: 0, label: t('mo') },
        { idx: 1, label: t('di') },
        { idx: 2, label: t('mi') },
        { idx: 3, label: t('do_') },
        { idx: 4, label: t('fr') },
        { idx: 5, label: t('sa') }
      ];
      weekDays.forEach(function(wd) {
        html += '<div class="theory-day-check" data-day="' + wd.idx + '" onclick="this.classList.toggle(\'selected\')">' + wd.label + '</div>';
      });
      html += '</div></div>';

      html += '<div class="theory-rotation-times">';
      html += '<div class="form-group"><label class="form-label">' + t('start') + '</label><input class="form-input" type="time" id="theory-rot-start" value="18:00"></div>';
      html += '<div class="form-group"><label class="form-label">' + t('ende') + '</label><input class="form-input" type="time" id="theory-rot-end" value="19:30"></div>';
      html += '<div class="form-group"><label class="form-label">' + t('startThema') + '</label><input class="form-input" type="number" id="theory-rot-topic" value="1" min="1" max="14"></div>';
      html += '</div>';

      if (this._theoryRooms.length > 0) {
        html += '<div class="form-group"><label class="form-label">' + t('raum') + '</label><select class="form-select" id="theory-rot-room">';
        this._theoryRooms.forEach(function(r) {
          html += '<option value="' + r.id + '">' + r.name + ' (' + r.seat_limit + ' ' + t('sitzplaetze') + ')</option>';
        });
        html += '</select></div>';
      }

      html += '<button class="btn btn-primary" style="margin-top:var(--space-3);width:100%;" onclick="App.saveTheoryRotation()">' + t('rotationSpeichern') + '</button>';
      html += '</div></div>';

      html += '</div>';
      main.innerHTML = html;
    } catch (err) {
      main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>';
    }
  },

  saveTheoryRoom: async function(editId) {
    var name = document.getElementById('theory-room-name').value.trim();
    var seats = parseInt(document.getElementById('theory-room-seats').value) || 25;
    if (!name) return;
    try {
      if (editId) {
        await ApiClient.put('/api/theory/rooms/' + editId, { name: name, seat_limit: seats });
      } else {
        await ApiClient.post('/api/theory/rooms', { name: name, seat_limit: seats });
      }
      this._theoryShowRoomForm = false;
      this._theoryEditRoomId = null;
      this.showToast(t('raumGespeichert'));
      this.showTheoryView();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  deleteTheoryRoom: async function(roomId) {
    if (!confirm(t('loeschen') + '?')) return;
    try {
      await ApiClient.del('/api/theory/rooms/' + roomId);
      this.showToast(t('raumGeloescht'));
      this.showTheoryView();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  saveTheoryRotation: async function() {
    var selectedDays = [];
    document.querySelectorAll('.theory-day-check.selected').forEach(function(el) {
      selectedDays.push(parseInt(el.getAttribute('data-day')));
    });
    if (selectedDays.length === 0) { this.showToast(t('wochentag') + '!'); return; }
    var startTime = document.getElementById('theory-rot-start').value;
    var endTime = document.getElementById('theory-rot-end').value;
    var startTopic = parseInt(document.getElementById('theory-rot-topic').value) || 1;
    var roomSelect = document.getElementById('theory-rot-room');
    var roomId = roomSelect ? roomSelect.value : null;
    if (!roomId) { this.showToast(t('raum') + '!'); return; }
    try {
      var result = await ApiClient.post('/api/theory/rotation', {
        room_id: roomId,
        days: selectedDays,
        start_time: startTime,
        end_time: endTime,
        start_topic_number: startTopic
      });
      this.showToast(t('rotationGespeichert') + ' - ' + result.generated + ' ' + t('termineGeneriert'));
      this.showTheoryView();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  deleteTheoryRotation: async function(rotId) {
    if (!confirm(t('rotationLoeschenBestaetigen'))) return;
    try {
      await ApiClient.del('/api/theory/rotation/' + rotId);
      this.showToast(t('geloescht'));
      this.showTheoryView();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  deleteAllTheoryRotations: async function() {
    if (!confirm(t('alleRotationenLoeschenBestaetigen'))) return;
    try {
      await ApiClient.del('/api/theory/rotation');
      this.showToast(t('geloescht'));
      this.showTheoryView();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  // ── Theory Detail Modal ──
  _loadingTheoryDetail: false,
  openTheoryDetail: async function(scheduleId) {
    if (this._loadingTheoryDetail) return;
    this._loadingTheoryDetail = true;
    var self = this;
    try {
      var schedule = await ApiClient.get('/api/theory/schedule');
      var item = null;
      for (var i = 0; i < schedule.length; i++) {
        if (schedule[i].id === scheduleId) { item = schedule[i]; break; }
      }
      if (!item) { this.showToast(t('fehler')); return; }

      var instructors = [];
      try {
        var instData = await ApiClient.get('/api/school/instructors');
        instructors = instData.instructors || [];
      } catch(e) {}

      var topic = item.theory_topics || {};
      var room = item.theory_rooms || {};

      var html = '<div class="theory-detail-header">' +
        '<div class="theory-detail-topic-num">' + (topic.topic_number || '?') + '</div>' +
        '<div class="theory-detail-info"><h4>' + (topic.title || '') + '</h4>' +
        '<p>' + (topic.is_basic ? t('grundstoff') : t('zusatzstoff')) + '</p></div></div>';

      html += '<div class="theory-detail-row"><span class="theory-detail-label">' + t('datum') + '</span><span class="theory-detail-value">' + item.date + '</span></div>';
      html += '<div class="theory-detail-row"><span class="theory-detail-label">' + t('start') + ' - ' + t('ende') + '</span><span class="theory-detail-value">' + item.start_time + ' - ' + item.end_time + '</span></div>';
      html += '<div class="theory-detail-row"><span class="theory-detail-label">' + t('raum') + '</span><span class="theory-detail-value">' + (room.name || '-') + ' (' + (room.seat_limit || '-') + ' ' + t('sitzplaetze') + ')</span></div>';

      // Instructor assignment — only visible for school/admin role
      if (AppState.currentUser && AppState.currentUser.role === 'school') {
        html += '<div class="theory-assign-row">';
        html += '<label class="form-label" style="margin:0;">' + t('fahrlehrerZuweisen') + ':</label>';
        html += '<select class="form-select" id="theory-assign-instructor">';
        html += '<option value="">' + t('keinFahrlehrer') + '</option>';
        instructors.forEach(function(inst) {
          html += '<option value="' + inst.id + '"' + (item.instructor_id === inst.id ? ' selected' : '') + '>' + inst.name + '</option>';
        });
        html += '</select>';
        html += '<label class="form-check" style="margin-top:var(--space-2);display:flex;align-items:center;gap:var(--space-2);cursor:pointer;">' +
          '<input type="checkbox" id="theory-recurring-assign" style="width:16px;height:16px;">' +
          '<span class="text-sm">' + t('wiederkehrendZuweisen') + '</span></label>';
        html += '</div>';
      }

      // Attendance section
      var isPast = new Date(item.date) < new Date();
      html += '<div class="theory-attendance-section">';
      html += '<div class="theory-attendance-header"><span class="section-title" style="margin:0;">' + t('anwesenheit') + '</span>';
      html += '<span class="theory-attendance-counter" id="theory-att-counter">-</span></div>';

      if (!isPast) {
        html += '<p class="text-sm text-muted">' + t('anwesenheitNachUnterricht') + '</p>';
      }

      // Load students for attendance
      html += '<div class="theory-attendance-list" id="theory-attendance-list"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div>';

      html += '</div>';

      if (isPast || AppState.currentUser.role === 'school' || AppState.currentUser.role === 'instructor') {
        html += '<button class="btn btn-primary" style="margin-top:var(--space-3);width:100%;" onclick="App.saveTheoryAll(\'' + scheduleId + '\')">' + t('speichern') + '</button>';
      }

      this.openModal(t('theorieDetail'), html);

      // Load attendance data
      this._loadTheoryAttendance(scheduleId);
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); } finally { this._loadingTheoryDetail = false; }
  },

  _loadTheoryAttendance: async function(scheduleId) {
    try {
      var students = await ApiClient.get('/api/theory/students');
      var attendance = await ApiClient.get('/api/theory/attendance/' + scheduleId);
      var attMap = {};
      (attendance || []).forEach(function(a) { attMap[a.student_id] = a.is_present; });

      var list = document.getElementById('theory-attendance-list');
      if (!list) return;
      var html = '';
      var presentCount = 0;
      (students || []).forEach(function(st) {
        var checked = attMap[st.id] === true;
        if (checked) presentCount++;
        html += '<div class="theory-attendance-item">' +
          '<label><input type="checkbox" data-student-id="' + st.id + '"' + (checked ? ' checked' : '') +
          ' onchange="App._updateTheoryAttCounter()"> ' + st.name + '</label>' +
          '<span class="text-xs text-muted">' + t('klasse') + ' ' + (st.license_class || '-') + '</span></div>';
      });
      list.innerHTML = html;
      var counter = document.getElementById('theory-att-counter');
      if (counter) counter.textContent = presentCount + '/' + students.length + ' ' + t('anwesend');
    } catch(e) {}
  },

  _updateTheoryAttCounter: function() {
    var checks = document.querySelectorAll('#theory-attendance-list input[type="checkbox"]');
    var total = checks.length;
    var present = 0;
    checks.forEach(function(cb) { if (cb.checked) present++; });
    var counter = document.getElementById('theory-att-counter');
    if (counter) counter.textContent = present + '/' + total + ' ' + t('anwesend');
  },

  saveTheoryAttendance: async function(scheduleId) {
    var checks = document.querySelectorAll('#theory-attendance-list input[type="checkbox"]');
    var attendance = [];
    checks.forEach(function(cb) {
      attendance.push({ student_id: cb.getAttribute('data-student-id'), is_present: cb.checked });
    });
    try {
      await ApiClient.post('/api/theory/attendance/' + scheduleId, { attendance: attendance });
      this.showToast(t('anwesenheitGespeichert'));
      this.closeModalForce();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  assignTheoryInstructor: async function(scheduleId) {
    var select = document.getElementById('theory-assign-instructor');
    var instructorId = select ? select.value : null;
    try {
      await ApiClient.put('/api/theory/schedule/' + scheduleId, { instructor_id: instructorId || null });
      this.showToast(t('speichern') + '!');
      this.closeModalForce();
      // Refresh current view
      if (AppState.currentUser.role === 'school') {
        var activeTab = document.querySelector('#school-nav .bottom-nav-item.active');
        var tab = activeTab ? activeTab.getAttribute('data-tab') : 'schedule';
        if (tab === 'schedule') this.renderSchoolScheduleTab();
        else if (tab === 'theory') this.showTheoryView();
      }
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  saveTheoryAll: async function(scheduleId) {
    try {
      // Save instructor assignment
      var select = document.getElementById('theory-assign-instructor');
      var instructorId = select ? select.value : null;
      var recurringCheck = document.getElementById('theory-recurring-assign');
      var recurring = recurringCheck ? recurringCheck.checked : false;
      var updateData = { instructor_id: instructorId || null };
      if (recurring && instructorId) updateData.recurring = true;
      var result = await ApiClient.put('/api/theory/schedule/' + scheduleId, updateData);
      var recurringMsg = (result && result._recurringUpdated) ? ' (+' + result._recurringUpdated + ' ' + t('weitereTermine') + ')' : '';
      // Save attendance
      var checks = document.querySelectorAll('#theory-attendance-list input[type="checkbox"]');
      if (checks.length > 0) {
        var attendance = [];
        checks.forEach(function(cb) {
          attendance.push({ student_id: cb.getAttribute('data-student-id'), is_present: cb.checked });
        });
        await ApiClient.post('/api/theory/attendance/' + scheduleId, { attendance: attendance });
      }
      this.showToast(t('gespeichert') + recurringMsg);
      this.closeModalForce();
      // Refresh current view
      if (AppState.currentUser.role === 'school') {
        var activeTab = document.querySelector('#school-nav .bottom-nav-item.active');
        var tab = activeTab ? activeTab.getAttribute('data-tab') : 'schedule';
        if (tab === 'schedule') this.renderSchoolScheduleTab();
        else if (tab === 'theory') this.showTheoryView();
      }
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  // ── Theory Progress in Student Detail ──
  renderTheoryProgress: async function(studentId) {
    var container = document.getElementById('theory-progress-container');
    if (!container) return;
    try {
      var progress = await ApiClient.get('/api/theory/progress/' + studentId);
      if (!progress || !Array.isArray(progress)) { container.innerHTML = '<p class="text-sm text-muted">' + t('keineTheorieDaten') + '</p>'; return; }
      var attendedCount = progress.filter(function(p) { return p.attended; }).length;
      var html = '<div class="theory-progress-grid">';
      progress.forEach(function(p) {
        html += '<div class="theory-progress-box' + (p.attended ? ' attended' : '') + '" title="' + (p.title || '') + '">' +
          '<span class="topic-num">' + p.topic_number + '</span>' +
          (p.attended ? '<span class="topic-check">\u2713</span>' : '') +
          '</div>';
      });
      html += '</div>';
      html += '<div class="theory-progress-summary">' + attendedCount + ' ' + t('von') + ' 14 ' + t('themenAbsolviert') + '</div>';
      container.innerHTML = html;
    } catch(e) {
      container.innerHTML = '<p class="text-sm text-muted">' + t('fehler') + '</p>';
    }
  },

  renderSchoolInstructorsTab: async function() {
    var main = document.getElementById('school-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var data = await ApiClient.get('/api/school/instructors');
      var html = '<div class="page-padding"><div class="section-header"><span class="section-title">' + t('fahrlehrer') + ' (' + data.instructors.length + ')</span></div>';
      data.instructors.forEach(function(inst) {
        html += '<div class="card card-interactive mb-3"><div style="display:flex;align-items:center;gap:var(--space-3);">' +
          App.avatarHtml(inst.name, '') +
          '<div class="flex-1"><div style="font-weight:600;font-size:var(--text-sm);">' + inst.name + '</div>' +
          '<div class="text-xs text-muted">' + inst.email + ' · ' + (inst.studentCount || 0) + ' ' + t('schueler') + '</div></div></div></div>';
      });
      html += '<div class="section-header mt-4"><span class="section-title">' + t('einladungscodes') + '</span>' +
        '<span class="section-action" onclick="App.generateNewCode(\'instructor\')">+ ' + t('neuerCode') + '</span></div>';
      data.codes.forEach(function(c) {
        html += '<div class="code-row"><div><span class="code-value">' + c.code + '</span></div>' +
          '<span class="badge ' + (c.status === 'offen' ? 'badge-success' : 'badge-neutral') + '">' + tStatus(c.status) + (c.used_by ? ' · ' + c.used_by : '') + '</span></div>';
      });
      html += '</div>'; main.innerHTML = html;
    } catch (err) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  // ──── VEHICLES TAB ────
  vehiclesSubView: 'week', // 'week', 'list', 'detail'
  vehiclesGanttDate: null,
  vehiclesTransmissionFilter: 'all',
  vehiclesWeekStart: null,
  vehiclesWeekVehicleId: null,
  vehiclesDetailId: null,

  renderSchoolVehiclesTab: async function() {
    var sub = this.vehiclesSubView || 'week';
    if (sub === 'detail' && this.vehiclesDetailId) return this.renderVehicleDetail(this.vehiclesDetailId);
    if (sub === 'list') return this.renderVehicleList();
    return this.renderVehicleWeekView();
  },

  // ──── SUB-NAV ────
  vehiclesSubNav: function(active) {
    return '<div class="veh-subnav">' +
      '<button class="veh-subnav-btn' + (active === 'week' ? ' active' : '') + '" onclick="App.vehiclesSubView=\'week\';App.renderSchoolVehiclesTab();">Wochenansicht</button>' +
      '<button class="veh-subnav-btn' + (active === 'list' ? ' active' : '') + '" onclick="App.vehiclesSubView=\'list\';App.renderSchoolVehiclesTab();">Fahrzeugliste</button>' +
    '</div>';
  },

  // ═══════════════════════════════════════
  // VEHICLE LIST (with status badges)
  // ═══════════════════════════════════════
  renderVehicleList: async function() {
    var main = document.getElementById('school-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var vData = await ApiClient.get('/api/school/vehicles');
      var vehicles = vData.vehicles || [];
      var html = '<div class="page-padding">';
      html += this.vehiclesSubNav('list');
      html += '<div class="section-header"><span class="section-title">Fahrzeuge (' + vehicles.length + ')</span>' +
        '<span class="section-action" onclick="App.openAddVehicleModal()">+ Fahrzeug</span></div>';

      vehicles.forEach(function(v) {
        var statusClass = v.status === 'Aktiv' ? 'veh-status-aktiv' : (v.status === 'Werkstatt' ? 'veh-status-werkstatt' : 'veh-status-ausser');
        var cardClass = v.status !== 'Aktiv' ? ' veh-card-inactive' : '';

        html += '<div class="card card-interactive mb-3 veh-card' + cardClass + '" onclick="App.vehiclesSubView=\'detail\';App.vehiclesDetailId=\'' + v.id + '\';App.renderSchoolVehiclesTab();">' +
          '<div style="display:flex;align-items:center;gap:var(--space-3);">' +
            '<div class="veh-icon' + (v.status !== 'Aktiv' ? ' veh-icon-inactive' : '') + '">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/></svg>' +
            '</div>' +
            '<div class="flex-1" style="min-width:0;">' +
              '<div style="font-weight:600;font-size:var(--text-sm);">' + v.brand + '</div>' +
              '<div class="text-xs text-muted">' + v.license_plate + '</div>' +
              (v.status === 'Werkstatt' && v.available_from ? '<div class="text-xs" style="color:var(--color-warning);margin-top:2px;">⚠ Bis ' + App.formatDate(v.available_from) + ' in Werkstatt</div>' : '') +
            '</div>' +
            '<span class="badge ' + (v.transmission === 'Automatik' ? 'badge-blue' : 'badge-neutral') + '">' + v.transmission + '</span>' +
            '<div class="veh-status-badge ' + statusClass + '" onclick="event.stopPropagation();App.toggleStatusDropdown(\'' + v.id + '\')">' +
              '<span class="veh-status-dot"></span> ' + v.status +
            '</div>' +
            '<div class="veh-status-dropdown" id="veh-dd-' + v.id + '">' +
              '<div class="veh-dd-option' + (v.status === 'Aktiv' ? ' active' : '') + '" onclick="event.stopPropagation();App.setVehicleStatus(\'' + v.id + '\',\'Aktiv\')"><span style="color:#22c55e;">●</span> Aktiv</div>' +
              '<div class="veh-dd-option' + (v.status === 'Werkstatt' ? ' active' : '') + '" onclick="event.stopPropagation();App.setVehicleStatus(\'' + v.id + '\',\'Werkstatt\')"><span>🔧</span> Werkstatt</div>' +
              '<div class="veh-dd-option' + (v.status === 'Außer Betrieb' ? ' active' : '') + '" onclick="event.stopPropagation();App.setVehicleStatus(\'' + v.id + '\',\'Außer Betrieb\')"><span style="color:#ef4444;">●</span> Außer Betrieb</div>' +
              (v.status === 'Werkstatt' ? '<div class="veh-dd-date"><label class="text-xs">Verfügbar ab:</label><input type="date" class="form-input" style="font-size:12px;padding:4px 8px;" value="' + (v.available_from || '') + '" onchange="App.setVehicleAvailableFrom(\'' + v.id + '\',this.value)" onclick="event.stopPropagation();"></div>' : '') +
            '</div>' +
            '<button class="icon-btn" onclick="event.stopPropagation();App.deleteVehicle(\'' + v.id + '\')" title="Löschen">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--color-error);"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>';
      });

      html += '</div>';
      main.innerHTML = html;
    } catch (err) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  toggleStatusDropdown: function(vehicleId) {
    var dd = document.getElementById('veh-dd-' + vehicleId);
    if (!dd) return;
    var isOpen = dd.classList.contains('open');
    // Close all first
    document.querySelectorAll('.veh-status-dropdown.open').forEach(function(el) { el.classList.remove('open'); });
    if (!isOpen) {
      dd.classList.add('open');
      // Close on click outside
      setTimeout(function() {
        var handler = function(e) {
          if (!dd.contains(e.target) && !e.target.closest('.veh-status-badge')) {
            dd.classList.remove('open');
            document.removeEventListener('click', handler);
          }
        };
        document.addEventListener('click', handler);
      }, 10);
    }
  },

  setVehicleStatus: async function(vehicleId, status) {
    try {
      this.showLoading(true);
      var result = await ApiClient.put('/api/school/vehicles/' + vehicleId, { status: status });
      document.querySelectorAll('.veh-status-dropdown.open').forEach(function(el) { el.classList.remove('open'); });
      if (result.warning) {
        this.showToast('Status kann erst ge\u00e4ndert werden nach SQL-Migration in Supabase');
      } else {
        this.showToast('Status ge\u00e4ndert');
      }
      this.renderVehicleList();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  setVehicleAvailableFrom: async function(vehicleId, date) {
    try {
      await ApiClient.put('/api/school/vehicles/' + vehicleId, { availableFrom: date || null });
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  // ═══════════════════════════════════════
  // VEHICLE DETAIL PAGE
  // ═══════════════════════════════════════
  renderVehicleDetail: async function(vehicleId) {
    var main = document.getElementById('school-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var data = await ApiClient.get('/api/school/vehicles/' + vehicleId + '/detail');
      var v = data.vehicle;
      var u = data.utilization;
      var hist = data.history || [];

      var html = '<div class="page-padding">';
      // Back button
      html += '<div style="margin-bottom:var(--space-4);"><a href="#" onclick="event.preventDefault();App.vehiclesSubView=\'list\';App.renderSchoolVehiclesTab();" class="text-sm" style="color:var(--color-text-muted);text-decoration:none;">← Fahrzeuge</a></div>';

      // Header
      var statusClass = v.status === 'Aktiv' ? 'veh-status-aktiv' : (v.status === 'Werkstatt' ? 'veh-status-werkstatt' : 'veh-status-ausser');
      html += '<div class="veh-detail-header">' +
        '<div><h2 style="margin:0;font-size:var(--text-xl);">' + v.brand + '</h2>' +
          '<div class="text-sm text-muted" style="margin-top:2px;">' + v.license_plate + '</div>' +
          '<div style="margin-top:var(--space-2);display:flex;gap:var(--space-2);flex-wrap:wrap;">' +
            '<span class="badge ' + (v.transmission === 'Automatik' ? 'badge-blue' : 'badge-neutral') + '">' + v.transmission + '</span>' +
            '<span class="veh-status-badge ' + statusClass + '">' + v.status + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:var(--space-2);">' +
          '<button class="btn btn-ghost btn-sm" onclick="App.openEditVehicleModal(\'' + v.id + '\')">✎ Bearbeiten</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="App.deleteVehicle(\'' + v.id + '\')" style="color:var(--color-error);">✕ Löschen</button>' +
        '</div>' +
      '</div>';

      // ──── Auslastung ────
      html += '<div class="section-header"><span class="section-title">Auslastung</span></div>';
      html += '<div class="veh-util-grid">';
      // Big pct card
      html += '<div class="veh-util-big">' +
        '<div class="veh-util-pct">' + u.currentWeekPct + '%</div>' +
        '<div class="veh-util-label">Diese Woche</div>' +
        '<div class="veh-util-sub">' +
          '<div class="veh-util-sub-item"><span class="veh-util-sub-val">' + u.monthHours + 'h</span><span class="veh-util-sub-lbl">Diesen Monat</span></div>' +
          '<div class="veh-util-sub-item"><span class="veh-util-sub-val">' + u.totalHours + 'h</span><span class="veh-util-sub-lbl">Gesamt</span></div>' +
        '</div>' +
      '</div>';
      // Weekly bar chart
      html += '<div class="veh-util-chart"><div class="veh-util-chart-title">Auslastung nach Kalenderwoche</div><div class="veh-util-bars">';
      var maxPct = Math.max.apply(null, u.weeks.map(function(w) { return w.pct; }).concat([10]));
      u.weeks.forEach(function(w, i) {
        var isLast = i === u.weeks.length - 1;
        var barH = Math.max(4, (w.pct / Math.max(maxPct, 1)) * 120);
        html += '<div class="veh-bar-col">' +
          '<div class="veh-bar-val">' + w.pct + '%</div>' +
          '<div class="veh-bar" style="height:' + barH + 'px;' + (isLast ? 'background:var(--color-primary);' : '') + '"></div>' +
          '<div class="veh-bar-label' + (isLast ? ' active' : '') + '">KW ' + w.kw + '</div>' +
        '</div>';
      });
      html += '</div></div></div>';

      // ──── Termine & Wartung ────
      html += '<div class="section-header mt-4"><span class="section-title">Termine & Wartung</span></div>';
      html += '<div class="veh-maint-grid">';
      // HU/AU
      var huDate = v.hu_au_date;
      var huBadge = '';
      if (huDate) {
        var daysLeft = Math.round((new Date(huDate) - new Date()) / 86400000);
        if (daysLeft < 0) huBadge = '<span class="badge badge-error">überfällig</span>';
        else if (daysLeft < 30) huBadge = '<span class="badge badge-warning">bald fällig</span>';
        else huBadge = '<span class="badge badge-success">noch ' + daysLeft + ' Tage</span>';
      }
      html += '<div class="card"><div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:0.5px;">HU / AU</div>' +
        '<div style="font-weight:600;font-size:var(--text-base);margin-top:4px;">' + (huDate ? App.formatDate(huDate) : '—') + '</div>' +
        (huBadge ? '<div style="margin-top:6px;">' + huBadge + '</div>' : '') +
        (!huDate ? '<div style="margin-top:6px;"><a href="#" class="text-xs" style="color:var(--color-primary);" onclick="event.preventDefault();App.openEditVehicleModal(\'' + v.id + '\')">Datum setzen</a></div>' : '') +
      '</div>';
      // Service
      var svcBadge = '';
      if (v.next_service_km && v.current_km) {
        var kmLeft = v.next_service_km - v.current_km;
        if (kmLeft < 0) svcBadge = '<span class="badge badge-error">überfällig</span>';
        else if (kmLeft < 1000) svcBadge = '<span class="badge badge-warning">bald fällig</span>';
        else svcBadge = '<span class="badge badge-success">noch ' + kmLeft + ' km</span>';
      }
      html += '<div class="card"><div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:0.5px;">Nächster Service</div>' +
        '<div style="font-weight:600;font-size:var(--text-base);margin-top:4px;">' + (v.next_service_km ? v.next_service_km.toLocaleString('de-DE') + ' km' : '—') + '</div>' +
        (v.current_km ? '<div class="text-xs text-muted" style="margin-top:2px;">Aktuell: ' + v.current_km.toLocaleString('de-DE') + ' km</div>' : '') +
        (svcBadge ? '<div style="margin-top:6px;">' + svcBadge + '</div>' : '') +
      '</div>';
      // Werkstatt
      html += '<div class="card"><div class="text-xs text-muted" style="text-transform:uppercase;letter-spacing:0.5px;">Werkstatt-Blockierung</div>' +
        '<div style="font-weight:600;font-size:var(--text-base);margin-top:4px;">' + (v.status === 'Werkstatt' ? 'Bis ' + (v.available_from ? App.formatDate(v.available_from) : 'auf Weiteres') : 'Keine geplant') + '</div>' +
        '<div style="margin-top:6px;"><a href="#" class="text-xs" style="color:var(--color-primary);" onclick="event.preventDefault();App.openEditVehicleModal(\'' + v.id + '\')">Bearbeiten</a></div>' +
      '</div>';
      html += '</div>';

      // ──── Belegungshistorie ────
      html += '<div class="section-header mt-4"><span class="section-title">Belegungshistorie</span></div>';
      if (hist.length === 0) {
        html += '<div class="card"><p class="text-sm text-muted">Noch keine Fahrstunden mit diesem Fahrzeug</p></div>';
      } else {
        html += '<div class="card" style="padding:0;overflow:hidden;"><table class="veh-hist-table"><thead><tr>' +
          '<th>Datum</th><th>Zeit</th><th>Fahrlehrer</th><th>Fahrschüler</th><th>Typ</th></tr></thead><tbody>';
        hist.forEach(function(l) {
          html += '<tr>' +
            '<td>' + App.formatDate(l.date) + '</td>' +
            '<td>' + l.start_time.substring(0,5) + '–' + l.end_time.substring(0,5) + '</td>' +
            '<td><span class="veh-inst-dot" style="background:' + App.instructorColor(l.instructor_id) + ';"></span>' + l.instructor_name + '</td>' +
            '<td>' + l.student_name + '</td>' +
            '<td>' + l.type + '</td>' +
          '</tr>';
        });
        html += '</tbody></table></div>';
      }

      html += '</div>';
      main.innerHTML = html;
    } catch (err) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  openEditVehicleModal: function(vehicleId) {
    // Fetch current data and show edit modal
    ApiClient.get('/api/school/vehicles/' + vehicleId + '/detail').then(function(data) {
      var v = data.vehicle;
      var html = '<form id="vehicle-edit-form" onsubmit="event.preventDefault();">' +
        '<div class="form-group mb-3"><label class="form-label">Marke</label>' +
          '<input class="form-input" type="text" id="vedit-brand" value="' + v.brand + '"></div>' +
        '<div class="form-group mb-3"><label class="form-label">Kennzeichen</label>' +
          '<input class="form-input" type="text" id="vedit-plate" value="' + v.license_plate + '"></div>' +
        '<div class="form-group mb-3"><label class="form-label">Getriebeart</label>' +
          '<select class="form-select" id="vedit-transmission">' +
            '<option value="Schaltung"' + (v.transmission === 'Schaltung' ? ' selected' : '') + '>Schaltung</option>' +
            '<option value="Automatik"' + (v.transmission === 'Automatik' ? ' selected' : '') + '>Automatik</option>' +
          '</select></div>' +
        '<div class="form-group mb-3"><label class="form-label">HU/AU Datum</label>' +
          '<input class="form-input" type="date" id="vedit-huau" value="' + (v.hu_au_date || '') + '"></div>' +
        '<div class="form-group mb-3"><label class="form-label">Nächster Service (km)</label>' +
          '<input class="form-input" type="number" id="vedit-svc-km" value="' + (v.next_service_km || '') + '" placeholder="z.B. 15000"></div>' +
        '<div class="form-group mb-3"><label class="form-label">Aktueller KM-Stand</label>' +
          '<input class="form-input" type="number" id="vedit-cur-km" value="' + (v.current_km || '') + '" placeholder="z.B. 12500"></div>' +
        '<button type="button" class="btn btn-primary btn-full btn-lg" onclick="App.saveVehicleEdit(\'' + v.id + '\')">Speichern</button>' +
      '</form>';
      App.openModal('Fahrzeug bearbeiten', html);
    });
  },

  saveVehicleEdit: async function(vehicleId) {
    var brand = document.getElementById('vedit-brand').value.trim();
    var plate = document.getElementById('vedit-plate').value.trim();
    var trans = document.getElementById('vedit-transmission').value;
    var huau = document.getElementById('vedit-huau').value;
    var svcKm = document.getElementById('vedit-svc-km').value;
    var curKm = document.getElementById('vedit-cur-km').value;
    if (!brand || !plate) return this.showToast('Marke und Kennzeichen sind Pflichtfelder');
    try {
      this.showLoading(true);
      await ApiClient.put('/api/school/vehicles/' + vehicleId, {
        brand: brand, licensePlate: plate, transmission: trans,
        huAuDate: huau || null,
        nextServiceKm: svcKm ? parseInt(svcKm) : null,
        currentKm: curKm ? parseInt(curKm) : null
      });
      this.closeModalForce();
      this.showToast('Fahrzeug aktualisiert');
      this.renderVehicleDetail(vehicleId);
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  instructorColor: function(instructorId) {
    // Simple hash to pick a color
    if (!instructorId) return '#888';
    var hash = 0;
    for (var i = 0; i < instructorId.length; i++) hash = instructorId.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  },

  // ═══════════════════════════════════════
  // WEEK VIEW (same grid as Fahrstundenplanung, Mo-Sa, tabs per vehicle)
  // ═══════════════════════════════════════
  renderVehicleWeekView: async function() {
    var main = document.getElementById('school-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var vData = await ApiClient.get('/api/school/vehicles');
      var vehicles = (vData.vehicles || []).filter(function(v) { return v.status === 'Aktiv'; });

      // Init week (reuse existing getWeekDates for Mo-Sa)
      if (!this.vehiclesWeekStart) {
        var w = this.getWeekDates(new Date());
        this.vehiclesWeekStart = w.monday;
      } else if (typeof this.vehiclesWeekStart === 'string') {
        this.vehiclesWeekStart = new Date(this.vehiclesWeekStart + 'T00:00:00');
      }
      var w = this.getWeekDates(this.vehiclesWeekStart);

      if (!this.vehiclesWeekVehicleId && vehicles.length > 0) {
        this.vehiclesWeekVehicleId = vehicles[0].id;
      }

      // Fetch bookings for selected vehicle
      var bookings = [];
      var wsStr = formatDateLocal(w.monday);
      if (this.vehiclesWeekVehicleId) {
        var bData = await ApiClient.get('/api/school/vehicles/' + this.vehiclesWeekVehicleId + '/week?weekStart=' + wsStr);
        bookings = bData.bookings || [];
      }

      // Map bookings to slot format used by renderWeekGridHtml
      var slots = bookings.map(function(b) {
        return {
          date: b.date,
          start_time: b.start_time,
          end_time: b.end_time,
          type: b.type || 'Fahrstunde',
          student_name: b.student_name !== '\u2014' ? b.student_name : null,
          student_id: b.student_name !== '\u2014' ? 'x' : null,
          instructor_name: b.instructor_name,
          instructor_id: b.instructor_id
        };
      });

      var html = '<div class="page-padding">';
      html += this.vehiclesSubNav('week');

      // Vehicle tabs
      if (vehicles.length === 0) {
        html += '<div class="card"><p class="text-sm text-muted">Keine aktiven Fahrzeuge vorhanden</p></div></div>';
        main.innerHTML = html;
        return;
      }

      html += '<div class="veh-tabs-row">';
      var self = this;
      vehicles.forEach(function(v) {
        var isActive = v.id === self.vehiclesWeekVehicleId;
        html += '<button class="veh-tab' + (isActive ? ' active' : '') + '" onclick="App.vehiclesWeekVehicleId=\'' + v.id + '\';App.renderVehicleWeekView();">' +
          '<div class="veh-tab-brand">' + v.brand + '</div>' +
          '<div class="veh-tab-plate">' + v.license_plate + '</div>' +
          '<span class="badge ' + (v.transmission === 'Automatik' ? 'badge-blue' : 'badge-neutral') + '" style="font-size:9px;padding:1px 6px;">' + v.transmission + '</span>' +
        '</button>';
      });
      html += '</div>';

      // Week navigation (same style as schedule)
      var oneJan = new Date(w.monday.getFullYear(), 0, 1);
      var kwNum = Math.ceil(((w.monday - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
      var months = getMonthNames();
      var weekLbl = 'KW ' + kwNum + ' \u00b7 ' + w.monday.getDate() + '.\u2013' + w.saturday.getDate() + '. ' + months[w.monday.getMonth()] + ' ' + w.monday.getFullYear();

      html += '<div class="schedule-week-nav">' +
        '<button class="btn btn-ghost btn-sm" onclick="App.shiftVehicleWeek(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><polyline points="15,18 9,12 15,6"/></svg></button>' +
        '<span class="schedule-week-label">' + weekLbl + '</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="App.shiftVehicleWeek(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><polyline points="9,18 15,12 9,6"/></svg></button></div>';

      // Reuse the same week grid as Fahrstundenplanung (Mo-Sa, absolute positioned slots)
      html += this.renderWeekGridHtml(
        w.days, slots,
        "void(0)",
        "void(0)"
      );

      // Legend
      html += '<div class="gantt-legend" style="margin-top:var(--space-3);">';
      var seenInstructors = {};
      bookings.forEach(function(b) {
        if (!seenInstructors[b.instructor_id]) {
          seenInstructors[b.instructor_id] = true;
          html += '<div class="gantt-legend-item"><span class="gantt-legend-dot" style="background:' + App.instructorColor(b.instructor_id) + ';"></span>' + b.instructor_name + '</div>';
        }
      });
      html += '</div>';

      html += '</div>';
      main.innerHTML = html;
    } catch (err) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  shiftVehicleWeek: function(dir) {
    var d = new Date(this.vehiclesWeekStart);
    d.setDate(d.getDate() + dir * 7);
    this.vehiclesWeekStart = d;
    this.renderVehicleWeekView();
  },

  getISOWeek: function(d) {
    var date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    var week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  },

  shiftGanttDate: function(offset) {
    var d = new Date(this.vehiclesGanttDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    this.vehiclesGanttDate = formatDateLocal(d);
    this.renderSchoolVehiclesTab();
  },

  setVehicleFilter: function(filter) {
    this.vehiclesTransmissionFilter = filter;
    this.renderSchoolVehiclesTab();
  },

  openAddVehicleModal: function() {
    var html = '<form id="vehicle-form" onsubmit="event.preventDefault();">' +
      '<div class="form-group mb-3"><label class="form-label">Marke</label>' +
        '<input class="form-input" type="text" id="vehicle-brand" placeholder="z.B. VW Golf" required></div>' +
      '<div class="form-group mb-3"><label class="form-label">Kennzeichen</label>' +
        '<input class="form-input" type="text" id="vehicle-plate" placeholder="z.B. B-AB 1234" required></div>' +
      '<div class="form-group mb-3"><label class="form-label">Getriebeart</label>' +
        '<select class="form-select" id="vehicle-transmission">' +
          '<option value="Schaltung">Schaltung</option>' +
          '<option value="Automatik">Automatik</option>' +
        '</select></div>' +
      '<button type="button" class="btn btn-primary btn-full btn-lg" onclick="App.createVehicle()">Fahrzeug hinzufügen</button>' +
    '</form>';
    this.openModal('Neues Fahrzeug', html);
  },

  createVehicle: async function() {
    var brand = document.getElementById('vehicle-brand').value.trim();
    var plate = document.getElementById('vehicle-plate').value.trim();
    var trans = document.getElementById('vehicle-transmission').value;
    if (!brand || !plate) return this.showToast('Bitte alle Felder ausfüllen');
    try {
      this.showLoading(true);
      await ApiClient.post('/api/school/vehicles', { brand: brand, licensePlate: plate, transmission: trans });
      this.closeModalForce();
      this.showToast('Fahrzeug hinzugefügt');
      this.renderSchoolVehiclesTab();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  deleteVehicle: async function(id) {
    if (!confirm('Fahrzeug wirklich löschen?')) return;
    try {
      this.showLoading(true);
      await ApiClient.del('/api/school/vehicles/' + id);
      this.showToast('Fahrzeug gelöscht');
      this.vehiclesSubView = 'week';
      this.renderSchoolVehiclesTab();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  renderSchoolAboTab: async function() {
    var main = document.getElementById('school-main');
    try {
      var sub = await ApiClient.get('/api/stripe/subscription');
      var statusLabels = { trial: 'Testphase', trialing: 'Testphase', active: 'Aktiv', past_due: 'Zahlung ausstehend', canceled: 'Gekündigt', expired: 'Abgelaufen', incomplete: 'Unvollständig' };
      var statusColors = { trial: 'warning', trialing: 'warning', active: 'success', past_due: 'error', canceled: 'error', expired: 'error', incomplete: 'warning' };
      var statusLabel = statusLabels[sub.status] || sub.status;
      var statusColor = statusColors[sub.status] || 'muted';
      var hasActiveSub = sub.status === 'active' || sub.status === 'trialing';
      var isExpired = sub.status === 'expired' || sub.status === 'canceled';

      // Count current instructors
      var instructors = [];
      try { instructors = await ApiClient.get('/api/school/instructors'); } catch(e) {}
      var instructorCount = Array.isArray(instructors) ? instructors.length : 0;

      var html = '<div class="page-padding">';

      // Status Card
      html += '<div class="card mb-4">' +
        '<div class="abo-plan-header"><span class="abo-plan-name">FahrDoc Pro</span>' +
        '<span class="badge badge-' + statusColor + '">' + statusLabel + '</span></div>';

      // Trial info
      if ((sub.status === 'trial' || sub.status === 'trialing') && sub.days_remaining !== null) {
        html += '<div class="abo-trial-info" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3);background:var(--warning-bg,#fff8e1);border-radius:var(--radius-md);margin:var(--space-3) 0;font-size:var(--text-sm);">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' +
          'Testphase: noch <strong style="margin:0 4px;">' + sub.days_remaining + '</strong> Tage</div>';
      }

      // Pricing
      html += '<div class="abo-price" style="text-align:center;padding:var(--space-4) 0;">' +
        '<span class="abo-price-value" style="font-size:var(--text-2xl);font-weight:700;">29,90 \u20ac</span>' +
        '<span class="abo-price-label" style="font-size:var(--text-sm);color:var(--text-muted);display:block;">pro Fahrlehrer / Monat</span></div>';

      // Instructor seats
      if (hasActiveSub && sub.instructor_quantity) {
        html += '<div style="display:flex;justify-content:space-between;font-size:var(--text-sm);padding:var(--space-2) 0;border-top:1px solid var(--border-color);margin-top:var(--space-3);">' +
          '<span>Gebuchte Fahrlehrer-Lizenzen</span><span class="font-semibold">' + sub.instructor_quantity + '</span></div>';
        html += '<div style="display:flex;justify-content:space-between;font-size:var(--text-sm);padding:var(--space-2) 0;">' +
          '<span>Aktive Fahrlehrer</span><span class="font-semibold">' + instructorCount + '</span></div>';
      }

      // Cancel notice
      if (sub.cancel_at_period_end) {
        var endDate = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('de-DE') : '';
        html += '<div style="padding:var(--space-3);background:var(--error-bg,#ffeaea);border-radius:var(--radius-md);margin-top:var(--space-3);font-size:var(--text-sm);color:var(--error-color,#c62828);">' +
          'Abo wird zum ' + endDate + ' beendet.</div>';
      }

      html += '</div>';

      // Actions
      if (!hasActiveSub || isExpired || sub.status === 'trial') {
        // No Stripe sub yet — show checkout button
        var defaultQty = Math.max(1, instructorCount);
        html += '<div class="card mb-4">' +
          '<div class="section-title mb-3">Abo starten</div>' +
          '<p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">W\u00e4hle die Anzahl der Fahrlehrer-Lizenzen. Du kannst jederzeit \u00e4ndern.</p>' +
          '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">' +
            '<label style="font-size:var(--text-sm);font-weight:600;">Fahrlehrer:</label>' +
            '<div style="display:flex;align-items:center;gap:var(--space-2);">' +
              '<button class="btn btn-sm" onclick="var i=document.getElementById(\'abo-qty\');i.value=Math.max(1,parseInt(i.value)-1);document.getElementById(\'abo-total\').textContent=((parseInt(i.value)*29.90).toFixed(2).replace(\'.\',\',\'))+\' \u20ac/Monat\'">−</button>' +
              '<input type="number" id="abo-qty" value="' + defaultQty + '" min="1" max="99" style="width:60px;text-align:center;" class="form-input" onchange="document.getElementById(\'abo-total\').textContent=((parseInt(this.value)*29.90).toFixed(2).replace(\'.\',\',\'))+\' \u20ac/Monat\'">' +
              '<button class="btn btn-sm" onclick="var i=document.getElementById(\'abo-qty\');i.value=Math.min(99,parseInt(i.value)+1);document.getElementById(\'abo-total\').textContent=((parseInt(i.value)*29.90).toFixed(2).replace(\'.\',\',\'))+\' \u20ac/Monat\'">+</button>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:center;font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-4);" id="abo-total">' + (defaultQty * 29.90).toFixed(2).replace('.', ',') + ' \u20ac/Monat</div>' +
          '<button class="btn btn-primary btn-full btn-lg" onclick="App.stripeCheckout()">Jetzt starten — 14 Tage kostenlos</button>' +
          '<p style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;margin-top:var(--space-2);">Erste Zahlung erst nach der Testphase. Jederzeit k\u00fcndbar.</p>' +
        '</div>';
      } else {
        // Has active sub — show manage buttons
        html += '<button class="btn btn-primary btn-full btn-lg mb-3" onclick="App.stripePortal()">Abo verwalten</button>';
        html += '<p style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;">Rechnung, Zahlungsmethode \u00e4ndern oder k\u00fcndigen</p>';
      }

      html += '</div>';
      main.innerHTML = html;
    } catch (err) {
      main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + (err.message || err) + '</p></div>';
    }
  },

  stripeCheckout: async function() {
    try {
      var qty = parseInt(document.getElementById('abo-qty').value) || 1;
      App.showToast('Weiterleitung zu Stripe...');
      var result = await ApiClient.post('/api/stripe/create-checkout', { quantity: qty });
      if (result.url) window.location.href = result.url;
      else App.showToast('Fehler: Keine Checkout-URL erhalten');
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  stripePortal: async function() {
    try {
      App.showToast('Weiterleitung zu Stripe...');
      var result = await ApiClient.post('/api/stripe/portal', {});
      if (result.url) window.location.href = result.url;
      else App.showToast('Fehler: Keine Portal-URL erhalten');
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  changePasswordHtml: function() {
    return '<div class="change-password-card">' +
      '<h4>' + t('passwortAendern') + '</h4>' +
      '<div class="form-group mb-3"><label class="form-label">' + t('aktuellesPasswort') + '</label>' +
        '<div class="password-input-wrapper"><input class="form-input" type="password" id="cp-current"><button type="button" class="password-toggle-btn" onclick="App.togglePw(\'cp-current\',this)" aria-label="Anzeigen"><svg class="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div></div>' +
      '<div class="form-group mb-3"><label class="form-label">' + t('neuesPasswort') + '</label>' +
        '<div class="password-input-wrapper"><input class="form-input" type="password" id="cp-new" placeholder="Min. 6 Zeichen"><button type="button" class="password-toggle-btn" onclick="App.togglePw(\'cp-new\',this)" aria-label="Anzeigen"><svg class="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div></div>' +
      '<div class="form-group mb-3"><label class="form-label">' + t('neuesPasswortBestaetigen') + '</label>' +
        '<div class="password-input-wrapper"><input class="form-input" type="password" id="cp-confirm"><button type="button" class="password-toggle-btn" onclick="App.togglePw(\'cp-confirm\',this)" aria-label="Anzeigen"><svg class="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button></div></div>' +
      '<div id="cp-error" class="form-error hidden" style="margin-bottom:12px"></div>' +
      '<button class="btn btn-primary btn-full" onclick="App.changePassword()">' + t('passwortAendern') + '</button></div>';
  },

  changePassword: async function() {
    var cur = document.getElementById('cp-current').value;
    var newPw = document.getElementById('cp-new').value;
    var confirm = document.getElementById('cp-confirm').value;
    var errEl = document.getElementById('cp-error');
    errEl.classList.add('hidden');
    if (!cur || !newPw || !confirm) { errEl.textContent = 'Alle Felder ausf\u00fcllen'; errEl.classList.remove('hidden'); return; }
    if (newPw.length < 6) { errEl.textContent = t('passwortZuKurz'); errEl.classList.remove('hidden'); return; }
    if (newPw !== confirm) { errEl.textContent = t('passwortNichtGleich'); errEl.classList.remove('hidden'); return; }
    try {
      await ApiClient.post('/api/auth/change-password', { currentPassword: cur, newPassword: newPw });
      this.showToast(t('passwortGeaendert'));
      document.getElementById('cp-current').value = '';
      document.getElementById('cp-new').value = '';
      document.getElementById('cp-confirm').value = '';
    } catch(e) {
      errEl.textContent = e.message || t('passwortFalsch');
      errEl.classList.remove('hidden');
    }
  },

  renderSchoolProfileTab: async function() {
    var u = AppState.currentUser;
    var main = document.getElementById('school-main');
    var html = '<div class="page-padding"><div class="profile-header">' + this.avatarHtml(u.admin_name || u.name, 'lg') +
      '<h3>' + (u.admin_name || u.name) + '</h3><p class="text-xs text-muted">' + u.name + '</p></div>' +
      '<div class="profile-section">' +
        '<div class="profile-row"><span class="profile-row-label">' + t('email') + '</span><span class="profile-row-value">' + u.email + '</span></div>' +
        '<div class="profile-row"><span class="profile-row-label">' + t('telefon') + '</span><span class="profile-row-value">' + (u.phone || '—') + '</span></div>' +
        '<div class="profile-row"><span class="profile-row-label">' + t('adresse') + '</span><span class="profile-row-value">' + (u.address || '—') + '</span></div>' +
      '</div>' +
      '<div id="profile-abo-section"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div>' +
      '<div class="card mb-4"><div class="section-title mb-3">' + t('supportFeedback') + '</div>' +
        '<div class="form-group mb-3"><label class="form-label">' + t('feedbackKategorie') + '</label>' +
          '<select class="form-select" id="feedback-category">' +
            '<option value="bug">' + t('katBug') + '</option>' +
            '<option value="verbesserung">' + t('katVerbesserung') + '</option>' +
            '<option value="frage">' + t('katFrage') + '</option>' +
            '<option value="sonstiges">' + t('katSonstiges') + '</option>' +
          '</select></div>' +
        '<div class="form-group mb-3"><label class="form-label">' + t('feedbackNachricht') + '</label>' +
          '<textarea class="form-textarea" id="feedback-message" rows="4" placeholder="' + t('feedbackPlaceholder') + '"></textarea></div>' +
        '<button class="btn btn-primary btn-full" onclick="App.sendFeedback()">' + t('feedbackSenden') + '</button></div>' +
      this.changePasswordHtml() +
      '<button class="btn btn-secondary btn-full" style="margin-top:20px" onclick="App.logout()">' + t('abmelden') + '</button></div>';
    main.innerHTML = html;
    // Load abo data async
    this._loadProfileAbo();
  },

  _loadProfileAbo: async function() {
    var container = document.getElementById('profile-abo-section');
    if (!container) return;
    try {
      var sub = await ApiClient.get('/api/stripe/subscription');
      var statusLabels = { trial: 'Testphase', trialing: 'Testphase', active: 'Aktiv', past_due: 'Zahlung ausstehend', canceled: 'Gek\u00fcndigt', expired: 'Abgelaufen', incomplete: 'Unvollst\u00e4ndig' };
      var statusColors = { trial: 'warning', trialing: 'warning', active: 'success', past_due: 'error', canceled: 'error', expired: 'error', incomplete: 'warning' };
      var statusLabel = statusLabels[sub.status] || sub.status;
      var statusColor = statusColors[sub.status] || 'muted';
      var hasActiveSub = sub.status === 'active' || sub.status === 'trialing';
      var isExpired = sub.status === 'expired' || sub.status === 'canceled';
      var instructors = [];
      try { instructors = await ApiClient.get('/api/school/instructors'); } catch(e) {}
      var instructorCount = Array.isArray(instructors) ? instructors.length : 0;
      var h = '<div class="card mb-4"><div class="abo-plan-header"><span class="abo-plan-name">FahrDoc Pro</span><span class="badge badge-' + statusColor + '">' + statusLabel + '</span></div>';
      if ((sub.status === 'trial' || sub.status === 'trialing') && sub.days_remaining !== null) {
        h += '<div class="abo-trial-info" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3);background:var(--warning-bg,#fff8e1);border-radius:var(--radius-md);margin:var(--space-3) 0;font-size:var(--text-sm);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>Testphase: noch <strong style="margin:0 4px;">' + sub.days_remaining + '</strong> Tage</div>';
      }
      h += '<div style="text-align:center;padding:var(--space-4) 0;"><span style="font-size:var(--text-2xl);font-weight:700;">29,90 \u20ac</span><span style="font-size:var(--text-sm);color:var(--text-muted);display:block;">pro Fahrlehrer / Monat</span></div>';
      if (hasActiveSub && sub.instructor_quantity) {
        h += '<div style="display:flex;justify-content:space-between;font-size:var(--text-sm);padding:var(--space-2) 0;border-top:1px solid var(--border-color);margin-top:var(--space-3);"><span>Gebuchte Lizenzen</span><span class="font-semibold">' + sub.instructor_quantity + '</span></div>';
        h += '<div style="display:flex;justify-content:space-between;font-size:var(--text-sm);padding:var(--space-2) 0;"><span>Aktive Fahrlehrer</span><span class="font-semibold">' + instructorCount + '</span></div>';
      }
      if (sub.cancel_at_period_end) {
        var endDate = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('de-DE') : '';
        h += '<div style="padding:var(--space-3);background:var(--error-bg,#ffeaea);border-radius:var(--radius-md);margin-top:var(--space-3);font-size:var(--text-sm);color:var(--error-color,#c62828);">Abo wird zum ' + endDate + ' beendet.</div>';
      }
      h += '</div>';
      if (!hasActiveSub || isExpired || sub.status === 'trial') {
        var dq = Math.max(1, instructorCount);
        h += '<div class="card mb-4"><div class="section-title mb-3">Abo starten</div>' +
          '<p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">W\u00e4hle die Anzahl der Fahrlehrer-Lizenzen.</p>' +
          '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);"><label style="font-size:var(--text-sm);font-weight:600;">Fahrlehrer:</label><div style="display:flex;align-items:center;gap:var(--space-2);">' +
            '<button class="btn btn-sm" onclick="var i=document.getElementById(\x27abo-qty\x27);i.value=Math.max(1,parseInt(i.value)-1);document.getElementById(\x27abo-total\x27).textContent=((parseInt(i.value)*29.90).toFixed(2).replace(\x27.\x27,\x27,\x27))+\x27 \u20ac/Monat\x27">\u2212</button>' +
            '<input type="number" id="abo-qty" value="' + dq + '" min="1" max="99" style="width:60px;text-align:center;" class="form-input" onchange="document.getElementById(\x27abo-total\x27).textContent=((parseInt(this.value)*29.90).toFixed(2).replace(\x27.\x27,\x27,\x27))+\x27 \u20ac/Monat\x27">' +
            '<button class="btn btn-sm" onclick="var i=document.getElementById(\x27abo-qty\x27);i.value=Math.min(99,parseInt(i.value)+1);document.getElementById(\x27abo-total\x27).textContent=((parseInt(i.value)*29.90).toFixed(2).replace(\x27.\x27,\x27,\x27))+\x27 \u20ac/Monat\x27">+</button></div></div>' +
          '<div style="text-align:center;font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-4);" id="abo-total">' + (dq * 29.90).toFixed(2).replace('.', ',') + ' \u20ac/Monat</div>' +
          '<button class="btn btn-primary btn-full btn-lg" onclick="App.stripeCheckout()">Jetzt starten \u2014 14 Tage kostenlos</button>' +
          '<p style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;margin-top:var(--space-2);">Erste Zahlung erst nach der Testphase.</p></div>';
      } else {
        h += '<button class="btn btn-primary btn-full btn-lg mb-3" onclick="App.stripePortal()">Abo verwalten</button>';
        h += '<p style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;">Rechnung, Zahlungsmethode \u00e4ndern oder k\u00fcndigen</p>';
      }
      container.innerHTML = h;
    } catch (err) {
      container.innerHTML = '<div class="card mb-4"><p class="text-sm text-muted">' + t('fehler') + ': ' + (err.message || err) + '</p></div>';
    }
  },

  generateNewCode: async function(type) {
    try {
      var result = await ApiClient.post('/api/school/codes', { type: type });
      // Keep the current view mode matching the code type
      this.dashboardViewMode = (type === 'instructor') ? 'instructors' : 'students';
      this.renderSchoolDashboardTab();
      // Show modal with code + optional email send
      this.showInviteCodeModal(result.code, type);
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  showInviteCodeModal: function(code, type) {
    var roleLabel = type === 'instructor' ? t('fahrlehrer') : t('fahrschueler');
    var html = '<div class="invite-modal-content">' +
      '<div class="invite-code-display">' +
        '<div class="invite-code-label">' + t('neuerCode') + ' (' + roleLabel + ')</div>' +
        '<div class="invite-code-value">' + code + '</div>' +
        '<button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText(\'' + code + '\');App.showToast(\'' + t('codeCopied') + '\')" style="margin-top:8px;font-size:12px;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          t('codeCopyBtn') +
        '</button>' +
      '</div>' +
      '<div class="invite-email-section">' +
        '<p class="text-sm text-muted" style="margin-bottom:10px;">' + t('inviteEmailDesc') + '</p>' +
        '<div style="display:flex;gap:8px;align-items:stretch;">' +
          '<input type="email" id="invite-email-input" class="form-input" placeholder="' + t('emailPlaceholder') + '" style="flex:1;min-width:0;" onkeydown="if(event.key===\'Enter\')App.sendInviteEmail(\'' + code + '\',\'' + type + '\')">' +
          '<button class="btn btn-primary" id="invite-send-btn" onclick="App.sendInviteEmail(\'' + code + '\', \'' + type + '\')" style="white-space:nowrap;">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
            t('sendInvite') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    this.openModal(t('einladungscode'), html);
    // Focus email input
    setTimeout(function() { var el = document.getElementById('invite-email-input'); if (el) el.focus(); }, 200);
  },

  sendInviteEmail: async function(code, type) {
    var emailInput = document.getElementById('invite-email-input');
    var sendBtn = document.getElementById('invite-send-btn');
    if (!emailInput || !emailInput.value.trim()) { this.showToast(t('emailRequired')); return; }
    var email = emailInput.value.trim();
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.showToast(t('emailInvalid')); return; }
    // Disable button during send
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = t('sending') + '...'; }
    try {
      await ApiClient.post('/api/invite-email', { email: email, code: code, type: type });
      this.showToast(t('inviteSent') + ' ' + email);
      this.closeModalForce();
    } catch (err) {
      this.showToast(t('fehler') + ': ' + err.message);
      if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' + t('sendInvite'); }
    }
  },

  // ══════════════════════════════════════════
  //  INSTRUCTOR DASHBOARD (Fix 2: Week grid toggle)
  // ══════════════════════════════════════════
  initInstructorDashboard: async function() {
    var inst = AppState.currentUser;
    document.getElementById('instructor-name-display').textContent = inst.name;
    try {
      var data = await ApiClient.get('/api/instructor/dashboard');
      AppState._cachedData.instructorDash = data;
      var banner = document.getElementById('instructor-expired-banner');
      if (data.isExpired) banner.classList.remove('hidden');
      else banner.classList.add('hidden');
    } catch (e) {}
    this.loadNotifications();
    this.switchInstructorTab('dashboard');
  },

  switchInstructorTab: function(tab, btn) {
    if (btn) {
      document.querySelectorAll('#instructor-nav .bottom-nav-item').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    } else {
      document.querySelectorAll('#instructor-nav .bottom-nav-item').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
      });
    }
    if (tab === 'dashboard') this.renderInstructorDashboardTab();
    else if (tab === 'students') this.renderInstructorStudentsTab();
    else if (tab === 'lessons') this.renderInstructorLessonsTab();
    else if (tab === 'profile') this.renderInstructorProfileTab();
  },

  renderInstructorDashboardTab: async function() {
    var inst = AppState.currentUser;
    var main = document.getElementById('instructor-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';

    this.initWeek();
    var w = this.getWeekDates(AppState.scheduleWeekStart);
    var wsStr = formatDateLocal(w.monday);
    var weStr = formatDateLocal(w.saturday);

    try {
      var data = await ApiClient.get('/api/schedule?weekStart=' + wsStr + '&weekEnd=' + weStr);
      AppState.scheduleData = data;
    } catch(e) {
      main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + e.message + '</p></div>';
      return;
    }

    var slots = AppState.scheduleData.slots || [];

    // Fetch theory schedule for this week (instructor sees assigned blocks)
    try {
      var theoryScheduleInst = await ApiClient.get('/api/theory/schedule?week_start=' + wsStr);
      var instId = inst.id;
      (theoryScheduleInst || []).forEach(function(ts) {
        if (ts.instructor_id === instId) {
          slots.push({
            id: ts.id,
            date: ts.date,
            start_time: ts.start_time,
            end_time: ts.end_time,
            slot_type: 'theory',
            theory_topic_number: ts.theory_topics ? ts.theory_topics.topic_number : '?',
            theory_topic_title: ts.theory_topics ? ts.theory_topics.title : '',
            instructor_id: ts.instructor_id,
            instructor_name: ts.instructor_name,
            status: ts.status
          });
        }
      });
    } catch(e) {}

    var selectedDay = AppState.scheduleSelectedDay || 0;
    if (selectedDay >= w.days.length) selectedDay = 0;
    var selectedDate = w.days[selectedDay];
    var selectedDateStr = formatDateLocal(selectedDate);
    var daySlots = slots.filter(function(s) { return s.date === selectedDateStr; });
    daySlots.sort(function(a, b) { return a.start_time.localeCompare(b.start_time); });

    var viewMode = AppState.instructorViewMode || 'day';

    var html = '<div class="page-padding">' +
      '<div class="welcome-msg"><h2>' + t('hallo') + ', ' + inst.name + '</h2><p>' + t('deineWochenplanung') + '</p></div>';

    // Week navigation
    html += '<div class="schedule-week-nav">' +
      '<button class="btn btn-ghost btn-sm" onclick="App.shiftWeek(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><polyline points="15,18 9,12 15,6"/></svg></button>' +
      '<span class="schedule-week-label">' + this.weekLabel() + '</span>' +
      '<button class="btn btn-ghost btn-sm" onclick="App.shiftWeek(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><polyline points="9,18 15,12 9,6"/></svg></button></div>';

    // View mode toggle (Fix 2)
    html += '<div class="view-toggle-row">' +
      '<button class="view-toggle-btn' + (viewMode === 'day' ? ' active' : '') + '" onclick="App.setInstructorViewMode(\'day\')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ' + t('tagesansicht') + '</button>' +
      '<button class="view-toggle-btn' + (viewMode === 'week' ? ' active' : '') + '" onclick="App.setInstructorViewMode(\'week\')">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> ' + t('wochenansicht') + '</button>' +
    '</div>';

    if (viewMode === 'week') {
      // ──── WEEK GRID VIEW (absolute positioned) ────
      html += this.renderWeekGridHtml(
        w.days, slots,
        "App.openScheduleModal('{DAY}', '09:00')",
        "App.openScheduleModal(null, null, {SLOT})"
      );

    } else {
      // ──── DAY VIEW (original mobile-first tabs) ────
      html += '<div class="schedule-day-tabs">';
      w.days.forEach(function(day, idx) {
        var isToday = day.toDateString() === new Date().toDateString();
        var isActive = idx === selectedDay;
        var cls = 'schedule-day-tab' + (isActive ? ' active' : '') + (isToday ? ' today' : '');
        var dStr = formatDateLocal(day);
        var cnt = slots.filter(function(s) { return s.date === dStr; }).length;
        html += '<button class="' + cls + '" onclick="App.selectDay(' + idx + ')">' +
          '<div class="schedule-day-tab-name">' + getDayNames()[idx] + '</div>' +
          '<div class="schedule-day-tab-date">' + day.getDate() + '</div>' +
          (cnt > 0 ? '<div class="schedule-day-tab-dots">' + cnt + '</div>' : '') +
        '</button>';
      });
      html += '</div>';

      html += '<div class="schedule-day-header"><span>' + getDayNamesLong()[selectedDay] + ', ' + selectedDate.getDate() + '.' + String(selectedDate.getMonth() + 1).padStart(2, '0') + '.</span>' +
        '<div style="display:flex;gap:var(--space-2);">' +
        '<button class="btn btn-primary btn-sm" onclick="App.openScheduleModal(\'' + selectedDateStr + '\', \'09:00\')">' + t('plusTermin') + '</button>' +
        '<button class="btn btn-ghost btn-sm" style="border:1px solid var(--color-border);" onclick="App.openBlockModal(\'' + selectedDateStr + '\', \'09:00\')">' + t('plusZeitsperre') + '</button>' +
        '</div></div>';

      if (daySlots.length === 0) {
        html += '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
          '<div class="empty-state-title">' + t('keineTermine') + '</div><div class="empty-state-text">' + t('erstelleTermin') + '</div></div>';
      } else {
        html += '<div class="schedule-slot-list">';
        daySlots.forEach(function(slot) {
          var isBlock = slot.slot_type === 'block';
          var isUnconfirmed = !isBlock && slot.confirmed === false;
          var isRecurring = !isBlock && slot.notes && slot.notes.indexOf('[recurring:') !== -1;
          var isTheory = slot.slot_type === 'theory';
          var isUnconfirmed = !isBlock && !isTheory && slot.confirmed === false;
          var statusCls = 'schedule-slot-card schedule-slot-' + slot.status;
          if (isBlock) statusCls = 'schedule-slot-card';
          if (isTheory) statusCls = 'schedule-slot-card';
          if (isUnconfirmed) statusCls += ' slot-unconfirmed-card';
          var clickAction;
          if (isTheory) {
            clickAction = 'App.openTheoryDetail(&quot;' + slot.id + '&quot;)';
          } else if (isBlock) {
            clickAction = 'App.openBlockDetail(' + JSON.stringify(slot).replace(/"/g, '&quot;') + ')';
          } else {
            clickAction = 'App.openScheduleModal(null, null, ' + JSON.stringify(slot).replace(/"/g, '&quot;') + ')';
          }
          var cardStyle = '';
          if (isBlock) cardStyle = 'background:repeating-linear-gradient(-45deg,#e0e0e0,#e0e0e0 4px,#d0d0d0 4px,#d0d0d0 8px);border-left:3px solid #757575;';
          if (isTheory) cardStyle = 'border-left:3px solid var(--color-purple);background:var(--color-purple-highlight);';
          html += '<div class="' + statusCls + '" style="' + cardStyle + '" onclick="' + clickAction + '">' +
            '<div class="schedule-slot-card-left">' +
              '<div class="schedule-slot-card-time">' + slot.start_time + '</div>' +
              '<div class="schedule-slot-card-end">' + slot.end_time + '</div>' +
            '</div>' +
            '<div class="schedule-slot-card-body">' +
              '<div class="schedule-slot-card-title">' + (isBlock ? t('nichtVerfuegbar') : (slot.student_name || t('offenerBlock'))) + '</div>' +
              '<div class="schedule-slot-card-meta">' + (isBlock ? t('zeitsperre') : (tType(slot.type) + (slot.license_class ? ' \u00b7 ' + t('klasse') + ' ' + slot.license_class : '') + (isRecurring ? ' \uD83D\uDD01' : ''))) + '</div>' +
              '<div class="schedule-slot-card-title">' + (isTheory ? t('theorieThema') + ' ' + (slot.theory_topic_number || '') : (isBlock ? t('nichtVerfuegbar') : (slot.student_name || t('offenerBlock')))) + '</div>' +
              '<div class="schedule-slot-card-meta">' + (isTheory ? (slot.theory_topic_title || '') : (isBlock ? t('zeitsperre') : (tType(slot.type) + (slot.license_class ? ' \u00b7 ' + t('klasse') + ' ' + slot.license_class : '')))) + '</div>' +
            '</div>' +
            (isTheory ? '<span class="badge" style="background:var(--color-purple-highlight);color:var(--color-purple);">' + t('theorie') + '</span>' :
              (isBlock ? '<span class="badge badge-muted">' + t('zeitsperre') + '</span>' :
                (isUnconfirmed ? '<span class="badge badge-warning">' + t('unbestaetigt') + '</span>' :
                  '<span class="badge ' + App.statusBadgeClass(slot.status) + '">' + tStatus(slot.status) + '</span>'))) +
          '</div>';
        });
        html += '</div>';
      }
    }

    html += '</div>';
    main.innerHTML = html;
  },

  renderInstructorStudentsTab: async function() {
    var main = document.getElementById('instructor-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var students = await ApiClient.get('/api/instructor/students');
      var html = '<div class="page-padding"><div class="section-header"><span class="section-title">' + t('meineSchueler') + ' (' + students.length + ')</span></div>';
      students.forEach(function(st) {
        html += '<div class="card card-interactive mb-3" onclick="App.viewStudentDetail(\'' + st.id + '\')"><div style="display:flex;align-items:center;gap:var(--space-3);">' +
          App.avatarHtml(st.name, '') +
          '<div class="flex-1"><div style="font-weight:600;font-size:var(--text-sm);">' + st.name + '</div>' +
          '<div class="text-xs text-muted">' + t('klasse') + ' ' + st.license_class + ' · ' + st.lessonCount + ' ' + t('fahrstunden') + '</div></div>' +
          '<div>' + App.skillLevelHtml(st.avgSkill || 0) + '</div></div></div>';
      });
      html += '</div>'; main.innerHTML = html;
    } catch (err) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  renderInstructorLessonsTab: async function() {
    var main = document.getElementById('instructor-main');
    var data = AppState._cachedData.instructorDash;
    if (!data) { try { data = await ApiClient.get('/api/instructor/dashboard'); AppState._cachedData.instructorDash = data; } catch (e) { return; } }
    var allLessons = data.lessons || [];
    var html = '<div class="page-padding"><div class="section-header"><span class="section-title">' + t('alleFahrstunden') + ' (' + allLessons.length + ')</span>' +
      '<button class="btn btn-primary btn-sm" onclick="App.navigate(\'lesson-setup\')">+ ' + t('neueFahrstunde') + '</button></div>';
    allLessons.forEach(function(item) {
      html += '<div class="card card-interactive mb-3" onclick="App.showLessonReview(\'' + item.id + '\', \'' + item.student_id + '\', \'instructor\')"><div style="display:flex;align-items:center;gap:var(--space-3);">' +
        App.avatarHtml(item.student_name, 'sm') +
        '<div class="flex-1"><div style="font-weight:600;font-size:var(--text-sm);">' + tType(item.type) + '</div>' +
        '<div class="text-xs text-muted">' + item.student_name + ' · ' + App.formatDate(item.date) + ' · ' + App.formatDuration(item.duration) + '</div></div>' +
        '<div>' + App.skillLevelHtml(App.avgRating(item.ratings)) + '</div></div></div>';
    });
    html += '</div>'; main.innerHTML = html;
  },

  renderInstructorProfileTab: async function() {
    var main = document.getElementById('instructor-main');
    try {
      var profile = await ApiClient.get('/api/instructor/profile');
      var html = '<div class="page-padding"><div class="profile-header">' + this.avatarHtml(profile.name, 'lg') +
        '<h3>' + profile.name + '</h3><p class="text-xs text-muted">' + t('fahrlehrer') + '</p></div>' +
        '<div class="card mb-4"><div class="section-title mb-3">' + t('persoenlicheDaten') + '</div>' +
          '<form id="instructor-profile-form" onsubmit="App.saveInstructorProfile(event)">' +
            '<div class="form-group mb-3"><label class="form-label">' + t('name') + '</label><input class="form-input" type="text" id="inst-profile-name" value="' + profile.name + '"></div>' +
            '<div class="form-group mb-3"><label class="form-label">' + t('email') + '</label><input class="form-input" type="email" id="inst-profile-email" value="' + profile.email + '"></div>' +
            '<div class="form-group mb-3"><label class="form-label">' + t('telefon') + '</label><input class="form-input" type="tel" id="inst-profile-phone" value="' + (profile.phone || '') + '"></div>' +
            '<button type="submit" class="btn btn-primary btn-full">' + t('aenderungenSpeichern') + '</button></form></div>' +
        '<div class="card mb-4"><div class="section-title mb-3">' + t('zuordnung') + '</div>' +
          '<div class="profile-row"><span class="profile-row-label">' + t('fahrschule') + '</span><span class="profile-row-value">' + (profile.schoolName || '—') + '</span></div></div>' +
        // Support & Feedback card
        '<div class="card mb-4"><div class="section-title mb-3">' + t('supportFeedback') + '</div>' +
          '<div class="form-group mb-3"><label class="form-label">' + t('feedbackKategorie') + '</label>' +
            '<select class="form-select" id="feedback-category">' +
              '<option value="bug">' + t('katBug') + '</option>' +
              '<option value="verbesserung">' + t('katVerbesserung') + '</option>' +
              '<option value="frage">' + t('katFrage') + '</option>' +
              '<option value="sonstiges">' + t('katSonstiges') + '</option>' +
            '</select></div>' +
          '<div class="form-group mb-3"><label class="form-label">' + t('feedbackNachricht') + '</label>' +
            '<textarea class="form-textarea" id="feedback-message" rows="4" placeholder="' + t('feedbackPlaceholder') + '"></textarea></div>' +
          '<button class="btn btn-primary btn-full" onclick="App.sendFeedback()">' + t('feedbackSenden') + '</button></div>' +
        this.changePasswordHtml() +
        '<button class="btn btn-secondary btn-full" style="margin-top:20px" onclick="App.logout()">' + t('abmelden') + '</button></div>';
      main.innerHTML = html;
    } catch (err) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  saveInstructorProfile: async function(e) {
    e.preventDefault();
    try {
      await ApiClient.put('/api/instructor/profile', {
        name: document.getElementById('inst-profile-name').value.trim(),
        email: document.getElementById('inst-profile-email').value.trim(),
        phone: document.getElementById('inst-profile-phone').value.trim()
      });
      AppState.currentUser.name = document.getElementById('inst-profile-name').value.trim();
      document.getElementById('instructor-name-display').textContent = AppState.currentUser.name;
      AppState._cachedData.instructorDash = null;
      this.showToast(t('profilAktualisiert'));
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  // ══════════════════════════════════════════
  //  STUDENT DETAIL
  // ══════════════════════════════════════════
  viewStudentDetail: async function(studentId) {
    this.navigate('student-detail');
    var content = document.getElementById('student-detail-content');
    content.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var data = await ApiClient.get('/api/student-detail/' + studentId);
      var student = data.student; var lessons = data.lessons;
      document.getElementById('student-detail-name').textContent = student.name;
      var latestRatings = lessons.length > 0 ? lessons[0].ratings : {};
      var avg = this.avgRating(latestRatings);
      var totalDuration = 0;
      lessons.forEach(function(l) { totalDuration += l.duration; });
      var html = '<div class="page-padding"><div class="student-header">' +
        this.avatarHtml(student.name, 'lg') +
        '<div class="student-header-info"><h3>' + student.name + '</h3><div class="student-header-meta">' +
          '<span>' + t('klasse') + ' ' + student.license_class + '</span><span>' + data.instructorName + '</span><span>' + lessons.length + ' ' + t('fahrstunden') + '</span>' +
        '</div></div></div>';
      html += '<div class="card mb-4"><div class="section-title mb-3">' + t('aktuellesKoennen') + '</div>' +
        '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">' +
          '<div class="progress-ring-container">' + this.buildProgressRing(avg, 4, 60) + '</div>' +
          '<div><div style="font-weight:600;font-size:var(--text-sm);">' + t('gesamtdurchschnitt') + '</div>' + this.skillLevelHtml(avg) + '</div></div>';
      SKILL_TASKS.forEach(function(task) {
        var val = latestRatings[task] || 0; var pct = (val / 4) * 100; var info = getSkillLevel(val);
        html += '<div class="skill-bar"><div class="skill-bar-header"><span>' + tSkill(task) + '</span><span class="badge ' + info.badgeClass + '" style="font-size:10px;">' + tLevel(info.name) + '</span></div>' +
          '<div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + pct + '%;background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></div></div></div>';
      });
      html += '</div>';
      // ── Theory Progress Section ──
      html += '<div class="card mb-4 theory-progress-section"><div class="section-title mb-3">' + t('theorieFortschritt') + '</div>' +
        '<div id="theory-progress-container"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div></div>';

      // ── Ausbildungsnachweis Button (only for school/admin) ──
      if (AppState.currentUser && AppState.currentUser.role === 'school') {
        html += '<button class="btn btn-primary btn-full" style="margin-bottom:var(--space-4);gap:var(--space-2);display:flex;align-items:center;justify-content:center;" ' +
          'onclick="App.generateAusbildungsnachweis(\'' + studentId + '\')">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg> ' +
          t('ausbildungsnachweisGenerieren') + '</button>';
      }

      html += '</div>'; content.innerHTML = html;
      // Load theory progress asynchronously
      this.renderTheoryProgress(studentId);
    } catch (err) { content.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  shareStudent: async function(studentId) {
    this.navigate('share-student');
    var content = document.getElementById('share-student-content');
    try {
      var data = await ApiClient.get('/api/share-student/' + studentId);
      var student = data.student;
      var html = '<div class="card mb-4"><div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">' +
        this.avatarHtml(student.name, 'lg') +
        '<div><div style="font-weight:600;">' + student.name + '</div><div class="text-xs text-muted">Klasse ' + student.license_class + '</div></div></div>';
      if (data.otherInstructors.length === 0) {
        html += '<p class="text-sm text-muted">' + t('keineAnderenFahrlehrer') + '</p>';
      } else {
        html += '<div class="section-title mb-3">' + t('profilTeilenMit') + '</div>';
        data.otherInstructors.forEach(function(oi) {
          html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--color-divider);">' +
            '<div style="display:flex;align-items:center;gap:var(--space-3);">' + App.avatarHtml(oi.name, 'sm') + '<span class="text-sm">' + oi.name + '</span></div>' +
            '<button class="btn btn-primary btn-sm" onclick="App.showToast(\'Profil geteilt mit ' + oi.name + '\')">Teilen</button></div>';
        });
      }
      html += '</div>'; content.innerHTML = html;
    } catch (err) { content.innerHTML = '<p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p>'; }
  },

  // ══════════════════════════════════════════
  //  AUSBILDUNGSNACHWEIS (Anlage 3) PDF GENERATION
  // ══════════════════════════════════════════
  generateAusbildungsnachweis: async function(studentId) {
    this.showToast(t('ausbildungsnachweisErstellt'));
    try {
      var data = await ApiClient.get('/api/ausbildungsnachweis/' + studentId);
      if (!window.jspdf || !window.jspdf.jsPDF) {
        this.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
        return;
      }
      var jsPDF = window.jspdf.jsPDF;
      // A4 Portrait
      var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      var pw = 210;
      var ph = 297;
      var ml = 12;
      var mr = 12;
      var mt = 10;
      var cw = pw - ml - mr;
      var lw = 0.25; // default line width

      // Helpers
      var fmtDate = function(d) {
        if (!d) return '';
        var p = d.split('-');
        return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
      };
      var instNr = function(id) {
        for (var i = 0; i < data.instructors.length; i++) {
          if (data.instructors[i].id === id) return String(data.instructors[i].nr);
        }
        return '';
      };
      var typeAbbr = function(t) {
        var m = { '\u00dcbungsfahrt':'Uest', '\u00dcberlandfahrt':'UL', 'Autobahnfahrt':'AB', 'Nachtfahrt':'NF', 'Pr\u00fcfungsvorbereitung':'Uest', 'Praktische Pr\u00fcfung':'Pf', 'Theoretische Pr\u00fcfung':'ThP' };
        return m[t] || t;
      };
      var drawRect = function(x, y, w, h) { doc.setDrawColor(0); doc.setLineWidth(lw); doc.rect(x, y, w, h); };
      var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(lw); doc.line(x1, y1, x2, y2); };

      // ======= TITLE =======
      var y = mt;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
      doc.text('Ausbildungsnachweis', pw / 2, y + 5, { align: 'center' });
      y += 8;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text('Ausbildungsnachweis fuer Klasse ' + (data.student.license_class || 'B'), pw / 2, y + 4, { align: 'center' });
      y += 6;
      doc.setFontSize(6.5);
      doc.text('gemaess ' + String.fromCharCode(167) + ' 31 Absatz 1 Fahrlehrergesetz und ' + String.fromCharCode(167) + ' 6 Absatz 2 Fahrschueler-Ausbildungsordnung', pw / 2, y + 3, { align: 'center' });
      y += 7;

      // ======= TOP SECTION: School/Student (left) + Fahrlehrer (right) =======
      var topY = y;
      var leftW = cw * 0.52;
      var rightW = cw - leftW;
      var rightX = ml + leftW;
      var topH = 42;

      drawRect(ml, topY, leftW, topH);
      drawRect(rightX, topY, rightW, topH);

      // School info
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('Fahrschule', ml + 2, topY + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(data.school.name || '', ml + 2, topY + 8);
      doc.text(data.school.address || '', ml + 2, topY + 12);

      // Separator
      drawLine(ml, topY + 15, ml + leftW, topY + 15);

      // Student info
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
      doc.text('Familienname:', ml + 2, topY + 19);
      doc.setFont('helvetica', 'normal');
      var nameParts = (data.student.name || '').split(' ');
      var lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
      var firstName = nameParts.length > 1 ? nameParts[0] : '';
      doc.text(lastName, ml + 30, topY + 19);

      doc.setFont('helvetica', 'bold');
      doc.text('Vorname:', ml + 2, topY + 23);
      doc.setFont('helvetica', 'normal');
      doc.text(firstName, ml + 30, topY + 23);

      doc.setFont('helvetica', 'bold');
      doc.text('Anschrift:', ml + 2, topY + 27);
      doc.setFont('helvetica', 'normal');
      doc.text(data.student.anschrift || '', ml + 30, topY + 27);

      drawLine(ml, topY + 29, ml + leftW, topY + 29);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.text('Geburtsdatum:', ml + 2, topY + 33);
      doc.setFont('helvetica', 'normal');
      doc.text(data.student.geburtsdatum ? fmtDate(data.student.geburtsdatum) : '', ml + 28, topY + 33);

      doc.setFont('helvetica', 'bold');
      doc.text('Beantragte Klasse(n):', ml + leftW * 0.38, topY + 33);
      doc.setFont('helvetica', 'normal');
      doc.text(data.student.license_class || 'B', ml + leftW * 0.65, topY + 33);

      doc.setFont('helvetica', 'bold');
      doc.text('Vorbesitz der Klasse(n):', ml + 2, topY + 38);
      doc.setFont('helvetica', 'normal');
      doc.text('', ml + 38, topY + 38);

      // Right: Fahrlehrer + Praxis-Tabelle headers
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('Fahrlehrer', rightX + 2, topY + 4);
      doc.text('Nr.', rightX + rightW - 10, topY + 4);
      drawLine(rightX, topY + 6, rightX + rightW, topY + 6);

      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
      data.instructors.forEach(function(inst, idx) {
        doc.text(inst.name, rightX + 2, topY + 10 + idx * 4);
        doc.text(String(inst.nr), rightX + rightW - 10, topY + 10 + idx * 4);
      });

      y = topY + topH + 1;

      // ======= MIDDLE: Praxis rechts (oben rechts erweitert) + Theorie (links) =======
      // According to Anlage 3: Student info left, Praxis table right, then Theorie below left
      // We use the same side-by-side as the template image

      // Praxis table on right side (extends from info section down)
      var praxTopY = topY;
      var praxHeaderH = topH; // aligned with info section
      // The practice table starts at topY + topH and extends down
      var praxColX = rightX;
      var praxW = rightW;

      // Practice table header row
      var ptY = y;
      drawRect(praxColX, ptY, praxW, 6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5);
      var pc = { d: praxColX + 1, art: praxColX + 14, beg: praxColX + praxW - 27, min: praxColX + praxW - 17, fl: praxColX + praxW - 8 };
      doc.text('Datum', pc.d, ptY + 4);
      doc.text('Prakt. Ausbild.', pc.art, ptY + 2.5);
      doc.text('Art u. Inhalt**)', pc.art, ptY + 5);
      doc.text('Beginn', pc.beg, ptY + 2.5);
      doc.text('Uhrzeit', pc.beg, ptY + 5);
      doc.text('Minuten', pc.min, ptY + 4);
      doc.text('FL*) Nr.', pc.fl, ptY + 4);

      // Practice data rows
      var prRowH = 4;
      var prRowStart = ptY + 6;
      var maxPrRows = 28;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
      for (var pi = 0; pi < maxPrRows; pi++) {
        var pry = prRowStart + pi * prRowH;
        drawLine(praxColX, pry + prRowH, praxColX + praxW, pry + prRowH);
        if (pi < data.practicalLessons.length) {
          var pl = data.practicalLessons[pi];
          doc.text(fmtDate(pl.date), pc.d, pry + 3);
          doc.text(typeAbbr(pl.type), pc.art, pry + 3);
          doc.text(pl.start_time || '', pc.beg, pry + 3);
          doc.text(String(pl.duration || ''), pc.min, pry + 3);
          doc.text(instNr(pl.instructor_id), pc.fl, pry + 3);
        }
      }
      var praxBottom = prRowStart + maxPrRows * prRowH;
      drawRect(praxColX, ptY, praxW, praxBottom - ptY);

      // ======= THEORY TABLE (left side, below student info) =======
      var thY = y;
      var thW = leftW;
      var thHalfW = thW / 2;

      // Main header
      drawRect(ml, thY, thW, 6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.text('Theoretischer Grundunterricht', ml + thHalfW / 2, thY + 4, { align: 'center' });
      doc.text('Klassenspezifischer Unterricht', ml + thHalfW + thHalfW / 2, thY + 4, { align: 'center' });
      drawLine(ml + thHalfW, thY, ml + thHalfW, thY + 6);

      // Sub headers
      var thSubY = thY + 6;
      drawRect(ml, thSubY, thW, 5);
      drawLine(ml + thHalfW, thSubY, ml + thHalfW, thSubY + 5);

      doc.setFontSize(5); doc.setFont('helvetica', 'bold');
      var gc = { d: ml + 1, th: ml + 13, min: ml + thHalfW - 16, fl: ml + thHalfW - 7 };
      var kc = { d: ml + thHalfW + 1, th: ml + thHalfW + 13, min: ml + thW - 16, fl: ml + thW - 7 };
      doc.text('Datum', gc.d, thSubY + 3.5);
      doc.text('Thema', gc.th, thSubY + 3.5);
      doc.text('Minuten', gc.min, thSubY + 3.5);
      doc.text('FL*) Nr.', gc.fl, thSubY + 3.5);
      doc.text('Datum', kc.d, thSubY + 3.5);
      doc.text('Thema', kc.th, thSubY + 3.5);
      doc.text('Minuten', kc.min, thSubY + 3.5);
      doc.text('FL*) Nr.', kc.fl, thSubY + 3.5);

      // Theory data rows
      var thRowStart = thSubY + 5;
      var thRowH = 4;
      var maxThRows = 14;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5);
      for (var ti = 0; ti < maxThRows; ti++) {
        var try_ = thRowStart + ti * thRowH;
        drawLine(ml, try_ + thRowH, ml + thW, try_ + thRowH);
        drawLine(ml + thHalfW, try_, ml + thHalfW, try_ + thRowH);
        if (ti < data.theoryBasic.length) {
          var tb = data.theoryBasic[ti];
          doc.text(fmtDate(tb.date), gc.d, try_ + 3);
          doc.text(String(tb.topic_number) + '. ' + (tb.title || '').substring(0, 20), gc.th, try_ + 3);
          doc.text(String(tb.duration_min), gc.min, try_ + 3);
          doc.text(instNr(tb.instructor_id), gc.fl, try_ + 3);
        }
        if (ti < data.theorySpecific.length) {
          var tsp = data.theorySpecific[ti];
          doc.text(fmtDate(tsp.date), kc.d, try_ + 3);
          doc.text(String(tsp.topic_number) + '. ' + (tsp.title || '').substring(0, 20), kc.th, try_ + 3);
          doc.text(String(tsp.duration_min), kc.min, try_ + 3);
          doc.text(instNr(tsp.instructor_id), kc.fl, try_ + 3);
        }
      }
      var thBottom = thRowStart + maxThRows * thRowH;
      drawRect(ml, thY, thW, thBottom - thY);
      drawLine(ml + thHalfW, thY, ml + thHalfW, thBottom);

      y = Math.max(thBottom, praxBottom) + 3;

      // ======= LEGEND =======
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
      doc.text('*) FL = Fahrlehrer', ml, y + 3);
      doc.text('**) Hier sind mindestens anzugeben:', ml + cw * 0.4, y + 3);
      y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5);
      doc.text('Grundausbildung', ml, y + 3);
      doc.text('besondere Ausbildungsfahrten', ml + cw * 0.4, y + 3);
      y += 3.5;
      doc.text('- Uebungsstunden i.g.O./a.g.O.  = Uest', ml, y + 3);
      doc.text('- Fahrstunden Ueberlandfahrt  = UL', ml + cw * 0.4, y + 3);
      y += 3;
      doc.text('- Grundfahraufgaben  = Gf', ml, y + 3);
      doc.text('- Fahrstunden auf Autobahn  = AB', ml + cw * 0.4, y + 3);
      y += 3;
      doc.text('- Unterweisung am Ausbildungsfahrzeug  = Uw', ml, y + 3);
      doc.text('- Fahrstunden bei Dunkelheit  = NF', ml + cw * 0.4, y + 3);
      y += 4;
      doc.text('Schaltnachweis inkl. Ausbildung nach ' + String.fromCharCode(167) + ' 5a FahrschAusbO  = SN', ml + cw * 0.4, y + 3);
      y += 6;

      // ======= KOOPERATION =======
      drawRect(ml, y, cw, 18);
      doc.setFontSize(5.5);
      doc.text('Die Ausbildung erfolgte in Kooperation als', ml + 6, y + 4);
      doc.rect(ml + 2, y + 1.5, 3, 3); // checkbox
      doc.rect(ml + 8, y + 6, 3, 3); // checkbox
      doc.text('Auftrag gebende', ml + 13, y + 8.5);
      doc.rect(ml + 8, y + 10.5, 3, 3); // checkbox
      doc.text('Auftrag nehmende', ml + 13, y + 13);
      doc.text('Fahrschule mit folgender Fahrschule***)', ml + 6, y + 17);
      y += 20;

      doc.setFontSize(5);
      doc.text('***) falls zutreffend bitte ausfuellen', ml, y + 3);
      y += 8;

      // ======= SIGNATURES =======
      if (y > ph - 22) y = ph - 22;
      doc.setFontSize(6);
      var sigW = cw / 3;
      doc.text('Ort, Datum', ml, y + 3);
      drawLine(ml, y + 6, ml + sigW - 5, y + 6);

      doc.text('Unterschrift', ml + sigW, y + 3);
      doc.text('der/des Fahrschulinhaber/-inhabers/', ml + sigW, y + 6);
      doc.text('der verantwortlichen Leitung', ml + sigW, y + 9);

      doc.text('Unterschrift', ml + sigW * 2 + 5, y + 3);
      doc.text('der/des Fahrschuelerin/Fahrschuelers', ml + sigW * 2 + 5, y + 6);

      y += 13;
      doc.setFontSize(4.5);
      doc.text('Abweichungen vom vorstehenden Muster sind zulaessig, soweit Besonderheiten des Verfahrens, insbesondere der Einsatz maschineller Datenverarbeitung, dies erfordern.', ml, y + 2);

      // Save
      var fileName = 'Ausbildungsnachweis_' + (data.student.name || 'Schueler').replace(/\s+/g, '_') + '_' + (data.student.license_class || 'B') + '.pdf';
      doc.save(fileName);
      this.showToast(t('ausbildungsnachweis') + ' PDF erstellt');
    } catch (err) {
      this.showToast(t('fehler') + ': ' + err.message);
    }
  },

  // ══════════════════════════════════════════
  //  LESSON SETUP / ACTIVE / SUMMARY (Fix 1: All school students + Fix 3: Images)
  // ══════════════════════════════════════════
  initLessonSetup: async function() {
    try {
      // Instructor sees ALL school students (not just linked ones)
      var students = await ApiClient.get('/api/instructor/school-students');
      var sel = document.getElementById('lesson-student-select');
      sel.innerHTML = '<option value="">' + t('schuelerWaehlen') + '...</option>' +
        '<option value="__probe__">' + t('probefahrt') + ' (' + t('ohneSchueler') + ')</option>';
      students.forEach(function(st) { sel.innerHTML += '<option value="' + st.id + '">' + st.name + ' (Klasse ' + st.license_class + ')</option>'; });
    } catch (e) {}
  },

  startLesson: function(e) {
    e.preventDefault();
    var studentId = document.getElementById('lesson-student-select').value;
    var type = document.getElementById('lesson-type-select').value;
    var licenseClass = document.getElementById('lesson-class-select').value;
    var studentName;
    if (!studentId || studentId === '__probe__') {
      studentId = null;
      studentName = t('probefahrt');
    } else {
      studentName = document.getElementById('lesson-student-select').selectedOptions[0].textContent.split(' (')[0];
    }
    AppState.activeLesson = { studentId: studentId, studentName: studentName, type: type, licenseClass: licenseClass, startTime: new Date() };
    AppState.lessonStartTime = Date.now();
    AppState.lessonPaused = false;
    AppState.pausedDuration = 0;
    AppState.pauseStartTime = null;
    AppState.pendingImages = [];
    this.navigate('lesson-active');
    document.getElementById('active-lesson-title').textContent = t('fahrstunden') + ' · ' + studentName;
    document.getElementById('active-lesson-type-badge').textContent = type;
    if (AppState.lessonTimer) clearInterval(AppState.lessonTimer);
    AppState.lessonTimer = setInterval(function() {
      if (AppState.lessonPaused) return;
      var elapsed = Date.now() - AppState.lessonStartTime - AppState.pausedDuration;
      var s = Math.floor(elapsed / 1000);
      var h = Math.floor(s / 3600); var m = Math.floor((s % 3600) / 60); var sec = s % 60;
      document.getElementById('lesson-timer').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }, 1000);
    // Reset pause button
    var pauseBtn = document.getElementById('lesson-pause-btn');
    if (pauseBtn) pauseBtn.innerHTML = '\u23f8 ' + t('pause');
    var overlay = document.getElementById('lesson-paused-overlay');
    if (overlay) overlay.classList.remove('visible');
    // Initialize route tracking
    this.initRouteMap();
    this.startGPS();
  },

  toggleLessonPause: function() {
    if (!AppState.lessonPaused) {
      AppState.lessonPaused = true;
      AppState.pauseStartTime = Date.now();
      if (AppState.gpsWatchId) { navigator.geolocation.clearWatch(AppState.gpsWatchId); AppState.gpsWatchId = null; }
      var btn = document.getElementById('lesson-pause-btn');
      if (btn) { btn.innerHTML = '\u25b6 ' + t('fortsetzen'); btn.classList.remove('btn-warning'); btn.classList.add('btn-primary'); }
      var overlay = document.getElementById('lesson-paused-overlay');
      if (overlay) overlay.classList.add('visible');
    } else {
      AppState.lessonPaused = false;
      AppState.pausedDuration += Date.now() - AppState.pauseStartTime;
      AppState.pauseStartTime = null;
      this.startGPS();
      var btn = document.getElementById('lesson-pause-btn');
      if (btn) { btn.innerHTML = '\u23f8 ' + t('pause'); btn.classList.remove('btn-primary'); btn.classList.add('btn-warning'); }
      var overlay = document.getElementById('lesson-paused-overlay');
      if (overlay) overlay.classList.remove('visible');
    }
  },

  // Start lesson directly from schedule slot (no setup screen)
  startLessonFromSlot: async function(studentId, type, licenseClass) {
    try {
      var students = await ApiClient.get('/api/instructor/school-students');
      var student = students.find(function(s) { return s.id === studentId; });
      if (!student) { this.showToast('Sch\u00fcler nicht gefunden'); return; }
      AppState.activeLesson = { studentId: studentId, studentName: student.name, type: type, licenseClass: licenseClass || 'B', startTime: new Date() };
      AppState.lessonStartTime = Date.now();
      AppState.lessonPaused = false;
      AppState.pausedDuration = 0;
      AppState.pauseStartTime = null;
      AppState.pendingImages = [];
      this.navigate('lesson-active');
      document.getElementById('active-lesson-title').textContent = t('fahrstunden') + ' \u00b7 ' + student.name;
      document.getElementById('active-lesson-type-badge').textContent = type;
      if (AppState.lessonTimer) clearInterval(AppState.lessonTimer);
      AppState.lessonTimer = setInterval(function() {
        if (AppState.lessonPaused) return;
        var elapsed = Date.now() - AppState.lessonStartTime - AppState.pausedDuration;
        var s = Math.floor(elapsed / 1000);
        var h = Math.floor(s / 3600); var m = Math.floor((s % 3600) / 60); var sec = s % 60;
        document.getElementById('lesson-timer').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
      }, 1000);
      // Reset pause button
      var pauseBtn = document.getElementById('lesson-pause-btn');
      if (pauseBtn) pauseBtn.innerHTML = '\u23f8 ' + t('pause');
      var overlay = document.getElementById('lesson-paused-overlay');
      if (overlay) overlay.classList.remove('visible');
      // Initialize route tracking
      this.initRouteMap();
      this.startGPS();
    } catch(e) { this.showToast(t('fehler') + ': ' + e.message); }
  },

  stopLesson: function() {
    if (confirm(t('fahrstundeAbbrechen'))) {
      if (AppState.lessonTimer) clearInterval(AppState.lessonTimer);
      AppState.lessonPaused = false;
      AppState.pausedDuration = 0;
      AppState.pauseStartTime = null;
      this.cleanupRouteTracking();
      AppState.activeLesson = null; AppState.pendingImages = [];
      this.navigate('instructor-dashboard');
      this.showToast(t('fahrstundeAbgebrochenMsg'));
    }
  },

  finishLesson: function() {
    if (AppState.lessonTimer) clearInterval(AppState.lessonTimer);
    // If currently paused, finalize the pause duration
    if (AppState.lessonPaused && AppState.pauseStartTime) {
      AppState.pausedDuration += Date.now() - AppState.pauseStartTime;
      AppState.pauseStartTime = null;
    }
    AppState.lessonPaused = false;
    this.stopGPS();
    var elapsed = Date.now() - AppState.lessonStartTime - (AppState.pausedDuration || 0);
    var durationMin = Math.max(1, Math.round(elapsed / 60000));
    AppState.activeLesson.duration = durationMin;
    // Store route data in activeLesson
    AppState.activeLesson.routeData = AppState.routePoints.slice();
    AppState.activeLesson.markers = AppState.routeMarkers.slice();
    AppState.activeLesson.distanceKm = AppState.totalDistance / 1000;
    // Calculate average speed
    if (durationMin > 0 && AppState.totalDistance > 0) {
      AppState.activeLesson.avgSpeedKmh = (AppState.totalDistance / 1000) / (durationMin / 60);
    } else {
      AppState.activeLesson.avgSpeedKmh = 0;
    }
    AppState.summaryRatings = {};
    SKILL_TASKS.forEach(function(t) { AppState.summaryRatings[t] = 2; });
    this.navigate('lesson-summary');
    this.renderLessonSummary();
  },

  renderLessonSummary: function() {
    var lesson = AppState.activeLesson;
    if (!lesson) return;
    var html = '<div class="card mb-4"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">' +
      '<span class="font-semibold text-sm">' + lesson.type + '</span>' +
      '<span class="badge badge-primary">' + this.formatDuration(lesson.duration) + '</span></div>' +
      '<div class="text-xs text-muted">' + lesson.studentName + '</div></div>';
    html += '<div class="section-title mb-3">' + t('bewertung') + '</div>';
    SKILL_TASKS.forEach(function(task) {
      var current = AppState.summaryRatings[task] || 2;
      html += '<div class="rating-card mb-3"><div style="margin-bottom:var(--space-2);"><span class="rating-card-label">' + task + '</span></div>' +
        '<div class="level-selector" data-task="' + task + '">';
      SKILL_LEVELS.forEach(function(sl) {
        var isActive = sl.level === current ? ' active' : '';
        html += '<button type="button" class="level-selector-btn' + isActive + '" data-level="' + sl.level + '" onclick="App.setSkillRating(\'' + task + '\', ' + sl.level + ', this)">' + tLevel(sl.name) + '</button>';
      });
      html += '</div></div>';
    });
    html += '<div class="form-group mb-4"><label class="form-label">' + t('notizen') + '</label>' +
      '<textarea class="form-textarea" id="lesson-notes" placeholder="' + t('anmerkungenPlaceholder') + '"></textarea></div>';

    // Image upload (Fix 3)
    html += '<div class="form-group mb-4"><label class="form-label">' + t('bilderOptional') + '</label>' +
      '<div class="image-upload-area">' +
        '<input type="file" accept="image/*" multiple id="lesson-image-input" style="display:none;" onchange="App.handleImageUpload(event)">' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById(\'lesson-image-input\').click()">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg> ' + t('bilderHochladen') + '</button>' +
        '<div id="image-preview-list" class="image-preview-list"></div>' +
      '</div></div>';

    html += '<button class="btn btn-primary btn-full btn-lg" onclick="App.saveLessonSummary()">' + t('fahrstundeSpeichern') + '</button>';
    document.getElementById('lesson-summary-content').innerHTML = html;
    this.renderPendingImages();
  },

  handleImageUpload: function(event) {
    var files = event.target.files;
    for (var i = 0; i < files.length; i++) {
      (function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          AppState.pendingImages.push({ filename: file.name, data: e.target.result });
          App.renderPendingImages();
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
    event.target.value = '';
  },

  renderPendingImages: function() {
    var container = document.getElementById('image-preview-list');
    if (!container) return;
    if (AppState.pendingImages.length === 0) { container.innerHTML = ''; return; }
    var html = '';
    AppState.pendingImages.forEach(function(img, idx) {
      html += '<div class="image-preview-item">' +
        '<img src="' + img.data + '" alt="' + img.filename + '">' +
        '<button class="image-preview-remove" onclick="App.removePendingImage(' + idx + ')">&times;</button>' +
        '<div class="image-preview-name">' + img.filename + '</div></div>';
    });
    container.innerHTML = html;
  },

  removePendingImage: function(idx) {
    AppState.pendingImages.splice(idx, 1);
    this.renderPendingImages();
  },

  setSkillRating: function(task, level, btn) {
    AppState.summaryRatings[task] = level;
    var container = btn.parentElement;
    container.querySelectorAll('.level-selector-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  },

  saveLessonSummary: async function() {
    var lesson = AppState.activeLesson;
    if (!lesson) return;
    var notes = document.getElementById('lesson-notes') ? document.getElementById('lesson-notes').value : '';
    try {
      this.showLoading(true);
      await ApiClient.post('/api/lessons', {
        studentId: lesson.studentId, type: lesson.type, duration: lesson.duration,
        notes: notes, ratings: AppState.summaryRatings, licenseClass: lesson.licenseClass,
        images: AppState.pendingImages,
        routeData: lesson.routeData || [],
        markers: lesson.markers || [],
        distanceKm: lesson.distanceKm || 0,
        avgSpeedKmh: lesson.avgSpeedKmh || 0
      });
      AppState.activeLesson = null; AppState.summaryRatings = {}; AppState.pendingImages = [];
      AppState._cachedData.instructorDash = null;
      this.navigate('instructor-dashboard'); this.switchInstructorTab('dashboard');
      this.showToast(t('fahrstundeGespeichert'));
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  // ══════════════════════════════════════════
  //  LESSON REVIEW + EDIT + DELETE (with images)
  // ══════════════════════════════════════════
  showLessonReview: async function(lessonId, studentId, fromRole) {
    this.navigate('lesson-review');
    var content = document.getElementById('lesson-review-content');
    content.innerHTML = '<div style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    document.getElementById('review-back-btn').onclick = function() { App.goBack(); };
    try {
      var lesson = await ApiClient.get('/api/lesson/' + lessonId);
      var html = '<div class="card mb-4"><div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">' +
        this.avatarHtml(lesson.studentName, '') +
        '<div><div style="font-weight:600;">' + lesson.studentName + '</div><div class="text-xs text-muted">' + this.formatDate(lesson.date) + '</div></div></div>' +
        '<div class="lesson-detail-panel">' +
          '<div class="lesson-detail-row"><span class="lesson-detail-label">' + t('typ') + '</span><span class="lesson-detail-value">' + tType(lesson.type) + '</span></div>' +
          '<div class="lesson-detail-row"><span class="lesson-detail-label">' + t('dauer') + '</span><span class="lesson-detail-value">' + this.formatDuration(lesson.duration) + '</span></div>' +
        '</div></div>';
      html += '<div class="card mb-4"><div class="section-title mb-3">' + t('bewertung') + '</div>';
      SKILL_TASKS.forEach(function(task) {
        var val = lesson.ratings[task] || 0; var info = getSkillLevel(val); var pct = (val / 4) * 100;
        html += '<div class="skill-bar"><div class="skill-bar-header"><span>' + tSkill(task) + '</span><span class="badge ' + info.badgeClass + '" style="font-size:10px;">' + tLevel(info.name) + '</span></div>' +
          '<div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + pct + '%;background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></div></div></div>';
      });
      html += '</div>';
      if (lesson.notes) {
        html += '<div class="card mb-4"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-2);">' +
          '<div class="section-title">' + t('notizen') + '</div>';
        if (AppState.language !== 'de') {
          html += '<button class="btn btn-sm" id="translate-notes-btn" style="font-size:11px;padding:4px 10px;" onclick="App.translateLessonNotes()">' +
            '🌐 ' + t('notizenUebersetzen') + '</button>';
        }
        html += '</div>';
        html += '<p class="text-sm" id="lesson-notes-text" data-original="' + lesson.notes.replace(/"/g, '&quot;') + '">' + lesson.notes + '</p></div>';
      }

      // Show images (Fix 3)
      if (lesson.images && lesson.images.length > 0) {
        html += '<div class="card mb-4"><div class="section-title mb-2">' + t('bilder') + '</div><div class="lesson-images-grid">';
        lesson.images.forEach(function(img) {
          html += '<div class="lesson-image-item" onclick="App.openImageModal(\'' + img.data + '\')">' +
            '<img src="' + img.data + '" alt="' + img.filename + '">' +
          '</div>';
        });
        html += '</div></div>';
      }

      // Show route map if route data exists
      if (lesson.route && lesson.route.points && lesson.route.points.length > 0) {
        html += '<div class="card mb-4"><div class="section-title mb-2">' + t('routeUndMarkierungen') + '</div>';
        html += '<div class="route-stats-row">';
        html += '<div class="route-stat"><span class="route-stat-value">' + lesson.route.distanceKm.toFixed(1) + ' km</span><span class="route-stat-label">' + t('strecke') + '</span></div>';
        html += '<div class="route-stat"><span class="route-stat-value">' + Math.round(lesson.route.avgSpeedKmh) + ' km/h</span><span class="route-stat-label">' + t('geschwindigkeitLabel') + '</span></div>';
        html += '<div class="route-stat"><span class="route-stat-value">' + lesson.route.markers.length + '</span><span class="route-stat-label">' + t('markierungen') + '</span></div>';
        html += '</div>';
        html += '<div id="review-route-map" style="height:250px;border-radius:var(--radius-md);overflow:hidden;margin-bottom:var(--space-3);"></div>';
        if (lesson.route.markers.length > 0) {
          html += '<div class="route-markers-list">';
          lesson.route.markers.forEach(function(m, i) {
            var safeNote = (m.note || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            html += '<div class="route-marker-item" data-sv-lat="' + m.lat + '" data-sv-lng="' + m.lng + '" data-sv-note="' + safeNote + '">';
            html += '<div class="route-marker-num">' + (i + 1) + '</div>';
            html += '<div class="route-marker-info"><div class="route-marker-time">' + m.time + '</div>';
            if (m.note) html += '<div class="route-marker-note">' + safeNote + '</div>';
            html += '</div>';
            html += '<div class="route-marker-sv-icon">' + t('tippeFuerStreetView') + '</div>';
            html += '</div>';
          });
          html += '</div>';
        }
        html += '</div>';
      }

      if (fromRole === 'instructor') {
        html += '<div class="card mb-4"><label class="form-label">' + t('bilderHinzufuegen') + '</label>' +
          '<div class="image-upload-area">' +
            '<input type="file" accept="image/*" multiple id="review-image-input" style="display:none;" onchange="App.handleReviewImageUpload(event, \'' + lessonId + '\')">' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById(\'review-image-input\').click()">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg> ' + t('bilderHochladen') + '</button>' +
          '</div></div>';
        html += '<div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);">' +
          '<button class="btn btn-secondary flex-1" onclick="App.editLesson(\'' + lessonId + '\', \'' + studentId + '\')">' + t('bearbeiten') + '</button>' +
          '<button class="btn btn-danger flex-1" onclick="App.deleteLesson(\'' + lessonId + '\', \'' + studentId + '\')">' + t('loeschen') + '</button></div>';
      }
      content.innerHTML = html;
      if (lesson.route && lesson.route.points && lesson.route.points.length > 0) {
        App.initReviewMap(lesson.route);
      }
      // Delegated click handler for marker items → Street View
      var markerList = document.querySelector('.route-markers-list');
      if (markerList) {
        markerList.addEventListener('click', function(e) {
          var item = e.target.closest('.route-marker-item');
          if (!item) return;
          var lat = parseFloat(item.getAttribute('data-sv-lat'));
          var lng = parseFloat(item.getAttribute('data-sv-lng'));
          var note = item.getAttribute('data-sv-note') || '';
          // Decode HTML entities
          var tmp = document.createElement('textarea');
          tmp.innerHTML = note;
          note = tmp.value;
          if (!isNaN(lat) && !isNaN(lng)) {
            App.openStreetView(lat, lng, note);
          }
        });
      }
      // Auto-translate notes and marker notes if language is not German
      if (AppState.language !== 'de') {
        if (lesson.notes) App.translateLessonNotes();
        // Also translate marker notes
        document.querySelectorAll('.route-marker-note').forEach(async function(el) {
          var origNote = el.textContent.trim();
          if (origNote) {
            var translated = await TranslateHelper.translate(origNote, AppState.language);
            el.textContent = translated;
          }
        });
      }
    } catch (err) { content.innerHTML = '<p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p>'; }
  },

  // ── Notes translation in lesson review ──
  translateLessonNotes: async function() {
    var notesEl = document.getElementById('lesson-notes-text');
    var btn = document.getElementById('translate-notes-btn');
    if (!notesEl || !btn) return;
    var originalText = notesEl.getAttribute('data-original');
    var isShowingTranslation = notesEl.getAttribute('data-translated') === 'true';
    if (isShowingTranslation) {
      // Show original
      notesEl.textContent = originalText;
      notesEl.setAttribute('data-translated', 'false');
      btn.innerHTML = '\ud83c\udf10 ' + t('notizenUebersetzen');
      return;
    }
    // Translate
    btn.innerHTML = '\u23f3 ' + t('wirdUebersetzt');
    btn.disabled = true;
    try {
      var translated = await TranslateHelper.translate(originalText, AppState.language);
      notesEl.textContent = translated;
      notesEl.setAttribute('data-translated', 'true');
      btn.innerHTML = '\ud83d\udcdd ' + t('originalAnzeigen');
    } catch (e) {
      btn.innerHTML = '\ud83c\udf10 ' + t('notizenUebersetzen');
    }
    btn.disabled = false;
  },

  // ── Support / Feedback (via EmailJS) ──
  // !! SETUP: Replace these with your EmailJS credentials !!
  _emailJS: {
    publicKey: 'XVI-YK-nP_eo46C9K',
    serviceId: 'service_v7yu09p',
    templateId: 'template_vv25pxj'
  },

  sendFeedback: async function() {
    var msgEl = document.getElementById('feedback-message');
    var catEl = document.getElementById('feedback-category');
    if (!msgEl || !msgEl.value.trim()) {
      this.showToast(t('feedbackFehler'));
      return;
    }
    // Gather info
    var user = AppState.currentUser || {};
    var category = catEl ? catEl.value : 'sonstiges';
    var catLabels = { bug: 'Fehler melden', verbesserung: 'Verbesserung', frage: 'Frage', sonstiges: 'Sonstiges' };
    var templateParams = {
      subject: 'FahrDoc Support',
      from_name: user.name || user.admin_name || 'Unbekannt',
      from_email: user.email || '',
      from_role: user.role === 'school' ? 'Fahrschule (Admin)' : 'Fahrlehrer',
      category: catLabels[category] || category,
      message: msgEl.value.trim()
    };
    try {
      this.showLoading(true);
      if (typeof emailjs !== 'undefined' && this._emailJS.publicKey !== 'DEIN_PUBLIC_KEY') {
        await emailjs.send(this._emailJS.serviceId, this._emailJS.templateId, templateParams, { publicKey: this._emailJS.publicKey });
      } else {
        // Fallback: save to server if EmailJS not configured
        await ApiClient.post('/api/feedback', { category: category, message: msgEl.value.trim() });
      }
      msgEl.value = '';
      this.showToast(t('feedbackGesendet'));
    } catch (err) {
      this.showToast(t('fehler') + ': ' + (err.text || err.message || 'E-Mail konnte nicht gesendet werden'));
    } finally {
      this.showLoading(false);
    }
  },

  openImageModal: function(src) {
    this.openModal(t('bild'), '<div style="text-align:center;"><img src="' + src + '" style="max-width:100%;max-height:70vh;border-radius:var(--radius-md);"></div>');
  },

  editLesson: async function(lessonId, studentId) {
    try {
      var lesson = await ApiClient.get('/api/lesson/' + lessonId);
      AppState._editRatings = Object.assign({}, lesson.ratings);
      var html = '<form id="edit-lesson-form" onsubmit="App.saveEditedLesson(event, \'' + lessonId + '\', \'' + studentId + '\')">' +
        '<div class="form-group mb-4"><label class="form-label">' + t('fahrstundentyp') + '</label><select class="form-select" id="edit-lesson-type">' +
          '<option value="Übungsfahrt"' + (lesson.type === 'Übungsfahrt' ? ' selected' : '') + '>' + tType('Übungsfahrt') + '</option>' +
          '<option value="Überlandfahrt"' + (lesson.type === 'Überlandfahrt' ? ' selected' : '') + '>' + tType('Überlandfahrt') + '</option>' +
          '<option value="Autobahnfahrt"' + (lesson.type === 'Autobahnfahrt' ? ' selected' : '') + '>' + tType('Autobahnfahrt') + '</option>' +
          '<option value="Nachtfahrt"' + (lesson.type === 'Nachtfahrt' ? ' selected' : '') + '>' + tType('Nachtfahrt') + '</option>' +
          '<option value="Prüfungsvorbereitung"' + (lesson.type === 'Prüfungsvorbereitung' ? ' selected' : '') + '>' + tType('Prüfungsvorbereitung') + '</option>' +
        '</select></div>' +
        '<div class="form-group mb-4"><label class="form-label">' + t('notizen') + '</label>' +
          '<textarea class="form-textarea" id="edit-lesson-notes">' + (lesson.notes || '') + '</textarea></div>';
      html += '<div class="section-title mb-3">' + t('bewertung') + '</div>';
      SKILL_TASKS.forEach(function(task) {
        var current = lesson.ratings[task] || 2;
        html += '<div style="margin-bottom:var(--space-3);"><div class="text-xs font-medium mb-1">' + task + '</div><div class="level-selector" data-task="' + task + '">';
        SKILL_LEVELS.forEach(function(sl) {
          var isActive = sl.level === current ? ' active' : '';
          html += '<button type="button" class="level-selector-btn' + isActive + '" data-level="' + sl.level + '" onclick="App.setEditSkillRating(this, \'' + task + '\', ' + sl.level + ')">' + tLevel(sl.name) + '</button>';
        });
        html += '</div></div>';
      });
      // Image upload section in edit
      html += '<div class="form-group mb-4"><label class="form-label">' + t('bilder') + '</label>' +
        '<div class="image-upload-area">' +
          '<input type="file" accept="image/*" multiple id="edit-image-input" style="display:none;" onchange="App.handleEditImageUpload(event)">' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById(\'edit-image-input\').click()">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg> ' + t('bilderHinzufuegen') + '</button>' +
          '<div id="edit-image-preview-list" class="image-preview-list"></div>' +
        '</div></div>';
      html += '<button type="submit" class="btn btn-primary btn-full btn-lg mt-4">' + t('speichern') + '</button></form>';
      AppState._editExistingImages = (lesson.images || []).slice();
      AppState._editPendingImages = [];
      this.openModal(t('fahrstundeBearbeiten'), html);
      // Render existing images after modal opens
      setTimeout(function() { App.renderEditPendingImages(); }, 50);
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  setEditSkillRating: function(btn, task, level) {
    AppState._editRatings[task] = level;
    var container = btn.parentElement;
    container.querySelectorAll('.level-selector-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  },

  saveEditedLesson: async function(e, lessonId, studentId) {
    e.preventDefault();
    try {
      var editImages = (AppState._editExistingImages || []).concat(AppState._editPendingImages || []);
      await ApiClient.put('/api/lessons/' + lessonId, {
        type: document.getElementById('edit-lesson-type').value,
        notes: document.getElementById('edit-lesson-notes').value,
        ratings: AppState._editRatings,
        images: editImages
      });
      this.closeModalForce(); AppState._cachedData.instructorDash = null;
      this.showToast(t('fahrstundeAktualisiert'));
      this.showLessonReview(lessonId, studentId, 'instructor');
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  deleteLesson: async function(lessonId, studentId) {
    if (!confirm(t('wirklichLoeschen'))) return;
    try {
      await ApiClient.del('/api/lessons/' + lessonId);
      AppState._cachedData.instructorDash = null;
      this.showToast(t('fahrstundeGeloescht'));
      this.navigate('instructor-dashboard'); this.switchInstructorTab('lessons');
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  // ══════════════════════════════════════════
  //  STUDENT DASHBOARD
  // ══════════════════════════════════════════
  initStudentDashboard: async function() {
    var stu = AppState.currentUser;
    document.getElementById('student-name-display').textContent = stu.name;
    try {
      var data = await ApiClient.get('/api/student/overview');
      AppState._cachedData.studentOverview = data;
      var banner = document.getElementById('student-expired-banner');
      if (data.isExpired) banner.classList.remove('hidden');
      else banner.classList.add('hidden');
    } catch (e) {}
    this.switchStudentTab('overview');
  },

  switchStudentTab: function(tab, btn) {
    if (btn) {
      document.querySelectorAll('#student-nav .bottom-nav-item').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    } else {
      document.querySelectorAll('#student-nav .bottom-nav-item').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
      });
    }
    if (tab === 'overview') this.renderStudentOverview();
    else if (tab === 'termine') this.renderStudentTermineTab();
    else if (tab === 'lessons') this.renderStudentLessonsTab();
    else if (tab === 'profile') this.renderStudentProfileTab();
  },

  renderStudentOverview: async function() {
    var stu = AppState.currentUser;
    var main = document.getElementById('student-main');
    var data = AppState._cachedData.studentOverview;
    if (!data) {
      main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
      try { data = await ApiClient.get('/api/student/overview'); AppState._cachedData.studentOverview = data; } catch (e) { main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + '</p></div>'; return; }
    }
    var lessons = data.lessons || [];
    var latestRatings = lessons.length > 0 ? lessons[0].ratings : {};
    var avg = this.avgRating(latestRatings);
    var pctReady = Math.min(100, (avg / 4) * 100);
    var html = '<div class="page-padding"><div class="welcome-msg"><h2>' + t('hallo') + ', ' + stu.name + '</h2><p>' + t('fortschrittPruefungsreife') + '</p></div>' +
      '<div class="card mb-4" style="text-align:center;padding:var(--space-6);">' +
        '<div class="progress-ring-container" style="margin:0 auto var(--space-4);">' + this.buildProgressRing(avg, 4, 120) + '</div>' +
        '<div style="font-family:var(--font-display);font-weight:700;font-size:var(--text-lg);margin-bottom:var(--space-1);">' + Math.round(pctReady) + '% ' + t('pruefungsreif') + '</div>' +
        '<div>' + this.skillLevelHtml(avg) + '</div></div>';
    html += '<div class="card mb-4"><div class="section-title mb-3">' + t('deineSkills') + '</div>';
    SKILL_TASKS.forEach(function(task) {
      var val = latestRatings[task] || 0; var pct = (val / 4) * 100; var info = getSkillLevel(val);
      html += '<div class="skill-bar"><div class="skill-bar-header"><span>' + tSkill(task) + '</span><span class="badge ' + info.badgeClass + '" style="font-size:10px;">' + tLevel(info.name) + '</span></div>' +
        '<div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + pct + '%;background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></div></div></div>';
    });
    html += '</div>';
    if (avg >= 3.0) html += this.buildExamChecklist();
    var totalDuration = 0;
    lessons.forEach(function(l) { totalDuration += l.duration; });
    html += '<div class="stat-grid mb-4">' +
      '<div class="stat-card"><div class="stat-card-label">' + t('fahrstunden') + '</div><div class="stat-card-value">' + lessons.length + '</div></div>' +
      '<div class="stat-card"><div class="stat-card-label">' + t('fahrlehrer') + '</div><div class="stat-card-value">' + (data.instructorName ? data.instructorName.split(',')[0].trim().split(' ')[0] : '—') + '</div></div>' +
    '</div>';
    // Theory progress section
    html += '<div class="card mb-4"><div class="section-title mb-3">' + t('theorieFortschritt') + '</div>' +
      '<div id="student-theory-progress"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div></div>';
    html += '</div>';
    main.innerHTML = html;
    // Load theory progress async
    this.renderStudentTheoryProgress(stu.id);
  },

  renderStudentTheoryProgress: async function(studentId) {
    var container = document.getElementById('student-theory-progress');
    if (!container) return;
    try {
      var progress = await ApiClient.get('/api/theory/progress/' + studentId);
      if (!progress || !Array.isArray(progress)) { container.innerHTML = '<p class="text-sm text-muted">' + t('keineTheorieDaten') + '</p>'; return; }
      var attended = progress.filter(function(p) { return p.attended; });
      var html = '<div class="theory-progress-grid">';
      progress.forEach(function(p) {
        var cls = p.attended ? ' attended' : '';
        html += '<div class="theory-progress-box' + cls + '" title="' + (p.title || '') + '">' +
          '<div class="theory-progress-num">' + p.topic_number + '</div></div>';
      });
      html += '</div>';
      html += '<div class="theory-progress-summary">' + attended.length + ' ' + t('von') + ' 14 ' + t('themenAbsolviert') + '</div>';
      container.innerHTML = html;
    } catch (err) { container.innerHTML = '<p class="text-sm text-muted">' + t('fehler') + '</p>'; }
  },

  buildExamChecklist: function() {
    var items = [
      { id: 'check-ausweis', text: 'Personalausweis / Reisepass mitnehmen' },
      { id: 'check-sehtest', text: 'Sehtest-Bescheinigung vorlegen' },
      { id: 'check-erstehilfe', text: 'Erste-Hilfe-Kurs Nachweis' },
      { id: 'check-passfoto', text: 'Biometrisches Passfoto abgeben' },
      { id: 'check-theorie', text: 'Theorieprüfung bestanden' },
      { id: 'check-anmeldung', text: 'Anmeldung zur praktischen Prüfung' }
    ];
    var html = '<div class="checklist-card"><div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3);">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" style="width:20px;height:20px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>' +
      '<span class="section-title" style="color:var(--color-success);">' + t('pruefungsCheckliste') + '</span></div>' +
      '<p class="text-xs text-muted mb-3">' + t('fastPruefungsreif') + '</p>';
    items.forEach(function(item) {
      html += '<div class="checklist-item" id="' + item.id + '" onclick="App.toggleChecklist(this)">' +
        '<div class="check-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20,6 9,17 4,12"/></svg></div>' +
        '<span class="checklist-text">' + item.text + '</span></div>';
    });
    html += '</div>'; return html;
  },

  toggleChecklist: function(el) { el.classList.toggle('checked'); },

  // ══════════════════════════════════════════
  //  STUDENT: Termine Tab (Offene Angebote + Fahrstunden)
  // ══════════════════════════════════════════
  _studentTermineSubTab: 'angebote',

  renderStudentTermineTab: async function() {
    var main = document.getElementById('student-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    var self = this;
    var sub = this._studentTermineSubTab || 'angebote';
    var html = '<div class="page-padding">';
    // Sub-tabs
    html += '<div class="student-fahrstunden-tabs">' +
      '<button class="student-fahrstunden-tab' + (sub === 'angebote' ? ' active' : '') + '" onclick="App._studentTermineSubTab=\'angebote\';App.renderStudentTermineTab()">' + t('offeneAngebote') + '</button>' +
      '<button class="student-fahrstunden-tab' + (sub === 'naechste' ? ' active' : '') + '" onclick="App._studentTermineSubTab=\'naechste\';App.renderStudentTermineTab()">' + t('naechsteFahrstunden') + '</button>' +
      '<button class="student-fahrstunden-tab' + (sub === 'absolviert' ? ' active' : '') + '" onclick="App._studentTermineSubTab=\'absolviert\';App.renderStudentTermineTab()">' + t('absolvierteFahrstunden') + '</button>' +
    '</div>';

    if (sub === 'angebote') {
      try {
        var offers = await ApiClient.get('/api/slot-offers/student');
        if (!offers || offers.length === 0) {
          html += '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
            '<div class="empty-state-title">' + t('keineOffenenAngebote') + '</div></div>';
        } else {
          offers.forEach(function(offer) {
            var isExpired = offer.expires_at && new Date(offer.expires_at) < new Date();
            html += '<div class="offer-card' + (isExpired ? ' expired' : '') + '">';
            html += '<div class="offer-card-header">';
            html += '<div class="offer-card-instructor">' + (offer.instructor_name || '') + '</div>';
            if (offer.expires_at) {
              var expDate = new Date(offer.expires_at);
              var expStr = expDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) + ' ' + expDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
              html += '<div class="offer-card-expires">' + (isExpired ? t('abgelaufen') : t('ablaufzeit') + ': ' + expStr) + '</div>';
            }
            html += '</div>';
            html += '<div class="offer-card-slots">';
            (offer.slots || []).forEach(function(slot) {
              var d = new Date(slot.date);
              var dayStr2 = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
              var statusCls = slot.booked_by ? 'booked' : (isExpired ? 'expired' : 'available');
              var statusText = slot.booked_by ? (t('gebuchtVon') + ' ' + (slot.booked_by_name || '?')) : (isExpired ? t('abgelaufen') : t('slotFrei'));
              html += '<div class="offer-slot-row">';
              html += '<div class="offer-slot-time">' + dayStr2 + ' · ' + slot.start_time + '–' + slot.end_time + '</div>';
              html += '<div style="display:flex;align-items:center;gap:var(--space-2);">';
              html += '<span class="offer-slot-status ' + statusCls + '">' + statusText + '</span>';
              if (!slot.booked_by && !isExpired) {
                html += '<button class="btn btn-sm btn-primary" onclick="App.bookSlotOffer(\'' + slot.id + '\')">' + t('buchungBestaetigen') + '</button>';
              }
              html += '</div></div>';
            });
            html += '</div></div>';
          });
        }
      } catch (err) {
        html += '<p class="text-sm text-muted">' + t('fehler') + ': ' + (err.message || err) + '</p>';
      }
    } else if (sub === 'naechste') {
      // Upcoming booked lessons
      try {
        var data = AppState._cachedData.studentOverview;
        if (!data) { data = await ApiClient.get('/api/student/overview'); AppState._cachedData.studentOverview = data; }
        var lessons = (data.lessons || []);
        var today = formatDateLocal(new Date());
        var upcoming = lessons.filter(function(l) { return l.date >= today; }).sort(function(a, b) { return a.date < b.date ? -1 : 1; });
        if (upcoming.length === 0) {
          html += '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' +
            '<div class="empty-state-title">' + t('keineFahrstunden') + '</div></div>';
        } else {
          upcoming.forEach(function(l) {
            var d = new Date(l.date);
            var dayStr2 = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
            html += '<div class="lesson-card">' +
              '<div class="lesson-card-info">' +
                '<div class="lesson-card-date">' + dayStr2 + ' · ' + (l.start_time || '') + '</div>' +
                '<div class="lesson-card-detail">' + tType(l.type) + (l.instructor_name ? ' · ' + l.instructor_name : '') + '</div>' +
              '</div>' +
            '</div>';
          });
        }
      } catch (err) {
        html += '<p class="text-sm text-muted">' + t('fehler') + '</p>';
      }
    } else if (sub === 'absolviert') {
      // Past completed lessons
      try {
        var data = AppState._cachedData.studentOverview;
        if (!data) { data = await ApiClient.get('/api/student/overview'); AppState._cachedData.studentOverview = data; }
        var lessons = (data.lessons || []);
        var today = formatDateLocal(new Date());
        var past = lessons.filter(function(l) { return l.date < today; }).sort(function(a, b) { return a.date > b.date ? -1 : 1; });
        if (past.length === 0) {
          html += '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' +
            '<div class="empty-state-title">' + t('nochKeineFahrstunden') + '</div></div>';
        } else {
          past.forEach(function(l) {
            var d = new Date(l.date);
            var dayStr2 = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
            html += '<div class="lesson-card" onclick="App.showLessonReview(\'' + l.id + '\', \'' + AppState.currentUser.id + '\', \'student\')">' +
              '<div class="lesson-card-info">' +
                '<div class="lesson-card-date">' + dayStr2 + ' · ' + (l.start_time || '') + '</div>' +
                '<div class="lesson-card-detail">' + tType(l.type) + ' · ' + self.formatDuration(l.duration) + (l.instructor_name ? ' · ' + l.instructor_name : '') + '</div>' +
              '</div>' +
              '<div class="lesson-card-action">' + self.skillLevelHtml(self.avgRating(l.ratings)) + '</div>' +
            '</div>';
          });
        }
      } catch (err) {
        html += '<p class="text-sm text-muted">' + t('fehler') + '</p>';
      }
    }
    html += '</div>';
    main.innerHTML = html;
  },

  bookSlotOffer: async function(slotId) {
    try {
      await ApiClient.post('/api/slot-offers/book/' + slotId);
      this.showToast(t('buchungErfolgreich'));
      this.renderStudentTermineTab();
    } catch (err) {
      this.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  cancelBookedSlot: async function(slotId) {
    try {
      await ApiClient.post('/api/slot-offers/cancel/' + slotId);
      this.showToast(t('absageErfolgreich'));
      this.renderStudentTermineTab();
    } catch (err) {
      if (err.message && err.message.indexOf('Absagefrist') !== -1) {
        this.showToast(t('absageFristAbgelaufen'));
      } else {
        this.showToast(t('fehler') + ': ' + (err.message || err));
      }
    }
  },

  renderStudentLessonsTab: async function() {
    var stu = AppState.currentUser;
    var main = document.getElementById('student-main');
    var data = AppState._cachedData.studentOverview;
    if (!data) { try { data = await ApiClient.get('/api/student/overview'); AppState._cachedData.studentOverview = data; } catch(e) { return; } }
    var lessons = data.lessons || [];
    var html = '<div class="page-padding"><div class="section-header"><span class="section-title">' + t('meineFahrstunden') + ' (' + lessons.length + ')</span></div>';
    if (lessons.length === 0) {
      html += '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' +
        '<div class="empty-state-title">' + t('nochKeineFahrstunden') + '</div><div class="empty-state-text">' + t('fahrstundenHierAngezeigt') + '</div></div>';
    } else {
      html += '<div class="activity-list">';
      lessons.forEach(function(l) {
        var instructorInfo = l.instructor_name ? ' · ' + l.instructor_name : '';
        html += '<div class="list-item" onclick="App.showLessonReview(\'' + l.id + '\', \'' + stu.id + '\', \'student\')"><div class="list-item-content">' +
          '<div class="list-item-title">' + l.type + '</div>' +
          '<div class="list-item-subtitle">' + App.formatDate(l.date) + ' · ' + App.formatDuration(l.duration) + instructorInfo + '</div></div>' +
          '<div class="list-item-right">' + App.skillLevelHtml(App.avgRating(l.ratings)) + '</div></div>';
      });
      html += '</div>';
    }
    html += '</div>'; main.innerHTML = html;
  },

  renderStudentProfileTab: async function() {
    var u = AppState.currentUser;
    var main = document.getElementById('student-main');
    var data = AppState._cachedData.studentOverview;
    if (!data) { try { data = await ApiClient.get('/api/student/overview'); AppState._cachedData.studentOverview = data; } catch(e) { return; } }
    var html = '<div class="page-padding"><div class="profile-header">' + this.avatarHtml(u.name, 'lg') +
      '<h3>' + u.name + '</h3><p class="text-xs text-muted">' + t('fahrschueler') + ' · ' + t('klasse') + ' ' + u.license_class + '</p></div>' +
      '<div class="card mb-4"><div class="section-title mb-3">' + t('persoenlicheDaten') + '</div>' +
        '<form id="student-profile-form" onsubmit="App.saveStudentProfile(event)">' +
          '<div class="form-group mb-3"><label class="form-label">' + t('email') + '</label><input class="form-input" type="email" id="profile-email" value="' + u.email + '"></div>' +
          '<div class="form-group mb-3"><label class="form-label">' + t('telefon') + '</label><input class="form-input" type="tel" id="profile-phone" value="' + (u.phone || '') + '"></div>' +
          '<div class="form-group mb-3"><label class="form-label">' + t('geburtsdatum') + '</label><input class="form-input" type="date" id="profile-birthdate" value="' + (u.birthdate || '') + '"></div>' +
          '<div class="form-group mb-3"><label class="form-label">' + t('adresse') + '</label><input class="form-input" type="text" id="profile-address" value="' + (u.address || '') + '"></div>' +
          '<button type="submit" class="btn btn-primary btn-full">' + t('aenderungenSpeichern') + '</button></form></div>' +
      '<div class="card mb-4"><div class="section-title mb-3">' + t('zuordnung') + '</div>' +
        '<div class="profile-row"><span class="profile-row-label">' + t('fahrschule') + '</span><span class="profile-row-value">' + (data.school ? data.school.name : '—') + '</span></div>' +
        '<div class="profile-row"><span class="profile-row-label">' + t('fahrlehrer') + '</span><span class="profile-row-value">' + (data.instructorName || '—') + '</span></div>' +
        '<div class="profile-row"><span class="profile-row-label">' + t('fuehrerscheinklasse') + '</span><span class="profile-row-value">' + u.license_class + '</span></div></div>' +
      this.changePasswordHtml() +
      '<button class="btn btn-secondary btn-full" style="margin-top:20px" onclick="App.logout()">Abmelden</button></div>';
    main.innerHTML = html;
  },

  saveStudentProfile: async function(e) {
    e.preventDefault();
    try {
      await ApiClient.put('/api/student/profile', {
        email: document.getElementById('profile-email').value.trim(),
        phone: document.getElementById('profile-phone').value.trim(),
        birthdate: document.getElementById('profile-birthdate').value,
        address: document.getElementById('profile-address').value.trim()
      });
      AppState.currentUser.email = document.getElementById('profile-email').value.trim();
      AppState.currentUser.phone = document.getElementById('profile-phone').value.trim();
      AppState._cachedData.studentOverview = null;
      this.showToast(t('profilAktualisiert'));
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  // ──── RETROACTIVE IMAGE UPLOAD (from lesson review) ────
  handleReviewImageUpload: function(event, lessonId) {
    var files = event.target.files;
    if (!files || files.length === 0) return;
    var images = [];
    var loaded = 0;
    var total = files.length;
    for (var i = 0; i < total; i++) {
      (function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          images.push({ filename: file.name, data: e.target.result });
          loaded++;
          if (loaded === total) {
            App.uploadImagesToLesson(lessonId, images);
          }
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
    event.target.value = '';
  },

  uploadImagesToLesson: async function(lessonId, newImages) {
    try {
      this.showLoading(true);
      this.showToast(t('bilderWerdenHochgeladen'));
      // Get existing lesson to merge images
      var lesson = await ApiClient.get('/api/lesson/' + lessonId);
      var existingImages = lesson.images || [];
      var allImages = existingImages.concat(newImages);
      await ApiClient.put('/api/lessons/' + lessonId, {
        type: lesson.type,
        notes: lesson.notes,
        ratings: lesson.ratings,
        images: allImages
      });
      this.showToast(t('bilderHochgeladen'));
      AppState._cachedData.instructorDash = null;
      // Refresh the lesson review
      this.showLessonReview(lessonId, lesson.student_id || lesson.studentId, 'instructor');
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  // ──── IMAGE UPLOAD IN EDIT MODAL ────
  handleEditImageUpload: function(event) {
    var files = event.target.files;
    for (var i = 0; i < files.length; i++) {
      (function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
          AppState._editPendingImages.push({ filename: file.name, data: e.target.result });
          App.renderEditPendingImages();
        };
        reader.readAsDataURL(file);
      })(files[i]);
    }
    event.target.value = '';
  },

  renderEditPendingImages: function() {
    var container = document.getElementById('edit-image-preview-list');
    if (!container) return;
    var allImgs = (AppState._editExistingImages || []).concat(AppState._editPendingImages || []);
    if (allImgs.length === 0) { container.innerHTML = ''; return; }
    var html = '';
    allImgs.forEach(function(img, idx) {
      html += '<div class="image-preview-item">' +
        '<img src="' + img.data + '" alt="' + (img.filename || '') + '">' +
        '<button class="image-preview-remove" onclick="App.removeEditImage(' + idx + ')">&times;</button></div>';
    });
    container.innerHTML = html;
  },

  removeEditImage: function(idx) {
    var existingCount = (AppState._editExistingImages || []).length;
    if (idx < existingCount) {
      AppState._editExistingImages.splice(idx, 1);
    } else {
      AppState._editPendingImages.splice(idx - existingCount, 1);
    }
    this.renderEditPendingImages();
  },

  // ══════════════════════════════════════════
  //  ROUTE TRACKING (Google Maps + GPS)
  // ══════════════════════════════════════════

  initRouteMap: function() {
    if (typeof google === 'undefined' || !google.maps) return;
    var mapEl = document.getElementById('lesson-map');
    if (!mapEl) return;
    // Berlin default center
    var center = { lat: 52.52, lng: 13.405 };
    AppState.map = new google.maps.Map(mapEl, {
      center: center, zoom: 15,
      disableDefaultUI: true, zoomControl: true,
      mapTypeControl: false, streetViewControl: false,
      styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
    });
    AppState.mapPolyline = new google.maps.Polyline({
      path: [], strokeColor: '#2A9D8F', strokeOpacity: 1.0,
      strokeWeight: 4, map: AppState.map
    });
    // Current position marker (pulsing blue dot)
    AppState.mapCurrentPos = new google.maps.Marker({
      map: AppState.map,
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6, fillColor: '#4285F4', fillOpacity: 1,
        strokeColor: '#ffffff', strokeWeight: 2,
        rotation: 0
      }
    });
  },

  startGPS: function() {
    if (!navigator.geolocation) return;
    AppState.routePoints = [];
    AppState.routeMarkers = [];
    AppState.mapMarkerObjects = [];
    AppState.totalDistance = 0;
    AppState.lastGpsPosition = null;
    AppState.bestEffortPosition = null;
    AppState.kalmanLat = null;
    AppState.kalmanLng = null;
    AppState.kalmanVariance = null;

    var gpsStatusEl = document.getElementById('gps-status');
    var gpsTextEl = document.getElementById('gps-status-text');
    if (gpsTextEl) gpsTextEl.textContent = t('gpsWirdGesucht');

    AppState.gpsWatchId = navigator.geolocation.watchPosition(
      function(pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        var accuracy = pos.coords.accuracy;
        var speed = pos.coords.speed; // m/s

        // Always store best-effort position for marker placement
        // (even if accuracy is low, it's better than map center)
        if (!AppState.bestEffortPosition || accuracy < (AppState.bestEffortPosition.accuracy || 9999)) {
          AppState.bestEffortPosition = { lat: lat, lng: lng, accuracy: accuracy };
        }

        // Filter out very inaccurate positions for route drawing
        if (accuracy > 100) return;

        // Kalman filter for smoothing
        if (AppState.kalmanLat === null) {
          AppState.kalmanLat = lat;
          AppState.kalmanLng = lng;
          AppState.kalmanVariance = accuracy * accuracy;
        } else {
          var variance = AppState.kalmanVariance + 3; // process noise
          var kalmanGain = variance / (variance + accuracy * accuracy);
          AppState.kalmanLat = AppState.kalmanLat + kalmanGain * (lat - AppState.kalmanLat);
          AppState.kalmanLng = AppState.kalmanLng + kalmanGain * (lng - AppState.kalmanLng);
          AppState.kalmanVariance = (1 - kalmanGain) * variance;
        }

        var smoothLat = AppState.kalmanLat;
        var smoothLng = AppState.kalmanLng;

        // Check minimum distance (3m threshold)
        if (AppState.lastGpsPosition) {
          var dist = App.haversineDistance(
            AppState.lastGpsPosition.lat, AppState.lastGpsPosition.lng,
            smoothLat, smoothLng
          );
          // Filter unrealistic speed jumps (> 200 km/h)
          if (AppState.routePoints.length > 0) {
            var lastPt = AppState.routePoints[AppState.routePoints.length - 1];
            var timeDiff = (Date.now() - lastPt.timestamp) / 1000; // seconds
            if (timeDiff > 0) {
              var instantSpeed = (dist / timeDiff) * 3.6; // km/h
              if (instantSpeed > 200) return;
            }
          }
          if (dist < 3) return; // too close, skip
          AppState.totalDistance += dist;
        }

        AppState.lastGpsPosition = { lat: smoothLat, lng: smoothLng };
        var point = { lat: smoothLat, lng: smoothLng, timestamp: Date.now() };
        AppState.routePoints.push(point);

        // Update GPS status
        if (gpsStatusEl) gpsStatusEl.classList.add('active');
        if (gpsTextEl) gpsTextEl.textContent = t('gpsAktiv');

        // Update map
        if (AppState.map && AppState.mapPolyline) {
          var path = AppState.mapPolyline.getPath();
          path.push(new google.maps.LatLng(smoothLat, smoothLng));
          AppState.mapCurrentPos.setPosition({ lat: smoothLat, lng: smoothLng });
          AppState.map.panTo({ lat: smoothLat, lng: smoothLng });
          // Rotate map to driving direction
          var heading = pos.coords.heading;
          var spd = pos.coords.speed;
          if (heading != null && !isNaN(heading) && spd && spd > 0.8) {
            AppState.map.setHeading(heading);
            if (AppState.mapCurrentPos && AppState.mapCurrentPos.getIcon) {
              var icon = AppState.mapCurrentPos.getIcon();
              if (icon) { icon.rotation = heading; AppState.mapCurrentPos.setIcon(icon); }
            }
          }
        }

        // Update stats
        App.updateRouteStats(speed);
      },
      function(err) {
        if (gpsTextEl) gpsTextEl.textContent = t('gpsWirdGesucht');
        if (gpsStatusEl) gpsStatusEl.classList.remove('active');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  },

  stopGPS: function() {
    if (AppState.gpsWatchId !== null) {
      navigator.geolocation.clearWatch(AppState.gpsWatchId);
      AppState.gpsWatchId = null;
    }
  },

  haversineDistance: function(lat1, lng1, lat2, lng2) {
    var R = 6371000; // meters
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // meters
  },

  updateRouteStats: function(speedMs) {
    var distEl = document.getElementById('lesson-distance');
    var speedEl = document.getElementById('lesson-speed');
    var markerEl = document.getElementById('lesson-marker-count');
    if (distEl) distEl.textContent = (AppState.totalDistance / 1000).toFixed(1).replace('.', ',') + ' km';
    if (speedMs !== null && speedMs !== undefined && speedMs >= 0) {
      var kmh = Math.round(speedMs * 3.6);
      if (speedEl) speedEl.textContent = kmh + ' km/h';
    }
    if (markerEl) markerEl.textContent = AppState.routeMarkers.length;
  },

  addRouteMarker: function() {
    var self = this;
    var markerLat, markerLng;
    var usedGps = false;

    // 1) Try last known GPS position (set even for lower-accuracy readings)
    if (AppState.lastGpsPosition) {
      markerLat = AppState.lastGpsPosition.lat;
      markerLng = AppState.lastGpsPosition.lng;
      usedGps = true;
    } else if (AppState.bestEffortPosition) {
      // 2) Fallback: any GPS reading we received (even low accuracy)
      markerLat = AppState.bestEffortPosition.lat;
      markerLng = AppState.bestEffortPosition.lng;
      usedGps = true;
    } else if (AppState.map) {
      // 3) Fallback: map center
      var center = AppState.map.getCenter();
      markerLat = center.lat();
      markerLng = center.lng();
    } else {
      this.showToast(t('gpsWirdGesucht'));
      return;
    }

    // Show custom modal instead of prompt() (mobile-friendly)
    var html = '<div style="margin-bottom:var(--space-3);">' +
      '<label class="form-label">' + t('markierungNotiz') + '</label>' +
      '<textarea id="marker-note-input" class="form-input" rows="3" ' +
      'placeholder="' + t('markierungNotizPlaceholder') + '" ' +
      'style="width:100%;resize:vertical;"></textarea>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);">' +
      '<button class="btn btn-secondary flex-1" onclick="App.closeModalForce()">' + t('abbrechen') + '</button>' +
      '<button class="btn btn-primary flex-1" id="marker-note-save">📍 ' + t('markierungSpeichern') + '</button>' +
      '</div>';
    this.openModal(t('markierungSetzenTitle'), html);

    // Focus textarea after modal opens
    setTimeout(function() {
      var ta = document.getElementById('marker-note-input');
      if (ta) ta.focus();
    }, 100);

    // Save handler
    var saveBtn = document.getElementById('marker-note-save');
    if (saveBtn) {
      saveBtn.onclick = function() {
        var ta = document.getElementById('marker-note-input');
        var note = ta ? ta.value.trim() : '';
        self.closeModalForce();

        var now = new Date();
        var timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        var marker = {
          lat: markerLat,
          lng: markerLng,
          time: timeStr,
          note: note
        };
        AppState.routeMarkers.push(marker);

        // Add marker to map
        if (AppState.map) {
          var idx = AppState.routeMarkers.length;
          var mapMarker = new google.maps.Marker({
            position: { lat: marker.lat, lng: marker.lng },
            map: AppState.map,
            label: {
              text: String(idx), color: '#fff', fontWeight: 'bold', fontSize: '12px'
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14, fillColor: '#e74c3c', fillOpacity: 1,
              strokeColor: '#c0392b', strokeWeight: 2
            }
          });
          AppState.mapMarkerObjects.push(mapMarker);
        }

        self.updateRouteStats(null);
        self.showToast(usedGps ? t('markierungGesetzt') : t('markierungAufKartenmitte'));
      };
    }
  },

  cleanupRouteTracking: function() {
    this.stopGPS();
    AppState.routePoints = [];
    AppState.routeMarkers = [];
    AppState.mapMarkerObjects = [];
    AppState.totalDistance = 0;
    AppState.lastGpsPosition = null;
    AppState.bestEffortPosition = null;
    AppState.kalmanLat = null;
    AppState.kalmanLng = null;
    AppState.kalmanVariance = null;
    AppState.map = null;
    AppState.mapPolyline = null;
    AppState.mapCurrentPos = null;
  },

  // ──── REVIEW MAP ────
  initReviewMap: function(route) {
    if (typeof google === 'undefined' || !google.maps) return;
    var mapEl = document.getElementById('review-route-map');
    if (!mapEl) return;

    var map = new google.maps.Map(mapEl, {
      center: { lat: 52.52, lng: 13.405 }, zoom: 14,
      disableDefaultUI: true, zoomControl: true,
      mapTypeControl: false, streetViewControl: false
    });

    // Draw polyline
    var path = route.points.map(function(p) { return { lat: p.lat, lng: p.lng }; });
    new google.maps.Polyline({
      path: path, strokeColor: '#2A9D8F', strokeOpacity: 1.0,
      strokeWeight: 4, map: map
    });

    // Add numbered markers (clickable → Street View)
    route.markers.forEach(function(m, i) {
      var mapMarker = new google.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: map,
        label: { text: String(i + 1), color: '#fff', fontWeight: 'bold', fontSize: '12px' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14, fillColor: '#e74c3c', fillOpacity: 1,
          strokeColor: '#c0392b', strokeWeight: 2
        }
      });
      mapMarker.addListener('click', function() {
        App.openStreetView(m.lat, m.lng, m.note || '');
      });
    });

    // Fit bounds
    if (path.length > 0) {
      var bounds = new google.maps.LatLngBounds();
      path.forEach(function(p) { bounds.extend(p); });
      route.markers.forEach(function(m) { bounds.extend({ lat: m.lat, lng: m.lng }); });
      map.fitBounds(bounds);
    }
  },

  openStreetView: function(lat, lng, note) {
    var html = '<div id="streetview-pano" class="streetview-container"></div>';
    if (note) {
      html += '<div class="streetview-note"><div class="streetview-note-label">' + t('anmerkungFahrlehrer') + '</div>' + note + '</div>';
    }
    this.openModal(t('streetView'), html);
    setTimeout(function() {
      var panoEl = document.getElementById('streetview-pano');
      if (!panoEl || typeof google === 'undefined') return;
      var sv = new google.maps.StreetViewService();
      sv.getPanorama({ location: { lat: lat, lng: lng }, radius: 50 }, function(data, status) {
        if (status === 'OK') {
          new google.maps.StreetViewPanorama(panoEl, {
            position: data.location.latLng,
            pov: { heading: 0, pitch: 0 },
            disableDefaultUI: true, zoomControl: true
          });
        } else {
          panoEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);font-size:var(--text-sm);">' + t('streetViewNichtVerfuegbar') + '</div>';
        }
      });
    }, 100);
  },

  // ══════════════════════════════════════════
  //  RECURRING APPOINTMENTS
  // ══════════════════════════════════════════

  getDefaultRecurringEnd: function(date) {
    var d = new Date(date);
    d.setDate(d.getDate() + 84); // 12 weeks
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  },

  toggleRecurring: function() {
    var cb = document.getElementById('schedule-recurring');
    var opts = document.getElementById('recurring-options');
    if (!cb || !opts) return;
    if (cb.checked) {
      opts.classList.add('visible');
      this.checkRecurringConflicts();
    } else {
      opts.classList.remove('visible');
    }
  },

  checkRecurringConflicts: async function() {
    var conflictsDiv = document.getElementById('recurring-conflicts');
    if (!conflictsDiv) return;
    conflictsDiv.innerHTML = '<div style="color:var(--color-text-muted);font-size:var(--text-sm);">' + t('konfliktePruefen') + '</div>';

    var date = document.getElementById('schedule-date').value;
    var startTime = document.getElementById('schedule-start-time').value;
    var endTime = document.getElementById('schedule-end-time').value;
    var frequency = document.getElementById('recurring-frequency').value;
    var endDate = document.getElementById('recurring-end-date').value;
    if (!date || !startTime || !endTime || !endDate) return;

    var data = {
      date: date,
      startTime: startTime,
      endTime: endTime,
      frequency: frequency,
      end_date: endDate
    };
    var instSel = document.getElementById('schedule-instructor-select');
    if (instSel && instSel.value) data.instructorId = instSel.value;
    var vehicleSel = document.getElementById('schedule-vehicle');
    if (vehicleSel && vehicleSel.value) data.vehicleId = vehicleSel.value;
    var studentSel = document.getElementById('schedule-student');
    if (studentSel && studentSel.value) data.studentId = studentSel.value;

    try {
      var result = await ApiClient.post('/api/recurring-lessons/check-conflicts', data);
      var dates = result.dates || [];
      if (dates.length === 0) {
        conflictsDiv.innerHTML = '';
        return;
      }
      var hasConflicts = false;
      var html = '';
      for (var i = 0; i < dates.length; i++) {
        var item = dates[i];
        var dateObj = new Date(item.date);
        var dayStr = String(dateObj.getDate()).padStart(2, '0') + '.' +
          String(dateObj.getMonth() + 1).padStart(2, '0') + '.' + dateObj.getFullYear();
        if (item.ok) {
          html += '<div class="recurring-conflict-item">' +
            '<span class="recurring-conflict-ok">\u2713</span> ' + dayStr +
          '</div>';
        } else {
          hasConflicts = true;
          var reasons = [];
          for (var j = 0; j < item.conflicts.length; j++) {
            if (item.conflicts[j] === 'instructor') reasons.push(t('konfliktFahrlehrer'));
            if (item.conflicts[j] === 'vehicle') reasons.push(t('konfliktFahrzeug'));
          }
          html += '<div class="recurring-conflict-item">' +
            '<span class="recurring-conflict-bad">\u2717</span> ' + dayStr +
            ' — ' + reasons.join(', ') +
          '</div>';
        }
      }
      var header = hasConflicts ?
        '<div style="font-weight:600;margin-bottom:6px;color:#dc2626;">' + t('konflikteGefunden') + '</div>' :
        '<div style="font-weight:600;margin-bottom:6px;color:#16a34a;">' + t('keineKonflikte') + '</div>';
      conflictsDiv.innerHTML = header + html;
    } catch (err) {
      conflictsDiv.innerHTML = '<div style="color:#dc2626;">' + t('fehler') + ': ' + err.message + '</div>';
    }
  },

  showRecurringDeleteOptions: function(id) {
    var popup = document.createElement('div');
    popup.className = 'recurring-delete-popup';
    popup.id = 'recurring-delete-popup';
    popup.innerHTML = '<div class="recurring-delete-dialog">' +
      '<h4>' + t('wiederkehrenderTermin') + '</h4>' +
      '<button class="btn btn-danger" onclick="App.deleteRecurringLesson(\'' + id + '\', \'single\')">' + t('nurDiesenTermin') + '</button>' +
      '<button class="btn btn-danger" onclick="App.deleteRecurringLesson(\'' + id + '\', \'future\')">' + t('diesenUndFolgende') + '</button>' +
      '<button class="btn btn-secondary" onclick="document.getElementById(\'recurring-delete-popup\').remove()">' + t('abbrechen') + '</button>' +
    '</div>';
    popup.addEventListener('click', function(e) {
      if (e.target === popup) popup.remove();
    });
    document.body.appendChild(popup);
  },

  deleteRecurringLesson: async function(id, scope) {
    var popup = document.getElementById('recurring-delete-popup');
    if (popup) popup.remove();
    try {
      this.showLoading(true);
      await ApiClient.del('/api/recurring-lessons/' + id + '?scope=' + scope);
      this.closeModalForce();
      this.showToast(t('terminGeloescht'));
      AppState.scheduleData = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch (err) {
      this.showToast(t('fehler') + ': ' + err.message);
    } finally {
      this.showLoading(false);
    }
  }
};

// ============================================
// SERVICE WORKER REGISTRATION
// ============================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').then(function(reg) {
      console.log('[SW] Registered:', reg.scope);
      // Check for updates periodically
      setInterval(function() { reg.update(); }, 60 * 60 * 1000); // hourly
    }).catch(function(err) {
      console.log('[SW] Registration failed:', err);
    });
  });
}

// ============================================
// DSGVO CONSENT BANNER
// ============================================
var DsgvoConsent = {
  _storage: (function() { try { return window['local'+'Storage']; } catch(e) { return null; } })(),
  _get: function(k) { try { return this._storage && this._storage.getItem(k); } catch(e) { return null; } },
  _set: function(k,v) { try { this._storage && this._storage.setItem(k,v); } catch(e) {} },
  hasConsent: function() {
    return this._get('fahrdoc_dsgvo_consent') === 'accepted';
  },
  show: function() {
    if (this.hasConsent()) return;
    var banner = document.createElement('div');
    banner.id = 'dsgvo-banner';
    banner.innerHTML =
      '<div class="dsgvo-banner-inner">' +
        '<div class="dsgvo-text">' +
          '<strong>' + t('datenschutzTitle') + '</strong><br>' +
          t('datenschutzBannerText') + ' ' +
          '<a href="./datenschutz.html" target="_blank" style="color:var(--color-primary);text-decoration:underline;">' + t('datenschutzLink') + '</a>' +
        '</div>' +
        '<div class="dsgvo-actions">' +
          '<button class="btn btn-primary btn-sm" id="dsgvo-accept">' + t('akzeptieren') + '</button>' +
          '<button class="btn btn-secondary btn-sm" id="dsgvo-essentials">' + t('nurNotwendige') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    var self = this;
    document.getElementById('dsgvo-accept').onclick = function() {
      self._set('fahrdoc_dsgvo_consent', 'accepted');
      self._set('fahrdoc_dsgvo_level', 'all');
      banner.remove();
    };
    document.getElementById('dsgvo-essentials').onclick = function() {
      self._set('fahrdoc_dsgvo_consent', 'accepted');
      self._set('fahrdoc_dsgvo_level', 'essential');
      banner.remove();
    };
  }
};

// ============================================
// BOOT
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  App.init();
  DsgvoConsent.show();
});
