import os from "node:os";
import type { NextConfig } from "next";

/** LAN IPv4 addresses so phones can load dev JS when opening the app via QR. */
function devLanOrigins(): string[] {
  const out = new Set<string>();
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === "IPv4" && !info.internal) out.add(info.address);
    }
  }
  return [...out];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devLanOrigins(),
};

export default nextConfig;
