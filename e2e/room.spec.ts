import { expect, test, type Page } from "@playwright/test";
import { startSample, stickyCentre, stickyStates } from "./helpers";

async function roomStickies(room: Page): Promise<string[]> {
  return room.evaluate(() => {
    type E = { isDeleted?: boolean; customData?: { role?: string; state?: string } };
    const api = (window as unknown as { __ciacRoomApi?: { getSceneElements(): E[] } }).__ciacRoomApi;
    return (api?.getSceneElements() ?? []).filter((e) => e.customData?.role === "sticky").map((e) => e.customData!.state ?? "");
  });
}

test("send to room shows only accepted items, follows edits, blanks with B", async ({ page, context }) => {
  await startSample(page, "3×");
  const card = page.getByTestId("flag-card").first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.getByTestId("open-board").click();
  await expect.poll(() => stickyStates(page).then((s) => s.length), { timeout: 15_000 }).toBe(6);

  // accept one sticky by dragging it
  const c = await stickyCentre(page, "provisional");
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 30, c.y + 24, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => stickyStates(page).then((s) => s.filter((x) => x === "accepted").length)).toBe(1);
  await page.keyboard.press("Escape"); // deselect

  // Send to room opens the room window
  const [room] = await Promise.all([context.waitForEvent("page"), page.getByTestId("send-to-room").click()]);
  await room.waitForLoadState();
  await expect(room.getByTestId("room-stage")).toHaveAttribute("data-state", "board", { timeout: 15_000 });
  await expect.poll(() => roomStickies(room), { timeout: 15_000 }).toEqual(["accepted"]);
  await expect(page.getByTestId("send-to-room")).toHaveAttribute("data-state", "in-room");
  await expect(page.getByTestId("room-status")).toHaveAttribute("data-state", "showing");

  // Keep all → the room picks up the newly accepted items
  await page.getByRole("button", { name: "Keep all" }).click();
  await expect.poll(() => roomStickies(room).then((s) => s.length), { timeout: 10_000 }).toBe(6);

  // B blanks, B again restores
  await page.keyboard.press("b");
  await expect(room.getByTestId("room-stage")).toHaveAttribute("data-state", "blank");
  await expect(page.getByTestId("room-status")).toHaveAttribute("data-state", "blank");
  await page.keyboard.press("b");
  await expect(room.getByTestId("room-stage")).toHaveAttribute("data-state", "board");

  // a room window opened later asks for the current state
  const late = await context.newPage();
  await late.goto(room.url());
  await expect(late.getByTestId("room-stage")).toHaveAttribute("data-state", "board", { timeout: 15_000 });
  await expect.poll(() => roomStickies(late).then((s) => s.length), { timeout: 15_000 }).toBe(6);
  await expect(late.getByTestId("room-stage")).toHaveAttribute("data-theme", "light");
});

test("room view shows a calm holding screen before anything is sent", async ({ page, context }) => {
  await startSample(page, "1×");
  const [room] = await Promise.all([context.waitForEvent("page"), page.getByTestId("open-room").click()]);
  await room.waitForLoadState();
  await expect(room.getByTestId("room-hold")).toContainText("Harbourline");
  await expect(room.getByTestId("room-hold")).toContainText("Listening");
  await expect(page.getByTestId("room-status")).toHaveAttribute("data-state", "idle");
});
