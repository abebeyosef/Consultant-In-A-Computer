import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3200";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.getByTestId("try-sample").click();
await p.waitForURL(/\/session\//);
await p.getByText("3×", { exact: true }).click();
const card = p.locator("[data-testid=flag-card]").first();
await card.waitFor({ timeout: 90000 });
console.log("pill says new:", await p.locator("[role=status][aria-label*='new suggestion']").count());
await p.waitForTimeout(400);
await p.screenshot({ path: "qa/screenshots/flag-arrival-light.png" });
// quote click → scroll + flash
await card.locator("button[title='Show in transcript']").click();
await p.waitForTimeout(300);
console.log("flash segments:", await p.locator("[data-seg-id].bg-signal-tint").count(), "underlined:", await p.locator("[data-seg-id].decoration-signal\\/60").count());
// open immediately → preparing (live) or open (mock)
await card.getByTestId("open-board").click();
await p.waitForTimeout(1500);
const prep = await p.getByText("Preparing board…").count();
console.log("preparing shown:", prep);
if (prep) await p.screenshot({ path: "qa/screenshots/flag-preparing-light.png" });
await p.waitForSelector("[data-testid=board-panel]", { timeout: 90000 });
console.log("board opened automatically");
await p.keyboard.press("Escape");
// wait for the next flag, then Not now
const second = p.locator("[data-testid=flag-card]").first();
await second.waitFor({ timeout: 90000 });
const name2 = await second.locator("h3").innerText();
await second.getByRole("button", { name: "Not now" }).click();
await p.waitForTimeout(500);
console.log("after not now, cards with", name2, ":", await p.locator("[data-testid=flag-card] h3", { hasText: name2 }).count());
// third: mute
const third = p.locator("[data-testid=flag-card]").first();
await third.waitFor({ timeout: 90000 });
const name3 = await third.locator("h3").innerText();
await third.getByRole("button", { name: "More options" }).click();
await p.getByRole("menuitem", { name: /Don't suggest/ }).click();
await p.waitForTimeout(500);
console.log("after mute, cards with", name3, ":", await p.locator("[data-testid=flag-card] h3", { hasText: name3 }).count());
console.log("earlier list:", await p.getByTestId("earlier").innerText().catch(() => "none"));
console.log("errors", errs.slice(0, 5));
await b.close();
