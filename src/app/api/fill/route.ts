import { runFill } from "@/lib/brain/engine";
import { FillRequestSchema } from "@/lib/brain/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = FillRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid request", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  try {
    return Response.json(await runFill(parsed.data));
  } catch (err) {
    console.error("[fill] unexpected", err);
    return Response.json({ error: "fill failed" }, { status: 500 });
  }
}
