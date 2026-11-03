import { expect, test } from "@playwright/test";
import { startSample } from "./helpers";

test("reloading the console restores transcript and flags, paused", async ({ page }) => {
  await startSample(page, "3×");
  const card = page.getByTestId("flag-card").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  const text = await page.getByTestId("transcript").innerText();
  await page.waitForTimeout(800); // let the debounced save land
  await page.reload();
  expect(text).toContain("long list of AI ideas");
  await expect(page.getByTestId("transcript")).toContainText("long list of AI ideas");
  await expect(page.getByTestId("flag-card").first()).toBeVisible();
  await expect(page.getByTestId("resume")).toBeVisible();
  await page.getByTestId("resume").click();
  await expect(page.getByTestId("pause")).toBeVisible();
});
