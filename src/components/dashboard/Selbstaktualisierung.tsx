"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Haelt das Dashboard auf dem Mini-PC im Lager aktuell.
 *
 * Bewusst router.refresh() statt location.reload(): Next laedt nur die
 * Serverdaten neu und ersetzt den Inhalt: Scrollposition und Fokus bleiben
 * erhalten. Ein harter Reload wuerde beides alle 30 Sekunden wegwerfen —
 * genau das, was Kiosk-Anzeigen unbrauchbar macht.
 *
 * Pausiert, wenn der Tab im Hintergrund liegt: ein vergessener Tab soll nicht
 * dauerhaft Last erzeugen.
 */
export function Selbstaktualisierung({
  intervallSekunden = 30,
}: {
  intervallSekunden?: number;
}) {
  const router = useRouter();
  const [zuletzt, setZuletzt] = useState<Date | null>(null);

  useEffect(() => {
    const takt = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setZuletzt(new Date());
    }, intervallSekunden * 1000);

    return () => clearInterval(takt);
  }, [router, intervallSekunden]);

  return (
    <p style={{ margin: 0, fontSize: 13, color: "var(--farbe-text-leise)" }}>
      {zuletzt
        ? `Aktualisiert um ${zuletzt.toLocaleTimeString("de-DE")}`
        : `Aktualisiert sich alle ${intervallSekunden} Sekunden`}
    </p>
  );
}
