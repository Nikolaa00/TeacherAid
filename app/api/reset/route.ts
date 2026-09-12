import { hostAuthorized, json, readBody } from "@/lib/api";
import { advance } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody<{ code?: string; key?: string }>(req);
  if (!body?.code) return json({ error: "code required" }, 400);
  if (!hostAuthorized(body.key)) return json({ error: "host key required" }, 401);
  return json(await advance(body.code, "reset"));
}
