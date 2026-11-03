/** Dev helper: npx tsx scripts/try-fill.ts <frameworkId> [low|medium] — runs a live fill on the sample transcript. */
import { loadEnv } from "./load-env";
loadEnv();

async function main() {
  const [fwId = "value-feasibility", effort = "low"] = process.argv.slice(2);
  const { callModelJSON } = await import("../src/lib/brain/client");
  const { buildFillUser, FILL_SYSTEM } = await import("../src/lib/brain/prompts");
  const { getBuiltin } = await import("../src/lib/frameworks/builtins");
  const { fillSchemaFor } = await import("../src/lib/frameworks/types");
  const { SAMPLE_PARAGRAPHS } = await import("../src/lib/transcript/sampleScript");
  const fw = getBuiltin(fwId)!;
  const upto = Number(process.env.UPTO ?? SAMPLE_PARAGRAPHS.length);
  const transcript = SAMPLE_PARAGRAPHS.slice(0, upto).map((p, i) => ({ id: `p${i}`, text: p.text, startMs: p.at * 1000 }));
  const res = await callModelJSON({
    label: `try:${fw.id}`,
    system: FILL_SYSTEM,
    user: buildFillUser(fw, transcript, []),
    schema: fillSchemaFor(fw.layout.type),
    effort: effort as "minimal" | "low" | "medium",
    timeoutMs: 60_000,
    format: (process.env.FORMAT as "json_schema" | "json_object") ?? "json_schema",
  });
  console.log(res.ok ? JSON.stringify(res.data, null, 1) : res.error, `${res.latencyMs}ms`);
}
main();
