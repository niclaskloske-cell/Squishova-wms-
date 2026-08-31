/**
 * Regeln fuer SKUs, die als Code-128-Etikett gedruckt und spaeter gescannt
 * werden sollen.
 *
 * Reine Logik, damit die Pruefung vor dem Druck genauso funktioniert wie beim
 * Scannen — beides muss dieselbe Vorstellung davon haben, was ein gueltiger
 * Code ist.
 */

/**
 * Code 128 Zeichensatz B deckt die druckbaren ASCII-Zeichen ab (Leerzeichen
 * bis Tilde). Umlaute und andere Zeichen ausserhalb davon lassen sich nicht
 * codieren — die muessen vor dem Druck auffallen, nicht erst am Scanner.
 */
export function istDruckbar(sku: string): boolean {
  if (!sku) return false;
  for (const zeichen of sku) {
    const code = zeichen.codePointAt(0) ?? 0;
    if (code < 0x20 || code > 0x7e) return false;
  }
  return true;
}

export type SkuProblem =
  | { art: "LEER"; meldung: string }
  | { art: "ZEICHEN"; meldung: string }
  | { art: "LEERZEICHEN"; meldung: string }
  | { art: "ZU_LANG"; meldung: string };

/** Ab dieser Laenge wird das Etikett auf ueblichen Rollen unleserlich schmal. */
export const MAX_SKU_LAENGE = 48;

/**
 * Prueft eine SKU vor dem Etikettendruck.
 *
 * Gibt eine Liste von Problemen zurueck statt nur true/false: der Benutzer
 * soll wissen, was genau er korrigieren muss.
 */
export function pruefeSkuFuerEtikett(sku: string): SkuProblem[] {
  const probleme: SkuProblem[] = [];

  if (!sku.trim()) {
    return [{ art: "LEER", meldung: "Keine SKU hinterlegt — Etikett nicht möglich." }];
  }

  if (!istDruckbar(sku)) {
    probleme.push({
      art: "ZEICHEN",
      meldung:
        "SKU enthält Zeichen, die sich nicht als Barcode drucken lassen " +
        "(z. B. Umlaute). Bitte in Shopify auf Buchstaben, Ziffern und Bindestrich ändern.",
    });
  }

  if (sku !== sku.trim() || /\s/.test(sku)) {
    // Ein Leerzeichen im Code ist druckbar, faellt aber beim Scannen auf:
    // manche Scanner schneiden es ab, andere nicht.
    probleme.push({
      art: "LEERZEICHEN",
      meldung:
        "SKU enthält Leerzeichen. Scanner behandeln die unterschiedlich — " +
        "bitte in Shopify entfernen.",
    });
  }

  if (sku.length > MAX_SKU_LAENGE) {
    probleme.push({
      art: "ZU_LANG",
      meldung: `SKU ist länger als ${MAX_SKU_LAENGE} Zeichen und wird als Barcode zu schmal.`,
    });
  }

  return probleme;
}

export function istEtikettFaehig(sku: string): boolean {
  return pruefeSkuFuerEtikett(sku).length === 0;
}
