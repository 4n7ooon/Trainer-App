/* View: Spieltag – Spiele, Live-Ticker, Timer, 1-Klick-Events, Minuten-Übertragung */

Routes['spieltag'] = function (app) {
  var html = '<button class="btn primary" data-action="match.new">+ Neues Spiel</button><div class="spacer"></div>';
  var matches = S.matches.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
  if (!matches.length) html += '<p class="muted">Noch keine Spiele angelegt.</p>';
  matches.forEach(function (m) {
    var sc = matchScore(m);
    var badge = m.status === 'live' ? '<span class="pts-badge hot">● LIVE</span>' :
      m.status === 'done' ? '<span class="pts-badge good">Fertig</span>' : '<span class="pts-badge">Vorbereitung</span>';
    html += '<button class="card row spread" data-action="match.open" data-id="' + m.id + '">' +
      '<div><div class="strong">' + esc(m.opponent || 'Gegner offen') + (m.home === 'away' ? ' (auswärts)' : ' (heim)') + '</div>' +
      '<div class="small muted">' + fmtDate(m.date) + ' · ' + esc((teamById(m.teamId) || { name: '?' }).name) + ' · 2 × ' + m.halfLen + ' Min</div></div>' +
      '<div class="row gap">' + (m.status !== 'setup' ? '<span class="score">' + sc[0] + ':' + sc[1] + '</span>' : '') + badge + '</div></button>';
  });
  app.innerHTML = html;
};

function matchScore(m) {
  var g = 0, k = 0;
  (m.events || []).forEach(function (ev) {
    if (ev.type === 'tor') g++;
    if (ev.type === 'gegentor') k++;
  });
  return [g, k];
}
function matchById(id) { return S.matches.find(function (m) { return m.id === id; }) || null; }

Actions['match.new'] = function () {
  var html = '<h3>Neues Spiel</h3>' +
    '<label>Gegner</label><input id="nm-opp" placeholder="z. B. FC Holzhausen">' +
    '<label>Datum</label><input type="date" id="nm-date" value="' + todayISO() + '">' +
    '<label>Heim/Auswärts</label><div class="seg" id="nm-home">' +
    '<button class="seg-btn active" data-action="match.setHome" data-v="home">Heim</button>' +
    '<button class="seg-btn" data-action="match.setHome" data-v="away">Auswärts</button></div>' +
    '<label>Mannschaft</label><div class="chip-row">' +
    S.teams.map(function (t, i) {
      return '<button class="chip' + (i === 0 ? ' active' : '') + '" data-action="match.setTeamPick" data-t="' + t.id + '">' + esc(t.name) + '</button>';
    }).join('') + '</div>' +
    '<label>Halbzeitlänge (Minuten)</label><input type="number" id="nm-half" value="' + S.settings.halfLength + '" min="5" max="60">' +
    '<p class="small muted">Zeitlos: pro Spiel einstellbar (C-Jugend 35, B-Jugend 40 …).</p>' +
    '<button class="btn primary" data-action="match.create">Anlegen</button>';
  openSheet(html);
  window._nmHome = 'home';
  window._nmTeam = S.teams.length ? S.teams[0].id : null;
};
Actions['match.setHome'] = function (el) {
  window._nmHome = el.dataset.v;
  document.querySelectorAll('#nm-home .seg-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.v === el.dataset.v); });
};
Actions['match.setTeamPick'] = function (el) {
  window._nmTeam = el.dataset.t;
  document.querySelectorAll('[data-action="match.setTeamPick"]').forEach(function (b) { b.classList.toggle('active', b.dataset.t === el.dataset.t); });
};
Actions['match.create'] = function () {
  var m = {
    id: uid(), date: document.getElementById('nm-date').value,
    opponent: document.getElementById('nm-opp').value.trim(),
    home: window._nmHome, teamId: window._nmTeam,
    halfLen: Math.max(5, parseInt(document.getElementById('nm-half').value, 10) || S.settings.halfLength || 35),
    status: 'setup', lineup: [], events: [], ratings: {}, minutes: {},
    squad: [], squadChosen: false, formation: '',
    clock: { running: false, base: 0, startedAt: null, half: 1 }
  };
  S.matches.push(m);
  save(); closeSheet(); matchSquadSheet(m);
};
Actions['match.open'] = function (el) { matchOpen(el.dataset.id); };

function matchOpen(id) {
  var m = matchById(id);
  if (!m) return;
  if (m.status === 'live') {
    if (currentRoute() === 'spieltag') render(); else nav('spieltag');
    return;
  }
  if (m.status === 'done') { nav('spiel-' + m.id); return; }
  if (!m.squadChosen) matchSquadSheet(m); else matchSetup(m);
}

/* ---------- Schritt 1: Kader auswählen ---------- */
function matchSquadSheet(m) {
  var pool = teamPlayers(m.teamId);
  var html = '<h3>1/2 · Kader für ' + esc(m.opponent || 'das Spiel') + '</h3>' +
    '<p class="small muted">Wer ist dabei? Tippe Spieler an, um sie zum Kader hinzuzufügen/entfernen.</p>' +
    '<div class="row gap wrap">' +
    '<button class="btn ghost small-btn grow" data-action="match.squadAll" data-id="' + m.id + '">Alle</button>' +
    '<button class="btn ghost small-btn grow" data-action="match.squadNone" data-id="' + m.id + '">Keinen</button></div>' +
    '<div class="spacer"></div><div class="pick-list">';
  pool.forEach(function (p) {
    var inSquad = (m.squad || []).indexOf(p.id) >= 0;
    html += '<button class="pick-row' + (inSquad ? ' fit' : '') + '" data-action="match.toggleSquad" data-id="' + m.id + '" data-pid="' + p.id + '">' +
      '<span>' + esc(p.name) + (p.trikotNr ? ' <span class="muted">#' + esc(p.trikotNr) + '</span>' : '') + '</span>' +
      '<span class="small muted">' + (inSquad ? '✓ dabei' : '+') + '</span></button>';
  });
  html += '</div><div class="spacer"></div>' +
    '<button class="btn primary grow" data-action="match.toLineup" data-id="' + m.id + '">Weiter zur Aufstellung ➜</button>';
  openSheet(html);
}
Actions['match.toggleSquad'] = function (el) {
  var m = matchById(el.dataset.id);
  var pid = el.dataset.pid;
  var i = (m.squad || []).indexOf(pid);
  if (!m.squad) m.squad = [];
  if (i >= 0) { m.squad.splice(i, 1); el.classList.remove('fit'); el.querySelector('span:last-child').textContent = '+'; }
  else { m.squad.push(pid); el.classList.add('fit'); el.querySelector('span:last-child').textContent = '✓ dabei'; }
  save();
};
Actions['match.squadAll'] = function (el) {
  var m = matchById(el.dataset.id);
  m.squad = teamPlayers(m.teamId).map(function (p) { return p.id; });
  save(); matchSquadSheet(m);
};
Actions['match.squadNone'] = function (el) {
  var m = matchById(el.dataset.id);
  m.squad = [];
  save(); matchSquadSheet(m);
};
Actions['match.toLineup'] = function (el) {
  var m = matchById(el.dataset.id);
  if (!(m.squad || []).length) { toast('Erst Kader auswählen'); return; }
  m.squadChosen = true;
  save(); closeSheet(); matchSetup(m);
};
Actions['match.editSquad'] = function (el) {
  var m = matchById(el.dataset.id);
  save(); matchSquadSheet(m);
};

/* ---------- Schritt 2: Aufstellung (Pitch-Grafik wie Taktik-Coach) ---------- */
function matchEnsureLineup(m) {
  var team = teamById(m.teamId);
  var format = team ? team.format : '11';
  if (!m.formation || !FORMATIONS[format][m.formation]) m.formation = format === '9' ? '3-3-2' : '4-2-3-1';
  var slots = FORMATIONS[format][m.formation];
  if (!m.lineup || m.lineup.length !== slots.length) {
    var old = m.lineup || [];
    m.lineup = slots.map(function (s, i) {
      return { playerId: (old[i] && old[i].playerId) || null, pos: s.pos };
    });
  } else {
    m.lineup.forEach(function (s, i) { s.pos = slots[i].pos; });
  }
}

function matchSetup(m) {
  matchEnsureLineup(m);
  if (!m.squad || !m.squad.length) m.squad = teamPlayers(m.teamId).map(function (p) { return p.id; });
  var team = teamById(m.teamId);
  var format = team ? team.format : '11';
  var slots = FORMATIONS[format][m.formation];
  var squad = m.squad.map(playerById).filter(Boolean);
  var starters = m.lineup.filter(function (s) { return s.playerId; }).length;
  var bench = squad.filter(function (p) { return !m.lineup.some(function (s) { return s.playerId === p.id; }); });
  var html = '<h3>2/2 · Aufstellung vs. ' + esc(m.opponent || '?') + '</h3>' +
    '<label>Gegner</label><input id="ms-opp" value="' + esc(m.opponent) + '">' +
    '<div class="row gap"><div class="grow"><label>Datum</label><input type="date" id="ms-date" value="' + esc(m.date) + '"></div>' +
    '<div class="grow"><label>Halbzeit (Min)</label><input type="number" id="ms-half" value="' + m.halfLen + '" min="5" max="60"></div></div>' +
    '<div class="spacer"></div>' +
    '<div class="chip-row">' + Object.keys(FORMATIONS[format]).map(function (f) {
      return '<button class="chip' + (m.formation === f ? ' active' : '') + '" data-action="match.setFormation" data-id="' + m.id + '" data-f="' + f + '">' + f + '</button>';
    }).join('') + '</div>' +
    '<div class="pitch" id="pitch">';
  slots.forEach(function (slot, i) {
    var assigned = m.lineup[i] && m.lineup[i].playerId ? playerById(m.lineup[i].playerId) : null;
    var nr = assigned && assigned.trikotNr ? assigned.trikotNr : '';
    html += '<button class="slot' + (assigned ? ' filled' : '') + '" style="left:' + slot.x + '%;top:' + (100 - slot.y) + '%" ' +
      'data-action="match.slot" data-id="' + m.id + '" data-i="' + i + '">' +
      '<span class="slot-pos">' + slot.pos + '</span>' +
      '<span class="slot-name">' + (assigned ? esc(assigned.name.split(' ')[0]) : '+') + '</span>' +
      (nr ? '<span class="slot-nr">' + esc(nr) + '</span>' : '') +
      '</button>';
  });
  html += '</div>' +
    '<div class="row gap wrap">' +
    '<button class="btn ghost grow" data-action="match.loadLineup" data-id="' + m.id + '">📂 Aus Taktik-Coach</button>' +
    '<button class="btn ki grow" data-action="match.kiLineup" data-id="' + m.id + '">🤖 KI-Aufstellung</button></div>' +
    '<div class="spacer"></div>' +
    '<h3 class="sub">⭐ Startaufstellung (' + starters + ')</h3>' +
    (starters ? m.lineup.filter(function (s) { return s.playerId; }).map(function (s) {
      var p = playerById(s.playerId);
      return '<div class="card row spread"><div><span class="strong">' + esc(p.name) + '</span>' +
        (p.trikotNr ? ' <span class="muted small">#' + esc(p.trikotNr) + '</span>' : '') +
        ' <span class="pts-badge">' + esc(s.pos) + '</span></div>' +
        '<button class="icon-btn" data-action="match.removeStarter" data-id="' + m.id + '" data-pid="' + p.id + '">✕</button></div>';
    }).join('') : '<p class="muted small">Tippe Positionen auf dem Platz an, um Spieler zuzuordnen.</p>') +
    '<h3 class="sub">🪑 Bank (' + bench.length + ')</h3><div class="pick-list">' +
    (bench.length ? bench.map(function (p) {
      return '<button class="pick-row" data-action="match.addStarter" data-id="' + m.id + '" data-pid="' + p.id + '">' +
        '<span>' + esc(p.name) + (p.trikotNr ? ' <span class="muted">#' + esc(p.trikotNr) + '</span>' : '') + '</span>' +
        '<span class="small muted">' + (p.positions || []).join(',') + ' +</span></button>';
    }).join('') : '<p class="muted small">Alle Kader-Spieler stehen in der Startaufstellung.</p>') +
    '</div><div class="spacer"></div>' +
    '<div class="row gap wrap">' +
    '<button class="btn ghost grow" data-action="match.editSquad" data-id="' + m.id + '">👥 Kader ändern</button>' +
    '<button class="btn primary grow" data-action="match.start" data-id="' + m.id + '">▶️ Anpfiff – Spiel starten</button></div>' +
    '<div class="spacer"></div><button class="btn danger small-btn" data-action="match.delete" data-id="' + m.id + '">Spiel löschen</button>';
  openSheet(html);
}
Actions['match.setFormation'] = function (el) {
  var m = matchById(el.dataset.id);
  var team = teamById(m.teamId);
  var format = team ? team.format : '11';
  if (!FORMATIONS[format][el.dataset.f]) return;
  m.formation = el.dataset.f;
  var old = m.lineup || [];
  m.lineup = FORMATIONS[format][m.formation].map(function (s, i) {
    return { playerId: (old[i] && old[i].playerId) || null, pos: s.pos };
  });
  save(); matchSetup(m);
};
Actions['match.slot'] = function (el) {
  var m = matchById(el.dataset.id);
  matchEnsureLineup(m);
  var i = parseInt(el.dataset.i, 10);
  var slot = FORMATIONS[(teamById(m.teamId) || { format: '11' }).format][m.formation][i];
  var cur = m.lineup[i];
  var family = POS_FAMILY[slot.pos] || 'Mittelfeld';
  var squad = (m.squad || []).map(playerById).filter(Boolean);
  var pool = squad.slice().sort(byName).sort(function (a, b) {
    var af = (a.positions || []).indexOf(family) >= 0 ? 1 : 0;
    var bf = (b.positions || []).indexOf(family) >= 0 ? 1 : 0;
    return bf - af;
  });
  var html = '<h3>Position: ' + esc(slot.pos) + '</h3><div class="pick-list">';
  pool.forEach(function (p) {
    var fit = (p.positions || []).indexOf(family) >= 0;
    var used = m.lineup.some(function (s, j) { return s.playerId === p.id && j !== i; });
    html += '<button class="pick-row' + (fit ? ' fit' : '') + '" data-action="match.assign" data-id="' + m.id + '" data-i="' + i + '" data-pid="' + p.id + '">' +
      '<span>' + esc(p.name) + (p.trikotNr ? ' <span class="muted">#' + esc(p.trikotNr) + '</span>' : '') + (used ? ' <span class="small muted">(bereits aufgestellt)</span>' : '') + '</span>' +
      '<span class="small muted">' + (p.positions || []).join(',') + '</span></button>';
  });
  html += '</div>';
  if (cur && cur.playerId) html += '<div class="spacer"></div><button class="btn danger grow" data-action="match.unassign" data-id="' + m.id + '" data-i="' + i + '">Spieler von Position nehmen</button>';
  openSheet(html);
};
Actions['match.assign'] = function (el) {
  var m = matchById(el.dataset.id);
  matchEnsureLineup(m);
  m.lineup[parseInt(el.dataset.i, 10)].playerId = el.dataset.pid;
  save(); closeSheet(); matchSetup(m);
};
Actions['match.unassign'] = function (el) {
  var m = matchById(el.dataset.id);
  matchEnsureLineup(m);
  m.lineup[parseInt(el.dataset.i, 10)].playerId = null;
  save(); closeSheet(); matchSetup(m);
};
Actions['match.addStarter'] = function (el) {
  var m = matchById(el.dataset.id);
  matchEnsureLineup(m);
  if (m.lineup.some(function (s) { return s.playerId === el.dataset.pid; })) return;
  var free = m.lineup.findIndex(function (s) { return !s.playerId; });
  if (free < 0) { toast('Alle Positionen sind besetzt'); return; }
  m.lineup[free].playerId = el.dataset.pid;
  save(); matchSetup(m);
};
Actions['match.removeStarter'] = function (el) {
  var m = matchById(el.dataset.id);
  matchEnsureLineup(m);
  m.lineup.forEach(function (s) { if (s.playerId === el.dataset.pid) s.playerId = null; });
  save(); matchSetup(m);
};
function teamPlayers(teamId) {
  var t = teamById(teamId);
  if (t && (t.playerIds || []).length) return t.playerIds.map(playerById).filter(Boolean);
  return S.players.slice();
}
Actions['match.loadLineup'] = function (el) {
  var m = matchById(el.dataset.id);
  var saved = S.tactics.lineups.filter(function (l) { return l.teamId === m.teamId; });
  if (!saved.length) { toast('Keine gespeicherten Aufstellungen für dieses Team'); return; }
  var html = '<h3>Aufstellung laden</h3><div class="pick-list">';
  saved.forEach(function (l) {
    html += '<button class="pick-row" data-action="match.loadLineupPick" data-id="' + m.id + '" data-l="' + l.id + '">' +
      '<span>' + esc(l.name) + '</span><span class="small muted">' + esc(l.formation) + '</span></button>';
  });
  html += '</div>';
  openSheet(html);
};
Actions['match.loadLineupPick'] = function (el) {
  var m = matchById(el.dataset.id);
  var l = S.tactics.lineups.find(function (x) { return x.id === el.dataset.l; });
  var team = teamById(m.teamId);
  var format = team ? team.format : '11';
  if (FORMATIONS[format][l.formation]) m.formation = l.formation;
  var slots = FORMATIONS[format][m.formation];
  var src = l.slots || [];
  m.lineup = slots.map(function (s, i) {
    return { playerId: (src[i] && src[i].playerId && playerById(src[i].playerId)) ? src[i].playerId : null, pos: s.pos };
  });
  if (!m.squad || !m.squad.length) m.squad = teamPlayers(m.teamId).map(function (p) { return p.id; });
  save(); closeSheet(); matchSetup(m); toast('Aufstellung übernommen');
};
Actions['match.kiLineup'] = function (el) {
  var m = matchById(el.dataset.id);
  matchEnsureLineup(m);
  var slots = KI.autoLineup(m.formation, (teamById(m.teamId) || {}).format || '11', m.teamId);
  var squad = m.squad || [];
  if (squad.length) {
    var inSquad = {};
    squad.forEach(function (id) { inSquad[id] = true; });
    var seen = {};
    slots = slots.map(function (s) {
      if (s.playerId && inSquad[s.playerId] && !seen[s.playerId]) { seen[s.playerId] = true; return s; }
      return { pos: s.pos, playerId: null };
    });
  }
  m.lineup = slots;
  save(); matchSetup(m); toast('KI-Aufstellung eingesetzt');
};
Actions['match.start'] = function (el) {
  var m = matchById(el.dataset.id);
  m.opponent = document.getElementById('ms-opp').value.trim();
  m.date = document.getElementById('ms-date').value;
  m.halfLen = Math.max(5, parseInt(document.getElementById('ms-half').value, 10) || 35);
  if (!m.lineup.some(function (s) { return s.playerId; })) { toast('Mindestens 1 Spieler aufstellen'); return; }
  m.status = 'live';
  m.clock = { running: true, base: 0, startedAt: Date.now(), half: 1 };
  save(); closeSheet();
  if (currentRoute() === 'spieltag') render(); else nav('spieltag');
  startTicker();
  toast('Anpfiff! 🏁');
};
Actions['match.delete'] = function (el) {
  confirmDlg('Dieses Spiel wirklich löschen?', function () {
    S.matches = S.matches.filter(function (m) { return m.id !== el.dataset.id; });
    save(); closeSheet(); render();
  });
};

/* ---------- Live ---------- */
var tickerInterval = null;
function startTicker() {
  if (tickerInterval) clearInterval(tickerInterval);
  tickerInterval = setInterval(function () {
    var m = S.matches.find(function (x) { return x.status === 'live'; });
    var el = document.getElementById('live-timer');
    if (m && el) el.textContent = fmtClock(matchMinute(m), m.halfLen, m.clock.half);
    else if (!m && tickerInterval) { clearInterval(tickerInterval); tickerInterval = null; }
  }, 1000);
}
function matchMinute(m) {
  if (!m.clock) return 0;
  return m.clock.base + (m.clock.running ? (Date.now() - m.clock.startedAt) / 60000 : 0);
}
function fmtClock(min, halfLen, half) {
  min = Math.floor(min);
  return String(min).padStart(2, '0') + "' · Halbzeit " + half;
}
function onPitchPlayers(m) {
  var ids = m.lineup.map(function (s) { return s.playerId; });
  var off = {};
  (m.events || []).forEach(function (ev) {
    if (ev.type === 'wechsel') {
      off[ev.outId] = true;
      ids.push(ev.inId);
    }
    if (ev.type === 'rot') off[ev.playerId] = true;
  });
  return ids.filter(function (id, i) { return ids.indexOf(id) === i; })
    .filter(function (id) { return !off[id] && playerById(id); })
    .map(playerById);
}
function benchPlayers(m) {
  var onPitch = onPitchPlayers(m).map(function (p) { return p.id; });
  var pool = (m.squad || []).map(playerById).filter(Boolean);
  if (!pool.length) pool = teamPlayers(m.teamId);
  return pool.filter(function (p) { return onPitch.indexOf(p.id) < 0; });
}

function renderLive(m) {
  var app = document.getElementById('view');
  var sc = matchScore(m);
  var min = matchMinute(m);
  var html = '<div class="scoreboard">' +
    '<div class="sb-team">' + (m.home === 'home' ? esc(S.settings.clubName || 'Wir') : esc(m.opponent)) + '</div>' +
    '<div class="sb-score">' + sc[0] + ' : ' + sc[1] + '</div>' +
    '<div class="sb-team">' + (m.home === 'home' ? esc(m.opponent) : esc(S.settings.clubName || 'Wir')) + '</div>' +
    '</div>' +
    '<div class="live-timer" id="live-timer">' + fmtClock(min, m.halfLen, m.clock.half) + '</div>' +
    '<div class="row gap">' +
    (m.clock.running
      ? '<button class="btn ghost grow" data-action="live.pause" data-id="' + m.id + '">⏸ Pause</button>'
      : '<button class="btn primary grow" data-action="live.resume" data-id="' + m.id + '">▶️ Weiter</button>') +
    (m.clock.half === 1
      ? '<button class="btn ghost grow" data-action="live.half2" data-id="' + m.id + '">2. Halbzeit</button>'
      : '') +
    '<button class="btn danger grow" data-action="live.end" data-id="' + m.id + '">🏁 Abpfiff</button></div>' +
    '<div class="spacer"></div>' +
    '<div class="event-grid">' +
    '<button class="ev-btn tor" data-action="live.goal" data-id="' + m.id + '">⚽<span>TOR</span></button>' +
    '<button class="ev-btn gegentor" data-action="live.gegentor" data-id="' + m.id + '">🥅<span>Gegentor</span></button>' +
    '<button class="ev-btn gelb" data-action="live.gelb" data-id="' + m.id + '">🟨<span>Gelb</span></button>' +
    '<button class="ev-btn rot" data-action="live.rot" data-id="' + m.id + '">🟥<span>Rot</span></button>' +
    '<button class="ev-btn wechsel" data-action="live.wechsel" data-id="' + m.id + '">🔄<span>Wechsel</span></button>' +
    '<button class="ev-btn notiz" data-action="live.notiz" data-id="' + m.id + '">💬<span>Notiz</span></button>' +
    '</div>' +
    '<h3 class="sub">Ticker</h3><div id="ticker-feed">';
  (m.events || []).slice().reverse().forEach(function (ev) {
    html += tickerRow(m, ev);
  });
  if (!(m.events || []).length) html += '<p class="muted small">Noch keine Ereignisse.</p>';
  html += '</div>' +
    '<div class="spacer"></div><details class="card"><summary>⭐ Aufstellung (' + onPitchPlayers(m).length + ' auf dem Platz)</summary><div class="chip-row">' +
    onPitchPlayers(m).map(function (p) { return '<span class="chip active small-chip">' + esc(p.name) + (p.trikotNr ? ' #' + esc(p.trikotNr) : '') + '</span>'; }).join('') +
    '</div></details>' +
    '<details class="card"><summary>🪑 Bank (' + benchPlayers(m).length + ')</summary><div class="chip-row">' +
    benchPlayers(m).map(function (p) { return '<span class="chip small-chip">' + esc(p.name) + (p.trikotNr ? ' #' + esc(p.trikotNr) : '') + '</span>'; }).join('') +
    '</div></details>';
  app.innerHTML = html;
  renderHeader('spieltag');
  var t = document.querySelector('.header-title');
  if (t) t.textContent = 'LIVE: ' + (m.opponent || 'Spiel');
}
function tickerRow(m, ev) {
  var p = playerById(ev.playerId);
  var name = p ? p.name : '?';
  var txt = '';
  if (ev.type === 'tor') {
    var a = playerById(ev.assistId);
    txt = '⚽ TOR! ' + name + (a ? ' (Assist: ' + a.name + ')' : '');
  } else if (ev.type === 'gegentor') txt = '🥅 Gegentor';
  else if (ev.type === 'gelb') txt = '🟨 Gelb: ' + name;
  else if (ev.type === 'rot') txt = '🟥 Rot: ' + name;
  else if (ev.type === 'wechsel') {
    var pin = playerById(ev.inId), pout = playerById(ev.outId);
    txt = '🔄 ' + (pin ? pin.name : '?') + ' ↑ / ' + (pout ? pout.name : '?') + ' ↓';
  } else if (ev.type === 'notiz') txt = '💬 ' + ev.text;
  return '<div class="card ticker-row"><span class="tick-min">' + ev.minute + "'</span><span>" + esc(txt) + '</span></div>';
}

function addEvent(m, ev) {
  ev.id = uid();
  ev.minute = Math.max(0, Math.floor(matchMinute(m)));
  ev.ts = Date.now();
  m.events.push(ev);
  save();
}
Actions['live.pause'] = function (el) {
  var m = matchById(el.dataset.id);
  m.clock.base = matchMinute(m);
  m.clock.running = false;
  save(); renderLive(m);
};
Actions['live.resume'] = function (el) {
  var m = matchById(el.dataset.id);
  m.clock.running = true;
  m.clock.startedAt = Date.now();
  save(); renderLive(m); startTicker();
};
Actions['live.half2'] = function (el) {
  var m = matchById(el.dataset.id);
  m.clock.base = m.halfLen;
  m.clock.running = true;
  m.clock.startedAt = Date.now();
  m.clock.half = 2;
  save(); renderLive(m); toast('2. Halbzeit!');
};
Actions['live.end'] = function (el) {
  var m = matchById(el.dataset.id);
  confirmDlg('Abpfiff? Die Spielminuten werden automatisch in die Spieler-Datenbank übertragen.', function () {
    m.clock.base = matchMinute(m);
    m.clock.running = false;
    m.status = 'done';
    m.totalMin = Math.round(m.clock.base);
    writeMinutes(m);
    save(); closeSheet(); ratingSheet(m);
  });
};

/* Tor: 1 Klick Spieler, 1 Klick Assist (oder überspringen) */
Actions['live.goal'] = function (el) {
  var m = matchById(el.dataset.id);
  var on = onPitchPlayers(m);
  if (!on.length) { toast('Keine Spieler auf dem Platz'); return; }
  openSheet('<h3>⚽ Wer hat das Tor geschossen?</h3><div class="grid-pick">' +
    on.map(function (p) {
      return '<button class="grid-pick-btn" data-action="live.goalScorer" data-id="' + m.id + '" data-pid="' + p.id + '">' +
        '<b>' + esc(p.name.split(' ')[0]) + '</b>' + (p.trikotNr ? '<span class="small muted">#' + esc(p.trikotNr) + '</span>' : '') + '</button>';
    }).join('') + '</div>');
};
Actions['live.goalScorer'] = function (el) {
  var m = matchById(el.dataset.id);
  var pid = el.dataset.pid;
  var on = onPitchPlayers(m);
  openSheet('<h3>🅰️ Assist? (optional)</h3><div class="grid-pick">' +
    '<button class="grid-pick-btn none" data-action="live.goalSave" data-id="' + m.id + '" data-pid="' + pid + '">Kein Assist</button>' +
    on.filter(function (p) { return p.id !== pid; }).map(function (p) {
      return '<button class="grid-pick-btn" data-action="live.goalSave" data-id="' + m.id + '" data-pid="' + pid + '" data-a="' + p.id + '">' +
        '<b>' + esc(p.name.split(' ')[0]) + '</b>' + (p.trikotNr ? '<span class="small muted">#' + esc(p.trikotNr) + '</span>' : '') + '</button>';
    }).join('') + '</div>');
};
Actions['live.goalSave'] = function (el) {
  var m = matchById(el.dataset.id);
  addEvent(m, { type: 'tor', playerId: el.dataset.pid, assistId: el.dataset.a || null });
  closeSheet(); renderLive(m);
  var p = playerById(el.dataset.pid);
  toast('⚽ TOR! ' + (p ? p.name : ''));
};
Actions['live.gegentor'] = function (el) {
  var m = matchById(el.dataset.id);
  addEvent(m, { type: 'gegentor' });
  renderLive(m); toast('Gegentor vermerkt');
};
Actions['live.gelb'] = function (el) {
  var m = matchById(el.dataset.id);
  var on = onPitchPlayers(m);
  openSheet('<h3>🟨 Gelbe Karte: wer?</h3><div class="grid-pick">' +
    on.map(function (p) {
      return '<button class="grid-pick-btn" data-action="live.cardSave" data-id="' + m.id + '" data-pid="' + p.id + '" data-k="gelb">' +
        '<b>' + esc(p.name.split(' ')[0]) + '</b></button>';
    }).join('') + '</div>');
};
Actions['live.rot'] = function (el) {
  var m = matchById(el.dataset.id);
  var on = onPitchPlayers(m);
  openSheet('<h3>🟥 Rote Karte: wer?</h3><div class="grid-pick">' +
    on.map(function (p) {
      return '<button class="grid-pick-btn" data-action="live.cardSave" data-id="' + m.id + '" data-pid="' + p.id + '" data-k="rot">' +
        '<b>' + esc(p.name.split(' ')[0]) + '</b></button>';
    }).join('') + '</div>');
};
Actions['live.cardSave'] = function (el) {
  var m = matchById(el.dataset.id);
  addEvent(m, { type: el.dataset.k, playerId: el.dataset.pid });
  closeSheet(); renderLive(m);
  var p = playerById(el.dataset.pid);
  toast((el.dataset.k === 'gelb' ? '🟨' : '🟥') + ' für ' + (p ? p.name : ''));
};
Actions['live.wechsel'] = function (el) {
  var m = matchById(el.dataset.id);
  var on = onPitchPlayers(m);
  var bench = benchPlayers(m);
  if (!bench.length) { toast('Keine Auswechselspieler verfügbar'); return; }
  openSheet('<h3>🔄 Wer geht raus?</h3><div class="grid-pick">' +
    on.map(function (p) {
      return '<button class="grid-pick-btn" data-action="live.wechselOut" data-id="' + m.id + '" data-out="' + p.id + '">' +
        '<b>' + esc(p.name.split(' ')[0]) + '</b></button>';
    }).join('') + '</div>');
};
Actions['live.wechselOut'] = function (el) {
  var m = matchById(el.dataset.id);
  var out = el.dataset.out;
  var bench = benchPlayers(m);
  openSheet('<h3>🔄 Wer kommt rein?</h3><div class="grid-pick">' +
    bench.map(function (p) {
      return '<button class="grid-pick-btn" data-action="live.wechselSave" data-id="' + m.id + '" data-out="' + out + '" data-in="' + p.id + '">' +
        '<b>' + esc(p.name.split(' ')[0]) + '</b></button>';
    }).join('') + '</div>');
};
Actions['live.wechselSave'] = function (el) {
  var m = matchById(el.dataset.id);
  addEvent(m, { type: 'wechsel', outId: el.dataset.out, inId: el.dataset.in });
  closeSheet(); renderLive(m);
  var p = playerById(el.dataset.in);
  toast('🔄 ' + (p ? p.name : '') + ' ist im Spiel');
};
Actions['live.notiz'] = function (el) {
  var m = matchById(el.dataset.id);
  openSheet('<h3>💬 Ticker-Notiz</h3><input id="note-text" placeholder="z. B. Doppelwechsel, Ansprache…">' +
    '<button class="btn primary" data-action="live.notizSave" data-id="' + m.id + '">Eintragen</button>');
};
Actions['live.notizSave'] = function (el) {
  var m = matchById(el.dataset.id);
  var v = document.getElementById('note-text').value.trim();
  if (!v) return;
  addEvent(m, { type: 'notiz', text: v });
  closeSheet(); renderLive(m);
};

/* ---------- Abpfiff: Minuten + Bewertung ---------- */
function computeMinutes(m) {
  var total = m.totalMin || 0;
  var intervals = {};
  var seen = {};
  m.lineup.forEach(function (s) {
    if (!s.playerId) return;
    if (!seen[s.playerId]) { intervals[s.playerId] = [{ from: 0, open: true }]; seen[s.playerId] = true; }
  });
  (m.events || []).forEach(function (ev) {
    if (ev.type === 'wechsel') {
      if (intervals[ev.outId]) intervals[ev.outId].push({ from: ev.minute, close: true });
      if (!intervals[ev.inId]) { intervals[ev.inId] = []; seen[ev.inId] = true; }
      intervals[ev.inId].push({ from: ev.minute, open: true });
    }
    if (ev.type === 'rot' && intervals[ev.playerId]) {
      intervals[ev.playerId].push({ from: ev.minute, close: true });
    }
  });
  var mins = {};
  Object.keys(intervals).forEach(function (pid) {
    var open = null, sum = 0;
    intervals[pid].sort(function (a, b) { return a.from - b.from; });
    intervals[pid].forEach(function (iv) {
      if (iv.open) { if (open === null) open = iv.from; }
      else if (iv.close) { if (open !== null) { sum += iv.from - open; open = null; } }
    });
    if (open !== null) sum += total - open;
    mins[pid] = Math.max(0, Math.round(sum));
  });
  return mins;
}
function writeMinutes(m) {
  var mins = computeMinutes(m);
  m.minutes = mins;
  Object.keys(mins).forEach(function (pid) {
    var p = playerById(pid);
    if (!p) return;
    var slot = m.lineup.find(function (s) { return s.playerId === pid; });
    p.einsaetze.push({
      date: m.date, gegner: m.opponent, minutes: mins[pid],
      pos: slot ? slot.pos : '', rating: 0, matchId: m.id
    });
  });
}
function ratingSheet(m) {
  var played = Object.keys(m.minutes || {}).map(playerById).filter(Boolean);
  var html = '<h3>Spielnoten (optional)</h3><p class="small muted">Tippe für jeden Spieler die Note (1 = weltklasse … 5 = schwach). Überspringen ist ok.</p>';
  played.forEach(function (p) {
    html += '<div class="skill-row"><span>' + esc(p.name) + '</span><div class="stars">' +
      [1, 2, 3, 4, 5].map(function (v) {
        return '<button class="star' + ((m.ratings[p.id] || 0) === v ? ' on' : '') + '" data-action="match.rate" data-id="' + m.id + '" data-pid="' + p.id + '" data-v="' + v + '">★</button>';
      }).join('') + '</div></div>';
  });
  html += '<div class="spacer"></div><button class="btn primary grow" data-action="match.finish" data-id="' + m.id + '">Fertigstellen</button>';
  openSheet(html);
}
Actions['match.rate'] = function (el) {
  var m = matchById(el.dataset.id);
  var v = parseInt(el.dataset.v, 10);
  m.ratings[el.dataset.pid] = (m.ratings[el.dataset.pid] === v) ? 0 : v;
  var stars = el.parentElement.querySelectorAll('.star');
  stars.forEach(function (s, i) { s.classList.toggle('on', i < (m.ratings[el.dataset.pid] || 0)); });
  save();
};
Actions['match.finish'] = function (el) {
  var m = matchById(el.dataset.id);
  Object.keys(m.ratings).forEach(function (pid) {
    if (!m.ratings[pid]) return;
    var p = playerById(pid);
    if (p && p.einsaetze.length) {
      var last = p.einsaetze[p.einsaetze.length - 1];
      if (last.matchId === m.id) last.rating = m.ratings[pid];
    }
  });
  save(); closeSheet(); nav('spieltag'); toast('Spiel abgeschlossen ✓');
};

/* ---------- Zusammenfassung ---------- */
function matchSummary(m) {
  var app = document.getElementById('view');
  var sc = matchScore(m);
  var html = '<div class="scoreboard">' +
    '<div class="sb-team">' + (m.home === 'home' ? esc(S.settings.clubName || 'Wir') : esc(m.opponent)) + '</div>' +
    '<div class="sb-score">' + sc[0] + ' : ' + sc[1] + '</div>' +
    '<div class="sb-team">' + (m.home === 'home' ? esc(m.opponent) : esc(S.settings.clubName || 'Wir')) + '</div></div>' +
    '<div class="small muted center">' + fmtDate(m.date) + ' · ' + (m.totalMin || '?') + ' Minuten</div><div class="spacer"></div>';
  html += '<h3 class="sub">Ticker</h3>';
  (m.events || []).slice().reverse().forEach(function (ev) { html += tickerRow(m, ev); });
  if (!(m.events || []).length) html += '<p class="muted small">Keine Ereignisse.</p>';
  html += '<h3 class="sub">Einsatzminuten</h3>';
  Object.keys(m.minutes || {}).forEach(function (pid) {
    var p = playerById(pid);
    if (!p) return;
    var slot = m.lineup.find(function (s) { return s.playerId === pid; });
    html += '<div class="card row spread"><span>' + esc(p.name) + '</span><span class="small muted">' +
      (slot ? esc(slot.pos) + ' · ' : '') + m.minutes[pid] + ' Min' + (m.ratings[pid] ? ' · ' + m.ratings[pid] + '★' : '') + '</span></div>';
  });
  html += '<div class="spacer"></div><button class="btn danger small-btn" data-action="match.delete" data-id="' + m.id + '">Spiel löschen</button>';
  app.innerHTML = html;
}
