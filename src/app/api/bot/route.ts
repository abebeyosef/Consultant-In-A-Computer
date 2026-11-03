import { botEnabled, getTranscript, startBot, stopBot } from "@/lib/bot/server";
import { meetCode } from "@/lib/bot/types";

export const dynamic = "force-dynamic";

const off = () => Response.json({ error: "Meeting bot is turned off (ENABLE_MEET_BOT=1 to enable)." }, { status: 404 });

function code(req: Request, body?: { meetUrl?: string }) {
  const url = body?.meetUrl ?? new URL(req.url).searchParams.get("meetUrl") ?? "";
  return meetCode(url);
}

/** Join: { meetUrl } */
export async function POST(req: Request) {
  if (!botEnabled()) return off();
  const body = (await req.json().catch(() => ({}))) as { meetUrl?: string };
  const c = code(req, body);
  if (!c) return Response.json({ error: "That isn't a Google Meet link." }, { status: 400 });
  const r = await startBot(c);
  return r.ok ? Response.json({ ok: true }) : Response.json({ error: r.message }, { status: 502 });
}

/** Poll: ?meetUrl= */
export async function GET(req: Request) {
  if (!botEnabled()) return off();
  const c = code(req);
  if (!c) return Response.json({ error: "That isn't a Google Meet link." }, { status: 400 });
  try {
    return Response.json(await getTranscript(c));
  } catch (err) {
    console.warn("[bot] poll failed", err);
    return Response.json({ status: "error", segments: [], message: "Couldn't reach the bot service." });
  }
}

/** Leave: ?meetUrl= */
export async function DELETE(req: Request) {
  if (!botEnabled()) return off();
  const c = code(req);
  if (c) await stopBot(c);
  return Response.json({ ok: true });
}
