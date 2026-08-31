import type { OrderStatus } from "@/domain/orders/stateMachine";

/**
 * Aufbereitung der Auftragsliste fuer das Lager-Dashboard.
 *
 * Reine Logik: Gruppierung, Sortierung und Kennzahlen sind ohne Datenbank
 * pruefbar. Der Service liefert nur die Zeilen, die Darstellungsregeln stehen
 * hier.
 */

/** Spalten des Dashboards, in der Reihenfolge des Ablaufs. */
export const SPALTEN = [
  "OFFEN",
  "PICKING",
  "PACKEN",
  "VERSANDBEREIT",
  "FEHLER",
] as const;

export type SpaltenId = (typeof SPALTEN)[number];

export const SPALTEN_TITEL: Record<SpaltenId, string> = {
  OFFEN: "Offene Aufträge",
  PICKING: "Picking",
  PACKEN: "Packen",
  VERSANDBEREIT: "Versandbereit",
  FEHLER: "Fehler",
};

/**
 * Zuordnung Auftragsstatus -> Spalte.
 *
 * GEPICKT liegt bewusst unter "Packen": fuer das Lager ist ein fertig
 * gepickter Auftrag der naechste Packauftrag, kein eigener Wartezustand.
 * Ebenso zaehlt LABEL_ERSTELLT bereits zu "Versandbereit" — das Paket wartet
 * nur noch auf die Abholung.
 */
const STATUS_ZU_SPALTE: Partial<Record<OrderStatus, SpaltenId>> = {
  NEU: "OFFEN",
  PICKING: "PICKING",
  GEPICKT: "PACKEN",
  PACKEN: "PACKEN",
  GEPACKT: "VERSANDBEREIT",
  LABEL_ERSTELLT: "VERSANDBEREIT",
  VERSANDBEREIT: "VERSANDBEREIT",
  FEHLER: "FEHLER",
  // ABGESCHLOSSEN und STORNIERT erscheinen nicht auf dem Board — das Lager
  // soll nur sehen, was noch Arbeit macht.
};

export function spalteFuerStatus(status: OrderStatus): SpaltenId | null {
  return STATUS_ZU_SPALTE[status] ?? null;
}

export interface BoardAuftrag {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  placedAt: Date;
  positionen: number;
  mengeGesamt: number;
  mengeGepickt: number;
  errorMessage?: string | null;
}

export interface BoardSpalte {
  id: SpaltenId;
  titel: string;
  auftraege: BoardAuftrag[];
}

/**
 * Verteilt Auftraege auf die Spalten.
 *
 * Innerhalb einer Spalte gilt: aelteste Bestellung zuerst. Wer zuerst bestellt
 * hat, wird zuerst bedient — und ein liegengebliebener Auftrag rutscht nicht
 * nach unten aus dem Blick.
 */
export function baueBoard(auftraege: readonly BoardAuftrag[]): BoardSpalte[] {
  const nachSpalte = new Map<SpaltenId, BoardAuftrag[]>(
    SPALTEN.map((id) => [id, []]),
  );

  for (const auftrag of auftraege) {
    const spalte = spalteFuerStatus(auftrag.status);
    if (spalte) nachSpalte.get(spalte)?.push(auftrag);
  }

  return SPALTEN.map((id) => ({
    id,
    titel: SPALTEN_TITEL[id],
    auftraege: (nachSpalte.get(id) ?? []).sort(
      (a, b) => a.placedAt.getTime() - b.placedAt.getTime(),
    ),
  }));
}

/** Fortschritt einer Auftragszeile in Prozent, fuer den Balken im Board. */
export function fortschritt(auftrag: BoardAuftrag): number {
  if (auftrag.mengeGesamt <= 0) return 0;
  const anteil = auftrag.mengeGepickt / auftrag.mengeGesamt;
  return Math.min(100, Math.max(0, Math.round(anteil * 100)));
}

/**
 * Wie lange liegt der Auftrag schon? Das Lager soll auf einen Blick sehen,
 * was zu lange wartet.
 */
export function wartetSeitStunden(
  auftrag: BoardAuftrag,
  jetzt: Date = new Date(),
): number {
  const ms = jetzt.getTime() - auftrag.placedAt.getTime();
  return Math.max(0, Math.floor(ms / 3_600_000));
}

/** Ab wann ein offener Auftrag optisch hervorgehoben wird. */
export const UEBERFAELLIG_AB_STUNDEN = 24;

export function istUeberfaellig(
  auftrag: BoardAuftrag,
  jetzt: Date = new Date(),
): boolean {
  return wartetSeitStunden(auftrag, jetzt) >= UEBERFAELLIG_AB_STUNDEN;
}
