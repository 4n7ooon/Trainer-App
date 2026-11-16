/* Views: Strafenkatalog, Trikot-Liste, Trainingsplanung */

/* ================= STRAFENKATALOG (reine Punkte) ================= */
var strafenTab = 'punkte';
Routes['strafen'] = function (app) {
  var html = '<div class="seg">' +
    ['punkte', 'katalog', 'verlauf'].map(function (t) {
      var lbl = { punkte: 'Punkte', katalog: 'Katalog', verlauf: 'Verlauf' }[t];
      return '<button class="seg-btn' + (strafenTab === t ? ' active' : '') + '" data-action="strafen.tab" data-t="' + t + '">' + lbl + '</button>';
    }).join('') + '</div><div id="strafen-body"></div>';
  app.innerHTML = html;
  renderStrafenTab();
};
Actions['strafen.tab'] = function (el) { strafenTab = el.dataset.t; render(); };

function renderStrafenTab() {
  var body = document.getElementById('strafen-body');
  if (!body) return;
  if (strafenTab === 'punkte') body.innerHTML = strafenPunkteHTML();
  else if (strafenTab === 'katalog') body.innerHTML = strafenKatalogHTML();
  else body.innerHTML = strafenVerlaufHTML();
}

function strafenPunkteHTML() {
  var th = S.settings.boxThreshold;
  var list = S.players.slice().sort(function (a, b) { return b.points - a.points; });
  var html = '<div class="row gap"><button class="btn ghost small-btn" data-action="strafen.assignAll">⚡ Strafe für ganze Mannschaft</button></div>';
  list.forEach(function (p) {
    var pts = p.points;
    var pct = Math.max(0, Math.min(100, (pts / th) * 100));
    var box = pts >= th;
    html += '<div class="player-row card' + (box ? ' box-alert' : '') + '">' +
      '<button class="player-main" data-action="strafen.player" data-id="' + p.id + '">' +
      '<div class="player-line"><span class="strong">' + esc(p.name) + '</span>' +
      '<span class="pts-badge' + (pts >= th ? ' hot' : pts < 0 ? ' good' : '') + '">' + pts + ' p</span></div>' +
      '<div class="bar"><div class="bar-fill' + (box ? ' hot' : '') + '" style="width:' + pct + '%"></div></div>' +
      '<div class="small muted">' + (box ? '📦 Kasten fällig!' : 'Kasten ab ' + th + ' p') + '</div>' +
      '</button>' +
      (box ? '<button class="btn box-btn" data-action="strafen.box" data-id="' + p.id + '">📦 Kasten mitgebracht</button>' : '') +
      '</div>';
  });
  return html;
}

Actions['strafen.box'] = function (el) {
  var p = playerById(el.dataset.id);
  confirmDlg(p.name + ' hat den Kasten mitgebracht. Es werden 25 p abgezogen.', function () {
    p.points -= 25;
    S.history.unshift({ id: uid(), ts: Date.now(), playerId: p.id, label: '📦 Kasten mitgebracht', delta: -25, inPts: true });
    save(); render(); toast('Kasten verbucht ✓');
  });
};

Actions['strafen.player'] = function (el) {
  var p = playerById(el.dataset.id);
  var html = '<h3>' + esc(p.name) + ' · ' + p.points + ' p</h3>';
  if (p.points >= S.settings.boxThreshold) {
    html += '<button class="btn box-btn" data-action="strafen.box" data-id="' + p.id + '">📦 Kasten mitgebracht (−25 p)</button><div class="spacer"></div>';
  }
  html += '<h3 class="sub">Strafen</h3><div class="pick-list">';
  S.catalog.filter(function (c) { return c.type === 'strafe'; }).forEach(function (c) {
    html += '<button class="pick-row" data-action="strafen.apply" data-pid="' + p.id + '" data-cid="' + c.id + '">' +
      '<span>' + esc(c.label) + '</span><span class="pts-badge">+' + c.points + ' p</span></button>';
  });
  html += '</div><h3 class="sub">Pluspunkte</h3><div class="pick-list">';
  S.catalog.filter(function (c) { return c.type === 'plus'; }).forEach(function (c) {
    html += '<button class="pick-row plus" data-action="strafen.apply" data-pid="' + p.id + '" data-cid="' + c.id + '">' +
      '<span>' + esc(c.label) + '</span><span class="pts-badge good">−' + c.points + ' p</span></button>';
  });
  html += '</div><h3 class="sub">Manuell</h3>' +
    '<div class="row gap"><input id="man-pts" inputmode="numeric" placeholder="z. B. 12 oder -3">' +
    '<button class="btn primary" data-action="strafen.setPoints" data-pid="' + p.id + '">Setzen</button></div>' +
    '<div class="spacer"></div>' +
    '<button class="btn danger grow" data-action="strafen.resetAll" data-pid="' + p.id + '">Auf 0 zurücksetzen</button>';
  openSheet(html);
};

Actions['strafen.apply'] = function (el) {
  var p = playerById(el.dataset.pid);
  var c = catById(el.dataset.cid);
  if (c.custom) {
    openSheet('<h3>Punkte festlegen</h3><p class="small muted">' + esc(c.label) + ' für ' + esc(p.name) + '</p>' +
      '<input id="custom-pts" inputmode="numeric" placeholder="Punkte, z. B. 15">' +
      '<button class="btn primary" data-action="strafen.applyCustom" data-pid="' + p.id + '" data-cid="' + c.id + '">Vergeben</button>');
    return;
  }
  applyCatalog(p, c, c.points);
};
Actions['strafen.applyCustom'] = function (el) {
  var p = playerById(el.dataset.pid);
  var c = catById(el.dataset.cid);
  var amount = parsePts(document.getElementById('custom-pts').value);
  if (amount === null) { toast('Ungültige Zahl'); return; }
  applyCatalog(p, c, amount);
  closeSheet();
};
function applyCatalog(p, c, amount) {
  var delta = c.type === 'strafe' ? amount : -amount;
  var before = p.points;
  p.points += delta;
  S.history.unshift({ id: uid(), ts: Date.now(), playerId: p.id, label: c.label, delta: delta, inPts: true });
  save();
  closeSheet(); render();
  if (p.points >= S.settings.boxThreshold && before < S.settings.boxThreshold) {
    setTimeout(function () {
      openSheet('<h3>📦 ' + esc(p.name) + ' hat ' + S.settings.boxThreshold + ' p erreicht!</h3>' +
        '<p>Mit dem nächsten Training muss ein Kasten Spezi mitgebracht werden.</p>' +
        '<button class="btn box-btn" data-action="strafen.box" data-id="' + p.id + '">📦 Kasten mitgebracht</button>' +
        '<div class="spacer"></div><button class="btn ghost" data-action="sheet.close">Später</button>');
    }, 150);
  } else {
    toast((c.type === 'strafe' ? '+' : '−') + amount + ' p für ' + p.name);
  }
}
Actions['strafen.setPoints'] = function (el) {
  var p = playerById(el.dataset.pid);
  var v = parsePts(document.getElementById('man-pts').value);
  if (v === null) { toast('Ungültige Zahl'); return; }
  var old = p.points;
  p.points = v;
  S.history.unshift({ id: uid(), ts: Date.now(), playerId: p.id, label: 'Manuelle Korrektur', delta: v - old, inPts: true });
  save(); closeSheet(); render(); toast('Punkte gesetzt');
};
Actions['strafen.resetAll'] = function (el) {
  var p = playerById(el.dataset.pid);
  p.points = 0;
  S.history.unshift({ id: uid(), ts: Date.now(), playerId: p.id, label: 'Punkte zurückgesetzt', delta: 0, inPts: true });
  save(); closeSheet(); render(); toast('Auf 0 gesetzt');
};
Actions['strafen.assignAll'] = function () {
  var html = '<h3>Strafe für ganze Mannschaft</h3><div class="pick-list">';
  S.catalog.filter(function (c) { return c.type === 'strafe'; }).forEach(function (c) {
    html += '<button class="pick-row" data-action="strafen.assignAllPick" data-cid="' + c.id + '"><span>' + esc(c.label) + '</span><span class="pts-badge">' + (c.custom ? 'frei' : '+' + c.points + ' p') + '</span></button>';
  });
  html += '</div>';
  openSheet(html);
};
Actions['strafen.assignAllPick'] = function (el) {
  var c = catById(el.dataset.cid);
  if (c.custom) { toast('Bitte pro Spieler vergeben'); return; }
  S.players.forEach(function (p) {
    p.points += c.points;
    S.history.unshift({ id: uid(), ts: Date.now(), playerId: p.id, label: c.label + ' (alle)', delta: c.points, inPts: true });
  });
  save(); closeSheet(); render(); toast(c.label + ' für alle verbucht');
};

function strafenKatalogHTML() {
  var html = '<button class="btn primary" data-action="cat.new">+ Neuer Eintrag</button><div class="spacer"></div>';
  ['strafe', 'plus'].forEach(function (type) {
    html += '<h3 class="sub">' + (type === 'strafe' ? 'Strafen' : 'Pluspunkte') + '</h3>';
    S.catalog.filter(function (c) { return c.type === type; }).forEach(function (c) {
      html += '<div class="card row spread"><div><div class="strong">' + esc(c.label) + '</div>' +
        '<div class="small muted">' + esc(c.group || 'Allgemein') + (c.custom ? ' · Punkte werden pro Fall festgelegt' : '') + '</div></div>' +
        '<div class="row gap">' +
        '<span class="pts-badge' + (type === 'plus' ? ' good' : '') + '">' + (type === 'plus' ? '−' : '+') + (c.custom ? 'frei' : c.points + ' p') + '</span>' +
        '<button class="icon-btn" data-action="cat.edit" data-id="' + c.id + '">✎</button>' +
        '<button class="icon-btn" data-action="cat.del" data-id="' + c.id + '">✕</button></div></div>';
    });
  });
  return html;
}
Actions['cat.new'] = function () { catSheet(null); };
Actions['cat.edit'] = function (el) { catSheet(catById(el.dataset.id)); };
function catSheet(c) {
  var isNew = !c;
  c = c || { id: uid(), label: '', points: 0, type: 'strafe', group: 'Allgemein', custom: false };
  openSheet(
    '<h3>' + (isNew ? 'Neuer Eintrag' : 'Eintrag bearbeiten') + '</h3>' +
    '<label>Bezeichnung</label><input id="cat-label" value="' + esc(c.label) + '">' +
    '<label>Typ</label><div class="seg">' +
    '<button class="seg-btn' + (c.type === 'strafe' ? ' active' : '') + '" data-action="cat.setType" data-t="strafe">Strafe (+)</button>' +
    '<button class="seg-btn' + (c.type === 'plus' ? ' active' : '') + '" data-action="cat.setType" data-t="plus">Pluspunkt (−)</button></div>' +
    '<label>Punkte</label><input id="cat-pts" inputmode="numeric" value="' + c.points + '">' +
    '<label class="check"><input type="checkbox" id="cat-custom"' + (c.custom ? ' checked' : '') + '><span>Punkte pro Fall frei wählbar (z. B. Sachwert)</span></label>' +
    '<label>Gruppe</label><input id="cat-group" value="' + esc(c.group || 'Allgemein') + '" placeholder="Training / Spiel / Allgemein">' +
    '<button class="btn primary" data-action="cat.save' + (isNew ? 'New' : '') + '" data-id="' + c.id + '">Speichern</button>'
  );
  window._catType = c.type;
}
Actions['cat.setType'] = function (el) {
  window._catType = el.dataset.t;
  document.querySelectorAll('[data-action="cat.setType"]').forEach(function (b) { b.classList.toggle('active', b.dataset.t === el.dataset.t); });
};
Actions['cat.saveNew'] = function () {
  var label = document.getElementById('cat-label').value.trim();
  if (!label) { toast('Bitte Bezeichnung eingeben'); return; }
  var points = parsePts(document.getElementById('cat-pts').value) || 0;
  S.catalog.push({ id: uid(), label: label, points: points, type: window._catType, group: document.getElementById('cat-group').value.trim() || 'Allgemein', custom: document.getElementById('cat-custom').checked });
  save(); closeSheet(); render(); toast('Eintrag erstellt');
};
Actions['cat.save'] = function (el) {
  var c = catById(el.dataset.id);
  c.label = document.getElementById('cat-label').value.trim() || c.label;
  c.points = parsePts(document.getElementById('cat-pts').value) || 0;
  c.type = window._catType;
  c.group = document.getElementById('cat-group').value.trim() || 'Allgemein';
  c.custom = document.getElementById('cat-custom').checked;
  save(); closeSheet(); render(); toast('Gespeichert');
};
Actions['cat.del'] = function (el) {
  confirmDlg('Diesen Eintrag wirklich löschen?', function () {
    S.catalog = S.catalog.filter(function (c) { return c.id !== el.dataset.id; });
    save(); render();
  });
};

function strafenVerlaufHTML() {
  if (!S.history.length) return '<p class="muted">Noch keine Einträge.</p>';
  var html = '';
  S.history.slice(0, 200).forEach(function (h) {
    var p = playerById(h.playerId);
    html += '<div class="card row spread"><div><div class="strong">' + (p ? esc(p.name) : '?') + '</div>' +
      '<div class="small muted">' + esc(h.label) + ' · ' + new Date(h.ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</div></div>' +
      '<div class="row gap"><span class="pts-badge' + (h.delta > 0 ? '' : h.delta < 0 ? ' good' : '') + '">' + (h.delta > 0 ? '+' : '') + h.delta + ' p</span>' +
      (h.delta !== 0 ? '<button class="icon-btn" data-action="hist.undo" data-id="' + h.id + '">↩︎</button>' : '') +
      '</div></div>';
  });
  return html;
}
Actions['hist.undo'] = function (el) {
  var h = S.history.find(function (x) { return x.id === el.dataset.id; });
  if (!h) return;
  var p = playerById(h.playerId);
  if (p) p.points -= h.delta;
  S.history = S.history.filter(function (x) { return x.id !== h.id; });
  save(); render(); toast('Rückgängig gemacht');
};

/* ================= TRIKOT-LISTE ================= */
Routes['trikots'] = function (app) {
  var ids = S.trikotOrder.filter(function (id) { return playerById(id); });
  var next = ids.map(function (id) { return playerById(id); }).filter(function (p) { return !p.trikotHad; }).sort(byName)[0];
  var html = '<div class="card hint-card">👕 Reihenfolge: alphabetisch. Als nächstes dran: <b>' + (next ? esc(next.name) : 'alle durch!') + '</b></div>';
  html += '<div class="row gap wrap"><button class="btn primary grow" data-action="trikot.add">+ Spieler hinzufügen</button>' +
    '<button class="btn ghost grow" data-action="trikot.resetAll">↺ Alle Häkchen zurücksetzen</button></div><div class="spacer"></div>';
  ids.map(function (id) { return playerById(id); }).sort(byName).forEach(function (p) {
    html += '<div class="card row spread trikot-row' + (p.trikotHad ? ' done' : '') + '">' +
      '<label class="check big"><input type="checkbox" data-action="trikot.check" data-id="' + p.id + '"' + (p.trikotHad ? ' checked' : '') + '>' +
      '<span class="strong">' + esc(p.name) + '</span></label>' +
      '<div class="row gap">' +
      (p.trikotHad ? '<span class="pts-badge good">✓ gehabt</span>' : '') +
      '<button class="icon-btn" data-action="trikot.remove" data-id="' + p.id + '">✕</button></div></div>';
  });
  if (!ids.length) html += '<p class="muted">Noch keine Spieler auf der Trikot-Liste.</p>';
  app.innerHTML = html;
};
Actions['trikot.check'] = function (el, e) {
  var p = playerById(el.dataset.id);
  p.trikotHad = e.target.checked;
  save();
  if (e.target.checked) toast(p.name + ' abgehakt ✓');
  render();
};
Actions['trikot.resetAll'] = function () {
  confirmDlg('Alle Häkchen entfernen? Die Liste bleibt bestehen, alle Spieler gelten wieder als "nicht gehabt".', function () {
    S.trikotOrder.forEach(function (id) { var p = playerById(id); if (p) p.trikotHad = false; });
    S.players.forEach(function (p) { if (S.trikotOrder.indexOf(p.id) >= 0) p.trikotHad = false; });
    save(); render(); toast('Trikot-Liste zurückgesetzt ✓');
  });
};

Actions['trikot.add'] = function () {
  var html = '<h3>Spieler zur Trikot-Liste</h3><div class="pick-list">';
  S.players.slice().sort(byName).forEach(function (p) {
    if (S.trikotOrder.indexOf(p.id) >= 0) return;
    html += '<button class="pick-row" data-action="trikot.addPick" data-id="' + p.id + '"><span>' + esc(p.name) + '</span><span class="muted">+</span></button>';
  });
  html += '</div>';
  openSheet(html);
};
Actions['trikot.addPick'] = function (el) {
  S.trikotOrder.push(el.dataset.id);
  save(); closeSheet(); render(); toast('Hinzugefügt');
};
Actions['trikot.remove'] = function (el) {
  confirmDlg('Spieler von der Trikot-Liste entfernen?', function () {
    S.trikotOrder = S.trikotOrder.filter(function (id) { return id !== el.dataset.id; });
    save(); render();
  });
};

/* ================= TRAININGSPLANUNG ================= */
var trainTab = 'einheiten';
var trainFilterTheme = '';
Routes['training'] = function (app) {
  var html = '<div class="seg">' +
    ['einheiten', 'archiv'].map(function (t) {
      return '<button class="seg-btn' + (trainTab === t ? ' active' : '') + '" data-action="train.tab" data-t="' + t + '">' + (t === 'einheiten' ? 'Einheiten' : 'Übungsarchiv') + '</button>';
    }).join('') + '</div><div id="train-body"></div>';
  app.innerHTML = html;
  renderTrainTab();
};
Actions['train.tab'] = function (el) { trainTab = el.dataset.t; render(); };
function renderTrainTab() {
  var body = document.getElementById('train-body');
  if (!body) return;
  body.innerHTML = trainTab === 'einheiten' ? trainUnitsHTML() : trainArchiveHTML();
}

/* ----- Einheiten ----- */
function trainUnitsHTML() {
  var units = S.training.units.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  var html = '<button class="btn primary" data-action="unit.new">+ Neue Trainingseinheit</button><div class="spacer"></div>';
  if (S.training.themes.length) {
    html += '<div class="chip-row"><button class="chip' + (trainFilterTheme === '' ? ' active' : '') + '" data-action="train.filter" data-id="">Alle</button>';
    S.training.themes.forEach(function (t) {
      html += '<button class="chip' + (trainFilterTheme === t.id ? ' active' : '') + '" data-action="train.filter" data-id="' + t.id + '">' + esc(t.name) + '</button>';
    });
    html += '</div>';
  }
  var shown = trainFilterTheme ? units.filter(function (u) { return (u.themeIds || []).indexOf(trainFilterTheme) >= 0; }) : units;
  if (!shown.length) html += '<p class="muted">Noch keine Einheiten' + (trainFilterTheme ? ' für dieses Thema' : '') + '.</p>';
  shown.forEach(function (u) {
    var tags = (u.themeIds || []).map(function (id) {
      var t = S.training.themes.find(function (x) { return x.id === id; });
      return t ? '<span class="chip active small-chip">' + esc(t.name) + '</span>' : '';
    }).join(' ');
    html += '<button class="card unit-row" data-action="unit.open" data-id="' + u.id + '">' +
      '<div class="strong">' + esc(u.title) + '</div>' +
      '<div class="small muted">' + fmtDate(u.date) + ' · ' + (u.blocks || []).length + ' Inhalte</div>' +
      '<div class="chip-row">' + tags + '</div></button>';
  });
  return html;
}
Actions['train.filter'] = function (el) { trainFilterTheme = el.dataset.id; render(); };

Actions['unit.new'] = function () {
  openSheet(
    '<h3>Neue Trainingseinheit</h3>' +
    '<label>Titel</label><input id="unit-title" placeholder="z. B. Aufbauspiel aus der Abwehr">' +
    '<label>Datum</label><input type="date" id="unit-date" value="' + todayISO() + '">' +
    '<label>Themen-Tags</label><div class="chip-row" id="unit-themes">' +
    S.training.themes.map(function (t) {
      return '<button class="chip" data-action="unit.toggleTheme" data-id="' + t.id + '">' + esc(t.name) + '</button>';
    }).join('') + '</div>' +
    '<button class="btn ghost small-btn" data-action="theme.new">+ Neues Thema (z. B. „Aufbauspiel“ für 4 Einheiten)</button>' +
    '<button class="btn primary" data-action="unit.create">Erstellen</button>'
  );
  window._unitThemes = [];
};
Actions['unit.toggleTheme'] = function (el) {
  var id = el.dataset.id;
  var i = window._unitThemes.indexOf(id);
  if (i >= 0) { window._unitThemes.splice(i, 1); el.classList.remove('active'); }
  else { window._unitThemes.push(id); el.classList.add('active'); }
};
Actions['theme.new'] = function () {
  var name = prompt('Name des Themas (z. B. „Aufbauspiel“):');
  if (!name) return;
  var t = { id: uid(), name: name.trim(), color: '#22c55e' };
  S.training.themes.push(t);
  save();
  var sheet = document.querySelector('.sheet');
  if (sheet && document.getElementById('unit-themes')) {
    var row = document.createElement('button');
    row.className = 'chip active';
    row.setAttribute('data-action', 'unit.toggleTheme');
    row.setAttribute('data-id', t.id);
    row.textContent = t.name;
    document.getElementById('unit-themes').appendChild(row);
    window._unitThemes.push(t.id);
  }
  toast('Thema erstellt');
};
Actions['unit.create'] = function () {
  var title = document.getElementById('unit-title').value.trim();
  if (!title) { toast('Bitte Titel eingeben'); return; }
  var u = { id: uid(), title: title, date: document.getElementById('unit-date').value, themeIds: (window._unitThemes || []).slice(), blocks: [], note: '' };
  S.training.units.push(u);
  save(); closeSheet(); render(); toast('Einheit erstellt');
};
Actions['unit.open'] = function (el) { unitDetail(el.dataset.id); };

function unitDetail(id) {
  var u = S.training.units.find(function (x) { return x.id === id; });
  if (!u) return;
  var tags = (u.themeIds || []).map(function (tid) {
    var t = S.training.themes.find(function (x) { return x.id === tid; });
    return t ? '<span class="chip active small-chip">' + esc(t.name) + '</span>' : '';
  }).join(' ');
  var html = '<h3>' + esc(u.title) + '</h3><div class="small muted">' + fmtDate(u.date) + '</div><div class="chip-row">' + tags + '</div><div class="spacer"></div>';
  html += '<div id="unit-blocks">';
  (u.blocks || []).forEach(function (b, i) {
    if (b.type === 'text') {
      html += '<div class="card block"><div class="block-head"><span class="small muted">Text · Abschnitt ' + (i + 1) + '</span>' +
        '<button class="icon-btn" data-action="unit.delBlock" data-id="' + u.id + '" data-b="' + b.id + '">✕</button></div>' +
        '<div class="block-text">' + esc(b.text).replace(/\n/g, '<br>') + '</div></div>';
    } else {
      html += '<div class="card block"><div class="block-head"><span class="small muted">' + (b.type === 'video' ? '🎬 Video' : '📷 Bild') + '</span>' +
        '<button class="icon-btn" data-action="unit.delBlock" data-id="' + u.id + '" data-b="' + b.id + '">✕</button></div><div id="mb-' + b.id + '"></div></div>';
    }
  });
  html += '</div>';
  html += '<div class="row gap wrap">' +
    '<button class="btn ghost grow" data-action="unit.addText" data-id="' + u.id + '">📝 Text</button>' +
    '<button class="btn ghost grow" data-action="unit.addMedia" data-id="' + u.id + '" data-k="image">📷 Bild</button>' +
    '<button class="btn ghost grow" data-action="unit.addMedia" data-id="' + u.id + '" data-k="video">🎬 Video</button>' +
    '<button class="btn ghost grow" data-action="unit.fromArchive" data-id="' + u.id + '">📦 Aus Archiv</button></div>' +
    '<div class="spacer"></div>' +
    '<button class="btn ki" data-action="unit.ki" data-id="' + u.id + '">🤖 KI-Empfehlungen für diese Einheit</button>' +
    '<div class="spacer"></div>' +
    '<div class="row gap"><button class="btn ghost grow" data-action="unit.editMeta" data-id="' + u.id + '">Titel/Datum/Tags</button>' +
    '<button class="btn danger grow" data-action="unit.delete" data-id="' + u.id + '">Einheit löschen</button></div>';
  openSheet(html, function () {
    (u.blocks || []).forEach(function (b) {
      if (b.type !== 'text') {
        var host = document.getElementById('mb-' + b.id);
        if (host) host.appendChild(mediaEl(b.mediaId, b.type));
      }
    });
  });
}
Actions['unit.delBlock'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  u.blocks = u.blocks.filter(function (b) { return b.id !== el.dataset.b; });
  save(); unitDetail(u.id);
};
Actions['unit.addText'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  openSheet('<h3>Text hinzufügen</h3><textarea id="blk-text" rows="6" placeholder="Übungsaufbau, Organisation, Hinweise…"></textarea>' +
    '<button class="btn primary" data-action="unit.saveText" data-id="' + u.id + '">Hinzufügen</button>');
};
Actions['unit.saveText'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  var v = document.getElementById('blk-text').value.trim();
  if (!v) return;
  u.blocks.push({ id: uid(), type: 'text', text: v });
  save(); unitDetail(u.id);
};
Actions['unit.addMedia'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = el.dataset.k === 'video' ? 'video/*' : 'image/*';
  inp.onchange = function () {
    var f = inp.files[0];
    if (!f) return;
    Media.put(f).then(function (mid) {
      u.blocks.push({ id: uid(), type: el.dataset.k, mediaId: mid });
      save(); unitDetail(u.id); toast('Hinzugefügt');
    });
  };
  inp.click();
};
Actions['unit.fromArchive'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  var items = [];
  S.training.archive.forEach(function (f) {
    (f.items || []).forEach(function (it) { items.push({ folder: f.name, item: it }); });
  });
  if (!items.length) { toast('Archiv ist noch leer'); return; }
  var html = '<h3>Aus dem Archiv</h3>';
  items.forEach(function (x) {
    var icon = x.item.type === 'video' ? '🎬' : x.item.type === 'image' ? '📷' : '📝';
    html += '<button class="pick-row" data-action="unit.pickArchive" data-id="' + u.id + '" data-arch="' + x.item.id + '">' +
      '<span>' + icon + ' ' + esc(x.item.title || x.item.text || 'Ohne Titel') + '</span><span class="small muted">' + esc(x.folder) + '</span></button>';
  });
  openSheet(html);
};
Actions['unit.pickArchive'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  var found = null;
  S.training.archive.forEach(function (f) {
    (f.items || []).forEach(function (it) { if (it.id === el.dataset.arch) found = it; });
  });
  if (!found) return;
  u.blocks.push({ id: uid(), type: found.type, mediaId: found.mediaId, text: found.text });
  save(); unitDetail(u.id); toast('Aus Archiv übernommen');
};
Actions['unit.editMeta'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  openSheet('<h3>Bearbeiten</h3><label>Titel</label><input id="um-title" value="' + esc(u.title) + '">' +
    '<label>Datum</label><input type="date" id="um-date" value="' + esc(u.date) + '">' +
    '<label>Themen-Tags</label><div class="chip-row" id="um-themes">' +
    S.training.themes.map(function (t) {
      var on = (u.themeIds || []).indexOf(t.id) >= 0;
      return '<button class="chip' + (on ? ' active' : '') + '" data-action="unit.toggleThemeEdit" data-id="' + t.id + '" data-unit="' + u.id + '">' + esc(t.name) + '</button>';
    }).join('') + '</div>' +
    '<button class="btn primary" data-action="unit.saveMeta" data-id="' + u.id + '">Speichern</button>');
};
Actions['unit.toggleThemeEdit'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.unit; });
  u.themeIds = u.themeIds || [];
  var i = u.themeIds.indexOf(el.dataset.id);
  if (i >= 0) { u.themeIds.splice(i, 1); el.classList.remove('active'); }
  else { u.themeIds.push(el.dataset.id); el.classList.add('active'); }
  save();
};
Actions['unit.saveMeta'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  u.title = document.getElementById('um-title').value.trim() || u.title;
  u.date = document.getElementById('um-date').value;
  save(); closeSheet(); render(); toast('Gespeichert');
};
Actions['unit.delete'] = function (el) {
  confirmDlg('Diese Einheit wirklich löschen?', function () {
    S.training.units = S.training.units.filter(function (x) { return x.id !== el.dataset.id; });
    save(); closeSheet(); render();
  });
};
Actions['unit.ki'] = function (el) {
  var u = S.training.units.find(function (x) { return x.id === el.dataset.id; });
  var tips = KI.unitSuggestions(u);
  openSheet('<h3>🤖 KI-Empfehlungen</h3><div class="ki-box">' + tips.map(function (t) { return '<p>• ' + esc(t) + '</p>'; }).join('') + '</div>' +
    '<button class="btn ghost" data-action="sheet.close">Schließen</button>');
};

/* ----- Archiv ----- */
function trainArchiveHTML() {
  var html = '<button class="btn primary" data-action="arch.newFolder">+ Neuer Ordner</button><div class="spacer"></div>';
  if (!S.training.archive.length) html += '<p class="muted">Noch keine Ordner. Erstelle z. B. „Aufbauspiel“, „Standards“, „Athletik“.</p>';
  S.training.archive.forEach(function (f) {
    html += '<button class="card row spread" data-action="arch.open" data-id="' + f.id + '">' +
      '<div><div class="strong">📁 ' + esc(f.name) + '</div><div class="small muted">' + (f.items || []).length + ' Inhalte</div></div><span class="muted">›</span></button>';
  });
  return html;
}
Actions['arch.newFolder'] = function () {
  var name = prompt('Name des Ordners:');
  if (!name) return;
  S.training.archive.push({ id: uid(), name: name.trim(), items: [] });
  save(); render(); toast('Ordner erstellt');
};
Actions['arch.open'] = function (el) { archFolder(el.dataset.id); };
function archFolder(id) {
  var f = S.training.archive.find(function (x) { return x.id === id; });
  if (!f) return;
  var html = '<h3>📁 ' + esc(f.name) + '</h3><div id="arch-items">';
  (f.items || []).forEach(function (it) {
    var icon = it.type === 'video' ? '🎬' : it.type === 'image' ? '📷' : '📝';
    html += '<div class="card block"><div class="block-head"><span class="strong">' + icon + ' ' + esc(it.title || 'Inhalt') + '</span>' +
      '<button class="icon-btn" data-action="arch.delItem" data-f="' + f.id + '" data-i="' + it.id + '">✕</button></div>' +
      (it.type === 'text' ? '<div class="block-text">' + esc(it.text).replace(/\n/g, '<br>') + '</div>' : '<div id="ai-' + it.id + '"></div>') +
      '</div>';
  });
  html += '</div>';
  html += '<div class="row gap wrap">' +
    '<button class="btn ghost grow" data-action="arch.addItem" data-id="' + f.id + '" data-k="image">📷 Bild</button>' +
    '<button class="btn ghost grow" data-action="arch.addItem" data-id="' + f.id + '" data-k="video">🎬 Video</button>' +
    '<button class="btn ghost grow" data-action="arch.addItem" data-id="' + f.id + '" data-k="text">📝 Notiz/Übung</button></div>' +
    '<div class="spacer"></div><button class="btn ghost" data-action="arch.renameFolder" data-id="' + f.id + '">Ordner umbenennen</button>';
  openSheet(html, function () {
    (f.items || []).forEach(function (it) {
      if (it.type !== 'text') {
        var host = document.getElementById('ai-' + it.id);
        if (host) host.appendChild(mediaEl(it.mediaId, it.type));
      }
    });
  });
}
Actions['arch.addItem'] = function (el) {
  var f = S.training.archive.find(function (x) { return x.id === el.dataset.id; });
  if (el.dataset.k === 'text') {
    openSheet('<h3>Übung/Notiz</h3><label>Titel</label><input id="an-title" placeholder="z. B. Rondo 5v2">' +
      '<label>Inhalt</label><textarea id="an-text" rows="5"></textarea>' +
      '<button class="btn primary" data-action="arch.saveText" data-id="' + f.id + '">Speichern</button>');
    return;
  }
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = el.dataset.k === 'video' ? 'video/*' : 'image/*';
  inp.onchange = function () {
    var file = inp.files[0];
    if (!file) return;
    var title = prompt('Titel für dieses Medium:', file.name.replace(/\.[^.]+$/, ''));
    Media.put(file).then(function (mid) {
      f.items.push({ id: uid(), type: el.dataset.k, mediaId: mid, title: title || 'Inhalt' });
      save(); archFolder(f.id); toast('Gespeichert');
    });
  };
  inp.click();
};
Actions['arch.saveText'] = function (el) {
  var f = S.training.archive.find(function (x) { return x.id === el.dataset.id; });
  var title = document.getElementById('an-title').value.trim();
  var text = document.getElementById('an-text').value.trim();
  if (!title && !text) return;
  f.items.push({ id: uid(), type: 'text', title: title || 'Notiz', text: text });
  save(); archFolder(f.id); toast('Gespeichert');
};
Actions['arch.delItem'] = function (el) {
  var f = S.training.archive.find(function (x) { return x.id === el.dataset.f; });
  var it = f.items.find(function (x) { return x.id === el.dataset.i; });
  f.items = f.items.filter(function (x) { return x.id !== it.id; });
  if (it.mediaId) Media['delete'](it.mediaId);
  save(); archFolder(f.id);
};
Actions['arch.renameFolder'] = function (el) {
  var f = S.training.archive.find(function (x) { return x.id === el.dataset.id; });
  var name = prompt('Neuer Name:', f.name);
  if (!name) return;
  f.name = name.trim();
  save(); archFolder(f.id); render();
};
