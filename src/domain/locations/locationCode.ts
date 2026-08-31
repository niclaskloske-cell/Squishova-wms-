/**
 * Regeln fuer Lagerplatz-Codes.
 *
 * Der Code steht auf dem Etikett am Regal und wird spaeter gescannt. Er muss
 * deshalb dieselben Bedingungen erfuellen wie eine SKU — und zusaetzlich
 * eindeutig und kurz genug sein, um aus zwei Metern lesbar zu bleiben.
 */

export const MAX_CODE_LAENGE = 12;

/** Grossbuchstaben, Ziffern und Bindestrich. Bewusst eng gefasst. */
const ERLAUBT = /^[A-Z0-9-]+$/;

export type CodeProblem =
  | { art: "LEER"; meldung: string }
  | { art: "ZEICHEN"; meldung: string }
  | { art: "ZU_LANG"; meldung: string }
  | { art: "BELEGT"; meldung: string };

/**
 * Normalisiert die Eingabe: Grossbuchstaben, ohne Leerzeichen.
 * "a 01" und "A01" sollen denselben Platz meinen — sonst legt man
 * versehentlich zwei an.
 */
export function normalisiereCode(eingabe: string): string {
  return eingabe.trim().replace(/\s+/g, "").toUpperCase();
}

/**
 * Prueft einen Code. `belegteCodes` enthaelt die bereits vergebenen Codes
 * desselben Lagers — die Eindeutigkeit sichert zusaetzlich ein UNIQUE-Index
 * in der Datenbank ab, aber der Benutzer soll es vorher erklaert bekommen.
 */
export function pruefeLagerplatzCode(
  eingabe: string,
  belegteCodes: readonly string[] = [],
): CodeProblem[] {
  const code = normalisiereCode(eingabe);

  if (!code) {
    return [{ art: "LEER", meldung: "Bitte einen Code eingeben, z. B. A01." }];
  }

  const probleme: CodeProblem[] = [];

  if (!ERLAUBT.test(code)) {
    probleme.push({
      art: "ZEICHEN",
      meldung:
        "Nur Großbuchstaben, Ziffern und Bindestrich erlaubt. " +
        "Umlaute und Sonderzeichen lassen sich nicht als Barcode drucken.",
    });
  }

  if (code.length > MAX_CODE_LAENGE) {
    probleme.push({
      art: "ZU_LANG",
      meldung: `Höchstens ${MAX_CODE_LAENGE} Zeichen, sonst wird das Etikett unleserlich.`,
    });
  }

  if (belegteCodes.map(normalisiereCode).includes(code)) {
    probleme.push({
      art: "BELEGT",
      meldung: `Der Lagerplatz "${code}" existiert bereits.`,
    });
  }

  return probleme;
}

/**
 * Zerlegt einen Code wie "A01" in Regal und Fach.
 *
 * Nur ein Vorschlag fuer die Eingabemaske — wer ein anderes Schema nutzt,
 * traegt Regal und Fach von Hand ein. Deshalb null statt einer Ausnahme,
 * wenn das Muster nicht passt.
 */
export function zerlegeCode(
  code: string,
): { shelf: string; bin: string } | null {
  const treffer = /^([A-Z]+)-?([0-9]+)$/.exec(normalisiereCode(code));
  if (!treffer) return null;
  const [, shelf, bin] = treffer;
  if (!shelf || !bin) return null;
  return { shelf, bin };
}

/**
 * Vorschlag fuer die Pick-Reihenfolge.
 *
 * Regal alphabetisch, darin das Fach numerisch: A01, A02, A03, B01, …
 * Das entspricht dem Weg, den man ohnehin durch das Lager geht. Wer eine
 * andere Route hat, kann den Wert von Hand ueberschreiben.
 */
export function vorschlagPickOrder(code: string): number {
  const teile = zerlegeCode(code);
  if (!teile) return 0;

  // Regalbuchstaben als Zahl: A=1, B=2, … AA=27. Reicht weit ueber jedes
  // realistische Lager hinaus.
  let regal = 0;
  for (const zeichen of teile.shelf) {
    regal = regal * 26 + (zeichen.charCodeAt(0) - 64);
  }

  return regal * 1000 + Number(teile.bin);
}
