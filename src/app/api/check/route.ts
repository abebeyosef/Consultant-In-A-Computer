import { runCheck } from "@/lib/brain/engine";
import { CheckRequestSchema } from "@/lib/brain/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = CheckRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid request", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });
  try {
    return Response.json(await runCheck(parsed.data));
  } catch (err) {
    console.error("[check] unexpected", err);
    return Response.json({ fit: "none", frameworkId: null, reason: "", evidenceQuote: "", evidenceSegmentIds: [], engine: "mock", latencyMs: 0 });
  }
}
