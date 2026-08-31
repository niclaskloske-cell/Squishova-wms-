"use client";

/** Loest den Druckdialog aus. Als Client-Komponente, weil window.print() im
 *  Browser laufen muss. */
export function DruckKnopf() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        justifySelf: "start",
        minHeight: 46,
        padding: "0 22px",
        borderRadius: "var(--radius)",
        border: "none",
        background: "var(--farbe-akzent)",
        color: "var(--farbe-akzent-text)",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Etiketten drucken
    </button>
  );
}
