/* KI-Engine: lokale Trainer-KI – analysiert gespeicherte Daten und gibt Empfehlungen.
   Läuft komplett offline im Gerät, nutzt Spieler-Datenbank, Trainings- und Spieldaten. */

window.KI = (function () {

  /* ---------- Übungs-Bibliothek nach Themen ---------- */
  var LIB = [
    { keys: ['aufbau', 'aufbauspiel', 'abwehr', 'hintermannschaft', 'aus der tiefe'], ex: [
      'Aufbau über den Sechser: Abwehr 4 + Sechser gegen 3 Presser, freie Spielmacher-Suche (10 Min)',
      'Freispiel-Aufbau: Abwehrkette spielt gegen 2 Stürmer, Ziel: Ball sauber ins Mittelfeld (3 × 6 Min)',
      'Torabschluss nach Aufbau: Aufbau über außen, Flachpass in den Schnitt, Abschluss (2 Reihen)',
      'Spielaufbau mit Zielzone: Pass in die Breite zählt doppelt – erzwingt Umschalten'
    ]},
    { keys: ['pressing', 'gegenpressing', 'umschalten', 'kontersicherung'], ex: [
      'Balleroberung im 5v5: nach Ballverlust sofort 6 Sekunden gemeinsam pressen',
      'Umschaltspiel 4v4 + 2 Neutrale: nach Ballgewinn within 8 Sekunden Abschluss erzwingen',
      'Pressing-Falle außen stellen: Ballwegnahme an der Linie bringt 2 Punkte',
      'Konditionsspiel mit Umschaltmoment: 2 Felder, direkt nach Ballverlust Feldwechsel'
    ]},
    { keys: ['abschluss', 'schuss', 'chancen', 'stürmer', 'torwart-spiel'], ex: [
      'Abschlussserie: Annehmen – Drehen – Schießen, beidfüßig (je 8 Schüsse pro Spieler)',
      '1v1 auf den Torwart: Stürmer gegen TW, Kopf oder Torlinie als Entscheidungsschulung',
      'Abschluss nach Flanke: 3er-Gruppe, Einschätzen von Schnittstelle und zweitem Pfosten',
      'Schnellschuss-Wettkampf: 2 Touch max. vor dem Abschluss'
    ]},
    { keys: ['pass', 'passspiel', 'kombination', 'rondo', 'ballbesitz'], ex: [
      'Rondo 5v2 mit Wandspiel-Punkt: Doppelpass zählt doppelt',
      'Vier-Pass-Kette: A-B-C-D im 10×10-Kästchen, Tempo steigern',
      'Ballbesitz 6v6 + 2: 8 Pässe in Folge = 1 Punkt',
      'Passspiel mit Positionswechsel: nach Pass immer einen Platz aufrücken'
    ]},
    { keys: ['dribbling', '1 gegen 1', 'eins gegen eins', 'sprint', 'finten'], ex: [
      '1v1-Gasse: Angreifer mit 2 Finthema-Vorgaben (z. B. Scissor, Bodyfake)',
      'Dribbling-Parcours mit Tempoabschluss auf kleine Tore',
      '2v2 auf Mini-Tore: Doppelte Punkte nach Dribbling am Gegenspieler vorbei',
      'Königsspiel 1v1: Sieger bleibt, Verlierer kommt raus – Motivation inklusive'
    ]},
    { keys: ['verteidigung', 'zweikampf', 'deckung', 'abwehrverhalten', 'tackling'], ex: [
      'Zweikampf-Schulung 1v1 seitlich + frontal, korrektes Körperpositionieren',
      'Defensive Verschiebung: 4er-Kette schiebt gemeinsam quer (Trainer führt Ball seitlich)',
      'Deckungsarbeit im 4v4: Raumaufteilung im 16er-Bereich',
      'Kopfball-Verteidigung: höherer Ball, Absicherung des zweiten Pfostens'
    ]},
    { keys: ['standard', 'ecke', 'freistoß', 'einwurf'], ex: [
      'Eckball-Varianten: 2 kurze + 1 langer Ball, Besetzung der Zonen',
      'Freistoß direkte + indirekte Variante mit Abspiellösung',
      'Einwurf-Training: schnelle Ausführung, erster Pass in die Tiefe',
      'Abwehr von Standards: Zuordnung Mann-Mann/Raum klären'
    ]},
    { keys: ['kondition', 'athletik', 'sprint', 'ausdauer', 'schnellkraft'], ex: [
      'Intervall-Sprints 6 × 30 Sek mit Ballführung',
      'Staffeln mit Sprungkraft-Elementen (Hürden, Kisten)',
      'Konditionsspiel 4v4 auf kleine Tore: 4 × 4 Min, hohe Intensität',
      'Lauf-ABC + Koordinationsleiter als Warm-up-Block'
    ]},
    { keys: ['taktik', 'spielweise', 'system', 'formation', 'ordnung'], ex: [
      'Positions-Schulung: 8v8 auf halbem Feld mit Positionsbindung',
      'Video-/Tafelrunde: 5 Min Systemklärung mit Magnetboard',
      'Szenario-Spiel: „10 Minuten vor Ende, 1:2 – was tun?"',
      'Raumdeckung vs. Manndeckung im Übungsspiel testen'
    ]}
  ];

  function exercisesFor(topic) {
    var t = (topic || '').toLowerCase();
    var hits = [];
    LIB.forEach(function (block) {
      if (block.keys.some(function (k) { return t.indexOf(k) >= 0; })) hits = hits.concat(block.ex);
    });
    if (!hits.length) {
      LIB.slice(0, 4).forEach(function (b) { hits.push(b.ex[0]); });
    }
    return hits;
  }

  /* ---------- Schwächste Fähigkeiten eines Spielers/Teams ---------- */
  function weakSkills(p, n) {
    var entries = Object.keys(SKILL_LABELS).map(function (k) { return { k: k, v: p.skills[k] || 0 }; })
      .filter(function (e) { return e.v > 0; })
      .sort(function (a, b) { return a.v - b.v; });
    return entries.slice(0, n || 2).map(function (e) { return SKILL_LABELS[e.k]; });
  }
  function teamWeakSkills(playerList) {
    var sum = {}, cnt = {};
    playerList.forEach(function (p) {
      Object.keys(SKILL_LABELS).forEach(function (k) {
        var v = p.skills[k] || 0;
        if (v > 0) { sum[k] = (sum[k] || 0) + v; cnt[k] = (cnt[k] || 0) + 1; }
      });
    });
    return Object.keys(sum).map(function (k) { return { k: k, avg: sum[k] / cnt[k] }; })
      .sort(function (a, b) { return a.avg - b.avg; });
  }

  /* ---------- Empfehlungen für eine Trainingseinheit ---------- */
  function unitSuggestions(u) {
    var tips = [];
    var themeNames = (u.themeIds || []).map(function (id) {
      var t = S.training.themes.find(function (x) { return x.id === id; });
      return t ? t.name : '';
    }).filter(Boolean);
    if (themeNames.length) {
      tips.push('Thema „' + themeNames.join(' + ') + '": bewährte Übungsbausteine:');
      exercisesFor(themeNames.join(' ')).slice(0, 4).forEach(function (ex) { tips.push(ex); });
      var folder = S.training.archive.find(function (f) {
        var fn = f.name.toLowerCase();
        return themeNames.some(function (tn) { return fn.indexOf(tn.toLowerCase().split(' ')[0]) >= 0 || tn.toLowerCase().indexOf(fn.split(' ')[0]) >= 0; });
      });
      if (folder && (folder.items || []).length) {
        tips.push('Im Archiv liegt „' + folder.name + '" mit ' + folder.items.length + ' Inhalten – direkt in die Einheit übernehmen.');
      }
    } else {
      tips.push('Noch kein Themen-Tag gesetzt. Tipp: Erstelle ein Thema (z. B. „Aufbauspiel") und hänge mehrere Einheiten daran auf.');
    }
    var weak = teamWeakSkills(S.players);
    if (weak.length) {
      tips.push('Team-Schwächen laut Datenbank: ' + weak.slice(0, 2).map(function (w) { return SKILL_LABELS[w.k] + ' (' + w.avg.toFixed(1) + ')'; }).join(', ') +
        ' → baue einen Übungsblock dazu, auch wenn das Hauptthema anders liegt.');
    }
    tips.push('Struktur-Tipp: 15 Min Warm-up mit Ball · 20 Min Hauptthema (Technik) · 20 Min Anwendung (kleine Spiele) · 10 Min Abschlussform.');
    var noPlay = S.players.filter(function (p) { return p.trainingCount === 0; });
    if (noPlay.length) {
      tips.push('Achtung: ' + noPlay.slice(0, 3).map(function (p) { return p.name; }).join(', ') + (noPlay.length > 3 ? ' u. a.' : '') + ' noch ohne Trainingsteilnahme-Eintrag.');
    }
    return tips;
  }

  /* ---------- Analyse für einen einzelnen Spieler ---------- */
  function playerAnalysis(p) {
    var tips = [];
    var avg = skillAvg(p);
    if (avg === 0) {
      tips.push('Noch keine Bewertungen eingetragen. Setze erst die Sterne für Schuss, Pass, Dribbling usw. – dann wird die Analyse konkret.');
    } else {
      tips.push('Gesamtniveau: ' + avg.toFixed(1) + ' von 5.');
      var weak = weakSkills(p, 2);
      if (weak.length) {
        tips.push('Fokus im Training: ' + weak.join(' und ') + '. Übungsidee: ' + exercisesFor(weak.join(' '))[0]);
      }
      var strong = Object.keys(SKILL_LABELS).map(function (k) { return { k: k, v: p.skills[k] || 0 }; })
        .sort(function (a, b) { return b.v - a.v; })[0];
      if (strong && strong.v >= 4) tips.push('Stärke: ' + SKILL_LABELS[strong.k] + ' – gebe ihm in Spielen die Verantwortung für diese Situation (z. B. Standards, letzte Reihe, Abschluss).');
    }
    var st = einsatzStats(p);
    if (st.spiele === 0) tips.push('Noch kein Spiel-Einsatz erfasst. Bei wenig Spielzeit: im Training gezielt Selbstvertrauen über Erfolgsserien aufbauen.');
    else {
      tips.push(st.spiele + ' Spiele, ' + st.minutes + ' Minuten, ' + st.goals + ' Tore, ' + st.assists + ' Assists.');
      if (st.note) {
        if (st.note <= 2.5) tips.push('Spielnote ' + st.note.toFixed(1) + ' – gute Form. Belohnung: z. B. Kapitänsbinde für ein Spiel oder „Spieler des Spiels".');
        else if (st.note >= 4) tips.push('Spielnote ' + st.note.toFixed(1) + ' – im Gespräch klären, was ihn blockiert (Position? Vertrauen? Fitness?).');
      }
    }
    if (p.attrs.probleme) tips.push('Baustelle laut Notiz: ' + p.attrs.probleme + ' → 1:1-Hinweis geben, nicht vor der Gruppe.');
    if (p.attrs.staerken) tips.push('Einsetzen bei: ' + p.attrs.staerken);
    if (p.points >= S.settings.boxThreshold) tips.push('Steht beim Strafenkatalog über der Kasten-Grenze – ruhig ansprechen, Motivation über Pluspunkte aufbauen.');
    if (p.points < 0) tips.push('Sehr viele Pluspunkte gesammelt – öffentlich loben, das zieht die anderen mit.');
    return tips;
  }

  /* ---------- Team-Analyse ---------- */
  function teamAnalysis() {
    var tips = [];
    var weak = teamWeakSkills(S.players);
    if (weak.length >= 2) {
      tips.push('Schwächster Team-Bereich: ' + SKILL_LABELS[weak[0].k] + ' (' + weak[0].avg.toFixed(1) + ') vor ' + SKILL_LABELS[weak[1].k] + ' (' + weak[1].avg.toFixed(1) + ').');
      tips.push('Übungsempfehlung für die Gruppe: ' + exercisesFor(SKILL_LABELS[weak[0].k])[0]);
    } else {
      tips.push('Noch wenige Bewertungen in der Datenbank. Bewertungstipp: nach jedem Training 3–5 Spieler kurz bewerten, nach 2 Wochen hast du ein belastbares Bild.');
    }
    var rated = S.players.filter(function (p) { return skillAvg(p) > 0; });
    if (rated.length >= 4) {
      var sorted = rated.slice().sort(function (a, b) { return skillAvg(b) - skillAvg(a); });
      tips.push('Top-Leistungen aktuell: ' + sorted.slice(0, 3).map(function (p) { return p.name + ' (' + skillAvg(p).toFixed(1) + ')'; }).join(', ') + ' → Belohnung: z. B. „Trainings-Krone" der Woche.');
      tips.push('Fördergruppe: ' + sorted.slice(-2).map(function (p) { return p.name; }).join(', ') + ' – kleine Erfolgsserien bauen, Aufgaben mit hoher Erfolgsquote.');
    }
    var scorers = {};
    S.matches.forEach(function (m) {
      (m.events || []).forEach(function (ev) {
        if (ev.type === 'tor') scorers[ev.playerId] = (scorers[ev.playerId] || 0) + 1;
      });
    });
    var top = Object.keys(scorers).sort(function (a, b) { return scorers[b] - scorers[a]; }).slice(0, 2).map(function (id) {
      var p = playerById(id); return p ? p.name + ' (' + scorers[id] + ')' : '';
    }).filter(Boolean);
    if (top.length) tips.push('Torjäger: ' + top.join(', '));
    var benchWarm = S.players.filter(function (p) {
      var st = einsatzStats(p);
      return st.spiele > 0 && st.minutes / st.spiele < 20;
    });
    if (benchWarm.length) tips.push('Wenig Spielzeit: ' + benchWarm.slice(0, 3).map(function (p) { return p.name; }).join(', ') + ' – über mehr Minuten oder klare Rolle nachdenken.');
    tips.push('Hinweis zur Bewertung: Sterne immer in Relation sehen – zu seinem eigenen Niveau UND zur Mannschaft (ein ★★★-Spieler in der C2 ist ein anderes Kaliber als in der C1).');
    return tips;
  }

  /* ---------- Automatische Aufstellung ---------- */
  function roleScore(p, pos) {
    var fam = POS_FAMILY[pos] || 'Mittelfeld';
    var w = { schuss: 0, pass: 0, dribbling: 0, verteidigung: 0, technik: 0, kopfball: 0, kondition: 0, taktik: 0 };
    if (fam === 'TW') return p.positions.indexOf('TW') >= 0 ? 10 : 0;
    if (fam === 'Abwehr') { w.verteidigung = 3; w.kopfball = 2; w.taktik = 2; w.kondition = 1; }
    else if (fam === 'Mittelfeld') { w.pass = 3; w.taktik = 2; w.kondition = 2; w.technik = 1; }
    else if (fam === 'Sturm') { w.schuss = 3; w.dribbling = 2; w.technik = 1; w.kondition = 1; }
    var score = 0, any = 0;
    Object.keys(w).forEach(function (k) {
      if (w[k] > 0) { score += (p.skills[k] || 0) * w[k]; any += 5 * w[k]; }
    });
    var base = any ? score / any * 5 : 2.5;
    if ((p.positions || []).indexOf(pos) >= 0) base += 1.5;
    else if ((p.positions || []).indexOf(fam) >= 0) base += 0.8;
    if (pos === 'TW' && p.positions.indexOf('TW') < 0) return 0.1;
    var st = einsatzStats(p);
    if (st.note) base += (3.5 - st.note) * 0.3;
    return base;
  }
  function autoLineup(formation, format, teamId) {
    var slots = FORMATIONS[format][formation];
    var pool = S.players.slice();
    if (teamId) {
      var teamFiltered = pool.filter(function (p) { return (p.teamIds || []).indexOf(teamId) >= 0; });
      if (teamFiltered.length >= slots.length) pool = teamFiltered;
    }
    var used = {};
    var out = slots.map(function (slot) {
      var best = null, bestScore = -1;
      pool.forEach(function (p) {
        if (used[p.id]) return;
        var sc = roleScore(p, slot.pos);
        if (sc > bestScore) { bestScore = sc; best = p; }
      });
      if (best) used[best.id] = true;
      return { pos: slot.pos, playerId: best ? best.id : null };
    });
    return out;
  }

  /* ---------- Taktik-Empfehlung anhand Gegner ---------- */
  function tacticalAdvice(opp, formation) {
    var lines = [];
    var text = [opp.spielweise, opp.staerke, opp.taktik].join(' ').toLowerCase();
    lines.push('Basis: ' + formation + (formation.indexOf('3-') === 0 ? ' – drei zentrale Verteidiger sichern das Zentrum, Außenbahn gehört den Flügelstürmern.' : ' – vierer Abwehrkette gibt Stabilität, Außenverteidiger entscheiden über Breite.'));
    if (text.indexOf('ballbesitz') >= 0) lines.push('Gegner will Ballbesitz: kompakt und geduldig stehen, Räume in der Mitte zuklappen, erst im 3. Drittel attackieren. Gegenkonter über schnelle Außen.');
    if (text.indexOf('konter') >= 0) lines.push('Konterstark: bei eigenen Standards und Ecken nur begrenzt riskieren, 2 Mann absichern. Ballverlust im Aufbau vermeiden – besser quer als quer ins Aus.');
    if (text.indexOf('hoch') >= 0 && text.indexOf('stehen') >= 0) lines.push('Hohe Laufwege des Gegners: mit langen Bällen hinter die Kette und Laufwege des MS in die Tiefe kontern.');
    if (text.indexOf('lang') >= 0 || text.indexOf('zweitball') >= 0) lines.push('Lange Bälle zu erwarten: Kopfballstärkste Spieler auf IV und DM, Zweikampfbereitschaft auf Zweite Bälle trainieren.');
    if (text.indexOf('schnell') >= 0 && text.indexOf('außen') >= 0) lines.push('Schnelle Außenspieler: Außenverteidiger nicht zu hoch schicken, Innenverteidiger verschiebt mit. Bei Dribbling: Innenrichtung zeigen.');
    if (text.indexOf('stark') >= 0) lines.push('Eingeschätzte Überlegenheit: tief und kompakt stehen, auf Standards und Konter setzen, Führungsspieler früh einbinden.');
    if (text.indexOf('schwach') >= 0 || text.indexOf('leicht') >= 0) lines.push('Eingeschätzte Unterlegenheit des Gegners: eigenes Spiel aufbauen, viele Spieler in der Offensive, Rotation für breite Kader nutzen.');
    var weak = teamWeakSkills(S.players);
    if (weak.length) lines.push('Team-Fokus vor dem Spiel: ' + SKILL_LABELS[weak[0].k] + ' im Warm-up aktivieren.');
    var best = S.players.slice().sort(function (a, b) { return skillAvg(b) - skillAvg(a); }).slice(0, 3).map(function (p) { return p.name; });
    if (best.length) lines.push('Führungsspieler heute: ' + best.join(', ') + ' – Ansprachen und Standards über sie laufen lassen.');
    lines.push('Mannschaftsansprache (3 Sätze): 1) Was erwartet uns? 2) Was ist unser Plan? 3) Was ist die eine Regel für heute?');
    return lines.join('\n');
  }

  /* ---------- Chat ---------- */
  function chat(input) {
    var t = input.toLowerCase();
    var pool = S.players;
    if (t.indexOf('aufstellung') >= 0 || t.indexOf('elf') >= 0) {
      var best = pool.slice().sort(function (a, b) { return skillAvg(b) - skillAvg(a); }).slice(0, 11).map(function (p) { return p.name; });
      return 'Aktuell stärkste Spieler laut Datenbank: ' + best.join(', ') +
        '. Tipp: Öffne den Taktik-Bereich und drücke „KI-Aufstellung" – dann werden die besten Spieler positionsgerecht verteilt.';
    }
    if (t.indexOf('übung') >= 0 || t.indexOf('training') >= 0 || t.indexOf('einheit') >= 0) {
      var ex = exercisesFor(t);
      return 'Übungsideen:\n• ' + ex.slice(0, 3).join('\n• ');
    }
    if (t.indexOf('geger') >= 0) {
      return 'Trag den Gegner oben unter „Gegner-Einschätzung" ein (Spielweise, Stärke, Taktik) – dann erstelle ich dir eine konkrete Empfehlung für Aufstellung und Anweisungen.';
    }
    if (t.indexOf('motivation') >= 0 || t.indexOf('belohnung') >= 0) {
      var tips = teamAnalysis().filter(function (x) { return x.indexOf('Belohnung') >= 0 || x.indexOf('Förder') >= 0; });
      return 'Belohnungsideen: „Spieler des Spiels" mit Kapitänsbinde, Trainings-Krone für die Woche, 10 Extra-Minuten Spielzeit, Pluspunkte im Strafenkatalog.\n' + tips.join('\n');
    }
    if (t.indexOf('kasten') >= 0 || t.indexOf('straf') >= 0) {
      var box = S.players.filter(function (p) { return p.points >= S.settings.boxThreshold; }).map(function (p) { return p.name; });
      return box.length ? 'Kasten fällig bei: ' + box.join(', ') : 'Aktuell steht niemand über ' + S.settings.boxThreshold + ' p.';
    }
    if (t.indexOf('tor') >= 0 && t.indexOf('torn') < 0) {
      var scorers = {};
      S.matches.forEach(function (m) { (m.events || []).forEach(function (ev) { if (ev.type === 'tor') scorers[ev.playerId] = (scorers[ev.playerId] || 0) + 1; }); });
      var top = Object.keys(scorers).sort(function (a, b) { return scorers[b] - scorers[a]; }).map(function (id) { var p = playerById(id); return p ? p.name + ': ' + scorers[id] : ''; }).filter(Boolean);
      return top.length ? 'Torschützenliste: ' + top.join(', ') : 'Noch keine Tore erfasst.';
    }
    var weak = teamWeakSkills(S.players);
    return 'Ich analysiere deine Daten lokal. Frag mich z. B. nach: „Aufstellung", „Übungen für Passspiel", „Gegner spielt 4-4-2", „Belohnungsideen", „Kasten fällig?".\n' +
      (weak.length ? 'Aktuell größter Entwicklungsbereich des Teams: ' + SKILL_LABELS[weak[0].k] + '.' : '');
  }

  return {
    unitSuggestions: unitSuggestions,
    playerAnalysis: playerAnalysis,
    teamAnalysis: teamAnalysis,
    autoLineup: autoLineup,
    tacticalAdvice: tacticalAdvice,
    chat: chat
  };
})();
