import { requireUserWith } from "@/lib/auth";
import { baueBoard } from "@/domain/dashboard/board";
import { berechneTageskennzahlen } from "@/domain/dashboard/tageskennzahlen";
import {
  ladeBoardAuftraege,
  ladeKennzahlenAuftraege,
} from "@/services/orders/dashboardQueries";
import { AuftragsBoard } from "@/components/dashboard/AuftragsBoard";
import { Kennzahlen } from "@/components/dashboard/Kennzahlen";
import { Selbstaktualisierung } from "@/components/dashboard/Selbstaktualisierung";

export const metadata = { title: "Lager-Dashboard — Squishova WMS" };

// Immer frisch rendern: eine zwischengespeicherte Auftragsliste waere auf
// einem Kiosk-Bildschirm schlimmer als gar keine.
export const dynamic = "force-dynamic";

export default async function AuftraegeSeite() {
  const user = await requireUserWith("auftrag.lesen");
  const jetzt = new Date();

  const [boardAuftraege, kennzahlenAuftraege] = await Promise.all([
    ladeBoardAuftraege(user.tenantId),
    ladeKennzahlenAuftraege(user.tenantId, jetzt),
  ]);

  const spalten = baueBoard(boardAuftraege);
  const kennzahlen = berechneTageskennzahlen(kennzahlenAuftraege, jetzt);

  return (
    <main style={{ padding: "var(--abstand)", display: "grid", gap: "calc(var(--abstand) * 1.5)" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "var(--abstand)",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 2 }}>Lager-Dashboard</h1>
          <p style={{ margin: 0, color: "var(--farbe-text-leise)" }}>
            Heute, {jetzt.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>
        <Selbstaktualisierung />
      </header>

      <Kennzahlen werte={kennzahlen} />
      <AuftragsBoard spalten={spalten} jetzt={jetzt} />
    </main>
  );
}
