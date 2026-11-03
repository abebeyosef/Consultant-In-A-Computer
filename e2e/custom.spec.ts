import { expect, test } from "@playwright/test";
import { stickyStates } from "./helpers";

const TRANSCRIPT = `Before we commit to the launch date, what could go wrong? The worst case is the payment provider going down on launch day.
The likelihood is low, but the severity would be huge for us. Another risk is the warehouse not having enough stock, and honestly that one feels quite likely.
A smaller risk is the press embargo leaking early, which is unlikely and not that severe. And the biggest risk of all might be the app store review delaying the release.
Let's weigh each risk by how likely it is and how bad it would be, so we know what to act on first.`;

test("a custom 2×2 from the library is suggested on demand and opens pre-filled", async ({ page }) => {
  await page.goto("/library");
  await page.getByTestId("custom-new").click();
  await page.getByTestId("custom-name").fill("Risk heat map");
  await page.getByTestId("custom-when").fill("The group is listing things that could go wrong and weighing how likely and how bad each one is.");
  await page.getByTestId("custom-signals").fill("risk, could go wrong, worst case, likelihood, likely, severity, how bad");
  await page.getByTestId("custom-x").fill("Likelihood");
  await page.getByTestId("custom-y").fill("Severity");
  await page.getByTestId("custom-tl").fill("Watch");
  await page.getByTestId("custom-tr").fill("Act now");
  await page.getByTestId("custom-bl").fill("Accept");
  await page.getByTestId("custom-br").fill("Reduce");
  await page.getByTestId("custom-save").click();
  await expect(page.getByTestId("library-card-custom-risk-heat-map")).toBeVisible();

  // start-screen chips include it
  await page.goto("/");
  await expect(page.getByTestId("listens-for")).toContainText("Risk heat map");

  // paste a transcript, then ask for a suggestion
  await page.getByTestId("paste-link").click();
  await page.getByTestId("paste-textarea").fill(TRANSCRIPT);
  await page.getByText("Process instantly").click();
  await page.getByTestId("paste-submit").click();
  await page.waitForURL(/\/session\//);
  await expect(page.getByTestId("transcript")).toContainText("payment provider");

  // ⌘K lists it
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByRole("dialog")).toContainText("Risk heat map");
  await page.keyboard.press("Escape");

  const card = page.locator("[data-testid=flag-card]", { has: page.locator("h3", { hasText: "Risk heat map" }) });
  if (!(await card.isVisible())) await page.getByTestId("suggest-framework").click();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.getByTestId("open-board").click();
  await expect(page.getByTestId("board-title")).toHaveText("Risk heat map");
  await expect.poll(() => stickyStates(page).then((s) => s.length), { timeout: 15_000 }).toBeGreaterThan(1);
});
