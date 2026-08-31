import { describe, expect, it } from "vitest";
import {
  istDruckbar,
  istEtikettFaehig,
  MAX_SKU_LAENGE,
  pruefeSkuFuerEtikett,
} from "@/domain/labels/skuCode";
import { erzeugeBarcodeSvg, BarcodeError } from "@/services/labels/barcode";

describe("SKU-Pruefung fuer den Etikettendruck", () => {
  it("akzeptiert eine uebliche SKU", () => {
    expect(istEtikettFaehig("SQ-ERDBEER-BUTTER")).toBe(true);
    expect(pruefeSkuFuerEtikett("SQ-ERDBEER-BUTTER")).toEqual([]);
  });

  it("lehnt eine leere SKU mit klarer Meldung ab", () => {
    const probleme = pruefeSkuFuerEtikett("   ");
    expect(probleme[0]?.art).toBe("LEER");
    expect(probleme[0]?.meldung).toMatch(/Keine SKU/);
  });

  it("erkennt Umlaute, die sich nicht codieren lassen", () => {
    expect(istDruckbar("SQ-GRÜN")).toBe(false);
    const probleme = pruefeSkuFuerEtikett("SQ-GRÜN");
    expect(probleme.some((p) => p.art === "ZEICHEN")).toBe(true);
    expect(probleme.find((p) => p.art === "ZEICHEN")?.meldung).toMatch(/Umlaute/);
  });

  it("warnt bei Leerzeichen, weil Scanner sie unterschiedlich behandeln", () => {
    const probleme = pruefeSkuFuerEtikett("SQ ERDBEER");
    expect(probleme.some((p) => p.art === "LEERZEICHEN")).toBe(true);
  });

  it("warnt bei zu langen SKUs", () => {
    const probleme = pruefeSkuFuerEtikett("X".repeat(MAX_SKU_LAENGE + 1));
    expect(probleme.some((p) => p.art === "ZU_LANG")).toBe(true);
    expect(pruefeSkuFuerEtikett("X".repeat(MAX_SKU_LAENGE))).toEqual([]);
  });

  it("meldet mehrere Probleme gleichzeitig", () => {
    const probleme = pruefeSkuFuerEtikett("SQ GRÜN " + "X".repeat(MAX_SKU_LAENGE));
    expect(probleme.map((p) => p.art).sort()).toEqual(["LEERZEICHEN", "ZEICHEN", "ZU_LANG"]);
  });

  it("akzeptiert die ueblichen druckbaren Zeichen", () => {
    expect(istDruckbar("ABC-123_/.#")).toBe(true);
  });
});

describe("Barcode erzeugen", () => {
  it("liefert ein SVG mit der SKU als Klartext", () => {
    const svg = erzeugeBarcodeSvg("SQ-ERDBEER-BUTTER");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });

  it("erzeugt fuer unterschiedliche SKUs unterschiedliche Barcodes", () => {
    expect(erzeugeBarcodeSvg("SQ-A")).not.toBe(erzeugeBarcodeSvg("SQ-B"));
  });

  it("wirft mit Klartext, statt ein unscannbares Etikett zu liefern", () => {
    expect(() => erzeugeBarcodeSvg("SQ-GRÜN")).toThrow(BarcodeError);
    expect(() => erzeugeBarcodeSvg("")).toThrow(/lässt sich nicht als Barcode/);
  });
});
