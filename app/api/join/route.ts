import { json, readBody } from "@/lib/api";
import { join } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody<{ code?: string; nick?: string }>(req);
  if (!body?.code) return json({ error: "code required" }, 400);
  const result = await join(body.code, body.nick ?? "");
  return json(result);
}
