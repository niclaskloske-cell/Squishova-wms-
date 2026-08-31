import Link from "next/link";
import { requireUserWith } from "@/lib/auth";
import { can } from "@/domain/auth/permissions";
import { ladeLagerplaetze } from "@/services/locations/locationService";
import { lagerplatzUmschalten } from "./actions";
import { LagerplatzFormular } from "./LagerplatzFormular";

export const metadata = { title: "Lagerplätze — Squishova WMS" };
export const dynamic = "force-dynamic";

export default async function LagerplaetzeSeite() {
  const user = await requireUserWith("lagerplatz.lesen");
  const plaetze = await ladeLagerplaetze(user.tenantId);
  const darfVerwalten = can(user, "lagerplatz.verwalten");

  return (
    <main
      style={{
        padding: "calc(var(--abstand) * 1.5)",
        maxWidth: 1000,
        margin: "0 auto",
        display: "grid",
        gap: "calc(var(--abstand) * 1.5)",
      }}
    >
      <header>
        <h1 style={{ fontSize: 24, marginBottom: 4 }}>Lagerplätze</h1>
        <p style={{ margin: 0, color: "var(--farbe-text-leise)" }}>
          Die Reihenfolge bestimmt den Weg beim Picken.{" "}
          <Link href="/etiketten">Etiketten drucken</Link>
        </p>
      </header>

      {darfVerwalten && <LagerplatzFormular />}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "2px solid var(--farbe-rand)" }}>
            <th style={{ padding: 8 }}>Code</th>
            <th style={{ padding: 8 }}>Bezeichnung</th>
            <th style={{ padding: 8 }}>Reihenfolge</th>
            <th style={{ padding: 8 }}>Produkte</th>
            <th style={{ padding: 8 }}>Status</th>
            {darfVerwalten && <th style={{ padding: 8 }} />}
          </tr>
        </thead>
        <tbody>
          {plaetze.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: "var(--farbe-text-leise)" }}>
                Noch keine Lagerplätze angelegt.
              </td>
            </tr>
          )}

          {plaetze.map((platz) => (
            <tr
              key={platz.id}
              style={{
                borderBottom: "1px solid var(--farbe-rand)",
                opacity: platz.active ? 1 : 0.55,
              }}
            >
              <td style={{ padding: 8, fontWeight: 600, fontSize: 17 }}>{platz.code}</td>
              <td style={{ padding: 8 }}>
                {platz.name ?? <span style={{ color: "var(--farbe-text-leise)" }}>—</span>}
              </td>
              <td style={{ padding: 8, fontVariantNumeric: "tabular-nums" }}>
                {platz.pickOrder}
              </td>
              <td style={{ padding: 8, fontVariantNumeric: "tabular-nums" }}>
                {platz.belegtMitProdukten}
              </td>
              <td style={{ padding: 8 }}>{platz.active ? "Aktiv" : "Inaktiv"}</td>

              {darfVerwalten && (
                <td style={{ padding: 8, textAlign: "right" }}>
                  <form action={lagerplatzUmschalten}>
                    <input type="hidden" name="id" value={platz.id} />
                    <input type="hidden" name="aktiv" value={String(!platz.active)} />
                    <button
                      type="submit"
                      style={{
                        minHeight: 36,
                        padding: "0 14px",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--farbe-rand)",
                        background: "var(--farbe-flaeche)",
                        cursor: "pointer",
                      }}
                    >
                      {platz.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Ein belegter Platz laesst sich deaktivieren, aber der Hinweis gehoert
          sichtbar hin — sonst wundert sich jemand ueber verschwundene Bestaende. */}
      <p style={{ margin: 0, fontSize: 14, color: "var(--farbe-text-leise)" }}>
        Lagerplätze werden nie gelöscht, nur deaktiviert. Ein deaktivierter Platz
        verschwindet aus der Auswahl, seine Bestandshistorie bleibt nachvollziehbar.
      </p>
    </main>
  );
}
