import bwipjs from "bwip-js/node";
import { childLogger } from "@/lib/logger";
import { istEtikettFaehig } from "@/domain/labels/skuCode";

const log = childLogger("etikett");

export class BarcodeError extends Error {
  constructor(message: string, readonly ursache?: unknown) {
    super(message);
    this.name = "BarcodeError";
  }
}

/**
 * Erzeugt einen Code-128-Barcode als SVG.
 *
 * SVG statt PNG, weil das Etikett gedruckt wird: eine Vektorgrafik bleibt bei
 * jeder Druckerauflösung scharf, ein skaliertes PNG wird an den Balkenkanten
 * unscharf — und unscharfe Kanten sind genau das, woran Scanner scheitern.
 *
 * Wirft mit Klartext statt still ein kaputtes Etikett zu liefern: ein Etikett,
 * das sich nicht scannen laesst, faellt sonst erst im Lager auf.
 */
export function erzeugeBarcodeSvg(
  sku: string,
  optionen: { hoehe?: number; skalierung?: number } = {},
): string {
  if (!istEtikettFaehig(sku)) {
    throw new BarcodeError(
      `SKU "${sku}" lässt sich nicht als Barcode drucken.`,
    );
  }

  try {
    return bwipjs.toSVG({
      bcid: "code128",
      text: sku,
      scale: optionen.skalierung ?? 3,
      height: optionen.hoehe ?? 12,
      includetext: true,
      textxalign: "center",
      textsize: 8,
    });
  } catch (error) {
    log.error({ err: error, sku }, "Barcode konnte nicht erzeugt werden");
    throw new BarcodeError(
      `Barcode für "${sku}" konnte nicht erzeugt werden.`,
      error,
    );
  }
}
