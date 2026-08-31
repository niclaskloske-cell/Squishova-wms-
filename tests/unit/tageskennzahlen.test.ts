import { describe, expect, it } from "vitest";
import {
  amSelbenTag,
  berechneTageskennzahlen,
  type AuftragFuerKennzahlen,
} from "@/domain/dashboard/tageskennzahlen";

const HEUTE = new Date("2026-08-31T14:00:00");

function auftrag(o: Partial<AuftragFuerKennzahlen> = {}): AuftragFuerKennzahlen {
  return { status: "NEU", placedAt: new Date("2026-08-31T09:00:00"), ...o };
}

describe("Tagesvergleich", () => {
  it("erkennt denselben Kalendertag unabhaengig von der Uhrzeit", () => {
    expect(amSelbenTag(new Date("2026-08-31T23:59:00"), HEUTE)).toBe(true);
    expect(amSelbenTag(new Date("2026-08-31T00:01:00"), HEUTE)).toBe(true);
  });

  it("trennt Vortag und Folgetag sauber ab", () => {
    expect(amSelbenTag(new Date("2026-08-30T23:59:00"), HEUTE)).toBe(false);
    expect(amSelbenTag(new Date("2026-09-01T00:01:00"), HEUTE)).toBe(false);
  });

  it("behandelt fehlende Zeitstempel als nicht heute", () => {
    expect(amSelbenTag(null, HEUTE)).toBe(false);
    expect(amSelbenTag(undefined, HEUTE)).toBe(false);
  });
});

describe("Tageskennzahlen", () => {
  it("liefert bei leerer Liste ueberall null", () => {
    expect(berechneTageskennzahlen([], HEUTE)).toEqual({
      bestellungen: 0,
      gepickt: 0,
      gepackt: 0,
      versendet: 0,
      fehler: 0,
    });
  });

  it("zaehlt jeden Arbeitsschritt einzeln, auch beim selben Auftrag", () => {
    const kennzahlen = berechneTageskennzahlen(
      [
        auftrag({
          pickedAt: new Date("2026-08-31T10:00:00"),
          packedAt: new Date("2026-08-31T11:00:00"),
          completedAt: new Date("2026-08-31T12:00:00"),
        }),
      ],
      HEUTE,
    );
    expect(kennzahlen).toMatchObject({
      bestellungen: 1,
      gepickt: 1,
      gepackt: 1,
      versendet: 1,
    });
  });

  it("ignoriert Schritte von gestern", () => {
    const kennzahlen = berechneTageskennzahlen(
      [
        auftrag({
          placedAt: new Date("2026-08-30T09:00:00"),
          pickedAt: new Date("2026-08-30T10:00:00"),
          packedAt: new Date("2026-08-31T08:00:00"),
        }),
      ],
      HEUTE,
    );
    expect(kennzahlen).toMatchObject({ bestellungen: 0, gepickt: 0, gepackt: 1 });
  });

  it("zaehlt Fehler nach aktuellem Zustand, nicht nach Datum", () => {
    const kennzahlen = berechneTageskennzahlen(
      [
        auftrag({ status: "FEHLER", placedAt: new Date("2026-07-01T09:00:00") }),
        auftrag({ status: "NEU" }),
      ],
      HEUTE,
    );
    expect(kennzahlen.fehler).toBe(1);
    expect(kennzahlen.bestellungen).toBe(1);
  });
});
