// Accessibility pass: axe-core on the main screens (light + dark).
import { chromium } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
const base = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch();
async function scan(p, name) {
  const r = await new AxeBuilder({ page: p }).exclude(".excalidraw").withTags(["wcag2a", "wcag2aa"]).analyze();
  for (const v of r.violations) {
    console.log(`[${name}] ${v.impact} ${v.id}: ${v.help} (${v.nodes.length})`);
    for (const n of v.nodes.slice(0, 3)) console.log("     ", n.target.join(" "), "|", (n.failureSummary ?? "").split("\n")[1]?.trim());
  }
  if (!r.violations.length) console.log(`[${name}] clean`);
}
for (const theme of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
  const p = await ctx.newPage();
  await p.goto(base + "/");
  await scan(p, `start-${theme}`);
  await p.goto(base + "/library");
  await p.waitForTimeout(1000);
  await scan(p, `library-${theme}`);
  await p.goto(base + "/");
  await p.getByTestId("try-sample").click();
  await p.waitForURL(/session/);
  await p.getByText("3×", { exact: true }).click();
  await p.getByTestId("flag-card").first().waitFor({ timeout: 60000 });
  await p.waitForTimeout(500);
  await scan(p, `console-${theme}`);
  await p.getByTestId("open-board").first().click();
  await p.waitForTimeout(2500);
  await scan(p, `board-${theme}`);
  await ctx.close();
}
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(base + "/room?s=none");
await p.waitForTimeout(500);
await scan(p, "room-hold");
await b.close();
