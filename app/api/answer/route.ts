import { json, readBody } from "@/lib/api";
import { answer } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody<{ code?: string; nick?: string; qIndex?: number; choice?: number; reason?: string }>(req);
  if (!body?.code || !body.nick || typeof body.qIndex !== "number" || typeof body.choice !== "number") {
    return json({ ok: false, error: "bad-request" }, 400);
  }
  const result = await answer(body.code, body.nick, body.qIndex, body.choice, body.reason ?? "");
  return json(result, result.ok ? 200 : 409);
}
