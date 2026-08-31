# Betrieb

Wie das WMS in den Lagerbetrieb kommt: Anwendung und Datenbank auf dem eigenen
Mini-PC, Kiosk-Anzeige im Lager, Handys der Mitarbeitenden.

## Überblick

```
                    ┌──────────────────────────────┐
Shopify ──Webhook──►│  Mini-PC im Lager            │◄─── Handys (PWA, Scanner)
   (via Tunnel)     │  Docker: WMS + PostgreSQL    │
                    │  Chromium im Kiosk-Modus     │
                    └──────────────────────────────┘
```

Der Mini-PC macht beides: er betreibt die Anwendung **und** zeigt das Dashboard
an. Die Last ist gering, das stört sich nicht.

Shopify erreicht ihn über einen Tunnel — der Mini-PC baut die Verbindung nach
außen auf, es muss **kein Port im Router geöffnet** werden.

## 1. Anwendung auf dem Mini-PC installieren

Kosten: 0 €. Die Anwendung und die Datenbank laufen in Docker-Containern auf
deinem eigenen Server, eine HTTPS-Adresse für Shopify kommt über einen Tunnel —
ohne offenen Port im Router.

### Docker installieren

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER      # danach einmal ab- und wieder anmelden
```

### Projekt holen und einrichten

```bash
git clone https://github.com/niclaskloske-cell/Squishova-wms- squishova-wms
cd squishova-wms
cp .env.docker.example .env
```

In der `.env` zwei Werte eintragen — beide erzeugst du dir selbst:

```bash
openssl rand -base64 24    # für POSTGRES_PASSWORD
openssl rand -base64 32    # für AUTH_SECRET
```

Starten:

```bash
docker compose up -d
```

Beim ersten Start baut Docker das Image (dauert ein paar Minuten), wartet auf
die Datenbank und wendet die Migrationen an. Danach läuft das WMS auf
`http://localhost:3000`.

Prüfen, ob alles steht:

```bash
curl localhost:3000/api/health     # erwartet: {"status":"ok",...}
docker compose ps                  # beide Dienste "healthy"
docker compose logs -f wms         # bei Problemen
```

### Ersten Benutzer anlegen

Einmalig, mit einem selbst gewählten Passwort:

```bash
docker compose exec wms sh -c "SEED_PASSWORD='deinPasswort' npx tsx prisma/seed.ts"
```

Danach das Passwort in der Anwendung ändern.

### Von außen erreichbar machen (für Shopify)

Shopify muss die Webhooks zustellen können. Dafür **kein Port im Router** —
stattdessen Tailscale Funnel, kostenlos und ohne eigene Domain:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
sudo tailscale funnel --bg 3000
```

Der letzte Befehl nennt dir die feste HTTPS-Adresse, etwa
`https://minipc.deintailnet.ts.net`. Die bleibt gleich, auch nach einem Neustart.

Voraussetzung: In der [Tailscale-Verwaltung](https://login.tailscale.com/admin/dns)
müssen **HTTPS-Zertifikate** aktiviert und für diesen Rechner **Funnel** erlaubt
sein. Tailscale sagt dir beim Ausführen, falls etwas fehlt.

### Updates einspielen

```bash
git pull && docker compose up -d --build
```

Migrationen laufen dabei automatisch mit.

### Backups — bitte nicht überspringen

Beim Selbst-Hosten sind Backups deine Aufgabe. Skript anlegen:

```bash
mkdir -p ~/wms-backups
cat > ~/wms-backup.sh <<'EOF'
#!/bin/sh
cd ~/squishova-wms || exit 1
docker compose exec -T db pg_dump -U wms squishova_wms \
  | gzip > ~/wms-backups/wms-$(date +%F).sql.gz
# Älter als 30 Tage aufräumen
find ~/wms-backups -name 'wms-*.sql.gz' -mtime +30 -delete
EOF
chmod +x ~/wms-backup.sh
```

Täglich um 3 Uhr per Cron (`crontab -e`):

```
0 3 * * * /bin/sh $HOME/wms-backup.sh
```

**Probiere einmal aus, ob sich ein Backup zurückspielen lässt.** Ein
ungetestetes Backup ist keins:

```bash
gunzip -c ~/wms-backups/wms-JJJJ-MM-TT.sql.gz \
  | docker compose exec -T db psql -U wms -d squishova_wms
```

### Was du dir damit einhandelst

- **Der Mini-PC muss laufen.** Ist er aus, kommen keine Bestellungen an.
  Shopify stellt Webhooks rund 48 Stunden lang erneut zu, das federt kurze
  Ausfälle ab — aber ein Wochenende ohne Strom nicht.
- **Updates von System und Docker** liegen bei dir.
- Dafür verlassen deine Kunden- und Bestelldaten dein Lager nicht.

### Später umziehen

Wenn du irgendwann doch hosten willst: Datenbank mit `pg_dump` sichern, beim
Hoster einspielen, `DATABASE_URL` und `AUTH_SECRET` setzen. Das mitgelieferte
`render.yaml` und das `Dockerfile` funktionieren unverändert. Die Anwendung ist
an nichts gebunden außer Node und PostgreSQL.

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
