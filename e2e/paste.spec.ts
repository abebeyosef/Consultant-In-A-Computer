import { expect, test } from "@playwright/test";

const TRANSCRIPT = `Maya: Let's be honest about where we stand. Our biggest strength is the loyal subscriber base, and the brand is trusted.
Tom: But a real weakness is our slow release process, and we're behind on mobile.
Maya: There's an opportunity in the schools market, budgets are opening up and the market is shifting our way.
Tom: The threat is the two new competitors undercutting us on price, plus new regulation coming next year.
Maya: So what are we good at that they can't copy? That's the position we should defend.`;

test("pasted transcript (process instantly) produces a flag that opens a board", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("paste-link").click();
  await page.getByTestId("paste-textarea").fill(TRANSCRIPT);
  await page.getByText("Process instantly").click();
  await page.getByTestId("paste-submit").click();
  await page.waitForURL(/\/session\//);
  await expect(page.getByTestId("transcript")).toContainText("loyal subscriber base");
  // speaker labels were tidied away
  await expect(page.getByTestId("transcript")).not.toContainText("Maya:");
  const card = page.getByTestId("flag-card").first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.locator("h3")).toHaveText("SWOT");
  await card.getByTestId("open-board").click();
  await expect(page.getByTestId("board-panel")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("board-title")).toHaveText("SWOT");
});

test("paced paste streams and flags like live audio", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("paste-link").click();
  await page.getByText("Use the sample transcript").click();
  await page.getByTestId("paste-submit").click();
  await page.waitForURL(/\/session\//);
  await expect(page.getByTestId("flag-card").first()).toBeVisible({ timeout: 90_000 });
});
