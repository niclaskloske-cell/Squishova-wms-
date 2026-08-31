import { describe, expect, it } from "vitest";
import {
  MAX_CODE_LAENGE,
  normalisiereCode,
  pruefeLagerplatzCode,
  vorschlagPickOrder,
  zerlegeCode,
} from "@/domain/locations/locationCode";

describe("Code normalisieren", () => {
  it("macht Grossbuchstaben und entfernt Leerzeichen", () => {
    expect(normalisiereCode("  a 01 ")).toBe("A01");
  });

  it("behandelt unterschiedliche Schreibweisen als denselben Platz", () => {
    expect(normalisiereCode("a01")).toBe(normalisiereCode("A 01"));
  });
});

describe("Code pruefen", () => {
  it("akzeptiert uebliche Codes", () => {
    for (const code of ["A01", "B02", "LAGER-1", "AA10"]) {
      expect(pruefeLagerplatzCode(code), code).toEqual([]);
    }
  });

  it("verlangt eine Eingabe", () => {
    expect(pruefeLagerplatzCode("   ")[0]?.art).toBe("LEER");
  });

  it("lehnt Umlaute und Sonderzeichen ab", () => {
    for (const code of ["A0Ü", "A#1", "A.1"]) {
      expect(pruefeLagerplatzCode(code).some((p) => p.art === "ZEICHEN"), code).toBe(true);
    }
  });

  it("begrenzt die Laenge", () => {
    expect(pruefeLagerplatzCode("A".repeat(MAX_CODE_LAENGE))).toEqual([]);
    expect(
      pruefeLagerplatzCode("A".repeat(MAX_CODE_LAENGE + 1)).some((p) => p.art === "ZU_LANG"),
    ).toBe(true);
  });

  it("erkennt einen bereits vergebenen Code", () => {
    const probleme = pruefeLagerplatzCode("A01", ["A01", "B02"]);
    expect(probleme[0]?.art).toBe("BELEGT");
    expect(probleme[0]?.meldung).toMatch(/A01/);
  });

  it("erkennt Belegung auch bei abweichender Schreibweise", () => {
    expect(pruefeLagerplatzCode("a 01", ["A01"]).some((p) => p.art === "BELEGT")).toBe(true);
  });
});

describe("Code zerlegen", () => {
  it("trennt Regal und Fach", () => {
    expect(zerlegeCode("A01")).toEqual({ shelf: "A", bin: "01" });
    expect(zerlegeCode("AA-12")).toEqual({ shelf: "AA", bin: "12" });
  });

  it("gibt null zurueck, wenn das Muster nicht passt", () => {
    for (const code of ["LAGER", "1A", "A1B2"]) {
      expect(zerlegeCode(code), code).toBeNull();
    }
  });
});

describe("Pick-Reihenfolge vorschlagen", () => {
  it("sortiert Regal alphabetisch, darin das Fach numerisch", () => {
    const codes = ["B01", "A03", "A01", "A02", "B02"];
    const sortiert = [...codes].sort((a, b) => vorschlagPickOrder(a) - vorschlagPickOrder(b));
    expect(sortiert).toEqual(["A01", "A02", "A03", "B01", "B02"]);
  });

  it("kommt mit zweibuchstabigen Regalen klar", () => {
    expect(vorschlagPickOrder("Z99")).toBeLessThan(vorschlagPickOrder("AA01"));
  });

  it("liefert 0 fuer Codes ohne erkennbares Muster", () => {
    expect(vorschlagPickOrder("LAGER")).toBe(0);
  });
});
