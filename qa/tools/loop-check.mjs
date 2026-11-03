import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3200";
const speed = process.argv[3] ?? "3×";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
const t0 = Date.now();
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.getByTestId("try-sample").click();
await p.waitForURL(/\/session\//);
if (speed !== "1×") await p.getByText(speed, { exact: true }).click();
const seen = new Set();
for (let i = 0; i < 160; i++) {
  await p.waitForTimeout(1000);
  const names = await p.locator("[data-testid=flag-card] h3").allInnerTexts();
  for (const n of names) if (!seen.has(n)) { seen.add(n); console.log(`flag @${Math.round((Date.now() - t0) / 1000)}s real: ${n}`); }
  if (seen.size >= 3) break;
  if (await p.getByText("Session ended").isVisible()) break;
}
console.log("offline label:", await p.getByTestId("offline-mode").count());
const cards = p.locator("[data-testid=flag-card]");
console.log("cards:", await cards.count());
if (await cards.count()) {
  const last = cards.last();
  console.log("reason:", await last.locator("p").first().innerText());
  await p.screenshot({ path: "qa/screenshots/console-flags-light.png" });
  await last.getByTestId("open-board").click();
  await p.waitForSelector("[data-testid=board-panel]", { timeout: 60000 });
  await p.waitForTimeout(2500);
  const stickies = await p.evaluate(() => window.__ciacBoardApi?.getSceneElements().filter((e) => e.customData?.role === "sticky").length);
  console.log("board:", await p.getByTestId("board-title").innerText(), "stickies:", stickies);
  await p.screenshot({ path: "qa/screenshots/console-board-light.png" });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  console.log("back to transcript:", await p.getByTestId("transcript").isVisible());
}
console.log("errors", errs.slice(0, 5));
await b.close();
