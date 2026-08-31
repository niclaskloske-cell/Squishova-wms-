"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserWith } from "@/lib/auth";
import { childLogger } from "@/lib/logger";
import { legeLagerplatzAn, setzeLagerplatzAktiv } from "@/services/locations/locationService";

const log = childLogger("lagerplatz-action");

export interface LagerplatzStatus {
  fehler?: string[];
  erfolg?: string;
}

const anlegenSchema = z.object({
  code: z.string().min(1, "Bitte einen Code eingeben, z. B. A01."),
  name: z.string().optional(),
  description: z.string().optional(),
});

export async function lagerplatzAnlegen(
  _bisher: LagerplatzStatus,
  formData: FormData,
): Promise<LagerplatzStatus> {
  const user = await requireUserWith("lagerplatz.verwalten");

  const eingabe = anlegenSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name") ?? undefined,
    description: formData.get("beschreibung") ?? undefined,
  });

  if (!eingabe.success) {
    return { fehler: eingabe.error.issues.map((i) => i.message) };
  }

  try {
    const ergebnis = await legeLagerplatzAn(user.tenantId, eingabe.data);
    if (!ergebnis.ok) return { fehler: ergebnis.meldungen };

    revalidatePath("/lagerplaetze");
    return { erfolg: `Lagerplatz ${ergebnis.code} angelegt.` };
  } catch (error) {
    log.error({ err: error }, "Lagerplatz anlegen fehlgeschlagen");
    return {
      fehler: [
        "Lagerplatz konnte nicht angelegt werden. Bitte erneut versuchen.",
      ],
    };
  }
}

export async function lagerplatzUmschalten(formData: FormData): Promise<void> {
  const user = await requireUserWith("lagerplatz.verwalten");
  const id = String(formData.get("id") ?? "");
  const aktiv = formData.get("aktiv") === "true";

  await setzeLagerplatzAktiv(user.tenantId, id, aktiv);
  revalidatePath("/lagerplaetze");
}
