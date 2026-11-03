// M7 screenshot pass: start, console empty/busy, flag card, board — light + dark.
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch();
for (const theme of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(base + "/", { waitUntil: "networkidle" });
  await p.screenshot({ path: `qa/screenshots/m7-start-${theme}.png` });
  await p.getByTestId("try-sample").click();
  await p.waitForURL(/session/);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `qa/screenshots/m7-console-empty-${theme}.png` });
  await p.getByText("3×", { exact: true }).click();
  await p.getByTestId("flag-card").first().waitFor({ timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `qa/screenshots/m7-console-busy-${theme}.png` });
  await p.getByTestId("flag-card").first().screenshot({ path: `qa/screenshots/m7-flag-${theme}.png` });
  await p.getByTestId("open-board").first().click();
  await p.getByTestId("board-panel").waitFor();
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `qa/screenshots/m7-board-${theme}.png` });
  console.log(theme, errs.length ? errs : "no page errors");
  await ctx.close();
}
await b.close();
