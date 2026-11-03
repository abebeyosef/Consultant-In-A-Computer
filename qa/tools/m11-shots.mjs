import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch();
for (const theme of ["light", "dark"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
  const p = await ctx.newPage();
  await p.goto(base + "/library");
  await p.getByTestId("custom-new").click();
  await p.getByTestId("custom-name").fill("Risk heat map");
  await p.waitForTimeout(300);
  await p.screenshot({ path: `qa/screenshots/m11-dialog-${theme}.png` });
  await p.getByTestId("custom-save").click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `qa/screenshots/m11-dialog-errors-${theme}.png` });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  await p.screenshot({ path: `qa/screenshots/m11-library-${theme}.png` });
  await ctx.close();
}
await b.close();
