import type { OrderStatus } from "@/domain/orders/stateMachine";

/**
 * Kennzahlen fuer "Heute" auf dem Dashboard.
 *
 * Bewusst aus Zeitstempeln der Auftraege berechnet und nicht aus laufenden
 * Zaehlern: ein Zaehler laeuft irgendwann auseinander, die Zeitstempel sind
 * immer die Wahrheit.
 */

export interface AuftragFuerKennzahlen {
  status: OrderStatus;
  placedAt: Date;
  pickedAt?: Date | null;
  packedAt?: Date | null;
  completedAt?: Date | null;
}

export interface Tageskennzahlen {
  bestellungen: number;
  gepickt: number;
  gepackt: number;
  versendet: number;
  fehler: number;
}

/** Faellt der Zeitpunkt auf denselben Kalendertag wie der Stichtag? */
export function amSelbenTag(a: Date | null | undefined, stichtag: Date): boolean {
  if (!a) return false;
  return (
    a.getFullYear() === stichtag.getFullYear() &&
    a.getMonth() === stichtag.getMonth() &&
    a.getDate() === stichtag.getDate()
  );
}

/**
 * Zaehlt die Ereignisse des Tages.
 *
 * Ein Auftrag kann in mehreren Zahlen auftauchen — heute bestellt, heute
 * gepickt und heute versendet ist derselbe Auftrag. Das ist beabsichtigt: die
 * Zahlen beschreiben Arbeitsschritte, nicht Auftraege.
 *
 * "fehler" zaehlt dagegen den aktuellen Zustand, nicht ein Tagesereignis: ein
 * Auftrag im Fehlerzustand braucht Aufmerksamkeit, unabhaengig davon, wann er
 * hineingeraten ist.
 */
export function berechneTageskennzahlen(
  auftraege: readonly AuftragFuerKennzahlen[],
  stichtag: Date = new Date(),
): Tageskennzahlen {
  const kennzahlen: Tageskennzahlen = {
    bestellungen: 0,
    gepickt: 0,
    gepackt: 0,
    versendet: 0,
    fehler: 0,
  };

  for (const auftrag of auftraege) {
    if (amSelbenTag(auftrag.placedAt, stichtag)) kennzahlen.bestellungen++;
    if (amSelbenTag(auftrag.pickedAt, stichtag)) kennzahlen.gepickt++;
    if (amSelbenTag(auftrag.packedAt, stichtag)) kennzahlen.gepackt++;
    if (amSelbenTag(auftrag.completedAt, stichtag)) kennzahlen.versendet++;
    if (auftrag.status === "FEHLER") kennzahlen.fehler++;
  }

  return kennzahlen;
}
