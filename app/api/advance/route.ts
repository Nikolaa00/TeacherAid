import { hostAuthorized, json, readBody } from "@/lib/api";
import { advance } from "@/lib/session";
import type { AdvanceAction } from "@/lib/types";

export const dynamic = "force-dynamic";

const ACTIONS: AdvanceAction[] = ["next", "nextQuestion", "reset"];

export async function POST(req: Request) {
  const body = await readBody<{ code?: string; key?: string; action?: AdvanceAction }>(req);
  if (!body?.code) return json({ error: "code required" }, 400);
  if (!hostAuthorized(body.key)) return json({ error: "host key required" }, 401);
  const action = ACTIONS.includes(body.action as AdvanceAction) ? (body.action as AdvanceAction) : "next";
  return json(await advance(body.code, action));
}
