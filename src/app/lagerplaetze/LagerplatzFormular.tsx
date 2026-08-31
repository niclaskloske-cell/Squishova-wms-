"use client";

import { useActionState } from "react";
import { lagerplatzAnlegen, type LagerplatzStatus } from "./actions";

const feld: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--farbe-rand)",
  background: "var(--farbe-flaeche)",
  color: "var(--farbe-text)",
  width: "100%",
};

export function LagerplatzFormular() {
  const [status, formAction, laeuft] = useActionState<LagerplatzStatus, FormData>(
    lagerplatzAnlegen,
    {},
  );

  return (
    <form
      action={formAction}
      style={{
        background: "var(--farbe-flaeche)",
        border: "1px solid var(--farbe-rand)",
        borderRadius: "var(--radius)",
        padding: "var(--abstand)",
        display: "grid",
        gap: 12,
      }}
    >
      <h2 style={{ fontSize: 17, margin: 0 }}>Lagerplatz anlegen</h2>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "minmax(120px, 1fr) minmax(160px, 2fr) minmax(160px, 2fr) auto",
          alignItems: "end",
        }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 14 }}>Code</span>
          <input name="code" required placeholder="A01" style={feld} autoComplete="off" />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 14 }}>Bezeichnung (optional)</span>
          <input name="name" placeholder="Regal A, oben" style={feld} autoComplete="off" />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 14 }}>Beschreibung (optional)</span>
          <input name="beschreibung" style={feld} autoComplete="off" />
        </label>

        <button
          type="submit"
          disabled={laeuft}
          style={{
            minHeight: 42,
            padding: "0 18px",
            borderRadius: "var(--radius)",
            border: "none",
            background: "var(--farbe-akzent)",
            color: "var(--farbe-akzent-text)",
            fontWeight: 600,
            cursor: laeuft ? "progress" : "pointer",
          }}
        >
          {laeuft ? "Anlegen …" : "Anlegen"}
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "var(--farbe-text-leise)" }}>
        Die Pick-Reihenfolge wird aus dem Code abgeleitet: A01 vor A02 vor B01.
      </p>

      {status.fehler && (
        <ul
          role="alert"
          style={{
            margin: 0,
            padding: "10px 12px 10px 28px",
            borderRadius: "var(--radius)",
            background: "var(--farbe-fehler-flaeche)",
            color: "var(--farbe-fehler)",
          }}
        >
          {status.fehler.map((meldung) => (
            <li key={meldung}>{meldung}</li>
          ))}
        </ul>
      )}

      {status.erfolg && (
        <p
          role="status"
          style={{
            margin: 0,
            padding: "10px 12px",
            borderRadius: "var(--radius)",
            background: "var(--farbe-erfolg-flaeche)",
            color: "var(--farbe-erfolg)",
          }}
        >
          {status.erfolg}
        </p>
      )}
    </form>
  );
}
