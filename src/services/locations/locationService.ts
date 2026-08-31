import { db } from "@/lib/db";
import { childLogger } from "@/lib/logger";
import {
  normalisiereCode,
  pruefeLagerplatzCode,
  vorschlagPickOrder,
} from "@/domain/locations/locationCode";
import { istEindeutigkeitsVerletzung } from "@/services/shopify/webhookIngest";

const log = childLogger("lagerplatz");

export interface LagerplatzZeile {
  id: string;
  code: string;
  name: string | null;
  shelf: string | null;
  bin: string | null;
  description: string | null;
  pickOrder: number;
  active: boolean;
  /** Wie viele Produkte auf diesem Platz liegen — Warnung vor dem Deaktivieren. */
  belegtMitProdukten: number;
}

/** Das (vorerst einzige) Lager eines Mandanten. */
async function hauptlager(tenantId: string) {
  const lager = await db.warehouse.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });
  if (!lager) {
    throw new Error(
      "Kein Lager angelegt. Bitte zuerst den Seed ausführen (npm run db:seed).",
    );
  }
  return lager;
}

export async function ladeLagerplaetze(tenantId: string): Promise<LagerplatzZeile[]> {
  const lager = await hauptlager(tenantId);

  const plaetze = await db.location.findMany({
    where: { warehouseId: lager.id },
    orderBy: [{ pickOrder: "asc" }, { code: "asc" }],
    include: { _count: { select: { stocks: true } } },
  });

  return plaetze.map(({ _count, ...platz }) => ({
    ...platz,
    belegtMitProdukten: _count.stocks,
  }));
}

export type AnlegenErgebnis =
  | { ok: true; code: string }
  | { ok: false; meldungen: string[] };

/**
 * Legt einen Lagerplatz an.
 *
 * Die Eindeutigkeit wird zweifach abgesichert: vorab gegen die bekannten Codes,
 * damit der Benutzer eine verstaendliche Meldung bekommt, und beim Schreiben
 * ueber den UNIQUE-Index — zwei gleichzeitige Anlagen wuerden die Vorabpruefung
 * sonst beide bestehen.
 */
export async function legeLagerplatzAn(
  tenantId: string,
  eingabe: { code: string; name?: string; description?: string; pickOrder?: number },
): Promise<AnlegenErgebnis> {
  const lager = await hauptlager(tenantId);
  const vorhandene = await db.location.findMany({
    where: { warehouseId: lager.id },
    select: { code: true },
  });

  const probleme = pruefeLagerplatzCode(
    eingabe.code,
    vorhandene.map((p) => p.code),
  );
  if (probleme.length > 0) {
    return { ok: false, meldungen: probleme.map((p) => p.meldung) };
  }

  const code = normalisiereCode(eingabe.code);
  const zerlegt = zerlegeSicher(code);

  try {
    await db.location.create({
      data: {
        warehouseId: lager.id,
        code,
        name: eingabe.name?.trim() || null,
        description: eingabe.description?.trim() || null,
        shelf: zerlegt?.shelf ?? null,
        bin: zerlegt?.bin ?? null,
        pickOrder: eingabe.pickOrder ?? vorschlagPickOrder(code),
      },
    });
  } catch (error) {
    if (istEindeutigkeitsVerletzung(error)) {
      return { ok: false, meldungen: [`Der Lagerplatz "${code}" existiert bereits.`] };
    }
    log.error({ err: error, code }, "Lagerplatz konnte nicht angelegt werden");
    throw error;
  }

  log.info({ code }, "Lagerplatz angelegt");
  return { ok: true, code };
}

/**
 * Schaltet einen Lagerplatz aktiv/inaktiv.
 *
 * Bewusst kein Loeschen: an einem Lagerplatz haengen Bestaende und deren
 * Historie. Ein deaktivierter Platz verschwindet aus der Auswahl, die
 * Vergangenheit bleibt nachvollziehbar.
 */
export async function setzeLagerplatzAktiv(
  tenantId: string,
  locationId: string,
  aktiv: boolean,
): Promise<void> {
  const lager = await hauptlager(tenantId);

  // Mandantenschranke: die ID allein darf nicht genuegen, um einen fremden
  // Platz zu veraendern.
  const treffer = await db.location.updateMany({
    where: { id: locationId, warehouseId: lager.id },
    data: { active: aktiv },
  });

  if (treffer.count === 0) {
    throw new Error("Lagerplatz nicht gefunden.");
  }
  log.info({ locationId, aktiv }, "Lagerplatz umgeschaltet");
}

function zerlegeSicher(code: string) {
  // Eigene kleine Huelle, damit der Import oben lesbar bleibt.
  const treffer = /^([A-Z]+)-?([0-9]+)$/.exec(code);
  if (!treffer) return null;
  const [, shelf, bin] = treffer;
  return shelf && bin ? { shelf, bin } : null;
}
