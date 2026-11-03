/**
 * Server-side brain: live model with defensive fallbacks, mock otherwise.
 * Post-processing rules (§6.2) are applied identically to live and mock output.
 */
import { fillSchemaFor, type AnyFill, type FrameworkTemplate } from "@/lib/frameworks/types";
import { callModelJSON, callModelJSONHedged, isMockMode, liveAvailable } from "./client";
import { checkEvidence } from "./evidence";
import { hintFor, limitFill, mockCheck, mockFill, reasonFor, verifyFillQuotes } from "./mock";
import { buildCheckUser, buildFillUser, CHECK_SYSTEM, FILL_SYSTEM } from "./prompts";
import { type CheckRequest, type CheckResult, type FillRequest, type FillResult, type ModelCheck, ModelCheckSchema } from "./schemas";

/**
 * Keep the model's reason only if it's one clean sentence of ≤ 22 words with no
 * repeated phrases; otherwise use the framework's plain template reason.
 */
export function cleanReason(raw: string, fw: { id: string; name: string; whenToUse: string; signals: string[] }): string {
  const text = raw.replace(/\s+/g, " ").trim();
  const first = (text.match(/^[^.!?]+[.!?]/)?.[0] ?? text).trim();
  const words = first.split(" ").filter(Boolean);
  const lower = text.toLowerCase();
  const grams = new Set<string>();
  let repeated = false;
  const w = lower.split(" ");
  for (let i = 0; i + 3 <= w.length; i++) {
    const g = w.slice(i, i + 3).join(" ");
    if (grams.has(g)) repeated = true;
    grams.add(g);
  }
  if (!first || words.length < 4 || words.length > 22 || repeated) return reasonFor(fw);
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

export function postProcessCheck(raw: ModelCheck, req: CheckRequest, engine: "live" | "mock", latencyMs: number): CheckResult {
  const none: CheckResult = { fit: "none", frameworkId: null, reason: "", evidenceQuote: "", evidenceSegmentIds: [], engine, latencyMs };
  if (raw.fit === "none" || !raw.frameworkId) return none;
  const fw = req.catalogue.find((c) => c.id === raw.frameworkId);
  if (!fw) return none;
  if (req.recent.includes(fw.id) || req.muted.includes(fw.id)) return none;
  // Only strong fits auto-flag; the manual button may return "possible".
  if (!req.manual && raw.fit !== "strong") return none;
  const ev = checkEvidence(raw.evidenceQuote, [...req.marked, ...req.window]);
  const reason = cleanReason(raw.reason, fw);
  return {
    fit: raw.fit,
    frameworkId: fw.id,
    reason,
    evidenceQuote: ev.quote,
    evidenceSegmentIds: ev.segmentIds,
    fitHint: hintFor(fw.id),
    engine,
    latencyMs,
  };
}

export async function runCheck(req: CheckRequest): Promise<CheckResult> {
  const t0 = Date.now();
  if (!isMockMode() && liveAvailable() && req.window.length > 0) {
    const res = await callModelJSON({
      label: req.manual ? "check-manual" : "check",
      system: CHECK_SYSTEM,
      user: buildCheckUser(req),
      schema: ModelCheckSchema,
      effort: "low",
      timeoutMs: 20_000,
    });
    if (res.ok) return postProcessCheck(res.data, req, "live", res.latencyMs);
    console.warn("[check] live failed → mock:", res.error.slice(0, 160));
  }
  const m = mockCheck(req);
  return postProcessCheck(m, req, "mock", Date.now() - t0);
}

export async function runFill(req: FillRequest): Promise<FillResult> {
  const t0 = Date.now();
  const fw = req.framework as FrameworkTemplate;
  const schema = fillSchemaFor(fw.layout.type);
  const transcript = [...req.marked, ...req.transcript];
  if (!isMockMode() && liveAvailable() && req.transcript.length > 0) {
    const res = await callModelJSONHedged(
      {
        label: `fill:${fw.id}`,
        system: FILL_SYSTEM,
        user: buildFillUser(fw, req.transcript, req.marked),
        schema,
        effort: "minimal",
        timeoutMs: 40_000,
      },
      10_000,
    );
    if (res.ok) {
      const fill = limitFill(verifyFillQuotes(res.data as AnyFill, transcript));
      return { fill, engine: "live", latencyMs: res.latencyMs };
    }
    console.warn("[fill] live failed → mock:", res.error.slice(0, 160));
  }
  const m = mockFill(fw, transcript);
  return { fill: limitFill(m.fill), engine: "mock", latencyMs: Date.now() - t0, canned: m.canned };
}
