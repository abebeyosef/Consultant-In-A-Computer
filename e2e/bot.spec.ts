import { expect, test } from "@playwright/test";

const BOT_BASE = `http://localhost:${process.env.E2E_BOT_PORT ?? 3101}`;

test("with ENABLE_MEET_BOT off, nothing about the bot is exposed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("try-sample")).toBeVisible();
  await expect(page.getByTestId("join-call")).toHaveCount(0);
  const res = await page.request.get("/api/bot?meetUrl=https://meet.google.com/abc-defg-hij");
  expect(res.status()).toBe(404);
});

test("with the bot on (mock provider), joining a Meet link streams the call into the transcript and flags", async ({ page }) => {
  await page.goto(`${BOT_BASE}/`);
  await expect(page.getByTestId("join-call")).toBeDisabled();
  await page.getByTestId("meet-url").fill("https://meet.google.com/not-a-code");
  await expect(page.getByTestId("join-call")).toBeDisabled();
  await page.getByTestId("meet-url").fill("https://meet.google.com/abc-defg-hij");
  await page.getByTestId("join-call").click();
  await page.waitForURL(/\/session\//);
  await expect(page.getByTestId("transcript")).toContainText("long list of AI ideas", { timeout: 30_000 });
  await expect(page.getByTestId("pause")).toBeVisible();
  await expect(page.getByTestId("flag-card").first()).toBeVisible({ timeout: 90_000 });
  await page.getByTestId("stop").click();
  // the bot left the (fake) call
  const t = await page.request.get(`${BOT_BASE}/api/bot?meetUrl=https://meet.google.com/abc-defg-hij`);
  expect((await t.json()).status).toBe("ended");
});
