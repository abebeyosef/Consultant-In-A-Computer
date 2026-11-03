import { expect, test } from "@playwright/test";
import { stickyStates } from "./helpers";

// DEMO.md "30-second fallback": paste the sample, process instantly, open a board.
test("30-second fallback: pasted sample processed instantly gives flags and a filled board", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("paste-link").click();
  await page.getByText("Use the sample transcript").click();
  await page.getByText("Process instantly").click();
  await page.getByTestId("paste-submit").click();
  await page.waitForURL(/\/session\//);
  const cards = page.getByTestId("flag-card");
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => cards.count(), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
  await cards.last().getByTestId("open-board").click();
  await expect(page.getByTestId("board-panel")).toBeVisible();
  await expect.poll(() => stickyStates(page).then((s) => s.length), { timeout: 15_000 }).toBeGreaterThanOrEqual(5);
});
