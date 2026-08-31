import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { childLogger } from "@/lib/logger";

const log = childLogger("health");

export const dynamic = "force-dynamic";

/**
 * Health-Check fuer den Hoster.
 *
 * Prueft bewusst auch die Datenbankverbindung: eine Anwendung, die zwar
 * antwortet, aber nicht an die Datenbank kommt, ist fuer das Lager nutzlos.
 * Ein Check, der nur "200 OK" sagt, wuerde genau diesen Fall verschweigen.
 *
 * Diese Route ist in der Middleware oeffentlich — der Hoster kann sich nicht
 * anmelden.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", datenbank: "erreichbar" });
  } catch (error) {
    log.error({ err: error }, "Health-Check fehlgeschlagen");
    return NextResponse.json(
      { status: "fehler", datenbank: "nicht erreichbar" },
      { status: 503 },
    );
  }
}
