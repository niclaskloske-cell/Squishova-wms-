# Betrieb

Wie das WMS in den Lagerbetrieb kommt: gehostete Anwendung, Kiosk-Anzeige im
Lager, Handys der Mitarbeitenden.

## Überblick

```
Shopify ──Webhook──►  gehostete App  ◄──── Handys (PWA, Scanner)
                       + Postgres
                            ▲
                            └──────────── Mini-PC im Lager (nur Anzeige)
```

Die Anwendung läuft **nicht** auf dem Mini-PC. Shopify braucht eine öffentlich
erreichbare HTTPS-Adresse für Webhooks, und wenn der Mini-PC aus ist, sollen
trotzdem Bestellungen ankommen. Der Mini-PC ist ein reines Anzeigegerät und darf
entsprechend schwach sein — ein Raspberry Pi 5 reicht.

## 1. Anwendung hosten

Das Repository bringt alles Nötige mit: einen Render-Blueprint, ein Dockerfile
und einen Health-Check. Du musst nichts konfigurieren, nur verbinden.

### Weg A: Render (empfohlen, weil vollständig vorbereitet)

1. Auf [render.com](https://render.com) mit GitHub anmelden.
2. **New → Blueprint** und dieses Repository auswählen.
3. Render liest `render.yaml` und legt beides an: den Webdienst *und* die
   PostgreSQL-Datenbank. `DATABASE_URL` wird automatisch verbunden,
   `AUTH_SECRET` erzeugt Render selbst als Zufallswert.
4. **Apply** klicken und warten. Der erste Build dauert einige Minuten.

Migrationen laufen automatisch vor jedem Start (`preDeployCommand`). Du musst
also nach einem Update nichts von Hand nachziehen.

Kosten: Webdienst und Datenbank zusammen rund 14 $/Monat im Starter-Tarif.
Der kostenlose Tarif reicht zum Ausprobieren, schläft aber nach Leerlauf ein —
für ein WMS, das Shopify-Webhooks entgegennehmen muss, ist das ungeeignet.

### Weg B: Railway, Fly.io oder eigener Server

Das `Dockerfile` läuft überall. Nötig sind eine PostgreSQL-Datenbank und zwei
Umgebungsvariablen:

| Variable | Wert |
|---|---|
| `DATABASE_URL` | Verbindungsstring der Datenbank |
| `AUTH_SECRET` | `openssl rand -base64 32` |

Vor dem Start einmal `npm run db:deploy` ausführen — das wendet vorhandene
Migrationen an und erzeugt keine neuen.

### Ersten Benutzer anlegen

Einmalig, mit einem selbst gewählten Passwort:

```bash
SEED_PASSWORD='einstarkespasswort' npm run db:seed
```

Das legt `admin@`, `packer@` und `viewer@squishova.de` an. Passwort danach in
der Anwendung ändern und `SEED_PASSWORD` nirgends dauerhaft hinterlegen.

### Health-Check

`/api/health` prüft auch die Datenbankverbindung und antwortet mit **503**,
wenn sie fehlt. Der Hoster erkennt dadurch eine Anwendung, die zwar läuft,
aber nicht arbeiten kann — ein Check, der nur „200 OK" sagt, würde genau
diesen Fall verschweigen.

## 2. Mini-PC im Lager einrichten

Beliebiger kleiner Rechner mit Linux und Chromium. Das Dashboard aktualisiert
sich selbst — es braucht **kein** Auto-Reload-Plugin. Ein harter Reload würde
alle 30 Sekunden Scrollposition und Fokus wegwerfen; stattdessen lädt die Seite
nur die Serverdaten nach.

Chromium im Kiosk-Modus starten:

```bash
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-session-crashed-bubble \
  --disable-infobars \
  --incognito=false \
  https://DEINE-ADRESSE/auftraege
```

Automatisch beim Hochfahren (systemd, als der angemeldete Desktop-Nutzer):

```ini
# ~/.config/systemd/user/wms-kiosk.service
[Unit]
Description=Squishova WMS Kiosk
After=graphical-session.target

[Service]
ExecStart=/usr/bin/chromium-browser --kiosk --noerrdialogs https://DEINE-ADRESSE/auftraege
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

```bash
systemctl --user enable --now wms-kiosk.service
```

Zwei Dinge noch einstellen:

- **Bildschirmschoner und Energiesparen aus**, sonst ist der Monitor nach zehn
  Minuten schwarz.
- **Anmeldung**: Der Kiosk-Browser bleibt über das Sitzungs-Cookie angemeldet
  (12 Stunden). Für einen Bildschirm, der nur anzeigt und nichts verändert,
  einen eigenen Benutzer mit der Rolle `VIEWER` anlegen — dann kann an diesem
  offen zugänglichen Gerät niemand etwas verstellen.

## 3. Handys der Mitarbeitenden

Keine App aus dem Store nötig. Die Adresse in Chrome (Android) oder Safari (iOS)
öffnen und „Zum Startbildschirm hinzufügen" wählen. Danach startet die Oberfläche
wie eine App, Updates kommen automatisch.

**Scannen** funktioniert über die Handykamera. Ein Bluetooth-Handscanner meldet
sich als Tastatur an und tippt in dasselbe Eingabefeld — er lässt sich also
jederzeit ergänzen, ohne dass an der Anwendung etwas geändert werden muss.

Voraussetzung für Kamera und Push-Benachrichtigungen ist **HTTPS**. Über `http://`
oder eine IP-Adresse im lokalen Netz verweigern die Browser beides.

## 4. Shopify verbinden

Im Shop unter Einstellungen → Apps und Vertriebskanäle → Apps entwickeln eine
Custom App anlegen, mit Leserechten auf Produkte, Bestellungen und Metafelder.
Access Token und Webhook-Secret gehören in die Datenbank (Tabelle `Shop`),
niemals in den Quelltext.

Webhook-Ziel: `https://DEINE-ADRESSE/api/webhooks/shopify`

Diese Route ist bewusst vom Anmeldezwang ausgenommen — Shopify schickt keine
Cookies. Die HMAC-Signatur ist dort die Authentifizierung.
