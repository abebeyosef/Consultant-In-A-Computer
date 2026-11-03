/**
 * `npm run eval` — runs the /api/check logic on evals/check-cases.json against
 * the live model and prints a pass/fail table plus latency. Target: ≥ 8/10 and
 * no false positives on the "none" cases. Skips gracefully in mock mode.
 * Pass `--mock` to score the offline mock engine instead.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "./load-env";
loadEnv();

type Case = { id: string; expect: string; text: string };

async function main() {
  const useMock = process.argv.includes("--mock");
  if (useMock) process.env.MOCK_MODE = "1";
  const { getModelConfig, isMockMode } = await import("../src/lib/brain/client");
  const { runCheck } = await import("../src/lib/brain/engine");
  const { BUILTIN_FRAMEWORKS } = await import("../src/lib/frameworks/builtins");
  const { splitSentences } = await import("../src/lib/transcript/sampleScript");

  const cfg = getModelConfig();
  if (isMockMode(cfg) && !useMock) {
    console.log(`eval skipped: mock mode (${cfg.mockForced ? "MOCK_MODE=1" : "no MODEL_API_KEY"}). Use --mock to score the offline engine.`);
    return;
  }
  const cases: Case[] = JSON.parse(readFileSync(join(process.cwd(), "evals/check-cases.json"), "utf8"));
  const catalogue = BUILTIN_FRAMEWORKS.map((f) => ({ id: f.id, name: f.name, whenToUse: f.whenToUse, signals: f.signals }));
  console.log(`Engine: ${useMock ? "mock" : `live ${cfg.model}`} · ${cases.length} cases\n`);

  let pass = 0;
  let falsePos = 0;
  const lat: number[] = [];
  const rows: string[] = [];
  for (const c of cases) {
    const window = splitSentences(c.text).map((text, i) => ({ id: `${c.id}-s${i}`, text, startMs: i * 5000 }));
    const r = await runCheck({ window, marked: [], catalogue, recent: [], muted: [], manual: false });
    const got = r.fit === "none" ? "none" : r.frameworkId ?? "none";
    const ok = got === c.expect;
    if (ok) pass++;
    if (c.expect === "none" && got !== "none") falsePos++;
    lat.push(r.latencyMs);
    rows.push(
      `${ok ? "PASS" : "FAIL"}  ${c.id.padEnd(7)} expect ${c.expect.padEnd(18)} got ${got.padEnd(18)} ${String(r.latencyMs).padStart(6)}ms  ${r.engine}${r.reason ? `  “${r.reason}”` : ""}`,
    );
    console.log(rows[rows.length - 1]);
  }
  lat.sort((a, b) => a - b);
  const median = lat[Math.floor(lat.length / 2)];
  console.log(`\nScore ${pass}/${cases.length} · false positives on "none": ${falsePos} · median ${median}ms · max ${lat[lat.length - 1]}ms`);
  const target = pass >= 8 && falsePos === 0;
  console.log(target ? "Target met (≥ 8/10, no false positives)." : "Target NOT met.");
  process.exitCode = target ? 0 : 1;
}
main();
