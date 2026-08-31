import { describe, expect, it } from "vitest";
import {
  baueBoard,
  fortschritt,
  istUeberfaellig,
  spalteFuerStatus,
  SPALTEN,
  wartetSeitStunden,
  type BoardAuftrag,
} from "@/domain/dashboard/board";
import { ORDER_STATUSES } from "@/domain/orders/stateMachine";

function auftrag(o: Partial<BoardAuftrag> = {}): BoardAuftrag {
  return {
    id: "a1",
    orderNumber: "#1047",
    status: "NEU",
    placedAt: new Date("2026-08-29T09:00:00Z"),
    positionen: 2,
    mengeGesamt: 3,
    mengeGepickt: 0,
    ...o,
  };
}

describe("Spaltenzuordnung", () => {
  it("legt GEPICKT unter Packen, nicht in eine eigene Spalte", () => {
    expect(spalteFuerStatus("GEPICKT")).toBe("PACKEN");
    expect(spalteFuerStatus("PACKEN")).toBe("PACKEN");
  });

  it("zaehlt GEPACKT und LABEL_ERSTELLT bereits zu Versandbereit", () => {
    expect(spalteFuerStatus("GEPACKT")).toBe("VERSANDBEREIT");
    expect(spalteFuerStatus("LABEL_ERSTELLT")).toBe("VERSANDBEREIT");
    expect(spalteFuerStatus("VERSANDBEREIT")).toBe("VERSANDBEREIT");
  });

  it("blendet abgeschlossene und stornierte Auftraege aus", () => {
    expect(spalteFuerStatus("ABGESCHLOSSEN")).toBeNull();
    expect(spalteFuerStatus("STORNIERT")).toBeNull();
  });

  it("ordnet jeden Status entweder einer Spalte zu oder blendet ihn bewusst aus", () => {
    for (const status of ORDER_STATUSES) {
      const spalte = spalteFuerStatus(status);
      if (spalte !== null) expect(SPALTEN).toContain(spalte);
    }
  });
});

describe("Board aufbauen", () => {
  it("liefert immer alle Spalten, auch leere", () => {
    const board = baueBoard([]);
    expect(board.map((s) => s.id)).toEqual([...SPALTEN]);
    expect(board.every((s) => s.auftraege.length === 0)).toBe(true);
  });

  it("verteilt Auftraege auf die richtigen Spalten", () => {
    const board = baueBoard([
      auftrag({ id: "neu", status: "NEU" }),
      auftrag({ id: "pick", status: "PICKING" }),
      auftrag({ id: "gepickt", status: "GEPICKT" }),
      auftrag({ id: "fehler", status: "FEHLER" }),
    ]);

    const inhalt = Object.fromEntries(
      board.map((s) => [s.id, s.auftraege.map((a) => a.id)]),
    );
    expect(inhalt).toMatchObject({
      OFFEN: ["neu"],
      PICKING: ["pick"],
      PACKEN: ["gepickt"],
      FEHLER: ["fehler"],
    });
  });

  it("sortiert innerhalb einer Spalte aelteste Bestellung zuerst", () => {
    const board = baueBoard([
      auftrag({ id: "neuer", placedAt: new Date("2026-08-30T09:00:00Z") }),
      auftrag({ id: "aelter", placedAt: new Date("2026-08-28T09:00:00Z") }),
    ]);
    expect(board[0]?.auftraege.map((a) => a.id)).toEqual(["aelter", "neuer"]);
  });

  it("laesst abgeschlossene Auftraege vom Board verschwinden", () => {
    const board = baueBoard([
      auftrag({ status: "ABGESCHLOSSEN" }),
      auftrag({ status: "STORNIERT" }),
    ]);
    expect(board.every((s) => s.auftraege.length === 0)).toBe(true);
  });
});

describe("Fortschritt", () => {
  it("rechnet den Anteil in Prozent", () => {
    expect(fortschritt(auftrag({ mengeGesamt: 4, mengeGepickt: 1 }))).toBe(25);
    expect(fortschritt(auftrag({ mengeGesamt: 3, mengeGepickt: 3 }))).toBe(100);
  });

  it("kommt mit Menge 0 klar, statt durch null zu teilen", () => {
    expect(fortschritt(auftrag({ mengeGesamt: 0, mengeGepickt: 0 }))).toBe(0);
  });

  it("deckelt bei 100 Prozent", () => {
    expect(fortschritt(auftrag({ mengeGesamt: 2, mengeGepickt: 5 }))).toBe(100);
  });
});

describe("Wartezeit", () => {
  const jetzt = new Date("2026-08-30T09:00:00Z");

  it("rechnet volle Stunden seit der Bestellung", () => {
    const a = auftrag({ placedAt: new Date("2026-08-30T06:30:00Z") });
    expect(wartetSeitStunden(a, jetzt)).toBe(2);
  });

  it("meldet nie negative Wartezeit bei kuenftigem Datum", () => {
    const a = auftrag({ placedAt: new Date("2026-09-01T00:00:00Z") });
    expect(wartetSeitStunden(a, jetzt)).toBe(0);
  });

  it("markiert ab 24 Stunden als ueberfaellig", () => {
    expect(istUeberfaellig(auftrag({ placedAt: new Date("2026-08-29T09:00:00Z") }), jetzt)).toBe(true);
    expect(istUeberfaellig(auftrag({ placedAt: new Date("2026-08-29T10:00:00Z") }), jetzt)).toBe(false);
  });
});
