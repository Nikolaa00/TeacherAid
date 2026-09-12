import { json } from "@/lib/api";
import { getState } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return json({ error: "code required" }, 400);
  const nick = url.searchParams.get("nick");
  return json(await getState(code, nick === null ? undefined : nick));
}
