import type { Tageskennzahlen } from "@/domain/dashboard/tageskennzahlen";

const KACHELN: Array<{
  schluessel: keyof Tageskennzahlen;
  titel: string;
  /** Fehler wird hervorgehoben, sobald er nicht null ist. */
  warntBeiWert?: boolean;
}> = [
  { schluessel: "bestellungen", titel: "Bestellungen" },
  { schluessel: "gepickt", titel: "Gepickt" },
  { schluessel: "gepackt", titel: "Gepackt" },
  { schluessel: "versendet", titel: "Versendet" },
  { schluessel: "fehler", titel: "Fehler", warntBeiWert: true },
];

/** Tageskennzahlen als Kachelreihe. Auf dem Kiosk-Monitor aus 2 m lesbar. */
export function Kennzahlen({ werte }: { werte: Tageskennzahlen }) {
  return (
    <section
      aria-label="Kennzahlen heute"
      style={{
        display: "grid",
        gap: "var(--abstand)",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
      }}
    >
      {KACHELN.map(({ schluessel, titel, warntBeiWert }) => {
        const wert = werte[schluessel];
        const warnt = Boolean(warntBeiWert && wert > 0);

        return (
          <article
            key={schluessel}
            style={{
              background: warnt ? "var(--farbe-fehler-flaeche)" : "var(--farbe-flaeche)",
              border: `1px solid ${warnt ? "var(--farbe-fehler)" : "var(--farbe-rand)"}`,
              borderRadius: "var(--radius)",
              padding: "var(--abstand)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: warnt ? "var(--farbe-fehler)" : "var(--farbe-text-leise)",
              }}
            >
              {titel}
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                color: warnt ? "var(--farbe-fehler)" : "var(--farbe-text)",
              }}
            >
              {wert}
            </p>
          </article>
        );
      })}
    </section>
  );
}
