import { requireUserWith } from "@/lib/auth";
import { ladeLagerplaetze } from "@/services/locations/locationService";
import { erzeugeBarcodeSvg } from "@/services/labels/barcode";
import { pruefeSkuFuerEtikett } from "@/domain/labels/skuCode";
import { db } from "@/lib/db";
import { DruckKnopf } from "./DruckKnopf";

export const metadata = { title: "Etiketten drucken — Squishova WMS" };
export const dynamic = "force-dynamic";

interface Etikett {
  code: string;
  bezeichnung: string;
  svg?: string;
  problem?: string;
}

/**
 * Druckfertiger Etikettenbogen.
 *
 * Die Produkte tragen keine aufgedruckten Barcodes, deshalb erzeugt das WMS
 * sie selbst. Ohne maschinenlesbaren Code gibt es keine Scan-Pruefung.
 *
 * Die Etiketten werden serverseitig als SVG erzeugt und direkt eingebettet:
 * kein Nachladen im Browser, damit beim Drucken nichts fehlt.
 */
export default async function EtikettenSeite() {
  const user = await requireUserWith("lagerplatz.lesen");

  const [plaetze, produkte] = await Promise.all([
    ladeLagerplaetze(user.tenantId),
    db.product.findMany({
      where: { tenantId: user.tenantId, active: true },
      orderBy: { sku: "asc" },
      select: { sku: true, name: true },
    }),
  ]);

  const lagerplatzEtiketten = plaetze
    .filter((p) => p.active)
    .map((p) => baueEtikett(p.code, lagerplatzBezeichnung(p)));

  const produktEtiketten = produkte.map((p) => baueEtikett(p.sku, p.name));

  return (
    <main style={{ padding: "var(--abstand)", maxWidth: 1100, margin: "0 auto" }}>
      {/* Kopfbereich wird beim Drucken ausgeblendet — auf dem Bogen soll nur
          stehen, was auch aufgeklebt wird. */}
      <div className="nicht-drucken" style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>Etiketten drucken</h1>
        <p style={{ margin: 0, color: "var(--farbe-text-leise)" }}>
          Auf Etikettenbögen oder normales Papier drucken und aufkleben. Jedes
          Etikett trägt den Code als Barcode und als Klartext — falls der Scanner
          einmal streikt, lässt sich der Code ablesen und eintippen.
        </p>
        <DruckKnopf />
      </div>

      <Abschnitt titel="Lagerplätze" etiketten={lagerplatzEtiketten} />
      <Abschnitt titel="Produkte" etiketten={produktEtiketten} />

      <style>{`
        @media print {
          .nicht-drucken { display: none !important; }
          body { background: #fff; }
          /* Ein Etikett darf nicht ueber den Seitenumbruch zerrissen werden. */
          .etikett { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </main>
  );
}

function Abschnitt({ titel, etiketten }: { titel: string; etiketten: Etikett[] }) {
  if (etiketten.length === 0) {
    return (
      <section className="nicht-drucken" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18 }}>{titel}</h2>
        <p style={{ color: "var(--farbe-text-leise)", margin: 0 }}>
          Nichts vorhanden. {titel === "Produkte" && "Produkte kommen über den Shopify-Sync."}
        </p>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 32 }}>
      <h2 className="nicht-drucken" style={{ fontSize: 18 }}>
        {titel} ({etiketten.length})
      </h2>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
        }}
      >
        {etiketten.map((etikett) => (
          <article
            key={etikett.code}
            className="etikett"
            style={{
              border: "1px solid #000",
              borderRadius: 4,
              padding: 10,
              background: "#fff",
              color: "#000",
              textAlign: "center",
            }}
          >
            {etikett.bezeichnung && (
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>
                {etikett.bezeichnung}
              </p>
            )}

            {etikett.svg ? (
              // Serverseitig erzeugtes SVG. Die Eingabe ist die gepruefte SKU,
              // kein Benutzertext aus dem Browser.
              <div dangerouslySetInnerHTML={{ __html: etikett.svg }} />
            ) : (
              <p style={{ margin: 0, fontSize: 12, color: "#b3261e" }}>
                {etikett.problem}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Zweite Zeile auf dem Regaletikett.
 *
 * Ein pauschales "Lagerplatz" ueber jedem Code waere verschenkte Zeile — der
 * Code darunter sagt bereits, worum es geht. Stattdessen die eigene
 * Bezeichnung, sonst die Regalangabe, sonst nichts.
 */
function lagerplatzBezeichnung(platz: {
  name: string | null;
  shelf: string | null;
  bin: string | null;
}): string {
  if (platz.name?.trim()) return platz.name.trim();
  if (platz.shelf) {
    return platz.bin ? `Regal ${platz.shelf}, Fach ${platz.bin}` : `Regal ${platz.shelf}`;
  }
  return "";
}

/** Erzeugt ein Etikett oder — bei nicht druckbarer SKU — den Grund dafür. */
function baueEtikett(code: string, bezeichnung: string): Etikett {
  const probleme = pruefeSkuFuerEtikett(code);
  if (probleme.length > 0) {
    return { code, bezeichnung, problem: probleme.map((p) => p.meldung).join(" ") };
  }

  try {
    return { code, bezeichnung, svg: erzeugeBarcodeSvg(code) };
  } catch (error) {
    return {
      code,
      bezeichnung,
      problem: error instanceof Error ? error.message : "Barcode fehlgeschlagen.",
    };
  }
}
