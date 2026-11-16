/* Start-Daten: Spielerliste & Strafenkatalog (Stand: Übernahme aus Trainer-Liste) */
window.Actions = window.Actions || {};
window.Routes = window.Routes || {};
window.SEED = {
  version: 1,
  settings: {
    theme: 'dark',
    clubName: '',
    clubColors: { primary: '#22c55e', secondary: '#0ea5e9' },
    halfLength: 35,
    boxThreshold: 25
  },
  teams: [
    { id: 'team-c1', name: 'C1', format: '11', playerIds: [] },
    { id: 'team-c2', name: 'C2', format: '9', playerIds: [] }
  ],
  players: [
    'Aleandro:1840', 'Alessio:1300', 'Anton:0', 'Antonio:300', 'Boris:1000',
    'Busquets:1030', 'Elias:2200', 'Eray:1040', 'Filou:1000', 'Henrik:1000',
    'Ilian:710', 'Janne:2050', 'Johannes:1020', 'Leon:1000', 'Liam:1100',
    'Louis:1700', 'Lucas:1020', 'Maik:1000', 'Marco:6200', 'Maro:1000',
    'Mats:0', 'Mattis:1520', 'Maurice:1300', 'Mehmet:30', 'Mert:1310',
    'Nick:1000', 'Nico:30', 'Oskar:1000', 'Paul:1060', 'Rafael:1200',
    'Sino:2050', 'Tobi:4520', 'Tom:0', 'Vale:1020'
  ].map(function (s) {
    var p = s.split(':');
    return {
      id: 'p-' + p[0].toLowerCase(),
      name: p[0],
      cents: parseInt(p[1], 10),
      trikotNr: '',
      teamIds: [],
      positions: [],
      skills: { schuss: 0, pass: 0, dribbling: 0, verteidigung: 0, technik: 0, kopfball: 0, kondition: 0, taktik: 0 },
      attrs: { groesse: '', gewicht: '', statur: '', staerken: '', probleme: '', einsetzbarkeit: '' },
      trainingCount: 0,
      trainingsLeistung: [],
      einsaetze: [],
      trikotHad: false,
      note: ''
    };
  }),
  catalog: [
    { id: 's1', label: 'Zu spät zum Treffpunkt', cents: 300, type: 'strafe', group: 'Training' },
    { id: 's2', label: 'Kasten nicht mitbringen', cents: 1000, type: 'strafe', group: 'Training' },
    { id: 's3', label: 'Ballsack vergessen (alle)', cents: 200, type: 'strafe', group: 'Training' },
    { id: 's4', label: 'Trinkflaschen vergessen (alle)', cents: 100, type: 'strafe', group: 'Training' },
    { id: 's5', label: 'Lachen/reden während der Trainer redet', cents: 500, type: 'strafe', group: 'Training' },
    { id: 's6', label: 'Zu spät zum Spiel', cents: 1000, type: 'strafe', group: 'Spiel' },
    { id: 's7', label: 'Nicht erscheinen obwohl zugesagt (Spiel)', cents: 1500, type: 'strafe', group: 'Spiel' },
    { id: 's8', label: 'Nicht erscheinen obwohl zugesagt (Training)', cents: 500, type: 'strafe', group: 'Training' },
    { id: 's9', label: 'Gelb wegen Meckern/Unsportlichkeit', cents: 1000, type: 'strafe', group: 'Spiel' },
    { id: 's10', label: 'Gelb-Rot wegen Meckern', cents: 2000, type: 'strafe', group: 'Spiel' },
    { id: 's11', label: 'Rot wegen Unsportlichkeit (Sachwert)', cents: 0, type: 'strafe', group: 'Spiel', custom: true },
    { id: 's12', label: 'Unlustig sein', cents: 2000, type: 'strafe', group: 'Allgemein' },
    { id: 's13', label: 'Quatsch machen', cents: 500, type: 'strafe', group: 'Allgemein' },
    { id: 's14', label: 'Beleidigen (1 Runde Laufen)', cents: 500, type: 'strafe', group: 'Training' },
    { id: 's15', label: 'Schuhe vergessen', cents: 400, type: 'strafe', group: 'Training' },
    { id: 's16', label: 'Klamotten in der Kabine vergessen', cents: 200, type: 'strafe', group: 'Allgemein' },
    { id: 's17', label: 'Ball über Fangnetz', cents: 100, type: 'strafe', group: 'Training' },
    { id: 's18', label: 'Mit Trainer diskutieren', cents: 500, type: 'strafe', group: 'Allgemein' },
    { id: 's19', label: 'Trainingssachen nicht ordentlich aufräumen (alle)', cents: 1000, type: 'strafe', group: 'Training' },
    { id: 's20', label: 'Handy in der Kabine', cents: 500, type: 'strafe', group: 'Allgemein' },
    { id: 'p1', label: 'Hütchen abräumen', cents: 10, type: 'plus', group: 'Training' },
    { id: 'p2', label: 'Bälle zusammen zählen', cents: 10, type: 'plus', group: 'Training' },
    { id: 'p3', label: 'Tore von allein abbauen', cents: 20, type: 'plus', group: 'Training' },
    { id: 'p4', label: 'Trainingsmaterial herrichten', cents: 40, type: 'plus', group: 'Training' }
  ],
  history: [],
  trikotOrder: [],
  training: {
    archive: [],
    themes: [],
    units: [],
    nextTrikot: []
  },
  tactics: {
    lineups: [],
    chat: [],
    opponent: { spielweise: '', staerke: '', taktik: '', aufstellung: '' }
  },
  matches: [],
  customSections: []
};
