import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const walk = async (n) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    await p.keyboard.press("Tab");
    out.push(await p.evaluate(() => { const e = document.activeElement; return (e?.getAttribute("aria-label") || e?.textContent || e?.tagName || "").trim().slice(0, 28); }));
  }
  return out;
};
await p.goto(base + "/");
console.log("start:", (await walk(12)).join(" → "));
await p.getByTestId("try-sample").click();
await p.waitForURL(/session/);
await p.getByText("3×", { exact: true }).click();
await p.getByTestId("flag-card").first().waitFor({ timeout: 60000 });
await p.locator("body").click({ position: { x: 5, y: 500 } });
console.log("console:", (await walk(14)).join(" → "));
await b.close();
