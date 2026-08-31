import { db } from "@/lib/db";
import type { BoardAuftrag } from "@/domain/dashboard/board";
import type { AuftragFuerKennzahlen } from "@/domain/dashboard/tageskennzahlen";
import type { OrderStatus } from "@/domain/orders/stateMachine";

/**
 * Datenbankzugriffe fuer das Dashboard.
 *
 * Nur Lesen und Umformen — jede Entscheidung darueber, was wohin gehoert,
 * steht in src/domain/dashboard und ist dort getestet.
 */

/** Status, die auf dem Board erscheinen. Abgeschlossenes macht keine Arbeit mehr. */
const OFFENE_STATUS: OrderStatus[] = [
  "NEU",
  "PICKING",
  "GEPICKT",
  "PACKEN",
  "GEPACKT",
  "LABEL_ERSTELLT",
  "VERSANDBEREIT",
  "FEHLER",
];

/**
 * Auftraege fuer das Board.
 *
 * Die Mengen werden in der Datenbank summiert statt alle Positionen zu laden:
 * bei hundert offenen Auftraegen mit je mehreren Zeilen waere das sonst eine
 * spuerbare Datenmenge fuer eine Ansicht, die sich selbst aktualisiert.
 */
export async function ladeBoardAuftraege(
  tenantId: string,
): Promise<BoardAuftrag[]> {
  const auftraege = await db.order.findMany({
    where: { tenantId, status: { in: OFFENE_STATUS } },
    orderBy: { placedAt: "asc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      placedAt: true,
      errorMessage: true,
      _count: { select: { items: true } },
      items: { select: { quantityOrdered: true, quantityPicked: true } },
    },
  });

  return auftraege.map((auftrag) => ({
    id: auftrag.id,
    orderNumber: auftrag.orderNumber,
    status: auftrag.status as OrderStatus,
    placedAt: auftrag.placedAt,
    errorMessage: auftrag.errorMessage,
    positionen: auftrag._count.items,
    mengeGesamt: auftrag.items.reduce((s, i) => s + i.quantityOrdered, 0),
    mengeGepickt: auftrag.items.reduce(
      (s, i) => s + Math.min(i.quantityPicked, i.quantityOrdered),
      0,
    ),
  }));
}

/**
 * Auftraege fuer die Tageskennzahlen.
 *
 * Geladen wird ab Mitternacht des Stichtags, zusaetzlich alle Auftraege im
 * Fehlerzustand — die zaehlen unabhaengig vom Datum, weil sie Aufmerksamkeit
 * brauchen, egal wann sie hineingeraten sind.
 */
export async function ladeKennzahlenAuftraege(
  tenantId: string,
  stichtag: Date = new Date(),
): Promise<AuftragFuerKennzahlen[]> {
  const tagesbeginn = new Date(stichtag);
  tagesbeginn.setHours(0, 0, 0, 0);

  const auftraege = await db.order.findMany({
    where: {
      tenantId,
      OR: [
        { placedAt: { gte: tagesbeginn } },
        { pickedAt: { gte: tagesbeginn } },
        { packedAt: { gte: tagesbeginn } },
        { completedAt: { gte: tagesbeginn } },
        { status: "FEHLER" },
      ],
    },
    select: {
      status: true,
      placedAt: true,
      pickedAt: true,
      packedAt: true,
      completedAt: true,
    },
  });

  return auftraege.map((a) => ({ ...a, status: a.status as OrderStatus }));
}
