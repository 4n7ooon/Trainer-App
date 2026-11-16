# Trainer-App (C-/B-Jugend)

Mobile Web-App für Jugend-Fußballtrainer – optimiert für den iPhone-Homescreen.

**Live-Link:** https://4n7ooon.github.io/Trainer-App/

## Bereiche
- **Strafenkatalog** – Punkte in €, Pluspunkte (Cent), Kasten-Warnung ab 25 p, „Kasten mitgebracht" = −25 p, Verlauf mit Undo, manuelle Korrektur
- **Spieltag** – Live-Timer (Halbzeitlänge pro Spiel einstellbar), 1-Klick-Eingaben für Tor/Assist/Karten/Wechsel, automatische Übertragung der Einsatzminuten in die Spieler-Datenbank
- **Taktik-Coach** – 11er & 9er Formationen (4-1-4-1, 3-4-2-1, 3-4-1-2, 4-2-3-1, 4-4-2, 4-3-3 + 9er-Systeme), Aufstellungen speichern/laden, KI-Aufstellung, Gegneranalyse & Taktik-Chat
- **Trainingsplanung** – Einheiten mit Text/Bild/Video, Übungsarchiv mit Ordnern, Themen-Tags, KI-Übungsempfehlungen
- **Spieler-Datenbank** – Trikotnummern, Positionen, Können-Bewertungen (1–5), Körperdaten, Eigenschaften, Trainingsbeteiligung, Spielhistorie, KI-Analysen
- **Trikot-Liste** – alphabetisch, abhakbar, automatisch „wer ist als nächstes dran"
- **Vereins-Datenbank** – Mannschaften (C1/C2, erweiterbar/umbenennbar, 11er/9er), fluider Kader
- **Eigene Bereiche** – im Dashboard beliebig viele eigene Kacheln erstellen

## Bedienung
- Jede Änderung wird **automatisch gespeichert** (Gerät-Speicher).
- **Backup:** Einstellungen → „Backup exportieren" (JSON-Datei), jederzeit importierbar.
- **Design:** Dark/Light in den Einstellungen.

## Installation auf dem iPhone
1. Live-Link in Safari öffnen
2. Teilen-Symbol → **„Zum Home-Bildschirm"**
3. App startet dann vollbildig wie eine native App

## Technik
Vanilla JS ohne Abhängigkeiten, Daten in `localStorage`, Medien (Bilder/Videos) in IndexedDB.
