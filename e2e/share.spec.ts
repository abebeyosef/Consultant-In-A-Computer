import { expect, test, type Page } from "@playwright/test";
import { startSample, stickyStates } from "./helpers";

async function openShareMenu(page: Page) {
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(async () => {
    await page.getByTestId("share-menu").click();
    await expect(page.getByRole("menu")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
}

test("share link opens read-only in a fresh browser; PNG and notes export", async ({ page, context, browser, baseURL }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: baseURL });
  await startSample(page, "3×");
  const card = page.getByTestId("flag-card").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.getByTestId("open-board").click();
  await expect.poll(() => stickyStates(page).then((s) => s.length), { timeout: 15_000 }).toBe(6);
  await page.getByRole("button", { name: "Keep all" }).click();
  await expect(page.getByTestId("provisional-bar")).toBeHidden();
  await page.waitForTimeout(500); // debounced save

  // PNG download
  await page.getByTestId("share-menu").click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-png").click()]);
  expect(download.suggestedFilename()).toBe("value-vs-feasibility-matrix.png");

  // Copy link
  await openShareMenu(page);
  await page.getByTestId("copy-share-link").click();
  await expect(page.getByText("Read-only link copied")).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/view#.{40,}/);

  // Notes
  await openShareMenu(page);
  await page.getByTestId("copy-notes").click();
  await expect(page.getByText("Session notes copied as Markdown")).toBeVisible();
  const notes = await page.evaluate(() => navigator.clipboard.readText());
  expect(notes).toContain("# Harbourline AI ideas workshop");
  expect(notes).toContain("### Value vs feasibility matrix");
  expect(notes).toContain("- Article summaries");

  // Fresh browser context (no localStorage): the board comes from the URL alone
  const fresh = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const view = await fresh.newPage();
  await view.goto(link);
  await expect(view.getByTestId("view-title")).toHaveText("Value vs feasibility matrix");
  await expect
    .poll(
      () =>
        view.evaluate(() => {
          type E = { customData?: { role?: string } };
          const api = (window as unknown as { __ciacViewApi?: { getSceneElements(): E[]; getAppState(): { viewModeEnabled: boolean } } }).__ciacViewApi;
          if (!api) return null;
          return { stickies: api.getSceneElements().filter((e) => e.customData?.role === "sticky").length, view: api.getAppState().viewModeEnabled };
        }),
      { timeout: 15_000 },
    )
    .toEqual({ stickies: 6, view: true });
  await fresh.close();
});

test("a broken share link shows a calm message", async ({ page }) => {
  await page.goto("/view#garbage");
  await expect(page.getByTestId("view-empty")).toBeVisible();
});
