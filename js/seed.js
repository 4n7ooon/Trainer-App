/* Start-Daten: Spielerliste & Strafenkatalog (Stand: Übernahme aus Trainer-Liste) – reine Punkte */
window.Actions = window.Actions || {};
window.Routes = window.Routes || {};
window.SEED = {
  version: 2,
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
    'Aleandro:14', 'Alessio:13', 'Anton:0', 'Antonio:3', 'Boris:10',
    'Busquets:10', 'Elias:22', 'Eray:10', 'Filou:10', 'Henrik:10',
    'Ilian:7', 'Janne:20', 'Johannes:10', 'Leon:10', 'Liam:11',
    'Louis:17', 'Lucas:10', 'Maik:10', 'Marco:62', 'Maro:10',
    'Mats:0', 'Mattis:15', 'Maurice:13', 'Mehmet:-3', 'Mert:13',
    'Nick:10', 'Nico:-3', 'Oskar:10', 'Paul:10', 'Rafael:12',
    'Sino:20', 'Tobi:45', 'Tom:0', 'Vale:10'
  ].map(function (s) {
    var p = s.split(':');
    return {
      id: 'p-' + p[0].toLowerCase(),
      name: p[0],
      points: parseInt(p[1], 10),
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
    { id: 's1', label: 'Zu spät zum Treffpunkt', points: 3, type: 'strafe', group: 'Training' },
    { id: 's2', label: 'Kasten nicht mitbringen', points: 10, type: 'strafe', group: 'Training' },
    { id: 's3', label: 'Ballsack vergessen (alle)', points: 2, type: 'strafe', group: 'Training' },
    { id: 's4', label: 'Trinkflaschen vergessen (alle)', points: 1, type: 'strafe', group: 'Training' },
    { id: 's5', label: 'Lachen/reden während der Trainer redet', points: 5, type: 'strafe', group: 'Training' },
    { id: 's6', label: 'Zu spät zum Spiel', points: 10, type: 'strafe', group: 'Spiel' },
    { id: 's7', label: 'Nicht erscheinen obwohl zugesagt (Spiel)', points: 15, type: 'strafe', group: 'Spiel' },
    { id: 's8', label: 'Nicht erscheinen obwohl zugesagt (Training)', points: 5, type: 'strafe', group: 'Training' },
    { id: 's9', label: 'Gelb wegen Meckern/Unsportlichkeit', points: 10, type: 'strafe', group: 'Spiel' },
    { id: 's10', label: 'Gelb-Rot wegen Meckern', points: 20, type: 'strafe', group: 'Spiel' },
    { id: 's11', label: 'Rot wegen Unsportlichkeit (Sachwert)', points: 0, type: 'strafe', group: 'Spiel', custom: true },
    { id: 's12', label: 'Unlustig sein', points: 20, type: 'strafe', group: 'Allgemein' },
    { id: 's13', label: 'Quatsch machen', points: 5, type: 'strafe', group: 'Allgemein' },
    { id: 's14', label: 'Beleidigen (1 Runde Laufen)', points: 5, type: 'strafe', group: 'Training' },
    { id: 's15', label: 'Schuhe vergessen', points: 4, type: 'strafe', group: 'Training' },
    { id: 's16', label: 'Klamotten in der Kabine vergessen', points: 2, type: 'strafe', group: 'Allgemein' },
    { id: 's17', label: 'Ball über Fangnetz', points: 1, type: 'strafe', group: 'Training' },
    { id: 's18', label: 'Mit Trainer diskutieren', points: 5, type: 'strafe', group: 'Allgemein' },
    { id: 's19', label: 'Trainingssachen nicht ordentlich aufräumen (alle)', points: 10, type: 'strafe', group: 'Training' },
    { id: 's20', label: 'Handy in der Kabine', points: 5, type: 'strafe', group: 'Allgemein' },
    { id: 'p1', label: 'Hütchen abräumen', points: 1, type: 'plus', group: 'Training' },
    { id: 'p2', label: 'Bälle zusammen zählen', points: 1, type: 'plus', group: 'Training' },
    { id: 'p3', label: 'Tore von allein abbauen', points: 2, type: 'plus', group: 'Training' },
    { id: 'p4', label: 'Trainingsmaterial herrichten', points: 4, type: 'plus', group: 'Training' }
  ],
  history: [],
  trikotOrder: [],
  trikotSeeded: false,
  training: {
    archive: [],
    themes: [],
    units: []
  },
  tactics: {
    lineups: [],
    chat: [],
    opponent: { spielweise: '', staerke: '', taktik: '', aufstellung: '' }
  },
  matches: [],
  customSections: []
};
