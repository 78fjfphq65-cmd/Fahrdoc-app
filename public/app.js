/* ============================================
   FahrDoc v7 — app.js (Multi-Instructor + Week Grid + Images + New Students Widget)
   ============================================ */

// ============================================
// API CLIENT
// ============================================
var API_BASE = '';

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
  patch: function(path, body) { return this.request('PATCH', path, body); },
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
// PFEP-konformes Bewertungssystem: 4-stufige Note wie Pruefer-Tablet
// 1 = Sehr gut (gruen, beste Note) ... 4 = Ungenuegend (rot, schlechteste Note)
var SKILL_LEVELS = [
  { level: 1, name: 'Sehr gut',    badgeClass: 'badge-success' },
  { level: 2, name: 'Gut',         badgeClass: 'badge-blue' },
  { level: 3, name: 'Ausreichend', badgeClass: 'badge-warning' },
  { level: 4, name: 'Ungenügend',  badgeClass: 'badge-error' }
];
var SKILL_COLORS = { 1: 'var(--color-success)', 2: 'var(--color-blue)', 3: 'var(--color-warning)', 4: 'var(--color-error)' };

// ── PFEP-konforme Bewertungs-Items (wie auf dem Pruefer-Tablet) ──
// Drei Gruppen: Beobachtungskategorien (immer 5), Grundfahraufgaben (klassen-abhaengig),
// Fahraufgaben im Strassenverkehr (immer 8).
var OBSERVATION_CATEGORIES = [
  'Verkehrsbeobachtung',
  'Fahrzeugpositionierung',
  'Geschwindigkeitsanpassung',
  'Kommunikation',
  'Fahrzeugbedienung/Umweltbewusste Fahrweise'
];
var GRUNDFAHRAUFGABEN_B = [
  'Abbremsen mit höchstmöglicher Verzögerung',
  'Rückwärtsfahren mit Abbiegen',
  'Umkehren',
  'Einparken längs',
  'Einparken quer'
];
var GRUNDFAHRAUFGABEN_A = [
  'Slalom mit Schrittgeschwindigkeit',
  'Abbremsen mit höchstmöglicher Verzögerung',
  'Ausweichen ohne Abbremsen',
  'Ausweichen nach Abbremsen',
  'Slalom',
  'Langer Slalom',
  'Fahren mit Schrittgeschwindigkeit geradeaus',
  'Stop and Go',
  'Kreisfahrt'
];
var FAHRAUFGABEN_VERKEHR = [
  'Kurven befahren',
  'Vorbeifahren / Überholen / Begegnen',
  'Abbiegen / Kreuzungen / Einmündungen',
  'Kreisverkehr',
  'Fahrstreifenwechsel',
  'Autobahn / Kraftfahrstraße',
  'Bahnübergang',
  'Haltestellen / Fußgängerüberwege'
];

// Erkennt Motorrad-Klassen (A, A1, A2, AM — auch in Listen wie 'B,A1')
function _isMotorradClass(licenseClass) {
  var cls = String(licenseClass || '').toUpperCase();
  return /(^|[^A-Z])A($|[^A-Z])|A1|A2|AM/.test(cls);
}

// Liefert die Bewertungs-Sektionen fuer eine Klasse als Liste mit Gruppen-Headern.
// Jede Gruppe: { group: 'Beobachtungskategorien'|..., items: [name1, name2, ...] }
function evaluationGroupsFor(licenseClass) {
  var grund = _isMotorradClass(licenseClass) ? GRUNDFAHRAUFGABEN_A : GRUNDFAHRAUFGABEN_B;
  return [
    { group: 'Beobachtungskategorien', items: OBSERVATION_CATEGORIES.slice() },
    { group: 'Fahraufgaben im Straßenverkehr', items: FAHRAUFGABEN_VERKEHR.slice() },
    { group: 'Grundfahraufgaben',       items: grund.slice() }
  ];
}

// Flache Liste aller Bewertungs-Items einer Klasse (in der gleichen Reihenfolge).
function skillTasksFor(licenseClass) {
  var out = [];
  evaluationGroupsFor(licenseClass).forEach(function(g) {
    g.items.forEach(function(it) { out.push(it); });
  });
  return out;
}

// Liefert die Gruppen-Bezeichnung fuer ein einzelnes Item (fuer historische Auswertung).
function _groupForItem(name) {
  if (OBSERVATION_CATEGORIES.indexOf(name) !== -1) return 'Beobachtungskategorien';
  if (GRUNDFAHRAUFGABEN_B.indexOf(name) !== -1 || GRUNDFAHRAUFGABEN_A.indexOf(name) !== -1) return 'Grundfahraufgaben';
  if (FAHRAUFGABEN_VERKEHR.indexOf(name) !== -1) return 'Fahraufgaben im Straßenverkehr';
  return 'Weitere';
}

// Fallback fuer alten Code, der noch SKILL_TASKS direkt liest
var SKILL_TASKS = OBSERVATION_CATEGORIES.slice();

// Liefert die Bewertungs-Gruppen fuer eine Klasse PLUS eine optionale
// 'Weitere'-Gruppe mit historischen Items, die in den aktuellen Konstanten
// nicht mehr auftauchen (damit alte Lessons nicht plötzlich Eintraege verlieren).
function evaluationGroupsWithLegacy(licenseClass, ratings) {
  // Historische Skill-Namen (z.B. 'autobahn', 'blick', 'gas_bremse' aus alten
  // App-Versionen) werden bewusst NICHT mehr als 'Weitere (historisch)'-Gruppe
  // angezeigt – sie verwirren den Lehrer und sind interne Codes ohne Bezug zum
  // aktuellen Bewertungs-Schema. Die Daten bleiben in der DB erhalten, werden
  // aber im UI ausgeblendet.
  return evaluationGroupsFor(licenseClass).map(function(g) {
    return { group: g.group, items: g.items.slice() };
  });
}

// HTML-Schnipsel fuer einen Gruppen-Header in einer Bewertungs-Sektion.
function _groupHeaderHtml(label) {
  return '<div style="font-weight:600;font-size:var(--text-sm);color:var(--text-muted);margin:var(--space-3) 0 var(--space-2);text-transform:uppercase;letter-spacing:.3px;">' +
    String(label).replace(/</g,'&lt;') + '</div>';
}

// Liefert visuelle Metadaten (Icon, CSS-Klasse) fuer eine Bewertungs-Gruppe.
function _pfepGroupMeta(label) {
  if (label === 'Beobachtungskategorien')        return { cls: 'obs',   icon: '\u{1F441}' };  // Auge
  if (label === 'Grundfahraufgaben')             return { cls: 'grund', icon: '\u{1F3AF}' };  // Zielscheibe
  if (label === 'Fahraufgaben im Stra\u00dfenverkehr') return { cls: 'verk',  icon: '\u{1F6E3}' };  // Strasse
  return { cls: 'obs', icon: '\u{1F4DD}' }; // Fallback (z.B. 'Weitere (historisch)')
}

// Slug-Helper fuer skill-namen (eindeutige IDs fuer pfep-items im DOM)
function _slugifyTask(name) {
  return String(name).toLowerCase()
    .replace(/\u00e4/g,'ae').replace(/\u00f6/g,'oe').replace(/\u00fc/g,'ue').replace(/\u00df/g,'ss')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function _escapeAttr(s) {
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Rendert das Notiz-UI fuer ein einzelnes Bewertungs-Item.
// mode: 'live' (renderLessonSummary) | 'edit' (editLesson Modal)
function _renderItemNoteHtml(task, currentNote, mode) {
  var prefix = mode === 'edit' ? 'edit-' : '';
  var handlerPrefix = mode === 'edit' ? 'Edit' : '';
  var has = !!(currentNote && String(currentNote).trim());
  var safeJsTask = String(task).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  var addBtn = '<button type="button" class="pfep-note-add" onclick="App.openItemNote' + handlerPrefix + '(\'' + safeJsTask + '\')">+ Notiz</button>';
  var bubble = '<div class="pfep-note-bubble" onclick="App.openItemNote' + handlerPrefix + '(\'' + safeJsTask + '\')">' + _escapeAttr(currentNote || '') + '</div>';
  return '<div class="pfep-note" id="' + prefix + 'note-' + _slugifyTask(task) + '">' +
    (has ? bubble : addBtn) +
    '</div>';
}

// Filtert ein ratings-Objekt: nur Items mit echtem Wert 1..4 werden behalten.
// DB-Constraint: skill_ratings.rating CHECK (1..4) — '0' / nicht bewertet darf NICHT persistiert werden.
function _filterValidRatings(ratings) {
  var out = {};
  if (!ratings || typeof ratings !== 'object') return out;
  Object.keys(ratings).forEach(function(k) {
    var v = ratings[k];
    if (typeof v === 'number' && v >= 1 && v <= 4) out[k] = v;
  });
  return out;
}

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
var GRID_END_HOUR = 24;
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
// HOLIDAYS — German public holidays (federal + Berlin)
// ============================================
// Easter Sunday calculation (Gauss algorithm)
function _easterSunday(year) {
  var a = year % 19;
  var b = Math.floor(year / 100);
  var c = year % 100;
  var d = Math.floor(b / 4);
  var e = b % 4;
  var f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3);
  var h = (19 * a + b - d - g + 15) % 30;
  var i = Math.floor(c / 4);
  var k = c % 4;
  var l = (32 + 2 * e + 2 * i - h - k) % 7;
  var m = Math.floor((a + 11 * h + 22 * l) / 451);
  var month = Math.floor((h + l - 7 * m + 114) / 31);
  var day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
function _addDays(date, n) { var d = new Date(date); d.setDate(d.getDate() + n); return d; }

// Returns object: { 'YYYY-MM-DD': 'Feiertagsname', ... } for given year
// Berlin public holidays (Bundesland Berlin)
function getHolidaysForYear(year) {
  var easter = _easterSunday(year);
  var holidays = {};
  function add(d, name) { holidays[formatDateLocal(d)] = name; }

  add(new Date(year, 0, 1), 'Neujahr');
  add(new Date(year, 2, 8), 'Internationaler Frauentag');
  add(_addDays(easter, -2), 'Karfreitag');
  add(_addDays(easter, 1), 'Ostermontag');
  add(new Date(year, 4, 1), 'Tag der Arbeit');
  add(_addDays(easter, 39), 'Christi Himmelfahrt');
  add(_addDays(easter, 50), 'Pfingstmontag');
  add(new Date(year, 9, 3), 'Tag der Deutschen Einheit');
  add(new Date(year, 11, 25), '1. Weihnachtstag');
  add(new Date(year, 11, 26), '2. Weihnachtstag');

  return holidays;
}

// Cache holidays per year
var _holidayCache = {};
function getHolidayForDate(date) {
  var year = date.getFullYear();
  if (!_holidayCache[year]) _holidayCache[year] = getHolidaysForYear(year);
  return _holidayCache[year][formatDateLocal(date)] || null;
}

// Parse [group:xxx] and [reason:yyy] from block notes; return { group, reason, text }
function parseBlockNotes(notes) {
  var out = { group: null, reason: null, text: '' };
  if (!notes) return out;
  var s = notes;
  var gm = s.match(/\[group:([a-f0-9]+)\]/);
  if (gm) { out.group = gm[1]; s = s.replace(gm[0], ''); }
  var rm = s.match(/\[reason:([^\]]+)\]/);
  if (rm) { out.reason = rm[1]; s = s.replace(rm[0], ''); }
  out.text = s.trim();
  return out;
}

// ============================================
// APP STATE
// ============================================
var AppState = {
  currentUser: null, currentScreen: 'welcome', signupRole: 'student',
  signupUserId: null, activeLesson: null, lessonTimer: null, lessonStartTime: null,
  charts: {}, navHistory: [], summaryRatings: {}, summaryRatingNotes: {}, theme: 'light', language: 'de',
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
// FAHRSTUNDEN-TYPEN (single source of truth)
// Identisch mit den <option>-Werten in index.html (#lesson-type-select)
// und mit #edit-lesson-type. Werden auch fuer Preis-Auto-Match genutzt.
// ============================================
var LESSON_TYPES = [
  'Übungsfahrt',
  'Überlandfahrt',
  'Autobahnfahrt',
  'Nachtfahrt',
  'Prüfungsvorbereitung'
];

// ============================================
// MAIN APP OBJECT
// ============================================
var App = {

  // ──── INIT ────
  init: function() {
    ApiClient.init();
    this.applyTheme();
    // pageshow: BFCache-Restore (Browser-Back von Stripe) — hängende Buttons reset + Cache invalidieren
    window.addEventListener('pageshow', function(e) {
      if (e.persisted) {
        document.querySelectorAll('button[data-original-text]').forEach(function(b) {
          b.disabled = false;
          b.textContent = b.getAttribute('data-original-text');
          b.removeAttribute('data-original-text');
        });
        AppState._soloSub = null;
      }
    });
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
    // Show success toast after email link verification
    if (urlParams.get('verified') === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(function() {
        App.showToast(t('emailBestaetigt') || 'E-Mail bestätigt — bitte anmelden');
        if (!ApiClient.token) App.navigate('login');
      }, 400);
    }
    // Setup-Token (Magic Link nach manueller Anlage durch Fahrschule)
    var setupToken = urlParams.get('setup');
    if (setupToken) {
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(function() { App.openSetupPasswordFlow(setupToken); }, 400);
    }
  },

  openSetupPasswordFlow: async function(token) {
    // Falls bereits eingeloggt: erst ausloggen, damit die neue Schueler-Session aktiv wird
    if (ApiClient.token) {
      ApiClient.setToken(null);
      AppState.currentUser = null;
    }
    this.navigate('login');
    // Token serverseitig pruefen
    var info;
    try {
      info = await ApiClient.get('/api/school/setup-token/' + encodeURIComponent(token));
    } catch (err) {
      this.openModal('Link ung\u00fcltig', '<p>Dieser Einladungslink ist ung\u00fcltig, abgelaufen oder bereits verwendet.</p>' +
        '<button class="btn btn-primary btn-full mt-3" onclick="App.closeModalForce()">Schlie\u00dfen</button>');
      return;
    }
    var h = '<form id="setup-pw-form" onsubmit="event.preventDefault();App.submitSetupPassword(\'' + token.replace(/\\/g,'').replace(/"/g,'') + '\');">' +
      '<p style="margin-bottom:var(--space-3);font-size:var(--text-sm);">Hallo ' + (info.name || '').replace(/</g,'&lt;') +
        ',<br>' + (info.schoolName || 'Deine Fahrschule').replace(/</g,'&lt;') +
        ' hat dich bei FahrDoc angelegt. Setze jetzt dein Passwort.</p>' +
      '<div class="form-group mb-3"><label class="form-label">E-Mail</label>' +
        '<input class="form-input" type="email" value="' + (info.email || '').replace(/"/g,'&quot;') + '" readonly style="background:#f5f5f5;"></div>' +
      '<div class="form-group mb-3"><label class="form-label">Neues Passwort *</label>' +
        '<input class="form-input" id="setup-pw1" type="password" minlength="6" required autofocus></div>' +
      '<div class="form-group mb-3"><label class="form-label">Passwort wiederholen *</label>' +
        '<input class="form-input" id="setup-pw2" type="password" minlength="6" required></div>' +
      '<button type="submit" class="btn btn-primary btn-full" id="setup-pw-submit">Passwort setzen &amp; einloggen</button>' +
    '</form>';
    this.openModal('Passwort setzen', h);
  },

  submitSetupPassword: async function(token) {
    var pw1 = (document.getElementById('setup-pw1') || {}).value || '';
    var pw2 = (document.getElementById('setup-pw2') || {}).value || '';
    if (pw1.length < 6) { this.showToast('Passwort zu kurz (min. 6 Zeichen)'); return; }
    if (pw1 !== pw2) { this.showToast('Passw\u00f6rter stimmen nicht \u00fcberein'); return; }
    var btn = document.getElementById('setup-pw-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Speichere\u2026'; }
    try {
      var res = await ApiClient.post('/api/school/setup-password', { token: token, password: pw1 });
      if (!res || !res.ok || !res.token) throw new Error('Fehler beim Setzen');
      // Login-Token speichern und Auto-Login ausl\u00f6sen
      ApiClient.setToken(res.token, false); // session-only, kein remember
      this.closeModalForce();
      this.showToast('Willkommen bei FahrDoc');
      await this.autoLogin();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Passwort setzen & einloggen'; }
      this.showToast('Fehler: ' + (err.message || err));
    }
  },

  autoLogin: async function() {
    try {
      this.showLoading(true);
      var user = await ApiClient.get('/api/auth/me');
      AppState.currentUser = user;
      var dash = { school: 'school-dashboard', instructor: 'instructor-dashboard', student: 'student-dashboard' };
      this.navigate(dash[user.role]);
      if (user.role === 'school') { setTimeout(function(){ App.checkSubscriptionLock(); }, 500); }
      // Toast nach Solo-Checkout-Success-Reload
      try {
        var _ssR = window['session' + 'Storage'];
        if (_ssR && _ssR.getItem('fahrdoc_solo_success_toast')) {
          _ssR.removeItem('fahrdoc_solo_success_toast');
          setTimeout(function() { App.showToast('Abo erfolgreich gestartet — willkommen bei FahrDoc!'); }, 700);
        }
      } catch(_) {}
      // Handle Stripe redirect
      var params = new URLSearchParams(window.location.search);
      if (params.get('stripe') === 'success') {
        setTimeout(function() { App.showToast('Abo erfolgreich gestartet!'); if (user.role === 'school') App.switchSchoolTab('abo'); }, 500);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('stripe') === 'cancel') {
        setTimeout(function() { App.showToast('Checkout abgebrochen'); }, 500);
        window.history.replaceState({}, '', window.location.pathname);
      } else if (params.get('solo_checkout') === 'success') {
        AppState._soloSub = null; // Cache invalidieren
        window.history.replaceState({}, '', window.location.pathname);
        // Toast direkt zeigen, dann Hard-Reload damit Lock-Screen (falls aktiv) verschwindet
        try {
          var _ss = window['session' + 'Storage'];
          if (_ss) _ss.setItem('fahrdoc_solo_success_toast', '1');
        } catch(_) {}
        setTimeout(function() { window.location.reload(); }, 300);
      } else if (params.get('solo_checkout') === 'cancel') {
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
    // Pre-Select role from Welcome cards (signupAs)
    if (screen === 'signup' && AppState._preselectRole) {
      var pre = AppState._preselectRole;
      AppState._preselectRole = null;
      setTimeout(function() {
        if (pre === 'school') App.setRole('school');
        else if (pre === 'solo') App.setRole('solo');
        else if (pre === 'invited') App.setRole('student');
      }, 50);
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
    else {
      // Toggle ohne expliziten Klick (z.B. über signupAs())
      var matchBtn = document.querySelector('.role-toggle-btn[data-role="' + role + '"]');
      if (matchBtn) matchBtn.classList.add('active');
    }
    document.querySelectorAll('.signup-conditional-fields').forEach(function(f) { f.classList.add('hidden'); });
    var fieldMap = { school: 'signup-school-fields', solo: 'signup-solo-fields', instructor: 'signup-instructor-fields', student: 'signup-student-fields' };
    var target = document.getElementById(fieldMap[role]);
    if (target) target.classList.remove('hidden');
    // Trial-Promo nur für Fahrschulen (Solo zeigt eigene Promo-Box)
    var trialPromo = document.getElementById('signup-trial-promo');
    if (trialPromo) {
      if (role === 'school') trialPromo.classList.remove('hidden');
      else trialPromo.classList.add('hidden');
    }
    var subtitleEl = document.getElementById('signup-subtitle');
    if (subtitleEl) {
      if (role === 'school') {
        subtitleEl.textContent = 'Fahrschule registrieren — 14 Tage gratis';
      } else if (role === 'solo') {
        subtitleEl.textContent = 'FahrDoc Solo — als Einzel-Fahrlehrer';
      } else if (role === 'instructor') {
        subtitleEl.textContent = 'Registriere dich als Fahrlehrer mit Code';
      } else {
        subtitleEl.textContent = 'Registriere dich als Fahrsch\u00fcler';
      }
    }
  },

  // ===== Solo-Helpers =====
  isSolo: function() {
    var u = AppState.currentUser;
    return !!(u && u.role === 'instructor' && u.account_type === 'solo');
  },
  brandName: function() {
    return this.isSolo() ? 'FahrDoc' : 'FahrDoc Plus';
  },
  // Solo-Subscription-Status laden (gecacht 60s)
  loadSoloSubscription: async function(force) {
    if (!this.isSolo()) return null;
    var cached = AppState._soloSub;
    if (!force && cached && (Date.now() - cached._ts) < 60000) return cached;
    try {
      var sub = await ApiClient.get('/api/stripe/solo-subscription');
      sub._ts = Date.now();
      AppState._soloSub = sub;
      return sub;
    } catch (e) { return null; }
  },
  // Solo-Checkout starten
  startSoloCheckout: async function() {
    var btn = event && event.target;
    var origText = btn ? btn.textContent : 'Jetzt freischalten';
    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Lade Checkout...'; btn.setAttribute('data-original-text', origText); }
      var res = await ApiClient.post('/api/stripe/create-solo-checkout', {});
      if (res && res.url) { window.location.href = res.url; }
      else throw new Error('Keine Checkout-URL erhalten');
    } catch (e) {
      alert('Fehler beim Öffnen des Checkouts: ' + (e.message || e));
      if (btn) { btn.disabled = false; btn.textContent = origText; }
    }
  },
  // Solo-Portal öffnen (Abo verwalten/kündigen)
  openSoloPortal: async function() {
    var btn = event && event.target;
    var origText = btn ? btn.textContent : 'Abo verwalten';
    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Lade Portal...'; btn.setAttribute('data-original-text', origText); }
      var res = await ApiClient.post('/api/stripe/solo-portal', {});
      if (res && res.url) { window.location.href = res.url; }
      else throw new Error('Keine Portal-URL erhalten');
    } catch (e) {
      alert('Fehler beim Öffnen des Abo-Portals: ' + (e.message || e));
      if (btn) { btn.disabled = false; btn.textContent = origText; }
    }
  },
  // Solo-Abo-Card (im Profil-Tab): Plan + Status + Buttons
  soloAboCardHtml: function(sub) {
    if (!sub) return '';
    var row = function(label, val) {
      return '<div class="profile-row"><span class="profile-row-label">' + label + '</span><span class="profile-row-value">' + val + '</span></div>';
    };
    var planLabel, statusLabel, actionBtns = '';
    var endDate = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('de-DE') : '—';
    var trialEndDate = sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString('de-DE') : '—';

    if (sub.state === 'active') {
      planLabel = 'FahrDoc Solo (14,99 €/Monat)';
      statusLabel = '✓ Aktiv';
      actionBtns = '<button class="btn btn-secondary btn-full" style="margin-top:12px;" onclick="App.openSoloPortal()">Abo verwalten</button>';
    } else if (sub.state === 'cancelling') {
      planLabel = 'FahrDoc Solo (gekündigt)';
      statusLabel = 'Läuft bis ' + endDate;
      actionBtns = '<button class="btn btn-secondary btn-full" style="margin-top:12px;" onclick="App.openSoloPortal()">Abo verwalten</button>';
    } else if (sub.state === 'past_due') {
      planLabel = 'FahrDoc Solo';
      statusLabel = '⚠️ Zahlung fehlgeschlagen';
      actionBtns = '<button class="btn btn-primary btn-full" style="margin-top:12px;" onclick="App.openSoloPortal()">Zahlung aktualisieren</button>';
    } else if (sub.state === 'cancelled_grace') {
      planLabel = 'FahrDoc Solo (läuft aus)';
      statusLabel = 'Noch bis ' + endDate;
      actionBtns = '<button class="btn btn-primary btn-full" style="margin-top:12px;" onclick="App.startSoloCheckout()">Erneut abonnieren</button>';
    } else if (sub.state === 'cancelled_expired') {
      planLabel = 'FahrDoc Solo (abgelaufen)';
      statusLabel = 'Kein aktives Abo';
      actionBtns = '<button class="btn btn-primary btn-full" style="margin-top:12px;" onclick="App.startSoloCheckout()">Jetzt freischalten – 14,99 €/Monat</button>';
    } else if (sub.state === 'trial_expired') {
      planLabel = 'FahrDoc Solo (Trial abgelaufen)';
      statusLabel = 'Testzeitraum beendet';
      actionBtns = '<button class="btn btn-primary btn-full" style="margin-top:12px;" onclick="App.startSoloCheckout()">Jetzt freischalten – 14,99 €/Monat</button>';
    } else {
      // trial (aktiv)
      planLabel = 'FahrDoc Solo (Trial)';
      statusLabel = sub.trial_days_left !== null ? 'Noch ' + sub.trial_days_left + ' Tage gratis' : 'Trial aktiv';
      actionBtns = '<button class="btn btn-primary btn-full" style="margin-top:12px;" onclick="App.startSoloCheckout()">Jetzt freischalten – 14,99 €/Monat</button>';
    }

    var endRow = (sub.state === 'active' || sub.state === 'cancelling' || sub.state === 'cancelled_grace') ?
      row(sub.cancel_at_period_end ? 'Läuft bis' : 'Nächste Abbuchung', endDate) :
      (sub.state === 'trial' ? row('Trial endet am', trialEndDate) : '');

    return '<div class="card mb-4">' +
      '<div class="section-title mb-3">Abo</div>' +
      row('Plan', planLabel) +
      row('Status', statusLabel) +
      endRow +
      actionBtns +
      '</div>';
  },
  // Solo-Subscription-Banner HTML (sanfter Lock)
  soloSubBannerHtml: function(sub) {
    if (!sub) return '';
    if (sub.state === 'active') return '';
    var box = function(emoji, title, msg, btnLabel, btnAction, kind) {
      var bg = kind === 'warn' ? 'background:linear-gradient(135deg,#fff7ed,#fed7aa);border:1px solid #fb923c;color:#7c2d12;'
             : kind === 'error' ? 'background:linear-gradient(135deg,#fef2f2,#fecaca);border:1px solid #f87171;color:#7f1d1d;'
             : 'background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #60a5fa;color:#1e3a8a;';
      var btn = btnLabel ? '<button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="App.' + btnAction + '()">' + btnLabel + '</button>' : '';
      return '<div style="' + bg + 'border-radius:12px;padding:14px 16px;margin-bottom:16px;">' +
        '<div style="font-weight:600;font-size:15px;">' + emoji + ' ' + title + '</div>' +
        '<div style="font-size:13px;margin-top:4px;opacity:0.9;">' + msg + '</div>' + btn + '</div>';
    };
    var endDate = sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('de-DE') : '';
    if (sub.state === 'trial' && sub.trial_days_left !== null && sub.trial_days_left <= 3) {
      return box('⏳', 'Testzeitraum endet bald', 'Nur noch ' + sub.trial_days_left + ' Tage gratis. Sichere dir FahrDoc für 14,99 €/Monat.', 'Jetzt freischalten', 'startSoloCheckout', 'warn');
    }
    if (sub.state === 'trial_expired') {
      return box('🔒', 'Testzeitraum abgelaufen', 'Schalte FahrDoc für 14,99 €/Monat frei — unbegrenzte Schüler und alle Funktionen.', 'Jetzt freischalten', 'startSoloCheckout', 'error');
    }
    if (sub.state === 'past_due') {
      return box('⚠️', 'Zahlung fehlgeschlagen', 'Deine letzte Zahlung konnte nicht eingezogen werden. Bitte aktualisiere deine Zahlungsmethode.', 'Abo verwalten', 'openSoloPortal', 'error');
    }
    if (sub.state === 'cancelling') {
      return box('📅', 'Abo gekündigt', 'Dein Zugang läuft bis zum ' + endDate + '. Du kannst die Kündigung im Abo-Portal rückgängig machen.', 'Abo verwalten', 'openSoloPortal', 'warn');
    }
    if (sub.state === 'cancelled_grace') {
      return box('📅', 'Abo läuft aus', 'Du kannst FahrDoc noch bis ' + endDate + ' nutzen.', 'Erneut abonnieren', 'startSoloCheckout', 'warn');
    }
    if (sub.state === 'cancelled_expired') {
      return box('🔒', 'Abo abgelaufen', 'Reaktiviere dein FahrDoc-Abo für 14,99 €/Monat.', 'Jetzt freischalten', 'startSoloCheckout', 'error');
    }
    return '';
  },

  // Vollbild-Lock-Screen wenn Trial abgelaufen oder Abo ausgelaufen
  renderSoloLockScreen: function(sub) {
    var isTrialExpired = sub && sub.state === 'trial_expired';
    var title = isTrialExpired ? 'Dein Testzeitraum ist beendet' : 'Dein Abo ist abgelaufen';
    var msg = isTrialExpired
      ? 'Du hast FahrDoc 14 Tage gratis getestet. Schalte jetzt frei und nutze alle Funktionen ohne Einschränkung.'
      : 'Reaktiviere dein FahrDoc-Abo, um wieder Schueler zu verwalten und Fahrstunden zu tracken.';
    var screen = document.getElementById('screen-instructor-dashboard');
    if (!screen) return;
    var html = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(135deg,#f8fafc,#e2e8f0);">' +
      '<div style="max-width:480px;width:100%;background:#fff;border-radius:20px;padding:36px 28px;box-shadow:0 8px 32px rgba(0,0,0,0.08);text-align:center;">' +
        '<div style="font-size:64px;margin-bottom:12px;">🔒</div>' +
        '<h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 8px;">' + title + '</h1>' +
        '<p style="font-size:15px;color:#64748b;line-height:1.5;margin:0 0 28px;">' + msg + '</p>' +
        '<div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:14px;padding:20px;margin-bottom:20px;">' +
          '<div style="font-size:13px;color:#1e3a8a;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">FahrDoc</div>' +
          '<div style="font-size:36px;font-weight:700;color:#0f172a;margin:4px 0;">14,99 €<span style="font-size:16px;font-weight:500;color:#64748b;">/Monat</span></div>' +
          '<div style="font-size:13px;color:#475569;">Jederzeit kündbar · Unbegrenzte Schüler</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-full" style="padding:14px;font-size:16px;font-weight:600;margin-bottom:12px;" onclick="App.startSoloCheckout()">Jetzt freischalten</button>' +
        '<button class="btn btn-ghost btn-full" style="padding:12px;color:#64748b;" onclick="App.logout()">Abmelden</button>' +
      '</div>' +
    '</div>';
    screen.innerHTML = html;
  },

  applyBranding: function() {
    try {
      var title = this.brandName();
      // Top-Bar Logo-Container per data-Attribut markieren (CSS via .top-bar-logo::after geht nicht, weil Logos SVG sind)
      document.documentElement.setAttribute('data-app-edition', this.isSolo() ? 'solo' : 'plus');
    } catch(_) {}
  },
  signupAs: function(kind) {
    // Vom Welcome-Screen: Rolle vorwählen und zu signup navigieren
    AppState._preselectRole = kind;
    this.navigate('signup');
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
      this.applyBranding();
      var dash = { school: 'school-dashboard', instructor: 'instructor-dashboard', student: 'student-dashboard' };
      this.navigate(dash[result.user.role]);
      var greetName = result.user.admin_name || result.user.name;
      var greet = t('willkommen') + ', ' + greetName + '!';
      if (this.isSolo()) greet = 'Willkommen bei FahrDoc Solo, ' + greetName + '!';
      this.showToast(greet);
      if (result.user.role === 'school') { setTimeout(function(){ App.checkSubscriptionLock(); }, 500); }
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
    // Solo: Backend erwartet role='instructor' + accountType='solo'
    var apiRole = AppState.signupRole === 'solo' ? 'instructor' : AppState.signupRole;
    var body = {
      role: apiRole,
      firstName: document.getElementById('signup-firstname').value.trim(),
      lastName: document.getElementById('signup-lastname').value.trim(),
      email: document.getElementById('signup-email').value.trim(),
      password: pw1
    };
    if (AppState.signupRole === 'solo') {
      body.accountType = 'solo';
    } else if (AppState.signupRole === 'school') {
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
      AppState.signupEmail = body.email;
      // Marker setzen: dieser User durchläuft gerade eine echte Erstregistrierung
      // → nach Email-Verify zeigen wir das Welcome-Modal
      try { window['session' + 'Storage'].setItem('fahrdoc_pending_welcome', '1'); } catch(_) {}
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
      // Welcome-Modal nach Erstregistrierung (einmalig)
      var self = this;
      try {
        var pending = window['session' + 'Storage'].getItem('fahrdoc_pending_welcome');
        if (pending === '1') {
          window['session' + 'Storage'].removeItem('fahrdoc_pending_welcome');
          setTimeout(function() { self.showWelcomeAfterSignup(user); }, 600);
        }
      } catch(_) {}
    } catch (err) { var errEl = document.getElementById('verify-error'); errEl.textContent = err.message; errEl.classList.remove('hidden'); }
    finally { this.showLoading(false); }
  },

  resendCode: async function() {
    if (!AppState.signupUserId || !AppState.signupRole || !AppState.signupEmail) {
      this.showToast(t('fehler') + ': Sitzung abgelaufen — bitte neu registrieren');
      return;
    }
    try {
      this.showLoading(true);
      await ApiClient.post('/api/auth/resend-code', {
        userId: AppState.signupUserId,
        role: AppState.signupRole,
        email: AppState.signupEmail
      });
      this.showToast(t('emailErneutGesendet') || 'E-Mail erneut gesendet');
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
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

  // ============================================
  // Welcome-Modal nach erfolgreicher Erstregistrierung
  // ============================================
  showWelcomeAfterSignup: function(user) {
    var firstName = ((user && (user.firstName || user.first_name || user.name)) || '').split(' ')[0];
    var greeting = firstName ? ('Willkommen, ' + firstName + ' \ud83d\udc4b') : 'Willkommen bei FahrDoc \ud83d\udc4b';
    var html =
      '<div class="welcome-modal-body">' +
        '<p class="welcome-modal-lead">Sch\u00f6n, dass du dabei bist. Wir vom FahrDoc-Team legen gro\u00dfen Wert auf Kundenzufriedenheit und arbeiten jeden Tag daran, die App besser zu machen.</p>' +
        '<p class="welcome-modal-text">Dein Feedback hilft uns enorm \u2014 ob Lob, Kritik, Fragen oder W\u00fcnsche f\u00fcr neue Funktionen. Du findest jederzeit einen <strong>Feedback-Bereich in deinem Profil</strong>. Schreib uns einfach, wir k\u00fcmmern uns pers\u00f6nlich darum.</p>' +
        '<div class="welcome-modal-actions">' +
          '<button class="btn btn-secondary btn-full" onclick="App.openFeedbackFromWelcome()">Direkt zum Feedback</button>' +
          '<button class="btn btn-primary btn-full" onclick="App.closeModalForce()">Verstanden, los geht\'s</button>' +
        '</div>' +
      '</div>';
    this.openModal(greeting, html);
  },

  openFeedbackFromWelcome: function() {
    this.closeModalForce();
    var role = AppState.currentUser && AppState.currentUser.role;
    var self = this;
    setTimeout(function() {
      var btn;
      if (role === 'school') {
        btn = document.querySelector('#school-dashboard [data-tab="profile"]');
        if (btn) self.switchSchoolTab('profile', btn);
      } else if (role === 'instructor') {
        btn = document.querySelector('#instructor-dashboard [data-tab="profile"]');
        if (btn) self.switchInstructorTab('profile', btn);
      } else if (role === 'student') {
        btn = document.querySelector('#student-dashboard [data-tab="profile"]');
        if (btn) self.switchStudentTab('profile', btn);
      }
      setTimeout(function() {
        var fb = document.getElementById('feedback-message');
        if (fb && fb.scrollIntoView) fb.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }, 200);
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
    // Nur bewertete Items (Wert 1-4) in den Schnitt einbeziehen.
    // 0 / null / undefined = 'nicht bewertet' und werden ausgefiltert.
    var vals = [];
    Object.keys(ratings).forEach(function(k) {
      var v = ratings[k];
      if (typeof v === 'number' && v >= 1 && v <= 4) vals.push(v);
    });
    if (vals.length === 0) return 0;
    var sum = 0; vals.forEach(function(v) { sum += v; });
    return sum / vals.length;
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
    AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
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

  // Sunset time calculator for Berlin (52.52°N, 13.40°E)
  // NOAA-Algorithmus mit Equation-of-Time und Refraktions-Korrektur
  getSunsetTime: function(date) {
    var N = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
    var latDeg = 52.52;
    var lonDeg = 13.40;
    var lat = latDeg * Math.PI / 180;
    var gamma = 2 * Math.PI / 365 * (N - 1);
    // Sonnen-Deklination (NOAA Fourier-Reihe)
    var decl = 0.006918
      - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
      - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
      - 0.002697 * Math.cos(3 * gamma) + 0.00148  * Math.sin(3 * gamma);
    // Zeitgleichung (Minuten)
    var eot = 229.18 * (0.000075
      + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
      - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    // Zenit-Winkel fuer sichtbaren Sonnenuntergang: 90.833° (Refraktion 34' + Sonnenradius 16')
    var zenith = 90.833 * Math.PI / 180;
    var cosHA = (Math.cos(zenith) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
    if (cosHA < -1) cosHA = -1; if (cosHA > 1) cosHA = 1;
    var ha = Math.acos(cosHA) * 180 / Math.PI;
    // Sonnenuntergang in Minuten UTC: SolarNoon(720 - 4*lon - eot) + 4*HA
    var sunsetMinUTC = 720 - 4 * lonDeg - eot + 4 * ha;
    var sunsetUTC = sunsetMinUTC / 60;
    var sunsetLocal = sunsetUTC + 1; // MEZ = UTC+1
    var isDST = date.getMonth() >= 2 && date.getMonth() <= 9;
    if (isDST) sunsetLocal += 1; // MESZ = UTC+2
    var hours = Math.floor(sunsetLocal);
    var mins = Math.round((sunsetLocal - hours) * 60);
    if (mins >= 60) { mins -= 60; hours += 1; }
    return { hours: hours, minutes: mins, formatted: String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0') };
  },

  // Shared week grid renderer (admin + instructor)
  renderWeekGridHtml: function(days, slots, onCellClick, onSlotClick, filterInstructorId) {
    var totalMinutes = (GRID_END_HOUR - GRID_START_HOUR) * 60;
    var totalHeight = totalMinutes * PX_PER_MIN;
    // Helper: Fahrlehrer-Name ausblenden wenn redundant
    // - Fahrlehrer-Sicht: eigener Name immer ausblenden (eigener Plan)
    // - Schul-Sicht mit Filter auf einen Fahrlehrer: dessen Name ausblenden
    var _meIsInstructor = AppState.currentUser && AppState.currentUser.role === 'instructor';
    var _myInstructorId = _meIsInstructor ? AppState.currentUser.id : null;
    var _filterInstId = filterInstructorId || (typeof AppState !== 'undefined' && AppState.scheduleSelectedInstructor) || null;
    function _slotInstructorName(slot) {
      if (!slot.instructor_name) return null;
      if (_meIsInstructor && slot.instructor_id && String(slot.instructor_id) === String(_myInstructorId)) return null;
      if (_filterInstId && slot.instructor_id && String(slot.instructor_id) === String(_filterInstId)) return null;
      return slot.instructor_name;
    }
    var html = '<div class="week-grid-scroll-wrapper"><div class="week-grid' + (AppState.slotOfferMode ? ' week-grid-offer-mode' : '') + '">';
    // Header
    html += '<div class="week-grid-header"><div class="week-grid-time-gutter"></div>';
    days.forEach(function(day, idx) {
      var isToday = day.toDateString() === new Date().toDateString();
      var holiday = getHolidayForDate(day);
      var classes = 'week-grid-day-header' + (isToday ? ' today' : '') + (holiday ? ' holiday' : '');
      var titleAttr = holiday ? ' title="' + holiday.replace(/"/g, '&quot;') + '"' : '';
      html += '<div class="' + classes + '"' + titleAttr + '>' +
        '<div class="week-grid-day-name">' + getDayNames()[idx] + '</div>' +
        '<div class="week-grid-day-date">' + day.getDate() + '.' + String(day.getMonth() + 1).padStart(2, '0') + '.</div>' +
        (holiday ? '<div class="week-grid-day-holiday">' + holiday + '</div>' : '') +
        '</div>';
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
      var holiday = getHolidayForDate(day);
      var daySlots = slots.filter(function(s) { return s.date === dayStr; });
      html += '<div class="week-grid-day-col' + (isToday ? ' today' : '') + (holiday ? ' holiday' : '') + '" onclick="App.onWeekGridCellClick(event, \'' + dayStr + '\', ' + JSON.stringify(onCellClick).replace(/"/g, '&quot;') + ')">';
      // Hour lines
      for (var hh = GRID_START_HOUR; hh < GRID_END_HOUR; hh++) {
        html += '<div class="week-grid-hour-line" style="top:' + ((hh - GRID_START_HOUR) * HOUR_HEIGHT) + 'px;"></div>';
      }
      // Sunset line + Nacht-Schraffur darunter
      var sunset = App.getSunsetTime(day);
      var sunsetMinFromStart = (sunset.hours * 60 + sunset.minutes) - GRID_START_HOUR * 60;
      if (sunsetMinFromStart > 0 && sunsetMinFromStart < totalMinutes) {
        var sunsetTopPx = sunsetMinFromStart * PX_PER_MIN;
        var nightHeight = totalHeight - sunsetTopPx;
        html += '<div class="night-overlay" style="top:' + sunsetTopPx + 'px;height:' + nightHeight + 'px;"></div>';
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
        var isOffer = slot.slot_type === 'offer';
        var typeCls = isBlock ? 'slot-block' : (isTheory ? (slot.instructor_id ? 'theory-slot-assigned' : 'theory-slot') : (isOffer ? 'slot-uebungsfahrt slot-offer-pending' : slotTypeClass(slot.type)));
        var isOffen = !slot.student_id && !isBlock && !isTheory && !isOffer;
        var pruef = !isBlock && !isTheory && !isOffer && isPruefung(slot.type);
        var isUnconfirmed = !isBlock && !isTheory && !isOffer && slot.confirmed === false;
        var isConfirmed = !isBlock && !isTheory && !isOffer && slot.confirmed !== false;
        var isAdminView = AppState.currentUser && AppState.currentUser.role === 'school';
        var clickJs;
        if (isTheory) {
          clickJs = 'App.openTheoryDetail(&quot;' + slot.id + '&quot;)';
        } else if (isBlock) {
          clickJs = 'App.openBlockDetail(' + JSON.stringify(slot).replace(/"/g, '&quot;') + ')';
        } else if (isOffer) {
          clickJs = 'App.openOfferSlotDetail(&quot;' + slot.offer_id + '&quot;)';
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
            var _instName_t = _slotInstructorName(slot);
            html += '<div class="theory-slot-label">' + t('theorieThema') + ' ' + (slot.theory_topic_number || '') + '</div>';
            html += '<div class="theory-slot-time">' + slot.start_time + '\u2013' + slot.end_time + '</div>';
            if (_instName_t) {
              html += '<div class="theory-slot-time">' + _instName_t + '</div>';
            }
          } else {
            html += '<div class="theory-slot-label">' + t('theorieThema') + ' ' + (slot.theory_topic_number || '') + '</div>';
          }
        } else if (isBlock) {
          // Block display
          var bp = parseBlockNotes(slot.notes);
          if (height >= 40) {
            var _instName_b = _slotInstructorName(slot);
            html += '<div class="week-grid-slot-time">' + slot.start_time + '\u2013' + slot.end_time + '</div>';
            if (_instName_b) {
              html += '<div class="week-grid-slot-instructor">' + _instName_b + '</div>';
            }
            html += '<div class="week-grid-slot-name">' + (bp.reason || t('nichtVerfuegbar')) + '</div>';
          } else {
            html += '<div class="week-grid-slot-time">' + slot.start_time + ' ' + (bp.reason || t('nichtVerfuegbar')) + '</div>';
          }
        } else if (isOffer) {
          // Pending slot offer display
          if (height >= 40) {
            var _instName_o = _slotInstructorName(slot);
            html += '<div class="week-grid-slot-time">' + slot.start_time + '\u2013' + slot.end_time + '</div>';
            if (_instName_o) {
              html += '<div class="week-grid-slot-instructor">' + _instName_o + '</div>';
            }
            html += '<div class="week-grid-slot-name">' + t('angebotenOffen') + '</div>';
            html += '<div class="week-grid-slot-type">' + t('termineAnbieten') + '</div>';
          } else {
            html += '<div class="week-grid-slot-time">' + slot.start_time + ' ' + t('angebotenOffen') + '</div>';
          }
        } else if (height >= 40) {
          var _instName_n = _slotInstructorName(slot);
          html += '<div class="week-grid-slot-time">' + slot.start_time + '\u2013' + slot.end_time + '</div>';
          if (_instName_n) {
            html += '<div class="week-grid-slot-instructor">' + _instName_n + '</div>';
          }
          html += '<div class="week-grid-slot-name">' + (slot.student_name || t('offen')) + '</div>';
          html += '<div class="week-grid-slot-type">' + tType(slot.type) + (pruef ? ' \ud83c\udfc1' : '') + (isUnconfirmed ? ' \u231b' : '') + (isRecurring ? ' <span class="recurring-badge">\uD83D\uDD01</span>' : '') + '</div>';
          if (slot.branch_name) {
            html += '<div class="week-grid-slot-branch" style="font-size:10px;opacity:0.85;">\ud83d\udccd ' + slot.branch_name + '</div>';
          }
        } else {
          html += '<div class="week-grid-slot-time">' + slot.start_time + ' ' + (_slotInstructorName(slot) || slot.student_name || slot.type) + '</div>';
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
    var branchSel = document.getElementById('schedule-branch');
    if (branchSel && branchSel.value) slotData.branchId = branchSel.value;
    var secretarySel = document.getElementById('schedule-secretary');
    if (secretarySel && secretarySel.value) slotData.secretaryId = secretarySel.value;
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
      AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  updateScheduleSlot: async function(id) {
    // Notizen darf der Fahrlehrer immer ändern. Felder die disabled sind, NICHT mitsenden,
    // damit das Backend (PUT /api/schedule) sie nicht überschreibt.
    var slotData = { notes: document.getElementById('schedule-notes').value };
    var dateEl = document.getElementById('schedule-date');
    if (dateEl && !dateEl.disabled) slotData.date = dateEl.value;
    var startEl = document.getElementById('schedule-start-time');
    if (startEl && !startEl.disabled) slotData.startTime = startEl.value;
    var endEl = document.getElementById('schedule-end-time');
    if (endEl && !endEl.disabled) slotData.endTime = endEl.value;
    var typeEl = document.getElementById('schedule-type');
    if (typeEl && !typeEl.disabled) slotData.type = typeEl.value;
    var classEl = document.getElementById('schedule-class');
    if (classEl && !classEl.disabled) slotData.licenseClass = classEl.value;
    var studentSel = document.getElementById('schedule-student');
    if (studentSel && !studentSel.disabled) slotData.studentId = studentSel.value ? studentSel.value : null;
    var vehicleSel = document.getElementById('schedule-vehicle');
    if (vehicleSel && !vehicleSel.disabled) slotData.vehicleId = vehicleSel.value ? vehicleSel.value : null;
    var branchSel = document.getElementById('schedule-branch');
    if (branchSel && !branchSel.disabled) slotData.branchId = branchSel.value ? branchSel.value : null;
    var secretarySel = document.getElementById('schedule-secretary');
    if (secretarySel && !secretarySel.disabled) slotData.secretaryId = secretarySel.value ? secretarySel.value : null;
    try {
      this.showLoading(true);
      await ApiClient.put('/api/schedule/' + id, slotData);
      this.closeModalForce(); this.showToast(t('terminAktualisiert'));
      AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
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
      AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  confirmScheduleSlot: async function(id) {
    try {
      await ApiClient.post('/api/schedule/' + id + '/confirm');
      this.closeModalForce(); this.showToast(t('terminBestaetigt'));
      AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
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

    // Fahrlehrer darf Büro-geplante Termine nicht in den Pflichtfeldern ändern.
    // Read-only für: Schüler, Fahrzeug, Filiale, Sekretärin, Klasse, Typ, Datum, Zeit.
    var isInstructorReadonly = isEdit && AppState.currentUser && AppState.currentUser.role === 'instructor'
      && editSlot && editSlot.created_by_role === 'school';
    // Helper: statisches Read-only-Anzeigefeld — sieht aus wie disabled-Input,
    // aber linksbündig und ohne kaputten Dropdown-Pfeil.
    var roField = function(text) {
      return '<div class="form-input" style="background:var(--color-surface-2);color:var(--text-default);border:1px solid var(--color-border);text-align:left;display:flex;align-items:center;">' +
        (text || '—') + '</div>';
    };
    var fmtDateDE = function(iso) {
      if (!iso) return '—';
      var p = iso.split('-');
      if (p.length !== 3) return iso;
      return p[2] + '.' + p[1] + '.' + p[0];
    };

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

    html += '<div class="form-group mb-3"><label class="form-label">' + t('typ') + '</label>';
    if (isInstructorReadonly) {
      html += roField(tType(type));
    } else {
      html += '<select class="form-select" id="schedule-type" onchange="App.onScheduleTypeChange()">';
      SCHEDULE_TYPES.forEach(function(st) {
        html += '<option value="' + st + '"' + (st === type ? ' selected' : '') + '>' + tType(st) + '</option>';
      });
      html += '</select>';
    }
    html += '</div>';

    html += '<div class="form-group mb-3"><label class="form-label">' + t('datum') + '</label>';
    if (isInstructorReadonly) {
      html += roField(fmtDateDE(date));
    } else {
      html += '<input class="form-input" type="date" id="schedule-date" value="' + date + '">';
    }
    html += '</div>';

    html += '<div class="form-row form-row-2 mb-3">' +
      '<div class="form-group"><label class="form-label">' + t('start') + '</label>' +
        (isInstructorReadonly
          ? roField(startTime)
          : '<input class="form-input" type="time" id="schedule-start-time" value="' + startTime + '" onchange="App.onScheduleStartChange()">') +
      '</div>' +
      '<div class="form-group"><label class="form-label">' + t('ende') + '</label>' +
        (isInstructorReadonly
          ? roField(endTime)
          : '<input class="form-input" type="time" id="schedule-end-time" value="' + endTime + '" onchange="App.onScheduleEndManual()">') +
      '</div>' +
    '</div>';

    // Student selector
    html += '<div class="form-group mb-3"><label class="form-label">' + t('schuelerLeer') + '</label>';
    if (isInstructorReadonly) {
      var roStudentName = editSlot.student_name ? (editSlot.student_name + (editSlot.student_license_class ? ' (Klasse ' + editSlot.student_license_class + ')' : '')) : '— Offener Block —';
      html += roField(roStudentName);
    } else {
      html += '<select class="form-select" id="schedule-student"><option value="">— Offener Block —</option></select>';
    }
    html += '</div>';

    // Vehicle selector
    var vehicleId = isEdit ? (editSlot.vehicle_id || '') : '';
    html += '<div class="form-group mb-3"><label class="form-label">Fahrzeug</label>';
    if (isInstructorReadonly) {
      var roVehicle = '— Kein Fahrzeug —';
      if (editSlot.vehicle_brand || editSlot.vehicle_plate) {
        roVehicle = (editSlot.vehicle_brand || '') + (editSlot.vehicle_plate ? ' · ' + editSlot.vehicle_plate : '');
      }
      html += roField(roVehicle);
    } else {
      html += '<select class="form-select" id="schedule-vehicle"><option value="">— Kein Fahrzeug —</option></select>';
    }
    html += '</div>';

    // Filiale + Sekretärin (Plus only)
    var branchId = isEdit ? (editSlot.branch_id || '') : '';
    var secretaryId = isEdit ? (editSlot.secretary_id || '') : '';
    if (isInstructorReadonly) {
      // Read-only: nur anzeigen wenn am Termin gesetzt
      if (editSlot.branch_name) {
        html += '<div class="form-group mb-3"><label class="form-label">Filiale</label>' +
          roField(editSlot.branch_name + (editSlot.branch_address ? ' · ' + editSlot.branch_address : '')) +
          '</div>';
      }
      if (editSlot.secretary_name) {
        html += '<div class="form-group mb-3"><label class="form-label">Sekretärin</label>' +
          roField(editSlot.secretary_name) +
          '</div>';
      }
    } else {
      html += '<div id="schedule-branch-row" class="form-group mb-3" style="display:none;">' +
        '<label class="form-label">Filiale</label>' +
        '<select class="form-select" id="schedule-branch"><option value="">— Keine Filiale —</option></select></div>';
      html += '<div id="schedule-secretary-row" class="form-group mb-3" style="display:none;">' +
        '<label class="form-label">Sekretärin</label>' +
        '<select class="form-select" id="schedule-secretary"><option value="">— Keine Sekretärin —</option></select></div>';
    }

    html += '<div class="form-row form-row-2 mb-3">' +
      '<div class="form-group"><label class="form-label">' + t('klasse') + '</label>' +
        (isInstructorReadonly
          ? roField(cls)
          : '<select class="form-select" id="schedule-class">' +
            ['B','B78','B96','B196','B197','BE','A','A1','A2','AM','BF17','C','CE','D','L','T'].map(function(k){
              return '<option value="' + k + '"' + (cls === k ? ' selected' : '') + '>' + k + '</option>';
            }).join('') +
            '</select>') +
      '</div>' +
      '<div class="form-group"><label class="form-label">' + t('dauer') + '</label>' +
        '<div class="form-input" style="background:var(--color-surface-2);border:none;" id="schedule-duration-display">—</div></div>' +
    '</div>';

    // Saldo-Banner (nur Plus, nur wenn Schueler gesetzt) — wird async befuellt
    html += '<div id="schedule-balance-banner" style="display:none;"></div>';

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
      // Speichern: Im Read-only-Modus nur Notizen speichern
      var saveLabel = isInstructorReadonly ? 'Notizen speichern' : t('speichern');
      html += '<button type="button" class="btn btn-primary flex-1" onclick="App.updateScheduleSlot(\'' + editSlot.id + '\')">'+saveLabel+'</button>';
      if (!isInstructorReadonly && (editSlot.status === 'geplant' || editSlot.confirmed === false)) {
        html += '<button type="button" class="btn btn-success flex-1" onclick="App.confirmScheduleSlot(\'' + editSlot.id + '\')">'+t('bestaetigenBtn')+'</button>';
      }
      // Löschen: Fahrlehrer darf Büro-geplante Termine NICHT löschen
      if (!isInstructorReadonly) {
        var isRecurringSlot = editSlot.notes && editSlot.notes.indexOf('[recurring:') !== -1;
        if (isRecurringSlot) {
          html += '<button type="button" class="btn btn-danger" onclick="App.showRecurringDeleteOptions(\'' + editSlot.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        } else {
          html += '<button type="button" class="btn btn-danger" onclick="App.deleteScheduleSlot(\'' + editSlot.id + '\')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        }
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
    this.loadScheduleBranches(branchId);
    this.loadScheduleSecretaries(secretaryId);
    this.updateDurationDisplay();
  },

  loadScheduleBranches: async function(preSelectId) {
    // Nur Plus — Solo bekommt keine Branches
    if (this.isSolo()) return;
    try {
      var data = await ApiClient.get('/api/school/branches');
      var branches = (data && data.branches) || [];
      var row = document.getElementById('schedule-branch-row');
      var sel = document.getElementById('schedule-branch');
      if (!sel || !row) return;
      if (branches.length === 0) { row.style.display = 'none'; return; }
      row.style.display = '';
      var optionsHtml = '<option value="">— Keine Filiale —</option>';
      branches.forEach(function(b){
        var sel2 = (b.id === preSelectId) ? ' selected' : '';
        var lbl = b.name + (b.address ? ' · ' + b.address : '');
        optionsHtml += '<option value="' + b.id + '"' + sel2 + '>' + lbl + '</option>';
      });
      sel.innerHTML = optionsHtml;
    } catch(e) { /* 403 bei Solo/Instructor ohne Zugriff — still ignorieren */ }
  },

  loadScheduleSecretaries: async function(preSelectId) {
    if (this.isSolo()) return;
    try {
      var data = await ApiClient.get('/api/school/secretaries');
      var secs = (data && data.secretaries) || [];
      var row = document.getElementById('schedule-secretary-row');
      var sel = document.getElementById('schedule-secretary');
      if (!sel || !row) return;
      if (secs.length === 0) { row.style.display = 'none'; return; }
      row.style.display = '';
      var optionsHtml = '<option value="">— Keine Sekretärin —</option>';
      secs.forEach(function(s){
        var sel2 = (s.id === preSelectId) ? ' selected' : '';
        optionsHtml += '<option value="' + s.id + '"' + sel2 + '>' + s.name + '</option>';
      });
      sel.innerHTML = optionsHtml;
    } catch(e) {}
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
      // Saldo-Banner an Dropdown-Wechsel binden + initial laden
      var self = this;
      sel.onchange = function() { self._loadScheduleStudentBalance(this.value); };
      this._loadScheduleStudentBalance(preSelectId);
    } catch(e) {}
  },

  // Laedt den offenen Saldo eines Schuelers und zeigt einen Banner im Termin-Modal.
  // Nur in Plus sichtbar (Solo hat keine Buchhaltung). Bei 0 € wird der Banner ausgeblendet.
  _loadScheduleStudentBalance: async function(studentId) {
    var banner = document.getElementById('schedule-balance-banner');
    if (!banner) return;
    // Solo: nie anzeigen
    if (this.isSolo()) { banner.style.display = 'none'; banner.innerHTML = ''; return; }
    // Kein Schueler: kein Banner
    if (!studentId) { banner.style.display = 'none'; banner.innerHTML = ''; return; }
    // Sofort einen schlanken Lade-Hinweis zeigen, dann ersetzen
    banner.style.display = 'block';
    banner.innerHTML = '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-3);padding:var(--space-2) var(--space-3);">Saldo wird geladen …</div>';
    try {
      var data = await ApiClient.get('/api/students/' + studentId + '/balance');
      // Race-Schutz: ggf. hat sich der Schueler inzwischen geaendert
      var currentSel = document.getElementById('schedule-student');
      if (currentSel && currentSel.value !== studentId) return;
      var open = data && typeof data.open_cents === 'number' ? data.open_cents : 0;
      if (open === 0) {
        banner.style.display = 'none'; banner.innerHTML = '';
        return;
      }
      var isOpen = open > 0;
      var icon = isOpen ? '\u26A0\uFE0F' : '\uD83D\uDCB0';
      var label = isOpen ? 'Offen' : 'Guthaben';
      var color = isOpen ? '#dc2626' : '#0d9488';
      var bg = isOpen ? '#fef2f2' : '#ecfdf5';
      var border = isOpen ? '#fecaca' : '#a7f3d0';
      var sign = isOpen ? '\u2212' : '+';
      var amount = this._formatEur(Math.abs(open));
      banner.innerHTML =
        '<div style="display:flex;align-items:center;gap:var(--space-2);background:' + bg + ';border:1px solid ' + border + ';border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-3);">' +
          '<span style="font-size:18px;line-height:1;">' + icon + '</span>' +
          '<div style="flex:1;">' +
            '<div style="font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.5px;font-weight:600;color:' + color + ';">' + label + '</div>' +
            '<div style="font-size:16px;font-weight:700;color:' + color + ';line-height:1.2;">' + sign + ' ' + amount + '</div>' +
          '</div>' +
        '</div>';
    } catch (e) {
      // Bei Fehler einfach ausblenden — nicht aufdringlich.
      banner.style.display = 'none'; banner.innerHTML = '';
    }
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

    // Date range: Von / Bis
    html += '<div class="form-row form-row-2 mb-3">' +
      '<div class="form-group"><label class="form-label">' + t('von') + '</label>' +
        '<input class="form-input" type="date" id="block-date" value="' + date + '" oninput="App.onBlockDateChange()"></div>' +
      '<div class="form-group"><label class="form-label">' + t('bis') + '</label>' +
        '<input class="form-input" type="date" id="block-end-date" value="' + date + '"></div>' +
    '</div>';

    // All-day toggle
    html += '<div class="form-group mb-3"><label style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;">' +
      '<input type="checkbox" id="block-all-day" onchange="App.toggleBlockAllDay()" style="width:18px;height:18px;">' +
      '<span>' + t('ganztaegig') + '</span></label></div>';

    html += '<div class="form-row form-row-2 mb-3" id="block-time-row">' +
      '<div class="form-group"><label class="form-label">' + t('start') + '</label>' +
        '<input class="form-input" type="time" id="block-start-time" value="' + startTime + '" step="1800"></div>' +
      '<div class="form-group"><label class="form-label">' + t('ende') + '</label>' +
        '<input class="form-input" type="time" id="block-end-time" value="' + endTime + '" step="1800"></div>' +
    '</div>';

    // Reason dropdown
    html += '<div class="form-group mb-3"><label class="form-label">' + t('grund') + '</label>' +
      '<select class="form-select" id="block-reason">' +
        '<option value="">' + t('grundWaehlen') + '</option>' +
        '<option value="Urlaub">' + t('urlaub') + '</option>' +
        '<option value="Krank">' + t('krank') + '</option>' +
        '<option value="Fortbildung">' + t('fortbildung') + '</option>' +
        '<option value="Privat">' + t('privat') + '</option>' +
        '<option value="Sonstiges">' + t('sonstiges') + '</option>' +
      '</select></div>';

    html += '<div class="form-group mb-3"><label class="form-label">' + t('notizen') + ' (' + t('optional') + ')</label>' +
      '<textarea class="form-textarea" id="block-notes" placeholder=""></textarea></div>';

    html += '<button type="button" class="btn btn-primary btn-full btn-lg" onclick="App.createBlock()">' + t('zeitsperreErstellen') + '</button>';
    html += '</form>';
    this.openModal(title, html);
  },

  onBlockDateChange: function() {
    // Auto-sync end-date if it's before start-date
    var s = document.getElementById('block-date');
    var e = document.getElementById('block-end-date');
    if (s && e && (!e.value || e.value < s.value)) e.value = s.value;
  },

  toggleBlockAllDay: function() {
    var cb = document.getElementById('block-all-day');
    var st = document.getElementById('block-start-time');
    var et = document.getElementById('block-end-time');
    var row = document.getElementById('block-time-row');
    if (!cb || !st || !et) return;
    if (cb.checked) {
      st.value = '00:00';
      et.value = '23:30';
      st.disabled = true;
      et.disabled = true;
      if (row) row.style.opacity = '0.5';
    } else {
      st.disabled = false;
      et.disabled = false;
      if (row) row.style.opacity = '1';
    }
  },

  openBlockDetail: function(block) {
    var title = t('zeitsperre');
    var parsed = parseBlockNotes(block.notes);
    var html = '<div style="margin-bottom:var(--space-3);">';
    html += '<div class="form-group mb-2"><label class="form-label">' + t('datum') + '</label><div>' + block.date + '</div></div>';
    html += '<div class="form-group mb-2"><label class="form-label">' + t('start') + ' \u2013 ' + t('ende') + '</label><div>' + block.start_time + ' \u2013 ' + block.end_time + '</div></div>';
    if (block.instructor_name) {
      html += '<div class="form-group mb-2"><label class="form-label">' + t('fahrlehrer') + '</label><div>' + block.instructor_name + '</div></div>';
    }
    if (parsed.reason) {
      html += '<div class="form-group mb-2"><label class="form-label">' + t('grund') + '</label><div>' + parsed.reason + '</div></div>';
    }
    if (parsed.text) {
      html += '<div class="form-group mb-2"><label class="form-label">' + t('notizen') + '</label><div>' + parsed.text + '</div></div>';
    }
    html += '</div>';
    html += '<button type="button" class="btn btn-danger btn-full" onclick="App.deleteBlock(\'' + block.id + '\', false)">' + t('zeitsperreLoeschen') + '</button>';
    if (parsed.group) {
      html += '<button type="button" class="btn btn-danger btn-full" style="margin-top:var(--space-2);" onclick="App.deleteBlock(\'' + block.id + '\', true)">' + t('alleTageLoeschen') + '</button>';
    }
    this.openModal(title, html);
  },

  createBlock: async function() {
    var startDate = document.getElementById('block-date').value;
    var endDate = document.getElementById('block-end-date').value || startDate;
    if (endDate < startDate) { this.showToast(t('fehler') + ': Bis-Datum vor Von-Datum'); return; }
    var blockData = {
      date: startDate,
      endDate: endDate,
      startTime: document.getElementById('block-start-time').value,
      endTime: document.getElementById('block-end-time').value,
      notes: document.getElementById('block-notes').value,
      reason: document.getElementById('block-reason').value,
      allDay: document.getElementById('block-all-day').checked
    };
    var instSel = document.getElementById('block-instructor-select');
    if (instSel && instSel.value) blockData.instructorId = instSel.value;
    try {
      this.showLoading(true);
      await ApiClient.post('/api/schedule/blocks', blockData);
      this.closeModalForce(); this.showToast(t('zeitsperreErstellt'));
      AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch(err) { this.showToast(t('fehler') + ': ' + err.message); }
    finally { this.showLoading(false); }
  },

  deleteBlock: async function(id, deleteAll) {
    if (!confirm(t('zeitsperreWirklichLoeschen'))) return;
    try {
      this.showLoading(true);
      var url = '/api/schedule/blocks/' + id + (deleteAll ? '?deleteAll=1' : '');
      await ApiClient.del(url);
      this.closeModalForce(); this.showToast(t('zeitsperreGeloescht'));
      AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
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
    else if (tab === 'abo') this.renderSchoolAboTab();
    else if (tab === 'admin') this.renderSuperAdminTab();
    else if (tab === 'profile') this.renderSchoolProfileTab();
  },

  dashboardViewMode: 'students',

  renderSchoolDashboardTab: async function() {
    var main = document.getElementById('school-main');
    var self = this;
    // TTL-Cache: 60s. Zweiter Klick auf Dashboard-Tab = instant.
    var cache = AppState._cachedData._dashboardBundle;
    var cacheTs = AppState._cachedData._dashboardBundleTs || 0;
    if (!cache || (Date.now() - cacheTs) > 60000) {
      main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    }
    try {
      var data, studData, instData;
      if (cache && (Date.now() - cacheTs) <= 60000) {
        data = cache.data; studData = cache.studData; instData = cache.instData;
      } else {
        // Parallel statt sequenziell → 3x schneller
        var res = await Promise.all([
          ApiClient.get('/api/school/dashboard'),
          ApiClient.get('/api/school/students'),
          ApiClient.get('/api/school/instructors')
        ]);
        data = res[0]; studData = res[1]; instData = res[2];
        AppState._cachedData._dashboardBundle = { data: data, studData: studData, instData: instData };
        AppState._cachedData._dashboardBundleTs = Date.now();
      }
      var school = AppState.currentUser;
      var mode = this.dashboardViewMode || 'students';
      var html = '<div class="page-padding">' +
        '<div class="welcome-msg"><h2>' + t('hallo') + ', ' + (school.admin_name || school.name) + '</h2><p>' + t('uebersichtSchule') + '</p></div>';

      // ──── SEARCH BAR ────
      html += '<div class="dashboard-search-wrapper">' +
        '<svg class="dashboard-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<input class="dashboard-search-input" type="text" id="dashboard-search" placeholder="' + t('sucheSchuelerFahrlehrer') + '" oninput="App.onDashboardSearch(this.value)" autocomplete="off">' +
        '<div class="dashboard-search-results" id="dashboard-search-results"></div></div>';

      // ──── NEW STUDENTS THIS WEEK WIDGET (klickbar -> Schueler anlegen) ────
      var newStudents = data.newStudentsThisWeek || [];
      html += '<div class="new-students-widget mb-4" role="button" tabindex="0" style="cursor:pointer;position:relative;" onclick="App.openCreateStudentModal()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();App.openCreateStudentModal();}" title="Neuen Fahrschueler anlegen">' +
        '<div class="new-students-header">' +
          '<div class="new-students-icon-wrap">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>' +
          '</div>' +
          '<div class="new-students-text">' +
            '<div class="new-students-count">' + newStudents.length + '</div>' +
            '<div class="new-students-label">' + t('neueSchueler') + '</div>' +
          '</div>' +
          '<div style="margin-left:auto;display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.25);flex-shrink:0;" title="Neuen Fahrschueler anlegen">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          '</div>' +
        '</div>';
      // Liste der neuen Schueler entfernt - sie sind ohnehin in der Schuelerliste weiter unten zu sehen
      html += '</div>';

      // ──── TAGESÜBERSICHT-BUTTON (modus-abhängig) ────
      var _accMode = (school.accounting_mode || 'gobd');
      if (_accMode === 'gobd') {
        html += '<button onclick="App.openDailySummary()" class="daily-summary-cta" data-accounting-feature style="width:100%;display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:#fff;border:none;border-radius:var(--radius-md);margin-bottom:var(--space-4);cursor:pointer;text-align:left;box-shadow:0 2px 8px rgba(59,130,246,0.25);">' +
          '<div style="font-size:28px;line-height:1;">📋</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:15px;font-weight:700;">Tagesübersicht öffnen</div>' +
            '<div style="font-size:12px;opacity:.9;margin-top:2px;">Soll-Positionen drucken, exportieren oder abhaken</div>' +
          '</div>' +
          '<div style="font-size:20px;opacity:.7;">→</div>' +
        '</button>';
      } else {
        html += '<button onclick="App.openActivityOverview()" class="daily-summary-cta" style="width:100%;display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:linear-gradient(135deg,#6366f1 0%,#4338ca 100%);color:#fff;border:none;border-radius:var(--radius-md);margin-bottom:var(--space-4);cursor:pointer;text-align:left;box-shadow:0 2px 8px rgba(99,102,241,0.25);">' +
          '<div style="font-size:28px;line-height:1;">📋</div>' +
          '<div style="flex:1;">' +
            '<div style="font-size:15px;font-weight:700;">Tätigkeitsübersicht öffnen</div>' +
            '<div style="font-size:12px;opacity:.9;margin-top:2px;">Gefahrene Fahrstunden des Tages / der Woche drucken</div>' +
          '</div>' +
          '<div style="font-size:20px;opacity:.7;">→</div>' +
        '</button>';
      }

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
    var self = this;
    this.initWeek();
    var w = this.getWeekDates(AppState.scheduleWeekStart);
    var wsStr = formatDateLocal(w.monday);
    var weStr = formatDateLocal(w.saturday);
    var instFilter = AppState.scheduleSelectedInstructor || '';

    // TTL cache (30s) keyed by week+instructor — instant re-render on tab switch / week nav back
    var cacheKey = wsStr + '|' + instFilter;
    AppState._cachedData = AppState._cachedData || {};
    AppState._cachedData._scheduleBundle = AppState._cachedData._scheduleBundle || {};
    var cached = AppState._cachedData._scheduleBundle[cacheKey];
    var cacheValid = cached && (Date.now() - cached.ts) < 30000;
    if (!cacheValid) {
      main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    }

    var url = '/api/schedule?weekStart=' + wsStr + '&weekEnd=' + weStr;
    if (instFilter) url += '&instructorId=' + instFilter;
    try {
      var data, theorySchedule;
      if (cacheValid) {
        data = cached.scheduleData;
        theorySchedule = cached.theorySchedule;
      } else {
        // Parallel: schedule + theory schedule (eliminates sequential waterfall)
        var results = await Promise.all([
          ApiClient.get(url),
          ApiClient.get('/api/theory/schedule?week_start=' + wsStr).catch(function(){ return []; })
        ]);
        data = results[0];
        theorySchedule = results[1] || [];
      }
      AppState.scheduleData = data;
      var instructors = data.instructors || [];
      if (!instFilter && instructors.length > 0) {
        // Auto-select first instructor without a second network round-trip:
        // filter the already-loaded slots client-side.
        AppState.scheduleSelectedInstructor = instructors[0].id;
        instFilter = instructors[0].id;
        var filtered = (data.slots || []).filter(function(s) {
          return !s.instructor_id || s.instructor_id === instFilter;
        });
        data = { slots: filtered, instructors: instructors };
        AppState.scheduleData = data;
        cacheKey = wsStr + '|' + instFilter;
      }
      // Store in cache
      AppState._cachedData._scheduleBundle[cacheKey] = {
        ts: Date.now(),
        scheduleData: data,
        theorySchedule: theorySchedule
      };

      var html = '<div class="page-padding' + (AppState.multiViewCount > 1 ? ' multi-view-active' : '') + '">';
      // Instructor filter (hidden in multi-view, each panel has its own)
      html += '<div class="schedule-toolbar">';
      if (AppState.multiViewCount === 1) {
        html += '<select class="form-select" id="school-instructor-filter" onchange="AppState.scheduleSelectedInstructor=this.value;AppState.scheduleData=null;if(AppState._cachedData)AppState._cachedData._scheduleBundle=null;App.renderSchoolScheduleTab()">';
        instructors.forEach(function(inst) {
          html += '<option value="' + inst.id + '"' + (inst.id === AppState.scheduleSelectedInstructor ? ' selected' : '') + '>' + inst.name + '</option>';
        });
        html += '</select>';
      }
      html += '<button class="btn btn-primary btn-sm" onclick="App.openScheduleModal(null, null, null, AppState.scheduleSelectedInstructor)">' + t('plusTermin') + '</button>' +
        '<button class="btn btn-ghost btn-sm" style="border:1px solid var(--color-border);" onclick="App.openBlockModal(null, null, AppState.scheduleSelectedInstructor)">' + t('plusZeitsperre') + '</button>' +
        '<button class="btn btn-sm" style="background:' + (AppState.slotOfferMode ? '#2563eb' : '#334155') + ';color:#fff;border:none;font-weight:600;" onclick="App.toggleSlotOfferMode()">' + t('termineAnbieten') + '</button>' +
        (AppState.slotOfferMode && AppState.slotOfferSelected.length > 0 ? '<button class="btn btn-sm" style="background:#16a34a;color:#fff;border:none;font-weight:600;" onclick="App.openSlotOfferDialog()">' + t('anbieten') + ' (' + AppState.slotOfferSelected.length + ')</button>' : '') +
        '<button class="btn btn-sm" style="background:#475569;color:#fff;border:none;" onclick="App.showSlotOfferManagement()">' + t('meineAngebote') + '</button>' +
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
      var slots = (data.slots || []).slice();

      // Merge theory schedule into slots (theorySchedule already loaded in parallel above)
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
    AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
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
      AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
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
      ApiClient.get('/api/school/vehicles').then(function(resp) {
        var vList = (resp && resp.vehicles) ? resp.vehicles : (Array.isArray(resp) ? resp : []);
        var vehOptions = '<option value="">' + t('keinFahrzeug') + '</option>';
        vList.forEach(function(v) {
          vehOptions += '<option value="' + v.id + '">' + (v.brand || v.make || '') + ' (' + (v.license_plate || v.plate || '') + ')</option>';
        });
        self.openModal(t('termineAnbieten'),
          '<div class="slot-offer-dialog">' +
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
      }).catch(function(err) {
        console.error('[SlotOffer] vehicles fetch error:', err);
        self.openModal(t('termineAnbieten'), '<div class="slot-offer-dialog"><div class="slot-offer-slots-list mb-3">' + slotsHtml + '</div><div class="slot-offer-student-list">' + stuHtml + '</div><button class="btn btn-primary btn-full btn-lg" onclick="App.submitSlotOffer()">' + t('abschicken') + '</button></div>');
      });
    }).catch(function(err) {
      console.error('[SlotOffer] dashboard fetch error:', err);
      self.showToast(t('fehler') + ': ' + (err.message || err));
    });
  },

  openOfferSlotDetail: function(offerId) {
    // When user clicks a pending offer slot in the calendar, show management view
    this.showSlotOfferManagement();
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
              '<span class="offer-slot-status ' + sClass + '">' + sText + '</span>';
            // Edit + Delete buttons (only for open slots)
            if (slot.status === 'open') {
              html += '<div class="offer-slot-actions">' +
                '<button class="btn-icon btn-icon-edit" title="' + t('bearbeiten') + '" onclick="App.editOfferSlot(\'' + slot.id + '\',\'' + slot.date + '\',\'' + slot.start_time + '\',\'' + slot.end_time + '\',' + (slot.duration_min || 90) + ')">\u270F\uFE0F</button>' +
                '<button class="btn-icon btn-icon-delete" title="' + t('loeschen') + '" onclick="App.deleteOfferSlot(\'' + slot.id + '\')">\uD83D\uDDD1\uFE0F</button>' +
              '</div>';
            }
            html += '</div>';
          });
          html += '</div>';
          html += '<div class="offer-card-footer">';
          html += '<div class="text-xs text-muted">' + t('empfaenger') + ': ' + (offer.recipients || []).length + ' ' + t('schueler') + '</div>';
          html += '<button class="btn btn-sm btn-danger-outline" onclick="App.deleteOffer(\'' + offer.id + '\')" style="margin-left:auto;">' + t('angebotLoeschen') + '</button>';
          html += '</div>';
          html += '</div>';
        });
      }
      html += '</div>';
      self.openModal(t('meineAngebote'), html);
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  editOfferSlot: function(slotId, date, start, end, duration) {
    var self = this;
    var html = '<div style="padding:var(--space-2);max-width:420px;">' +
      '<div class="form-group"><label class="form-label">' + t('datum') + '</label>' +
        '<input type="date" id="edit-slot-date" class="form-input" value="' + date + '"></div>' +
      '<div style="display:flex;gap:var(--space-2);">' +
        '<div class="form-group" style="flex:1;"><label class="form-label">' + t('start') + '</label>' +
          '<input type="time" id="edit-slot-start" class="form-input" value="' + (start || '').substring(0,5) + '"></div>' +
        '<div class="form-group" style="flex:1;"><label class="form-label">' + t('ende') + '</label>' +
          '<input type="time" id="edit-slot-end" class="form-input" value="' + (end || '').substring(0,5) + '"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">' + t('dauer') + ' (min)</label>' +
        '<input type="number" id="edit-slot-duration" class="form-input" value="' + (duration || 90) + '" min="15" step="15"></div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-secondary" onclick="App.closeModal()">' + t('abbrechen') + '</button>' +
        '<button class="btn btn-primary" onclick="App.submitEditOfferSlot(\'' + slotId + '\')">' + t('speichern') + '</button>' +
      '</div>' +
    '</div>';
    self.openModal(t('bearbeiten'), html);
  },

  submitEditOfferSlot: async function(slotId) {
    var self = this;
    var dateEl = document.getElementById('edit-slot-date');
    var startEl = document.getElementById('edit-slot-start');
    var endEl = document.getElementById('edit-slot-end');
    var durEl = document.getElementById('edit-slot-duration');
    if (!dateEl || !startEl || !endEl) return;
    var payload = {
      date: dateEl.value,
      start_time: startEl.value,
      end_time: endEl.value,
      duration_min: parseInt(durEl && durEl.value || '90', 10) || 90
    };
    if (!payload.date || !payload.start_time || !payload.end_time) {
      self.showToast(t('fehler'));
      return;
    }
    try {
      await ApiClient.put('/api/slot-offers/slot/' + slotId, payload);
      self.closeModal();
      self.showToast(t('slotBearbeitet'));
      self.showSlotOfferManagement();
      if (typeof self.renderSchedule === 'function') { try { self.renderSchedule(); } catch(e){} }
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  deleteOfferSlot: async function(slotId) {
    var self = this;
    if (!window.confirm(t('slotLoeschenBestaetigung'))) return;
    try {
      await ApiClient.del('/api/slot-offers/slot/' + slotId);
      self.showToast(t('slotGeloescht'));
      self.showSlotOfferManagement();
      if (typeof self.renderSchedule === 'function') { try { self.renderSchedule(); } catch(e){} }
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  deleteOffer: async function(offerId) {
    var self = this;
    if (!window.confirm(t('angebotLoeschenBestaetigung'))) return;
    try {
      await ApiClient.del('/api/slot-offers/' + offerId);
      self.showToast(t('angebotGeloescht'));
      self.showSlotOfferManagement();
      if (typeof self.renderSchedule === 'function') { try { self.renderSchedule(); } catch(e){} }
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
    var cache = AppState._cachedData._theoryBundle;
    var cacheTs = AppState._cachedData._theoryBundleTs || 0;
    if (!cache || (Date.now() - cacheTs) > 60000) {
      main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    }
    try {
      var rooms, topics, rotations;
      if (cache && (Date.now() - cacheTs) <= 60000) {
        rooms = cache.rooms; topics = cache.topics; rotations = cache.rotations;
      } else {
        // Parallel: 3 Calls auf einmal
        var res = await Promise.all([
          ApiClient.get('/api/theory/rooms'),
          ApiClient.get('/api/theory/topics'),
          ApiClient.get('/api/theory/rotation')
        ]);
        rooms = res[0]; topics = res[1]; rotations = res[2];
        if ((!topics || topics.length === 0) && (!topics || !topics.message)) {
          topics = await ApiClient.post('/api/theory/topics', {});
          if (topics && topics.message) {
            topics = await ApiClient.get('/api/theory/topics');
          }
        }
        AppState._cachedData._theoryBundle = { rooms: rooms, topics: topics, rotations: rotations };
        AppState._cachedData._theoryBundleTs = Date.now();
      }
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
      AppState._cachedData._theoryBundle = null;
      this.showTheoryView();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  deleteTheoryRoom: async function(roomId) {
    if (!confirm(t('loeschen') + '?')) return;
    try {
      await ApiClient.del('/api/theory/rooms/' + roomId);
      this.showToast(t('raumGeloescht'));
      AppState._cachedData._theoryBundle = null;
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
      AppState._cachedData._theoryBundle = null;
      this.showTheoryView();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  deleteTheoryRotation: async function(rotId) {
    if (!confirm(t('rotationLoeschenBestaetigen'))) return;
    try {
      await ApiClient.del('/api/theory/rotation/' + rotId);
      this.showToast(t('geloescht'));
      AppState._cachedData._theoryBundle = null;
      this.showTheoryView();
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  deleteAllTheoryRotations: async function() {
    if (!confirm(t('alleRotationenLoeschenBestaetigen'))) return;
    try {
      await ApiClient.del('/api/theory/rotation');
      this.showToast(t('geloescht'));
      AppState._cachedData._theoryBundle = null;
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
      App._lastSubState = sub;
      var statusLabels = { trial: 'Testphase', active: 'Aktiv', free: 'Gratis-Abo', expired: 'Abgelaufen' };
      var statusColors = { trial: 'warning', active: 'success', free: 'success', expired: 'error' };
      var statusLabel = statusLabels[sub.status] || sub.status;
      var statusColor = statusColors[sub.status] || 'muted';
      var currentPlan = sub.plan || null;
      var hasStripe = !!sub.has_stripe;

      var html = '<div class="page-padding" style="max-width:1100px;margin:0 auto;">';

      // Status-Header
      html += '<div class="card mb-4" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;">' +
        '<div><div style="font-size:var(--text-lg);font-weight:700;">Dein Abo</div>' +
        '<div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:4px;">' + (currentPlan === 'ki' ? 'FahrDoc KI' : (currentPlan === 'classic' ? 'FahrDoc Classic' : 'Noch kein Tarif gew\u00e4hlt')) + '</div></div>' +
        '<span class="badge badge-' + statusColor + '" style="font-size:var(--text-sm);padding:6px 12px;">' + statusLabel + '</span>' +
      '</div>';

      // Trial-Info / Lock-Banner
      if (sub.status === 'trial' && sub.days_remaining !== null) {
        var urgent = sub.days_remaining <= 3;
        html += '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:' + (urgent ? '#ffeaea' : '#fff8e1') + ';border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--text-sm);border-left:4px solid ' + (urgent ? '#c62828' : '#f9a825') + ';">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' +
          '<div><strong>Testphase: noch ' + sub.days_remaining + ' Tag' + (sub.days_remaining === 1 ? '' : 'e') + '</strong><br><span style="color:var(--text-muted);">W\u00e4hle unten einen Tarif, um nahtlos weiterzunutzen.</span></div>' +
        '</div>';
      }
      if (!sub.active && sub.lock_reason) {
        html += '<div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);background:#ffeaea;border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--text-sm);border-left:4px solid #c62828;">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="2" style="width:20px;height:20px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
          '<div><strong style="color:#c62828;">App gesperrt</strong><br>' + sub.lock_reason + '</div>' +
        '</div>';
      }
      if (sub.cancel_at_period_end && sub.current_period_end) {
        html += '<div style="padding:var(--space-3) var(--space-4);background:#fff8e1;border-radius:var(--radius-md);margin-bottom:var(--space-4);font-size:var(--text-sm);">Abo wird zum ' + new Date(sub.current_period_end).toLocaleDateString('de-DE') + ' beendet. Du kannst jederzeit re-aktivieren.</div>';
      }

      // Tarif-Karten
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:var(--space-4);margin-bottom:var(--space-5);">';

      // Classic-Karte
      var classicActive = currentPlan === 'classic' && sub.active;
      html += '<div class="card" style="display:flex;flex-direction:column;border:2px solid ' + (classicActive ? '#2e7d32' : 'var(--border-color)') + ';position:relative;">' +
        (classicActive ? '<div style="position:absolute;top:-12px;right:16px;background:#2e7d32;color:#fff;padding:4px 12px;border-radius:12px;font-size:var(--text-xs);font-weight:600;">Aktiver Tarif</div>' : '') +
        '<div style="font-size:var(--text-xl);font-weight:700;margin-bottom:8px;">FahrDoc Classic</div>' +
        '<div style="margin-bottom:var(--space-3);"><span style="font-size:var(--text-3xl,32px);font-weight:800;">29,99 \u20ac</span><span style="color:var(--text-muted);font-size:var(--text-sm);"> / Fahrlehrer / Monat</span></div>' +
        '<ul style="list-style:none;padding:0;margin:0 0 var(--space-4) 0;font-size:var(--text-sm);flex:1;">' +
        '<li style="padding:6px 0;">\u2713 Unbegrenzte Sch\u00fcler</li>' +
        '<li style="padding:6px 0;">\u2713 Skaliert pro Fahrlehrer</li>' +
        '<li style="padding:6px 0;">\u2713 Kalender & Slot-Buchung</li>' +
        '<li style="padding:6px 0;">\u2713 Schein-Verwaltung</li>' +
        '<li style="padding:6px 0;">\u2713 PDF-Bescheinigungen</li>' +
        '<li style="padding:6px 0;">\u2713 Email-Support</li>' +
        '</ul>' +
        (classicActive ? '<button class="btn btn-secondary btn-full" disabled>Aktueller Tarif</button>' :
         '<button class="btn ' + (currentPlan === 'ki' ? 'btn-secondary' : 'btn-primary') + ' btn-full" onclick="App.stripeCheckout(\'classic\')">' + (hasStripe ? 'Zu Classic wechseln' : 'Classic w\u00e4hlen') + '</button>') +
      '</div>';

      // KI-Karte (highlighted)
      var kiActive = currentPlan === 'ki' && sub.active;
      html += '<div class="card" style="display:flex;flex-direction:column;border:2px solid ' + (kiActive ? '#2e7d32' : '#1565c0') + ';position:relative;background:linear-gradient(180deg, #f3f8ff 0%, #ffffff 100%);">' +
        (kiActive ? '<div style="position:absolute;top:-12px;right:16px;background:#2e7d32;color:#fff;padding:4px 12px;border-radius:12px;font-size:var(--text-xs);font-weight:600;">Aktiver Tarif</div>' :
          '<div style="position:absolute;top:-12px;right:16px;background:#1565c0;color:#fff;padding:4px 12px;border-radius:12px;font-size:var(--text-xs);font-weight:600;">Empfohlen</div>') +
        '<div style="font-size:var(--text-xl);font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px;">FahrDoc KI <span style="font-size:18px;">\u2728</span></div>' +
        '<div style="margin-bottom:var(--space-3);"><span style="font-size:var(--text-3xl,32px);font-weight:800;">39,99 \u20ac</span><span style="color:var(--text-muted);font-size:var(--text-sm);"> / Fahrlehrer / Monat</span></div>' +
        '<ul style="list-style:none;padding:0;margin:0 0 var(--space-4) 0;font-size:var(--text-sm);flex:1;">' +
        '<li style="padding:6px 0;"><strong>Alles aus Classic</strong></li>' +
        '<li style="padding:6px 0;color:#1565c0;">\u2728 <strong>KI-Briefing</strong> vor jeder Fahrstunde</li>' +
        '<li style="padding:6px 0;color:#1565c0;">\u2728 Automatische Lernfortschritt-Analyse</li>' +
        '<li style="padding:6px 0;color:#1565c0;">\u2728 Unbegrenzte KI-Anfragen</li>' +
        '<li style="padding:6px 0;">\u2713 Priorit\u00e4ts-Support</li>' +
        '</ul>' +
        (kiActive ? '<button class="btn btn-secondary btn-full" disabled>Aktueller Tarif</button>' :
         '<button class="btn btn-primary btn-full" onclick="App.stripeCheckout(\'ki\')">' + (hasStripe ? 'Zu KI upgraden' : 'KI w\u00e4hlen') + '</button>') +
      '</div>';

      html += '</div>';

      // Abo verwalten (nur wenn Stripe-Abo existiert)
      if (hasStripe) {
        // Plaetze-Info wenn vorhanden
        var seatsBlock = '';
        if (sub.seats && sub.seats > 0) {
          var totalPrice = (sub.total_price || (sub.seats * (sub.unit_price || 0))).toFixed(2).replace('.', ',');
          var unit = (sub.unit_price || 0).toFixed(2).replace('.', ',');
          seatsBlock = '<div class="card mb-4" style="text-align:center;">' +
            '<div style="font-weight:600;margin-bottom:8px;">Fahrlehrer-Pl\u00e4tze</div>' +
            '<div style="display:flex;justify-content:center;gap:24px;margin-bottom:var(--space-3);">' +
              '<div><div style="font-size:28px;font-weight:800;color:#1565c0;">' + sub.seats + '</div><div style="font-size:12px;color:var(--text-muted);">gebucht</div></div>' +
              '<div><div style="font-size:28px;font-weight:800;color:' + ((sub.used_instructor_seats||0) >= sub.seats ? '#f57c00' : '#2e7d32') + ';">' + (sub.used_instructor_seats || 0) + '</div><div style="font-size:12px;color:var(--text-muted);">belegt</div></div>' +
            '</div>' +
            '<p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">' + totalPrice + ' \u20ac / Monat (' + sub.seats + ' \u00d7 ' + unit + ' \u20ac)</p>' +
            '<button class="btn btn-primary" onclick="App.openSeatsAdjustModal()">Pl\u00e4tze anpassen</button>' +
          '</div>';
        }
        html += seatsBlock;
        html += '<div class="card mb-4" style="text-align:center;">' +
          '<div style="font-weight:600;margin-bottom:8px;">Abo verwalten</div>' +
          '<p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">Rechnungen, Zahlungsmethode oder K\u00fcndigung</p>' +
          '<button class="btn btn-secondary" onclick="App.stripePortal()">Zum Stripe-Kundenportal</button>' +
        '</div>';
      }

      // Hinweis bei Trial-Status auf Testphase ohne Karte
      if (!hasStripe) {
        html += '<p style="font-size:var(--text-xs);color:var(--text-muted);text-align:center;margin-top:var(--space-2);">Erste Zahlung erst nach Tarif-Auswahl. Jederzeit k\u00fcndbar.</p>';
      }

      html += '</div>';
      main.innerHTML = html;
    } catch (err) {
      main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + (err.message || err) + '</p></div>';
    }
  },

  // ============================================================
  // SUPER-ADMIN TAB
  // ============================================================
  renderSuperAdminTab: async function() {
    var main = document.getElementById('school-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var results = await Promise.all([ ApiClient.get('/api/admin/schools'), ApiClient.get('/api/admin/stats').catch(function(){ return null; }) ]);
      var data = results[0];
      var stats = results[1];
      var schools = data.schools || [];
      var h = '<div class="page-padding" style="max-width:1400px;margin:0 auto;">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-4);">' +
        '<h2 style="font-size:var(--text-xl);font-weight:700;margin:0;">Super-Admin Dashboard</h2>' +
        '<span class="badge badge-muted">' + schools.length + ' Fahrschulen</span>' +
      '</div>';

      // ── Statistik-Karten ──
      if (stats) {
        var fmtEur = function(n) { return (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'; };
        h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-3);margin-bottom:var(--space-5);">';
        // MRR Karte (Hero)
        h += '<div class="card" style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);color:white;border:none;">' +
          '<div style="font-size:var(--text-xs);text-transform:uppercase;opacity:.85;letter-spacing:.5px;margin-bottom:6px;">MRR (Monatsumsatz)</div>' +
          '<div style="font-size:28px;font-weight:700;line-height:1.1;">' + fmtEur(stats.mrr) + '</div>' +
          '<div style="font-size:var(--text-xs);opacity:.85;margin-top:4px;">ARR: ' + fmtEur(stats.arr) + '</div>' +
        '</div>';
        // Aktive Abos
        h += '<div class="card">' +
          '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px;">Aktive Abos</div>' +
          '<div style="font-size:28px;font-weight:700;line-height:1.1;color:#0d9488;">' + stats.active_stripe + '</div>' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">' + stats.active_classic + '\u00d7 Classic \u00b7 ' + stats.active_ki + '\u00d7 KI</div>' +
        '</div>';
        // Trial-Schulen
        h += '<div class="card">' +
          '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px;">Im Trial</div>' +
          '<div style="font-size:28px;font-weight:700;line-height:1.1;color:#d97706;">' + stats.trialing + '</div>' +
          '<div style="font-size:var(--text-xs);color:' + (stats.trial_ending_soon > 0 ? '#dc2626' : 'var(--text-muted)') + ';margin-top:4px;font-weight:' + (stats.trial_ending_soon > 0 ? '600' : '400') + ';">' +
            (stats.trial_ending_soon > 0 ? '\u26a0\ufe0f ' + stats.trial_ending_soon + ' laufen in \u2264 3 Tagen ab' : 'Alle haben noch Zeit') +
          '</div>' +
        '</div>';
        // Schulen gesamt + neu
        h += '<div class="card">' +
          '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px;">Fahrschulen Gesamt</div>' +
          '<div style="font-size:28px;font-weight:700;line-height:1.1;">' + stats.schools_total + '</div>' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">+' + stats.schools_new_30d + ' in den letzten 30 Tagen</div>' +
        '</div>';
        h += '</div>';

        // ── Sekundär-Stats ──
        h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3);margin-bottom:var(--space-5);">';
        // KI-Briefings
        h += '<div class="card" style="background:linear-gradient(135deg,#f3f8ff 0%,#e8f0fe 100%);border:1px solid #c5dafa;">' +
          '<div style="font-size:var(--text-xs);text-transform:uppercase;color:#1565c0;letter-spacing:.5px;margin-bottom:6px;">\u2728 KI-Briefings</div>' +
          '<div style="font-size:22px;font-weight:700;line-height:1.1;color:#1565c0;">' + stats.ai_briefings_total + '</div>' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">Heute: ' + stats.ai_briefings_today + ' \u00b7 Monat: ' + stats.ai_briefings_this_month + '</div>' +
        '</div>';
        // Gratis-Abos
        h += '<div class="card">' +
          '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px;">\ud83c\udf81 Gratis-Abos</div>' +
          '<div style="font-size:22px;font-weight:700;line-height:1.1;">' + stats.free_subscriptions + '</div>' +
        '</div>';
        // Kuendigungen ausstehend
        h += '<div class="card">' +
          '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px;">Gek\u00fcndigt (l\u00e4uft aus)</div>' +
          '<div style="font-size:22px;font-weight:700;line-height:1.1;color:' + (stats.cancellations_pending > 0 ? '#dc2626' : 'inherit') + ';">' + stats.cancellations_pending + '</div>' +
        '</div>';
        // Abgelaufene Schulen
        h += '<div class="card">' +
          '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px;">Abgelaufen / Gesperrt</div>' +
          '<div style="font-size:22px;font-weight:700;line-height:1.1;color:#71717a;">' + stats.expired + '</div>' +
        '</div>';
        h += '</div>';
      }

      h += '<h3 style="font-size:var(--text-lg);font-weight:600;margin:0 0 var(--space-3);">Fahrschulen verwalten</h3>';
      h += '<div class="card" style="padding:0;overflow:auto;">';
      h += '<table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">' +
        '<thead><tr style="background:var(--bg-elevated);text-align:left;border-bottom:2px solid var(--border-color);">' +
          '<th style="padding:12px;">Fahrschule</th>' +
          '<th style="padding:12px;">Email</th>' +
          '<th style="padding:12px;">Status</th>' +
          '<th style="padding:12px;">Tarif</th>' +
          '<th style="padding:12px;">Tage</th>' +
          '<th style="padding:12px;text-align:right;">Aktionen</th>' +
        '</tr></thead><tbody>';

      schools.forEach(function(s){
        var statusBadge = s.active ? '<span class="badge badge-success">Aktiv</span>' : '<span class="badge badge-error">Gesperrt</span>';
        var planLabel = s.plan === 'ki' ? 'KI \u2728' : (s.plan === 'classic' ? 'Classic' : (s.status === 'trial' ? 'Trial' : '\u2014'));
        var daysLabel = s.days_remaining !== null ? s.days_remaining + ' Tage' : '\u221E';
        if (s.free_subscription) planLabel = '\ud83c\udf81 Gratis (' + (s.plan || 'ki') + ')';
        h += '<tr style="border-bottom:1px solid var(--border-color);">' +
          '<td style="padding:12px;"><strong>' + (s.name || '\u2014') + '</strong><br><span style="font-size:var(--text-xs);color:var(--text-muted);">' + (s.admin_name || '') + '</span></td>' +
          '<td style="padding:12px;font-size:var(--text-xs);color:var(--text-muted);">' + s.email + '</td>' +
          '<td style="padding:12px;">' + statusBadge + '</td>' +
          '<td style="padding:12px;">' + planLabel + '</td>' +
          '<td style="padding:12px;">' + daysLabel + '</td>' +
          '<td style="padding:12px;text-align:right;white-space:nowrap;">' +
            '<button class="btn btn-sm" onclick="App.adminExtendTrial(\'' + s.id + '\', \'' + (s.name || '').replace(/\x27/g, "\\\x27") + '\')">+Trial</button> ' +
            '<button class="btn btn-sm btn-secondary" onclick="App.adminToggleFree(\'' + s.id + '\', \'' + (s.name || '').replace(/\x27/g, "\\\x27") + '\', ' + (s.free_subscription ? 'true' : 'false') + ')">' + (s.free_subscription ? 'Gratis-Abo entziehen' : 'Gratis-Abo geben') + '</button>' +
          '</td>' +
        '</tr>';
      });
      h += '</tbody></table></div></div>';
      main.innerHTML = h;
    } catch (err) {
      main.innerHTML = '<div class="page-padding"><div class="card"><p>' + t('fehler') + ': ' + (err.message || err) + '</p></div></div>';
    }
  },

  adminExtendTrial: async function(schoolId, schoolName) {
    var daysStr = prompt('Trial f\u00fcr "' + schoolName + '" um wie viele Tage verl\u00e4ngern?', '14');
    if (!daysStr) return;
    var days = parseInt(daysStr);
    if (!days || days < 1) return App.showToast('Ung\u00fcltige Anzahl');
    try {
      await ApiClient.put('/api/admin/schools/' + schoolId + '/extend-trial', { days: days });
      App.showToast('Trial um ' + days + ' Tage verl\u00e4ngert');
      App.renderSuperAdminTab();
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  adminToggleFree: async function(schoolId, schoolName, currentlyFree) {
    if (currentlyFree) {
      if (!confirm('Gratis-Abo f\u00fcr "' + schoolName + '" entziehen?')) return;
      try {
        await ApiClient.put('/api/admin/schools/' + schoolId + '/free-subscription', { enable: false });
        App.showToast('Gratis-Abo entzogen');
        App.renderSuperAdminTab();
      } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
      return;
    }
    var plan = prompt('Welcher Tarif gratis? (classic / ki)', 'ki');
    if (!plan || (plan !== 'classic' && plan !== 'ki')) return App.showToast('Ung\u00fcltiger Tarif');
    var daysStr = prompt('Wie viele Tage gratis? (leer = unbegrenzt)', '90');
    var days = daysStr ? parseInt(daysStr) : null;
    try {
      await ApiClient.put('/api/admin/schools/' + schoolId + '/free-subscription', { enable: true, plan: plan, days: days });
      App.showToast('Gratis-Abo gew\u00e4hrt' + (days ? ' (' + days + ' Tage)' : ' (unbegrenzt)'));
      App.renderSuperAdminTab();
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  stripeCheckout: async function(plan) {
    try {
      var planName = plan === 'ki' ? 'ki' : 'classic';
      // Erst Plaetze-Wahl-Modal oeffnen
      App.openSeatsPickerModal(planName);
      // Modal nach oben heben damit es ueber dem Subscription-Lock-Overlay liegt
      setTimeout(function(){
        var mb = document.getElementById('modal-backdrop');
        if (mb) mb.style.zIndex = '10001';
      }, 0);
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  // ============================================================
  // PLAETZE-WAHL: Modal vor Stripe-Checkout
  // ============================================================
  openSeatsPickerModal: async function(planName) {
    var unitPrice = planName === 'ki' ? 39.99 : 29.99;
    var planLabel = planName === 'ki' ? 'FahrDoc KI' : 'FahrDoc Classic';
    // Aktuell eingeloeste Fahrlehrer-Codes als Default
    var defaultSeats = 1;
    var minSeats = 1;
    try {
      var sub = await ApiClient.get('/api/stripe/subscription');
      var used = sub && sub.used_instructor_seats ? sub.used_instructor_seats : 0;
      defaultSeats = Math.max(1, used);
      minSeats = Math.max(1, used);
    } catch(e) { /* default 1 */ }

    App._seatsPickerState = { planName: planName, unitPrice: unitPrice, seats: defaultSeats, minSeats: minSeats };

    var html = '<div style="padding:8px 0;">' +
      '<div style="text-align:center;margin-bottom:16px;">' +
        '<div style="font-size:18px;font-weight:700;color:#1565c0;">' + planLabel + '</div>' +
        '<div style="font-size:13px;color:#666;margin-top:4px;">' + unitPrice.toFixed(2).replace('.', ',') + ' \u20ac pro Fahrlehrer / Monat</div>' +
      '</div>' +
      '<div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:16px;">' +
        '<div style="text-align:center;font-size:14px;color:#444;margin-bottom:12px;">Wie viele Fahrlehrer-Pl\u00e4tze m\u00f6chtest du buchen?</div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:16px;">' +
          '<button id="seats-minus" class="btn btn-secondary" onclick="App.adjustSeats(-1)" style="width:48px;height:48px;font-size:22px;padding:0;border-radius:50%;">\u2212</button>' +
          '<div id="seats-value" style="font-size:36px;font-weight:800;min-width:60px;text-align:center;color:#1565c0;">' + defaultSeats + '</div>' +
          '<button class="btn btn-secondary" onclick="App.adjustSeats(1)" style="width:48px;height:48px;font-size:22px;padding:0;border-radius:50%;">+</button>' +
        '</div>' +
        (minSeats > 1 ? '<div style="text-align:center;font-size:12px;color:#888;margin-top:10px;">\u2139\ufe0f Du hast aktuell ' + minSeats + ' Fahrlehrer-Codes eingel\u00f6st. Mindestens so viele Pl\u00e4tze sind n\u00f6tig.</div>' : '<div style="text-align:center;font-size:12px;color:#888;margin-top:10px;">Du kannst sp\u00e4ter jederzeit weitere Pl\u00e4tze hinzubuchen.</div>') +
      '</div>' +
      '<div style="background:#e8f5e9;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">' +
        '<div style="font-size:13px;color:#2e7d32;margin-bottom:4px;">Gesamtpreis</div>' +
        '<div id="seats-total" style="font-size:24px;font-weight:800;color:#2e7d32;">' + (defaultSeats * unitPrice).toFixed(2).replace('.', ',') + ' \u20ac / Monat</div>' +
        '<div id="seats-calc" style="font-size:12px;color:#558b2f;margin-top:4px;">' + defaultSeats + ' \u00d7 ' + unitPrice.toFixed(2).replace('.', ',') + ' \u20ac</div>' +
      '</div>' +
      '<button class="btn btn-primary" onclick="App.confirmSeatsCheckout()" style="width:100%;padding:14px;font-size:16px;">Weiter zum Checkout</button>' +
      '<button class="btn btn-ghost" onclick="App.closeModalForce()" style="width:100%;margin-top:8px;">Abbrechen</button>' +
    '</div>';
    App.openModal('Pl\u00e4tze w\u00e4hlen', html);
  },

  adjustSeats: function(delta) {
    var st = App._seatsPickerState;
    if (!st) return;
    var next = st.seats + delta;
    if (next < st.minSeats) next = st.minSeats;
    if (next > 100) next = 100;
    st.seats = next;
    var valEl = document.getElementById('seats-value');
    var totEl = document.getElementById('seats-total');
    var calcEl = document.getElementById('seats-calc');
    var minusBtn = document.getElementById('seats-minus');
    if (valEl) valEl.textContent = next;
    if (totEl) totEl.textContent = (next * st.unitPrice).toFixed(2).replace('.', ',') + ' \u20ac / Monat';
    if (calcEl) calcEl.textContent = next + ' \u00d7 ' + st.unitPrice.toFixed(2).replace('.', ',') + ' \u20ac';
    if (minusBtn) minusBtn.disabled = (next <= st.minSeats);
  },

  confirmSeatsCheckout: async function() {
    var st = App._seatsPickerState;
    if (!st) return;
    App.closeModalForce();
    try {
      App.showToast('Weiterleitung zu Stripe...');
      var result = await ApiClient.post('/api/stripe/create-checkout', { plan: st.planName, quantity: st.seats });
      if (result.url) window.location.href = result.url;
      else App.showToast('Fehler: Keine Checkout-URL erhalten');
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  // ============================================================
  // PLAETZE ANPASSEN (nach abgeschlossenem Abo)
  // ============================================================
  openSeatsAdjustModal: async function() {
    try {
      var sub = await ApiClient.get('/api/stripe/subscription');
      var currentSeats = sub.seats || 1;
      var unitPrice = sub.unit_price || (sub.plan === 'ki' ? 39.99 : 29.99);
      var minSeats = sub.used_instructor_seats || 1;
      if (minSeats < 1) minSeats = 1;
      App._seatsAdjustState = { seats: currentSeats, currentSeats: currentSeats, unitPrice: unitPrice, minSeats: minSeats };
      var html = '<div style="padding:8px 0;">' +
        '<div style="text-align:center;margin-bottom:16px;font-size:13px;color:#666;">Aktuell: <strong>' + currentSeats + '</strong> Pl\u00e4tze \u00b7 ' + (currentSeats * unitPrice).toFixed(2).replace('.', ',') + ' \u20ac / Monat</div>' +
        '<div style="background:#f8f9fa;border-radius:12px;padding:20px;margin-bottom:16px;">' +
          '<div style="text-align:center;font-size:14px;color:#444;margin-bottom:12px;">Neue Anzahl Fahrlehrer-Pl\u00e4tze</div>' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:16px;">' +
            '<button id="adj-minus" class="btn btn-secondary" onclick="App.adjustSeatsAdjust(-1)" style="width:48px;height:48px;font-size:22px;padding:0;border-radius:50%;">\u2212</button>' +
            '<div id="adj-value" style="font-size:36px;font-weight:800;min-width:60px;text-align:center;color:#1565c0;">' + currentSeats + '</div>' +
            '<button class="btn btn-secondary" onclick="App.adjustSeatsAdjust(1)" style="width:48px;height:48px;font-size:22px;padding:0;border-radius:50%;">+</button>' +
          '</div>' +
          '<div style="text-align:center;font-size:12px;color:#888;margin-top:10px;">Mindestens ' + minSeats + ' Platz' + (minSeats === 1 ? '' : 'e') + ' (aktive Fahrlehrer). \u00c4nderungen sind anteilig.</div>' +
        '</div>' +
        '<div style="background:#e8f5e9;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">' +
          '<div style="font-size:13px;color:#2e7d32;margin-bottom:4px;">Neuer Gesamtpreis</div>' +
          '<div id="adj-total" style="font-size:24px;font-weight:800;color:#2e7d32;">' + (currentSeats * unitPrice).toFixed(2).replace('.', ',') + ' \u20ac / Monat</div>' +
        '</div>' +
        '<button class="btn btn-primary" onclick="App.confirmSeatsAdjust()" style="width:100%;padding:14px;font-size:16px;">Pl\u00e4tze aktualisieren</button>' +
        '<button class="btn btn-ghost" onclick="App.closeModalForce()" style="width:100%;margin-top:8px;">Abbrechen</button>' +
      '</div>';
      App.openModal('Pl\u00e4tze anpassen', html);
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  adjustSeatsAdjust: function(delta) {
    var st = App._seatsAdjustState;
    if (!st) return;
    var next = st.seats + delta;
    if (next < st.minSeats) next = st.minSeats;
    if (next > 100) next = 100;
    st.seats = next;
    var valEl = document.getElementById('adj-value');
    var totEl = document.getElementById('adj-total');
    var minusBtn = document.getElementById('adj-minus');
    if (valEl) valEl.textContent = next;
    if (totEl) totEl.textContent = (next * st.unitPrice).toFixed(2).replace('.', ',') + ' \u20ac / Monat';
    if (minusBtn) minusBtn.disabled = (next <= st.minSeats);
  },

  confirmSeatsAdjust: async function() {
    var st = App._seatsAdjustState;
    if (!st) return;
    if (st.seats === st.currentSeats) { App.closeModalForce(); App.showToast('Keine \u00c4nderung'); return; }
    try {
      await ApiClient.post('/api/stripe/update-quantity', { quantity: st.seats });
      App.closeModalForce();
      App.showToast('Pl\u00e4tze aktualisiert: ' + st.seats);
      if (App.renderSchoolAboTab) App.renderSchoolAboTab();
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

  // ============================================================
  // LOCK-OVERLAY: zeigt sich wenn Testphase/Abo abgelaufen
  // ============================================================
  checkSubscriptionLock: async function() {
    if (!AppState.currentUser || AppState.currentUser.role !== 'school') return;
    try {
      var sub = await ApiClient.get('/api/stripe/subscription');
      App._lastSubState = sub;
      var overlay = document.getElementById('subscription-lock-overlay');
      if (!sub.active) {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'subscription-lock-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
          document.body.appendChild(overlay);
        }
        overlay.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;">' +
          '<div style="font-size:48px;margin-bottom:12px;">\ud83d\udd12</div>' +
          '<h2 style="font-size:24px;font-weight:700;margin:0 0 8px;">Testphase abgelaufen</h2>' +
          '<p style="color:#666;margin:0 0 24px;font-size:15px;">' + (sub.lock_reason || 'Bitte ein Abo abschliessen, um FahrDoc weiter zu nutzen.') + '</p>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
            '<button class="btn btn-secondary" onclick="App.stripeCheckout(\'classic\')" style="padding:14px;"><strong>Classic</strong><br><span style="font-size:13px;">ab 29,99\u20ac / Fahrlehrer</span></button>' +
            '<button class="btn btn-primary" onclick="App.stripeCheckout(\'ki\')" style="padding:14px;"><strong>KI \u2728</strong><br><span style="font-size:13px;">ab 39,99\u20ac / Fahrlehrer</span></button>' +
          '</div>' +
          '<button class="btn btn-link" onclick="App.stripePortal()" style="font-size:13px;color:#666;">Bestehendes Abo verwalten</button>' +
        '</div>';
        overlay.style.display = 'flex';
      } else if (overlay) {
        overlay.style.display = 'none';
      }
      // Banner bei wenigen Tagen Trial
      if (sub.status === 'trial' && sub.days_remaining !== null && sub.days_remaining <= 3) {
        App.showTrialBanner(sub.days_remaining);
      }
    } catch(e) { /* nicht blockieren */ }
  },

  showTrialBanner: function(days) {
    var banner = document.getElementById('global-trial-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'global-trial-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#fff8e1;border-bottom:2px solid #f9a825;padding:10px 16px;text-align:center;font-size:14px;z-index:1500;display:flex;align-items:center;justify-content:center;gap:12px;';
      document.body.appendChild(banner);
      document.body.style.paddingTop = '44px';
    }
    banner.innerHTML = '<span><strong>Testphase: noch ' + days + ' Tag' + (days === 1 ? '' : 'e') + '</strong></span>' +
      '<button class="btn btn-sm btn-primary" onclick="App.switchTab(\'school-abo\')">Tarif w\u00e4hlen</button>' +
      '<button onclick="this.parentElement.remove();document.body.style.paddingTop=\'\'" style="background:transparent;border:none;font-size:18px;cursor:pointer;padding:0 8px;color:#666;">\u00d7</button>';
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
    // Super-Admin Hinweis (nur fuer Super-Admin-Email)
    var isAdmin = (u.email || '').toLowerCase() === 'admin@fahrschule-weber.de' || (window['__SUPER_ADMIN_EMAIL__'] && (u.email || '').toLowerCase() === window['__SUPER_ADMIN_EMAIL__']);
    var adminBox = isAdmin ? ('<div class="card mb-4" style="background:linear-gradient(135deg,#1565c0,#1976d2);color:#fff;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;">' +
        '<div><div style="font-weight:700;font-size:var(--text-lg);">\ud83d\udd11 Super-Admin</div>' +
        '<div style="font-size:var(--text-sm);opacity:0.9;">Fahrschulen verwalten, Trial verl\u00e4ngern, Gratis-Abos gew\u00e4hren</div></div>' +
        '<button class="btn btn-secondary" style="background:#fff;color:#1565c0;" onclick="App.switchSchoolTab(\'admin\')">\u00d6ffnen</button>' +
      '</div></div>') : '';
    var html = '<div class="page-padding"><div class="profile-header">' + this.avatarHtml(u.admin_name || u.name, 'lg') +
      '<h3>' + (u.admin_name || u.name) + '</h3><p class="text-xs text-muted">' + u.name + '</p></div>' +
      adminBox +
      '<div class="profile-section">' +
        '<div class="profile-row"><span class="profile-row-label">' + t('email') + '</span><span class="profile-row-value">' + u.email + '</span></div>' +
        '<div class="profile-row"><span class="profile-row-label">' + t('telefon') + '</span><span class="profile-row-value">' + (u.phone || '—') + '</span></div>' +
        '<div class="profile-row"><span class="profile-row-label">' + t('adresse') + '</span><span class="profile-row-value">' + (u.address || '—') + '</span></div>' +
      '</div>' +
      '<div id="profile-abo-section"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div>' +
      '<div id="profile-accounting-mode-section"></div>' +
      '<div id="profile-billing-settings-section"></div>' +
      '<div id="profile-pricing-categories-section"></div>' +
      '<div id="profile-branches-section"></div>' +
      '<div id="profile-secretaries-section"></div>' +
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
    // Load accounting mode (GoBD vs external) toggle
    this._loadAccountingMode();
    // Load billing settings (nur Fahrschule)
    this._loadBillingSettings();
    // Load merged price categories + pricing templates (Push 7)
    this._loadPricingAndCategories();
    // Load branches + secretaries (Push 8 — nur Plus-Schul-Admin)
    this._loadProfileBranches();
    this._loadProfileSecretaries();
  },

  // ============================================
  // Filialen + Sekretärinnen (Plus-Schul-Admin)
  // ============================================
  _loadProfileBranches: async function() {
    var container = document.getElementById('profile-branches-section');
    if (!container) return;
    var u = AppState.currentUser;
    if (!u || u.role !== 'school') { container.innerHTML = ''; return; }
    try {
      var data = await ApiClient.get('/api/school/branches');
      this._renderProfileBranches(data.branches || []);
    } catch (e) { container.innerHTML = ''; }
  },

  _renderProfileBranches: function(branches) {
    var container = document.getElementById('profile-branches-section');
    if (!container) return;
    var rowsHtml = '';
    if (branches.length === 0) {
      rowsHtml = '<div style="font-size:var(--text-sm);color:var(--text-muted);padding:var(--space-2) 0;">Noch keine Filialen angelegt.</div>';
    } else {
      rowsHtml = branches.map(function(b){
        var safeName = (b.name || '').replace(/'/g, "\\'");
        var safeAddr = (b.address || '').replace(/'/g, "\\'");
        return '<div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;border-top:1px solid var(--color-border);">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-weight:600;">' + (b.name || '—') + '</div>' +
            (b.address ? '<div style="font-size:var(--text-xs);color:var(--text-muted);">' + b.address + '</div>' : '') +
          '</div>' +
          '<button class="btn btn-sm btn-secondary" onclick="App.openBranchModal({id:\'' + b.id + '\',name:\'' + safeName + '\',address:\'' + safeAddr + '\'})">Bearbeiten</button>' +
          '<button class="btn btn-sm btn-danger" onclick="App.deleteBranch(\'' + b.id + '\')">Löschen</button>' +
        '</div>';
      }).join('');
    }
    container.innerHTML = '<div class="card mb-4">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">' +
        '<div class="section-title" style="margin:0;">Filialen</div>' +
        '<button class="btn btn-sm btn-primary" onclick="App.openBranchModal()">+ Neue Filiale</button>' +
      '</div>' +
      '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);">Optionale Standorte deiner Fahrschule. Bei der Terminplanung wählbar.</div>' +
      rowsHtml +
    '</div>';
  },

  openBranchModal: function(branch) {
    var isEdit = !!(branch && branch.id);
    var name = isEdit ? (branch.name || '') : '';
    var address = isEdit ? (branch.address || '') : '';
    var title = isEdit ? 'Filiale bearbeiten' : 'Neue Filiale';
    var html = '<form id="branch-form" onsubmit="event.preventDefault();">' +
      '<div class="form-group mb-3"><label class="form-label">Name *</label>' +
        '<input class="form-input" type="text" id="branch-name" value="' + name.replace(/"/g, '&quot;') + '" placeholder="z.B. Hauptstandort"></div>' +
      '<div class="form-group mb-3"><label class="form-label">Adresse</label>' +
        '<input class="form-input" type="text" id="branch-address" value="' + address.replace(/"/g, '&quot;') + '" placeholder="Straße, PLZ Ort"></div>' +
      '<button type="button" class="btn btn-primary btn-full btn-lg" onclick="App.saveBranch(' + (isEdit ? "'" + branch.id + "'" : 'null') + ')">Speichern</button>' +
    '</form>';
    this.openModal(title, html);
  },

  saveBranch: async function(id) {
    var name = (document.getElementById('branch-name') || {}).value || '';
    var address = (document.getElementById('branch-address') || {}).value || '';
    if (!name.trim()) { this.showToast('Name erforderlich'); return; }
    try {
      this.showLoading(true);
      if (id) {
        await ApiClient.put('/api/school/branches/' + id, { name: name.trim(), address: address.trim() });
      } else {
        await ApiClient.post('/api/school/branches', { name: name.trim(), address: address.trim() });
      }
      this.closeModalForce();
      this.showToast('Filiale gespeichert');
      this._loadProfileBranches();
    } catch(err) { this.showToast('Fehler: ' + (err.message || err)); }
    finally { this.showLoading(false); }
  },

  deleteBranch: async function(id) {
    if (!confirm('Filiale wirklich löschen? Bestehende Termine bleiben erhalten, verlieren aber die Filial-Zuordnung.')) return;
    try {
      this.showLoading(true);
      await ApiClient.del('/api/school/branches/' + id);
      this.showToast('Filiale gelöscht');
      this._loadProfileBranches();
    } catch(err) { this.showToast('Fehler: ' + (err.message || err)); }
    finally { this.showLoading(false); }
  },

  _loadProfileSecretaries: async function() {
    var container = document.getElementById('profile-secretaries-section');
    if (!container) return;
    var u = AppState.currentUser;
    if (!u || u.role !== 'school') { container.innerHTML = ''; return; }
    try {
      var data = await ApiClient.get('/api/school/secretaries');
      this._renderProfileSecretaries(data.secretaries || []);
    } catch (e) { container.innerHTML = ''; }
  },

  _renderProfileSecretaries: function(secs) {
    var container = document.getElementById('profile-secretaries-section');
    if (!container) return;
    var rowsHtml = '';
    if (secs.length === 0) {
      rowsHtml = '<div style="font-size:var(--text-sm);color:var(--text-muted);padding:var(--space-2) 0;">Noch keine Sekretärinnen angelegt.</div>';
    } else {
      rowsHtml = secs.map(function(s){
        var safeName = (s.name || '').replace(/'/g, "\\'");
        return '<div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) 0;border-top:1px solid var(--color-border);">' +
          '<div style="flex:1;min-width:0;font-weight:600;">' + (s.name || '—') + '</div>' +
          '<button class="btn btn-sm btn-secondary" onclick="App.openSecretaryModal({id:\'' + s.id + '\',name:\'' + safeName + '\'})">Bearbeiten</button>' +
          '<button class="btn btn-sm btn-danger" onclick="App.deleteSecretary(\'' + s.id + '\')">Löschen</button>' +
        '</div>';
      }).join('');
    }
    container.innerHTML = '<div class="card mb-4">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-2);">' +
        '<div class="section-title" style="margin:0;">Sekretärinnen</div>' +
        '<button class="btn btn-sm btn-primary" onclick="App.openSecretaryModal()">+ Neue Sekretärin</button>' +
      '</div>' +
      '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2);">Optional. Bei der Terminplanung wählbar — ohne eigenen Login.</div>' +
      rowsHtml +
    '</div>';
  },

  openSecretaryModal: function(sec) {
    var isEdit = !!(sec && sec.id);
    var name = isEdit ? (sec.name || '') : '';
    var title = isEdit ? 'Sekretärin bearbeiten' : 'Neue Sekretärin';
    var html = '<form id="secretary-form" onsubmit="event.preventDefault();">' +
      '<div class="form-group mb-3"><label class="form-label">Name *</label>' +
        '<input class="form-input" type="text" id="secretary-name" value="' + name.replace(/"/g, '&quot;') + '" placeholder="Vorname Nachname"></div>' +
      '<button type="button" class="btn btn-primary btn-full btn-lg" onclick="App.saveSecretary(' + (isEdit ? "'" + sec.id + "'" : 'null') + ')">Speichern</button>' +
    '</form>';
    this.openModal(title, html);
  },

  saveSecretary: async function(id) {
    var name = (document.getElementById('secretary-name') || {}).value || '';
    if (!name.trim()) { this.showToast('Name erforderlich'); return; }
    try {
      this.showLoading(true);
      if (id) {
        await ApiClient.put('/api/school/secretaries/' + id, { name: name.trim() });
      } else {
        await ApiClient.post('/api/school/secretaries', { name: name.trim() });
      }
      this.closeModalForce();
      this.showToast('Sekretärin gespeichert');
      this._loadProfileSecretaries();
    } catch(err) { this.showToast('Fehler: ' + (err.message || err)); }
    finally { this.showLoading(false); }
  },

  deleteSecretary: async function(id) {
    if (!confirm('Sekretärin wirklich löschen? Bestehende Termine bleiben erhalten, verlieren aber die Zuordnung.')) return;
    try {
      this.showLoading(true);
      await ApiClient.del('/api/school/secretaries/' + id);
      this.showToast('Sekretärin gelöscht');
      this._loadProfileSecretaries();
    } catch(err) { this.showToast('Fehler: ' + (err.message || err)); }
    finally { this.showLoading(false); }
  },

  // ============================================
  // Push 8: Buchhaltungs-Modus (GoBD vs. external)
  // ============================================
  _loadAccountingMode: async function() {
    var container = document.getElementById('profile-accounting-mode-section');
    if (!container) return;
    var u = AppState.currentUser;
    if (u.role !== 'school') { container.innerHTML = ''; return; }
    try {
      var data = await ApiClient.get('/api/school/accounting-mode');
      this._renderAccountingMode(data || { mode: 'gobd' });
    } catch (err) {
      container.innerHTML = '';
    }
  },

  _renderAccountingMode: function(data) {
    var container = document.getElementById('profile-accounting-mode-section');
    if (!container) return;
    var mode = data.mode || 'gobd';
    var isGobd = mode === 'gobd';
    var statusBadge = isGobd
      ? '<span style="background:#10b981;color:#fff;padding:4px 10px;border-radius:12px;font-size:var(--text-xs);font-weight:600;">GoBD-konform aktiv</span>'
      : '<span style="background:#f59e0b;color:#fff;padding:4px 10px;border-radius:12px;font-size:var(--text-xs);font-weight:600;">Externe Buchhaltung</span>';
    var changedInfo = '';
    if (data.changed_at) {
      var d = new Date(data.changed_at);
      changedInfo = '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:8px;">Zuletzt geändert: ' + d.toLocaleDateString('de-DE') + '</div>';
    }
    var description = isGobd
      ? 'Jede Fahrstunde erzeugt automatisch eine Soll-Position. Rechnungen, Zahlungen und DATEV-Export sind aktiviert.'
      : 'Buchhaltungs-Funktionen sind deaktiviert. Sie führen Ihre Buchhaltung extern (z. B. über Steuerberater oder andere Software). FahrDoc dient als Tätigkeitsnachweis.';
    var btnLabel = isGobd ? 'Buchhaltung deaktivieren' : 'Buchhaltung aktivieren';
    var btnStyle = isGobd ? 'background:#f59e0b;color:#fff;' : 'background:#10b981;color:#fff;';
    container.innerHTML = '<div class="card mb-4">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<div class="section-title" style="margin:0;">Buchhaltungs-Modus</div>' +
        statusBadge +
      '</div>' +
      '<div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">' + description + '</div>' +
      changedInfo +
      '<button class="btn btn-sm" style="margin-top:12px;' + btnStyle + '" onclick="App.openAccountingModeModal(\'' + (isGobd ? 'external' : 'gobd') + '\')">' + btnLabel + '</button>' +
    '</div>';
  },

  openAccountingModeModal: function(targetMode) {
    var self = this;
    var existing = document.getElementById('accounting-mode-modal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'accounting-mode-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';

    var html, btnAction;
    if (targetMode === 'external') {
      html = '<h3 style="margin:0 0 12px 0;color:#dc2626;">⚠️ Buchhaltung in FahrDoc deaktivieren</h3>' +
        '<div style="font-size:var(--text-sm);line-height:1.5;color:#374151;max-height:50vh;overflow-y:auto;padding-right:8px;">' +
        '<p><strong>Was passiert beim Deaktivieren:</strong></p>' +
        '<ul style="padding-left:20px;margin:8px 0;">' +
          '<li>Es werden <strong>keine Soll-Positionen</strong> mehr automatisch erzeugt</li>' +
          '<li>Sie können <strong>keine neuen Rechnungen</strong> mehr in FahrDoc erstellen</li>' +
          '<li>Keine neuen Zahlungseingänge mehr erfassen</li>' +
          '<li>Kein DATEV-Export für neue Vorgänge</li>' +
          '<li>Bestehende Rechnungen und Buchungen bleiben <strong>einsehbar</strong> (GoBD-Pflicht: 10 Jahre Aufbewahrung)</li>' +
          '<li>Sie können weiterhin Fahrstunden erfassen und eine <strong>Tätigkeitsübersicht ausdrucken</strong></li>' +
        '</ul>' +
        '<p style="background:#fef3c7;padding:10px;border-radius:6px;border-left:3px solid #f59e0b;">' +
        '<strong>Ihre Verantwortung:</strong> Sie sind verpflichtet, eine ordnungsgemäße Buchführung gemäß §§ 140 ff. AO und den Grundsätzen zur ordnungsgemäßen Führung und Aufbewahrung von Büchern (GoBD) über andere Mittel sicherzustellen — etwa über Ihren Steuerberater oder eine andere Buchhaltungs-Software.' +
        '</p>' +
        '<p style="background:#fee2e2;padding:10px;border-radius:6px;border-left:3px solid #dc2626;margin-top:10px;">' +
        '<strong>Haftungsausschluss:</strong> FahrDoc übernimmt keine Haftung für steuerrechtliche Konsequenzen, die aus der Deaktivierung der integrierten Buchhaltung entstehen. Diese Entscheidung wird mit Zeitstempel und Ihrer User-ID protokolliert.' +
        '</p>' +
        '<label style="display:flex;align-items:flex-start;gap:8px;margin-top:14px;cursor:pointer;">' +
          '<input type="checkbox" id="acc-mode-confirm" style="margin-top:3px;">' +
          '<span style="font-size:var(--text-sm);">Ich habe die Hinweise gelesen und verstanden. Ich übernehme die volle Verantwortung für eine GoBD-konforme Buchführung außerhalb von FahrDoc.</span>' +
        '</label>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:16px;">' +
          '<button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById(\'accounting-mode-modal\').remove();">Abbrechen</button>' +
          '<button class="btn" id="acc-mode-submit" style="flex:1;background:#dc2626;color:#fff;" disabled onclick="App.confirmAccountingMode(\'external\')">Deaktivieren</button>' +
        '</div>';
    } else {
      html = '<h3 style="margin:0 0 12px 0;color:#10b981;">Buchhaltung in FahrDoc aktivieren</h3>' +
        '<div style="font-size:var(--text-sm);line-height:1.5;color:#374151;">' +
        '<p>Ab sofort werden wieder:</p>' +
        '<ul style="padding-left:20px;margin:8px 0;">' +
          '<li>Soll-Positionen automatisch zu Fahrstunden erzeugt</li>' +
          '<li>Rechnungen und Zahlungen erfasst</li>' +
          '<li>DATEV-Export ermöglicht</li>' +
        '</ul>' +
        '<p>Für Fahrstunden, die während der externen Phase entstanden sind, werden <strong>keine</strong> rückwirkenden Soll-Positionen erstellt — diese müssten Sie bei Bedarf manuell als Korrektur anlegen.</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:16px;">' +
          '<button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById(\'accounting-mode-modal\').remove();">Abbrechen</button>' +
          '<button class="btn btn-primary" style="flex:1;" onclick="App.confirmAccountingMode(\'gobd\')">Aktivieren</button>' +
        '</div>';
    }
    modal.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:560px;width:100%;padding:20px;max-height:90vh;overflow-y:auto;">' + html + '</div>';
    document.body.appendChild(modal);
    // Checkbox-Listener nur für external
    if (targetMode === 'external') {
      var cb = document.getElementById('acc-mode-confirm');
      var btn = document.getElementById('acc-mode-submit');
      if (cb && btn) {
        cb.addEventListener('change', function(){ btn.disabled = !cb.checked; });
      }
    }
  },

  confirmAccountingMode: async function(newMode) {
    var body = { mode: newMode };
    if (newMode === 'external') {
      var cb = document.getElementById('acc-mode-confirm');
      if (!cb || !cb.checked) { Toast.error('Bitte bestätigen Sie den Aufklärungstext'); return; }
      body.disclaimer_accepted = true;
      body.disclaimer_text = 'Buchhaltung extern — Verantwortung beim Inhaber gemäß §§ 140 ff. AO + GoBD';
    }
    try {
      await ApiClient.patch('/api/school/accounting-mode', body);
      var modal = document.getElementById('accounting-mode-modal');
      if (modal) modal.remove();
      Toast.success(newMode === 'gobd' ? 'Buchhaltung aktiviert' : 'Buchhaltung deaktiviert');
      // User-State refreshen + Tab neu rendern
      try {
        var me = await ApiClient.get('/api/auth/me');
        AppState.currentUser = me;
      } catch (e) {}
      this.renderSchoolProfileTab();
      // Sidebar/Tab-Sichtbarkeit aktualisieren
      if (typeof this.applyAccountingModeVisibility === 'function') this.applyAccountingModeVisibility();
    } catch (err) {
      Toast.error('Fehler: ' + (err.message || err));
    }
  },

  // Buchhaltungs-Tabs/Buttons im external-Modus ausblenden
  applyAccountingModeVisibility: function() {
    var u = AppState.currentUser;
    if (!u || u.role !== 'school') return;
    var isExternal = u.accounting_mode === 'external';
    var selectors = [
      '[data-tab="buchhaltung"]',
      '[data-tab="rechnungen"]',
      '[data-tab="umsaetze"]',
      '[data-accounting-feature]'
    ];
    selectors.forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        el.style.display = isExternal ? 'none' : '';
      });
    });
  },

  _loadBillingSettings: async function() {
    var container = document.getElementById('profile-billing-settings-section');
    if (!container) return;
    var u = AppState.currentUser;
    if (u.role !== 'school') { container.innerHTML = ''; return; }
    container.innerHTML = '<div class="card mb-4"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div>';
    try {
      var s = await ApiClient.get('/api/school/settings');
      this._renderBillingSettings(s || {});
    } catch (err) {
      container.innerHTML = '<div class="card mb-4"><p class="text-sm text-muted">Buchhaltungs-Einstellungen: ' + (err.message || err) + '</p></div>';
    }
  },

  _renderBillingSettings: function(s) {
    var container = document.getElementById('profile-billing-settings-section');
    if (!container) return;
    var taxMode = s.tax_mode || 'kleinunternehmer';
    var taxRate = (s.tax_rate_percent != null) ? s.tax_rate_percent : 19;
    var esc = App._escapeHtml || function(x){ return x == null ? '' : String(x); };
    var html = '<div class="card mb-4">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-3);">' +
        '<div class="section-title" style="margin:0;">\ud83e\uddfe Rechnungs-Einstellungen</div>' +
      '</div>' +
      '<div style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">Diese Angaben erscheinen auf den PDF-Rechnungen.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">' +
        '<div class="form-group" style="grid-column:1/-1;"><label class="form-label">USt-Modus</label>' +
          '<select class="form-select" id="bs-tax-mode" onchange="App._toggleTaxRateField()">' +
            '<option value="kleinunternehmer"' + (taxMode === 'kleinunternehmer' ? ' selected' : '') + '>Kleinunternehmer (\u00a719 UStG \u2014 keine MwSt)</option>' +
            '<option value="regelbesteuerung"' + (taxMode === 'regelbesteuerung' ? ' selected' : '') + '>Regelbesteuerung (mit MwSt-Ausweis)</option>' +
          '</select></div>' +
        '<div class="form-group" id="bs-tax-rate-wrap" style="' + (taxMode === 'regelbesteuerung' ? '' : 'display:none;') + '"><label class="form-label">MwSt-Satz (%)</label>' +
          '<input type="number" step="0.01" min="0" max="99" class="form-input" id="bs-tax-rate" value="' + esc(taxRate) + '"></div>' +
        '<div class="form-group"><label class="form-label">USt-IdNr (optional)</label>' +
          '<input type="text" class="form-input" id="bs-tax-id" value="' + esc(s.tax_id || '') + '" placeholder="DE123456789"></div>' +
        '<div class="form-group" style="grid-column:1/-1;"><label class="form-label">Stra\u00dfe + Nr.</label>' +
          '<input type="text" class="form-input" id="bs-addr1" value="' + esc(s.address_line1 || '') + '" placeholder="Musterstra\u00dfe 12"></div>' +
        '<div class="form-group"><label class="form-label">PLZ</label>' +
          '<input type="text" class="form-input" id="bs-plz" value="' + esc(s.postal_code || '') + '" placeholder="10115"></div>' +
        '<div class="form-group"><label class="form-label">Stadt</label>' +
          '<input type="text" class="form-input" id="bs-city" value="' + esc(s.city || '') + '" placeholder="Berlin"></div>' +
        '<div class="form-group"><label class="form-label">Telefon</label>' +
          '<input type="text" class="form-input" id="bs-phone" value="' + esc(s.phone || '') + '" placeholder="030 12345678"></div>' +
        '<div class="form-group" style="grid-column:1/-1;"><label class="form-label">Bankverbindung (IBAN/BIC, optional)</label>' +
          '<textarea class="form-textarea" id="bs-bank" rows="2" placeholder="IBAN: DE89 3704 0044 0532 0130 00\u000ABIC: COBADEFFXXX">' + esc(s.bank_info || '') + '</textarea></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-primary" id="bs-save-btn" onclick="App._saveBillingSettings()">Speichern</button>' +
      '</div>' +
    '</div>';
    container.innerHTML = html;
  },

  _toggleTaxRateField: function() {
    var mode = (document.getElementById('bs-tax-mode') || {}).value;
    var wrap = document.getElementById('bs-tax-rate-wrap');
    if (wrap) wrap.style.display = (mode === 'regelbesteuerung') ? '' : 'none';
  },

  _saveBillingSettings: async function() {
    var btn = document.getElementById('bs-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Speichert...'; }
    try {
      var body = {
        tax_mode: (document.getElementById('bs-tax-mode') || {}).value || 'kleinunternehmer',
        tax_rate_percent: parseFloat((document.getElementById('bs-tax-rate') || {}).value || '0') || 0,
        tax_id: (document.getElementById('bs-tax-id') || {}).value || null,
        address_line1: (document.getElementById('bs-addr1') || {}).value || null,
        postal_code: (document.getElementById('bs-plz') || {}).value || null,
        city: (document.getElementById('bs-city') || {}).value || null,
        phone: (document.getElementById('bs-phone') || {}).value || null,
        bank_info: (document.getElementById('bs-bank') || {}).value || null
      };
      await ApiClient.put('/api/school/settings', body);
      App.showToast('Gespeichert');
    } catch (err) {
      App.showToast('Fehler: ' + (err.message || err));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Speichern'; }
    }
  },

  // ============================================================
  // PUSH 7: Preise & Kategorien (Matrix-UI)
  // Eine Kategorie = mehrere pricing_templates (1 pro Fahrstundentyp).
  // Beim Anlegen einer Fahrstunde wird Preis aus Schüler-Kategorie
  // automatisch gezogen (Fallback auf 'normal').
  // ============================================================
  _loadPricingAndCategories: async function() {
    var container = document.getElementById('profile-pricing-categories-section');
    if (!container) return;
    var u = AppState.currentUser;
    if (u.role !== 'school') { container.innerHTML = ''; return; }
    container.innerHTML = '<div class="card mb-4"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div>';
    try {
      var catsRes = await ApiClient.get('/api/school/price-categories');
      var templates = await ApiClient.get('/api/pricing-templates');
      AppState.priceCategoriesDraft = (catsRes && catsRes.categories) ? catsRes.categories.slice() : [];
      AppState.pricingTemplates = templates || [];
      // Aktive Tab: 'normal' wenn vorhanden, sonst erste
      if (!AppState.activePriceCategoryId
          || !AppState.priceCategoriesDraft.find(function(c){ return c.id === AppState.activePriceCategoryId; })) {
        var first = AppState.priceCategoriesDraft.find(function(c){ return c.id === 'normal'; }) || AppState.priceCategoriesDraft[0];
        AppState.activePriceCategoryId = first ? first.id : null;
      }
      this._renderPricingAndCategories();
    } catch (err) {
      container.innerHTML = '<div class="card mb-4"><p class="text-sm text-muted">Preise & Kategorien: ' + (err.message || err) + '</p></div>';
    }
  },

  _renderPricingAndCategories: function() {
    var container = document.getElementById('profile-pricing-categories-section');
    if (!container) return;
    var cats = AppState.priceCategoriesDraft || [];
    var templates = AppState.pricingTemplates || [];
    var activeId = AppState.activePriceCategoryId;
    var esc = this._escapeHtml.bind(this);
    var self = this;

    // Kategorie-Tabs
    var tabsHtml = '';
    var i;
    for (i = 0; i < cats.length; i++) {
      var c = cats[i];
      var isActive = c.id === activeId;
      var bg = isActive ? 'var(--color-primary)' : 'var(--bg-secondary)';
      var fg = isActive ? '#fff' : 'var(--text-primary)';
      var border = isActive ? 'var(--color-primary)' : 'var(--border-light)';
      tabsHtml += '<button class="pc-tab" data-id="' + esc(c.id) + '" onclick="App._setActivePriceCategory(\'' + esc(c.id) + '\')" style="padding:6px 12px;border-radius:16px;border:1px solid ' + border + ';background:' + bg + ';color:' + fg + ';font-size:var(--text-sm);cursor:pointer;white-space:nowrap;">' + esc(c.label || '(ohne Name)') + '</button>';
    }
    tabsHtml += '<button class="btn btn-secondary btn-sm" onclick="App._addPriceCategory()" title="Neue Kategorie">+ Kategorie</button>';

    // Aktive Kategorie
    var activeCat = cats.find(function(c){ return c.id === activeId; });
    var canDeleteCat = (cats.length > 1 && activeId !== 'normal');
    var labelEdit = activeCat
      ? '<div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;margin-bottom:var(--space-3);">' +
          '<label style="font-size:var(--text-sm);color:var(--text-muted);">Bezeichnung:</label>' +
          '<input type="text" class="form-input" value="' + esc(activeCat.label || '') + '" maxlength="60" style="flex:1;min-width:140px;max-width:280px;" oninput="App._onPriceCategoryLabelEdit(this.value)">' +
          '<button class="btn btn-secondary btn-sm" onclick="App._saveActivePriceCategoryLabel()">Name speichern</button>' +
          (canDeleteCat ? '<button class="btn btn-secondary btn-sm" style="color:#c62828;" onclick="App._removeActivePriceCategory()">Kategorie l\u00f6schen</button>' : '') +
        '</div>'
      : '';

    // Matrix: Pro LESSON_TYPE eine Zeile in der aktiven Kategorie
    var matrixRows = '';
    if (activeCat) {
      var lessonTypes = LESSON_TYPES;
      for (i = 0; i < lessonTypes.length; i++) {
        var lt = lessonTypes[i];
        // Template fuer (aktive Kategorie, lessonType)
        var tpl = templates.find(function(t){
          return (t.category_id || 'normal') === activeId
            && (t.lesson_type_match || '').toLowerCase().trim() === lt.toLowerCase().trim();
        });
        // Fallback-Anzeige: wenn aktive Kategorie kein Template hat, was waere der Normal-Preis?
        var normalTpl = null;
        if (!tpl && activeId !== 'normal') {
          normalTpl = templates.find(function(t){
            return (t.category_id || 'normal') === 'normal'
              && (t.lesson_type_match || '').toLowerCase().trim() === lt.toLowerCase().trim();
          });
        }
        var priceVal = tpl ? (tpl.price_cents / 100).toFixed(2).replace('.', ',') : '';
        var placeholder = normalTpl ? 'erbt: ' + (normalTpl.price_cents / 100).toFixed(2).replace('.', ',') : 'Preis in EUR';
        var autoChecked = tpl ? (tpl.auto_apply !== false) : true;
        var tplId = tpl ? tpl.id : '';
        matrixRows += '<tr data-lt="' + esc(lt) + '" data-tpl="' + esc(tplId) + '">' +
          '<td style="padding:var(--space-2) var(--space-3);font-weight:500;">' + esc(lt) + '</td>' +
          '<td style="padding:var(--space-2) var(--space-3);"><input type="text" class="form-input pc-price-input" inputmode="decimal" value="' + esc(priceVal) + '" placeholder="' + esc(placeholder) + '" style="max-width:120px;"></td>' +
          '<td style="padding:var(--space-2) var(--space-3);text-align:center;"><input type="checkbox" class="pc-auto-check" ' + (autoChecked ? 'checked' : '') + '></td>' +
          '</tr>';
      }
    }
    var matrixHtml = activeCat
      ? '<div style="border:1px solid var(--border-light);border-radius:var(--radius-md);overflow:auto;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">' +
            '<thead><tr style="background:var(--bg-secondary);">' +
              '<th style="padding:var(--space-2) var(--space-3);text-align:left;font-weight:600;">Fahrstundentyp</th>' +
              '<th style="padding:var(--space-2) var(--space-3);text-align:left;font-weight:600;">Preis (EUR)</th>' +
              '<th style="padding:var(--space-2) var(--space-3);text-align:center;font-weight:600;" title="Wenn aktiv: Preis wird beim Anlegen einer Fahrstunde dieses Typs automatisch erfasst">Auto</th>' +
            '</tr></thead>' +
            '<tbody>' + matrixRows + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2);">' +
          'Leeres Feld = Preis wird aus Kategorie \u201eNormal\u201c gezogen. \u201eAuto\u201c steuert, ob beim Erfassen einer Fahrstunde automatisch eine Soll-Position angelegt wird.' +
        '</div>'
      : '<div style="padding:var(--space-3);color:var(--text-muted);font-size:var(--text-sm);text-align:center;">Lege eine Kategorie an, um Preise zu definieren.</div>';

    // Sonstige Preise (Templates ohne lesson_type_match, gefiltert nach aktiver Kategorie)
    var otherTemplates = templates.filter(function(t){
      return (!t.lesson_type_match || !t.lesson_type_match.trim())
        && (t.category_id || 'normal') === activeId;
    });
    var otherRows = '';
    if (otherTemplates.length === 0) {
      otherRows = '<div style="padding:var(--space-3);color:var(--text-muted);font-size:var(--text-sm);text-align:center;">Keine sonstigen Preise in dieser Kategorie. Lege z.\u202fB. \u201eGrundgeb\u00fchr\u201c oder \u201eLehrmaterial\u201c an.</div>';
    } else {
      var j;
      for (j = 0; j < otherTemplates.length; j++) {
        var p = otherTemplates[j];
        var price = self._formatEur(p.price_cents);
        var inactiveBadge = !p.active ? '<span class="badge badge-muted" style="margin-left:var(--space-2);">inaktiv</span>' : '';
        otherRows += '<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--border-light);flex-wrap:wrap;">' +
          '<div style="flex:1;min-width:160px;"><div style="font-weight:500;">' + esc(p.name) + inactiveBadge + '</div>' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);">' + price + ' \u00b7 manuell verwendbar</div></div>' +
          '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">' +
            '<button class="btn btn-secondary btn-sm" onclick="App.openTemplateDialog(\'' + p.id + '\')">Bearbeiten</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="App.toggleTemplateActive(\'' + p.id + '\',' + (p.active ? 'false' : 'true') + ')">' + (p.active ? 'Deakt.' : 'Akt.') + '</button>' +
            '<button class="btn btn-secondary btn-sm" style="color:#c62828;" onclick="App.deleteTemplate(\'' + p.id + '\')">L\u00f6schen</button>' +
          '</div></div>';
      }
    }

    var html = '<div class="card mb-4">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-2);flex-wrap:wrap;">' +
        '<div><div class="section-title" style="margin:0;">Preise & Kategorien</div>' +
        '<div style="font-size:var(--text-sm);color:var(--text-muted);">Lege Kategorien an (z.\u202fB. Normal, F\u0026F, Mitarbeiter) und definiere f\u00fcr jede Kategorie die Preise pro Fahrstundentyp. Beim Erfassen einer Fahrstunde wird der Preis aus der Kategorie des Sch\u00fclers automatisch \u00fcbernommen.</div></div>' +
        '<button class="btn btn-secondary" onclick="App.openAssignPriceCategoryDialog()">Sch\u00fcler zuweisen \u2026</button>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center;margin-bottom:var(--space-3);padding-bottom:var(--space-2);border-bottom:1px solid var(--border-light);">' + tabsHtml + '</div>' +
      labelEdit +
      matrixHtml +
      '<div style="display:flex;justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-primary" id="pc-save-prices-btn" onclick="App._savePricesForActiveCategory()">Preise speichern</button>' +
      '</div>' +
      '<div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px solid var(--border-light);">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-2);flex-wrap:wrap;">' +
          '<div><div style="font-weight:600;">Sonstige Preise (manuell)</div>' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);">Ohne Auto-Match \u2014 nur in dieser Kategorie. F\u00fcr Pauschalen wie Grundgeb\u00fchr.</div></div>' +
          '<button class="btn btn-secondary btn-sm" onclick="App.openTemplateDialog(null)">+ Preis</button>' +
        '</div>' +
        '<div style="border:1px solid var(--border-light);border-radius:var(--radius-md);overflow:hidden;">' + otherRows + '</div>' +
      '</div>' +
    '</div>';
    container.innerHTML = html;
  },

  _setActivePriceCategory: function(catId) {
    AppState.activePriceCategoryId = catId;
    this._renderPricingAndCategories();
  },

  _onPriceCategoryLabelEdit: function(val) {
    var cats = AppState.priceCategoriesDraft || [];
    var c = cats.find(function(c){ return c.id === AppState.activePriceCategoryId; });
    if (c) c.label = val;
  },

  _saveActivePriceCategoryLabel: async function() {
    try {
      var cats = (AppState.priceCategoriesDraft || []).map(function(c){
        return { id: c.id, label: (c.label || '').trim() };
      }).filter(function(c){ return c.label.length > 0; });
      if (cats.length === 0) { App.showToast('Bezeichnung fehlt', 'error'); return; }
      var res = await ApiClient.put('/api/school/price-categories', { categories: cats });
      AppState.priceCategoriesDraft = (res && res.categories) ? res.categories.slice() : cats;
      App.showToast('Gespeichert' + (res.orphaned ? ' \u2014 ' + res.orphaned + ' Sch\u00fcler ohne Kategorie' : ''), 'success');
      this._renderPricingAndCategories();
    } catch (err) {
      App.showToast('Fehler: ' + (err.message || err), 'error');
    }
  },

  _addPriceCategory: async function() {
    if (!AppState.priceCategoriesDraft) AppState.priceCategoriesDraft = [];
    if (AppState.priceCategoriesDraft.length >= 20) {
      App.showToast('Maximal 20 Kategorien', 'error'); return;
    }
    var label = (prompt('Name der neuen Kategorie:') || '').trim();
    if (!label) return;
    // ID generieren (slug-ish)
    var slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
    if (!slug) slug = 'cat_' + (AppState.priceCategoriesDraft.length + 1);
    // Eindeutig machen
    var base = slug, n = 2;
    while (AppState.priceCategoriesDraft.find(function(c){ return c.id === slug; })) {
      slug = base + '_' + n++;
    }
    var newCats = AppState.priceCategoriesDraft.slice();
    newCats.push({ id: slug, label: label });
    try {
      var res = await ApiClient.put('/api/school/price-categories', { categories: newCats });
      AppState.priceCategoriesDraft = (res && res.categories) ? res.categories.slice() : newCats;
      AppState.activePriceCategoryId = slug;
      App.showToast('Kategorie angelegt', 'success');
      this._renderPricingAndCategories();
    } catch (err) {
      App.showToast('Fehler: ' + (err.message || err), 'error');
    }
  },

  _removeActivePriceCategory: async function() {
    var activeId = AppState.activePriceCategoryId;
    if (!activeId || activeId === 'normal') return;
    if (!confirm('Kategorie wirklich l\u00f6schen? Sch\u00fcler in dieser Kategorie werden auf \u201eNormal\u201c zur\u00fcckgesetzt. Preise dieser Kategorie werden gel\u00f6scht.')) return;
    try {
      // 1) Alle Templates dieser Kategorie loeschen
      var templates = AppState.pricingTemplates || [];
      var toDelete = templates.filter(function(t){ return (t.category_id || 'normal') === activeId; });
      var k;
      for (k = 0; k < toDelete.length; k++) {
        await ApiClient.del('/api/pricing-templates/' + toDelete[k].id);
      }
      // 2) Kategorie aus Liste entfernen (Server entfernt orphan-Refs in students automatisch)
      var newCats = (AppState.priceCategoriesDraft || []).filter(function(c){ return c.id !== activeId; });
      var res = await ApiClient.put('/api/school/price-categories', { categories: newCats });
      AppState.priceCategoriesDraft = (res && res.categories) ? res.categories.slice() : newCats;
      AppState.activePriceCategoryId = 'normal';
      App.showToast('Kategorie gel\u00f6scht' + (res.orphaned ? ' \u2014 ' + res.orphaned + ' Sch\u00fcler zur\u00fcckgesetzt' : ''), 'success');
      this._loadPricingAndCategories();
    } catch (err) {
      App.showToast('Fehler: ' + (err.message || err), 'error');
    }
  },

  _savePricesForActiveCategory: async function() {
    var btn = document.getElementById('pc-save-prices-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Speichert\u2026'; }
    var activeId = AppState.activePriceCategoryId;
    var activeCat = (AppState.priceCategoriesDraft || []).find(function(c){ return c.id === activeId; });
    if (!activeCat) { if (btn) { btn.disabled = false; btn.textContent = 'Preise speichern'; } return; }
    try {
      var rows = document.querySelectorAll('#profile-pricing-categories-section tr[data-lt]');
      var saved = 0, deleted = 0, errors = 0;
      var r;
      for (r = 0; r < rows.length; r++) {
        var row = rows[r];
        var lt = row.getAttribute('data-lt');
        var tplId = row.getAttribute('data-tpl');
        var priceInput = row.querySelector('.pc-price-input');
        var autoInput = row.querySelector('.pc-auto-check');
        var priceRaw = (priceInput.value || '').trim().replace(',', '.');
        var auto = !!autoInput.checked;
        if (priceRaw === '') {
          // Leer: Template loeschen falls vorhanden (bewirkt Normal-Fallback)
          if (tplId) {
            try { await ApiClient.del('/api/pricing-templates/' + tplId); deleted++; } catch (e) { errors++; }
          }
          continue;
        }
        var priceNum = parseFloat(priceRaw);
        if (isNaN(priceNum) || priceNum < 0) { errors++; continue; }
        var cents = Math.round(priceNum * 100);
        var name = lt + ' (' + activeCat.label + ')';
        var payload = { name: name, price_cents: cents, lesson_type_match: lt, auto_apply: auto, category_id: activeId, active: true };
        try {
          if (tplId) {
            await ApiClient.put('/api/pricing-templates/' + tplId, payload);
          } else {
            await ApiClient.post('/api/pricing-templates', payload);
          }
          saved++;
        } catch (e) { errors++; }
      }
      var msg = saved + ' gespeichert' + (deleted ? ', ' + deleted + ' geleert (Fallback Normal)' : '') + (errors ? ', ' + errors + ' Fehler' : '');
      App.showToast(msg, errors ? 'error' : 'success');
      this._loadPricingAndCategories();
    } catch (err) {
      App.showToast('Fehler: ' + (err.message || err), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Preise speichern'; }
    }
  },

  _escapeHtml: function(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // Linkify text: escape HTML, then turn http(s):// and www. URLs into clickable links.
  // Newlines are kept by switching display to white-space:pre-wrap at the call site.
  _linkifyText: function(s) {
    if (s === null || s === undefined) return '';
    var escaped = this._escapeHtml(s);
    // Match http(s) URLs OR www-prefixed URLs. Trailing punctuation is excluded from link.
    var re = /\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?\)\]])/g;
    return escaped.replace(re, function(url) {
      var href = url;
      if (href.indexOf('http') !== 0) href = 'https://' + href;
      // Display: shorten very long URLs
      var display = url.length > 60 ? url.slice(0, 57) + '\u2026' : url;
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);text-decoration:underline;word-break:break-all;">' + display + '</a>';
    });
  },

  // Push 7: openTemplateDialog wird nur noch fuer "Sonstige Preise" (manuell) verwendet.
  // Auto-Match-Preise kommen aus der Matrix der aktiven Kategorie.
  openTemplateDialog: async function(templateId) {
    var existing = null;
    if (templateId) {
      try {
        var list = await ApiClient.get('/api/pricing-templates');
        var i;
        for (i = 0; i < list.length; i++) { if (list[i].id === templateId) { existing = list[i]; break; } }
      } catch (err) { App.showToast('Fehler: ' + (err.message || err), 'error'); return; }
    }
    var name = existing ? existing.name : '';
    var price = existing ? (existing.price_cents / 100).toFixed(2).replace('.', ',') : '';
    var activeCatId = AppState.activePriceCategoryId || (existing && existing.category_id) || 'normal';
    var activeCat = (AppState.priceCategoriesDraft || []).find(function(c){ return c.id === activeCatId; });
    var catLabel = activeCat ? activeCat.label : activeCatId;
    var body = '<div class="form-group"><label class="form-label">Bezeichnung *</label>' +
      '<input type="text" id="tpl-name" class="form-input" value="' + this._escapeHtml(name) + '" placeholder="z.B. Grundgeb\u00fchr oder Lehrmaterial"></div>' +
      '<div class="form-group"><label class="form-label">Preis (EUR) *</label>' +
      '<input type="text" id="tpl-price" class="form-input" value="' + price + '" placeholder="55,00" inputmode="decimal"></div>' +
      '<div class="form-group"><div style="font-size:var(--text-sm);color:var(--text-muted);">Kategorie: <b>' + this._escapeHtml(catLabel) + '</b> \u00b7 Manuell (kein Auto-Match)</div></div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-4);">' +
      '<button class="btn btn-secondary" onclick="App.closeModal()">Abbrechen</button>' +
      '<button class="btn btn-primary" onclick="App._saveTemplate(' + (templateId ? "'" + templateId + "'" : 'null') + ')">Speichern</button></div>';
    App.openModal(templateId ? 'Preis bearbeiten' : 'Preis anlegen', body);
  },

  _saveTemplate: async function(templateId) {
    var name = (document.getElementById('tpl-name').value || '').trim();
    var priceRaw = (document.getElementById('tpl-price').value || '').trim().replace(',', '.');
    if (!name) { App.showToast('Bezeichnung fehlt', 'error'); return; }
    var priceNum = parseFloat(priceRaw);
    if (isNaN(priceNum) || priceNum < 0) { App.showToast('Ung\u00fcltiger Preis', 'error'); return; }
    var cents = Math.round(priceNum * 100);
    var activeCatId = AppState.activePriceCategoryId || 'normal';
    var payload = { name: name, price_cents: cents, lesson_type_match: null, auto_apply: false, category_id: activeCatId };
    try {
      if (templateId) {
        await ApiClient.put('/api/pricing-templates/' + templateId, payload);
      } else {
        await ApiClient.post('/api/pricing-templates', payload);
      }
      App.closeModal();
      App.showToast('Gespeichert', 'success');
      this._loadPricingAndCategories();
    } catch (err) { App.showToast('Fehler: ' + (err.message || err), 'error'); }
  },

  toggleTemplateActive: async function(templateId, makeActive) {
    try {
      await ApiClient.put('/api/pricing-templates/' + templateId, { active: makeActive });
      this._loadPricingAndCategories();
    } catch (err) { App.showToast('Fehler: ' + (err.message || err), 'error'); }
  },

  deleteTemplate: async function(templateId) {
    if (!confirm('Diesen Preis wirklich l\u00f6schen? Bereits erfasste Positionen bleiben erhalten.')) return;
    try {
      await ApiClient.del('/api/pricing-templates/' + templateId);
      App.showToast('Gel\u00f6scht', 'success');
      this._loadPricingAndCategories();
    } catch (err) { App.showToast('Fehler: ' + (err.message || err), 'error'); }
  },

  // ============================================================
  // PUSH 7: Schüler-Zuweisungs-Dialog (übernommen aus Push 6)
  // ============================================================
  openAssignPriceCategoryDialog: async function() {
    // Vor Öffnen: aktuelle Kategorien sichern (falls Draft un-saved Labels enthält)
    var cats = AppState.priceCategoriesDraft || [];
    var savedCats = cats.filter(function(c) { return (c.label || '').trim().length > 0; });
    if (savedCats.length === 0) {
      App.showToast('Lege erst eine Kategorie an', 'error'); return;
    }
    App.openModal('Sch\u00fcler-Kategorien zuweisen', '<div style="padding:var(--space-4);text-align:center;"><div class="loading-spinner"></div></div>');
    try {
      var res = await ApiClient.get('/api/school/students-for-price-categories');
      AppState.assignPcStudents = (res && res.students) ? res.students : [];
      AppState.assignPcSelection = {};
      AppState.assignPcSearch = '';
      this._renderAssignPriceCategoryDialog();
    } catch (err) {
      App.showToast('Fehler: ' + (err.message || err), 'error');
      App.closeModal();
    }
  },

  _renderAssignPriceCategoryDialog: function() {
    var cats = (AppState.priceCategoriesDraft || []).filter(function(c) { return (c.label || '').trim().length > 0; });
    var students = AppState.assignPcStudents || [];
    var selection = AppState.assignPcSelection || {};
    var search = (AppState.assignPcSearch || '').toLowerCase().trim();
    var esc = this._escapeHtml.bind(this);

    // Label-Lookup
    var labelById = {};
    cats.forEach(function(c) { labelById[c.id] = c.label; });

    // Suche anwenden
    var filtered = students;
    if (search) {
      filtered = students.filter(function(s) {
        return (s.name || '').toLowerCase().indexOf(search) >= 0;
      });
    }

    var selectedCount = Object.keys(selection).filter(function(k) { return selection[k]; }).length;
    var filteredAllSelected = filtered.length > 0 && filtered.every(function(s) { return !!selection[s.id]; });

    var rows = '';
    if (filtered.length === 0) {
      rows = '<div style="padding:var(--space-4);text-align:center;color:var(--text-muted);font-size:var(--text-sm);">' +
        (students.length === 0 ? 'Noch keine Sch\u00fcler.' : 'Keine Treffer.') + '</div>';
    } else {
      var i;
      for (i = 0; i < filtered.length; i++) {
        var s = filtered[i];
        var checked = !!selection[s.id];
        var currentLabel = s.price_category ? (labelById[s.price_category] || s.price_category) : '';
        rows += '<label class="pc-stud-row" style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--border-light);cursor:pointer;">' +
          '<input type="checkbox" class="pc-stud-check" ' + (checked ? 'checked' : '') + ' onchange="App._togglePcStudent(\'' + s.id + '\', this.checked)">' +
          '<div style="flex:1;min-width:0;"><div style="font-weight:500;">' + esc(s.name) + '</div>' +
          (currentLabel ? '<div style="font-size:var(--text-xs);color:var(--text-muted);">Aktuell: ' + esc(currentLabel) + '</div>' : '<div style="font-size:var(--text-xs);color:var(--text-muted);">\u2014 keine Kategorie \u2014</div>') +
          '</div></label>';
      }
    }

    // Kategorie-Optionen
    var catOpts = '<option value="">\u2014 Auswahl\u2026 \u2014</option>';
    cats.forEach(function(c) {
      catOpts += '<option value="' + esc(c.id) + '">' + esc(c.label) + '</option>';
    });
    catOpts += '<option value="__clear__">\u2014 Kategorie entfernen \u2014</option>';

    var body = '<div style="display:flex;flex-direction:column;gap:var(--space-3);max-height:70vh;">' +
      '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;align-items:center;">' +
        '<input type="text" class="form-input" id="pc-search" placeholder="Suche\u2026" value="' + esc(search) + '" oninput="App._setPcSearch(this.value)" style="flex:1;min-width:140px;">' +
        '<label style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);white-space:nowrap;">' +
          '<input type="checkbox" id="pc-all" ' + (filteredAllSelected ? 'checked' : '') + ' onchange="App._toggleAllPcStudents(this.checked)"> Alle' +
        '</label>' +
      '</div>' +
      '<div style="font-size:var(--text-xs);color:var(--text-muted);">' + selectedCount + ' ausgew\u00e4hlt \u00b7 ' + filtered.length + ' angezeigt</div>' +
      '<div style="border:1px solid var(--border-light);border-radius:var(--radius-md);overflow-y:auto;max-height:40vh;">' + rows + '</div>' +
      '<div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;padding-top:var(--space-2);border-top:1px solid var(--border-light);">' +
        '<select class="form-select" id="pc-assign-select" style="flex:1;min-width:140px;">' + catOpts + '</select>' +
        '<button class="btn btn-primary" onclick="App._assignPriceCategoryToSelected()"' + (selectedCount === 0 ? ' disabled' : '') + '>Zuweisen (' + selectedCount + ')</button>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;">' +
        '<button class="btn btn-secondary" onclick="App.closeModal()">Schlie\u00dfen</button>' +
      '</div>' +
    '</div>';
    App.openModal('Sch\u00fcler-Kategorien zuweisen', body);
  },

  _setPcSearch: function(v) {
    AppState.assignPcSearch = v || '';
    this._renderAssignPriceCategoryDialog();
    // Fokus + Cursor wiederherstellen
    setTimeout(function() {
      var el = document.getElementById('pc-search');
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 0);
  },

  _togglePcStudent: function(id, checked) {
    if (!AppState.assignPcSelection) AppState.assignPcSelection = {};
    if (checked) AppState.assignPcSelection[id] = true;
    else delete AppState.assignPcSelection[id];
    this._renderAssignPriceCategoryDialog();
  },

  _toggleAllPcStudents: function(checked) {
    if (!AppState.assignPcSelection) AppState.assignPcSelection = {};
    var students = AppState.assignPcStudents || [];
    var search = (AppState.assignPcSearch || '').toLowerCase().trim();
    var filtered = search
      ? students.filter(function(s) { return (s.name || '').toLowerCase().indexOf(search) >= 0; })
      : students;
    filtered.forEach(function(s) {
      if (checked) AppState.assignPcSelection[s.id] = true;
      else delete AppState.assignPcSelection[s.id];
    });
    this._renderAssignPriceCategoryDialog();
  },

  _assignPriceCategoryToSelected: async function() {
    var sel = AppState.assignPcSelection || {};
    var ids = Object.keys(sel).filter(function(k) { return sel[k]; });
    if (ids.length === 0) { App.showToast('Keine Sch\u00fcler ausgew\u00e4hlt', 'error'); return; }
    var selEl = document.getElementById('pc-assign-select');
    var val = selEl ? selEl.value : '';
    if (!val) { App.showToast('Kategorie w\u00e4hlen', 'error'); return; }
    var categoryId = (val === '__clear__') ? null : val;
    try {
      var res = await ApiClient.put('/api/school/bulk/student-price-category', { studentIds: ids, categoryId: categoryId });
      App.showToast((res.updated || 0) + ' Sch\u00fcler aktualisiert', 'success');
      // Liste aktualisieren
      var students = AppState.assignPcStudents || [];
      students.forEach(function(s) {
        if (sel[s.id]) s.price_category = categoryId;
      });
      AppState.assignPcSelection = {};
      this._renderAssignPriceCategoryDialog();
    } catch (err) {
      App.showToast('Fehler: ' + (err.message || err), 'error');
    }
  },

  _loadProfileAbo: async function() {
    var container = document.getElementById('profile-abo-section');
    if (!container) return;
    try {
      var sub = await ApiClient.get('/api/stripe/subscription');
      var statusLabels = { trial: 'Testphase', active: 'Aktiv', free: 'Gratis-Abo', expired: 'Abgelaufen' };
      var statusColors = { trial: 'warning', active: 'success', free: 'success', expired: 'error' };
      var statusLabel = statusLabels[sub.status] || sub.status;
      var statusColor = statusColors[sub.status] || 'muted';
      var planLabel = sub.plan === 'ki' ? 'FahrDoc KI \u2728' : (sub.plan === 'classic' ? 'FahrDoc Classic' : 'Kein Tarif');

      var h = '<div class="card mb-4">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-2);">' +
          '<div><div style="font-size:var(--text-lg);font-weight:700;">' + planLabel + '</div>' +
          (sub.days_remaining !== null && sub.status === 'trial' ? '<div style="font-size:var(--text-sm);color:var(--text-muted);">Testphase: noch ' + sub.days_remaining + ' Tag' + (sub.days_remaining === 1 ? '' : 'e') + '</div>' : '') +
          (sub.current_period_end && sub.status === 'active' ? '<div style="font-size:var(--text-sm);color:var(--text-muted);">N\u00e4chste Abbuchung: ' + new Date(sub.current_period_end).toLocaleDateString('de-DE') + '</div>' : '') +
          '</div>' +
          '<span class="badge badge-' + statusColor + '">' + statusLabel + '</span>' +
        '</div>';

      if (sub.cancel_at_period_end && sub.current_period_end) {
        h += '<div style="padding:var(--space-3);background:#fff8e1;border-radius:var(--radius-md);margin-top:var(--space-3);font-size:var(--text-sm);">Abo wird zum ' + new Date(sub.current_period_end).toLocaleDateString('de-DE') + ' beendet.</div>';
      }
      if (!sub.active && sub.lock_reason) {
        h += '<div style="padding:var(--space-3);background:#ffeaea;border-radius:var(--radius-md);margin-top:var(--space-3);font-size:var(--text-sm);color:#c62828;"><strong>App gesperrt:</strong> ' + sub.lock_reason + '</div>';
      }

      h += '<div style="display:flex;gap:var(--space-2);margin-top:var(--space-3);flex-wrap:wrap;">' +
        '<button class="btn btn-primary" onclick="App.switchSchoolTab(\'abo\')">' + (sub.active ? 'Tarif \u00e4ndern' : 'Tarif w\u00e4hlen') + '</button>' +
        (sub.has_stripe ? '<button class="btn btn-secondary" onclick="App.stripePortal()">Stripe-Portal</button>' : '') +
      '</div>';
      h += '</div>';
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
    } catch (err) {
      var msg = err && err.message ? err.message : '';
      // Spezialfall: Testphasen-Limit fuer Fahrlehrer-Codes
      if (msg.indexOf('Testphase') !== -1 && msg.indexOf('Fahrlehrer') !== -1) {
        var lockHtml = '<div style="text-align:center;padding:8px 0;">' +
          '<div style="font-size:42px;margin-bottom:12px;">\uD83D\uDD12</div>' +
          '<h3 style="margin:0 0 12px 0;color:#c62828;">Limit erreicht</h3>' +
          '<p style="margin:0 0 16px 0;line-height:1.5;color:#444;">In der Testphase kannst du <strong>maximal 2 Fahrlehrer-Codes</strong> erstellen. Schliesse jetzt ein Abo ab, um beliebig viele Fahrlehrer hinzuzufuegen.</p>' +
          '<button class="btn btn-primary" onclick="App.closeModalForce();App.switchSchoolTab(\'abo\')" style="width:100%;padding:14px;font-size:16px;">Jetzt Abo abschliessen</button>' +
          '<button class="btn btn-ghost" onclick="App.closeModalForce()" style="width:100%;margin-top:8px;">Abbrechen</button>' +
        '</div>';
        this.openModal('Fahrlehrer-Limit', lockHtml);
        return;
      }
      this.showToast(t('fehler') + ': ' + msg);
    }
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

    // SOLO LOCK: Bei abgelaufenem Trial / Abo gesamten Screen sperren
    if (this.isSolo()) {
      var soloSub = await this.loadSoloSubscription(true);
      if (soloSub && soloSub.locked) {
        this.renderSoloLockScreen(soloSub);
        return;
      }
    }

    var nameEl = document.getElementById('instructor-name-display');
    if (nameEl) nameEl.textContent = inst.name;
    AppState._cachedData = AppState._cachedData || {};

    // Perf: Dashboard + Students + aktuelle Woche-Schedule + Theorie PARALLEL prefetchen.
    // Damit Tab-Wechsel danach instant aus Cache rendern.
    this.initWeek();
    var w = this.getWeekDates(AppState.scheduleWeekStart);
    var wsStr = formatDateLocal(w.monday);
    var weStr = formatDateLocal(w.saturday);
    var cacheKey = wsStr + '|inst';
    AppState._cachedData._scheduleBundle = AppState._cachedData._scheduleBundle || {};

    var dashP = ApiClient.get('/api/instructor/dashboard').catch(function(){ return null; });
    var studP = ApiClient.get('/api/instructor/students').catch(function(){ return null; });
    var schedP = ApiClient.get('/api/schedule?weekStart=' + wsStr + '&weekEnd=' + weStr).catch(function(){ return null; });
    var theoryP = ApiClient.get('/api/theory/schedule?week_start=' + wsStr).catch(function(){ return []; });

    var results = await Promise.all([dashP, studP, schedP, theoryP]);
    var data = results[0];
    var students = results[1];
    var schedData = results[2];
    var theorySchedule = results[3] || [];

    if (data) {
      AppState._cachedData.instructorDash = data;
      AppState._cachedData.instructorDashTs = Date.now();
      var banner = document.getElementById('instructor-expired-banner');
      if (data.isExpired) banner.classList.remove('hidden');
      else banner.classList.add('hidden');
    }
    if (students) {
      AppState._cachedData.instructorStudents = students;
      AppState._cachedData.instructorStudentsTs = Date.now();
    }
    if (schedData) {
      AppState._cachedData._scheduleBundle[cacheKey] = {
        ts: Date.now(),
        scheduleData: schedData,
        theorySchedule: theorySchedule
      };
      AppState.scheduleData = schedData;
    }

    this.loadNotifications();
    this.switchInstructorTab('dashboard');
  },

  switchInstructorTab: function(tab, btn) {
    AppState.currentInstructorTab = tab;
    if (btn) {
      document.querySelectorAll('#instructor-nav .bottom-nav-item').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    } else {
      document.querySelectorAll('#instructor-nav .bottom-nav-item').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
      });
    }
    if (tab === 'dashboard') {
      if (this.isSolo()) this.renderSoloDashboardTab();
      else this.renderInstructorDashboardTab();
    }
    else if (tab === 'students') this.renderInstructorStudentsTab();
    else if (tab === 'lessons') this.renderInstructorLessonsTab();
    else if (tab === 'profile') {
      if (this.isSolo()) this.renderSoloProfileTab();
      else this.renderInstructorProfileTab();
    }
  },

  // ============================================
  // SOLO DASHBOARD — schlank, kein Wochenplan
  // ============================================
  renderSoloDashboardTab: async function() {
    var inst = AppState.currentUser;
    var main = document.getElementById('instructor-main');
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';

    var data;
    try {
      data = await ApiClient.get('/api/instructor/dashboard');
      AppState._cachedData.instructorDash = data;
    } catch (e) {
      main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">Fehler: ' + e.message + '</p></div>';
      return;
    }

    var students = data.students || [];
    var lessons = data.lessons || [];

    // Solo-Subscription laden
    var soloSub = await this.loadSoloSubscription();

    // Stats berechnen
    var totalMin = 0;
    lessons.forEach(function(l) { totalMin += (l.duration || 0); });
    var totalH = Math.floor(totalMin / 60);
    var trialDaysLeft = (soloSub && soloSub.state === 'trial' && soloSub.trial_days_left !== null) ? soloSub.trial_days_left : null;

    // Letzte 5 Fahrstunden
    var recent = lessons.slice(0, 5);

    var html = '<div class="page-padding">';

    // Subscription-Banner (sanfter Lock)
    html += this.soloSubBannerHtml(soloSub);

    // Hero / Begrüßung
    html += '<div class="solo-hero">' +
      '<div class="solo-hero-badge">FahrDoc Solo</div>' +
      '<h2 class="solo-hero-title">Hallo, ' + inst.name + '</h2>' +
      '<p class="solo-hero-sub">Deine Fahrstunden — dokumentiert wie vom Prüfer.</p>' +
      (trialDaysLeft !== null && soloSub && soloSub.state === 'trial' ? '<div class="solo-hero-trial">⏳ Noch <strong>' + trialDaysLeft + '</strong> Tage gratis</div>' : '') +
      (soloSub && soloSub.state === 'active' && !soloSub.cancel_at_period_end ? '<div class="solo-hero-trial" style="background:rgba(34,197,94,0.15);color:#15803d;">✓ Abo aktiv</div>' : '') +
    '</div>';

    // Stats-Cards
    html += '<div class="solo-stats">' +
      '<div class="solo-stat"><div class="solo-stat-value">' + students.length + '</div><div class="solo-stat-label">Schüler</div></div>' +
      '<div class="solo-stat"><div class="solo-stat-value">' + lessons.length + '</div><div class="solo-stat-label">Fahrstunden</div></div>' +
      '<div class="solo-stat"><div class="solo-stat-value">' + totalH + '<span class="solo-stat-unit">h</span></div><div class="solo-stat-label">Gesamtzeit</div></div>' +
    '</div>';

    // Schnell-Aktionen
    html += '<div class="solo-actions">' +
      '<button class="solo-action solo-action-primary" onclick="App.openSoloAddStudent()">' +
        '<div class="solo-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg></div>' +
        '<div class="solo-action-text"><div class="solo-action-title">Schüler anlegen</div><div class="solo-action-desc">Neuen Schüler hinzufügen</div></div>' +
      '</button>' +
      '<button class="solo-action" onclick="App.navigate(\'lesson-setup\')">' +
        '<div class="solo-action-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
        '<div class="solo-action-text"><div class="solo-action-title">Fahrstunde starten</div><div class="solo-action-desc">Tracking & Bewertung</div></div>' +
      '</button>' +
    '</div>';

    // Letzte Fahrstunden
    if (recent.length > 0) {
      html += '<div class="solo-section"><div class="solo-section-head"><span class="solo-section-title">Letzte Fahrstunden</span>' +
        '<button class="btn btn-ghost btn-sm" onclick="App.switchInstructorTab(\'lessons\')">Alle</button></div>';
      recent.forEach(function(l) {
        var avg = App.avgRating(l.ratings);
        html += '<div class="card card-interactive mb-2" onclick="App.showLessonReview(\'' + l.id + '\', \'' + l.student_id + '\', \'instructor\')"><div style="display:flex;align-items:center;gap:var(--space-3);">' +
          App.avatarHtml(l.student_name, 'sm') +
          '<div class="flex-1"><div style="font-weight:600;font-size:var(--text-sm);">' + tType(l.type) + '</div>' +
          '<div class="text-xs text-muted">' + l.student_name + ' · ' + App.formatDate(l.date) + ' · ' + App.formatDuration(l.duration) + '</div></div>' +
          '<div>' + App.skillLevelHtml(avg) + '</div></div></div>';
      });
      html += '</div>';
    } else {
      html += '<div class="solo-empty"><div class="solo-empty-icon">💡</div>' +
        '<div class="solo-empty-title">Noch keine Fahrstunden</div>' +
        '<div class="solo-empty-desc">Lege zuerst einen Schüler an, dann starte deine erste getrackte Fahrstunde.</div></div>';
    }

    html += '</div>';
    main.innerHTML = html;
  },

  // ============================================
  // SOLO PROFIL — keine Fahrschul-Zuordnung
  // ============================================
  renderSoloProfileTab: async function() {
    var main = document.getElementById('instructor-main');
    try {
      var profile = await ApiClient.get('/api/instructor/profile');
      var soloSub = await this.loadSoloSubscription(true);
      var trialInfo = this.soloAboCardHtml(soloSub);
      var html = '<div class="page-padding"><div class="profile-header">' + this.avatarHtml(profile.name, 'lg') +
        '<h3>' + profile.name + '</h3><p class="text-xs text-muted">FahrDoc Solo — Einzel-Fahrlehrer</p></div>' +
        this.soloSubBannerHtml(soloSub) +
        '<div class="card mb-4"><div class="section-title mb-3">Persönliche Daten</div>' +
          '<form id="solo-profile-form" onsubmit="App.saveInstructorProfile(event)">' +
            '<div class="form-group mb-3"><label class="form-label">Name</label><input class="form-input" type="text" id="inst-profile-name" value="' + profile.name + '"></div>' +
            '<div class="form-group mb-3"><label class="form-label">E-Mail</label><input class="form-input" type="email" id="inst-profile-email" value="' + profile.email + '"></div>' +
            '<div class="form-group mb-3"><label class="form-label">Telefon</label><input class="form-input" type="tel" id="inst-profile-phone" value="' + (profile.phone || '') + '"></div>' +
            '<button type="submit" class="btn btn-primary btn-full">Änderungen speichern</button></form></div>' +
        trialInfo +
        this.changePasswordHtml() +
        '<button class="btn btn-secondary btn-full" style="margin-top:20px" onclick="App.logout()">Abmelden</button></div>';
      main.innerHTML = html;
    } catch (err) {
      main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">Fehler: ' + err.message + '</p></div>';
    }
  },

  // ============================================
  // SOLO: Schüler anlegen (schlankes Modal)
  // ============================================
  openSoloAddStudent: function() {
    var modal = document.getElementById('solo-add-student-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'solo-add-student-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = '<div class="modal-content" style="max-width:480px;">' +
        '<div class="modal-header"><h3>Neuen Schüler anlegen</h3>' +
          '<button class="icon-btn" onclick="App.closeSoloAddStudent()" aria-label="Schließen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
        '<form id="solo-add-student-form" onsubmit="App.submitSoloAddStudent(event)" class="modal-body">' +
          '<div class="form-row form-row-2">' +
            '<div class="form-group"><label class="form-label">Vorname</label><input class="form-input" type="text" id="sas-firstname" required></div>' +
            '<div class="form-group"><label class="form-label">Nachname</label><input class="form-input" type="text" id="sas-lastname" required></div>' +
          '</div>' +
          '<div class="form-group"><label class="form-label">E-Mail</label><input class="form-input" type="email" id="sas-email" required></div>' +
          '<div class="form-group"><label class="form-label">Telefon (optional)</label><input class="form-input" type="tel" id="sas-phone"></div>' +
          '<div class="form-group"><label class="form-label">Führerscheinklasse</label>' +
            '<select class="form-select" id="sas-license">' +
              '<option value="B">B</option><option value="B17">BF17</option><option value="B96">B96</option><option value="B196">B196</option><option value="BE">BE</option><option value="A">A</option><option value="A1">A1</option><option value="A2">A2</option><option value="AM">AM</option>' +
            '</select></div>' +
          '<div id="sas-error" class="form-error hidden"></div>' +
          '<button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:8px;">Schüler anlegen</button>' +
        '</form></div>';
      document.body.appendChild(modal);
    }
    modal.classList.add('active');
    setTimeout(function(){ var f = document.getElementById('sas-firstname'); if (f) f.focus(); }, 50);
  },
  closeSoloAddStudent: function() {
    var modal = document.getElementById('solo-add-student-modal');
    if (modal) modal.classList.remove('active');
  },
  submitSoloAddStudent: async function(e) {
    e.preventDefault();
    var err = document.getElementById('sas-error');
    err.classList.add('hidden');
    var firstName = document.getElementById('sas-firstname').value.trim();
    var lastName = document.getElementById('sas-lastname').value.trim();
    var email = document.getElementById('sas-email').value.trim();
    var phone = document.getElementById('sas-phone').value.trim();
    var license = document.getElementById('sas-license').value;
    try {
      this.showLoading(true);
      await ApiClient.post('/api/instructor/students', {
        firstName: firstName, lastName: lastName,
        name: firstName + ' ' + lastName,
        email: email, phone: phone || null,
        license_class: license, status: 'aktiv'
      });
      this.closeSoloAddStudent();
      this.showToast('Schüler angelegt');
      AppState._cachedData.instructorDash = null;
      AppState._cachedData.instructorStudents = null;
      if (AppState.currentScreen === 'instructor-dashboard') {
        // aktiven Tab neu rendern
        var active = document.querySelector('#instructor-nav .bottom-nav-item.active');
        var tab = active ? active.getAttribute('data-tab') : 'dashboard';
        this.switchInstructorTab(tab);
      }
    } catch (er) {
      err.textContent = er.message; err.classList.remove('hidden');
    } finally { this.showLoading(false); }
  },

  renderInstructorDashboardTab: async function() {
    var inst = AppState.currentUser;
    var main = document.getElementById('instructor-main');

    this.initWeek();
    var w = this.getWeekDates(AppState.scheduleWeekStart);
    var wsStr = formatDateLocal(w.monday);
    var weStr = formatDateLocal(w.saturday);

    // TTL-Cache (30s) — instant Re-Render bei Tab-Wechsel / Wochen-Navigation zurück
    var cacheKey = wsStr + '|inst';
    AppState._cachedData = AppState._cachedData || {};
    AppState._cachedData._scheduleBundle = AppState._cachedData._scheduleBundle || {};
    var cached = AppState._cachedData._scheduleBundle[cacheKey];
    var cacheValid = cached && (Date.now() - cached.ts) < 30000;
    var hasCache = !!cached;

    // Spinner nur zeigen wenn KEIN Cache (auch nicht stale) verfügbar ist
    if (!hasCache) {
      main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    }

    var data, theoryScheduleInst;
    if (cacheValid) {
      data = cached.scheduleData;
      theoryScheduleInst = cached.theorySchedule;
    } else if (hasCache) {
      // Stale-While-Revalidate: sofort mit altem Cache rendern, im Hintergrund refresh
      data = cached.scheduleData;
      theoryScheduleInst = cached.theorySchedule;
      // Hintergrund-Refresh ohne UI-Block
      Promise.all([
        ApiClient.get('/api/schedule?weekStart=' + wsStr + '&weekEnd=' + weStr).catch(function(){ return null; }),
        ApiClient.get('/api/theory/schedule?week_start=' + wsStr).catch(function(){ return []; })
      ]).then(function(r) {
        if (r[0]) {
          AppState._cachedData._scheduleBundle[cacheKey] = {
            ts: Date.now(), scheduleData: r[0], theorySchedule: r[1] || []
          };
          // Nur neu rendern wenn User noch auf dem Tab ist
          if (AppState.currentInstructorTab === 'dashboard') App.renderInstructorDashboardTab();
        }
      });
    } else {
      // Erster Aufruf — sequentiell warten
      try {
        var results = await Promise.all([
          ApiClient.get('/api/schedule?weekStart=' + wsStr + '&weekEnd=' + weStr),
          ApiClient.get('/api/theory/schedule?week_start=' + wsStr).catch(function(){ return []; })
        ]);
        data = results[0];
        theoryScheduleInst = results[1];
        AppState._cachedData._scheduleBundle[cacheKey] = {
          ts: Date.now(), scheduleData: data, theorySchedule: theoryScheduleInst
        };
      } catch(e) {
        main.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + e.message + '</p></div>';
        return;
      }
    }
    AppState.scheduleData = data;

    var slots = (data && data.slots) ? data.slots.slice() : [];

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
        var dayHoliday = getHolidayForDate(day);
        var cls = 'schedule-day-tab' + (isActive ? ' active' : '') + (isToday ? ' today' : '') + (dayHoliday ? ' holiday' : '');
        var dStr = formatDateLocal(day);
        var cnt = slots.filter(function(s) { return s.date === dStr; }).length;
        var titleAttr = dayHoliday ? ' title="' + dayHoliday.replace(/"/g, '&quot;') + '"' : '';
        html += '<button class="' + cls + '"' + titleAttr + ' onclick="App.selectDay(' + idx + ')">' +
          '<div class="schedule-day-tab-name">' + getDayNames()[idx] + '</div>' +
          '<div class="schedule-day-tab-date">' + day.getDate() + '</div>' +
          (cnt > 0 ? '<div class="schedule-day-tab-dots">' + cnt + '</div>' : '') +
        '</button>';
      });
      html += '</div>';

      var selectedHoliday = getHolidayForDate(selectedDate);
      if (selectedHoliday) {
        html += '<div class="holiday-banner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>' + t('feiertag') + ': ' + selectedHoliday + '</span></div>';
      }

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
          var blockParsed = isBlock ? parseBlockNotes(slot.notes) : null;
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
              '<div class="schedule-slot-card-title">' + (isTheory ? t('theorieThema') + ' ' + (slot.theory_topic_number || '') : (isBlock ? ((blockParsed && blockParsed.reason) || t('nichtVerfuegbar')) : (slot.student_name || t('offenerBlock')))) + '</div>' +
              '<div class="schedule-slot-card-meta">' + (isTheory ? (slot.theory_topic_title || '') : (isBlock ? (t('zeitsperre') + (blockParsed && blockParsed.text ? ' \u00b7 ' + blockParsed.text : '')) : (tType(slot.type) + (slot.license_class ? ' \u00b7 ' + t('klasse') + ' ' + slot.license_class : '') + (isRecurring ? ' \uD83D\uDD01' : '')))) + '</div>' +
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

  _renderStudentsList: function(students) {
    var main = document.getElementById('instructor-main');
    var isSolo = App.isSolo();
    var addBtn = isSolo ? '<button class="btn btn-primary btn-sm" onclick="App.openSoloAddStudent()">+ Schüler</button>' : '';
    var html = '<div class="page-padding"><div class="section-header"><span class="section-title">' + t('meineSchueler') + ' (' + students.length + ')</span>' + addBtn + '</div>';
    if (students.length === 0 && isSolo) {
      html += '<div class="solo-empty"><div class="solo-empty-icon">👥</div>' +
        '<div class="solo-empty-title">Noch keine Schüler</div>' +
        '<div class="solo-empty-desc">Lege deinen ersten Schüler an, um Fahrstunden zu tracken.</div>' +
        '<button class="btn btn-primary btn-lg" style="margin-top:16px;" onclick="App.openSoloAddStudent()">+ Schüler anlegen</button></div>';
    } else {
      students.forEach(function(st) {
        html += '<div class="card card-interactive mb-3" onclick="App.viewStudentDetail(\'' + st.id + '\')"><div style="display:flex;align-items:center;gap:var(--space-3);">' +
          App.avatarHtml(st.name, '') +
          '<div class="flex-1"><div style="font-weight:600;font-size:var(--text-sm);">' + st.name + '</div>' +
          '<div class="text-xs text-muted">' + t('klasse') + ' ' + st.license_class + ' · ' + st.lessonCount + ' ' + t('fahrstunden') + '</div></div>' +
          '<div>' + App.skillLevelHtml(st.avgSkill || 0) + '</div></div></div>';
      });
    }
    html += '</div>';
    main.innerHTML = html;
  },

  renderInstructorStudentsTab: async function() {
    var main = document.getElementById('instructor-main');
    AppState._cachedData = AppState._cachedData || {};
    var cached = AppState._cachedData.instructorStudents;
    var cachedTs = AppState._cachedData.instructorStudentsTs || 0;
    var cacheValid = cached && (Date.now() - cachedTs) < 30000;

    if (cached) {
      // Sofort aus Cache rendern (auch wenn stale)
      App._renderStudentsList(cached);
      if (cacheValid) return;
      // Stale: im Hintergrund refresh
      ApiClient.get('/api/instructor/students').then(function(students) {
        AppState._cachedData.instructorStudents = students;
        AppState._cachedData.instructorStudentsTs = Date.now();
        if (AppState.currentInstructorTab === 'students') App._renderStudentsList(students);
      }).catch(function(){});
      return;
    }

    // Kein Cache — Spinner + warten
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var students = await ApiClient.get('/api/instructor/students');
      AppState._cachedData.instructorStudents = students;
      AppState._cachedData.instructorStudentsTs = Date.now();
      App._renderStudentsList(students);
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
  // ════════════════════════════════════════════════════════════════
  //  SCHUELER MANUELL ANLEGEN / EDITIEREN (durch Fahrschule)
  // ════════════════════════════════════════════════════════════════
  _studentFormHtml: function(student, instructors, priceCategories) {
    var s = student || {};
    // name -> firstName/lastName splitten (rueckwaerts-kompatibel)
    var parts = (s.name || '').trim().split(/\s+/);
    var firstName = parts.slice(0, -1).join(' ') || (parts.length === 1 ? parts[0] : '');
    var lastName = parts.length > 1 ? parts[parts.length - 1] : '';
    var classes = ['B', 'B78', 'B96', 'B196', 'B197', 'BE', 'A', 'A1', 'A2', 'AM', 'BF17', 'C', 'CE', 'D', 'L', 'T'];
    var statuses = ['aktiv', 'pausiert', 'abgeschlossen', 'abgemeldet'];
    var selectedClass = s.license_class || 'B';
    var selectedStatus = s.status || 'aktiv';
    var todayIso = new Date().toISOString().slice(0, 10);
    var registered = s.registered_at ? s.registered_at.slice(0, 10) : (s.id ? '' : todayIso);
    var birth = s.birthdate ? s.birthdate.slice(0, 10) : '';
    var instOptions = '<option value="">\u2014 Kein Fahrlehrer \u2014</option>';
    (instructors || []).forEach(function(i) {
      instOptions += '<option value="' + i.id + '">' + i.name + '</option>';
    });
    var isEdit = !!s.id;
    // Vorhandene Fuehrerscheine (Array von Strings)
    var existingLicArr = Array.isArray(s.existing_licenses) ? s.existing_licenses : [];
    var licenseOptions = ['AM','A1','A2','A','B (alt, vor 1999)','B','BE','L','T','C1','C','D1','D','andere'];
    var licenseCheckboxes = licenseOptions.map(function(lic) {
      var checked = existingLicArr.indexOf(lic) >= 0 ? ' checked' : '';
      var safeId = 'stf-lic-' + lic.replace(/[^a-zA-Z0-9]/g, '-');
      return '<label style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--border-light);border-radius:var(--radius-md);font-size:var(--text-sm);cursor:pointer;background:white;">' +
        '<input type="checkbox" class="stf-license-cb" data-license="' + lic.replace(/"/g, '&quot;') + '" id="' + safeId + '"' + checked + '>' +
        lic.replace(/</g, '&lt;') +
      '</label>';
    }).join('');
    // Ausweis-Typen
    var idDocTypes = ['', 'Personalausweis', 'Reisepass', 'Aufenthaltstitel', 'Sonstiges'];
    var idDocTypeOptions = idDocTypes.map(function(t) {
      var label = t === '' ? '\u2014 keine Angabe \u2014' : t;
      var sel = (s.id_document_type || '') === t ? ' selected' : '';
      return '<option value="' + t.replace(/"/g, '&quot;') + '"' + sel + '>' + label + '</option>';
    }).join('');
    // Rechnungsadresse Defaults
    var billingSame = (s.billing_same_as_address === false) ? false : true; // default true
    var billingHidden = billingSame ? 'display:none;' : '';
    var billingName = (s.billing_name || '').replace(/"/g, '&quot;');
    var billingStreet = (s.billing_street || '').replace(/"/g, '&quot;');
    var billingPostal = (s.billing_postal_code || '').replace(/"/g, '&quot;');
    var billingCity = (s.billing_city || '').replace(/"/g, '&quot;');
    var billingCountry = (s.billing_country || 'Deutschland').replace(/"/g, '&quot;');
    // Preiskategorien-Optionen
    var pcArr = Array.isArray(priceCategories) ? priceCategories : [];
    var pcOptions = '<option value="">\u2014 keine Kategorie \u2014</option>';
    pcArr.forEach(function(c) {
      var sel = (s.price_category || '') === c.id ? ' selected' : '';
      pcOptions += '<option value="' + String(c.id).replace(/"/g, '&quot;') + '"' + sel + '>' + String(c.label || c.id).replace(/</g, '&lt;') + '</option>';
    });

    var h = '<form id="student-form" onsubmit="event.preventDefault();App.submitStudentForm();" style="display:flex;flex-direction:column;gap:var(--space-3);">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">' +
        '<div class="form-group"><label class="form-label">Vorname *</label><input class="form-input" id="stf-firstName" type="text" value="' + firstName.replace(/"/g,'&quot;') + '" required></div>' +
        '<div class="form-group"><label class="form-label">Nachname *</label><input class="form-input" id="stf-lastName" type="text" value="' + lastName.replace(/"/g,'&quot;') + '" required></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">E-Mail *</label><input class="form-input" id="stf-email" type="email" value="' + (s.email || '').replace(/"/g,'&quot;') + '" required></div>' +
      '<div class="form-group"><label class="form-label">Telefon</label><input class="form-input" id="stf-phone" type="tel" value="' + (s.phone || '').replace(/"/g,'&quot;') + '"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">' +
        '<div class="form-group"><label class="form-label">Geburtsdatum</label><input class="form-input" id="stf-birthdate" type="date" value="' + birth + '"></div>' +
        '<div class="form-group"><label class="form-label">Geburtsort</label><input class="form-input" id="stf-birthplace" type="text" placeholder="z.\u202fB. Berlin" value="' + (s.birthplace || '').replace(/"/g,'&quot;') + '"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Angemeldet am</label><input class="form-input" id="stf-registered" type="date" value="' + registered + '"></div>' +
      // === Sektion: Adresse ===
      '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border-light);">Wohnadresse</div>' +
      '<div class="form-group"><label class="form-label">Stra\u00dfe und Hausnummer</label><input class="form-input" id="stf-street" type="text" placeholder="Musterstra\u00dfe 12" value="' + (s.street || '').replace(/"/g,'&quot;') + '"></div>' +
      '<div style="display:grid;grid-template-columns:120px 1fr;gap:var(--space-3);">' +
        '<div class="form-group"><label class="form-label">PLZ</label><input class="form-input" id="stf-postal" type="text" inputmode="numeric" maxlength="5" placeholder="10115" value="' + (s.postal_code || '').replace(/"/g,'&quot;') + '"></div>' +
        '<div class="form-group"><label class="form-label">Ort</label><input class="form-input" id="stf-city" type="text" placeholder="Berlin" value="' + (s.city || '').replace(/"/g,'&quot;') + '"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">' +
        '<div class="form-group"><label class="form-label">Klasse (angestrebt)</label><select class="form-select" id="stf-class">';
    classes.forEach(function(c) {
      h += '<option value="' + c + '"' + (c === selectedClass ? ' selected' : '') + '>' + c + '</option>';
    });
    h += '</select></div>' +
        '<div class="form-group"><label class="form-label">Status</label><select class="form-select" id="stf-status">';
    statuses.forEach(function(st) {
      h += '<option value="' + st + '"' + (st === selectedStatus ? ' selected' : '') + '>' + st + '</option>';
    });
    h += '</select></div>' +
      '</div>' +
      (!isEdit ? ('<div class="form-group"><label class="form-label">Zugewiesener Fahrlehrer</label><select class="form-select" id="stf-instructor">' + instOptions + '</select></div>') : '') +
      '<div style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;">' +
        '<div style="display:flex;align-items:center;gap:var(--space-2);"><input type="checkbox" id="stf-bf17"' + (s.bf17 ? ' checked' : '') + '><label for="stf-bf17" style="margin:0;cursor:pointer;">Begleitetes Fahren ab 17 (BF17)</label></div>' +
        '<div style="display:flex;align-items:center;gap:var(--space-2);"><input type="checkbox" id="stf-glasses"' + (s.requires_glasses ? ' checked' : '') + '><label for="stf-glasses" style="margin:0;cursor:pointer;">Mit Sehhilfe (Brille/Kontaktlinsen)</label></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Notizen</label><textarea class="form-input" id="stf-notes" rows="3" placeholder="Interne Notizen (nur f\u00fcr die Fahrschule sichtbar)">' + (s.notes || '').replace(/</g,'&lt;') + '</textarea></div>' +
      // === Sektion: Vorhandene Fuehrerscheine ===
      '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border-light);">Bereits vorhandene F\u00fchrerscheine</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;">' + licenseCheckboxes + '</div>' +
      // === Sektion: Ausweis ===
      '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border-light);">Ausweisdokument</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">' +
        '<div class="form-group"><label class="form-label">Ausweisart</label><select class="form-select" id="stf-iddoc-type">' + idDocTypeOptions + '</select></div>' +
        '<div class="form-group"><label class="form-label">Ausweisnummer</label><input class="form-input" id="stf-iddoc-number" type="text" value="' + (s.id_document_number || '').replace(/"/g,'&quot;') + '"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Ausstellende Beh\u00f6rde</label><input class="form-input" id="stf-iddoc-issuedby" type="text" placeholder="z.\u202fB. B\u00fcrgeramt Berlin-Mitte" value="' + (s.id_document_issued_by || '').replace(/"/g,'&quot;') + '"></div>' +
      // === Sektion: Rechnungsadresse ===
      '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border-light);">Rechnungsadresse</div>' +
      '<div style="display:flex;align-items:center;gap:var(--space-2);">' +
        '<input type="checkbox" id="stf-billing-same"' + (billingSame ? ' checked' : '') + ' onchange="App._toggleBillingFields(this.checked)">' +
        '<label for="stf-billing-same" style="margin:0;cursor:pointer;">Rechnungsadresse entspricht der Wohnadresse</label>' +
      '</div>' +
      '<div id="stf-billing-fields" style="' + billingHidden + 'display:flex;flex-direction:column;gap:var(--space-3);padding:var(--space-3);background:#f8fafc;border-radius:var(--radius-md);border:1px solid var(--border-light);">' +
        '<div style="font-size:var(--text-xs);color:var(--text-muted);">Diese Daten werden bei jeder Rechnung als Empf\u00e4nger eingedruckt (z.\u202fB. f\u00fcr Eltern minderj\u00e4hriger Sch\u00fcler oder Firmenrechnungen).</div>' +
        '<div class="form-group"><label class="form-label">Name / Firma</label><input class="form-input" id="stf-billing-name" type="text" placeholder="Vorname Nachname oder Firmenname" value="' + billingName + '"></div>' +
        '<div class="form-group"><label class="form-label">Stra\u00dfe und Hausnummer</label><input class="form-input" id="stf-billing-street" type="text" value="' + billingStreet + '"></div>' +
        '<div style="display:grid;grid-template-columns:120px 1fr;gap:var(--space-3);">' +
          '<div class="form-group"><label class="form-label">PLZ</label><input class="form-input" id="stf-billing-postal" type="text" inputmode="numeric" maxlength="10" value="' + billingPostal + '"></div>' +
          '<div class="form-group"><label class="form-label">Ort</label><input class="form-input" id="stf-billing-city" type="text" value="' + billingCity + '"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Land</label><input class="form-input" id="stf-billing-country" type="text" value="' + billingCountry + '"></div>' +
      '</div>' +
      // === Sektion: Preiskategorie ===
      '<div style="font-size:var(--text-xs);text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-top:var(--space-3);padding-top:var(--space-3);border-top:1px solid var(--border-light);">Preiskategorie</div>' +
      '<div class="form-group"><label class="form-label">Zuordnung</label><select class="form-select" id="stf-pricecat">' + pcOptions + '</select>' +
        '<div style="font-size:var(--text-xs);color:var(--text-muted);margin-top:4px;">Sp\u00e4ter \u00e4nderbar unter Preisverwaltung im Profil.</div>' +
      '</div>' +
      (!isEdit ? ('<div class="form-group" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3);background:#f0fdf4;border-radius:var(--radius-md);border:1px solid #bbf7d0;margin-top:var(--space-3);">' +
        '<input type="checkbox" id="stf-sendInvite" checked>' +
        '<label for="stf-sendInvite" style="margin:0;cursor:pointer;font-size:var(--text-sm);">Einladungsmail jetzt senden (Sch\u00fcler setzt selbst sein Passwort)</label>' +
      '</div>') : '') +
      '<input type="hidden" id="stf-id" value="' + (s.id || '') + '">' +
      '<div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);">' +
        '<button type="button" class="btn btn-ghost btn-full" onclick="App.closeModalForce()">Abbrechen</button>' +
        '<button type="submit" class="btn btn-primary btn-full" id="stf-submit">' + (isEdit ? 'Speichern' : 'Anlegen') + '</button>' +
      '</div>' +
    '</form>';
    return h;
  },

  openCreateStudentModal: async function() {
    if (!AppState.currentUser || AppState.currentUser.role !== 'school') return;
    var insts = [];
    var priceCats = [];
    try {
      var instData = await ApiClient.get('/api/school/instructors');
      insts = (instData && instData.instructors) || [];
    } catch (e) { /* nicht kritisch */ }
    try {
      var pcData = await ApiClient.get('/api/school/price-categories');
      priceCats = (pcData && pcData.categories) || [];
    } catch (e) { /* nicht kritisch */ }
    this.openModal('Neuer Fahrsch\u00fcler', this._studentFormHtml(null, insts, priceCats));
  },

  _toggleBillingFields: function(checked) {
    var el = document.getElementById('stf-billing-fields');
    if (el) el.style.display = checked ? 'none' : 'flex';
  },

  openEditStudentModal: async function(studentId) {
    if (!AppState.currentUser || AppState.currentUser.role !== 'school') return;
    try {
      var data = await ApiClient.get('/api/student-detail/' + studentId);
      var priceCats = [];
      try {
        var pcData = await ApiClient.get('/api/school/price-categories');
        priceCats = (pcData && pcData.categories) || [];
      } catch (e) { /* nicht kritisch */ }
      this.openModal('Fahrsch\u00fcler bearbeiten', this._studentFormHtml(data.student, [], priceCats));
    } catch (err) {
      this.showToast('Fehler beim Laden: ' + err.message);
    }
  },

  submitStudentForm: async function() {
    var v = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var c = function(id) { var el = document.getElementById(id); return el ? !!el.checked : false; };
    var existingLicenses = [];
    try {
      var lcs = document.querySelectorAll('.stf-license-cb');
      for (var i = 0; i < lcs.length; i++) {
        if (lcs[i].checked) existingLicenses.push(lcs[i].getAttribute('data-license'));
      }
    } catch (e) { /* ignore */ }
    var billingSame = c('stf-billing-same');
    var payload = {
      firstName: v('stf-firstName').trim(),
      lastName: v('stf-lastName').trim(),
      email: v('stf-email').trim(),
      phone: v('stf-phone').trim(),
      birthdate: v('stf-birthdate') || null,
      birthplace: v('stf-birthplace').trim(),
      street: v('stf-street').trim(),
      postal_code: v('stf-postal').trim(),
      city: v('stf-city').trim(),
      license_class: v('stf-class'),
      status: v('stf-status'),
      registered_at: v('stf-registered') || null,
      bf17: c('stf-bf17'),
      requires_glasses: c('stf-glasses'),
      notes: v('stf-notes').trim(),
      instructor_id: v('stf-instructor') || null,
      sendInvite: c('stf-sendInvite'),
      existing_licenses: existingLicenses,
      id_document_type: v('stf-iddoc-type') || null,
      id_document_number: v('stf-iddoc-number').trim(),
      id_document_issued_by: v('stf-iddoc-issuedby').trim(),
      billing_same_as_address: billingSame,
      billing_name: billingSame ? '' : v('stf-billing-name').trim(),
      billing_street: billingSame ? '' : v('stf-billing-street').trim(),
      billing_postal_code: billingSame ? '' : v('stf-billing-postal').trim(),
      billing_city: billingSame ? '' : v('stf-billing-city').trim(),
      billing_country: billingSame ? '' : (v('stf-billing-country').trim() || 'Deutschland'),
      price_category: v('stf-pricecat') || null
    };
    var studentId = v('stf-id');
    var btn = document.getElementById('stf-submit');
    if (btn) { btn.disabled = true; btn.textContent = studentId ? 'Speichere\u2026' : 'Lege an\u2026'; }
    try {
      var res;
      if (studentId) {
        res = await ApiClient.put('/api/school/students/' + studentId, payload);
      } else {
        res = await ApiClient.post('/api/school/students', payload);
      }
      this.closeModalForce();
      // Cache invalidieren -> Dashboard frisch laden
      if (AppState && AppState._cachedData) {
        AppState._cachedData._dashboardBundle = null;
        AppState._cachedData._dashboardBundleTs = 0;
      }
      if (studentId) {
        this.showToast('Fahrsch\u00fcler aktualisiert');
        this.viewStudentDetail(studentId);
      } else {
        var mailMsg = (res && res.invite && res.invite.sent) ? ' (Einladung gesendet)' : (payload.sendInvite ? ' (Einladung konnte nicht gesendet werden)' : '');
        this.showToast('Fahrsch\u00fcler angelegt' + mailMsg);
        this.renderSchoolDashboardTab();
      }
    } catch (err) {
      this.showToast('Fehler: ' + (err.message || err));
      if (btn) { btn.disabled = false; btn.textContent = studentId ? 'Speichern' : 'Anlegen'; }
    }
  },

  resendStudentInvite: async function(studentId) {
    try {
      var res = await ApiClient.post('/api/school/students/' + studentId + '/resend-invite', {});
      if (res && res.ok) {
        this.showToast('Einladung erneut gesendet');
      } else {
        this.showToast('Mail-Versand fehlgeschlagen: ' + ((res && res.error) || 'unbekannter Fehler'));
      }
    } catch (err) {
      this.showToast('Fehler: ' + (err.message || err));
    }
  },

  toggleLessonHistory: function() {
    var extras = document.querySelectorAll('[data-lh-extra="1"]');
    if (!extras.length) return;
    var isHidden = extras[0].style.display === 'none';
    extras.forEach(function(el) {
      // .lesson-history-row braucht display:flex (Card-Layout), tr/anderes braucht ''
      var defaultDisp = el.classList && el.classList.contains('lesson-history-row') ? 'flex' : '';
      el.style.display = isHidden ? defaultDisp : 'none';
    });
    var btn = document.getElementById('lh-toggle-btn');
    if (!btn) return;
    if (isHidden) {
      btn.textContent = 'Weniger anzeigen';
    } else {
      var total = document.querySelectorAll('#lessons-list-rows .lesson-history-row').length;
      btn.textContent = 'Alle ' + total + ' anzeigen';
    }
  },

  viewStudentDetail: async function(studentId) {
    this.navigate('student-detail');
    var content = document.getElementById('student-detail-content');
    content.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    try {
      var data = await ApiClient.get('/api/student-detail/' + studentId);
      var student = data.student; var lessons = data.lessons || [];
      // Sortierung absichern: neueste zuerst (Datum, dann created_at).
      lessons.sort(function(a, b) {
        var dA = String(a.date || ''), dB = String(b.date || '');
        if (dA !== dB) return dA < dB ? 1 : -1;
        var cA = String(a.created_at || ''), cB = String(b.created_at || '');
        if (cA !== cB) return cA < cB ? 1 : -1;
        return 0;
      });
      document.getElementById('student-detail-name').textContent = student.name;
      var latestRatings = lessons.length > 0 ? lessons[0].ratings : {};
      var avg = this.avgRating(latestRatings);
      var totalDuration = 0;
      lessons.forEach(function(l) { totalDuration += l.duration; });
      var html = '<div class="page-padding"><div class="student-header">' +
        this.avatarHtml(student.name, 'lg') +
        '<div class="student-header-info"><h3>' + student.name + '</h3><div class="student-header-meta">' +
          '<span>' + t('klasse') + ' ' + student.license_class + '</span>' +
          (data.instructorName ? '<span>' + data.instructorName + '</span>' : '') +
          '<span>' + lessons.length + ' ' + t('fahrstunden') + '</span>' +
        '</div></div></div>';

      // ── Stammdaten-Karte (sichtbar fuer Fahrschule und Fahrlehrer) ──
      if (AppState.currentUser && (AppState.currentUser.role === 'school' || AppState.currentUser.role === 'instructor')) {
        var st = student;
        var fmtDate = function(s) { if (!s) return '\u2014'; var d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString('de-DE'); };
        var rowHtml = function(label, val) {
          return '<div style="display:flex;justify-content:space-between;gap:var(--space-3);padding:6px 0;border-bottom:1px solid var(--color-border-subtle,rgba(0,0,0,0.05));font-size:var(--text-sm);">' +
            '<span style="color:var(--text-muted);">' + label + '</span>' +
            '<span style="text-align:right;word-break:break-word;">' + (val || '\u2014') + '</span>' +
          '</div>';
        };
        var statusBadge = '';
        if (st.status) {
          var sCol = st.status === 'aktiv' ? '#16a34a' : (st.status === 'pausiert' ? '#d97706' : (st.status === 'abgeschlossen' ? '#2563eb' : '#64748b'));
          statusBadge = '<span style="background:' + sCol + ';color:#fff;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">' + st.status + '</span>';
        }
        var pwStatus = st.password_hash ? '<span style="color:#16a34a;">\u2713 aktiviert</span>' : '<span style="color:#d97706;">noch nicht aktiviert</span>';
        var isSchoolRole = AppState.currentUser.role === 'school';
        html += '<div class="card mb-4">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3);gap:var(--space-2);flex-wrap:wrap;">' +
            '<div class="section-title" style="margin:0;">Stammdaten</div>' +
            '<div style="display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;">' + statusBadge +
              (isSchoolRole ? '<button class="btn btn-sm btn-secondary" onclick="App.openEditStudentModal(\'' + st.id + '\')">Bearbeiten</button>' : '') +
              (isSchoolRole && !st.password_hash ? '<button class="btn btn-sm btn-primary" onclick="App.resendStudentInvite(\'' + st.id + '\')">Einladung erneut senden</button>' : '') +
            '</div>' +
          '</div>' +
          rowHtml('E-Mail', st.email) +
          rowHtml('Telefon', st.phone) +
          rowHtml('Geburtsdatum', fmtDate(st.birthdate)) +
          rowHtml('Geburtsort', st.birthplace) +
          rowHtml('Stra\u00dfe', st.street || (st.address ? st.address.split(',')[0].trim() : null)) +
          rowHtml('PLZ / Ort', (st.postal_code || st.city) ? [(st.postal_code || ''), (st.city || '')].filter(Boolean).join(' ') : (st.address && st.address.indexOf(',') > -1 ? st.address.split(',').slice(1).join(',').trim() : null)) +
          rowHtml('Klasse(n)', st.license_class) +
          rowHtml('Angemeldet am', fmtDate(st.registered_at)) +
          rowHtml('Fahrlehrer', data.instructorName) +
          rowHtml('BF17', st.bf17 ? 'Ja' : 'Nein') +
          rowHtml('Sehhilfe', st.requires_glasses ? 'Ja (Brille/Kontaktlinsen)' : 'Nein') +
          rowHtml('Konto', pwStatus) +
          (st.notes ? ('<div style="margin-top:var(--space-3);padding:var(--space-3);background:var(--bg-elevated,#f8fafb);border-radius:var(--radius-md);font-size:var(--text-sm);white-space:pre-wrap;"><strong style="color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.5px;">Notizen</strong><br>' + st.notes.replace(/</g,'&lt;') + '</div>') : '') +
        '</div>';

        // ── Karte: Vorhandene F\u00fchrerscheine ──
        var existLics = Array.isArray(st.existing_licenses) ? st.existing_licenses : [];
        if (existLics.length > 0) {
          var chipsHtml = existLics.map(function(l) {
            return '<span style="display:inline-block;background:#eef2ff;color:#3730a3;padding:4px 10px;border-radius:999px;font-size:var(--text-xs);font-weight:600;">' + String(l).replace(/</g,'&lt;') + '</span>';
          }).join(' ');
          html += '<div class="card mb-4">' +
            '<div class="section-title" style="margin-bottom:var(--space-2);">Bereits vorhandene F\u00fchrerscheine</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + chipsHtml + '</div>' +
          '</div>';
        }

        // ── Karte: Ausweisdokument ──
        if (st.id_document_type || st.id_document_number || st.id_document_issued_by) {
          html += '<div class="card mb-4">' +
            '<div class="section-title" style="margin-bottom:var(--space-2);">Ausweisdokument</div>' +
            rowHtml('Art', st.id_document_type) +
            rowHtml('Nummer', st.id_document_number) +
            rowHtml('Ausstellende Beh\u00f6rde', st.id_document_issued_by) +
          '</div>';
        }

        // ── Karte: Rechnungsadresse (nur Plus – Solo stellt keine Rechnungen aus) ──
        if (!this.isSolo()) {
          var billingDiffers = (st.billing_same_as_address === false) && (st.billing_name || st.billing_street || st.billing_postal_code || st.billing_city);
          html += '<div class="card mb-4">' +
            '<div class="section-title" style="margin-bottom:var(--space-2);">Rechnungsadresse</div>';
          if (!billingDiffers) {
            html += '<div style="font-size:var(--text-sm);color:var(--text-muted);">Entspricht der Wohnadresse.</div>';
          } else {
            var bPlzCity = [(st.billing_postal_code || ''), (st.billing_city || '')].filter(Boolean).join(' ').trim();
            html += rowHtml('Name / Firma', st.billing_name) +
              rowHtml('Stra\u00dfe', st.billing_street) +
              rowHtml('PLZ / Ort', bPlzCity || null) +
              rowHtml('Land', st.billing_country || 'Deutschland');
          }
          html += '</div>';
        }

        // ── Karte: Preiskategorie ──
        if (st.price_category) {
          var pcLabel = st.price_category;
          try {
            var cats = (AppState && AppState.priceCategoriesDraft) || [];
            var found = cats.find && cats.find(function(c) { return c.id === st.price_category; });
            if (found && found.label) pcLabel = found.label;
          } catch (e) { /* ignore */ }
          html += '<div class="card mb-4">' +
            '<div class="section-title" style="margin-bottom:var(--space-2);">Preiskategorie</div>' +
            '<div style="font-size:var(--text-sm);">' + String(pcLabel).replace(/</g,'&lt;') + '</div>' +
          '</div>';
        }
      }
      html += '<div class="card mb-4"><div class="section-title mb-3">' + t('aktuellesKoennen') + '</div>' +
        '<div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4);">' +
          '<div class="progress-ring-container">' + this.buildProgressRing(avg, 4, 60) + '</div>' +
          '<div><div style="font-weight:600;font-size:var(--text-sm);">' + t('gesamtdurchschnitt') + '</div>' + this.skillLevelHtml(avg) + '</div></div>';
      evaluationGroupsWithLegacy(st && st.license_class, latestRatings).forEach(function(grp) {
        html += _groupHeaderHtml(grp.group);
        grp.items.forEach(function(task) {
          var rawVal = latestRatings[task];
          var hasRating = typeof rawVal === 'number' && rawVal >= 1 && rawVal <= 4;
          var val = hasRating ? rawVal : 0;
          var pct = (val / 4) * 100;
          if (!hasRating) {
            html += '<div class="skill-bar"><div class="skill-bar-header"><span style="color:var(--text-muted);">' + tSkill(task) + '</span><span class="text-xs" style="font-size:10px;color:var(--text-muted);font-style:italic;">nicht bewertet</span></div>' +
              '<div class="skill-bar-track unrated"></div></div>';
          } else {
            var info = getSkillLevel(val);
            html += '<div class="skill-bar"><div class="skill-bar-header"><span><span class="skill-bar-dot" style="background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></span>' + tSkill(task) + '</span><span class="badge ' + info.badgeClass + '" style="font-size:10px;">' + tLevel(info.name) + '</span></div>' +
              '<div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + pct + '%;background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></div></div></div>';
          }
        });
      });
      html += '</div>';

      // ── Stunden-Verlauf (Schule + Fahrlehrer) ──
      if (AppState.currentUser && (AppState.currentUser.role === 'school' || AppState.currentUser.role === 'instructor')) {
        var _fmtMin = function(min) {
          min = Math.round(min || 0);
          if (min < 60) return min + ' min';
          var h = Math.floor(min / 60), m = min % 60;
          return m ? (h + ' h ' + m + ' min') : (h + ' h');
        };
        var _fmtDateShort = function(s) { if (!s) return '\u2014'; var d = new Date(s); if (isNaN(d.getTime())) return s; return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }); };
        var _avgRatingLocal = function(rt) {
          if (!rt) return 0;
          var vals = Object.values(rt).filter(function(v) { return typeof v === 'number' && v > 0; });
          if (!vals.length) return 0;
          return vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
        };
        // Aggregation nach Typ
        var typeBuckets = {};
        lessons.forEach(function(l) {
          var k = l.type || '\u2014';
          if (!typeBuckets[k]) typeBuckets[k] = { count: 0, duration: 0 };
          typeBuckets[k].count += 1;
          typeBuckets[k].duration += (l.duration || 0);
        });
        var typesSorted = Object.keys(typeBuckets).sort(function(a, b) { return typeBuckets[b].duration - typeBuckets[a].duration; });

        html += '<div class="card mb-4 lessons-history" id="lessons-history-card">' +
          '<div class="lessons-history-head">' +
            '<div class="lessons-history-title"><span class="lessons-history-icon" aria-hidden="true">\u{1F4D6}</span>Fahrstunden-Verlauf</div>' +
          '</div>';

        if (lessons.length === 0) {
          html += '<p style="font-size:var(--text-sm);color:var(--text-muted);text-align:center;padding:var(--space-4);">Noch keine absolvierten Fahrstunden.</p>';
        } else {
          // Gesamt-Statistik prominent
          html += '<div class="lessons-history-stats">' +
            '<div class="lessons-history-stat">' +
              '<div class="lessons-history-stat-label">Stunden</div>' +
              '<div class="lessons-history-stat-value">' + lessons.length + '</div>' +
            '</div>' +
            '<div class="lessons-history-stat-divider" aria-hidden="true"></div>' +
            '<div class="lessons-history-stat">' +
              '<div class="lessons-history-stat-label">Gesamt-Dauer</div>' +
              '<div class="lessons-history-stat-value">' + _fmtMin(totalDuration) + '</div>' +
            '</div>' +
          '</div>';

          // Typ-Aufschluesselung
          html += '<div class="lessons-history-types">';
          typesSorted.forEach(function(typ) {
            var b = typeBuckets[typ];
            html += '<div class="lessons-history-type">' +
              '<div class="lessons-history-type-label">' + typ + '</div>' +
              '<div class="lessons-history-type-value"><strong>' + b.count + '\u00d7</strong> <span class="lessons-history-type-dot">\u00b7</span> ' + _fmtMin(b.duration) + '</div>' +
            '</div>';
          });
          html += '</div>';

          // Letzte Stunden Liste (default: 10, toggle: alle)
          var maxInit = 10;
          var showToggle = lessons.length > maxInit;
          // Eigenen Namen aus Fahrlehrer-Spalte ausblenden (wie in Plan-Ansicht)
          var _meIsInstr = AppState.currentUser && AppState.currentUser.role === 'instructor';
          var _myInstrId = _meIsInstr ? AppState.currentUser.id : null;
          // Verrechnungs-Badge entfernt (Push 9): Verrechnungs-Kategorie wird in der App
          // nicht mehr verwaltet — GoBD-konform sind alle Stunden gleich.
          html += '<div id="lessons-list-rows" style="display:flex;flex-direction:column;gap:6px;">';
          lessons.forEach(function(l, idx) {
            var isExtra = (showToggle && idx >= maxInit);
            var extraAttr = isExtra ? ' data-lh-extra="1"' : '';
            var displayProp = isExtra ? 'display:none;' : 'display:flex;';
            var rA = _avgRatingLocal(l.ratings);
            var ratingDot = rA > 0
              ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:var(--text-xs);color:var(--text-muted);"><span style="width:8px;height:8px;border-radius:50%;background:' + (SKILL_COLORS[Math.round(rA) || 1] || '#94a3b8') + ';display:inline-block;"></span>' + rA.toFixed(1) + '</span>'
              : '';
            var notesIcon = (l.notes && l.notes.trim()) ? '<span title="Notiz vorhanden" style="color:var(--text-muted);font-size:13px;">\u270d</span>' : '';
            var _imgN = (l.images && l.images.length) || l.images_count || 0;
            var imagesIcon = (_imgN > 0) ? '<span title="Bilder" style="color:var(--text-muted);font-size:13px;">\ud83d\udcf7</span>' : '';
            var instrName;
            if (_meIsInstr && l.instructor_id && String(l.instructor_id) === String(_myInstrId)) {
              instrName = 'ich';
            } else {
              instrName = l.instructor_name || '\u2014';
            }
            // Datum-Block links (Tag groß, Monat klein)
            var dParts = String(l.date || '').split('-');
            var dDay = dParts[2] || '';
            var dMonth = '';
            if (dParts[1]) {
              var monthsShort = ['Jan','Feb','M\u00e4r','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
              dMonth = monthsShort[parseInt(dParts[1],10) - 1] || '';
            }
            html += '<div class="lesson-history-row" data-lesson-id="' + l.id + '" data-student-id="' + studentId + '"' + extraAttr +
              ' onclick="App.showLessonReview(\'' + l.id + '\', \'' + studentId + '\', \'' + (AppState.currentUser ? AppState.currentUser.role : 'school') + '\')"' +
              ' style="' + displayProp + '">' +
              // Datum Block
              '<div class="lesson-history-date">' +
                '<div class="lesson-history-date-day">' + dDay + '</div>' +
                '<div class="lesson-history-date-month">' + dMonth + '</div>' +
              '</div>' +
              // Mittlerer Block: Typ + Fahrlehrer
              '<div class="lesson-history-main">' +
                '<div class="lesson-history-type">' +
                  '<span class="lesson-history-type-text">' + (l.type || '\u2014') + '</span>' +
                  notesIcon + imagesIcon +
                '</div>' +
                '<div class="lesson-history-meta">' +
                  '<span>' + instrName + '</span>' +
                  (ratingDot ? '<span class="lesson-history-meta-sep">\u00b7</span>' + ratingDot : '') +
                '</div>' +
              '</div>' +
              // Dauer rechts + Chevron
              '<div class="lesson-history-right">' +
                '<div class="lesson-history-duration">' + _fmtMin(l.duration) + '</div>' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="lesson-history-chev"><polyline points="9 18 15 12 9 6"/></svg>' +
              '</div>' +
            '</div>';
          });
          if (showToggle) {
            html += '<div style="text-align:center;margin-top:var(--space-3);">' +
              '<button class="btn btn-sm btn-secondary" id="lh-toggle-btn" onclick="App.toggleLessonHistory()">Alle ' + lessons.length + ' anzeigen</button>' +
            '</div>';
          }
          html += '</div>';
        }

        html += '</div>';
      }

      // ── Theory Progress Section (nur Plus, Solo verwaltet keine Theorie) ──
      if (!this.isSolo()) {
        html += '<div class="card mb-4 theory-progress-section"><div class="section-title mb-3">' + t('theorieFortschritt') + '</div>' +
          '<div id="theory-progress-container"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div></div>';
      }

      // ── KI-Briefing (nur fuer school + instructor wenn KI-Tarif) ──
      if (AppState.currentUser && (AppState.currentUser.role === 'school' || AppState.currentUser.role === 'instructor')) {
        html += '<div class="card mb-4" id="ai-briefing-card-' + studentId + '" style="background:linear-gradient(135deg,#f3f8ff 0%,#e8f0fe 100%);border:1px solid #c5dafa;">' +
          '<div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2);">' +
            '<span style="font-size:22px;">\u2728</span>' +
            '<div style="font-weight:700;color:#1565c0;">KI-Briefing f\u00fcr n\u00e4chste Stunde</div>' +
          '</div>' +
          '<p style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-3);">Lass Dir vor der n\u00e4chsten Fahrstunde automatisch ein Briefing aus den letzten Stunden zusammenfassen.</p>' +
          '<button class="btn btn-primary" id="ai-briefing-btn-' + studentId + '" onclick="App.generateAiBriefing(\'' + studentId + '\')">Briefing generieren</button>' +
          '<div id="ai-briefing-output-' + studentId + '" style="margin-top:var(--space-3);display:none;"></div>' +
        '</div>';
      }

      // ── Bescheinigungen (only for school/admin) ──
      if (AppState.currentUser && AppState.currentUser.role === 'school') {
        var docIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>';
        html += '<div class="card mb-4">' +
          '<div class="section-title mb-3">' + t('bescheinigungen') + '</div>' +
          '<div style="display:flex;flex-direction:column;gap:var(--space-2);">' +
            '<button class="btn btn-primary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.generateAusbildungsnachweis(\'' + studentId + '\')">' + docIcon + ' ' + t('ausbildungsnachweisGenerieren') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openFristverkuerzungDialog(\'' + studentId + '\',\'theorie\')">' + docIcon + ' ' + t('fristverkuerzungTheorie') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openFristverkuerzungDialog(\'' + studentId + '\',\'praxis\')">' + docIcon + ' ' + t('fristverkuerzungPraxis') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openEntschuldigungDialog(\'' + studentId + '\')">' + docIcon + ' ' + t('entschuldigung') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openB196Dialog(\'' + studentId + '\',\'vertrag\')">' + docIcon + ' ' + t('b196Vertrag') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openB196Dialog(\'' + studentId + '\',\'bescheinigung\')">' + docIcon + ' ' + t('b196Bescheinigung') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openAnlage7Dialog(\'' + studentId + '\')">' + docIcon + ' ' + t('anlage7') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openB197Dialog(\'' + studentId + '\')">' + docIcon + ' ' + t('b197') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openBF17Dialog(\'' + studentId + '\')">' + docIcon + ' ' + t('bf17Abschluss') + '</button>' +
            '<button class="btn btn-secondary btn-full" style="gap:var(--space-2);display:flex;align-items:center;justify-content:center;" onclick="App.openKuendigungDialog(\'' + studentId + '\')">' + docIcon + ' ' + t('kuendigung') + '</button>' +
          '</div>' +
        '</div>';
      }

      // ── Buchhaltung (nur Fahrschule) ──
      if (AppState.currentUser && AppState.currentUser.role === 'school') {
        html += '<div class="card mb-4" id="billing-card-' + studentId + '">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-2);margin-bottom:var(--space-3);">' +
            '<div class="section-title" style="margin:0;">\ud83d\udcb6 Abrechnung</div>' +
            '<div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">' +
              '<button class="btn btn-sm btn-secondary" onclick="App.openAddChargeDialog(\'' + studentId + '\')">+ Position</button>' +
              '<button class="btn btn-sm btn-secondary" onclick="App.openCreateInvoiceDialog(\'' + studentId + '\')">\ud83d\udcc4 Rechnung</button>' +
              '<button class="btn btn-sm btn-primary" onclick="App.openAddPaymentDialog(\'' + studentId + '\')">+ Zahlung</button>' +
            '</div>' +
          '</div>' +
          '<div id="billing-content-' + studentId + '"><div class="loading-spinner" style="margin:var(--space-4) auto;"></div></div>' +
        '</div>';
      }

      html += '</div>'; content.innerHTML = html;
      // Load theory progress asynchronously
      this.renderTheoryProgress(studentId);
      // Load billing asynchronously (nur Fahrschule)
      if (AppState.currentUser && AppState.currentUser.role === 'school') {
        this.renderStudentBilling(studentId);
      }
    } catch (err) { content.innerHTML = '<div class="page-padding"><p class="text-sm text-muted">' + t('fehler') + ': ' + err.message + '</p></div>'; }
  },

  // ════════════════════════════════
  //  BUCHHALTUNG: Schüler-Abrechnung
  // ════════════════════════════════
  _formatEur: function(cents) {
    var eur = (cents || 0) / 100;
    return eur.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac';
  },
  _formatDateDe: function(s) {
    if (!s) return '\u2014';
    var d = new Date(s); if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('de-DE');
  },
  _paymentMethodLabel: function(m) {
    var map = { 'bar': 'Bar', '\u00fcberweisung': '\u00dcberweisung', 'ueberweisung': '\u00dcberweisung', 'ec': 'EC/Karte', 'paypal': 'PayPal', 'sonstiges': 'Sonstiges' };
    return map[m] || m || '\u2014';
  },

  renderStudentBilling: async function(studentId) {
  var container = document.getElementById('billing-content-' + studentId);
  if (!container) return;
    try {
      var data = await ApiClient.get('/api/students/' + studentId + '/billing');
      var summary = data.summary || { total_charges_cents: 0, total_paid_cents: 0, open_cents: 0 };
      var charges = data.charges || [];
      var payments = data.payments || [];
      var invoices = data.invoices || [];
      // Im Soll-Tab Cache fuer offene Charges (zum Rechnungs-Dialog)
      App._billingCache = App._billingCache || {};
      App._billingCache[studentId] = { charges: charges, invoices: invoices, payments: payments };
      var openColor = summary.open_cents > 0 ? '#dc2626' : (summary.open_cents < 0 ? '#0d9488' : 'var(--text-muted)');
      var openLabel = summary.open_cents > 0 ? 'Offen' : (summary.open_cents < 0 ? 'Guthaben' : 'Ausgeglichen');
      var openValue = summary.open_cents > 0 ? this._formatEur(summary.open_cents) : (summary.open_cents < 0 ? this._formatEur(-summary.open_cents) : this._formatEur(0));

      // Summary-Karten
      var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:var(--space-2);margin-bottom:var(--space-4);">' +
        '<div style="background:var(--bg-elevated);padding:var(--space-3);border-radius:var(--radius-md);">' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Soll</div>' +
          '<div style="font-size:18px;font-weight:700;margin-top:4px;">' + this._formatEur(summary.total_charges_cents) + '</div>' +
        '</div>' +
        '<div style="background:var(--bg-elevated);padding:var(--space-3);border-radius:var(--radius-md);">' +
          '<div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">Bezahlt</div>' +
          '<div style="font-size:18px;font-weight:700;margin-top:4px;color:#0d9488;">' + this._formatEur(summary.total_paid_cents) + '</div>' +
        '</div>' +
        '<div style="background:var(--bg-elevated);padding:var(--space-3);border-radius:var(--radius-md);border:2px solid ' + openColor + ';">' +
          '<div style="font-size:var(--text-xs);color:' + openColor + ';text-transform:uppercase;letter-spacing:.5px;font-weight:600;">' + openLabel + '</div>' +
          '<div style="font-size:20px;font-weight:700;margin-top:4px;color:' + openColor + ';">' + openValue + '</div>' +
        '</div>' +
      '</div>';

      // Tabs Soll / Rechnungen / Ist
      h += '<div style="display:flex;gap:var(--space-2);margin-bottom:var(--space-3);border-bottom:1px solid var(--border-color);overflow-x:auto;">' +
        '<button class="billing-tab-btn" data-tab="soll" onclick="App.switchBillingTab(\'' + studentId + '\',\'soll\',this)" style="padding:8px 16px;border:none;background:none;font-weight:600;border-bottom:2px solid var(--color-primary);color:var(--color-primary);cursor:pointer;white-space:nowrap;">Soll-Positionen (' + charges.length + ')</button>' +
        '<button class="billing-tab-btn" data-tab="inv" onclick="App.switchBillingTab(\'' + studentId + '\',\'inv\',this)" style="padding:8px 16px;border:none;background:none;font-weight:600;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;white-space:nowrap;">Rechnungen (' + invoices.length + ')</button>' +
        '<button class="billing-tab-btn" data-tab="ist" onclick="App.switchBillingTab(\'' + studentId + '\',\'ist\',this)" style="padding:8px 16px;border:none;background:none;font-weight:600;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;white-space:nowrap;">Ist-Zahlungen (' + payments.length + ')</button>' +
      '</div>';

      // Soll-Liste
      h += '<div id="billing-tab-soll-' + studentId + '">';
      if (charges.length === 0) {
        h += '<p style="font-size:var(--text-sm);color:var(--text-muted);text-align:center;padding:var(--space-4);">Keine Soll-Positionen. Klicke auf "+ Position" oder lege Preise an, damit Fahrstunden automatisch verrechnet werden.</p>';
      } else {
        h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">' +
          '<thead><tr style="text-align:left;border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;">' +
            '<th style="padding:8px 6px;">Datum</th>' +
            '<th style="padding:8px 6px;">Position</th>' +
            '<th style="padding:8px 6px;text-align:right;">Einzel</th>' +
            '<th style="padding:8px 6px;text-align:right;">Anz.</th>' +
            '<th style="padding:8px 6px;text-align:right;">Gesamt</th>' +
            '<th style="padding:8px 6px;"></th>' +
          '</tr></thead><tbody>';
        charges.forEach(function(c){
          var sourceTag = c.source === 'auto' ? '<span class="badge badge-muted" style="font-size:10px;margin-left:6px;">auto</span>' : '';
          var invTag = c.invoice_id ? '<span class="badge" style="font-size:10px;margin-left:6px;background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:3px;">in Rechnung</span>' : '';
          var delBtn = c.invoice_id
            ? '<span style="font-size:11px;color:var(--text-muted);">\u2014</span>'
            : '<button class="btn btn-sm" style="padding:4px 8px;background:transparent;color:#dc2626;border:1px solid #dc2626;" onclick="App.deleteCharge(\'' + c.id + '\',\'' + studentId + '\')">\u00d7</button>';
          h += '<tr style="border-bottom:1px solid var(--border-color);' + (c.invoice_id ? 'background:#f8fafc;' : '') + '">' +
            '<td style="padding:8px 6px;white-space:nowrap;">' + App._formatDateDe(c.charge_date) + '</td>' +
            '<td style="padding:8px 6px;">' + (c.description || '\u2014') + sourceTag + invTag + '</td>' +
            '<td style="padding:8px 6px;text-align:right;">' + App._formatEur(c.unit_price_cents) + '</td>' +
            '<td style="padding:8px 6px;text-align:right;">' + (c.quantity || 1) + '</td>' +
            '<td style="padding:8px 6px;text-align:right;font-weight:600;">' + App._formatEur(c.total_cents) + '</td>' +
            '<td style="padding:8px 6px;text-align:right;">' + delBtn + '</td>' +
          '</tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>';

      // Rechnungs-Liste
      h += '<div id="billing-tab-inv-' + studentId + '" style="display:none;">';
      if (invoices.length === 0) {
        h += '<p style="font-size:var(--text-sm);color:var(--text-muted);text-align:center;padding:var(--space-4);">Noch keine Rechnungen. W\u00e4hle offene Positionen aus und klicke oben auf \u201eRechnung\u201c.</p>';
      } else {
        h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">' +
          '<thead><tr style="text-align:left;border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;">' +
            '<th style="padding:8px 6px;">Nr.</th>' +
            '<th style="padding:8px 6px;">Datum</th>' +
            '<th style="padding:8px 6px;">Status</th>' +
            '<th style="padding:8px 6px;text-align:right;">Brutto</th>' +
            '<th style="padding:8px 6px;text-align:right;">Aktion</th>' +
          '</tr></thead><tbody>';
        invoices.forEach(function(inv){
          var statusColors = { 'offen': '#b45309', 'teilbezahlt': '#1e40af', 'bezahlt': '#0d9488', 'storniert': '#6b7280' };
          var statusBg = { 'offen': '#fef3c7', 'teilbezahlt': '#dbeafe', 'bezahlt': '#d1fae5', 'storniert': '#e5e7eb' };
          var col = statusColors[inv.status] || '#374151';
          var bg = statusBg[inv.status] || '#f3f4f6';
          var cancelBtn = (inv.status !== 'storniert' && inv.status !== 'bezahlt')
            ? '<button class="btn btn-sm" style="padding:4px 8px;background:transparent;color:#dc2626;border:1px solid #dc2626;margin-left:4px;" onclick="App.cancelInvoice(\'' + inv.id + '\',\'' + studentId + '\')">Storno</button>'
            : '';
          h += '<tr style="border-bottom:1px solid var(--border-color);">' +
            '<td style="padding:8px 6px;font-weight:600;">' + (inv.invoice_number || '\u2014') + '</td>' +
            '<td style="padding:8px 6px;white-space:nowrap;">' + App._formatDateDe(inv.invoice_date) + '</td>' +
            '<td style="padding:8px 6px;"><span style="background:' + bg + ';color:' + col + ';padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;">' + inv.status + '</span></td>' +
            '<td style="padding:8px 6px;text-align:right;font-weight:600;">' + App._formatEur(inv.total_cents) + '</td>' +
            '<td style="padding:8px 6px;text-align:right;white-space:nowrap;"><button class="btn btn-sm btn-primary" style="padding:4px 8px;" onclick="App.openInvoicePdf(\'' + inv.id + '\')">PDF</button>' + cancelBtn + '</td>' +
          '</tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>';

      // Ist-Liste
      h += '<div id="billing-tab-ist-' + studentId + '" style="display:none;">';
      if (payments.length === 0) {
        h += '<p style="font-size:var(--text-sm);color:var(--text-muted);text-align:center;padding:var(--space-4);">Noch keine Zahlungen erfasst.</p>';
      } else {
        h += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">' +
          '<thead><tr style="text-align:left;border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;">' +
            '<th style="padding:8px 6px;">Datum</th>' +
            '<th style="padding:8px 6px;">Zahlart</th>' +
            '<th style="padding:8px 6px;">Referenz</th>' +
            '<th style="padding:8px 6px;text-align:right;">Betrag</th>' +
            '<th style="padding:8px 6px;"></th>' +
          '</tr></thead><tbody>';
        payments.forEach(function(p){
          h += '<tr style="border-bottom:1px solid var(--border-color);">' +
            '<td style="padding:8px 6px;white-space:nowrap;">' + App._formatDateDe(p.payment_date) + '</td>' +
            '<td style="padding:8px 6px;">' + App._paymentMethodLabel(p.payment_method) + '</td>' +
            '<td style="padding:8px 6px;color:var(--text-muted);font-size:var(--text-xs);">' + (p.reference || '\u2014') + '</td>' +
            '<td style="padding:8px 6px;text-align:right;font-weight:600;color:#0d9488;">' + App._formatEur(p.amount_cents) + '</td>' +
            '<td style="padding:8px 6px;text-align:right;"><button class="btn btn-sm" style="padding:4px 8px;background:transparent;color:#dc2626;border:1px solid #dc2626;" onclick="App.deletePayment(\'' + p.id + '\',\'' + studentId + '\')">\u00d7</button></td>' +
          '</tr>';
        });
        h += '</tbody></table></div>';
      }
      h += '</div>';

      container.innerHTML = h;
    } catch (err) {
      container.innerHTML = '<p style="font-size:var(--text-sm);color:#c62828;">' + t('fehler') + ': ' + (err.message || err) + '</p>';
    }
  },

  switchBillingTab: function(studentId, tab, btn) {
    var sollEl = document.getElementById('billing-tab-soll-' + studentId);
    var istEl = document.getElementById('billing-tab-ist-' + studentId);
    var invEl = document.getElementById('billing-tab-inv-' + studentId);
    if (sollEl) sollEl.style.display = (tab === 'soll') ? '' : 'none';
    if (istEl) istEl.style.display = (tab === 'ist') ? '' : 'none';
    if (invEl) invEl.style.display = (tab === 'inv') ? '' : 'none';
    // Tab-Styling
    var cardEl = btn ? btn.closest('.card') : null;
    if (cardEl) {
      cardEl.querySelectorAll('.billing-tab-btn').forEach(function(b){
        var active = b.getAttribute('data-tab') === tab;
        b.style.borderBottomColor = active ? 'var(--color-primary)' : 'transparent';
        b.style.color = active ? 'var(--color-primary)' : 'var(--text-muted)';
      });
    }
  },

  openAddChargeDialog: async function(studentId) {
    // Templates laden für Schnellauswahl
    var templates = [];
    try {
      var tres = await ApiClient.get('/api/pricing-templates');
      // GET liefert direktes Array
      var arr = Array.isArray(tres) ? tres : (tres && tres.templates) || [];
      templates = arr.filter(function(t){ return t.active; });
    } catch (e) { /* templates optional */ }

    var todayStr = new Date().toISOString().split('T')[0];
    var optionsHtml = '<option value="">\u2014 Frei eingeben \u2014</option>';
    templates.forEach(function(t){
      optionsHtml += '<option value="' + t.id + '" data-name="' + (t.name || '').replace(/"/g, '&quot;') + '" data-price="' + t.price_cents + '" data-category="' + (t.category || '') + '">' + (t.name || '') + ' \u2014 ' + App._formatEur(t.price_cents) + '</option>';
    });

    var html = '<div style="display:flex;flex-direction:column;gap:var(--space-3);">' +
      '<div class="form-group"><label class="form-label">Aus Vorlage</label>' +
        '<select class="form-select" id="charge-template" onchange="App._fillChargeFromTemplate(this)">' + optionsHtml + '</select></div>' +
      '<div class="form-group"><label class="form-label">Beschreibung *</label>' +
        '<input type="text" class="form-input" id="charge-desc" placeholder="z.B. Grundbetrag Klasse B"></div>' +
      '<div style="display:grid;grid-template-columns:2fr 1fr;gap:var(--space-3);">' +
        '<div class="form-group"><label class="form-label">Einzelpreis (\u20ac) *</label>' +
          '<input type="number" step="0.01" min="0" class="form-input" id="charge-price" placeholder="0.00"></div>' +
        '<div class="form-group"><label class="form-label">Anzahl</label>' +
          '<input type="number" step="1" min="1" class="form-input" id="charge-qty" value="1"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Datum</label>' +
        '<input type="date" class="form-input" id="charge-date" value="' + todayStr + '"></div>' +
      '<div class="form-group"><label class="form-label">Notiz</label>' +
        '<textarea class="form-textarea" id="charge-notes" rows="2"></textarea></div>' +
    '</div>';
    html += '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-4);">' +
      '<button class="btn btn-secondary" onclick="App.closeModalForce()">Abbrechen</button>' +
      '<button class="btn btn-primary" onclick="App._saveCharge(\'' + studentId + '\')">Speichern</button>' +
    '</div>';
    App.openModal('Soll-Position hinzuf\u00fcgen', html);
  },

  _fillChargeFromTemplate: function(sel) {
    var opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    var name = opt.getAttribute('data-name') || '';
    var price = parseInt(opt.getAttribute('data-price') || '0');
    var descEl = document.getElementById('charge-desc');
    var priceEl = document.getElementById('charge-price');
    if (descEl) descEl.value = name;
    if (priceEl) priceEl.value = (price / 100).toFixed(2);
  },

  _saveCharge: async function(studentId) {
    var desc = (document.getElementById('charge-desc') || {}).value || '';
    var priceVal = parseFloat((document.getElementById('charge-price') || {}).value || '0');
    var qty = parseFloat((document.getElementById('charge-qty') || {}).value || '1');
    var date = (document.getElementById('charge-date') || {}).value || null;
    var notes = (document.getElementById('charge-notes') || {}).value || null;
    var templateId = (document.getElementById('charge-template') || {}).value || null;
    if (!desc.trim()) return App.showToast('Beschreibung fehlt');
    if (!(priceVal >= 0)) return App.showToast('Preis ung\u00fcltig');
    try {
      await ApiClient.post('/api/students/' + studentId + '/charges', {
        description: desc.trim(),
        unit_price_cents: Math.round(priceVal * 100),
        quantity: qty,
        charge_date: date,
        notes: notes,
        pricing_template_id: templateId || null
      });
      App.closeModalForce();
      App.showToast('Position gespeichert');
      App.renderStudentBilling(studentId);
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  openAddPaymentDialog: async function(studentId) {
    var todayStr = new Date().toISOString().split('T')[0];
    // Offene Rechnungen aus Cache laden (oder neu fetchen)
    var cached = (App._billingCache && App._billingCache[studentId]) || null;
    var invoices = (cached && cached.invoices) || [];
    var openInvoices = invoices.filter(function(i){ return i.status === 'offen' || i.status === 'teilbezahlt'; });
    var invOptions = '<option value="">\u2014 keiner Rechnung zuordnen \u2014</option>';
    openInvoices.forEach(function(inv){
      invOptions += '<option value="' + inv.id + '" data-total="' + inv.total_cents + '">'
        + 'Rechnung ' + inv.invoice_number + ' \u00b7 ' + App._formatEur(inv.total_cents) + ' \u00b7 ' + inv.status
        + '</option>';
    });
    var html = '<div style="display:flex;flex-direction:column;gap:var(--space-3);">' +
      '<div class="form-group"><label class="form-label">Rechnung (optional)</label>' +
        '<select class="form-select" id="pay-invoice" onchange="App._prefillPaymentFromInvoice()">' + invOptions + '</select>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Wenn eine Rechnung gew\u00e4hlt ist, wird der offene Restbetrag vorgeschlagen und die Rechnung automatisch als bezahlt markiert.</div></div>' +
      '<div class="form-group"><label class="form-label">Betrag (\u20ac) *</label>' +
        '<input type="number" step="0.01" min="0" class="form-input" id="pay-amount" placeholder="0.00"></div>' +
      '<div class="form-group"><label class="form-label">Datum</label>' +
        '<input type="date" class="form-input" id="pay-date" value="' + todayStr + '"></div>' +
      '<div class="form-group"><label class="form-label">Zahlart</label>' +
        '<select class="form-select" id="pay-method">' +
          '<option value="bar">Bar</option>' +
          '<option value="\u00fcberweisung">\u00dcberweisung</option>' +
          '<option value="ec">EC/Karte</option>' +
          '<option value="paypal">PayPal</option>' +
          '<option value="sonstiges">Sonstiges</option>' +
        '</select></div>' +
      '<div class="form-group"><label class="form-label">Referenz</label>' +
        '<input type="text" class="form-input" id="pay-ref" placeholder="optional"></div>' +
      '<div class="form-group"><label class="form-label">Notiz</label>' +
        '<textarea class="form-textarea" id="pay-notes" rows="2"></textarea></div>' +
    '</div>';
    html += '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-4);">' +
      '<button class="btn btn-secondary" onclick="App.closeModalForce()">Abbrechen</button>' +
      '<button class="btn btn-primary" onclick="App._savePayment(\'' + studentId + '\')">Speichern</button>' +
    '</div>';
    App.openModal('Zahlung erfassen', html);
  },

  _prefillPaymentFromInvoice: function() {
    var sel = document.getElementById('pay-invoice'); if (!sel) return;
    var amtInput = document.getElementById('pay-amount'); if (!amtInput) return;
    var opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    var totalCents = parseInt(opt.getAttribute('data-total') || '0');
    if (totalCents > 0 && !amtInput.value) amtInput.value = (totalCents / 100).toFixed(2);
  },

  _savePayment: async function(studentId) {
    var amountVal = parseFloat((document.getElementById('pay-amount') || {}).value || '0');
    var date = (document.getElementById('pay-date') || {}).value || null;
    var method = (document.getElementById('pay-method') || {}).value || 'bar';
    var ref = (document.getElementById('pay-ref') || {}).value || null;
    var notes = (document.getElementById('pay-notes') || {}).value || null;
    var invoiceId = (document.getElementById('pay-invoice') || {}).value || null;
    if (!(amountVal > 0)) return App.showToast('Betrag ung\u00fcltig');
    try {
      await ApiClient.post('/api/students/' + studentId + '/payments', {
        amount_cents: Math.round(amountVal * 100),
        payment_date: date,
        payment_method: method,
        reference: ref,
        notes: notes,
        invoice_id: invoiceId
      });
      App.closeModal();
      App.showToast('Zahlung erfasst');
      App.renderStudentBilling(studentId);
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  // ════════════════════════════════
  //  BUCHHALTUNG PHASE 2: Rechnungen
  // ════════════════════════════════
  openCreateInvoiceDialog: async function(studentId) {
    // Frische Daten holen damit invoice_id-Status aktuell ist
    var data;
    try { data = await ApiClient.get('/api/students/' + studentId + '/billing'); }
    catch (err) { return App.showToast('Fehler: ' + (err.message || err)); }
    var allCharges = data.charges || [];
    var openCharges = allCharges.filter(function(c){ return !c.invoice_id; });
    if (openCharges.length === 0) {
      App.openModal('Rechnung erstellen', '<p style="font-size:var(--text-sm);color:var(--text-muted);">Keine offenen Positionen vorhanden. Alle Soll-Positionen sind bereits einer Rechnung zugeordnet.</p>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:var(--space-4);"><button class="btn btn-secondary" onclick="App.closeModalForce()">OK</button></div>');
      return;
    }
    var todayStr = new Date().toISOString().split('T')[0];
    // Standard-Faelligkeit: 14 Tage
    var due = new Date(); due.setDate(due.getDate() + 14);
    var dueStr = due.toISOString().split('T')[0];
    var rowsHtml = '';
    openCharges.forEach(function(c){
      rowsHtml += '<tr style="border-bottom:1px solid var(--border-color);">' +
        '<td style="padding:8px 6px;"><input type="checkbox" class="inv-charge-cb" data-id="' + c.id + '" data-total="' + c.total_cents + '" checked onchange="App._updateInvoicePreview()"></td>' +
        '<td style="padding:8px 6px;white-space:nowrap;">' + App._formatDateDe(c.charge_date) + '</td>' +
        '<td style="padding:8px 6px;">' + (c.description || '\u2014') + '</td>' +
        '<td style="padding:8px 6px;text-align:right;font-weight:600;">' + App._formatEur(c.total_cents) + '</td>' +
      '</tr>';
    });
    var html = '<div style="display:flex;flex-direction:column;gap:var(--space-3);max-width:720px;">' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">' +
        '<div class="form-group"><label class="form-label">Rechnungsdatum</label>' +
          '<input type="date" class="form-input" id="inv-date" value="' + todayStr + '"></div>' +
        '<div class="form-group"><label class="form-label">F\u00e4llig am</label>' +
          '<input type="date" class="form-input" id="inv-due" value="' + dueStr + '"></div>' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Notiz / Zahlungshinweis (optional)</label>' +
        '<textarea class="form-textarea" id="inv-notes" rows="2" placeholder="z.B. Bitte \u00fcberweisen Sie den Betrag innerhalb von 14 Tagen."></textarea></div>' +
      '<div style="font-size:var(--text-sm);font-weight:600;">Positionen ausw\u00e4hlen</div>' +
      '<div style="overflow-x:auto;max-height:300px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);">' +
        '<table style="width:100%;border-collapse:collapse;font-size:var(--text-sm);">' +
          '<thead style="position:sticky;top:0;background:var(--bg-elevated);"><tr style="text-align:left;color:var(--text-muted);font-size:var(--text-xs);text-transform:uppercase;">' +
            '<th style="padding:8px 6px;width:40px;"><input type="checkbox" id="inv-cb-all" checked onchange="App._toggleAllInvoiceCharges(this.checked)"></th>' +
            '<th style="padding:8px 6px;">Datum</th>' +
            '<th style="padding:8px 6px;">Beschreibung</th>' +
            '<th style="padding:8px 6px;text-align:right;">Betrag</th>' +
          '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
      '</div>' +
      '<div style="background:var(--bg-elevated);padding:var(--space-3);border-radius:var(--radius-md);">' +
        '<div style="display:flex;justify-content:space-between;font-size:var(--text-sm);"><span>Ausgew\u00e4hlt:</span><span id="inv-sum" style="font-weight:700;">' + App._formatEur(0) + '</span></div>' +
        '<div id="inv-tax-note" style="font-size:11px;color:var(--text-muted);margin-top:4px;"></div>' +
      '</div>' +
    '</div>';
    html += '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-4);">' +
      '<button class="btn btn-secondary" onclick="App.closeModalForce()">Abbrechen</button>' +
      '<button class="btn btn-primary" id="inv-create-btn" onclick="App._saveInvoice(\'' + studentId + '\')">Rechnung erstellen</button>' +
    '</div>';
    App.openModal('Rechnung erstellen', html);
    // Initial Summe + USt-Hinweis
    setTimeout(function(){ App._updateInvoicePreview(); }, 50);
    // USt-Modus laden
    ApiClient.get('/api/school/settings').then(function(s){
      var note = document.getElementById('inv-tax-note'); if (!note) return;
      if (s && s.tax_mode === 'regelbesteuerung') {
        note.textContent = 'USt-Modus: Regelbesteuerung (' + (s.tax_rate_percent || 19) + '% MwSt wird auf die Summe aufgeschlagen)';
      } else {
        note.textContent = 'USt-Modus: Kleinunternehmer (\u00a719 UStG \u2014 kein MwSt-Ausweis)';
      }
    }).catch(function(){});
  },

  _toggleAllInvoiceCharges: function(checked) {
    var cbs = document.querySelectorAll('.inv-charge-cb');
    cbs.forEach(function(cb){ cb.checked = !!checked; });
    App._updateInvoicePreview();
  },

  _updateInvoicePreview: function() {
    var cbs = document.querySelectorAll('.inv-charge-cb');
    var sum = 0;
    cbs.forEach(function(cb){ if (cb.checked) sum += parseInt(cb.getAttribute('data-total') || '0'); });
    var el = document.getElementById('inv-sum'); if (el) el.textContent = App._formatEur(sum);
  },

  _saveInvoice: async function(studentId) {
    var date = (document.getElementById('inv-date') || {}).value || null;
    var due = (document.getElementById('inv-due') || {}).value || null;
    var notes = (document.getElementById('inv-notes') || {}).value || null;
    var cbs = document.querySelectorAll('.inv-charge-cb');
    var ids = [];
    cbs.forEach(function(cb){ if (cb.checked) ids.push(cb.getAttribute('data-id')); });
    if (ids.length === 0) return App.showToast('Mindestens eine Position ausw\u00e4hlen');
    var btn = document.getElementById('inv-create-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Wird erstellt...'; }
    try {
      var res = await ApiClient.post('/api/invoices', {
        student_id: studentId,
        charge_ids: ids,
        invoice_date: date,
        due_date: due,
        notes: notes
      });
      App.closeModal();
      App.showToast('Rechnung ' + (res.invoice && res.invoice.invoice_number || '') + ' erstellt');
      App.renderStudentBilling(studentId);
      // PDF gleich oeffnen
      if (res.invoice && res.invoice.id) setTimeout(function(){ App.openInvoicePdf(res.invoice.id); }, 400);
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Rechnung erstellen'; }
      App.showToast('Fehler: ' + (err.message || err));
    }
  },

  cancelInvoice: async function(invoiceId, studentId) {
    if (!confirm('Rechnung wirklich stornieren? Die Positionen werden wieder freigegeben.')) return;
    var reason = prompt('Stornierungsgrund (optional):') || null;
    try {
      await ApiClient.post('/api/invoices/' + invoiceId + '/cancel', { reason: reason });
      App.showToast('Rechnung storniert');
      App.renderStudentBilling(studentId);
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  openInvoicePdf: async function(invoiceId) {
    App.showToast('Rechnung wird erzeugt...');
    var data;
    try { data = await ApiClient.get('/api/invoices/' + invoiceId); }
    catch (err) { return App.showToast('Fehler: ' + (err.message || err)); }
    if (!window.jspdf || !window.jspdf.jsPDF) return App.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var inv = data.invoice, items = data.items || [], school = data.school || {}, student = data.student || {};
    var fmtE = App._formatEur, fmtD = App._formatDateDe;
    var pageW = 210, pageH = 297, margin = 20, y = margin;

    // Absender-Zeile klein
    doc.setFontSize(8); doc.setTextColor(120);
    var senderLine = (school.name || '') + (school.address_line1 ? ' \u00b7 ' + school.address_line1 : '') +
      ((school.postal_code || school.city) ? ' \u00b7 ' + [school.postal_code, school.city].filter(Boolean).join(' ') : '');
    if (senderLine.trim()) { doc.text(senderLine, margin, y); doc.line(margin, y + 1, pageW - margin, y + 1); }
    y += 8;

    // Empfaenger (Snapshot bevorzugen, sonst Live-Daten)
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text('An', margin, y); y += 5;
    var recName = inv.student_name_snapshot || student.name || '';
    doc.setFontSize(12); doc.text(recName, margin, y); y += 6;
    var recAddrLines = [];
    if (inv.student_address_snapshot) {
      recAddrLines = String(inv.student_address_snapshot).split('\n').filter(Boolean);
    } else if (student) {
      var useBilling = (student.billing_same_as_address === false) && (student.billing_street || student.billing_postal_code || student.billing_city);
      var st = useBilling ? student.billing_street : student.street;
      var plz = useBilling ? student.billing_postal_code : student.postal_code;
      var ort = useBilling ? student.billing_city : student.city;
      if (st) recAddrLines.push(st);
      var l2 = [plz || '', ort || ''].filter(Boolean).join(' ').trim();
      if (l2) recAddrLines.push(l2);
    }
    doc.setFontSize(11);
    recAddrLines.forEach(function(line) { doc.text(line, margin, y); y += 5; });

    // Rechnungs-Header rechts
    doc.setFontSize(20); doc.setFont(undefined, 'bold'); doc.text('Rechnung', pageW - margin, margin + 8, { align: 'right' });
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    doc.text('Rechnungsnr.: ' + (inv.invoice_number || ''), pageW - margin, margin + 16, { align: 'right' });
    doc.text('Datum: ' + fmtD(inv.invoice_date), pageW - margin, margin + 22, { align: 'right' });
    if (inv.due_date) doc.text('F\u00e4llig: ' + fmtD(inv.due_date), pageW - margin, margin + 28, { align: 'right' });

    y = Math.max(y, margin + 38);
    y += 8;

    // Storno-Banner
    if (inv.status === 'storniert') {
      doc.setFillColor(254, 226, 226); doc.rect(margin, y, pageW - 2*margin, 10, 'F');
      doc.setTextColor(153, 27, 27); doc.setFont(undefined, 'bold'); doc.setFontSize(11);
      doc.text('STORNIERT' + (inv.cancel_reason ? ' \u00b7 ' + inv.cancel_reason : ''), margin + 3, y + 7);
      doc.setTextColor(0); doc.setFont(undefined, 'normal'); y += 14;
    }

    // Tabellenkopf
    doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.setFillColor(243, 244, 246); doc.rect(margin, y, pageW - 2*margin, 8, 'F');
    doc.text('Pos', margin + 2, y + 5.5);
    doc.text('Beschreibung', margin + 14, y + 5.5);
    doc.text('Menge', pageW - margin - 60, y + 5.5, { align: 'right' });
    doc.text('Einzel', pageW - margin - 30, y + 5.5, { align: 'right' });
    doc.text('Gesamt', pageW - margin - 2, y + 5.5, { align: 'right' });
    y += 10;
    doc.setFont(undefined, 'normal');

    items.forEach(function(it, i){
      if (y > pageH - 60) { doc.addPage(); y = margin; }
      var desc = it.description || '';
      var lines = doc.splitTextToSize(desc, pageW - 2*margin - 80);
      var rowH = Math.max(7, lines.length * 5 + 2);
      doc.text(String(i + 1), margin + 2, y + 5);
      doc.text(lines, margin + 14, y + 5);
      doc.text(String(it.quantity || 1), pageW - margin - 60, y + 5, { align: 'right' });
      doc.text(fmtE(it.unit_price_cents), pageW - margin - 30, y + 5, { align: 'right' });
      doc.text(fmtE(it.total_cents), pageW - margin - 2, y + 5, { align: 'right' });
      y += rowH;
      doc.setDrawColor(229, 231, 235); doc.line(margin, y, pageW - margin, y);
    });

    // Summen
    y += 6;
    var labelX = pageW - margin - 60, valueX = pageW - margin - 2;
    doc.text('Zwischensumme', labelX, y, { align: 'right' });
    doc.text(fmtE(inv.subtotal_cents), valueX, y, { align: 'right' }); y += 6;
    if (inv.tax_mode === 'regelbesteuerung' && inv.tax_cents > 0) {
      doc.text('zzgl. ' + inv.tax_rate_percent + '% MwSt', labelX, y, { align: 'right' });
      doc.text(fmtE(inv.tax_cents), valueX, y, { align: 'right' }); y += 6;
    }
    doc.setFont(undefined, 'bold'); doc.setFontSize(12);
    doc.text('Gesamtbetrag', labelX, y + 1, { align: 'right' });
    doc.text(fmtE(inv.total_cents), valueX, y + 1, { align: 'right' });
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    y += 12;

    // USt-Hinweis Kleinunternehmer
    if (inv.tax_mode === 'kleinunternehmer') {
      var ukLines = doc.splitTextToSize('Gem\u00e4\u00df \u00a7 19 UStG wird keine Umsatzsteuer berechnet.', pageW - 2*margin);
      doc.setTextColor(80); doc.text(ukLines, margin, y); doc.setTextColor(0);
      y += ukLines.length * 5;
    }

    if (inv.notes) {
      y += 4;
      var noteLines = doc.splitTextToSize(inv.notes, pageW - 2*margin);
      doc.text(noteLines, margin, y); y += noteLines.length * 5;
    }

    // Footer
    var footerY = pageH - 18;
    doc.setDrawColor(229, 231, 235); doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
    doc.setFontSize(8); doc.setTextColor(120);
    var footerL = [school.name || '', school.address_line1 || '', [school.postal_code, school.city].filter(Boolean).join(' ')].filter(Boolean).join(' \u00b7 ');
    var footerR = (school.phone ? 'Tel: ' + school.phone : '') + (school.email ? '  \u00b7  ' + school.email : '');
    doc.text(footerL, margin, footerY);
    if (school.bank_info) doc.text(String(school.bank_info), margin, footerY + 5);
    if (school.tax_id) doc.text('USt-IdNr: ' + school.tax_id, pageW - margin, footerY, { align: 'right' });
    if (footerR) doc.text(footerR, pageW - margin, footerY + 5, { align: 'right' });

    var fileName = 'Rechnung_' + (inv.invoice_number || inv.id) + '_' + (student.name || 'Schueler').replace(/\s+/g, '_') + '.pdf';
    doc.save(fileName);
    App.showToast('Rechnung erstellt');
  },

  deleteCharge: async function(chargeId, studentId) {
    if (!confirm('Position l\u00f6schen?')) return;
    try {
      await ApiClient.del('/api/charges/' + chargeId);
      App.showToast('Gel\u00f6scht');
      App.renderStudentBilling(studentId);
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
  },

  deletePayment: async function(paymentId, studentId) {
    if (!confirm('Zahlung l\u00f6schen?')) return;
    try {
      await ApiClient.del('/api/payments/' + paymentId);
      App.showToast('Gel\u00f6scht');
      App.renderStudentBilling(studentId);
    } catch (err) { App.showToast('Fehler: ' + (err.message || err)); }
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
  generateAiBriefing: async function(studentId) {
    var btn = document.getElementById('ai-briefing-btn-' + studentId);
    var out = document.getElementById('ai-briefing-output-' + studentId);
    if (!btn || !out) return;
    var oldText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-right:8px;"></span>KI denkt nach...';
    out.style.display = 'none';
    try {
      var result = await ApiClient.post('/api/ai/briefing/' + studentId, {});
      var briefingHtml = (result.briefing || '').replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.innerHTML = '<div style="background:#fff;border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-sm);line-height:1.6;border-left:4px solid #1565c0;">' +
        briefingHtml +
        '<div style="margin-top:var(--space-2);font-size:var(--text-xs);color:var(--text-muted);">Basierend auf ' + (result.lesson_count || 0) + ' Fahrstunden \u00b7 KI: Google Gemini</div>' +
      '</div>';
      out.style.display = 'block';
    } catch (err) {
      var msg = err && err.message ? err.message : String(err);
      var html = '<div style="background:#ffeaea;border-radius:var(--radius-md);padding:var(--space-3);font-size:var(--text-sm);color:#c62828;border-left:4px solid #c62828;">' + msg;
      if (msg.toLowerCase().indexOf('ki-tarif') >= 0 || msg.toLowerCase().indexOf('ki-briefing nur') >= 0) {
        html += '<br><br><button class="btn btn-primary btn-sm" onclick="App.switchSchoolTab(\'abo\')">Jetzt auf KI-Tarif upgraden</button>';
      }
      html += '</div>';
      out.innerHTML = html;
      out.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  },

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
  //  FRISTVERKUERZUNG BESCHEINIGUNGEN (Theorie + Praxis)
  // ══════════════════════════════════════════
  openFristverkuerzungDialog: function(studentId, pruefungArt) {
    var self = this;
    var isTheorie = pruefungArt === 'theorie';
    var title = isTheorie ? t('fristverkuerzungTheorie') : t('fristverkuerzungPraxis');
    var minTage = isTheorie ? 3 : 7;
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    var html = '<div style="padding:var(--space-2);max-width:520px;">' +
      '<p class="text-sm text-muted" style="margin-bottom:var(--space-3);">' + t('fristverkuerzungHinweis').replace('{tage}', minTage) + '</p>' +
      '<div class="form-group"><label class="form-label"><input type="checkbox" id="fv-leer" style="margin-right:var(--space-2);"> ' + t('bescheinigungLeerDrucken') + '</label>' +
      '<div class="text-xs text-muted" style="margin-top:4px;">' + t('bescheinigungLeerHinweis') + '</div></div>' +
      '<div id="fv-fields">' +
        '<div class="form-group"><label class="form-label">' + t('pruefungsdatum') + '</label>' +
          '<input type="date" id="fv-pruefungsdatum" class="form-input" value="' + todayStr + '"></div>' +
        '<div class="form-group"><label class="form-label">' + t('pruefungsort') + '</label>' +
          '<input type="text" id="fv-pruefungsort" class="form-input" placeholder="' + t('pruefungsortPlaceholder') + '"></div>' +
        '<div class="form-group"><label class="form-label">' + t('wiederholungNachTagen') + '</label>' +
          '<input type="number" id="fv-tage" class="form-input" value="' + minTage + '" min="' + minTage + '" step="1">' +
          '<div class="text-xs text-muted" style="margin-top:4px;">' + t('mindestensTage').replace('{tage}', minTage) + '</div></div>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-secondary" onclick="App.closeModalForce()">' + t('abbrechen') + '</button>' +
        '<button class="btn btn-primary" onclick="App.generateFristverkuerzung(\'' + studentId + '\',\'' + pruefungArt + '\')">' + t('pdfErstellen') + '</button>' +
      '</div>' +
    '</div>';
    self.openModal(title, html);
    setTimeout(function() {
      var leerCb = document.getElementById('fv-leer');
      var fields = document.getElementById('fv-fields');
      if (leerCb && fields) {
        leerCb.addEventListener('change', function() {
          fields.style.opacity = leerCb.checked ? '0.4' : '1';
          fields.style.pointerEvents = leerCb.checked ? 'none' : 'auto';
        });
      }
    }, 50);
  },

  generateFristverkuerzung: async function(studentId, pruefungArt) {
    var self = this;
    var leerCb = document.getElementById('fv-leer');
    var leer = !!(leerCb && leerCb.checked);
    var pruefungsdatum = '';
    var pruefungsort = '';
    var tage = '';
    if (!leer) {
      pruefungsdatum = (document.getElementById('fv-pruefungsdatum') || {}).value || '';
      pruefungsort = (document.getElementById('fv-pruefungsort') || {}).value || '';
      tage = (document.getElementById('fv-tage') || {}).value || '';
    }
    self.closeModalForce();
    self.showToast(t('pdfWirdErstellt'));
    try {
      var data = leer
        ? { student: { name:'', email:'', license_class:'', geburtsdatum:'', anschrift:'' }, school: { name:'', address:'', phone:'', email:'' } }
        : await ApiClient.get('/api/ausbildungsnachweis/' + studentId);
      if (!window.jspdf || !window.jspdf.jsPDF) {
        self.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
        return;
      }
      self.renderFristverkuerzungPdf(data, {
        art: pruefungArt,
        leer: leer,
        pruefungsdatum: pruefungsdatum,
        pruefungsort: pruefungsort,
        tage: tage
      });
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  renderFristverkuerzungPdf: function(data, opts) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210, ph = 297;
    var ml = 18, mr = 18, mt = 14;
    var cw = pw - ml - mr;
    var isTheorie = opts.art === 'theorie';

    var fmtDate = function(d) {
      if (!d) return '';
      var p = String(d).split('-');
      return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
    };
    var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2); };
    var drawField = function(label, value, x, y, w) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(value || '', x, y + 6);
      drawLine(x, y + 7, x + w, y + 7);
    };

    var y = mt;
    // Überschrift
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    var titleText = isTheorie
      ? 'Fristverk\u00fcrzung theoretische Pr\u00fcfung'
      : 'Fristverk\u00fcrzung praktische Pr\u00fcfung';
    doc.text(titleText, pw / 2, y, { align: 'center' });
    y += 10;

    // Angaben der Fahrschule
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Angaben der Fahrschule', ml, y); y += 5;
    drawField('Name der Fahrschule', opts.leer ? '' : (data.school.name || ''), ml, y, cw);
    y += 12;
    drawField('Anschrift', opts.leer ? '' : (data.school.address || ''), ml, y, cw);
    y += 14;

    // Angaben des Fahrerlaubnisbewerbers (ohne Anschrift)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Angaben des Fahrerlaubnisbewerbers', ml, y); y += 5;
    drawField('Name, Vorname', opts.leer ? '' : (data.student.name || ''), ml, y, cw * 0.5);
    drawField('Geburtsdatum', opts.leer ? '' : fmtDate(data.student.geburtsdatum || ''), ml + cw * 0.53, y, cw * 0.22);
    drawField('Klasse(n)', opts.leer ? '' : (data.student.license_class || ''), ml + cw * 0.78, y, cw * 0.22);
    y += 14;

    // Antragstext
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    var pruefText = isTheorie ? 'theoretische' : 'praktische';
    var tageText = opts.leer ? '_______' : (opts.tage || '_______');
    var antragText = 'Hiermit wird beantragt, die erste ' + pruefText + ' Fahrerlaubnispr\u00fcfung bereits nach ' + tageText + ' Tagen zu wiederholen.';
    var antragLines = doc.splitTextToSize(antragText, cw);
    doc.text(antragLines, ml, y);
    y += antragLines.length * 5 + 4;

    // Datum der ersten Prüfung
    var pdText = 'Die erste ' + pruefText + ' Fahrerlaubnispr\u00fcfung fand statt am:';
    doc.text(pdText, ml, y); y += 5;
    var dateStr = opts.leer ? '' : fmtDate(opts.pruefungsdatum);
    var ortStr = opts.leer ? '' : (opts.pruefungsort || '');
    drawField('Datum', dateStr, ml, y, cw * 0.4);
    drawField('Ort', ortStr, ml + cw * 0.45, y, cw * 0.55);
    y += 16;

    // Bestätigung der Fahrschule
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Best\u00e4tigung der Fahrschule', ml, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var bestText = 'Die Fahrschule best\u00e4tigt, dass die Ausbildungsdefizite durch die Teilnahme an einer Kompaktausbildung behoben werden bzw. behoben sind und der Bewerber \u00fcber die zum F\u00fchren eines Kraftfahrzeugs erforderlichen Kenntnisse und F\u00e4higkeiten verf\u00fcgt (\u00a7\u00a7 6 Abs. 1 und 7 Abs. 2 FahrschAusbO).';
    var bestLines = doc.splitTextToSize(bestText, cw);
    doc.text(bestLines, ml, y);
    y += bestLines.length * 3.8 + 4;

    doc.setFont('helvetica', 'normal');
    y += 4;

    // Unterschriften (Antragsteller + Fahrschule)
    var sigW = (cw - 8) / 2;
    doc.setFontSize(9);
    drawLine(ml, y + 8, ml + sigW, y + 8);
    drawLine(ml + sigW + 8, y + 8, ml + cw, y + 8);
    doc.setFontSize(7);
    doc.text('Ort, Datum, Unterschrift Fahrerlaubnisbewerber', ml, y + 11);
    doc.text('Ort, Datum, Unterschrift Fahrschule / Stempel', ml + sigW + 8, y + 11);

    var nameForFile = opts.leer ? 'Blanko' : (data.student.name || 'Sch\u00fcler').replace(/\s+/g, '_');
    var suffix = isTheorie ? 'Theorie' : 'Praxis';
    var fileName = 'Fristverk\u00fcrzung_' + suffix + '_' + nameForFile + '.pdf';
    doc.save(fileName);
    this.showToast(t('pdfErstellt'));
  },
  // ══════════════════════════════════════════
  //  Schul-/Arbeitgeber-Entschuldigung
  // ══════════════════════════════════════════
  openEntschuldigungDialog: function(studentId) {
    var self = this;
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    var html = '<div style="padding:var(--space-2);max-width:560px;">' +
      '<p class="text-sm text-muted" style="margin-bottom:var(--space-3);">' + t('entschuldigungHinweis') + '</p>' +
      '<div class="form-group"><label class="form-label"><input type="checkbox" id="ent-leer" style="margin-right:var(--space-2);"> ' + t('bescheinigungLeerDrucken') + '</label>' +
      '<div class="text-xs text-muted" style="margin-top:4px;">' + t('bescheinigungLeerHinweis') + '</div></div>' +
      '<div id="ent-fields">' +
        '<div class="form-group"><label class="form-label">Adressat (z.B. Schule, Arbeitgeber)</label>' +
          '<input type="text" id="ent-adressat" class="form-input" placeholder="z.B. Gymnasium Musterstadt, Klasse 11b"></div>' +
        '<div class="form-group"><label class="form-label">Anlass (mehrere m\u00f6glich)</label>' +
          '<div style="display:flex;flex-direction:column;gap:6px;">' +
            '<label><input type="checkbox" id="ent-anl-theorie" style="margin-right:6px;"> Theoretische Pr\u00fcfung</label>' +
            '<label><input type="checkbox" id="ent-anl-praxis" style="margin-right:6px;"> Praktische Pr\u00fcfung</label>' +
            '<label><input type="checkbox" id="ent-anl-sonder" style="margin-right:6px;"> Sonderfahrten (\u00dcberland / Autobahn / Nachtfahrt)</label>' +
          '</div></div>' +
        '<div class="form-group"><label class="form-label">Datum</label>' +
          '<input type="date" id="ent-datum" class="form-input" value="' + todayStr + '"></div>' +
        '<div class="form-group"><label class="form-label"><input type="checkbox" id="ent-ganztag" style="margin-right:var(--space-2);" checked> Ganzer Tag</label></div>' +
        '<div class="form-row" id="ent-uhrzeit-row" style="display:none;gap:var(--space-2);">' +
          '<div class="form-group" style="flex:1;"><label class="form-label">Von (Uhrzeit)</label>' +
            '<input type="time" id="ent-von" class="form-input" value="08:00"></div>' +
          '<div class="form-group" style="flex:1;"><label class="form-label">Bis (Uhrzeit)</label>' +
            '<input type="time" id="ent-bis" class="form-input" value="12:00"></div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-secondary" onclick="App.closeModalForce()">' + t('abbrechen') + '</button>' +
        '<button class="btn btn-primary" onclick="App.generateEntschuldigung(\'' + studentId + '\')">' + t('pdfErstellen') + '</button>' +
      '</div>' +
    '</div>';
    self.openModal(t('entschuldigung'), html);
    setTimeout(function() {
      var leerCb = document.getElementById('ent-leer');
      var fields = document.getElementById('ent-fields');
      if (leerCb && fields) {
        leerCb.addEventListener('change', function() {
          fields.style.opacity = leerCb.checked ? '0.4' : '1';
          fields.style.pointerEvents = leerCb.checked ? 'none' : 'auto';
        });
      }
      var ganztagCb = document.getElementById('ent-ganztag');
      var uhrRow = document.getElementById('ent-uhrzeit-row');
      if (ganztagCb && uhrRow) {
        ganztagCb.addEventListener('change', function() {
          uhrRow.style.display = ganztagCb.checked ? 'none' : 'flex';
        });
      }
    }, 50);
  },

  generateEntschuldigung: async function(studentId) {
    var self = this;
    var leerCb = document.getElementById('ent-leer');
    var leer = !!(leerCb && leerCb.checked);
    var opts = { leer: leer };
    if (!leer) {
      opts.adressat = (document.getElementById('ent-adressat') || {}).value || '';
      opts.datum = (document.getElementById('ent-datum') || {}).value || '';
      opts.ganztag = !!(document.getElementById('ent-ganztag') || {}).checked;
      opts.von = (document.getElementById('ent-von') || {}).value || '';
      opts.bis = (document.getElementById('ent-bis') || {}).value || '';
      opts.anlTheorie = !!(document.getElementById('ent-anl-theorie') || {}).checked;
      opts.anlPraxis = !!(document.getElementById('ent-anl-praxis') || {}).checked;
      opts.anlSonder = !!(document.getElementById('ent-anl-sonder') || {}).checked;
    }
    self.closeModalForce();
    self.showToast(t('pdfWirdErstellt'));
    try {
      var data = leer
        ? { student: { name:'', email:'', license_class:'', geburtsdatum:'', anschrift:'' }, school: { name:'', address:'', phone:'', email:'' } }
        : await ApiClient.get('/api/ausbildungsnachweis/' + studentId);
      if (!window.jspdf || !window.jspdf.jsPDF) {
        self.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
        return;
      }
      self.renderEntschuldigungPdf(data, opts);
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  renderEntschuldigungPdf: function(data, opts) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210;
    var ml = 20, mr = 20, mt = 18;
    var cw = pw - ml - mr;

    var fmtDate = function(d) {
      if (!d) return '';
      var p = String(d).split('-');
      return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
    };
    var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2); };
    var checkbox = function(x, y, checked) {
      doc.setDrawColor(0); doc.setLineWidth(0.4);
      doc.rect(x, y - 3.5, 3.8, 3.8);
      if (checked) {
        doc.setLineWidth(0.7);
        doc.line(x + 0.6, y - 1.8, x + 1.6, y - 0.5);
        doc.line(x + 1.6, y - 0.5, x + 3.4, y - 3.1);
        doc.setLineWidth(0.3);
      }
    };

    var y = mt;
    // Briefkopf links: Fahrschule
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.setTextColor(80);
    if (!opts.leer && data.school) {
      var senderLine = (data.school.name || '');
      if (data.school.address) senderLine += (senderLine ? ' \u00b7 ' : '') + data.school.address;
      if (senderLine) {
        var sLines = doc.splitTextToSize(senderLine, cw);
        doc.text(sLines, ml, y);
      }
    } else {
      drawLine(ml, y + 1, ml + cw * 0.7, y + 1);
      doc.text('Absender (Fahrschule)', ml, y - 1);
    }
    doc.setTextColor(0);
    y += 12;

    // Adressat
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('An', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    if (opts.leer) {
      drawLine(ml, y + 1, ml + cw * 0.85, y + 1); y += 7;
      drawLine(ml, y + 1, ml + cw * 0.85, y + 1); y += 7;
      drawLine(ml, y + 1, ml + cw * 0.85, y + 1); y += 6;
    } else {
      var adr = opts.adressat || '';
      var adrLines = doc.splitTextToSize(adr || ' ', cw * 0.85);
      // Mindesthöhe für Adressat
      var minLines = Math.max(adrLines.length, 2);
      for (var ai = 0; ai < minLines; ai++) {
        if (adrLines[ai]) doc.text(adrLines[ai], ml, y);
        drawLine(ml, y + 1, ml + cw * 0.85, y + 1);
        y += 7;
      }
    }
    y += 8;

    // Datum oben rechts
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    var ort = (!opts.leer && data.school && data.school.address)
      ? (String(data.school.address).split(',').pop() || '').trim().replace(/^\d{4,5}\s*/, '') || ''
      : '';
    var heute = (new Date());
    var heuteStr = String(heute.getDate()).padStart(2,'0') + '.' + String(heute.getMonth()+1).padStart(2,'0') + '.' + heute.getFullYear();
    var ortDatum = (ort ? (ort + ', ') : '') + heuteStr;
    if (opts.leer) ortDatum = '';
    doc.text(ortDatum, pw - mr, y, { align: 'right' });
    y += 10;

    // Betreff / Titel
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Entschuldigung / Freistellung', ml, y);
    y += 9;

    // Sch\u00fclerdaten-Block
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Angaben des Fahrsch\u00fclers', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    var labelY = y;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('Name, Vorname', ml, labelY);
    doc.text('Geburtsdatum', ml + cw * 0.65, labelY);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    var nameVal = opts.leer ? '' : (data.student.name || '');
    var gebVal = opts.leer ? '' : fmtDate(data.student.geburtsdatum || '');
    doc.text(nameVal, ml, labelY + 6);
    doc.text(gebVal, ml + cw * 0.65, labelY + 6);
    drawLine(ml, labelY + 7, ml + cw * 0.6, labelY + 7);
    drawLine(ml + cw * 0.65, labelY + 7, ml + cw, labelY + 7);
    y = labelY + 14;

    // Haupttext
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    var einleitung = 'Hiermit best\u00e4tigt die oben genannte Fahrschule, dass der/die oben genannte Fahrsch\u00fcler/in am';
    var einLines = doc.splitTextToSize(einleitung, cw);
    doc.text(einLines, ml, y);
    y += einLines.length * 5 + 2;

    // Datum + Zeitraum-Zeile
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    var datumStr = opts.leer ? '________________' : fmtDate(opts.datum || '');
    var zeitStr = '';
    if (opts.leer) {
      zeitStr = 'von _______ bis _______ Uhr';
    } else if (opts.ganztag) {
      zeitStr = '(ganzt\u00e4gig)';
    } else {
      var von = opts.von || '_____';
      var bis = opts.bis || '_____';
      zeitStr = 'von ' + von + ' bis ' + bis + ' Uhr';
    }
    doc.text(datumStr + '   ' + zeitStr, ml, y);
    y += 8;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    var hauptText = 'wegen einer verpflichtenden Ausbildungsma\u00dfnahme im Rahmen der Fahrausbildung verhindert ist und daher von der Anwesenheitspflicht in der Schule / am Arbeitsplatz entschuldigt werden m\u00f6chte.';
    var hauptLines = doc.splitTextToSize(hauptText, cw);
    doc.text(hauptLines, ml, y);
    y += hauptLines.length * 5 + 6;

    // Anlass-Checkboxen
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Anlass', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    var renderCheck = function(label, checked) {
      checkbox(ml, y, checked);
      doc.text(label, ml + 6, y);
      y += 6;
    };
    renderCheck('Theoretische F\u00fchrerscheinpr\u00fcfung', !!opts.anlTheorie);
    renderCheck('Praktische F\u00fchrerscheinpr\u00fcfung', !!opts.anlPraxis);
    renderCheck('Sonderfahrt (\u00dcberland-, Autobahn- oder Nachtfahrt nach \u00a7 5 FahrschAusbO)', !!opts.anlSonder);
    y += 6;

    // Hinweis
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
    doc.setTextColor(90);
    var hinweis = 'Die Teilnahme an dieser Ma\u00dfnahme ist Voraussetzung f\u00fcr den Erwerb der Fahrerlaubnis. Wir bitten um Ihr Verst\u00e4ndnis und um Entschuldigung des Fehlens.';
    var hLines = doc.splitTextToSize(hinweis, cw);
    doc.text(hLines, ml, y);
    y += hLines.length * 4 + 12;
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');

    // Unterschrift Fahrschule
    doc.setFontSize(9);
    var sigW = cw * 0.6;
    drawLine(ml, y + 8, ml + sigW, y + 8);
    doc.setFontSize(7);
    doc.text('Unterschrift / Stempel der Fahrschule', ml, y + 11);

    // Datei speichern
    var nameForFile = opts.leer ? 'Blanko' : (data.student.name || 'Sch\u00fcler').replace(/\s+/g, '_');
    var fileName = 'Entschuldigung_' + nameForFile + '.pdf';
    doc.save(fileName);
    this.showToast(t('pdfErstellt'));
  },

  // ══════════════════════════════════════════
  //  B196 — Vereinbarung (521a) + Teilnahmebescheinigung (521 / Anlage 7b FeV)
  // ══════════════════════════════════════════
  openB196Dialog: function(studentId, art) {
    var self = this;
    var isVertrag = art === 'vertrag';
    var title = isVertrag ? t('b196Vertrag') : t('b196Bescheinigung');
    var hinweis = isVertrag ? t('b196VertragHinweis') : t('b196BescheinigungHinweis');
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

    var fieldsHtml = '';
    if (isVertrag) {
      fieldsHtml =
        '<div class="form-group"><label class="form-label">' + t('geburtsort') + '</label>' +
          '<input type="text" id="b196-geburtsort" class="form-input" placeholder="Berlin"></div>' +
        '<div class="form-group"><label class="form-label">' + t('klasseBSeit') + '</label>' +
          '<input type="date" id="b196-klasseb-seit" class="form-input"></div>' +
        '<div class="form-group"><label class="form-label">' + t('pauschalentgelt') + '</label>' +
          '<input type="number" id="b196-pauschalentgelt" class="form-input" placeholder="599" min="0" step="0.01"></div>' +
        '<div class="form-group"><label class="form-label">' + t('zusatzEntgelt') + '</label>' +
          '<input type="number" id="b196-zusatzentgelt" class="form-input" placeholder="55" min="0" step="0.01"></div>' +
        '<div class="text-xs text-muted" style="margin-top:var(--space-2);padding:var(--space-2);background:#fef3c7;border-radius:var(--radius-md);">Hinweis: Die Checkbox \u201eSchulungsfahrzeug von Fahrschule / Teilnehmer\u201c bleibt im PDF leer und wird von der Fahrschule manuell angekreuzt.</div>';
    } else {
      fieldsHtml =
        '<div class="form-group"><label class="form-label">' + t('ausstellungsdatumFs') + '</label>' +
          '<input type="date" id="b196-fs-datum" class="form-input"></div>' +
        '<div class="form-group"><label class="form-label">' + t('schulungsfahrzeug') + '</label>' +
          '<input type="text" id="b196-fahrzeug" class="form-input" placeholder="' + t('schulungsfahrzeugPlaceholder') + '"></div>' +
        '<div class="form-group"><label class="form-label">' + t('bemerkungen') + '</label>' +
          '<input type="text" id="b196-bemerkungen" class="form-input"></div>';
    }

    var html = '<div style="padding:var(--space-2);max-width:560px;">' +
      '<p class="text-sm text-muted" style="margin-bottom:var(--space-3);">' + hinweis + '</p>' +
      '<div class="form-group"><label class="form-label"><input type="checkbox" id="b196-leer" style="margin-right:var(--space-2);"> ' + t('bescheinigungLeerDrucken') + '</label>' +
      '<div class="text-xs text-muted" style="margin-top:4px;">' + t('bescheinigungLeerHinweis') + '</div></div>' +
      '<div id="b196-fields">' + fieldsHtml + '</div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-secondary" onclick="App.closeModalForce()">' + t('abbrechen') + '</button>' +
        '<button class="btn btn-primary" onclick="App.generateB196(\'' + studentId + '\',\'' + art + '\')">' + t('pdfErstellen') + '</button>' +
      '</div>' +
    '</div>';
    self.openModal(title, html);
    setTimeout(function() {
      var leerCb = document.getElementById('b196-leer');
      var fields = document.getElementById('b196-fields');
      if (leerCb && fields) {
        leerCb.addEventListener('change', function() {
          fields.style.opacity = leerCb.checked ? '0.4' : '1';
          fields.style.pointerEvents = leerCb.checked ? 'none' : 'auto';
        });
      }
    }, 50);
  },

  generateB196: async function(studentId, art) {
    var self = this;
    var isVertrag = art === 'vertrag';
    var leerCb = document.getElementById('b196-leer');
    var leer = !!(leerCb && leerCb.checked);
    var opts = { art: art, leer: leer };

    if (!leer) {
      if (isVertrag) {
        opts.geburtsort = (document.getElementById('b196-geburtsort') || {}).value || '';
        opts.klasseBSeit = (document.getElementById('b196-klasseb-seit') || {}).value || '';
        opts.pauschalentgelt = (document.getElementById('b196-pauschalentgelt') || {}).value || '';
        opts.zusatzentgelt = (document.getElementById('b196-zusatzentgelt') || {}).value || '';
      } else {
        opts.fsDatum = (document.getElementById('b196-fs-datum') || {}).value || '';
        opts.fahrzeug = (document.getElementById('b196-fahrzeug') || {}).value || '';
        opts.bemerkungen = (document.getElementById('b196-bemerkungen') || {}).value || '';
      }
    }
    self.closeModalForce();
    self.showToast(t('pdfWirdErstellt'));
    try {
      var data = leer
        ? { student: { name:'', email:'', license_class:'', geburtsdatum:'', anschrift:'' }, school: { name:'', address:'', admin_name:'' } }
        : await ApiClient.get('/api/ausbildungsnachweis/' + studentId);
      if (!window.jspdf || !window.jspdf.jsPDF) {
        self.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
        return;
      }
      if (isVertrag) self.renderB196VertragPdf(data, opts);
      else self.renderB196BescheinigungPdf(data, opts);
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  // Hilfsfunktion: Adresse in Straße/Hausnummer + PLZ/Ort splitten
  _splitAddress: function(addr) {
    // Erwartet z.B. "Musterstr. 12, 10115 Berlin" oder "Musterstr. 12\n10115 Berlin"
    if (!addr) return { street: '', city: '' };
    var s = String(addr).replace(/\n/g, ', ');
    var m = s.match(/^(.*?),\s*(\d{4,5}\s+.*)$/);
    if (m) return { street: m[1].trim(), city: m[2].trim() };
    return { street: s.trim(), city: '' };
  },

  renderB196VertragPdf: function(data, opts) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210, ph = 297;
    var ml = 18, mr = 18, mt = 14;
    var cw = pw - ml - mr;
    var self = this;

    var fmtDate = function(d) {
      if (!d) return '';
      var p = String(d).split('-');
      return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
    };
    var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2); };
    var drawField = function(label, value, x, y, w) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(value || '', x, y);
      drawLine(x, y + 1, x + w, y + 1);
      doc.setFontSize(7); doc.setTextColor(90);
      doc.text(label, x, y + 4);
      doc.setTextColor(0);
    };
    var checkbox = function(x, y, checked) {
      doc.setDrawColor(0); doc.setLineWidth(0.3);
      doc.rect(x, y - 3, 3.2, 3.2);
      if (checked) {
        doc.setLineWidth(0.5);
        doc.line(x + 0.4, y - 1.4, x + 1.4, y - 0.4);
        doc.line(x + 1.4, y - 0.4, x + 2.8, y - 2.7);
      }
    };

    var studentAddr = self._splitAddress(opts.leer ? '' : (data.student.anschrift || ''));
    var schoolAddr = self._splitAddress(opts.leer ? '' : (data.school.address || ''));

    var y = mt;
    // Titel
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Vereinbarung \u00fcber die Fahrerschulung', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text('zum Erwerb der Schl\u00fcsselzahl 196 (Anlage 7b FeV)', pw / 2, y, { align: 'center' });
    y += 7;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var introText = 'Berechtigung zum F\u00fchren von Leichtkraftr\u00e4dern der Fahrerlaubnisklasse A1 im Inland, sofern der Inhaber der Fahrerlaubnis der Klasse B diese ununterbrochen seit mindestens 5 Jahren besitzt und das 25. Lebensjahr vollendet hat.';
    var introLines = doc.splitTextToSize(introText, cw);
    doc.text(introLines, ml, y);
    y += introLines.length * 3.4 + 4;

    // Vertragsparteien
    // Convention: data.student.name ist 'Vorname Nachname'.
    // Anlage 7b FeV trennt Name (Nachname) und Vorname in separate Felder.
    var _vNameParts = (opts.leer ? '' : (data.student.name || '')).split(/\s+/).filter(Boolean);
    var _vNachname = _vNameParts.length > 1 ? _vNameParts[_vNameParts.length - 1] : (_vNameParts[0] || '');
    var _vVorname  = _vNameParts.length > 1 ? _vNameParts.slice(0, -1).join(' ') : '';
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Zwischen Frau/Herr (Teilnehmer/in)', ml, y); y += 5;
    drawField('Name', _vNachname, ml, y, cw * 0.5);
    drawField('Vorname', _vVorname, ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('geboren am', opts.leer ? '' : fmtDate(data.student.geburtsdatum || ''), ml, y, cw * 0.45);
    drawField('geboren in', opts.leer ? '' : (opts.geburtsort || ''), ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Stra\u00dfe, Hausnummer', studentAddr.street, ml, y, cw); y += 9;
    drawField('PLZ, Ort', studentAddr.city, ml, y, cw); y += 10;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('und der Fahrschule', ml, y); y += 5;
    drawField('Unternehmensbezeichnung', opts.leer ? '' : (data.school.name || ''), ml, y, cw); y += 9;
    drawField('Inhaber (Vorname, Name)', opts.leer ? '' : (data.school.admin_name || ''), ml, y, cw); y += 9;
    drawField('Stra\u00dfe, Hausnummer', schoolAddr.street, ml, y, cw); y += 9;
    drawField('PLZ, Ort', schoolAddr.city, ml, y, cw); y += 9;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('wird folgende Vereinbarung geschlossen:', ml, y); y += 6;

    var klBseit = opts.leer ? '' : fmtDate(opts.klasseBSeit || '');
    var inhaberText = 'Der/Die Teilnehmer/in will die Fahrerlaubnis Klasse B auf die Berechtigung nach der Schl\u00fcsselzahl 196 erweitern lassen. Er/Sie ist seit ' + (klBseit || '_______________') + ' im Besitz der Fahrerlaubnis Klasse B. Der/Die Teilnehmer/in beauftragt die Fahrschule, die vorgeschriebene Fahrerschulung nach Anlage 7b zur Fahrerlaubnis-Verordnung (FeV) durchzuf\u00fchren.';
    var inhaberLines = doc.splitTextToSize(inhaberText, cw);
    doc.text(inhaberLines, ml, y);
    y += inhaberLines.length * 4 + 4;

    // § Dauer und Gliederung
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Dauer und Gliederung der Schulung', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var dauerText = 'Die Schulung dauert mindestens 9 Unterrichtseinheiten zu jeweils 90 Minuten: Teil 1 — Theoretische Schulung mind. 4\u00d790 Minuten, Teil 2 — Praktische Schulung mind. 5\u00d790 Minuten. Teil 1 erfolgt m\u00f6glichst vor der praktischen Schulung und darf in Gruppen unterrichtet werden. Teil 2 ist immer als Einzelunterricht durchzuf\u00fchren. Das als Schulungsfahrzeug verwendete Leichtkraftrad der Klasse A1 muss den Vorgaben der FeV Anlage 7 Nr. 2.2.3 entsprechen und wird';
    var dauerLines = doc.splitTextToSize(dauerText, cw);
    doc.text(dauerLines, ml, y);
    y += dauerLines.length * 3.8 + 3;

    // Schulungsfahrzeug-Checkboxen bleiben IMMER leer — die Fahrschule kreuzt manuell an.
    checkbox(ml + 4, y, false);
    doc.text('von der Fahrschule bereitgestellt', ml + 9, y); y += 5;
    checkbox(ml + 4, y, false);
    doc.text('vom/von der Teilnehmer/in zur Verf\u00fcgung gestellt', ml + 9, y); y += 7;

    // Theorie/Praxis Inhaltsbeschreibung
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Theoretische Schulung', ml, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var thText = 'Mindestens 4 Unterrichtseinheiten zu je 90 Minuten im Unterrichtsraum der Fahrschule. Inhalte gem. Anlage 2.1 Fahrsch\u00fcler-Ausbildungsordnung.';
    var thLines = doc.splitTextToSize(thText, cw);
    doc.text(thLines, ml, y);
    y += thLines.length * 3.4 + 3;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Praktische Schulung', ml, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var prText = 'Einzelschulung, mind. 5 Unterrichtseinheiten zu je 90 Minuten. Inhalte gem. Anlage 3 Nr. 17.2 und Anlage 4 Nr. 1 und 2 Fahrsch\u00fcler-Ausbildungsordnung.';
    var prLines = doc.splitTextToSize(prText, cw);
    doc.text(prLines, ml, y);
    y += prLines.length * 3.4 + 3;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Abschluss der Schulung', ml, y); y += 4;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var absText = 'Die Fahrschule darf die Schulung erst dann abschlie\u00dfen und die Bescheinigung erst dann ausstellen, wenn der Teilnehmer w\u00e4hrend der fahrpraktischen \u00dcbungen seine F\u00e4higkeiten zum F\u00fchren von Kraftr\u00e4dern der Klasse A1 erfolgreich unter Beweis gestellt hat. Reichen die 5 Doppelstunden nicht aus, m\u00fcssen weitere \u00dcbungseinheiten durchgef\u00fchrt werden.';
    var absLines = doc.splitTextToSize(absText, cw);
    doc.text(absLines, ml, y);
    y += absLines.length * 3.4 + 5;

    // ── SEITE 2 ──
    doc.addPage();
    y = mt;

    // § Entgelte
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Entgelte', ml, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('F\u00fcr die Schulung werden inklusive der gesetzlichen Umsatzsteuer folgende Entgelte berechnet:', ml, y);
    y += 6;

    var pauschal = opts.leer ? '' : (opts.pauschalentgelt ? Number(opts.pauschalentgelt).toFixed(2).replace('.', ',') + ' \u20ac' : '');
    var zusatz = opts.leer ? '' : (opts.zusatzentgelt ? Number(opts.zusatzentgelt).toFixed(2).replace('.', ',') + ' \u20ac' : '');
    doc.setFontSize(9);
    doc.text('1. Pauschalentgelt f\u00fcr den Mindestumfang (4\u00d790 min Theorie + 5\u00d790 min Praxis):', ml, y);
    drawField('', pauschal, ml + cw - 50, y - 1, 50); y += 9;
    doc.text('2. Entgelt f\u00fcr zus\u00e4tzliche Fahrstunde 45 min, falls Mindestumfang nicht ausreicht:', ml, y);
    drawField('', zusatz, ml + cw - 50, y - 1, 50); y += 8;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('F\u00e4lligkeit der Zahlungen', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var faellig = 'Das Pauschalentgelt (Nr. 1) ist vor Beginn der Schulung f\u00e4llig. Das Entgelt f\u00fcr zus\u00e4tzlich erforderliche Fahrstunden (Nr. 2) ist vor deren Beginn f\u00e4llig.';
    var faelligLines = doc.splitTextToSize(faellig, cw);
    doc.text(faelligLines, ml, y);
    y += faelligLines.length * 4 + 4;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Dauer der Vereinbarung', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var dauerV = 'Die Vereinbarung endet mit Aush\u00e4ndigung der Teilnahmebescheinigung, sp\u00e4testens aber sechs Monate nach Abschluss dieser Vereinbarung.';
    var dauerVL = doc.splitTextToSize(dauerV, cw);
    doc.text(dauerVL, ml, y);
    y += dauerVL.length * 4 + 4;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Vertragsk\u00fcndigung', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var kuend = 'Eine K\u00fcndigung der Vereinbarung bedarf der Textform. Der/Die Teilnehmer/in ist jederzeit auch ohne Angabe von Gr\u00fcnden zur K\u00fcndigung berechtigt. Die Fahrschule darf die Vereinbarung nur aus wichtigem Grund k\u00fcndigen, insbesondere wenn der/die Teilnehmer/in wiederholt oder gr\u00f6blich gegen Weisungen oder Anordnungen des Fahrlehrers verst\u00f6\u00dft oder unentschuldigt an vereinbarten Terminen nicht erscheint.';
    var kuendL = doc.splitTextToSize(kuend, cw);
    doc.text(kuendL, ml, y);
    y += kuendL.length * 4 + 4;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Entgelte bei Vertragsk\u00fcndigung', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var kuendEnt = 'K\u00fcndigt die Fahrschule aus wichtigem Grund oder der/die Fahrsch\u00fcler/in ohne durch vertragswidriges Verhalten der Fahrschule veranlasst zu sein, stehen der Fahrschule folgende Anteile des Entgelts nach Nr. 1 zu: a) ein Drittel — K\u00fcndigung nach Vertragsabschluss, aber vor Beginn der Schulung; b) zwei Drittel — K\u00fcndigung nach Beginn der theoretischen Schulung; c) der volle Betrag — K\u00fcndigung nach Beginn des praktischen Teils. Dem/der Teilnehmer/in bleibt der Nachweis vorbehalten, dass ein Entgelt oder Schaden in der jeweiligen H\u00f6he nicht angefallen ist.';
    var kuendEntL = doc.splitTextToSize(kuendEnt, cw);
    doc.text(kuendEntL, ml, y);
    y += kuendEntL.length * 4 + 4;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Teilnahmebescheinigung', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var tnText = 'Nach Abschluss der Schulung h\u00e4ndigt die Fahrschule dem/der Bewerber/in die nach Nr. 5 und Nr. 6 der Anlage 7b zur FeV vorgeschriebene Teilnahmebescheinigung aus. Die Fahrschule ist zur Herausgabe der Teilnahmebescheinigung erst verpflichtet, wenn der/die Teilnehmer/in alle Entgelte bezahlt hat.';
    var tnTextL = doc.splitTextToSize(tnText, cw);
    doc.text(tnTextL, ml, y);
    y += tnTextL.length * 4 + 10;

    // Unterschriften
    var sigW = (cw - 8) / 2;
    drawLine(ml, y, ml + sigW, y);
    drawLine(ml + sigW + 8, y, ml + cw, y);
    doc.setFontSize(8);
    doc.text('Ort, Datum, Unterschrift Teilnehmer/in', ml, y + 4);
    doc.text('Ort, Datum, Stempel und Unterschrift Fahrschule', ml + sigW + 8, y + 4);

    // Footer auf jeder Seite
    var pageCount = doc.internal.getNumberOfPages();
    for (var p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120);
      doc.text('Muster — ohne rechtliche Gew\u00e4hrleistung · Anlage 7b FeV', pw / 2, ph - 8, { align: 'center' });
      doc.text('Seite ' + p + ' von ' + pageCount, pw - mr, ph - 8, { align: 'right' });
      doc.setTextColor(0);
    }

    var nameForFile = opts.leer ? 'Blanko' : (data.student.name || 'Sch\u00fcler').replace(/\s+/g, '_');
    doc.save('B196_Vertrag_' + nameForFile + '.pdf');
    this.showToast(t('pdfErstellt'));
  },

  renderB196BescheinigungPdf: function(data, opts) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210, ph = 297;
    var ml = 15, mr = 15, mt = 14;
    var cw = pw - ml - mr;

    var fmtDate = function(d) {
      if (!d) return '';
      var p = String(d).split('-');
      return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
    };
    var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2); };

    var y = mt;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('Dokumentation der Fahrerschulung', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text('nach Anlage 7b zu \u00a7 6b FeV (Schl\u00fcsselzahl 196)', pw / 2, y, { align: 'center' });
    y += 8;

    // Schüler-Kopfdaten (3 Spalten)
    var sp = cw / 3;
    // Convention: data.student.name is 'Vorname Nachname'
    // Nachname = letztes Wort, Vorname = alles davor
    var nameParts = (opts.leer ? '' : (data.student.name || '')).split(/\s+/).filter(Boolean);
    var nachname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : (nameParts[0] || '');
    var vorname  = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('Name', ml, y);
    doc.text('Vorname', ml + sp, y);
    doc.text('Ausstellungsdatum des F\u00fchrerscheins', ml + 2 * sp, y);
    y += 2;
    drawLine(ml, y, ml + cw, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(nachname || '', ml + 1, y + 5);
    doc.text(vorname || '', ml + sp + 1, y + 5);
    doc.text(opts.leer ? '' : fmtDate(opts.fsDatum || ''), ml + 2 * sp + 1, y + 5);
    y += 7;
    drawLine(ml + sp, mt + 13, ml + sp, y);
    drawLine(ml + 2 * sp, mt + 13, ml + 2 * sp, y);
    drawLine(ml, mt + 13, ml, y);
    drawLine(ml + cw, mt + 13, ml + cw, y);
    drawLine(ml, y, ml + cw, y);
    y += 1;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('Geburtsdatum', ml, y + 3);
    doc.text('Schulungsfahrzeug', ml + sp, y + 3);
    doc.text('Bemerkungen', ml + 2 * sp, y + 3);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(opts.leer ? '' : fmtDate(data.student.geburtsdatum || ''), ml + 1, y + 8);
    doc.text(opts.leer ? '' : (opts.fahrzeug || ''), ml + sp + 1, y + 8);
    doc.text(opts.leer ? '' : (opts.bemerkungen || ''), ml + 2 * sp + 1, y + 8);
    drawLine(ml, y + 10, ml + cw, y + 10);
    drawLine(ml + sp, y, ml + sp, y + 10);
    drawLine(ml + 2 * sp, y, ml + 2 * sp, y + 10);
    drawLine(ml, y, ml, y + 10);
    drawLine(ml + cw, y, ml + cw, y + 10);
    y += 14;

    // Theoretischer Stoff
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Theoretischer Schulungsstoff', ml, y); y += 5;

    var thHeaders = ['Inhalt', 'Datum', 'Bemerkungen'];
    var thColW = [cw * 0.55, cw * 0.20, cw * 0.25];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    var xc = ml;
    drawLine(ml, y, ml + cw, y);
    for (var ti = 0; ti < thHeaders.length; ti++) {
      doc.text(thHeaders[ti], xc + 1, y + 4);
      xc += thColW[ti];
    }
    y += 5;
    drawLine(ml, y, ml + cw, y);

    var thRows = [
      '1.  Fahrer/Beifahrer, Fahrzeug',
      '2.  Besonderes Verhalten beim Motorradfahren',
      '3.  Besondere Schwierigkeiten und Gefahren',
      '4.  Fahrtechnik und Fahrphysik'
    ];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    for (var ri = 0; ri < thRows.length; ri++) {
      doc.text(thRows[ri], ml + 1, y + 5);
      y += 7;
      drawLine(ml, y, ml + cw, y);
    }
    // Vertikale Linien
    var thTopY = y - 7 * thRows.length - 5;
    var thBotY = y;
    drawLine(ml, thTopY, ml, thBotY);
    drawLine(ml + thColW[0], thTopY, ml + thColW[0], thBotY);
    drawLine(ml + thColW[0] + thColW[1], thTopY, ml + thColW[0] + thColW[1], thBotY);
    drawLine(ml + cw, thTopY, ml + cw, thBotY);
    y += 6;

    // Praktischer Übungsstoff
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Praktischer \u00dcbungsstoff', ml, y); y += 5;

    var prColW = [cw * 0.42, cw * 0.18, cw * 0.22, cw * 0.18];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    drawLine(ml, y, ml + cw, y);
    doc.text('Ausbildungsinhalt', ml + 1, y + 4);
    doc.text('durchgef\u00fchrt am', ml + prColW[0] + 1, y + 4);
    doc.text('Bemerkungen', ml + prColW[0] + prColW[1] + 1, y + 4);
    doc.text('Unterschrift Bewerber', ml + prColW[0] + prColW[1] + prColW[2] + 1, y + 4);
    y += 5;
    drawLine(ml, y, ml + cw, y);

    var prRows = [
      'Einweisung und Gew\u00f6hnungs\u00fcbungen',
      'Fahren eines Slaloms mit Schrittgeschwindigkeit',
      'Abbremsen mit h\u00f6chstm\u00f6glicher Verz\u00f6gerung',
      'Ausweichen ohne Abbremsen',
      'Ausweichen nach Abbremsen',
      'Slalom',
      'Langer Slalom',
      'Fahren mit Schrittgeschwindigkeit geradeaus',
      'Stopp and Go',
      'Kreisfahrt',
      'Schulung auf Bundes- oder Landstra\u00dfe',
      'Schulung auf Autobahnen'
    ];
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var prTopY = y;
    for (var pi = 0; pi < prRows.length; pi++) {
      doc.text(prRows[pi], ml + 1, y + 5);
      y += 7;
      drawLine(ml, y, ml + cw, y);
    }
    var prBotY = y;
    drawLine(ml, prTopY, ml, prBotY);
    drawLine(ml + prColW[0], prTopY, ml + prColW[0], prBotY);
    drawLine(ml + prColW[0] + prColW[1], prTopY, ml + prColW[0] + prColW[1], prBotY);
    drawLine(ml + prColW[0] + prColW[1] + prColW[2], prTopY, ml + prColW[0] + prColW[1] + prColW[2], prBotY);
    drawLine(ml + cw, prTopY, ml + cw, prBotY);
    y += 5;

    // Bestätigung
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var bestText = 'Hiermit wird der erfolgreiche Abschluss der Schulung nach Anlage 7b Nr. 5 zu \u00a7 6b FeV best\u00e4tigt.';
    var bestL = doc.splitTextToSize(bestText, cw);
    doc.text(bestL, ml, y);
    y += bestL.length * 4 + 8;

    // Unterschriften (3 Spalten)
    var u3 = cw / 3;
    drawLine(ml, y, ml + u3 - 4, y);
    drawLine(ml + u3, y, ml + 2 * u3 - 4, y);
    drawLine(ml + 2 * u3, y, ml + cw, y);
    doc.setFontSize(8);
    doc.text('Ort, Datum', ml, y + 4);
    doc.text('Unterschrift des Fahrlehrers', ml + u3, y + 4);
    doc.text('Unterschrift des Bewerbers', ml + 2 * u3, y + 4);

    // Footer
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120);
    doc.text('Dokumentation nach Anlage 7b FeV (Schl\u00fcsselzahl 196)', pw / 2, ph - 8, { align: 'center' });
    doc.setTextColor(0);

    var nameForFile = opts.leer ? 'Blanko' : (data.student.name || 'Sch\u00fcler').replace(/\s+/g, '_');
    doc.save('B196_Bescheinigung_' + nameForFile + '.pdf');
    this.showToast(t('pdfErstellt'));
  },

  // ══════════════════════════════════════════
  //  Anlage 7 — Ausbildungsbescheinigung (FahrschAusbO)
  //  B197 — Schaltnachweis (§ 17a FeV)
  //  BF17 — Abschlussbescheinigung Begleitetes Fahren
  //  Kündigungs-/Abbruch-Bestätigung (§ 6 FahrschAusbO)
  // ══════════════════════════════════════════

  // ── Hilfsfunktion: Stunden aus Lessons aggregieren ──
  _aggregateLessonStats: function(data) {
    var stats = { theorieGesBasic: 0, theorieGesSpec: 0, praxisNormal: 0, praxisAutobahn: 0, praxisUeberland: 0, praxisNacht: 0, praxisGesamt: 0, schalt: 0, automatik: 0 };
    var thBasic = (data && data.theoryBasic) || [];
    var thSpec = (data && data.theorySpecific) || [];
    stats.theorieGesBasic = thBasic.length;
    stats.theorieGesSpec = thSpec.length;
    var pl = (data && data.practicalLessons) || [];
    for (var i = 0; i < pl.length; i++) {
      var l = pl[i];
      var d = Number(l.duration || 0);
      stats.praxisGesamt += d;
      var typ = String(l.type || '').toLowerCase();
      if (typ.indexOf('autobahn') >= 0) stats.praxisAutobahn += d;
      else if (typ.indexOf('ueber') >= 0 || typ.indexOf('über') >= 0 || typ.indexOf('land') >= 0) stats.praxisUeberland += d;
      else if (typ.indexOf('nacht') >= 0 || typ.indexOf('dunkel') >= 0) stats.praxisNacht += d;
      else stats.praxisNormal += d;
      // Schaltung: l.gearbox or l.transmission may exist; fallback by missing field
      var g = String((l.gearbox || l.transmission || '')).toLowerCase();
      if (g.indexOf('schalt') >= 0 || g === 'manual') stats.schalt += d;
      else if (g.indexOf('auto') >= 0) stats.automatik += d;
    }
    return stats;
  },

  // ══════════════════════════════════════════
  //  Anlage 7 — Ausbildungsbescheinigung
  // ══════════════════════════════════════════
  openAnlage7Dialog: function(studentId) {
    var self = this;
    var title = t('anlage7');
    var hinweis = t('anlage7Hinweis');
    var html = '<div style="padding:var(--space-2);max-width:560px;">' +
      '<p class="text-sm text-muted" style="margin-bottom:var(--space-3);">' + hinweis + '</p>' +
      '<div class="form-group"><label class="form-label"><input type="checkbox" id="anlage7-leer" style="margin-right:var(--space-2);"> ' + t('bescheinigungLeerDrucken') + '</label>' +
      '<div class="text-xs text-muted" style="margin-top:4px;">' + t('bescheinigungLeerHinweis') + '</div></div>' +
      '<div id="anlage7-fields">' +
        '<div class="form-group"><label class="form-label">' + t('pruefungsort') + '</label>' +
          '<input type="text" id="anlage7-pruefstelle" class="form-input" placeholder="z.B. TÜV NORD Berlin"></div>' +
        '<div class="form-group"><label class="form-label">' + t('bemerkungen') + '</label>' +
          '<input type="text" id="anlage7-bemerkungen" class="form-input" placeholder="optional"></div>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-secondary" onclick="App.closeModalForce()">' + t('abbrechen') + '</button>' +
        '<button class="btn btn-primary" onclick="App.generateAnlage7(\'' + studentId + '\')">' + t('pdfErstellen') + '</button>' +
      '</div>' +
    '</div>';
    self.openModal(title, html);
    setTimeout(function() {
      var leerCb = document.getElementById('anlage7-leer');
      var fields = document.getElementById('anlage7-fields');
      if (leerCb && fields) {
        leerCb.addEventListener('change', function() {
          fields.style.opacity = leerCb.checked ? '0.4' : '1';
          fields.style.pointerEvents = leerCb.checked ? 'none' : 'auto';
        });
      }
    }, 50);
  },

  generateAnlage7: async function(studentId) {
    var self = this;
    var leerCb = document.getElementById('anlage7-leer');
    var leer = !!(leerCb && leerCb.checked);
    var opts = { leer: leer };
    if (!leer) {
      opts.pruefstelle = (document.getElementById('anlage7-pruefstelle') || {}).value || '';
      opts.bemerkungen = (document.getElementById('anlage7-bemerkungen') || {}).value || '';
    }
    self.closeModalForce();
    self.showToast(t('pdfWirdErstellt'));
    try {
      var data = leer
        ? { student: { name:'', email:'', license_class:'', geburtsdatum:'', anschrift:'' }, school: { name:'', address:'', admin_name:'' }, theoryBasic: [], theorySpecific: [], practicalLessons: [], instructors: [] }
        : await ApiClient.get('/api/ausbildungsnachweis/' + studentId);
      if (!window.jspdf || !window.jspdf.jsPDF) {
        self.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
        return;
      }
      self.renderAnlage7Pdf(data, opts);
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  renderAnlage7Pdf: function(data, opts) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210, ph = 297;
    var ml = 18, mr = 18, mt = 14;
    var cw = pw - ml - mr;
    var self = this;

    var fmtDate = function(d) {
      if (!d) return '';
      var p = String(d).split('-');
      return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
    };
    var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2); };
    var drawField = function(label, value, x, y, w) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(value || '', x, y);
      drawLine(x, y + 1, x + w, y + 1);
      doc.setFontSize(7); doc.setTextColor(90);
      doc.text(label, x, y + 4);
      doc.setTextColor(0);
    };

    var studentAddr = self._splitAddress(opts.leer ? '' : (data.student.anschrift || ''));
    var schoolAddr = self._splitAddress(opts.leer ? '' : (data.school.address || ''));
    var stats = self._aggregateLessonStats(opts.leer ? null : data);

    var y = mt;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('Ausbildungsbescheinigung', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text('nach \u00a7 6 FahrlGDV i.V.m. Anlage 7 Fahrsch\u00fcler-Ausbildungsordnung', pw / 2, y, { align: 'center' });
    y += 8;

    // Header Hinweis
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var hdr = 'Diese Bescheinigung ist der zust\u00e4ndigen technischen Pr\u00fcfstelle vor Beginn der praktischen Pr\u00fcfung vorzulegen. Sie ist 2 Jahre ab Ausstellung g\u00fcltig.';
    var hdrL = doc.splitTextToSize(hdr, cw);
    doc.text(hdrL, ml, y);
    y += hdrL.length * 3.6 + 4;

    // Schüler-Daten
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('1. Bewerber/in', ml, y); y += 5;
    var nameParts = (opts.leer ? '' : (data.student.name || '')).split(/\s+/).filter(Boolean);
    var nachname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : (nameParts[0] || '');
    var vorname = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
    drawField('Name', nachname, ml, y, cw * 0.5);
    drawField('Vorname', vorname, ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Geburtsdatum', opts.leer ? '' : fmtDate(data.student.geburtsdatum || ''), ml, y, cw * 0.5);
    drawField('Klasse', opts.leer ? '' : (data.student.license_class || ''), ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Stra\u00dfe, Hausnummer', studentAddr.street, ml, y, cw); y += 9;
    drawField('PLZ, Ort', studentAddr.city, ml, y, cw); y += 10;

    // Fahrschule
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('2. Ausbildende Fahrschule', ml, y); y += 5;
    drawField('Fahrschule', opts.leer ? '' : (data.school.name || ''), ml, y, cw); y += 9;
    drawField('Inhaber/in', opts.leer ? '' : (data.school.admin_name || ''), ml, y, cw); y += 9;
    drawField('Stra\u00dfe, Hausnummer', schoolAddr.street, ml, y, cw); y += 9;
    drawField('PLZ, Ort', schoolAddr.city, ml, y, cw); y += 10;

    // Theorie-Block
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('3. Theoretischer Unterricht', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var thText = 'Der/Die Bewerber/in hat am theoretischen Unterricht nach Anlage 2 zur FahrschAusbO regelm\u00e4\u00dfig teilgenommen:';
    doc.text(doc.splitTextToSize(thText, cw), ml, y); y += 6;
    drawField('Grundstoff (12 Doppelstunden \u00e0 90 Min)',
      opts.leer ? '' : (stats.theorieGesBasic + ' von 12 absolviert'), ml, y, cw * 0.55);
    drawField('Zusatzstoff (klassenspezifisch)',
      opts.leer ? '' : (stats.theorieGesSpec + ' Doppelstunden absolviert'), ml + cw * 0.55, y, cw * 0.45);
    y += 11;

    // Praxis-Block
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('4. Praktischer Unterricht', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var prText = 'Der/Die Bewerber/in hat folgende praktische Ausbildung (in 45-Min-Einheiten) absolviert:';
    doc.text(doc.splitTextToSize(prText, cw), ml, y); y += 6;

    var cellW = cw / 2;
    drawField('Grundausbildung', opts.leer ? '' : (Math.round(stats.praxisNormal) + ' UE'), ml, y, cellW); 
    drawField('Sonderfahrten gesamt', opts.leer ? '' : (Math.round(stats.praxisAutobahn + stats.praxisUeberland + stats.praxisNacht) + ' UE'), ml + cellW, y, cellW); y += 9;
    drawField('davon \u00dcberlandfahrt (Soll: 5)', opts.leer ? '' : (Math.round(stats.praxisUeberland) + ' UE'), ml, y, cellW);
    drawField('davon Autobahn (Soll: 4)', opts.leer ? '' : (Math.round(stats.praxisAutobahn) + ' UE'), ml + cellW, y, cellW); y += 9;
    drawField('davon Nachtfahrt (Soll: 3)', opts.leer ? '' : (Math.round(stats.praxisNacht) + ' UE'), ml, y, cellW);
    drawField('Praxis gesamt', opts.leer ? '' : (Math.round(stats.praxisGesamt) + ' UE'), ml + cellW, y, cellW); y += 11;

    // Pflicht-Bestätigung
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('5. Best\u00e4tigung der Fahrschule', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var bestText = 'Die Fahrschule best\u00e4tigt hiermit, dass der/die Bewerber/in nach den Vorschriften der Fahrsch\u00fcler-Ausbildungsordnung (FahrschAusbO) ordnungsgem\u00e4\u00df ausgebildet wurde und nach Einsch\u00e4tzung des Fahrlehrers zur praktischen Pr\u00fcfung zugelassen werden kann.';
    var bestL = doc.splitTextToSize(bestText, cw);
    doc.text(bestL, ml, y); y += bestL.length * 4 + 4;

    if (opts.pruefstelle || opts.bemerkungen) {
      if (opts.pruefstelle) { drawField('Pr\u00fcfstelle', opts.pruefstelle, ml, y, cw); y += 9; }
      if (opts.bemerkungen) { drawField('Bemerkungen', opts.bemerkungen, ml, y, cw); y += 9; }
    }
    y += 6;

    // Unterschriften
    var sigW = (cw - 8) / 2;
    drawLine(ml, y, ml + sigW, y);
    drawLine(ml + sigW + 8, y, ml + cw, y);
    doc.setFontSize(8);
    doc.text('Ort, Datum', ml, y + 4);
    doc.text('Unterschrift, Stempel der Fahrschule', ml + sigW + 8, y + 4);

    // Footer
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120);
    doc.text('Muster \u2014 ohne rechtliche Gew\u00e4hrleistung \u00b7 Anlage 7 FahrschAusbO', pw / 2, ph - 8, { align: 'center' });
    doc.setTextColor(0);

    var nameForFile = opts.leer ? 'Blanko' : (data.student.name || 'Sch\u00fcler').replace(/\s+/g, '_');
    doc.save('Ausbildungsbescheinigung_Anlage7_' + nameForFile + '.pdf');
    this.showToast(t('pdfErstellt'));
  },

  // ══════════════════════════════════════════
  //  B197 — Schaltnachweis
  // ══════════════════════════════════════════
  openB197Dialog: function(studentId) {
    var self = this;
    var html = '<div style="padding:var(--space-2);max-width:560px;">' +
      '<p class="text-sm text-muted" style="margin-bottom:var(--space-3);">' + t('b197Hinweis') + '</p>' +
      '<div class="form-group"><label class="form-label"><input type="checkbox" id="b197-leer" style="margin-right:var(--space-2);"> ' + t('bescheinigungLeerDrucken') + '</label>' +
      '<div class="text-xs text-muted" style="margin-top:4px;">' + t('bescheinigungLeerHinweis') + '</div></div>' +
      '<div id="b197-fields">' +
        '<div class="form-group"><label class="form-label">' + t('b197Stunden') + '</label>' +
          '<input type="number" id="b197-stunden" class="form-input" placeholder="10" min="10" step="1"></div>' +
        '<div class="form-group"><label class="form-label">' + t('b197Fahrzeug') + '</label>' +
          '<input type="text" id="b197-fahrzeug" class="form-input" placeholder="z.B. VW Golf 1.5 TSI, 6-Gang"></div>' +
        '<div class="form-group"><label class="form-label">' + t('pruefungsdatum') + '</label>' +
          '<input type="date" id="b197-pruefdatum" class="form-input"></div>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-secondary" onclick="App.closeModalForce()">' + t('abbrechen') + '</button>' +
        '<button class="btn btn-primary" onclick="App.generateB197(\'' + studentId + '\')">' + t('pdfErstellen') + '</button>' +
      '</div>' +
    '</div>';
    self.openModal(t('b197'), html);
    setTimeout(function() {
      var leerCb = document.getElementById('b197-leer');
      var fields = document.getElementById('b197-fields');
      if (leerCb && fields) {
        leerCb.addEventListener('change', function() {
          fields.style.opacity = leerCb.checked ? '0.4' : '1';
          fields.style.pointerEvents = leerCb.checked ? 'none' : 'auto';
        });
      }
    }, 50);
  },

  generateB197: async function(studentId) {
    var self = this;
    var leerCb = document.getElementById('b197-leer');
    var leer = !!(leerCb && leerCb.checked);
    var opts = { leer: leer };
    if (!leer) {
      opts.stunden = (document.getElementById('b197-stunden') || {}).value || '';
      opts.fahrzeug = (document.getElementById('b197-fahrzeug') || {}).value || '';
      opts.pruefdatum = (document.getElementById('b197-pruefdatum') || {}).value || '';
    }
    self.closeModalForce();
    self.showToast(t('pdfWirdErstellt'));
    try {
      var data = leer
        ? { student: { name:'', email:'', license_class:'', geburtsdatum:'', anschrift:'' }, school: { name:'', address:'', admin_name:'' } }
        : await ApiClient.get('/api/ausbildungsnachweis/' + studentId);
      if (!window.jspdf || !window.jspdf.jsPDF) {
        self.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
        return;
      }
      self.renderB197Pdf(data, opts);
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  renderB197Pdf: function(data, opts) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210, ph = 297;
    var ml = 18, mr = 18, mt = 14;
    var cw = pw - ml - mr;
    var self = this;

    var fmtDate = function(d) {
      if (!d) return '';
      var p = String(d).split('-');
      return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
    };
    var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2); };
    var drawField = function(label, value, x, y, w) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(value || '', x, y);
      drawLine(x, y + 1, x + w, y + 1);
      doc.setFontSize(7); doc.setTextColor(90);
      doc.text(label, x, y + 4);
      doc.setTextColor(0);
    };

    var studentAddr = self._splitAddress(opts.leer ? '' : (data.student.anschrift || ''));
    var schoolAddr = self._splitAddress(opts.leer ? '' : (data.school.address || ''));

    var y = mt;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('Schaltnachweis (Schl\u00fcsselzahl B197)', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text('Bescheinigung \u00fcber Pr\u00fcfungsfahrten auf einem Schaltfahrzeug nach \u00a7 17a FeV', pw / 2, y, { align: 'center' });
    y += 8;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var hdr = 'Diese Bescheinigung ist zusammen mit dem Antrag auf Erteilung der Fahrerlaubnis Klasse B bei der F\u00fchrerscheinstelle einzureichen, um den B-Schein OHNE die einschr\u00e4nkende Schl\u00fcsselzahl 197 (Automatik) zu erhalten.';
    var hdrL = doc.splitTextToSize(hdr, cw);
    doc.text(hdrL, ml, y);
    y += hdrL.length * 3.6 + 4;

    // Schüler
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Bewerber/in', ml, y); y += 5;
    var nameParts = (opts.leer ? '' : (data.student.name || '')).split(/\s+/).filter(Boolean);
    var nachname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : (nameParts[0] || '');
    var vorname = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
    drawField('Name', nachname, ml, y, cw * 0.5);
    drawField('Vorname', vorname, ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Geburtsdatum', opts.leer ? '' : fmtDate(data.student.geburtsdatum || ''), ml, y, cw * 0.5);
    drawField('Klasse', 'B', ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Anschrift', studentAddr.street + (studentAddr.city ? ', ' + studentAddr.city : ''), ml, y, cw); y += 10;

    // Bestätigung
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Best\u00e4tigung', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var stundenAnz = opts.leer ? '__________' : (opts.stunden || '10');
    var bestText = 'Die unten genannte Fahrschule best\u00e4tigt, dass der/die Bewerber/in zus\u00e4tzlich zur Grundausbildung mindestens 10 Fahrstunden \u00e0 45 Minuten auf einem Schaltfahrzeug der Klasse B durchgef\u00fchrt hat (tats\u00e4chlich: ' + stundenAnz + ' Fahrstunden) und im Rahmen einer abschlie\u00dfenden 15-min\u00fctigen Testfahrt seine F\u00e4higkeiten zum sicheren Schalten und Anfahren unter Beweis gestellt hat.';
    var bestL = doc.splitTextToSize(bestText, cw);
    doc.text(bestL, ml, y);
    y += bestL.length * 4 + 4;

    drawField('Schaltfahrzeug (Marke/Typ)', opts.leer ? '' : (opts.fahrzeug || ''), ml, y, cw); y += 9;
    drawField('Datum der Testfahrt', opts.leer ? '' : fmtDate(opts.pruefdatum || ''), ml, y, cw * 0.5);
    drawField('Anzahl Schaltfahrstunden', opts.leer ? '' : (opts.stunden || ''), ml + cw * 0.5, y, cw * 0.5); y += 11;

    // Fahrschule
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Ausbildende Fahrschule', ml, y); y += 5;
    drawField('Fahrschule', opts.leer ? '' : (data.school.name || ''), ml, y, cw); y += 9;
    drawField('Inhaber/in', opts.leer ? '' : (data.school.admin_name || ''), ml, y, cw); y += 9;
    drawField('Anschrift', schoolAddr.street + (schoolAddr.city ? ', ' + schoolAddr.city : ''), ml, y, cw); y += 14;

    // Unterschriften
    var sigW = (cw - 8) / 2;
    drawLine(ml, y, ml + sigW, y);
    drawLine(ml + sigW + 8, y, ml + cw, y);
    doc.setFontSize(8);
    doc.text('Ort, Datum', ml, y + 4);
    doc.text('Unterschrift, Stempel der Fahrschule', ml + sigW + 8, y + 4);

    // Footer
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120);
    doc.text('Muster \u2014 ohne rechtliche Gew\u00e4hrleistung \u00b7 \u00a7 17a FeV (Schl\u00fcsselzahl B197)', pw / 2, ph - 8, { align: 'center' });
    doc.setTextColor(0);

    var nameForFile = opts.leer ? 'Blanko' : (data.student.name || 'Sch\u00fcler').replace(/\s+/g, '_');
    doc.save('B197_Schaltnachweis_' + nameForFile + '.pdf');
    this.showToast(t('pdfErstellt'));
  },

  // ══════════════════════════════════════════
  //  BF17 — Abschlussbescheinigung
  // ══════════════════════════════════════════
  openBF17Dialog: function(studentId) {
    var self = this;
    var html = '<div style="padding:var(--space-2);max-width:560px;">' +
      '<p class="text-sm text-muted" style="margin-bottom:var(--space-3);">' + t('bf17AbschlussHinweis') + '</p>' +
      '<div class="form-group"><label class="form-label"><input type="checkbox" id="bf17-leer" style="margin-right:var(--space-2);"> ' + t('bescheinigungLeerDrucken') + '</label>' +
      '<div class="text-xs text-muted" style="margin-top:4px;">' + t('bescheinigungLeerHinweis') + '</div></div>' +
      '<div id="bf17-fields">' +
        '<div class="form-group"><label class="form-label">' + t('bf17Pruefung') + '</label>' +
          '<input type="date" id="bf17-pruefdatum" class="form-input"></div>' +
        '<div class="form-group"><label class="form-label">' + t('bf17Begleiter') + '</label>' +
          '<input type="text" id="bf17-begleiter" class="form-input" placeholder="' + t('bf17BegleiterPlaceholder') + '"></div>' +
        '<div class="form-group"><label class="form-label">' + t('bemerkungen') + '</label>' +
          '<input type="text" id="bf17-bemerkungen" class="form-input" placeholder="optional"></div>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-secondary" onclick="App.closeModalForce()">' + t('abbrechen') + '</button>' +
        '<button class="btn btn-primary" onclick="App.generateBF17(\'' + studentId + '\')">' + t('pdfErstellen') + '</button>' +
      '</div>' +
    '</div>';
    self.openModal(t('bf17Abschluss'), html);
    setTimeout(function() {
      var leerCb = document.getElementById('bf17-leer');
      var fields = document.getElementById('bf17-fields');
      if (leerCb && fields) {
        leerCb.addEventListener('change', function() {
          fields.style.opacity = leerCb.checked ? '0.4' : '1';
          fields.style.pointerEvents = leerCb.checked ? 'none' : 'auto';
        });
      }
    }, 50);
  },

  generateBF17: async function(studentId) {
    var self = this;
    var leerCb = document.getElementById('bf17-leer');
    var leer = !!(leerCb && leerCb.checked);
    var opts = { leer: leer };
    if (!leer) {
      opts.pruefdatum = (document.getElementById('bf17-pruefdatum') || {}).value || '';
      opts.begleiter = (document.getElementById('bf17-begleiter') || {}).value || '';
      opts.bemerkungen = (document.getElementById('bf17-bemerkungen') || {}).value || '';
    }
    self.closeModalForce();
    self.showToast(t('pdfWirdErstellt'));
    try {
      var data = leer
        ? { student: { name:'', email:'', license_class:'', geburtsdatum:'', anschrift:'' }, school: { name:'', address:'', admin_name:'' } }
        : await ApiClient.get('/api/ausbildungsnachweis/' + studentId);
      if (!window.jspdf || !window.jspdf.jsPDF) {
        self.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
        return;
      }
      self.renderBF17Pdf(data, opts);
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  renderBF17Pdf: function(data, opts) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210, ph = 297;
    var ml = 18, mr = 18, mt = 14;
    var cw = pw - ml - mr;
    var self = this;

    var fmtDate = function(d) {
      if (!d) return '';
      var p = String(d).split('-');
      return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
    };
    var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2); };
    var drawField = function(label, value, x, y, w) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(value || '', x, y);
      drawLine(x, y + 1, x + w, y + 1);
      doc.setFontSize(7); doc.setTextColor(90);
      doc.text(label, x, y + 4);
      doc.setTextColor(0);
    };

    var studentAddr = self._splitAddress(opts.leer ? '' : (data.student.anschrift || ''));
    var schoolAddr = self._splitAddress(opts.leer ? '' : (data.school.address || ''));

    var y = mt;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('Abschlussbescheinigung BF17', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text('Begleitetes Fahren ab 17 \u2014 nach \u00a7 48a FeV', pw / 2, y, { align: 'center' });
    y += 8;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var hdr = 'Hiermit wird der erfolgreiche Abschluss der Fahrausbildung im Modell "Begleitetes Fahren ab 17" bescheinigt. Diese Bescheinigung dient als Nachweis gegen\u00fcber Beh\u00f6rden und Versicherungen.';
    var hdrL = doc.splitTextToSize(hdr, cw);
    doc.text(hdrL, ml, y);
    y += hdrL.length * 3.6 + 4;

    // Schüler
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('1. Fahrerlaubnisinhaber/in', ml, y); y += 5;
    var nameParts = (opts.leer ? '' : (data.student.name || '')).split(/\s+/).filter(Boolean);
    var nachname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : (nameParts[0] || '');
    var vorname = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
    drawField('Name', nachname, ml, y, cw * 0.5);
    drawField('Vorname', vorname, ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Geburtsdatum', opts.leer ? '' : fmtDate(data.student.geburtsdatum || ''), ml, y, cw * 0.5);
    drawField('Klasse', opts.leer ? '' : (data.student.license_class || 'B'), ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Anschrift', studentAddr.street + (studentAddr.city ? ', ' + studentAddr.city : ''), ml, y, cw); y += 10;

    // Prüfung & Begleitperson
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('2. Pr\u00fcfung & Begleitperson(en)', ml, y); y += 5;
    drawField('Datum der bestandenen praktischen Pr\u00fcfung', opts.leer ? '' : fmtDate(opts.pruefdatum || ''), ml, y, cw); y += 9;
    drawField('Eingetragene Begleitperson(en)', opts.leer ? '' : (opts.begleiter || ''), ml, y, cw); y += 10;

    // Bestätigung
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('3. Best\u00e4tigung', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    var bestText = 'Die ausbildende Fahrschule best\u00e4tigt, dass der/die o.g. Bewerber/in die gesamte Ausbildung nach der Fahrsch\u00fcler-Ausbildungsordnung erfolgreich abgeschlossen und die theoretische sowie praktische Pr\u00fcfung bestanden hat. Bis zur Vollendung des 18. Lebensjahres ist das Fahren nur in Begleitung der eingetragenen Begleitperson(en) gestattet (Pr\u00fcfungsbescheinigung gilt nur in Deutschland).';
    var bestL = doc.splitTextToSize(bestText, cw);
    doc.text(bestL, ml, y); y += bestL.length * 4 + 4;

    if (opts.bemerkungen) { drawField('Bemerkungen', opts.bemerkungen, ml, y, cw); y += 9; }
    y += 8;

    // Fahrschule
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('Ausbildende Fahrschule', ml, y); y += 5;
    drawField('Fahrschule', opts.leer ? '' : (data.school.name || ''), ml, y, cw); y += 9;
    drawField('Inhaber/in', opts.leer ? '' : (data.school.admin_name || ''), ml, y, cw); y += 9;
    drawField('Anschrift', schoolAddr.street + (schoolAddr.city ? ', ' + schoolAddr.city : ''), ml, y, cw); y += 14;

    // Unterschriften
    var sigW = (cw - 8) / 2;
    drawLine(ml, y, ml + sigW, y);
    drawLine(ml + sigW + 8, y, ml + cw, y);
    doc.setFontSize(8);
    doc.text('Ort, Datum', ml, y + 4);
    doc.text('Unterschrift, Stempel der Fahrschule', ml + sigW + 8, y + 4);

    // Footer
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120);
    doc.text('Muster \u2014 ohne rechtliche Gew\u00e4hrleistung \u00b7 BF17 nach \u00a7 48a FeV', pw / 2, ph - 8, { align: 'center' });
    doc.setTextColor(0);

    var nameForFile = opts.leer ? 'Blanko' : (data.student.name || 'Sch\u00fcler').replace(/\s+/g, '_');
    doc.save('BF17_Abschluss_' + nameForFile + '.pdf');
    this.showToast(t('pdfErstellt'));
  },

  // ══════════════════════════════════════════
  //  Kündigungs-/Abbruch-Bestätigung
  // ══════════════════════════════════════════
  openKuendigungDialog: function(studentId) {
    var self = this;
    var today = new Date();
    var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    var html = '<div style="padding:var(--space-2);max-width:560px;">' +
      '<p class="text-sm text-muted" style="margin-bottom:var(--space-3);">' + t('kuendigungHinweis') + '</p>' +
      '<div class="form-group"><label class="form-label"><input type="checkbox" id="kuend-leer" style="margin-right:var(--space-2);"> ' + t('bescheinigungLeerDrucken') + '</label>' +
      '<div class="text-xs text-muted" style="margin-top:4px;">' + t('bescheinigungLeerHinweis') + '</div></div>' +
      '<div id="kuend-fields">' +
        '<div class="form-group"><label class="form-label">' + t('kuendigungDatum') + '</label>' +
          '<input type="date" id="kuend-datum" class="form-input" value="' + todayStr + '"></div>' +
        '<div class="form-group"><label class="form-label">' + t('kuendigungGrund') + '</label>' +
          '<input type="text" id="kuend-grund" class="form-input" placeholder="' + t('kuendigungGrundPlaceholder') + '"></div>' +
      '</div>' +
      '<div style="display:flex;gap:var(--space-2);justify-content:flex-end;margin-top:var(--space-3);">' +
        '<button class="btn btn-secondary" onclick="App.closeModalForce()">' + t('abbrechen') + '</button>' +
        '<button class="btn btn-primary" onclick="App.generateKuendigung(\'' + studentId + '\')">' + t('pdfErstellen') + '</button>' +
      '</div>' +
    '</div>';
    self.openModal(t('kuendigung'), html);
    setTimeout(function() {
      var leerCb = document.getElementById('kuend-leer');
      var fields = document.getElementById('kuend-fields');
      if (leerCb && fields) {
        leerCb.addEventListener('change', function() {
          fields.style.opacity = leerCb.checked ? '0.4' : '1';
          fields.style.pointerEvents = leerCb.checked ? 'none' : 'auto';
        });
      }
    }, 50);
  },

  generateKuendigung: async function(studentId) {
    var self = this;
    var leerCb = document.getElementById('kuend-leer');
    var leer = !!(leerCb && leerCb.checked);
    var opts = { leer: leer };
    if (!leer) {
      opts.datum = (document.getElementById('kuend-datum') || {}).value || '';
      opts.grund = (document.getElementById('kuend-grund') || {}).value || '';
    }
    self.closeModalForce();
    self.showToast(t('pdfWirdErstellt'));
    try {
      var data = leer
        ? { student: { name:'', email:'', license_class:'', geburtsdatum:'', anschrift:'' }, school: { name:'', address:'', admin_name:'' }, theoryBasic: [], theorySpecific: [], practicalLessons: [], instructors: [] }
        : await ApiClient.get('/api/ausbildungsnachweis/' + studentId);
      if (!window.jspdf || !window.jspdf.jsPDF) {
        self.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
        return;
      }
      self.renderKuendigungPdf(data, opts);
    } catch (err) {
      self.showToast(t('fehler') + ': ' + (err.message || err));
    }
  },

  renderKuendigungPdf: function(data, opts) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pw = 210, ph = 297;
    var ml = 18, mr = 18, mt = 14;
    var cw = pw - ml - mr;
    var self = this;

    var fmtDate = function(d) {
      if (!d) return '';
      var p = String(d).split('-');
      return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : d;
    };
    var drawLine = function(x1, y1, x2, y2) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(x1, y1, x2, y2); };
    var drawField = function(label, value, x, y, w) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text(value || '', x, y);
      drawLine(x, y + 1, x + w, y + 1);
      doc.setFontSize(7); doc.setTextColor(90);
      doc.text(label, x, y + 4);
      doc.setTextColor(0);
    };

    var studentAddr = self._splitAddress(opts.leer ? '' : (data.student.anschrift || ''));
    var schoolAddr = self._splitAddress(opts.leer ? '' : (data.school.address || ''));
    var stats = self._aggregateLessonStats(opts.leer ? null : data);

    var y = mt;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('Best\u00e4tigung \u00fcber Ausbildungsabbruch', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text('nach \u00a7 6 FahrlGDV / FahrschAusbO', pw / 2, y, { align: 'center' });
    y += 8;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var hdr = 'Bescheinigung \u00fcber die in dieser Fahrschule durchlaufenen Ausbildungsteile. Sie dient dem/der Sch\u00fcler/in zur Anrechnung der bereits absolvierten Stunden bei einem Fahrschulwechsel oder Wiedereinstieg.';
    var hdrL = doc.splitTextToSize(hdr, cw);
    doc.text(hdrL, ml, y);
    y += hdrL.length * 3.6 + 4;

    // Schüler
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('1. Sch\u00fcler/in', ml, y); y += 5;
    var nameParts = (opts.leer ? '' : (data.student.name || '')).split(/\s+/).filter(Boolean);
    var nachname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : (nameParts[0] || '');
    var vorname = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
    drawField('Name', nachname, ml, y, cw * 0.5);
    drawField('Vorname', vorname, ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Geburtsdatum', opts.leer ? '' : fmtDate(data.student.geburtsdatum || ''), ml, y, cw * 0.5);
    drawField('Klasse', opts.leer ? '' : (data.student.license_class || ''), ml + cw * 0.5, y, cw * 0.5); y += 9;
    drawField('Anschrift', studentAddr.street + (studentAddr.city ? ', ' + studentAddr.city : ''), ml, y, cw); y += 10;

    // Beendigung
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('2. Beendigung der Ausbildung', ml, y); y += 5;
    drawField('Datum der Beendigung', opts.leer ? '' : fmtDate(opts.datum || ''), ml, y, cw * 0.5);
    drawField('Grund (optional)', opts.leer ? '' : (opts.grund || ''), ml + cw * 0.5, y, cw * 0.5); y += 10;

    // Absolvierte Teile
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('3. Absolvierte Ausbildungsteile', ml, y); y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('Bis zum o.g. Beendigungsdatum wurden folgende Ausbildungsteile durchlaufen:', ml, y); y += 6;

    var cellW = cw / 2;
    drawField('Theoretischer Grundstoff (Doppelstunden)', opts.leer ? '' : String(stats.theorieGesBasic), ml, y, cellW);
    drawField('Klassenspezifischer Stoff (Doppelstunden)', opts.leer ? '' : String(stats.theorieGesSpec), ml + cellW, y, cellW); y += 9;
    drawField('Grundausbildung (UE \u00e0 45 Min)', opts.leer ? '' : String(Math.round(stats.praxisNormal)), ml, y, cellW);
    drawField('Sonderfahrten gesamt (UE)', opts.leer ? '' : String(Math.round(stats.praxisAutobahn + stats.praxisUeberland + stats.praxisNacht)), ml + cellW, y, cellW); y += 9;
    drawField('davon \u00dcberlandfahrt', opts.leer ? '' : String(Math.round(stats.praxisUeberland)), ml, y, cellW * 0.5);
    drawField('davon Autobahn', opts.leer ? '' : String(Math.round(stats.praxisAutobahn)), ml + cellW * 0.5, y, cellW * 0.5);
    drawField('davon Nachtfahrt', opts.leer ? '' : String(Math.round(stats.praxisNacht)), ml + cellW, y, cellW * 0.5);
    drawField('Praxis gesamt (UE)', opts.leer ? '' : String(Math.round(stats.praxisGesamt)), ml + cellW * 1.5, y, cellW * 0.5); y += 11;

    // Hinweis
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var hinw = 'Diese Bescheinigung erm\u00f6glicht der \u00fcbernehmenden Fahrschule, die o.g. Ausbildungsteile gem. \u00a7 5 Abs. 1 FahrschAusbO anzurechnen. Eine \u00dcbergabe der vollst\u00e4ndigen Ausbildungsunterlagen (Anlage 3 / Ausbildungsnachweis) erfolgt nach Begleichung offener Forderungen.';
    var hinwL = doc.splitTextToSize(hinw, cw);
    doc.text(hinwL, ml, y);
    y += hinwL.length * 3.6 + 8;

    // Fahrschule
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    doc.text('4. Ausstellende Fahrschule', ml, y); y += 5;
    drawField('Fahrschule', opts.leer ? '' : (data.school.name || ''), ml, y, cw); y += 9;
    drawField('Inhaber/in', opts.leer ? '' : (data.school.admin_name || ''), ml, y, cw); y += 9;
    drawField('Anschrift', schoolAddr.street + (schoolAddr.city ? ', ' + schoolAddr.city : ''), ml, y, cw); y += 14;

    // Unterschriften
    var sigW = (cw - 8) / 2;
    drawLine(ml, y, ml + sigW, y);
    drawLine(ml + sigW + 8, y, ml + cw, y);
    doc.setFontSize(8);
    doc.text('Ort, Datum', ml, y + 4);
    doc.text('Unterschrift, Stempel der Fahrschule', ml + sigW + 8, y + 4);

    // Footer
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(120);
    doc.text('Muster \u2014 ohne rechtliche Gew\u00e4hrleistung \u00b7 \u00a7 6 FahrschAusbO', pw / 2, ph - 8, { align: 'center' });
    doc.setTextColor(0);

    var nameForFile = opts.leer ? 'Blanko' : (data.student.name || 'Sch\u00fcler').replace(/\s+/g, '_');
    doc.save('Abbruch_Bestaetigung_' + nameForFile + '.pdf');
    this.showToast(t('pdfErstellt'));
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
      // Briefing-Card unter Schueler-Dropdown bei Auswahl einblenden
      var briefingBox = document.getElementById('lesson-setup-briefing');
      var self = this;
      sel.onchange = function() {
        var v = sel.value;
        if (!briefingBox) return;
        if (!v || v === '__probe__') { briefingBox.style.display = 'none'; briefingBox.innerHTML = ''; return; }
        var name = (sel.selectedOptions[0] && sel.selectedOptions[0].textContent.split(' (')[0]) || '';
        briefingBox.innerHTML = self._renderSetupBriefingCard(v, name);
        briefingBox.style.display = 'block';
      };
    } catch (e) {}
  },

  _renderSetupBriefingCard: function(studentId, studentName) {
    var safeName = String(studentName || '').replace(/</g, '&lt;');
    return '<div class="setup-briefing-card" id="setup-briefing-card">' +
        '<div class="setup-briefing-head">' +
          '<div class="setup-briefing-icon" aria-hidden="true">\u2728</div>' +
          '<div class="setup-briefing-textcol">' +
            '<div class="setup-briefing-title">KI-Briefing f\u00fcr ' + safeName + '</div>' +
            '<div class="setup-briefing-sub">Zusammenfassung der letzten Stunden, Empfehlung f\u00fcr heute.</div>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="btn btn-secondary btn-full setup-briefing-btn" id="setup-briefing-btn" onclick="App.generateSetupBriefing(\'' + studentId + '\')">' +
          'Briefing erstellen' +
        '</button>' +
        '<div class="setup-briefing-output" id="setup-briefing-output" style="display:none;"></div>' +
      '</div>';
  },

  generateSetupBriefing: async function(studentId) {
    var btn = document.getElementById('setup-briefing-btn');
    var out = document.getElementById('setup-briefing-output');
    if (!btn || !out) return;
    var oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;display:inline-block;vertical-align:middle;margin-right:8px;"></span>KI denkt nach\u2026';
    out.style.display = 'none';
    out.innerHTML = '';
    try {
      var result = await ApiClient.post('/api/ai/briefing/' + studentId, {});
      var briefingHtml = (result.briefing || '').replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      out.innerHTML = '<div class="setup-briefing-result">' + briefingHtml +
        '<div class="setup-briefing-meta">Basierend auf ' + (result.lesson_count || 0) + ' Fahrstunden \u00b7 Google Gemini</div>' +
      '</div>';
      out.style.display = 'block';
      // Button auf "Neu generieren" umstellen
      btn.innerHTML = '\u21bb Neu generieren';
    } catch (err) {
      var msg = err && err.message ? err.message : String(err);
      out.innerHTML = '<div class="setup-briefing-error">' + msg + '</div>';
      out.style.display = 'block';
      btn.innerHTML = oldHtml;
    } finally {
      btn.disabled = false;
    }
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
    if (pauseBtn) {
      pauseBtn.classList.remove('is-resume');
      pauseBtn.innerHTML = '<span class="lesson-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg></span><span class="lesson-action-label">' + t('pause') + '</span>';
    }
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
      if (btn) {
        btn.classList.add('is-resume');
        btn.innerHTML = '<span class="lesson-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7L8 5z"/></svg></span><span class="lesson-action-label">' + t('fortsetzen') + '</span>';
      }
      var overlay = document.getElementById('lesson-paused-overlay');
      if (overlay) overlay.classList.add('visible');
    } else {
      AppState.lessonPaused = false;
      AppState.pausedDuration += Date.now() - AppState.pauseStartTime;
      AppState.pauseStartTime = null;
      this.startGPS();
      var btn = document.getElementById('lesson-pause-btn');
      if (btn) {
        btn.classList.remove('is-resume');
        btn.innerHTML = '<span class="lesson-action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg></span><span class="lesson-action-label">' + t('pause') + '</span>';
      }
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
    AppState.summaryRatingNotes = {};
    // PFEP-konform: Standardwert 0 = 'nicht bewertet'. Der Fahrlehrer setzt aktiv
    // nur die Items, die in dieser Fahrstunde tatsaechlich beobachtet wurden.
    skillTasksFor(AppState.activeLesson && AppState.activeLesson.licenseClass).forEach(function(t) { AppState.summaryRatings[t] = 0; });
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

    // ── PFEP-Bewertungs-Surface (Pruefer-Optik) ──
    var groups = evaluationGroupsFor(lesson && lesson.licenseClass);
    var totalItems = 0;
    groups.forEach(function(g){ totalItems += g.items.length; });
    var ratedCount = 0;
    groups.forEach(function(g) {
      g.items.forEach(function(task) {
        var v = AppState.summaryRatings[task];
        if (typeof v === 'number' && v >= 1 && v <= 4) ratedCount++;
      });
    });
    var pctTotal = totalItems > 0 ? Math.round((ratedCount / totalItems) * 100) : 0;

    html += '<div class="section-title mb-2">' + t('bewertung') + '</div>';
    html += '<div class="pfep-intro">' +
      '<div class="pfep-intro-icon">\u{1F4CB}</div>' +
      '<div class="pfep-intro-text"><strong>Wie ein TÜV-Prüfer bewerten.</strong> ' +
      'Tippe pro Aufgabe auf eine Note. Nicht bewertete Items flie\u00dfen nicht in den Schnitt ein.</div>' +
    '</div>';
    html += '<div class="pfep-progress" id="pfep-progress">' +
      '<span class="pfep-progress-label">Gesamt</span>' +
      '<div class="pfep-progress-bar"><div class="pfep-progress-fill" id="pfep-progress-fill" style="width:' + pctTotal + '%;"></div></div>' +
      '<span class="pfep-progress-count" id="pfep-progress-count">' + ratedCount + ' / ' + totalItems + '</span>' +
    '</div>';

    groups.forEach(function(grp) {
      var meta = _pfepGroupMeta(grp.group);
      var groupRated = 0;
      grp.items.forEach(function(task) {
        var v = AppState.summaryRatings[task];
        if (typeof v === 'number' && v >= 1 && v <= 4) groupRated++;
      });
      var statusComplete = groupRated === grp.items.length ? ' complete' : '';
      html += '<div class="pfep-group" data-group="' + meta.cls + '">' +
        '<div class="pfep-group-head">' +
          '<div class="pfep-group-title"><span class="pfep-group-icon ' + meta.cls + '">' + meta.icon + '</span>' + grp.group + '</div>' +
          '<div class="pfep-group-status' + statusComplete + '" data-group-status="' + meta.cls + '">' + groupRated + ' / ' + grp.items.length + ' bewertet</div>' +
        '</div>' +
        '<div class="pfep-group-body">';
      grp.items.forEach(function(task) {
        var current = AppState.summaryRatings[task] || 0;
        var ratedCls = (current >= 1 && current <= 4) ? ' rated-' + current : '';
        var currentNote = AppState.summaryRatingNotes[task] || '';
        html += '<div class="pfep-item' + ratedCls + '" data-task-slug="' + _slugifyTask(task) + '" data-group="' + meta.cls + '">' +
          '<div class="pfep-item-header">' +
            '<span class="pfep-item-label">' + tSkill(task) + '</span>' +
            '<button type="button" class="pfep-item-clear" title="Bewertung entfernen" onclick="App.clearSkillRating(\'' + task + '\')">\u00d7 entfernen</button>' +
          '</div>' +
          '<div class="level-selector" data-task="' + task + '">';
        SKILL_LEVELS.forEach(function(sl) {
          var isActive = sl.level === current ? ' active' : '';
          html += '<button type="button" class="level-selector-btn' + isActive + '" data-level="' + sl.level + '" onclick="App.setSkillRating(\'' + task + '\', ' + sl.level + ', this)">' + tLevel(sl.name) + '</button>';
        });
        html += '</div>';
        html += _renderItemNoteHtml(task, currentNote, 'live');
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '<div class="form-group mb-4"><label class="form-label">' + t('notizen') + '</label>' +
      '<textarea class="form-textarea" id="lesson-notes" placeholder="' + t('anmerkungenPlaceholder') + '"></textarea>' +
      '<div class="text-xs text-muted" style="margin-top:4px;">\u{1F517} Tipp: Links (z.B. YouTube-Videos) k\u00f6nnen einfach reinkopiert werden \u2013 sie werden f\u00fcr den Sch\u00fcler klickbar.</div></div>';

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
    // Item-State + Group-Status + Total-Progress aktualisieren
    var item = container.closest('.pfep-item');
    if (item) {
      item.classList.remove('rated-1','rated-2','rated-3','rated-4');
      if (level >= 1 && level <= 4) item.classList.add('rated-' + level);
    }
    this._recomputeRatingProgress();
  },

  clearSkillRating: function(task) {
    delete AppState.summaryRatings[task];
    var summary = document.getElementById('lesson-summary-content');
    if (!summary) return;
    var slug = _slugifyTask(task);
    var item = summary.querySelector('.pfep-item[data-task-slug="' + slug + '"]');
    if (item) {
      item.classList.remove('rated-1','rated-2','rated-3','rated-4');
      item.querySelectorAll('.level-selector-btn').forEach(function(b) { b.classList.remove('active'); });
    }
    this._recomputeRatingProgress();
  },

  _recomputeRatingProgress: function() {
    var lesson = AppState.activeLesson;
    if (!lesson) return;
    var summary = document.getElementById('lesson-summary-content');
    if (!summary) return;
    var groups = evaluationGroupsFor(lesson && lesson.licenseClass);
    var total = 0, rated = 0;
    groups.forEach(function(grp) {
      var meta = _pfepGroupMeta(grp.group);
      var gTotal = grp.items.length;
      var gRated = 0;
      grp.items.forEach(function(task) {
        var v = AppState.summaryRatings[task];
        if (typeof v === 'number' && v >= 1 && v <= 4) gRated++;
      });
      total += gTotal; rated += gRated;
      var st = summary.querySelector('[data-group-status="' + meta.cls + '"]');
      if (st) {
        st.textContent = gRated + ' / ' + gTotal + ' bewertet';
        if (gRated === gTotal) st.classList.add('complete'); else st.classList.remove('complete');
      }
    });
    var fill = summary.querySelector('#pfep-progress-fill');
    var count = summary.querySelector('#pfep-progress-count');
    var pct = total > 0 ? Math.round((rated / total) * 100) : 0;
    if (fill) fill.style.width = pct + '%';
    if (count) count.textContent = rated + ' / ' + total;
  },

  // ── Notiz pro Bewertung: Live-Maske ──
  openItemNote: function(task) {
    var wrap = document.getElementById('note-' + _slugifyTask(task));
    if (!wrap) return;
    var current = AppState.summaryRatingNotes[task] || '';
    wrap.innerHTML = '<div class="pfep-note-editor">' +
      '<textarea maxlength="1000" placeholder="Notiz zu dieser Bewertung\u2026">' + _escapeAttr(current) + '</textarea>' +
      '<div class="pfep-note-editor-actions">' +
        '<button type="button" class="pfep-note-btn" onclick="App.cancelItemNote(\'' + task + '\')">Abbrechen</button>' +
        '<button type="button" class="pfep-note-btn primary" onclick="App.saveItemNote(\'' + task + '\')">Speichern</button>' +
      '</div></div>';
    var ta = wrap.querySelector('textarea');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  },
  saveItemNote: function(task) {
    var wrap = document.getElementById('note-' + _slugifyTask(task));
    if (!wrap) return;
    var ta = wrap.querySelector('textarea');
    var val = ta ? ta.value.trim() : '';
    if (val) AppState.summaryRatingNotes[task] = val;
    else delete AppState.summaryRatingNotes[task];
    wrap.outerHTML = _renderItemNoteHtml(task, val, 'live');
  },
  cancelItemNote: function(task) {
    var wrap = document.getElementById('note-' + _slugifyTask(task));
    if (!wrap) return;
    var existing = AppState.summaryRatingNotes[task] || '';
    wrap.outerHTML = _renderItemNoteHtml(task, existing, 'live');
  },

  saveLessonSummary: async function() {
    var lesson = AppState.activeLesson;
    if (!lesson) return;
    var notes = document.getElementById('lesson-notes') ? document.getElementById('lesson-notes').value : '';
    try {
      this.showLoading(true);
      var _savedStudentId = lesson.studentId;
      var resp = await ApiClient.post('/api/lessons', {
        studentId: lesson.studentId, type: lesson.type, duration: lesson.duration,
        notes: notes, ratings: _filterValidRatings(AppState.summaryRatings),
        ratingNotes: AppState.summaryRatingNotes || {},
        licenseClass: lesson.licenseClass,
        images: AppState.pendingImages,
        routeData: lesson.routeData || [],
        markers: lesson.markers || [],
        distanceKm: lesson.distanceKm || 0,
        avgSpeedKmh: lesson.avgSpeedKmh || 0
      });
      AppState.activeLesson = null; AppState.summaryRatings = {}; AppState.summaryRatingNotes = {}; AppState.pendingImages = [];
      // Caches invalidieren, damit Dashboard frisch geladen wird
      AppState._cachedData.instructorDash = null;
      AppState._cachedData.instructorStudents = null;
      if (AppState._cachedData._scheduleBundle) AppState._cachedData._scheduleBundle = {};
      this.showToast(t('fahrstundeGespeichert'));
      // Zurueck zum Wochenplan-Dashboard
      this.navigate('instructor-dashboard');
      this.switchInstructorTab('dashboard');
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

      // Verrechnungs-Block entfernt (Push 8): GoBD-konform sind alle Fahrstunden regulär.
      // Rabatte/Korrekturen erfolgen über separate Buchungen in der Buchhaltung.

      // Bewertungs-Status berechnen für Nachtragshinweis (nur instructor)
      var _ratedCount = 0, _totalCount = 0;
      evaluationGroupsWithLegacy(lesson && (lesson.license_class || lesson.licenseClass), lesson.ratings).forEach(function(grp) {
        grp.items.forEach(function(task) {
          _totalCount++;
          var v = lesson.ratings && lesson.ratings[task];
          if (typeof v === 'number' && v >= 1 && v <= 4) _ratedCount++;
        });
      });
      var _isFullyUnrated = (_ratedCount === 0 && _totalCount > 0);
      var _isPartial = (_ratedCount > 0 && _ratedCount < _totalCount);

      // Prominenter Nachtrags-CTA wenn instructor + unbewertet/teilbewertet
      if (fromRole === 'instructor' && (_isFullyUnrated || _isPartial)) {
        var _ctaTitle = _isFullyUnrated ? 'Noch nicht bewertet' : 'Bewertung unvollständig';
        var _ctaSub = _isFullyUnrated
          ? 'Diese Fahrstunde wurde noch nicht bewertet. Du kannst die Bewertung jetzt nachtragen.'
          : 'Du hast erst ' + _ratedCount + ' von ' + _totalCount + ' Aufgaben bewertet. Jetzt vervollständigen?';
        var _ctaBtn = _isFullyUnrated ? '📝 Jetzt nachträglich bewerten' : '✏️ Bewertung vervollständigen';
        html += '<div class="card mb-4" style="background:linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)), color-mix(in srgb, var(--color-primary) 3%, var(--color-surface)));border:1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);">' +
          '<div style="display:flex;align-items:flex-start;gap:var(--space-3);margin-bottom:var(--space-3);">' +
            '<div style="flex-shrink:0;width:40px;height:40px;border-radius:var(--radius-md);background:color-mix(in srgb, var(--color-primary) 15%, transparent);display:flex;align-items:center;justify-content:center;">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="width:22px;height:22px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-weight:600;color:var(--color-primary);margin-bottom:2px;">' + _ctaTitle + '</div>' +
              '<div class="text-xs text-muted" style="line-height:1.4;">' + _ctaSub + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-primary" style="width:100%;" onclick="App.editLesson(\'' + lessonId + '\', \'' + studentId + '\')">' + _ctaBtn + '</button>' +
        '</div>';
      }

      html += '<div class="card mb-4"><div class="section-title mb-3">' + t('bewertung') + '</div>';
      evaluationGroupsWithLegacy(lesson && (lesson.license_class || lesson.licenseClass), lesson.ratings).forEach(function(grp) {
        html += _groupHeaderHtml(grp.group);
        grp.items.forEach(function(task) {
          var rawVal = lesson.ratings && lesson.ratings[task];
          var hasRating = typeof rawVal === 'number' && rawVal >= 1 && rawVal <= 4;
          if (!hasRating) {
            // Instructor: klickbar zum direkten Nachtragen
            var _editAttr = (fromRole === 'instructor')
              ? ' style="cursor:pointer;" onclick="App.editLesson(\'' + lessonId + '\', \'' + studentId + '\')" title="Klicken zum Bewerten"'
              : '';
            var _hintSpan = (fromRole === 'instructor')
              ? '<span class="text-xs" style="font-size:10px;color:var(--color-primary);font-style:italic;">tippen zum bewerten →</span>'
              : '<span class="text-xs" style="font-size:10px;color:var(--text-muted);font-style:italic;">nicht bewertet</span>';
            html += '<div class="skill-bar"' + _editAttr + '><div class="skill-bar-header"><span style="color:var(--text-muted);">' + tSkill(task) + '</span>' + _hintSpan + '</div>' +
              '<div class="skill-bar-track unrated"></div></div>';
          } else {
            var val = rawVal; var info = getSkillLevel(val); var pct = (val / 4) * 100;
            var note = lesson.ratingNotes && lesson.ratingNotes[task];
            var noteHtml = '';
            if (note && String(note).trim()) {
              noteHtml = '<div class="pfep-note pfep-note-readonly"><div class="pfep-note-bubble" title="Notiz">' + App._escapeHtml(note) + '</div></div>';
            }
            html += '<div class="skill-bar"><div class="skill-bar-header"><span><span class="skill-bar-dot" style="background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></span>' + tSkill(task) + '</span><span class="badge ' + info.badgeClass + '" style="font-size:10px;">' + tLevel(info.name) + '</span></div>' +
              '<div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + pct + '%;background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></div></div>' + noteHtml + '</div>';
          }
        });
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
        html += '<p class="text-sm" id="lesson-notes-text" data-original="' + this._escapeHtml(lesson.notes) + '" style="white-space:pre-wrap;">' + this._linkifyText(lesson.notes) + '</p></div>';
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
      // Show original (with clickable links restored)
      notesEl.innerHTML = this._linkifyText(originalText);
      notesEl.setAttribute('data-translated', 'false');
      btn.innerHTML = '\ud83c\udf10 ' + t('notizenUebersetzen');
      return;
    }
    // Translate
    btn.innerHTML = '\u23f3 ' + t('wirdUebersetzt');
    btn.disabled = true;
    try {
      var translated = await TranslateHelper.translate(originalText, AppState.language);
      notesEl.innerHTML = this._linkifyText(translated);
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
      AppState._editRatingNotes = Object.assign({}, lesson.ratingNotes || {});
      var html = '<form id="edit-lesson-form" onsubmit="App.saveEditedLesson(event, \'' + lessonId + '\', \'' + studentId + '\')">' +
        '<div class="form-group mb-4"><label class="form-label">' + t('fahrstundentyp') + '</label><select class="form-select" id="edit-lesson-type">' +
          '<option value="Übungsfahrt"' + (lesson.type === 'Übungsfahrt' ? ' selected' : '') + '>' + tType('Übungsfahrt') + '</option>' +
          '<option value="Überlandfahrt"' + (lesson.type === 'Überlandfahrt' ? ' selected' : '') + '>' + tType('Überlandfahrt') + '</option>' +
          '<option value="Autobahnfahrt"' + (lesson.type === 'Autobahnfahrt' ? ' selected' : '') + '>' + tType('Autobahnfahrt') + '</option>' +
          '<option value="Nachtfahrt"' + (lesson.type === 'Nachtfahrt' ? ' selected' : '') + '>' + tType('Nachtfahrt') + '</option>' +
          '<option value="Prüfungsvorbereitung"' + (lesson.type === 'Prüfungsvorbereitung' ? ' selected' : '') + '>' + tType('Prüfungsvorbereitung') + '</option>' +
        '</select></div>' +
        '<div class="form-group mb-4"><label class="form-label">' + t('notizen') + '</label>' +
          '<textarea class="form-textarea" id="edit-lesson-notes">' + this._escapeHtml(lesson.notes || '') + '</textarea>' +
          '<div class="text-xs text-muted" style="margin-top:4px;">\u{1F517} Tipp: Links (z.B. YouTube-Videos) k\u00f6nnen einfach reinkopiert werden \u2013 sie werden f\u00fcr den Sch\u00fcler klickbar.</div></div>';
      // ── PFEP-Bewertung im Edit-Modal (gleiche Optik wie Live-Maske) ──
      var _eGroups = evaluationGroupsWithLegacy(lesson && (lesson.license_class || lesson.licenseClass), lesson.ratings);
      var _eTotal = 0, _eRated = 0;
      _eGroups.forEach(function(g) {
        _eTotal += g.items.length;
        g.items.forEach(function(task) {
          var v = AppState._editRatings[task];
          if (typeof v === 'number' && v >= 1 && v <= 4) _eRated++;
        });
      });
      var _ePct = _eTotal > 0 ? Math.round((_eRated / _eTotal) * 100) : 0;
      html += '<div class="section-title mb-2">' + t('bewertung') + '</div>';
      html += '<div class="pfep-progress" id="pfep-edit-progress">' +
        '<span class="pfep-progress-label">Gesamt</span>' +
        '<div class="pfep-progress-bar"><div class="pfep-progress-fill" id="pfep-edit-fill" style="width:' + _ePct + '%;"></div></div>' +
        '<span class="pfep-progress-count" id="pfep-edit-count">' + _eRated + ' / ' + _eTotal + '</span>' +
      '</div>';
      _eGroups.forEach(function(grp) {
        var meta = _pfepGroupMeta(grp.group);
        var gRated = 0;
        grp.items.forEach(function(task) {
          var v = AppState._editRatings[task];
          if (typeof v === 'number' && v >= 1 && v <= 4) gRated++;
        });
        var statusComplete = gRated === grp.items.length ? ' complete' : '';
        html += '<div class="pfep-group" data-group="edit-' + meta.cls + '">' +
          '<div class="pfep-group-head">' +
            '<div class="pfep-group-title"><span class="pfep-group-icon ' + meta.cls + '">' + meta.icon + '</span>' + grp.group + '</div>' +
            '<div class="pfep-group-status' + statusComplete + '" data-group-status="edit-' + meta.cls + '">' + gRated + ' / ' + grp.items.length + ' bewertet</div>' +
          '</div>' +
          '<div class="pfep-group-body">';
        grp.items.forEach(function(task) {
          var rawCurrent = AppState._editRatings[task];
          var current = (typeof rawCurrent === 'number' && rawCurrent >= 1 && rawCurrent <= 4) ? rawCurrent : 0;
          var ratedCls = (current >= 1 && current <= 4) ? ' rated-' + current : '';
          var currentNote = AppState._editRatingNotes[task] || '';
          html += '<div class="pfep-item' + ratedCls + '" data-task-slug="edit-' + _slugifyTask(task) + '" data-group="edit-' + meta.cls + '">' +
            '<div class="pfep-item-header">' +
              '<span class="pfep-item-label">' + tSkill(task) + '</span>' +
              '<button type="button" class="pfep-item-clear" title="Bewertung entfernen" onclick="App.clearEditSkillRating(\'' + task + '\')">\u00d7 entfernen</button>' +
            '</div>' +
            '<div class="level-selector" data-task="' + task + '">';
          SKILL_LEVELS.forEach(function(sl) {
            var isActive = sl.level === current ? ' active' : '';
            html += '<button type="button" class="level-selector-btn' + isActive + '" data-level="' + sl.level + '" onclick="App.setEditSkillRating(this, \'' + task + '\', ' + sl.level + ')">' + tLevel(sl.name) + '</button>';
          });
          html += '</div>';
          html += _renderItemNoteHtml(task, currentNote, 'edit');
          html += '</div>';
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
    var item = container.closest('.pfep-item');
    if (item) {
      item.classList.remove('rated-1','rated-2','rated-3','rated-4');
      if (level >= 1 && level <= 4) item.classList.add('rated-' + level);
    }
    this._recomputeEditRatingProgress();
  },

  clearEditSkillRating: function(task) {
    delete AppState._editRatings[task];
    var modal = document.querySelector('.modal') || document;
    var slug = _slugifyTask(task);
    var item = modal.querySelector('.pfep-item[data-task-slug="edit-' + slug + '"]');
    if (item) {
      item.classList.remove('rated-1','rated-2','rated-3','rated-4');
      item.querySelectorAll('.level-selector-btn').forEach(function(b) { b.classList.remove('active'); });
    }
    this._recomputeEditRatingProgress();
  },

  // ── Notiz pro Bewertung: Edit-Modal ──
  openItemNoteEdit: function(task) {
    var wrap = document.getElementById('edit-note-' + _slugifyTask(task));
    if (!wrap) return;
    var current = (AppState._editRatingNotes && AppState._editRatingNotes[task]) || '';
    wrap.innerHTML = '<div class="pfep-note-editor">' +
      '<textarea maxlength="1000" placeholder="Notiz zu dieser Bewertung\u2026">' + _escapeAttr(current) + '</textarea>' +
      '<div class="pfep-note-editor-actions">' +
        '<button type="button" class="pfep-note-btn" onclick="App.cancelItemNoteEdit(\'' + task + '\')">Abbrechen</button>' +
        '<button type="button" class="pfep-note-btn primary" onclick="App.saveItemNoteEdit(\'' + task + '\')">Speichern</button>' +
      '</div></div>';
    var ta = wrap.querySelector('textarea');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  },
  saveItemNoteEdit: function(task) {
    var wrap = document.getElementById('edit-note-' + _slugifyTask(task));
    if (!wrap) return;
    var ta = wrap.querySelector('textarea');
    var val = ta ? ta.value.trim() : '';
    if (!AppState._editRatingNotes) AppState._editRatingNotes = {};
    if (val) AppState._editRatingNotes[task] = val;
    else delete AppState._editRatingNotes[task];
    wrap.outerHTML = _renderItemNoteHtml(task, val, 'edit');
  },
  cancelItemNoteEdit: function(task) {
    var wrap = document.getElementById('edit-note-' + _slugifyTask(task));
    if (!wrap) return;
    var existing = (AppState._editRatingNotes && AppState._editRatingNotes[task]) || '';
    wrap.outerHTML = _renderItemNoteHtml(task, existing, 'edit');
  },

  _recomputeEditRatingProgress: function() {
    var modal = document.querySelector('.modal') || document;
    var groupRoots = modal.querySelectorAll('.pfep-group[data-group^="edit-"]');
    var total = 0, rated = 0;
    groupRoots.forEach(function(gEl) {
      var items = gEl.querySelectorAll('.pfep-item');
      var gTotal = items.length;
      var gRated = 0;
      items.forEach(function(it) {
        if (it.classList.contains('rated-1') || it.classList.contains('rated-2') ||
            it.classList.contains('rated-3') || it.classList.contains('rated-4')) gRated++;
      });
      total += gTotal; rated += gRated;
      var groupKey = gEl.getAttribute('data-group');
      var st = modal.querySelector('[data-group-status="' + groupKey + '"]');
      if (st) {
        st.textContent = gRated + ' / ' + gTotal + ' bewertet';
        if (gRated === gTotal && gTotal > 0) st.classList.add('complete'); else st.classList.remove('complete');
      }
    });
    var fill = modal.querySelector('#pfep-edit-fill');
    var count = modal.querySelector('#pfep-edit-count');
    var pct = total > 0 ? Math.round((rated / total) * 100) : 0;
    if (fill) fill.style.width = pct + '%';
    if (count) count.textContent = rated + ' / ' + total;
  },

  saveEditedLesson: async function(e, lessonId, studentId) {
    e.preventDefault();
    try {
      var editImages = (AppState._editExistingImages || []).concat(AppState._editPendingImages || []);
      await ApiClient.put('/api/lessons/' + lessonId, {
        type: document.getElementById('edit-lesson-type').value,
        notes: document.getElementById('edit-lesson-notes').value,
        ratings: _filterValidRatings(AppState._editRatings),
        ratingNotes: AppState._editRatingNotes || {},
        images: editImages
      });
      this.closeModalForce(); AppState._editRatingNotes = {}; AppState._cachedData.instructorDash = null;
      this.showToast(t('fahrstundeAktualisiert'));
      this.showLessonReview(lessonId, studentId, 'instructor');
    } catch (err) { this.showToast(t('fehler') + ': ' + err.message); }
  },

  deleteLesson: async function(lessonId, studentId) {
    var msg = 'Fahrstunde l\u00f6schen?\n\n\u2022 Wird aus Ihrer Ansicht entfernt\n\u2022 Bleibt im Ausbildungsnachweis des Sch\u00fclers sichtbar';
    if (!confirm(msg)) return;
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
    evaluationGroupsWithLegacy(stu && stu.license_class, latestRatings).forEach(function(grp) {
      html += _groupHeaderHtml(grp.group);
      grp.items.forEach(function(task) {
        var rawVal = latestRatings && latestRatings[task];
        var hasRating = typeof rawVal === 'number' && rawVal >= 1 && rawVal <= 4;
        if (!hasRating) {
          html += '<div class="skill-bar"><div class="skill-bar-header"><span style="color:var(--text-muted);">' + tSkill(task) + '</span><span class="text-xs" style="font-size:10px;color:var(--text-muted);font-style:italic;">nicht bewertet</span></div>' +
            '<div class="skill-bar-track unrated"></div></div>';
        } else {
          var val = rawVal; var pct = (val / 4) * 100; var info = getSkillLevel(val);
          html += '<div class="skill-bar"><div class="skill-bar-header"><span><span class="skill-bar-dot" style="background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></span>' + tSkill(task) + '</span><span class="badge ' + info.badgeClass + '" style="font-size:10px;">' + tLevel(info.name) + '</span></div>' +
            '<div class="skill-bar-track"><div class="skill-bar-fill" style="width:' + pct + '%;background:' + SKILL_COLORS[Math.round(val) || 1] + ';"></div></div></div>';
        }
      });
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
      // Upcoming scheduled/booked lessons (aus scheduled_lessons Tabelle)
      try {
        // 30s-Cache: schnell bei Tab-Wechseln, aber Buchungen erscheinen zeitnah
        var data = AppState._cachedData.studentOverview;
        var ts = AppState._cachedData._studentOverviewTs || 0;
        if (!data || (Date.now() - ts) > 30000) {
          data = await ApiClient.get('/api/student/overview');
          AppState._cachedData.studentOverview = data;
          AppState._cachedData._studentOverviewTs = Date.now();
        }
        var scheduled = (data.scheduledLessons || []);
        var today = formatDateLocal(new Date());
        var upcoming = scheduled.filter(function(l) {
          return l.date >= today && l.status !== 'abgesagt' && l.status !== 'storniert';
        }).sort(function(a, b) {
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          return (a.start_time || '') < (b.start_time || '') ? -1 : 1;
        });
        if (upcoming.length === 0) {
          html += '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' +
            '<div class="empty-state-title">' + t('keineFahrstunden') + '</div></div>';
        } else {
          upcoming.forEach(function(l) {
            var d = new Date(l.date);
            var dayStr2 = d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
            var timeStr = (l.start_time || '').substring(0,5);
            if (l.end_time) timeStr += '–' + l.end_time.substring(0,5);
            html += '<div class="lesson-card">' +
              '<div class="lesson-card-info">' +
                '<div class="lesson-card-date">' + dayStr2 + ' · ' + timeStr + '</div>' +
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
      // Invalidiere Overview-Cache, damit neue Fahrstunde sofort erscheint
      AppState._cachedData.studentOverview = null;
      AppState._cachedData._studentOverviewTs = 0;
      this.renderStudentTermineTab();
    } catch (err) {
      this.showToast(t('fehler') + ': ' + (err.message || err));
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
      AppState.scheduleData = null; if(AppState._cachedData) AppState._cachedData._scheduleBundle = null;
      if (AppState.currentUser.role === 'instructor') this.renderInstructorDashboardTab();
      else this.renderSchoolScheduleTab();
    } catch (err) {
      this.showToast(t('fehler') + ': ' + err.message);
    } finally {
      this.showLoading(false);
    }
  },

  // ════════════════════════════════════════════════
  //  TAGESÜBERSICHT — Soll-Positionen zum Abhaken
  //  Für Fahrschulen, die ihre Buchhaltung extern führen.
  //  Liste mit Schüler/Position/Betrag + leere Spalten für
  //  handschriftliche Notizen (Bezahlt am, Betrag €).
  // ════════════════════════════════════════════════
  _daily: {
    from: null, to: null, mode: 'day', // day | week | month
    instructorId: '', studentId: '',
    data: null, checked: {} // checked[chargeId] = true
  },

  // ============================================
  // Push 8: Tätigkeitsübersicht (ohne Preise, für external-Modus)
  // ============================================
  _activity: { from: null, to: null, mode: 'day' },

  openActivityOverview: function() {
    var today = new Date().toISOString().split('T')[0];
    App._activity.mode = 'day';
    App._activity.from = today;
    App._activity.to = today;
    App._renderActivityOverview();
  },

  _activityShift: function(direction) {
    var a = App._activity;
    var from = new Date(a.from + 'T00:00:00');
    if (a.mode === 'day') {
      from.setDate(from.getDate() + direction);
      a.from = from.toISOString().split('T')[0];
      a.to = a.from;
    } else {
      from.setDate(from.getDate() + 7 * direction);
      a.from = from.toISOString().split('T')[0];
      var to = new Date(a.from + 'T00:00:00'); to.setDate(to.getDate() + 6);
      a.to = to.toISOString().split('T')[0];
    }
    App._renderActivityOverview();
  },

  _activitySetMode: function(mode) {
    App._activity.mode = mode;
    if (mode === 'day') {
      App._activity.to = App._activity.from;
    } else {
      var from = new Date(App._activity.from + 'T00:00:00');
      var to = new Date(from); to.setDate(to.getDate() + 6);
      App._activity.to = to.toISOString().split('T')[0];
    }
    App._renderActivityOverview();
  },

  _renderActivityOverview: async function() {
    var modal = document.getElementById('activity-overview-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'activity-overview-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:0;';
      modal.innerHTML = '<div id="activity-overview-content" style="background:#fff;width:100%;max-width:780px;max-height:95vh;border-radius:12px;display:flex;flex-direction:column;overflow:hidden;"></div>';
      document.body.appendChild(modal);
    }
    var content = document.getElementById('activity-overview-content');
    content.innerHTML = '<div style="padding:24px;text-align:center;"><div class="loading-spinner"></div></div>';
    var a = App._activity;
    try {
      var qs = 'date=' + encodeURIComponent(a.from) + '&date_to=' + encodeURIComponent(a.to);
      var data = await ApiClient.get('/api/daily-overview?' + qs);
      App._renderActivityOverviewHtml(content, data);
    } catch (err) {
      content.innerHTML = '<div style="padding:24px;"><h3>Fehler</h3><p>' + (err.message || err) + '</p>' +
        '<button class="btn btn-secondary" onclick="App.closeActivityOverview()">Schließen</button></div>';
    }
  },

  closeActivityOverview: function() {
    var m = document.getElementById('activity-overview-modal'); if (m) m.remove();
  },

  _renderActivityOverviewHtml: function(content, data) {
    var a = App._activity;
    var u = AppState.currentUser;
    var schoolName = (u && (u.name || u.admin_name)) || 'Fahrschule';
    var fromD = new Date(a.from + 'T00:00:00');
    var toD = new Date(a.to + 'T00:00:00');
    var fmt = function(d){ return d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}); };
    var rangeLabel = (a.mode === 'day') ? fmt(fromD) : (fmt(fromD) + ' – ' + fmt(toD));
    var rows = data.lessons || [];

    var tbody = rows.length === 0
      ? '<tr><td colspan="6" style="text-align:center;padding:24px;color:#6b7280;">Keine Fahrstunden in diesem Zeitraum.</td></tr>'
      : rows.map(function(r){
          var dStr = new Date(r.date + 'T00:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});
          return '<tr>' +
            '<td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;">' + dStr + '</td>' +
            '<td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;">' + (r.time || '—') + '</td>' +
            '<td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;">' + (r.student_name || '—') + '</td>' +
            '<td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;">' + (r.instructor_name || '—') + '</td>' +
            '<td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;">' + (r.type || '—') + '</td>' +
            '<td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;">' + (r.duration_min || 0) + ' min</td>' +
          '</tr>';
        }).join('');

    content.innerHTML = '<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
        '<div><h3 style="margin:0;font-size:18px;">Tätigkeitsübersicht</h3>' +
        '<div style="font-size:13px;color:#6b7280;margin-top:2px;">' + rangeLabel + ' · ' + rows.length + ' Fahrstunde(n)</div></div>' +
        '<button onclick="App.closeActivityOverview()" style="background:transparent;border:0;font-size:22px;cursor:pointer;color:#6b7280;">×</button>' +
      '</div>' +
      '<div style="padding:12px 20px;border-bottom:1px solid #e5e7eb;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
        '<div style="display:flex;gap:4px;">' +
          '<button class="btn btn-sm" style="' + (a.mode==='day'?'background:#1d4ed8;color:#fff;':'') + '" onclick="App._activitySetMode(\'day\')">Tag</button>' +
          '<button class="btn btn-sm" style="' + (a.mode==='week'?'background:#1d4ed8;color:#fff;':'') + '" onclick="App._activitySetMode(\'week\')">Woche</button>' +
        '</div>' +
        '<div style="margin-left:auto;display:flex;gap:4px;">' +
          '<button class="btn btn-sm" onclick="App._activityShift(-1)">‹</button>' +
          '<button class="btn btn-sm" onclick="App._activityShift(1)">›</button>' +
          '<button class="btn btn-primary btn-sm" onclick="App.printActivityOverview()">🖨️ Drucken</button>' +
        '</div>' +
      '</div>' +
      '<div id="activity-overview-print-area" style="flex:1;overflow:auto;padding:16px 20px;">' +
        '<div class="print-header" style="margin-bottom:16px;"><div style="font-size:18px;font-weight:700;">' + App._escapeHtml(schoolName) + '</div>' +
        '<div style="font-size:14px;color:#374151;">Tätigkeitsnachweis — ' + rangeLabel + '</div>' +
        '<div style="font-size:12px;color:#6b7280;margin-top:4px;">Druck am ' + new Date().toLocaleString('de-DE') + '</div></div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
          '<thead><tr style="background:#f3f4f6;">' +
            '<th style="text-align:left;padding:8px 6px;border-bottom:2px solid #d1d5db;">Datum</th>' +
            '<th style="text-align:left;padding:8px 6px;border-bottom:2px solid #d1d5db;">Uhrzeit</th>' +
            '<th style="text-align:left;padding:8px 6px;border-bottom:2px solid #d1d5db;">Schüler</th>' +
            '<th style="text-align:left;padding:8px 6px;border-bottom:2px solid #d1d5db;">Fahrlehrer</th>' +
            '<th style="text-align:left;padding:8px 6px;border-bottom:2px solid #d1d5db;">Typ</th>' +
            '<th style="text-align:right;padding:8px 6px;border-bottom:2px solid #d1d5db;">Dauer</th>' +
          '</tr></thead><tbody>' + tbody + '</tbody></table>' +
        '<div style="margin-top:24px;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:8px;">' +
        'Reiner Tätigkeitsnachweis ohne Verrechnungsdaten. Die Buchhaltung erfolgt extern.' +
        '</div>' +
      '</div>';
  },

  printActivityOverview: function() {
    var area = document.getElementById('activity-overview-print-area');
    if (!area) return;
    var w = window.open('', '_blank');
    if (!w) { Toast.error('Bitte Pop-up-Blocker deaktivieren'); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tätigkeitsnachweis</title>' +
      '<style>body{font-family:-apple-system,system-ui,sans-serif;margin:24px;color:#111;}table{width:100%;border-collapse:collapse;}th,td{padding:8px 6px;}</style>' +
      '</head><body>' + area.innerHTML + '</body></html>');
    w.document.close();
    setTimeout(function(){ try { w.print(); } catch(e){} }, 250);
  },

  openDailySummary: function() {
    var today = new Date().toISOString().split('T')[0];
    App._daily.mode = 'day';
    App._daily.from = today;
    App._daily.to = today;
    App._daily.instructorId = '';
    App._daily.studentId = '';
    App._daily.checked = {};
    App._renderDailySummary();
  },

  _dailyShift: function(direction) {
    // direction: -1 = zurück, +1 = vor
    var d = App._daily;
    var from = new Date(d.from + 'T00:00:00');
    if (d.mode === 'day') {
      from.setDate(from.getDate() + direction);
      d.from = from.toISOString().split('T')[0];
      d.to = d.from;
    } else if (d.mode === 'week') {
      from.setDate(from.getDate() + 7 * direction);
      d.from = from.toISOString().split('T')[0];
      var to = new Date(d.from + 'T00:00:00'); to.setDate(to.getDate() + 6);
      d.to = to.toISOString().split('T')[0];
    } else if (d.mode === 'month') {
      from.setMonth(from.getMonth() + direction);
      from.setDate(1);
      d.from = from.toISOString().split('T')[0];
      var lastDay = new Date(from.getFullYear(), from.getMonth() + 1, 0);
      d.to = lastDay.toISOString().split('T')[0];
    }
    App._renderDailySummary();
  },

  _dailySetMode: function(mode) {
    var d = App._daily;
    d.mode = mode;
    var ref = new Date((d.from || new Date().toISOString().split('T')[0]) + 'T00:00:00');
    if (mode === 'day') {
      d.from = ref.toISOString().split('T')[0]; d.to = d.from;
    } else if (mode === 'week') {
      // Montag der Woche
      var dow = ref.getDay(); var diff = dow === 0 ? -6 : 1 - dow;
      ref.setDate(ref.getDate() + diff);
      d.from = ref.toISOString().split('T')[0];
      var to = new Date(d.from + 'T00:00:00'); to.setDate(to.getDate() + 6);
      d.to = to.toISOString().split('T')[0];
    } else if (mode === 'month') {
      ref.setDate(1);
      d.from = ref.toISOString().split('T')[0];
      var lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      d.to = lastDay.toISOString().split('T')[0];
    }
    App._renderDailySummary();
  },

  _dailyDateInput: function(which, value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    var d = App._daily;
    if (which === 'from') {
      d.from = value;
      if (d.mode === 'day') d.to = value;
      else if (new Date(d.to) < new Date(value)) d.to = value;
    } else {
      d.to = value;
      if (new Date(d.from) > new Date(value)) d.from = value;
    }
    App._renderDailySummary();
  },

  _dailySetFilter: function(which, value) {
    App._daily[which === 'instructor' ? 'instructorId' : 'studentId'] = value || '';
    App._renderDailySummary();
  },

  _dailyToggleChecked: function(chargeId) {
    App._daily.checked[chargeId] = !App._daily.checked[chargeId];
    var row = document.getElementById('daily-row-' + chargeId);
    if (row) {
      if (App._daily.checked[chargeId]) row.classList.add('daily-row-done');
      else row.classList.remove('daily-row-done');
    }
  },

  _renderDailySummary: async function() {
    var main = document.getElementById('school-main');
    if (!main) return;
    var d = App._daily;
    main.innerHTML = '<div class="page-padding" style="text-align:center;padding:var(--space-12);"><div class="loading-spinner"></div></div>';
    var qs = 'from=' + d.from + '&to=' + d.to;
    if (d.instructorId) qs += '&instructor_id=' + encodeURIComponent(d.instructorId);
    if (d.studentId) qs += '&student_id=' + encodeURIComponent(d.studentId);
    var data;
    try { data = await ApiClient.get('/api/accounting/daily-summary?' + qs); }
    catch (err) {
      main.innerHTML = '<div class="page-padding"><button class="btn btn-secondary" onclick="App.switchSchoolTab(\'dashboard\')">← Zurück</button><p style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--space-3);">Fehler: ' + (err.message || err) + '</p></div>';
      return;
    }
    App._daily.data = data;
    var fmtE = App._formatEur, fmtD = App._formatDateDe;
    var items = data.items || [];
    var totals = data.totals || { netto_cents: 0, ust_cents: 0, brutto_cents: 0 };
    var school = data.school || {};
    var isKlein = (school.tax_mode || 'kleinunternehmer') === 'kleinunternehmer';
    var filters = data.filters || { instructors: [], students: [] };

    // Range-Label
    var rangeLabel = '';
    if (d.mode === 'day') rangeLabel = fmtD(d.from);
    else if (d.mode === 'week') rangeLabel = fmtD(d.from) + ' – ' + fmtD(d.to);
    else if (d.mode === 'month') {
      var dt = new Date(d.from + 'T00:00:00');
      var monatsnamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
      rangeLabel = monatsnamen[dt.getMonth()] + ' ' + dt.getFullYear();
    }

    // ── KOPF: Zurück + Modus-Switch + Datums-Navigation ──
    var h = '<div id="daily-summary-view" class="page-padding" style="max-width:1100px;margin:0 auto;">';
    h += '<div class="no-print" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-3);flex-wrap:wrap;">' +
      '<button class="btn btn-sm btn-secondary" onclick="App.switchSchoolTab(\'dashboard\')">← Zurück</button>' +
      '<div style="display:flex;gap:6px;">' +
        '<button class="daily-mode-btn" data-mode="day" onclick="App._dailySetMode(\'day\')" style="padding:6px 12px;border:1px solid var(--border-color);background:' + (d.mode === 'day' ? 'var(--color-primary)' : 'var(--bg-card)') + ';color:' + (d.mode === 'day' ? '#fff' : 'var(--text-default)') + ';border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">Tag</button>' +
        '<button class="daily-mode-btn" data-mode="week" onclick="App._dailySetMode(\'week\')" style="padding:6px 12px;border:1px solid var(--border-color);background:' + (d.mode === 'week' ? 'var(--color-primary)' : 'var(--bg-card)') + ';color:' + (d.mode === 'week' ? '#fff' : 'var(--text-default)') + ';border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">Woche</button>' +
        '<button class="daily-mode-btn" data-mode="month" onclick="App._dailySetMode(\'month\')" style="padding:6px 12px;border:1px solid var(--border-color);background:' + (d.mode === 'month' ? 'var(--color-primary)' : 'var(--bg-card)') + ';color:' + (d.mode === 'month' ? '#fff' : 'var(--text-default)') + ';border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">Monat</button>' +
      '</div>' +
    '</div>';

    h += '<div class="no-print" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);margin-bottom:var(--space-3);flex-wrap:wrap;">' +
      '<button class="btn btn-sm btn-secondary" onclick="App._dailyShift(-1)" aria-label="Vorheriger Zeitraum">←</button>' +
      '<div style="flex:1;text-align:center;font-size:18px;font-weight:700;">' + rangeLabel + '</div>' +
      '<button class="btn btn-sm btn-secondary" onclick="App._dailyShift(1)" aria-label="Nächster Zeitraum">→</button>' +
    '</div>';

    // ── Filter-Zeile + Date-Inputs ──
    var instOptions = '<option value="">Alle Fahrlehrer</option>';
    filters.instructors.forEach(function(i){ instOptions += '<option value="' + i.id + '"' + (d.instructorId === i.id ? ' selected' : '') + '>' + (i.name || '—') + '</option>'; });
    var studOptions = '<option value="">Alle Schüler</option>';
    filters.students.forEach(function(s){ studOptions += '<option value="' + s.id + '"' + (d.studentId === s.id ? ' selected' : '') + '>' + (s.name || '—') + '</option>'; });

    h += '<div class="no-print" style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-4);align-items:flex-end;">' +
      '<div style="flex:1;min-width:140px;"><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Von</label>' +
        '<input type="date" class="form-input" value="' + d.from + '" onchange="App._dailyDateInput(\'from\', this.value)" style="padding:6px 8px;font-size:13px;"></div>' +
      '<div style="flex:1;min-width:140px;"><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Bis</label>' +
        '<input type="date" class="form-input" value="' + d.to + '" onchange="App._dailyDateInput(\'to\', this.value)" style="padding:6px 8px;font-size:13px;"></div>' +
      '<div style="flex:1;min-width:160px;"><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Fahrlehrer</label>' +
        '<select class="form-input" onchange="App._dailySetFilter(\'instructor\', this.value)" style="padding:6px 8px;font-size:13px;">' + instOptions + '</select></div>' +
      '<div style="flex:1;min-width:160px;"><label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Schüler</label>' +
        '<select class="form-input" onchange="App._dailySetFilter(\'student\', this.value)" style="padding:6px 8px;font-size:13px;">' + studOptions + '</select></div>' +
      '<div style="display:flex;gap:6px;">' +
        '<button class="btn btn-sm btn-secondary" onclick="window.print()" title="Drucken">🖨️ Drucken</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="App._dailyExportPdf()" title="Als PDF speichern">📄 PDF</button>' +
        '<button class="btn btn-sm btn-secondary" onclick="App._dailyExportCsv()" title="Als CSV/Excel exportieren">📊 CSV</button>' +
      '</div>' +
    '</div>';

    // ── Druck-Kopf (nur sichtbar im Print) ──
    h += '<div class="daily-print-header print-only" style="display:none;text-align:left;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px;">' +
      '<div style="font-size:20px;font-weight:700;">' + (school.name || 'Fahrschule') + '</div>' +
      '<div style="font-size:14px;margin-top:4px;">Tagesübersicht Soll-Positionen — ' + rangeLabel + '</div>' +
      (d.instructorId ? '<div style="font-size:12px;color:#555;">Fahrlehrer-Filter aktiv</div>' : '') +
      (d.studentId ? '<div style="font-size:12px;color:#555;">Schüler-Filter aktiv</div>' : '') +
    '</div>';

    // ── Tabelle ──
    if (items.length === 0) {
      h += '<div style="background:var(--bg-elevated);padding:var(--space-6);text-align:center;border-radius:var(--radius-md);color:var(--text-muted);">' +
        '<div style="font-size:32px;margin-bottom:8px;">📋</div>' +
        '<div style="font-size:14px;">Keine Soll-Positionen im gewählten Zeitraum.</div>' +
      '</div>';
    } else {
      h += '<div style="overflow-x:auto;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);">' +
        '<table class="daily-table" style="width:100%;border-collapse:collapse;font-size:13px;">' +
        '<thead><tr style="background:var(--bg-elevated);text-align:left;border-bottom:2px solid var(--border-color);">' +
          '<th class="no-print" style="padding:10px 8px;width:36px;"></th>' +
          '<th style="padding:10px 8px;white-space:nowrap;">Datum</th>' +
          '<th style="padding:10px 8px;">Schüler</th>' +
          '<th style="padding:10px 8px;">Position</th>' +
          '<th style="padding:10px 8px;">Fahrlehrer</th>' +
          '<th style="padding:10px 8px;text-align:right;">Anz.</th>' +
          '<th style="padding:10px 8px;text-align:right;">Betrag</th>' +
          '<th style="padding:10px 8px;border-left:1px dashed #999;">Bezahlt am</th>' +
          '<th style="padding:10px 8px;">Betrag €</th>' +
        '</tr></thead><tbody>';
      items.forEach(function(it){
        var isChecked = !!App._daily.checked[it.id];
        var catBadge = it.source === 'auto' ? '<span style="font-size:10px;color:#666;background:#eee;padding:1px 6px;border-radius:3px;margin-left:6px;">auto</span>' : '';
        h += '<tr id="daily-row-' + it.id + '" class="' + (isChecked ? 'daily-row-done' : '') + '" style="border-bottom:1px solid var(--border-color);">' +
          '<td class="no-print" style="padding:8px;text-align:center;"><input type="checkbox" ' + (isChecked ? 'checked' : '') + ' onchange="App._dailyToggleChecked(\'' + it.id + '\')" style="width:18px;height:18px;cursor:pointer;"></td>' +
          '<td style="padding:8px;white-space:nowrap;">' + fmtD(it.charge_date) + '</td>' +
          '<td style="padding:8px;font-weight:600;">' + (it.student_name || '—') + '</td>' +
          '<td style="padding:8px;">' + (it.description || '—') + catBadge + '</td>' +
          '<td style="padding:8px;color:var(--text-muted);">' + (it.instructor_name || '—') + '</td>' +
          '<td style="padding:8px;text-align:right;">' + (it.quantity || 1) + '</td>' +
          '<td style="padding:8px;text-align:right;font-weight:600;white-space:nowrap;">' + fmtE(it.total_cents) + '</td>' +
          '<td style="padding:8px;border-left:1px dashed #bbb;min-width:90px;">&nbsp;</td>' +
          '<td style="padding:8px;min-width:90px;">&nbsp;</td>' +
        '</tr>';
      });
      h += '</tbody></table></div>';
    }

    // ── Summen ──
    h += '<div style="margin-top:var(--space-4);display:flex;justify-content:flex-end;">' +
      '<div style="background:var(--bg-elevated);padding:var(--space-4);border-radius:var(--radius-md);min-width:260px;border:1px solid var(--border-color);">';
    if (isKlein) {
      h += '<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">' +
        '<span>Positionen:</span><span style="font-weight:600;">' + items.length + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;padding-top:8px;border-top:1px solid var(--border-color);margin-top:8px;">' +
        '<span>Gesamt:</span><span>' + fmtE(totals.brutto_cents) + '</span></div>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Kleinunternehmer · keine USt ausgewiesen</div>';
    } else {
      h += '<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;"><span>Positionen:</span><span style="font-weight:600;">' + items.length + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:14px;"><span>Netto:</span><span style="font-weight:600;">' + fmtE(totals.netto_cents) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:14px;"><span>+ USt (' + (school.tax_rate_percent || 19) + ' %):</span><span style="font-weight:600;">' + fmtE(totals.ust_cents) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:18px;font-weight:700;padding-top:8px;border-top:1px solid var(--border-color);margin-top:8px;"><span>Brutto:</span><span>' + fmtE(totals.brutto_cents) + '</span></div>';
    }
    h += '</div></div>';

    // Hinweis-Footer
    h += '<div class="no-print" style="margin-top:var(--space-4);padding:var(--space-3);background:#f0f9ff;border:1px solid #bae6fd;border-radius:var(--radius-md);font-size:12px;color:#075985;">' +
      '💡 <strong>Hinweis:</strong> Diese Liste zeigt alle Soll-Positionen aus FahrDoc. Die Spalten <em>Bezahlt am</em> und <em>Betrag €</em> sind bewusst leer — zum handschriftlichen Eintragen nach dem Druck.' +
    '</div>';

    h += '</div>'; // /daily-summary-view
    main.innerHTML = h;
  },

  _dailyExportCsv: function() {
    var data = App._daily.data;
    if (!data || !data.items) return App.showToast('Keine Daten zum Exportieren');
    var fmt = function(v){ if (v == null) return ''; var s = String(v).replace(/"/g, '""'); return /[";\n]/.test(s) ? '"' + s + '"' : s; };
    var rows = [];
    rows.push(['Datum','Schueler','Position','Kategorie','Fahrlehrer','Anzahl','Einzelpreis_EUR','Gesamt_EUR','Quelle','Auf_Rechnung'].join(';'));
    data.items.forEach(function(it){
      rows.push([
        it.charge_date,
        fmt(it.student_name),
        fmt(it.description),
        fmt(it.category),
        fmt(it.instructor_name || ''),
        it.quantity || 1,
        ((it.unit_price_cents || 0) / 100).toFixed(2).replace('.', ','),
        ((it.total_cents || 0) / 100).toFixed(2).replace('.', ','),
        fmt(it.source || ''),
        it.invoice_id ? 'ja' : 'nein'
      ].join(';'));
    });
    // Summen-Zeile
    rows.push('');
    var t = data.totals || {};
    rows.push(['', '', '', '', '', '', 'Netto:', ((t.netto_cents || 0) / 100).toFixed(2).replace('.', ',')].join(';'));
    if ((data.school && data.school.tax_mode) === 'regelbesteuerung') {
      rows.push(['', '', '', '', '', '', 'USt:', ((t.ust_cents || 0) / 100).toFixed(2).replace('.', ',')].join(';'));
      rows.push(['', '', '', '', '', '', 'Brutto:', ((t.brutto_cents || 0) / 100).toFixed(2).replace('.', ',')].join(';'));
    }
    var csv = '\uFEFF' + rows.join('\r\n'); // BOM für Excel
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'tagesuebersicht_' + data.from + (data.from !== data.to ? '_bis_' + data.to : '') + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    App.showToast('CSV exportiert');
  },

  _dailyExportPdf: function() {
    var data = App._daily.data;
    if (!data || !data.items) return App.showToast('Keine Daten zum Exportieren');
    if (!window.jspdf || !window.jspdf.jsPDF) return App.showToast('PDF-Bibliothek wird geladen, bitte nochmal versuchen...');
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    var fmtE = function(c){ return ((c || 0) / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'; };
    var fmtD = function(s){ if (!s) return ''; var dt = new Date(s); return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('de-DE'); };
    var school = data.school || {};
    var items = data.items || [];
    var totals = data.totals || { netto_cents: 0, ust_cents: 0, brutto_cents: 0 };
    var isKlein = (school.tax_mode || 'kleinunternehmer') === 'kleinunternehmer';

    var pageW = 297, pageH = 210, margin = 12, y = margin;
    // Kopf
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text(school.name || 'Fahrschule', margin, y + 4); y += 6;
    doc.setFontSize(11); doc.setFont(undefined, 'normal');
    var d = App._daily;
    var rangeLabel = '';
    if (d.mode === 'day') rangeLabel = fmtD(d.from);
    else if (d.mode === 'week') rangeLabel = fmtD(d.from) + ' – ' + fmtD(d.to);
    else if (d.mode === 'month') {
      var dt = new Date(d.from + 'T00:00:00');
      var monatsnamen = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
      rangeLabel = monatsnamen[dt.getMonth()] + ' ' + dt.getFullYear();
    }
    doc.text('Tagesübersicht Soll-Positionen — ' + rangeLabel, margin, y + 4); y += 8;
    doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(margin, y, pageW - margin, y); y += 4;

    // Spalten: Datum | Schueler | Position | Fahrlehrer | Anz | Betrag | Bezahlt am | Betrag €
    var cols = [
      { x: margin,         w: 22, label: 'Datum' },
      { x: margin + 22,    w: 50, label: 'Schüler' },
      { x: margin + 72,    w: 70, label: 'Position' },
      { x: margin + 142,   w: 40, label: 'Fahrlehrer' },
      { x: margin + 182,   w: 12, label: 'Anz', align: 'right' },
      { x: margin + 194,   w: 25, label: 'Betrag', align: 'right' },
      { x: margin + 219,   w: 25, label: 'Bezahlt am' },
      { x: margin + 244,   w: 28, label: 'Betrag €' }
    ];
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    cols.forEach(function(c){
      doc.text(c.label, c.align === 'right' ? c.x + c.w - 1 : c.x, y + 4, { align: c.align || 'left' });
    });
    y += 5;
    doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y); y += 2;
    doc.setFont(undefined, 'normal');

    var rowH = 5.5;
    items.forEach(function(it){
      if (y + rowH > pageH - 25) {
        doc.addPage(); y = margin;
      }
      doc.text(fmtD(it.charge_date), cols[0].x, y + 4);
      doc.text(doc.splitTextToSize(it.student_name || '—', cols[1].w - 2)[0], cols[1].x, y + 4);
      doc.text(doc.splitTextToSize(it.description || '—', cols[2].w - 2)[0], cols[2].x, y + 4);
      doc.text(doc.splitTextToSize(it.instructor_name || '—', cols[3].w - 2)[0], cols[3].x, y + 4);
      doc.text(String(it.quantity || 1), cols[4].x + cols[4].w - 1, y + 4, { align: 'right' });
      doc.text(fmtE(it.total_cents), cols[5].x + cols[5].w - 1, y + 4, { align: 'right' });
      // Leere Kästchen für handschriftliche Einträge
      doc.setDrawColor(180);
      doc.line(cols[6].x, y + rowH - 0.5, cols[6].x + cols[6].w - 1, y + rowH - 0.5);
      doc.line(cols[7].x, y + rowH - 0.5, cols[7].x + cols[7].w - 1, y + rowH - 0.5);
      doc.setDrawColor(0);
      y += rowH;
    });

    // Summen
    y += 4;
    if (y + 20 > pageH - 10) { doc.addPage(); y = margin; }
    doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y); y += 5;
    doc.setFont(undefined, 'bold'); doc.setFontSize(10);
    var sumX = pageW - margin - 60;
    doc.text('Positionen:', sumX, y); doc.text(String(items.length), pageW - margin, y, { align: 'right' }); y += 5;
    if (!isKlein) {
      doc.setFont(undefined, 'normal');
      doc.text('Netto:', sumX, y); doc.text(fmtE(totals.netto_cents), pageW - margin, y, { align: 'right' }); y += 5;
      doc.text('USt (' + (school.tax_rate_percent || 19) + ' %):', sumX, y); doc.text(fmtE(totals.ust_cents), pageW - margin, y, { align: 'right' }); y += 5;
      doc.setFont(undefined, 'bold');
      doc.text('Brutto:', sumX, y); doc.text(fmtE(totals.brutto_cents), pageW - margin, y, { align: 'right' }); y += 5;
    } else {
      doc.text('Gesamt:', sumX, y); doc.text(fmtE(totals.brutto_cents), pageW - margin, y, { align: 'right' }); y += 5;
      doc.setFont(undefined, 'normal'); doc.setFontSize(8); doc.setTextColor(120);
      doc.text('Kleinunternehmer · keine USt ausgewiesen', sumX, y); y += 5;
      doc.setTextColor(0);
    }

    doc.save('tagesuebersicht_' + data.from + (data.from !== data.to ? '_bis_' + data.to : '') + '.pdf');
    App.showToast('PDF gespeichert');
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
