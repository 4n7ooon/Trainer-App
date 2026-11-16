/* Views: Spieler-Datenbank, Taktik-Coach, Vereins-Datenbank */

var POSITIONS = ['TW', 'LV', 'IV', 'RV', 'DM', 'ZM', 'OM', 'LM', 'RM', 'LA', 'RA', 'MS'];
var SKILL_LABELS = { schuss: 'Schuss', pass: 'Pass', dribbling: 'Dribbling', verteidigung: 'Verteidigung', technik: 'Technik', kopfball: 'Kopfball', kondition: 'Kondition', taktik: 'Taktik' };

function skillAvg(p) {
  var vals = Object.keys(SKILL_LABELS).map(function (k) { return p.skills[k] || 0; }).filter(function (v) { return v > 0; });
  if (!vals.length) return 0;
  return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
}
function einsatzStats(p) {
  var mins = 0, goals = 0, assists = 0, cards = 0, ratings = [];
  (p.einsaetze || []).forEach(function (e) { mins += e.minutes || 0; if (e.rating) ratings.push(e.rating); });
  S.matches.forEach(function (m) {
    (m.events || []).forEach(function (ev) {
      if (ev.type === 'tor' && ev.playerId === p.id) goals++;
      if (ev.type === 'tor' && ev.assistId === p.id) assists++;
      if ((ev.type === 'gelb' || ev.type === 'rot') && ev.playerId === p.id) cards++;
    });
  });
  return {
    minutes: mins, goals: goals, assists: assists, cards: cards,
    spiele: (p.einsaetze || []).length,
    note: ratings.length ? (ratings.reduce(function (a, b) { return a + b; }, 0) / ratings.length) : 0
  };
}

/* ================= SPIELER-DATENBANK ================= */
Routes['spieler'] = function (app) {
  var html = '<div class="row gap wrap">' +
    '<button class="btn primary grow" data-action="pl.new">+ Spieler</button>' +
    '<button class="btn ki grow" data-action="pl.kiGroup">🤖 KI-Teamanalyse</button></div><div class="spacer"></div>';
  var list = S.players.slice().sort(byName);
  list.forEach(function (p) {
    var st = einsatzStats(p);
    var avg = skillAvg(p);
    var teams = (p.teamIds || []).map(function (tid) { var t = teamById(tid); return t ? esc(t.name) : ''; }).filter(Boolean).join('/');
    html += '<button class="card row spread" data-action="pl.open" data-id="' + p.id + '">' +
      '<div class="row gap"><span class="nr-badge">' + esc(p.trikotNr || '–') + '</span>' +
      '<div><div class="strong">' + esc(p.name) + '</div>' +
      '<div class="small muted">' + (p.positions || []).join(', ') + (teams ? ' · ' + teams : '') + '</div></div></div>' +
      '<div class="row gap">' +
      (avg ? '<span class="pts-badge">' + avg.toFixed(1) + ' ⌀</span>' : '') +
      (st.spiele ? '<span class="small muted">' + st.goals + '⚽ ' + st.assists + '🅰️</span>' : '') +
      '<span class="muted">›</span></div></button>';
  });
  app.innerHTML = html;
};
Actions['pl.new'] = function () {
  openSheet('<h3>Neuer Spieler</h3><label>Name</label><input id="np-name">' +
    '<label>Trikotnummer</label><input id="np-nr" inputmode="numeric">' +
    '<button class="btn primary" data-action="pl.create">Anlegen</button>');
};
Actions['pl.create'] = function () {
  var name = document.getElementById('np-name').value.trim();
  if (!name) { toast('Bitte Namen eingeben'); return; }
  S.players.push({
    id: uid(), name: name, cents: 0, trikotNr: document.getElementById('np-nr').value.trim(),
    teamIds: [], positions: [],
    skills: { schuss: 0, pass: 0, dribbling: 0, verteidigung: 0, technik: 0, kopfball: 0, kondition: 0, taktik: 0 },
    attrs: { groesse: '', gewicht: '', statur: '', staerken: '', probleme: '', einsetzbarkeit: '' },
    trainingCount: 0, trainingsLeistung: [], einsaetze: [], trikotHad: false, note: ''
  });
  save(); closeSheet(); render(); toast('Spieler angelegt');
};

Actions['pl.open'] = function (el) { playerDetail(el.dataset.id); };

function playerDetail(id) {
  var p = playerById(id);
  if (!p) return;
  var st = einsatzStats(p);
  var html = '<h3>' + esc(p.name) + (p.trikotNr ? ' <span class="nr-badge">' + esc(p.trikotNr) + '</span>' : '') + '</h3>';
  html += '<div class="stat-grid">' +
    '<div class="stat"><div class="stat-v">' + st.spiele + '</div><div class="stat-l">Spiele</div></div>' +
    '<div class="stat"><div class="stat-v">' + st.goals + '</div><div class="stat-l">Tore</div></div>' +
    '<div class="stat"><div class="stat-v">' + st.assists + '</div><div class="stat-l">Assists</div></div>' +
    '<div class="stat"><div class="stat-v">' + st.minutes + '</div><div class="stat-l">Minuten</div></div>' +
    '<div class="stat"><div class="stat-v">' + (st.note ? st.note.toFixed(1) : '–') + '</div><div class="stat-l">Spielnote</div></div>' +
    '<div class="stat"><div class="stat-v">' + p.trainingCount + '</div><div class="stat-l">Trainings</div></div></div>';

  html += '<h3 class="sub">Stammdaten</h3>' +
    '<div class="row gap"><div class="grow"><label>Trikotnummer</label><input id="pd-nr" inputmode="numeric" value="' + esc(p.trikotNr) + '"></div>' +
    '<div class="grow"><label>Größe (cm)</label><input id="pd-gro" inputmode="numeric" value="' + esc(p.attrs.groesse) + '"></div>' +
    '<div class="grow"><label>Gewicht (kg)</label><input id="pd-gew" inputmode="numeric" value="' + esc(p.attrs.gewicht) + '"></div></div>' +
    '<label>Statur</label><input id="pd-stat" value="' + esc(p.attrs.statur) + '" placeholder="z. B. kräftig, schnell, schlank">' +
    '<label>Positionen</label><div class="chip-row">' +
    POSITIONS.map(function (pos) {
      var on = (p.positions || []).indexOf(pos) >= 0;
      return '<button class="chip' + (on ? ' active' : '') + '" data-action="pl.pos" data-id="' + p.id + '" data-pos="' + pos + '">' + pos + '</button>';
    }).join('') + '</div>' +
    '<label>Mannschaften</label><div class="chip-row">' +
    S.teams.map(function (t) {
      var on = (p.teamIds || []).indexOf(t.id) >= 0;
      return '<button class="chip' + (on ? ' active' : '') + '" data-action="pl.team" data-id="' + p.id + '" data-t="' + t.id + '">' + esc(t.name) + ' (' + t.format + 'er)</button>';
    }).join('') + '</div>';

  html += '<h3 class="sub">Fußballerisches Können (1–5)</h3><div class="skill-list">';
  Object.keys(SKILL_LABELS).forEach(function (k) {
    html += '<div class="skill-row"><span>' + SKILL_LABELS[k] + '</span><div class="stars">' +
      [1, 2, 3, 4, 5].map(function (v) {
        return '<button class="star' + ((p.skills[k] || 0) >= v ? ' on' : '') + '" data-action="pl.skill" data-id="' + p.id + '" data-k="' + k + '" data-v="' + v + '">★</button>';
      }).join('') + '</div></div>';
  });
  html += '</div>';

  html += '<h3 class="sub">Eigenschaften & Beobachtungen</h3>' +
    '<label>Gute Eigenschaften</label><textarea id="pd-stark" rows="2" placeholder="z. B. schnell, zweikampfstark, guter Blick…">' + esc(p.attrs.staerken) + '</textarea>' +
    '<label>Probleme / Baustellen</label><textarea id="pd-prob" rows="2" placeholder="z. B. Kopfball, Konzentration nach Halbzeit…">' + esc(p.attrs.probleme) + '</textarea>' +
    '<label>Einsetzbarkeit</label><input id="pd-eins" value="' + esc(p.attrs.einsetzbarkeit) + '" placeholder="z. B. überall, nur Außen, nicht TW">' +
    '<label>Notizen</label><textarea id="pd-note" rows="2">' + esc(p.note) + '</textarea>';

  html += '<h3 class="sub">Training</h3>' +
    '<div class="row gap"><button class="btn ghost grow" data-action="pl.trainPlus" data-id="' + p.id + '">✓ Beim Training dabei (+1)</button>' +
    '<button class="btn ghost grow" data-action="pl.trainRate" data-id="' + p.id + '">⭐ Trainingsleistung bewerten</button></div>' +
    (p.trainingsLeistung.length ? '<div class="small muted">Letzte Bewertungen: ' + p.trainingsLeistung.slice(-5).map(function (r) { return r + '★'; }).join(', ') + '</div>' : '');

  if ((p.einsaetze || []).length) {
    html += '<h3 class="sub">Spielhistorie</h3>';
    p.einsaetze.slice().reverse().slice(0, 10).forEach(function (e) {
      html += '<div class="card row spread"><div class="small">' + esc(e.gegner) + ' · ' + fmtDate(e.date) + '</div>' +
        '<div class="small muted">' + (e.minutes || 0) + ' Min · ' + esc(e.pos || '') + (e.rating ? ' · ' + e.rating + '★' : '') + '</div></div>';
    });
  }

  html += '<div class="spacer"></div>' +
    '<button class="btn ki grow" data-action="pl.ki" data-id="' + p.id + '">🤖 KI-Analyse für diesen Spieler</button>' +
    '<div class="spacer"></div>' +
    '<div class="row gap"><button class="btn primary grow" data-action="pl.save" data-id="' + p.id + '">Speichern</button>' +
    '<button class="btn danger grow" data-action="pl.delete" data-id="' + p.id + '">Löschen</button></div>';

  openSheet(html);
}
Actions['pl.pos'] = function (el) {
  var p = playerById(el.dataset.id);
  p.positions = p.positions || [];
  var i = p.positions.indexOf(el.dataset.pos);
  if (i >= 0) { p.positions.splice(i, 1); el.classList.remove('active'); }
  else { p.positions.push(el.dataset.pos); el.classList.add('active'); }
  save();
};
Actions['pl.team'] = function (el) {
  var p = playerById(el.dataset.id);
  p.teamIds = p.teamIds || [];
  var i = p.teamIds.indexOf(el.dataset.t);
  if (i >= 0) { p.teamIds.splice(i, 1); el.classList.remove('active'); }
  else { p.teamIds.push(el.dataset.t); el.classList.add('active'); }
  save();
};
Actions['pl.skill'] = function (el) {
  var p = playerById(el.dataset.id);
  var v = parseInt(el.dataset.v, 10);
  p.skills[el.dataset.k] = (p.skills[el.dataset.k] === v) ? 0 : v;
  var stars = el.parentElement.querySelectorAll('.star');
  stars.forEach(function (s, i) { s.classList.toggle('on', i < p.skills[el.dataset.k]); });
  save();
};
Actions['pl.trainPlus'] = function (el) {
  var p = playerById(el.dataset.id);
  p.trainingCount++;
  save(); toast(p.name + ': ' + p.trainingCount + ' Trainings');
};
Actions['pl.trainRate'] = function (el) {
  var p = playerById(el.dataset.id);
  openSheet('<h3>Trainingsleistung: ' + esc(p.name) + '</h3><div class="stars big">' +
    [1, 2, 3, 4, 5].map(function (v) {
      return '<button class="star" data-action="pl.trainRateSet" data-id="' + p.id + '" data-v="' + v + '">★</button>';
    }).join('') + '</div>');
};
Actions['pl.trainRateSet'] = function (el) {
  var p = playerById(el.dataset.id);
  p.trainingsLeistung.push(parseInt(el.dataset.v, 10));
  save(); closeSheet(); toast('Bewertet: ' + el.dataset.v + '★');
};
Actions['pl.save'] = function (el) {
  var p = playerById(el.dataset.id);
  p.trikotNr = document.getElementById('pd-nr').value.trim();
  p.attrs.groesse = document.getElementById('pd-gro').value.trim();
  p.attrs.gewicht = document.getElementById('pd-gew').value.trim();
  p.attrs.statur = document.getElementById('pd-stat').value.trim();
  p.attrs.staerken = document.getElementById('pd-stark').value.trim();
  p.attrs.probleme = document.getElementById('pd-prob').value.trim();
  p.attrs.einsetzbarkeit = document.getElementById('pd-eins').value.trim();
  p.note = document.getElementById('pd-note').value.trim();
  save(); closeSheet(); render(); toast('Gespeichert');
};
Actions['pl.delete'] = function (el) {
  confirmDlg('Spieler wirklich löschen? Punkte, Historie und Einsätze werden mitgelöscht.', function () {
    S.players = S.players.filter(function (p) { return p.id !== el.dataset.id; });
    S.trikotOrder = S.trikotOrder.filter(function (id) { return id !== el.dataset.id; });
    S.teams.forEach(function (t) { t.playerIds = t.playerIds.filter(function (id) { return id !== el.dataset.id; }); });
    save(); closeSheet(); render(); toast('Gelöscht');
  });
};
Actions['pl.ki'] = function (el) {
  var p = playerById(el.dataset.id);
  var tips = KI.playerAnalysis(p);
  openSheet('<h3>🤖 KI-Analyse: ' + esc(p.name) + '</h3><div class="ki-box">' + tips.map(function (t) { return '<p>• ' + esc(t) + '</p>'; }).join('') + '</div>' +
    '<button class="btn ghost" data-action="sheet.close">Schließen</button>');
};
Actions['pl.kiGroup'] = function () {
  var tips = KI.teamAnalysis();
  openSheet('<h3>🤖 KI-Teamanalyse</h3><div class="ki-box">' + tips.map(function (t) { return '<p>• ' + esc(t) + '</p>'; }).join('') + '</div>' +
    '<button class="btn ghost" data-action="sheet.close">Schließen</button>');
};

/* ================= TAKTIK-COACH ================= */
var FORMATIONS = {
  '11': {
    '4-1-4-1': [
      { pos: 'TW', x: 50, y: 5 },
      { pos: 'LV', x: 14, y: 24 }, { pos: 'IV', x: 38, y: 20 }, { pos: 'IV', x: 62, y: 20 }, { pos: 'RV', x: 86, y: 24 },
      { pos: 'DM', x: 50, y: 40 },
      { pos: 'LM', x: 14, y: 58 }, { pos: 'ZM', x: 38, y: 53 }, { pos: 'ZM', x: 62, y: 53 }, { pos: 'RM', x: 86, y: 58 },
      { pos: 'MS', x: 50, y: 82 }
    ],
    '4-2-3-1': [
      { pos: 'TW', x: 50, y: 5 },
      { pos: 'LV', x: 14, y: 24 }, { pos: 'IV', x: 38, y: 20 }, { pos: 'IV', x: 62, y: 20 }, { pos: 'RV', x: 86, y: 24 },
      { pos: 'ZM', x: 38, y: 40 }, { pos: 'ZM', x: 62, y: 40 },
      { pos: 'LA', x: 14, y: 62 }, { pos: 'OM', x: 50, y: 58 }, { pos: 'RA', x: 86, y: 62 },
      { pos: 'MS', x: 50, y: 84 }
    ],
    '3-4-2-1': [
      { pos: 'TW', x: 50, y: 5 },
      { pos: 'IV', x: 30, y: 20 }, { pos: 'IV', x: 50, y: 18 }, { pos: 'IV', x: 70, y: 20 },
      { pos: 'LM', x: 12, y: 44 }, { pos: 'ZM', x: 38, y: 40 }, { pos: 'ZM', x: 62, y: 40 }, { pos: 'RM', x: 88, y: 44 },
      { pos: 'LA', x: 34, y: 64 }, { pos: 'RA', x: 66, y: 64 },
      { pos: 'MS', x: 50, y: 84 }
    ],
    '3-4-1-2': [
      { pos: 'TW', x: 50, y: 5 },
      { pos: 'IV', x: 30, y: 20 }, { pos: 'IV', x: 50, y: 18 }, { pos: 'IV', x: 70, y: 20 },
      { pos: 'LM', x: 12, y: 44 }, { pos: 'ZM', x: 38, y: 40 }, { pos: 'ZM', x: 62, y: 40 }, { pos: 'RM', x: 88, y: 44 },
      { pos: 'OM', x: 50, y: 60 },
      { pos: 'MS', x: 38, y: 80 }, { pos: 'MS', x: 62, y: 80 }
    ],
    '4-4-2': [
      { pos: 'TW', x: 50, y: 5 },
      { pos: 'LV', x: 14, y: 24 }, { pos: 'IV', x: 38, y: 20 }, { pos: 'IV', x: 62, y: 20 }, { pos: 'RV', x: 86, y: 24 },
      { pos: 'LM', x: 14, y: 52 }, { pos: 'ZM', x: 38, y: 48 }, { pos: 'ZM', x: 62, y: 48 }, { pos: 'RM', x: 86, y: 52 },
      { pos: 'MS', x: 38, y: 78 }, { pos: 'MS', x: 62, y: 78 }
    ],
    '4-3-3': [
      { pos: 'TW', x: 50, y: 5 },
      { pos: 'LV', x: 14, y: 24 }, { pos: 'IV', x: 38, y: 20 }, { pos: 'IV', x: 62, y: 20 }, { pos: 'RV', x: 86, y: 24 },
      { pos: 'ZM', x: 30, y: 46 }, { pos: 'DM', x: 50, y: 40 }, { pos: 'ZM', x: 70, y: 46 },
      { pos: 'LA', x: 14, y: 70 }, { pos: 'MS', x: 50, y: 78 }, { pos: 'RA', x: 86, y: 70 }
    ]
  },
  '9': {
    '3-3-2': [
      { pos: 'TW', x: 50, y: 6 },
      { pos: 'IV', x: 30, y: 24 }, { pos: 'IV', x: 50, y: 21 }, { pos: 'IV', x: 70, y: 24 },
      { pos: 'LM', x: 15, y: 50 }, { pos: 'ZM', x: 50, y: 46 }, { pos: 'RM', x: 85, y: 50 },
      { pos: 'MS', x: 38, y: 76 }, { pos: 'MS', x: 62, y: 76 }
    ],
    '3-2-3': [
      { pos: 'TW', x: 50, y: 6 },
      { pos: 'IV', x: 30, y: 24 }, { pos: 'IV', x: 50, y: 21 }, { pos: 'IV', x: 70, y: 24 },
      { pos: 'ZM', x: 38, y: 46 }, { pos: 'ZM', x: 62, y: 46 },
      { pos: 'LA', x: 15, y: 72 }, { pos: 'MS', x: 50, y: 78 }, { pos: 'RA', x: 85, y: 72 }
    ],
    '4-3-1': [
      { pos: 'TW', x: 50, y: 6 },
      { pos: 'LV', x: 14, y: 26 }, { pos: 'IV', x: 38, y: 22 }, { pos: 'IV', x: 62, y: 22 }, { pos: 'RV', x: 86, y: 26 },
      { pos: 'ZM', x: 30, y: 50 }, { pos: 'ZM', x: 50, y: 46 }, { pos: 'ZM', x: 70, y: 50 },
      { pos: 'MS', x: 50, y: 74 }
    ],
    '2-3-3': [
      { pos: 'TW', x: 50, y: 6 },
      { pos: 'IV', x: 38, y: 24 }, { pos: 'IV', x: 62, y: 24 },
      { pos: 'LM', x: 15, y: 50 }, { pos: 'ZM', x: 50, y: 46 }, { pos: 'RM', x: 85, y: 50 },
      { pos: 'LA', x: 15, y: 74 }, { pos: 'MS', x: 50, y: 80 }, { pos: 'RA', x: 85, y: 74 }
    ],
    '3-1-3-1': [
      { pos: 'TW', x: 50, y: 6 },
      { pos: 'IV', x: 30, y: 24 }, { pos: 'IV', x: 50, y: 21 }, { pos: 'IV', x: 70, y: 24 },
      { pos: 'DM', x: 50, y: 40 },
      { pos: 'LA', x: 15, y: 62 }, { pos: 'ZM', x: 50, y: 58 }, { pos: 'RA', x: 85, y: 62 },
      { pos: 'MS', x: 50, y: 80 }
    ]
  }
};
var POS_FAMILY = { TW: 'TW', LV: 'Abwehr', IV: 'Abwehr', RV: 'Abwehr', DM: 'Mittelfeld', ZM: 'Mittelfeld', OM: 'Mittelfeld', LM: 'Mittelfeld', RM: 'Mittelfeld', LA: 'Sturm', RA: 'Sturm', MS: 'Sturm' };

var taktikTeam = '';
var taktikFormation = '';
Actions['taktik.setTeam'] = function (el) {
  taktikTeam = el.dataset.t;
  var t = teamById(taktikTeam);
  taktikFormation = t && t.format === '9' ? '3-3-2' : '4-2-3-1';
  window._taktikSlots = null;
  render();
};
Actions['taktik.setFormation'] = function (el) { taktikFormation = el.dataset.f; window._taktikSlots = null; render(); };

Routes['taktik'] = function (app) {
  if (!taktikTeam && S.teams.length) { taktikTeam = S.teams[0].id; }
  var team = teamById(taktikTeam);
  var format = team ? team.format : '11';
  if (!taktikFormation || !FORMATIONS[format][taktikFormation]) taktikFormation = Object.keys(FORMATIONS[format])[0];
  ensureTaktikSlots();

  var html = '<div class="chip-row">' + S.teams.map(function (t) {
    return '<button class="chip' + (taktikTeam === t.id ? ' active' : '') + '" data-action="taktik.setTeam" data-t="' + t.id + '">' + esc(t.name) + ' (' + t.format + 'er)</button>';
  }).join('') + '</div>';
  html += '<div class="chip-row">' + Object.keys(FORMATIONS[format]).map(function (f) {
    return '<button class="chip' + (taktikFormation === f ? ' active' : '') + '" data-action="taktik.setFormation" data-f="' + f + '">' + f + '</button>';
  }).join('') + '</div>';

  html += '<div class="pitch" id="pitch">';
  FORMATIONS[format][taktikFormation].forEach(function (slot, i) {
    var assigned = window._taktikSlots[i] && window._taktikSlots[i].playerId ? playerById(window._taktikSlots[i].playerId) : null;
    var nr = assigned && assigned.trikotNr ? assigned.trikotNr : '';
    html += '<button class="slot' + (assigned ? ' filled' : '') + '" style="left:' + slot.x + '%;top:' + (100 - slot.y) + '%" ' +
      'data-action="taktik.slot" data-i="' + i + '">' +
      '<span class="slot-pos">' + slot.pos + '</span>' +
      '<span class="slot-name">' + (assigned ? esc(assigned.name.split(' ')[0]) : '+') + '</span>' +
      (nr ? '<span class="slot-nr">' + esc(nr) + '</span>' : '') +
      '</button>';
  });
  html += '</div>';
  html += '<div class="row gap wrap">' +
    '<button class="btn ki grow" data-action="taktik.auto">🤖 KI-Aufstellung</button>' +
    '<button class="btn primary grow" data-action="taktik.save">💾 Speichern</button>' +
    '<button class="btn ghost grow" data-action="taktik.clear">Leeren</button></div>';
  html += '<div class="spacer"></div><h3 class="sub">Gespeicherte Aufstellungen</h3>';
  var saved = S.tactics.lineups.filter(function (l) { return l.teamId === taktikTeam; });
  if (!saved.length) html += '<p class="muted small">Noch keine gespeicherten Aufstellungen für dieses Team.</p>';
  saved.forEach(function (l) {
    html += '<div class="card row spread"><div><div class="strong">' + esc(l.name) + '</div><div class="small muted">' + esc(l.formation) + '</div></div>' +
      '<div class="row gap"><button class="btn ghost small-btn" data-action="taktik.load" data-id="' + l.id + '">Laden</button>' +
      '<button class="icon-btn" data-action="taktik.delLineup" data-id="' + l.id + '">✕</button></div></div>';
  });

  html += '<div class="spacer"></div><div class="card"><h3>🤖 Taktik-Chat & Gegneranalyse</h3>' +
    '<label>Gegner-Einschätzung</label>' +
    '<textarea id="opp-spielweise" rows="2" placeholder="Spielweise: z. B. ballbesitzorientiert, hoch stehend…">' + esc(S.tactics.opponent.spielweise) + '</textarea>' +
    '<textarea id="opp-staerke" rows="2" placeholder="Stärke: z. B. schnelle Außen, große Stürmer…">' + esc(S.tactics.opponent.staerke) + '</textarea>' +
    '<textarea id="opp-taktik" rows="2" placeholder="Taktik/Aufstellung: z. B. 4-4-2 flach, konterstark…">' + esc(S.tactics.opponent.taktik) + '</textarea>' +
    '<button class="btn ki" data-action="taktik.oppAdvice">🤖 Taktik-Empfehlung erstellen</button>' +
    '<div class="spacer"></div>' +
    '<div id="chat-log" class="chat-log">';
  S.tactics.chat.slice(-30).forEach(function (m) {
    html += '<div class="chat-msg ' + (m.role === 'user' ? 'me' : 'ki') + '">' + esc(m.text).replace(/\n/g, '<br>') + '</div>';
  });
  html += '</div>' +
    '<div class="row gap"><input id="chat-input" placeholder="Frag die Taktik-KI…">' +
    '<button class="btn primary" data-action="taktik.chatSend">➤</button></div></div>';
  app.innerHTML = html;
};

function ensureTaktikSlots() {
  var format = (teamById(taktikTeam) || { format: '11' }).format;
  var slots = FORMATIONS[format][taktikFormation];
  if (!window._taktikSlots || window._taktikSlots.length !== slots.length) {
    window._taktikSlots = slots.map(function (s) { return { pos: s.pos, playerId: null }; });
  }
}
Actions['taktik.slot'] = function (el) {
  ensureTaktikSlots();
  var i = parseInt(el.dataset.i, 10);
  var slot = window._taktikSlots[i];
  var family = POS_FAMILY[slot.pos] || 'Mittelfeld';
  var pool = S.players.slice().sort(byName).sort(function (a, b) {
    var af = (a.positions || []).indexOf(family) >= 0 ? 1 : 0;
    var bf = (b.positions || []).indexOf(family) >= 0 ? 1 : 0;
    return bf - af;
  });
  var html = '<h3>Position: ' + esc(slot.pos) + '</h3><div class="pick-list">';
  pool.forEach(function (p) {
    var fit = (p.positions || []).indexOf(family) >= 0;
    var used = window._taktikSlots.some(function (s, j) { return s.playerId === p.id && j !== i; });
    html += '<button class="pick-row' + (fit ? ' fit' : '') + '" data-action="taktik.assign" data-i="' + i + '" data-pid="' + p.id + '">' +
      '<span>' + esc(p.name) + (p.trikotNr ? ' <span class="muted">#' + esc(p.trikotNr) + '</span>' : '') + (used ? ' <span class="small muted">(bereits aufgestellt)</span>' : '') + '</span>' +
      '<span class="small muted">' + (p.positions || []).join(',') + ' · ' + skillAvg(p).toFixed(1) + '</span></button>';
  });
  html += '</div>';
  if (slot.playerId) html += '<button class="btn danger" data-action="taktik.unassign" data-i="' + i + '">Spieler entfernen</button>';
  openSheet(html);
};
Actions['taktik.assign'] = function (el) {
  ensureTaktikSlots();
  window._taktikSlots[parseInt(el.dataset.i, 10)].playerId = el.dataset.pid;
  save(); closeSheet(); render();
};
Actions['taktik.unassign'] = function (el) {
  ensureTaktikSlots();
  window._taktikSlots[parseInt(el.dataset.i, 10)].playerId = null;
  save(); closeSheet(); render();
};
Actions['taktik.auto'] = function () {
  ensureTaktikSlots();
  window._taktikSlots = KI.autoLineup(taktikFormation, (teamById(taktikTeam) || {}).format || '11');
  save(); render(); toast('KI-Aufstellung erstellt');
};
Actions['taktik.clear'] = function () {
  ensureTaktikSlots();
  window._taktikSlots.forEach(function (s) { s.playerId = null; });
  save(); render();
};
Actions['taktik.save'] = function () {
  ensureTaktikSlots();
  var name = prompt('Name der Aufstellung:', taktikFormation + ' vs. ?');
  if (!name) return;
  S.tactics.lineups.push({ id: uid(), name: name.trim(), teamId: taktikTeam, formation: taktikFormation, slots: JSON.parse(JSON.stringify(window._taktikSlots)) });
  save(); render(); toast('Aufstellung gespeichert');
};
Actions['taktik.load'] = function (el) {
  var l = S.tactics.lineups.find(function (x) { return x.id === el.dataset.id; });
  taktikFormation = l.formation;
  window._taktikSlots = JSON.parse(JSON.stringify(l.slots));
  render(); toast('Geladen');
};
Actions['taktik.delLineup'] = function (el) {
  S.tactics.lineups = S.tactics.lineups.filter(function (l) { return l.id !== el.dataset.id; });
  save(); render();
};
Actions['taktik.oppAdvice'] = function () {
  S.tactics.opponent = {
    spielweise: document.getElementById('opp-spielweise').value.trim(),
    staerke: document.getElementById('opp-staerke').value.trim(),
    taktik: document.getElementById('opp-taktik').value.trim(),
    aufstellung: document.getElementById('opp-taktik').value.trim()
  };
  save();
  var advice = KI.tacticalAdvice(S.tactics.opponent, taktikFormation);
  S.tactics.chat.push({ role: 'user', text: 'Gegner: ' + [S.tactics.opponent.spielweise, S.tactics.opponent.staerke, S.tactics.opponent.taktik].filter(Boolean).join(' | ') });
  S.tactics.chat.push({ role: 'ki', text: advice });
  save();
  openSheet('<h3>🤖 Taktik-Empfehlung</h3><div class="ki-box">' + advice.split('\n').map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div>' +
    '<button class="btn ghost" data-action="sheet.close">Schließen</button>');
};
Actions['taktik.chatSend'] = function () {
  var inp = document.getElementById('chat-input');
  var v = inp.value.trim();
  if (!v) return;
  S.tactics.chat.push({ role: 'user', text: v });
  var answer = KI.chat(v);
  S.tactics.chat.push({ role: 'ki', text: answer });
  inp.value = '';
  save(); render();
};

/* ================= VEREINS-DATENBANK ================= */
Routes['verein'] = function (app) {
  var html = '<div class="card"><h3>' + (S.settings.clubName ? esc(S.settings.clubName) : 'Verein') + '</h3>' +
    '<p class="small muted">Vereinsname, Farben und Grundeinstellungen pflegst du unter ⚙︎ Einstellungen – alles bleibt flexibel, wenn du den Verein oder die Jahrgangsstufe wechselst.</p>' +
    '<button class="btn ghost" data-action="nav.settings">Zu den Einstellungen</button></div>';
  html += '<h3 class="sub">Mannschaften</h3>';
  html += '<button class="btn primary" data-action="team.new">+ Neue Mannschaft</button><div class="spacer"></div>';
  S.teams.forEach(function (t) {
    var count = S.players.filter(function (p) { return (p.teamIds || []).indexOf(t.id) >= 0; }).length;
    html += '<button class="card row spread" data-action="team.open" data-id="' + t.id + '">' +
      '<div><div class="strong">' + esc(t.name) + ' <span class="muted small">(' + t.format + 'er)</span></div>' +
      '<div class="small muted">' + count + ' Spieler</div></div><span class="muted">›</span></button>';
  });
  app.innerHTML = html;
};
Actions['team.new'] = function () {
  openSheet('<h3>Neue Mannschaft</h3><label>Name</label><input id="nt-name" placeholder="z. B. C1, C2, später B1">' +
    '<label>Spielform</label><div class="seg" id="nt-format">' +
    '<button class="seg-btn active" data-action="team.setFormat" data-f="11">11er</button>' +
    '<button class="seg-btn" data-action="team.setFormat" data-f="9">9er</button></div>' +
    '<button class="btn primary" data-action="team.create">Erstellen</button>');
  window._ntFormat = '11';
};
Actions['team.setFormat'] = function (el) {
  window._ntFormat = el.dataset.f;
  document.querySelectorAll('#nt-format .seg-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.f === el.dataset.f); });
};
Actions['team.create'] = function () {
  var name = document.getElementById('nt-name').value.trim();
  if (!name) { toast('Bitte Namen eingeben'); return; }
  S.teams.push({ id: uid(), name: name, format: window._ntFormat || '11', playerIds: [] });
  save(); closeSheet(); render(); toast('Mannschaft erstellt');
};
Actions['team.open'] = function (el) { teamDetail(el.dataset.id); };
function teamDetail(id) {
  var t = teamById(id);
  if (!t) return;
  var html = '<h3>' + esc(t.name) + '</h3>' +
    '<div class="row gap"><div class="grow"><label>Name</label><input id="td-name" value="' + esc(t.name) + '"></div></div>' +
    '<label>Spielform (zeitlos umstellbar)</label><div class="seg">' +
    '<button class="seg-btn' + (t.format === '11' ? ' active' : '') + '" data-action="team.setFormatEdit" data-id="' + t.id + '" data-f="11">11er</button>' +
    '<button class="seg-btn' + (t.format === '9' ? ' active' : '') + '" data-action="team.setFormatEdit" data-id="' + t.id + '" data-f="9">9er</button></div>' +
    '<div class="spacer"></div><button class="btn primary" data-action="team.saveEdit" data-id="' + t.id + '">Speichern</button>' +
    '<div class="spacer"></div><h3 class="sub">Kader (Spieler sind fluide – mehreren Mannschaften möglich)</h3>' +
    '<div class="pick-list">';
  S.players.slice().sort(byName).forEach(function (p) {
    var on = (p.teamIds || []).indexOf(t.id) >= 0;
    html += '<button class="pick-row' + (on ? ' fit' : '') + '" data-action="team.togglePlayer" data-t="' + t.id + '" data-pid="' + p.id + '">' +
      '<span>' + esc(p.name) + (p.trikotNr ? ' <span class="muted">#' + esc(p.trikotNr) + '</span>' : '') + '</span>' +
      '<span>' + (on ? '✓' : '+') + '</span></button>';
  });
  html += '</div>';
  openSheet(html);
}
Actions['team.setFormatEdit'] = function (el) {
  var t = teamById(el.dataset.id);
  t.format = el.dataset.f;
  document.querySelectorAll('[data-action="team.setFormatEdit"]').forEach(function (b) {
    b.classList.toggle('active', b.dataset.f === t.format);
  });
  save();
};
Actions['team.saveEdit'] = function (el) {
  var t = teamById(el.dataset.id);
  t.name = document.getElementById('td-name').value.trim() || t.name;
  save(); closeSheet(); render(); toast('Gespeichert');
};
Actions['team.togglePlayer'] = function (el) {
  var p = playerById(el.dataset.pid);
  p.teamIds = p.teamIds || [];
  var i = p.teamIds.indexOf(el.dataset.t);
  if (i >= 0) { p.teamIds.splice(i, 1); el.classList.remove('fit'); el.lastElementChild.textContent = '+'; }
  else { p.teamIds.push(el.dataset.t); el.classList.add('fit'); el.lastElementChild.textContent = '✓'; }
  save();
};
