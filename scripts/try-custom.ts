/** Live check: does the model suggest and fill a custom framework? `npx tsx scripts/try-custom.ts` */
import { loadEnv } from "./load-env";
loadEnv();
async function main() {
  const { runCheck, runFill } = await import("../src/lib/brain/engine");
  const { BUILTIN_FRAMEWORKS } = await import("../src/lib/frameworks/builtins");
  const { buildCustomFramework } = await import("../src/lib/frameworks/customForm");
  const { splitSentences } = await import("../src/lib/transcript/sampleScript");
  const r = buildCustomFramework({
    name: "Risk heat map",
    whenToUse: "The group is listing things that could go wrong and weighing how likely and how bad each one is.",
    signals: "risk, could go wrong, worst case, likelihood, severity",
    layout: "matrix2x2", xLabel: "Likelihood", yLabel: "Severity", topLeft: "Watch", topRight: "Act now", bottomLeft: "Accept", bottomRight: "Reduce", itemNoun: "risks",
  });
  if (!r.ok) throw new Error(r.errors.join("; "));
  const text = "Before we commit to the launch date, what could go wrong? The worst case is the payment provider going down on launch day. The likelihood is low, but the severity would be huge. Another risk is the warehouse running out of stock, which feels quite likely. The press embargo leaking early is unlikely and not that severe. Let's weigh each one by how likely and how bad it is.";
  const window = splitSentences(text).map((t, i) => ({ id: `s${i}`, text: t, startMs: i * 5000 }));
  const catalogue = [...BUILTIN_FRAMEWORKS, r.framework].map((f) => ({ id: f.id, name: f.name, whenToUse: f.whenToUse, signals: f.signals }));
  const c = await runCheck({ window, marked: [], catalogue, recent: [], muted: [], manual: true });
  console.log("check:", c.engine, c.fit, c.frameworkId, c.latencyMs + "ms", c.reason);
  const f = await runFill({ framework: r.framework, transcript: window, marked: [] });
  console.log("fill:", f.engine, f.latencyMs + "ms", JSON.stringify(f.fill).slice(0, 400));
}
main();
