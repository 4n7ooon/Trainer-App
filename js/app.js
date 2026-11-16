/* App-Kern: State, Helpers, Router, Dashboard, Einstellungen, eigene Bereiche */
var S = null;
var Actions = window.Actions || {};
var Routes = window.Routes || {};

/* ---------- Helpers ---------- */
function uid() { return 'x-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function fmtPts(n) { return n + ' p'; }
function parsePts(str) {
  if (str === undefined || str === null) return null;
  var v = String(str).trim().replace(',', '.').replace('p', '').replace(/\s/g, '');
  if (v === '' || isNaN(parseFloat(v))) return null;
  return Math.round(parseFloat(v));
}
function playerById(id) { return S.players.find(function (p) { return p.id === id; }) || null; }
function teamById(id) { return S.teams.find(function (t) { return t.id === id; }) || null; }
function catById(id) { return S.catalog.find(function (c) { return c.id === id; }) || null; }
function byName(a, b) { return a.name.localeCompare(b.name, 'de'); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
/* Anwesenheit: aus Trainings-Einheiten berechnet (u.att = { playerId: true/false }) */
function attStats(p) {
  var done = 0, there = 0, seq = [];
  var units = S.training.units.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
  units.forEach(function (u) {
    if (!u.att || u.att[p.id] === undefined) return;
    done++;
    if (u.att[p.id]) { there++; seq.push(1); } else seq.push(0);
  });
  return { done: done, there: there, pct: done ? Math.round(there / done * 100) : null, seq: seq };
}
function fmtDate(iso) {
  if (!iso) return '';
  var d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
function save() { DB.save(S); }
function saveToast() { save(); toast('Gespeichert'); }

/* ---------- Toast ---------- */
var toastTimer = null;
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
}

/* ---------- Bottom Sheet ---------- */
function openSheet(html, onOpen) {
  var wrap = document.getElementById('sheet');
  wrap.innerHTML = '<div class="sheet-backdrop" data-action="sheet.close"></div><div class="sheet">' + html + '</div>';
  wrap.classList.add('open');
  if (onOpen) onOpen(wrap.querySelector('.sheet'));
}
function closeSheet() {
  var wrap = document.getElementById('sheet');
  wrap.classList.remove('open');
  wrap.innerHTML = '';
}
Actions['sheet.close'] = closeSheet;

function confirmDlg(msg, cb) {
  openSheet(
    '<h3 style="margin-top:0">Bestätigen</h3><p class="muted">' + esc(msg) + '</p>' +
    '<div class="row gap"><button class="btn danger grow" data-action="dlg.ok">Ja, fortfahren</button>' +
    '<button class="btn ghost grow" data-action="sheet.close">Abbrechen</button></div>'
  );
  Actions['dlg.ok'] = function () { closeSheet(); cb(); };
}

/* ---------- Medien-Element ---------- */
function mediaEl(mediaId, kind, cls) {
  var d = document.createElement('div');
  d.className = 'media ' + (cls || '');
  d.innerHTML = '<div class="media-loading muted small">Lädt…</div>';
  Media.get(mediaId).then(function (rec) {
    if (!rec) { d.innerHTML = '<div class="muted small">Medium fehlt</div>'; return; }
    var url = URL.createObjectURL(rec.blob);
    var isVideo = (kind === 'video') || (rec.type && rec.type.indexOf('video') === 0);
    if (isVideo) {
      d.innerHTML = '<video src="' + url + '" controls playsinline preload="metadata"></video>';
    } else {
      d.innerHTML = '<img src="' + url + '" loading="lazy">';
    }
  });
  return d;
}

/* ---------- Router ---------- */
function nav(hash) { location.hash = hash; }
function currentRoute() {
  var h = location.hash.replace(/^#\/?/, '');
  return h || 'dashboard';
}
window.addEventListener('hashchange', render);

function render() {
  closeSheet();
  var route = currentRoute();
  var app = document.getElementById('view');
  document.body.setAttribute('data-route', route);
  app.innerHTML = '';
  window.scrollTo(0, 0);
  if (route === 'spieltag') {
    var live = S.matches.find(function (m) { return m.status === 'live'; });
    if (live) { renderLive(live); startTicker(); return; }
  }
  if (route.indexOf('spiel-') === 0) {
    var mm = S.matches.find(function (x) { return 'spiel-' + x.id === route; });
    if (mm && mm.status === 'done') { matchSummary(mm); renderHeader(route); return; }
  }
  var fn = Routes[route];
  if (!fn && route.indexOf('custom-') === 0) fn = renderCustomSection;
  if (!fn) fn = renderDashboard;
  fn(app, route);
  renderHeader(route);
}

function renderHeader(route) {
  var titles = {
    dashboard: 'Dashboard', strafen: 'Strafenkatalog', trikots: 'Trikot-Liste',
    training: 'Trainingsplanung', spieler: 'Spieler-Datenbank', taktik: 'Taktik-Coach',
    verein: 'Vereins-Datenbank', spieltag: 'Spieltag', settings: 'Einstellungen', stats: 'Statistiken'
  };
  var title = titles[route] || (route.indexOf('custom-') === 0 ? 'Bereich' : 'Trainer-App');
  if (route.indexOf('custom-') === 0) {
    var cs = S.customSections.find(function (c) { return 'custom-' + c.id === route; });
    if (cs) title = cs.title;
  }
  if (route.indexOf('spiel-') === 0) {
    var mm = S.matches.find(function (x) { return 'spiel-' + x.id === route; });
    if (mm) title = 'Spiel: ' + (mm.opponent || '?');
  }
  var h = document.getElementById('header');
  var back = route === 'dashboard' ? '' : '<button class="icon-btn" data-action="nav.back" aria-label="Zurück">‹</button>';
  h.innerHTML = back + '<div class="header-title">' + esc(title) + '</div>' +
    '<button class="icon-btn" data-action="nav.settings" aria-label="Einstellungen">⚙︎</button>';
}
Actions['nav.back'] = function () { nav('dashboard'); };
Actions['nav.settings'] = function () { nav('settings'); };

/* ---------- Dashboard ---------- */
var DASH_TILES = [
  { route: 'strafen', icon: '⚖️', name: 'Strafenkatalog', desc: 'Punkte, Kasten & Verlauf' },
  { route: 'spieltag', icon: '📣', name: 'Spieltag', desc: 'Live-Ticker & Timer' },
  { route: 'taktik', icon: '🧠', name: 'Taktik-Coach', desc: 'Aufstellung & KI-Chat' },
  { route: 'training', icon: '🎯', name: 'Trainingsplanung', desc: 'Einheiten & Übungsarchiv' },
  { route: 'spieler', icon: '👥', name: 'Spieler-Datenbank', desc: 'Bewertungen & Profile' },
  { route: 'stats', icon: '📊', name: 'Statistiken', desc: 'Tore, Karten & S11-Quote' },
  { route: 'trikots', icon: '👕', name: 'Trikot-Liste', desc: 'Wer muss mitnehmen?' },
  { route: 'verein', icon: '🏟️', name: 'Vereins-Datenbank', desc: 'Mannschaften & Verein' }
];

Routes['dashboard'] = renderDashboard;
function renderDashboard(app) {
  var club = S.settings.clubName ? esc(S.settings.clubName) : 'Mein Verein';
  var nextMatch = S.matches.filter(function (m) { return m.status !== 'done'; })
    .sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); })[0];
  var boxCount = S.players.filter(function (p) { return p.points >= S.settings.boxThreshold; }).length;
  var live = S.matches.find(function (m) { return m.status === 'live'; });

  var html = '' +
    '<div class="hero card">' +
    '<div class="hero-club">' + club + '</div>' +
    '<div class="hero-sub">' + S.players.length + ' Spieler · ' + S.teams.map(function (t) { return esc(t.name); }).join(' · ') + '</div>' +
    (live ? '<button class="btn live grow" data-action="match.open" data-id="' + live.id + '">🔴 Live-Spiel fortsetzen</button>' : '') +
    '</div>' +
    (boxCount ? '<button class="alert-bar" data-action="nav.strafen">⚠️ ' + boxCount + ' Spieler bei ' + S.settings.boxThreshold + ' p – Kasten fällig</button>' : '') +
    '<div class="tile-grid">';
  DASH_TILES.forEach(function (t) {
    html += '<button class="tile" data-action="nav.go" data-route="' + t.route + '">' +
      '<span class="tile-icon">' + t.icon + '</span>' +
      '<span class="tile-name">' + t.name + '</span>' +
      '<span class="tile-desc">' + t.desc + '</span></button>';
  });
  S.customSections.forEach(function (c) {
    html += '<button class="tile custom" data-action="nav.go" data-route="custom-' + c.id + '">' +
      '<span class="tile-icon">' + esc(c.icon || '⭐') + '</span>' +
      '<span class="tile-name">' + esc(c.title) + '</span>' +
      '<span class="tile-desc">Eigener Bereich</span></button>';
  });
  html += '<button class="tile add" data-action="custom.new"><span class="tile-icon">＋</span><span class="tile-name">Neuer Bereich</span><span class="tile-desc">Erstelle deine eigene Kachel</span></button>';
  html += '</div>';

  if (nextMatch) {
    html += '<div class="card next-match"><div class="small muted">Nächster Spieltag</div><div class="strong">' +
      esc(nextMatch.opponent || 'Gegner offen') + ' · ' + fmtDate(nextMatch.date) + '</div>' +
      '<button class="btn ghost small-btn" data-action="match.open" data-id="' + nextMatch.id + '">Öffnen</button></div>';
  }
  app.innerHTML = html;
}
Actions['nav.go'] = function (el) { nav(el.dataset.route); };
Actions['nav.strafen'] = function () { nav('strafen'); };

/* ---------- Eigene Bereiche ---------- */
Actions['custom.new'] = function () {
  openSheet(
    '<h3>Neuer Bereich</h3>' +
    '<label>Name</label><input id="cs-title" placeholder="z. B. Kassenstand">' +
    '<label>Icon (Emoji)</label><input id="cs-icon" placeholder="⭐" maxlength="4">' +
    '<button class="btn primary" data-action="custom.create">Erstellen</button>'
  );
};
Actions['custom.create'] = function () {
  var title = document.getElementById('cs-title').value.trim();
  if (!title) { toast('Bitte Namen eingeben'); return; }
  var icon = document.getElementById('cs-icon').value.trim() || '⭐';
  S.customSections.push({ id: uid(), title: title, icon: icon, text: '', items: [] });
  save(); closeSheet(); render(); toast('Bereich erstellt');
};
function renderCustomSection(app, route) {
  var cs = S.customSections.find(function (c) { return 'custom-' + c.id === route; });
  if (!cs) { app.innerHTML = '<p class="muted">Bereich nicht gefunden.</p>'; return; }
  var html = '<div class="row gap"><button class="btn ghost small-btn" data-action="custom.rename" data-id="' + cs.id + '">Umbenennen</button>' +
    '<button class="btn danger small-btn" data-action="custom.delete" data-id="' + cs.id + '">Bereich löschen</button></div>';
  html += '<div class="card"><label>Notizen / Inhalt</label><textarea id="cs-text" rows="8" placeholder="Schreib hier alles rein, was du für diesen Bereich brauchst…">' + esc(cs.text || '') + '</textarea>' +
    '<button class="btn primary" data-action="custom.saveText" data-id="' + cs.id + '">Speichern</button></div>';
  html += '<div class="card"><h3>Checkliste</h3><div id="cs-list">';
  (cs.items || []).forEach(function (it) {
    html += '<div class="check-row"><label class="check"><input type="checkbox" data-action="custom.toggle" data-id="' + cs.id + '" data-item="' + it.id + '"' + (it.done ? ' checked' : '') + '><span>' + esc(it.text) + '</span></label>' +
      '<button class="icon-btn" data-action="custom.delItem" data-id="' + cs.id + '" data-item="' + it.id + '">✕</button></div>';
  });
  html += '</div><div class="row gap"><input id="cs-newitem" placeholder="Neuer Punkt"><button class="btn primary" data-action="custom.addItem" data-id="' + cs.id + '">+</button></div></div>';
  app.innerHTML = html;
}
Actions['custom.saveText'] = function (el) {
  var cs = S.customSections.find(function (c) { return c.id === el.dataset.id; });
  cs.text = document.getElementById('cs-text').value;
  saveToast();
};
Actions['custom.addItem'] = function (el) {
  var inp = document.getElementById('cs-newitem');
  var v = inp.value.trim();
  if (!v) return;
  var cs = S.customSections.find(function (c) { return c.id === el.dataset.id; });
  cs.items = cs.items || [];
  cs.items.push({ id: uid(), text: v, done: false });
  inp.value = '';
  save(); render();
};
Actions['custom.toggle'] = function (el) {
  var cs = S.customSections.find(function (c) { return c.id === el.dataset.id; });
  var it = cs.items.find(function (i) { return i.id === el.dataset.item; });
  it.done = el.checked;
  save();
};
Actions['custom.delItem'] = function (el) {
  var cs = S.customSections.find(function (c) { return c.id === el.dataset.id; });
  cs.items = cs.items.filter(function (i) { return i.id !== el.dataset.item; });
  save(); render();
};
Actions['custom.rename'] = function (el) {
  var cs = S.customSections.find(function (c) { return c.id === el.dataset.id; });
  openSheet('<h3>Bereich ändern</h3><label>Name</label><input id="cs-title2" value="' + esc(cs.title) + '">' +
    '<label>Icon</label><input id="cs-icon2" value="' + esc(cs.icon || '') + '" maxlength="4">' +
    '<button class="btn primary" data-action="custom.doRename" data-id="' + cs.id + '">Speichern</button>');
};
Actions['custom.doRename'] = function (el) {
  var cs = S.customSections.find(function (c) { return c.id === el.dataset.id; });
  cs.title = document.getElementById('cs-title2').value.trim() || cs.title;
  cs.icon = document.getElementById('cs-icon2').value.trim() || cs.icon;
  save(); closeSheet(); render();
};
Actions['custom.delete'] = function (el) {
  confirmDlg('Diesen Bereich wirklich löschen?', function () {
    S.customSections = S.customSections.filter(function (c) { return c.id !== el.dataset.id; });
    save(); nav('dashboard');
  });
};

/* ---------- Einstellungen ---------- */
Routes['settings'] = function (app) {
  var s = S.settings;
  app.innerHTML =
    '<div class="card"><h3>Verein</h3>' +
    '<label>Vereinsname</label><input id="set-club" value="' + esc(s.clubName) + '" placeholder="z. B. FC Beispiel">' +
    '<div class="row gap"><div class="grow"><label>Farbe 1</label><input type="color" id="set-c1" value="' + esc(s.clubColors.primary) + '" style="height:44px"></div>' +
    '<div class="grow"><label>Farbe 2</label><input type="color" id="set-c2" value="' + esc(s.clubColors.secondary) + '" style="height:44px"></div></div>' +
    '<button class="btn primary" data-action="settings.saveClub">Speichern</button></div>' +

    '<div class="card"><h3>Spiel & System</h3>' +
    '<label>Halbzeitlänge (Minuten) – Standard für den Live-Timer</label>' +
    '<input type="number" id="set-half" min="5" max="60" value="' + s.halfLength + '">' +
    '<p class="small muted">C-Jugend: 2 × 35 Min · B-Jugend: 2 × 40 Min. Beim Spieltag kannst du es pro Spiel ändern.</p>' +
    '<label>Kasten-Schwelle (Punkte)</label><input type="number" id="set-box" min="1" max="100" value="' + s.boxThreshold + '">' +
    '<button class="btn primary" data-action="settings.saveSystem">Speichern</button></div>' +

    '<div class="card"><h3>Darstellung</h3>' +
    '<div class="seg" id="theme-seg">' +
    ['dark', 'light'].map(function (t) {
      return '<button class="seg-btn' + (s.theme === t ? ' active' : '') + '" data-action="settings.theme" data-t="' + t + '">' + (t === 'dark' ? '🌙 Dark' : '☀️ Light') + '</button>';
    }).join('') + '</div></div>' +

    '<div class="card"><h3>Daten & Backup</h3>' +
    '<p class="small muted">Alle Änderungen werden automatisch auf diesem Gerät gespeichert. Exportiere regelmäßig ein Backup (z. B. nach Spiel- oder Trainingstagen).</p>' +
    '<p class="small muted">🔒 <b>Datenschutz:</b> Alle Daten (Spieler, Punkte, Spiele, Notizen) liegen ausschließlich lokal auf diesem Gerät. Es gibt keinen Server, nichts wird übertragen oder ist online sichtbar. Den App-Link deshalb nicht weitergeben – wer ihn öffnet, sieht nur eine leere Demo-App, nicht deine Daten.</p>' +
    '<button class="btn primary" data-action="settings.export">⬇️ Backup exportieren</button>' +
    '<div class="spacer"></div>' +
    '<input type="file" id="import-file" accept="application/json" style="display:none">' +
    '<button class="btn ghost" data-action="settings.importTrigger">⬆️ Backup importieren</button>' +
    '<div class="spacer"></div>' +
    '<button class="btn danger" data-action="settings.reset">Alles zurücksetzen</button></div>';
};
Actions['settings.saveClub'] = function () {
  S.settings.clubName = document.getElementById('set-club').value.trim();
  S.settings.clubColors.primary = document.getElementById('set-c1').value;
  S.settings.clubColors.secondary = document.getElementById('set-c2').value;
  applyTheme(); saveToast(); render();
};
Actions['settings.saveSystem'] = function () {
  S.settings.halfLength = Math.max(5, parseInt(document.getElementById('set-half').value, 10) || 35);
  S.settings.boxThreshold = Math.max(1, parseInt(document.getElementById('set-box').value, 10) || 25);
  saveToast();
};
Actions['settings.theme'] = function (el) {
  S.settings.theme = el.dataset.t;
  applyTheme(); save(); render();
};
Actions['settings.export'] = function () { DB.export(S); toast('Backup erstellt'); };
Actions['settings.importTrigger'] = function () { document.getElementById('import-file').click(); };
document.addEventListener('change', function (e) {
  if (e.target && e.target.id === 'import-file' && e.target.files[0]) {
    DB.importFile(e.target.files[0], function (state) {
      S = state; save(); applyTheme(); render(); toast('Backup importiert');
    });
  }
});
Actions['settings.reset'] = function () {
  confirmDlg('Wirklich ALLE Daten löschen und neu starten? Exportiere vorher ein Backup!', function () {
    localStorage.removeItem('trainerapp-state-v1');
    S = JSON.parse(JSON.stringify(window.SEED));
    save(); applyTheme(); nav('dashboard'); render();
  });
};

function applyTheme() {
  document.body.setAttribute('data-theme', S.settings.theme || 'dark');
  document.documentElement.style.setProperty('--club1', S.settings.clubColors.primary);
  document.documentElement.style.setProperty('--club2', S.settings.clubColors.secondary);
}

/* ---------- Global Event-Delegation ---------- */
document.addEventListener('click', function (e) {
  if (window._dragConsumed) { window._dragConsumed = false; return; } /* Drag-Ende soll nicht als Klick zählen */
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var fn = Actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});

/* ---------- Start ---------- */
S = DB.load();
applyTheme();
render();

/* ---------- Offline (Service Worker) ---------- */
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
  navigator.serviceWorker.register('sw.js').then(function (reg) {
    reg.addEventListener('updatefound', function () {
      var nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', function () {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('🔄 Neue Version verfügbar – App schließen & neu öffnen');
        }
      });
    });
  }).catch(function () { /* Offline bleibt trotzdem erhalten */ });
}
