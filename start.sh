#!/usr/bin/env bash
#
# Squishova WMS starten. Einmal ausführen, fertig.
#
#   ./start.sh
#
# Erzeugt beim ersten Lauf die Zugangsdaten, startet Anwendung und Datenbank,
# legt den Admin-Benutzer an und sagt am Ende, wo alles zu finden ist.

set -euo pipefail
cd "$(dirname "$0")"

sage() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fehler() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# --- Voraussetzungen -------------------------------------------------------

if ! command -v docker >/dev/null 2>&1; then
  fehler "Docker fehlt. Einmal installieren mit:

  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker \$USER

Danach ab- und wieder anmelden und dieses Skript erneut starten."
fi

if ! docker compose version >/dev/null 2>&1; then
  fehler "Docker Compose fehlt. Bitte Docker neu installieren (siehe get.docker.com)."
fi

if ! docker info >/dev/null 2>&1; then
  fehler "Docker läuft, aber dieser Benutzer darf es nicht bedienen. Einmal:

  sudo usermod -aG docker \$USER

Danach ab- und wieder anmelden."
fi

# --- Zugangsdaten ----------------------------------------------------------
# Werden einmal erzeugt und danach nie wieder angefasst: ein neues AUTH_SECRET
# würde alle angemeldeten Scanner aussperren.

if [ ! -f .env ]; then
  sage "Erzeuge Zugangsdaten ..."
  {
    echo "POSTGRES_PASSWORD=\"$(openssl rand -base64 24 | tr -d '/+=')\""
    echo "AUTH_SECRET=\"$(openssl rand -base64 32)\""
    echo "LOG_LEVEL=\"info\""
  } > .env
  chmod 600 .env
  echo "In .env gespeichert. Diese Datei nicht löschen und nicht weitergeben."
else
  echo "Zugangsdaten aus .env übernommen."
fi

# --- Starten ---------------------------------------------------------------

sage "Starte Anwendung und Datenbank ..."
echo "Beim ersten Mal dauert das ein paar Minuten — Docker baut das Image."
docker compose up -d --build

sage "Warte, bis alles bereit ist ..."
bereit=""
for _ in $(seq 1 60); do
  if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
    bereit="ja"
    break
  fi
  sleep 3
done

if [ -z "$bereit" ]; then
  fehler "Die Anwendung ist nicht hochgekommen. Was schiefging, steht hier:

  docker compose logs wms

Schick mir diese Ausgabe, dann sehe ich es mir an."
fi

# --- Erster Benutzer -------------------------------------------------------
# Nur, wenn es noch keinen gibt. Ein erneuter Lauf setzt kein Passwort zurück.

benutzer=$(docker compose exec -T db psql -U wms -d squishova_wms -tAc \
  'SELECT count(*) FROM "User"' 2>/dev/null || echo "0")

if [ "${benutzer//[[:space:]]/}" = "0" ]; then
  passwort="$(openssl rand -base64 12 | tr -d '/+=')"
  sage "Lege Admin-Benutzer an ..."
  docker compose exec -T -e SEED_PASSWORD="$passwort" wms node prisma/seed.cjs >/dev/null
  ZUGANG="
  Benutzer: admin@squishova.de
  Passwort: $passwort

  Passwort notieren — es wird nicht noch einmal angezeigt."
else
  ZUGANG="
  Benutzer: admin@squishova.de
  Passwort: das beim ersten Start vergebene."
fi

# --- Fertig ----------------------------------------------------------------

cat <<ENDE

============================================================
  Squishova WMS läuft.
============================================================

  Im Browser öffnen:  http://localhost:3000
  Dashboard:          http://localhost:3000/auftraege
$ZUGANG

  Stoppen:      docker compose down
  Neu starten:  ./start.sh
  Logs:         docker compose logs -f wms

  Shopify anbinden ist ein eigener Schritt und noch nicht nötig.
  Bis dahin läuft das WMS nur in deinem Netz.

============================================================

ENDE
