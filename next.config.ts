import type { NextConfig } from "next";

const config: NextConfig = {
  // Erzeugt einen eigenstaendigen Server mit nur den wirklich benoetigten
  // Abhaengigkeiten. Das Docker-Image bleibt dadurch klein, statt die
  // kompletten node_modules mitzuschleppen.
  output: "standalone",

  // Fehler beim Build sichtbar machen statt sie in die Produktion zu lassen.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default config;
