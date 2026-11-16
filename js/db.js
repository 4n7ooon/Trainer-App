/* Speicher-Layer: Auto-Save in localStorage, Medien in IndexedDB, Export/Import */
(function () {
  var KEY = 'trainerapp-state-v1';

  window.DB = {
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) {
          var state = JSON.parse(raw);
          return migrate(state);
        }
      } catch (e) { console.warn('Load fehlgeschlagen, nutze Seed', e); }
      return migrate(JSON.parse(JSON.stringify(window.SEED)));
    },
    save: function (state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        return true;
      } catch (e) {
        console.error('Speichern fehlgeschlagen (Speicher voll?)', e);
        alert('Speichern fehlgeschlagen – Speicher voll. Bitte alte Medien im Übungsarchiv löschen und Daten exportieren.');
        return false;
      }
    },
    export: function (state) {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'trainer-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    },
    importFile: function (file, cb) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var state = JSON.parse(reader.result);
          cb(migrate(state));
        } catch (e) {
          alert('Datei konnte nicht gelesen werden.');
        }
      };
      reader.readAsText(file);
    }
  };

  function migrate(s) {
    var seed = window.SEED;
    ['settings', 'teams', 'players', 'catalog', 'history', 'training', 'tactics', 'matches', 'customSections', 'trikotOrder'].forEach(function (k) {
      if (s[k] === undefined) s[k] = JSON.parse(JSON.stringify(seed[k]));
    });
    if (!s.settings.clubColors) s.settings.clubColors = { primary: '#22c55e', secondary: '#0ea5e9' };
    if (s.settings.boxThreshold === undefined) s.settings.boxThreshold = 25;

    /* Migration v1 -> v2: Euro-Betraege in reine Punkte umwandeln */
    (s.players || []).forEach(function (p) {
      if (p.points === undefined) {
        p.points = (p.cents !== undefined) ? (Math.floor(p.cents / 100) - ((p.cents % 100) / 10)) : 0;
        delete p.cents;
      }
      if (p.fuss === undefined) p.fuss = '';
    });
    (s.catalog || []).forEach(function (c) {
      if (c.points === undefined) {
        c.points = (c.type === 'strafe') ? Math.round((c.cents || 0) / 100) : Math.max(1, Math.round((c.cents || 0) / 10));
        delete c.cents;
      }
    });
    (s.history || []).forEach(function (h) {
      if (!h.inPts && h.delta !== undefined) {
        var d = h.delta;
        h.delta = d > 0 ? Math.round(d / 100) : (Math.abs(d) >= 100 ? Math.round(d / 100) : Math.round(d / 10));
        h.inPts = true;
      }
    });

    /* Trikot-Liste: alle Spieler einmalig uebernehmen */
    if (!s.trikotSeeded) {
      (s.players || []).forEach(function (p) {
        if (s.trikotOrder.indexOf(p.id) < 0) s.trikotOrder.push(p.id);
      });
      s.trikotSeeded = true;
    }
    return s;
  }

  /* ---------- Medien (Bilder/Videos) in IndexedDB ---------- */
  var dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      var req = indexedDB.open('trainerapp-media', 1);
      req.onupgradeneeded = function (e) {
        e.target.result.createObjectStore('media', { keyPath: 'id' });
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }

  window.Media = {
    put: function (blob) {
      var id = 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      return idb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction('media', 'readwrite');
          tx.objectStore('media').put({ id: id, blob: blob, type: blob.type, ts: Date.now() });
          tx.oncomplete = function () { resolve(id); };
          tx.onerror = function () { reject(tx.error); };
        });
      });
    },
    get: function (id) {
      return idb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var req = db.transaction('media', 'readonly').objectStore('media').get(id);
          req.onsuccess = function () { resolve(req.result || null); };
          req.onerror = function () { reject(req.error); };
        });
      });
    },
    'delete': function (id) {
      return idb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction('media', 'readwrite');
          tx.objectStore('media')['delete'](id);
          tx.oncomplete = resolve;
          tx.onerror = function () { reject(tx.error); };
        });
      });
    },
    url: function (id, cb) {
      return Media.get(id).then(function (rec) {
        if (!rec) return null;
        return URL.createObjectURL(rec.blob);
      }).then(function (url) { cb(url); });
    }
  };
})();
