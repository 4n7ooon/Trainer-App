# Trainer-App (C-/B-Jugend)

Mobile Web-App für Jugend-Fußballtrainer – optimiert für den iPhone-Homescreen.

## Bereiche
- **Strafenkatalog** – reines Punkte-System (p), Pluspunkte, Kasten-Warnung ab 25 p, „Kasten mitgebracht" = −25 p, Verlauf, manuelle Korrektur & Zurücksetzen
- **Spieltag** – Spiele anlegen, Live-Timer (Halbzeitlänge pro Spiel einstellbar), 1-Klick-Eingaben für Tor/Assist/Karten/Wechsel, automatische Übertragung der Einsatzminuten in die Spieler-Datenbank
- **Taktik-Coach** – 11er & 9er Formationen (4-1-4-1, 3-4-2-1, 3-4-1-2, 4-2-3-1, 4-4-2, 4-3-3 + 9er-Systeme), Aufstellungen speichern/laden, KI-Aufstellung, Gegneranalyse & Taktik-Chat
- **Trainingsplanung** – Einheiten mit Text/Bild/Video, Übungsarchiv mit Ordnern, Themen-Tags (z. B. „Aufbauspiel" über mehrere Einheiten), **Anwesenheit pro Einheit (1-Klick)**, KI-Übungsempfehlungen
- **Spieler-Datenbank** – Trikotnummern, Positionen, Können-Bewertungen (1–5), Körperdaten, Eigenschaften, Trainingsbeteiligung, Spielhistorie, KI-Analysen
- **Trikot-Liste** – alphabetisch, abhakbar, Reset-Funktion, automatisch „wer ist als nächstes dran"
- **Statistiken** – Tore, Assists, gelbe/rote Karten, Startelf-Einsätze (Anzahl + S11/Bank-Quote) pro Spieler, sortierbar
- **Entwicklung** – Trends pro Spieler: Anwesenheit, Spielnoten, S11/Bank-Verlauf, Trainingsleistung
- **Offline** – Service Worker: App funktioniert komplett ohne Netz; alle Daten liegen automatisch lokal (localStorage + IndexedDB)
- **Vereins-Datenbank** – Mannschaften (C1/C2, beliebig erweiterbar/umbenennbar, 11er/9er), fluider Kader
- **Eigene Bereiche** – im Dashboard beliebig viele eigene Kacheln erstellen

## Bedienung
- Jede Änderung wird **automatisch gespeichert** (Gerät-Speicher).
- **Backup:** Einstellungen → „Backup exportieren" (JSON-Datei), jederzeit importierbar.
- **Design:** Dark/Light in den Einstellungen.

## Installation auf dem iPhone
1. App-URL in Safari öffnen
2. Teilen-Symbol → **„Zum Home-Bildschirm"**
3. App startet dann vollbildig wie eine native App

## Hosting
Statische Dateien – läuft auf jedem beliebigen Static-Hosting (z. B. GitHub Pages): einfach `index.html` + Ordner `js/`, `css/`, `icon.png`, `manifest.webmanifest` ausliefern.

## Technik
Vanilla JS (keine Abhängigkeiten, keine Build-Schritte), Daten in `localStorage`, Medien (Bilder/Videos) in IndexedDB.

## Datenschutz (DSGVO)
- Die App speichert **alle Daten ausschließlich lokal** auf dem Gerät (localStorage + IndexedDB im Browser). Es gibt keinen Server, keine Übertragung, keine Tracker.
- Der öffentlich einsehbare Quellcode enthält **keine echten Spielerdaten** – der Start-Seed nutzt anonyme Platzhalter („Spieler 1–34").
- Wer den Link öffnet, erhält eine leere Demo-App mit Platzhaltern – **nicht** die Daten des Trainers.
- Backups (Export) sind JSON-Dateien auf dem Gerät des Trainers und liegen in dessen Verantwortung.
- Empfehlung: Den App-Link nur mit eigenen Trainern teilen, nicht öffentlich posten.
