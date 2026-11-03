// M9 QA: layouts at 1280×800 and 1728×1117 (light; dark for the busy console).
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch();
for (const [w, h] of [[1280, 800], [1728, 1117]]) {
  const tag = `${w}x${h}`;
  for (const theme of ["light", "dark"]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(base + "/");
    await p.screenshot({ path: `qa/screenshots/m9-${tag}-start-${theme}.png` });
    if (theme === "light") {
      await p.goto(base + "/library");
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `qa/screenshots/m9-${tag}-library-${theme}.png` });
      await p.goto(base + "/");
    }
    await p.getByTestId("try-sample").click();
    await p.waitForURL(/session/);
    await p.getByText("3×", { exact: true }).click();
    await p.locator("[data-testid=flag-card]").nth(1).waitFor({ timeout: 90000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `qa/screenshots/m9-${tag}-console-${theme}.png` });
    await p.getByTestId("open-board").first().click();
    await p.getByTestId("board-panel").waitFor();
    await p.waitForTimeout(2500);
    await p.keyboard.press("Escape");
    await p.getByTestId("open-board").first().click().catch(() => {});
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `qa/screenshots/m9-${tag}-board-${theme}.png` });
    await p.getByTestId("board-switcher").click().catch(() => console.log("no switcher"));
    await p.waitForTimeout(300);
    await p.screenshot({ path: `qa/screenshots/m9-${tag}-switcher-${theme}.png` });
    await p.keyboard.press("Escape");
    await p.getByTestId("stop").click();
    await p.waitForTimeout(500);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(500);
    await p.screenshot({ path: `qa/screenshots/m9-${tag}-ended-${theme}.png` });
    console.log(tag, theme, errs.length ? errs : "ok");
    await ctx.close();
  }
}
await b.close();
