import { expect, test } from "@playwright/test";
import { expectOfflineEngine, startSample, stickyCentre, stickyStates } from "./helpers";

test("sample workshop → flag → pre-filled board → edit a sticky", async ({ page }) => {
  await expectOfflineEngine(page);
  await startSample(page, "3×");

  // transcript streams in
  await expect(page.getByTestId("transcript")).toContainText("long list of AI ideas", { timeout: 20_000 });

  // first flag: value vs feasibility, with a reason and a quote
  const card = page.getByTestId("flag-card").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.locator("h3")).toHaveText("Value vs feasibility matrix");
  await expect(card.getByRole("button", { name: "Show in transcript" }).or(card.locator("button[title='Show in transcript']"))).toBeVisible();

  // open the board: pre-filled with the six canned ideas
  await card.getByTestId("open-board").click();
  await expect(page.getByTestId("board-panel")).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => stickyStates(page).then((s) => s.length), { timeout: 15_000 }).toBe(6);
  await expect(page.getByTestId("provisional-bar")).toContainText("6 suggested items");

  // drag one sticky → it becomes accepted (solid)
  const c = await stickyCentre(page, "provisional");
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 30, c.y + 24, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => stickyStates(page).then((s) => s.filter((x) => x === "accepted").length)).toBe(1);

  // Keep all → nothing provisional, bar disappears
  await page.keyboard.press("Escape"); // deselect
  await page.getByRole("button", { name: "Keep all" }).click();
  await expect.poll(() => stickyStates(page).then((s) => s.every((x) => x === "accepted"))).toBe(true);
  await expect(page.getByTestId("provisional-bar")).toBeHidden();

  // Esc returns to the transcript
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("transcript")).toBeVisible();
});

test("the sample fires three flags in order", async ({ page }) => {
  await startSample(page, "3×");
  const names = page.locator("[data-testid=flag-card] h3");
  await expect(names).toHaveCount(3, { timeout: 100_000 });
  // newest on top
  await expect(names).toHaveText(["Build, buy or partner", "Stakeholder map", "Value vs feasibility matrix"]);
});
