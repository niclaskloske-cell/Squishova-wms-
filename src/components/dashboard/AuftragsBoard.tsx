import {
  fortschritt,
  istUeberfaellig,
  wartetSeitStunden,
  type BoardAuftrag,
  type BoardSpalte,
} from "@/domain/dashboard/board";

/** Spaltenansicht der offenen Auftraege — der Hauptblick im Lager. */
export function AuftragsBoard({
  spalten,
  jetzt,
}: {
  spalten: BoardSpalte[];
  jetzt: Date;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--abstand)",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        alignItems: "start",
      }}
    >
      {spalten.map((spalte) => (
        <section
          key={spalte.id}
          aria-label={spalte.titel}
          style={{
            background: "var(--farbe-flaeche)",
            border: "1px solid var(--farbe-rand)",
            borderRadius: "var(--radius)",
            padding: "var(--abstand)",
          }}
        >
          <h2 style={{ fontSize: 15, display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{spalte.titel}</span>
            <span
              style={{ color: "var(--farbe-text-leise)", fontVariantNumeric: "tabular-nums" }}
            >
              {spalte.auftraege.length}
            </span>
          </h2>

          {spalte.auftraege.length === 0 ? (
            <p style={{ margin: 0, color: "var(--farbe-text-leise)", fontSize: 14 }}>
              Nichts offen
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {spalte.auftraege.map((auftrag) => (
                <li key={auftrag.id}>
                  <AuftragsKarte auftrag={auftrag} jetzt={jetzt} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function AuftragsKarte({ auftrag, jetzt }: { auftrag: BoardAuftrag; jetzt: Date }) {
  const anteil = fortschritt(auftrag);
  const ueberfaellig = istUeberfaellig(auftrag, jetzt);
  const stunden = wartetSeitStunden(auftrag, jetzt);
  const imFehler = auftrag.status === "FEHLER";

  return (
    <article
      style={{
        border: `1px solid ${imFehler ? "var(--farbe-fehler)" : "var(--farbe-rand)"}`,
        borderRadius: "var(--radius)",
        padding: 12,
        background: imFehler ? "var(--farbe-fehler-flaeche)" : "transparent",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong style={{ fontSize: 17 }}>{auftrag.orderNumber}</strong>
        <span
          style={{
            fontSize: 13,
            color: ueberfaellig ? "var(--farbe-warnung)" : "var(--farbe-text-leise)",
            fontWeight: ueberfaellig ? 600 : 400,
            whiteSpace: "nowrap",
          }}
          // Die reine Stundenzahl ist auf dem Board knapp; der Titel nennt
          // den Bestellzeitpunkt vollstaendig.
          title={auftrag.placedAt.toLocaleString("de-DE")}
        >
          {stunden < 1 ? "gerade eben" : `seit ${stunden} h`}
        </span>
      </div>

      <p style={{ margin: "4px 0 8px", fontSize: 14, color: "var(--farbe-text-leise)" }}>
        {auftrag.positionen} {auftrag.positionen === 1 ? "Position" : "Positionen"} ·{" "}
        {auftrag.mengeGepickt}/{auftrag.mengeGesamt} Stück
      </p>

      {/* Fortschrittsbalken: role und aria-Werte, damit der Wert auch
          vorgelesen wird und nicht nur farblich existiert. */}
      <div
        role="progressbar"
        aria-valuenow={anteil}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Gepickt: ${anteil} Prozent`}
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--farbe-rand)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${anteil}%`,
            height: "100%",
            background: anteil === 100 ? "var(--farbe-erfolg)" : "var(--farbe-akzent)",
          }}
        />
      </div>

      {imFehler && auftrag.errorMessage && (
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--farbe-fehler)" }}>
          {auftrag.errorMessage}
        </p>
      )}
    </article>
  );
}
