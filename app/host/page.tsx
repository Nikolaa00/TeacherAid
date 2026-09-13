import os from "node:os";
import { headers } from "next/headers";
import { HostScreen } from "@/components/HostScreen";
import { HOST_KEY } from "@/lib/api";
import { content } from "@/lib/content";

export const dynamic = "force-dynamic";

/**
 * The machine's LAN IPv4, so the QR works for phones even when the host
 * page itself is opened via localhost. Prefers real Wi-Fi/Ethernet subnets
 * (192.168.x, 10.x) over virtual adapters. Empty string if none found.
 */
function lanIPv4(): string {
  const candidates: string[] = [];
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === "IPv4" && !info.internal) candidates.push(info.address);
    }
  }
  const byPreference = (ip: string) => (ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : 2);
  candidates.sort((a, b) => byPreference(a) - byPreference(b));
  return candidates[0] ?? "";
}

export default async function HostPage(props: PageProps<"/host">) {
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const code = (one(sp.code) ?? content.code).toUpperCase();
  // The key only ever travels server → this page → the API; it is never rendered.
  const key = one(sp.key) ?? HOST_KEY;
  const lanIp = lanIPv4();
  const hostHeader = (await headers()).get("host") ?? "";
  const port = hostHeader.includes(":") ? hostHeader.split(":").pop() : "";
  return (
    <HostScreen
      code={code}
      hostKey={key}
      initialSim={one(sp.sim) === "1"}
      resetOnLoad={one(sp.reset) === "1"}
      motion={one(sp.motion) !== "0"}
      lanOrigin={lanIp ? `http://${lanIp}${port ? `:${port}` : ""}` : ""}
    />
  );
}
