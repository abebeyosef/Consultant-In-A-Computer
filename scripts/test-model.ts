import { loadEnv } from "./load-env";
loadEnv();

async function main() {
  const { getModelConfig, isMockMode, callModelText, callModelJSON } = await import("../src/lib/brain/client");
  const { z } = await import("zod");
  const cfg = getModelConfig();
  if (isMockMode(cfg)) {
    console.log(`mock mode: ${cfg.mockForced ? "MOCK_MODE=1" : "no key"} — the app will use the offline mock engine.`);
    return;
  }
  console.log(`Model: ${cfg.model} @ ${cfg.baseURL}`);
  const r = await callModelText("Say hi in five words or fewer.");
  if (r.ok) console.log(`text  OK  ${r.latencyMs}ms  →  ${r.data.trim().slice(0, 200)}`);
  else console.log(`text  FAIL ${r.latencyMs}ms  →  ${r.error}`);

  const j = await callModelJSON({
    label: "smoke",
    system: "You return tiny JSON objects.",
    user: 'Return {"greeting": "<a short greeting>"}',
    schema: z.object({ greeting: z.string() }),
    effort: "low",
    timeoutMs: 20_000,
  });
  if (j.ok) console.log(`json  OK  ${j.latencyMs}ms  →  ${JSON.stringify(j.data)}`);
  else console.log(`json  FAIL ${j.latencyMs}ms  →  ${j.error}`);
  process.exitCode = r.ok ? 0 : 1;
}
main();
