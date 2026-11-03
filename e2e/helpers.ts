import { expect, type Page } from "@playwright/test";

export async function startSample(page: Page, speed: "1×" | "1.5×" | "3×" = "3×") {
  await page.goto("/");
  await page.getByTestId("try-sample").click();
  await page.waitForURL(/\/session\//);
  if (speed !== "1×") await page.getByText(speed, { exact: true }).click();
}

export async function stickyStates(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const api = (window as unknown as { __ciacBoardApi?: { getSceneElements(): { customData?: { role?: string; state?: string } }[] } }).__ciacBoardApi;
    return (api?.getSceneElements() ?? []).filter((e) => e.customData?.role === "sticky").map((e) => e.customData!.state ?? "");
  });
}

/** Viewport centre of the first sticky with the given state. */
export async function stickyCentre(page: Page, state = "provisional") {
  return page.evaluate((st) => {
    type E = { x: number; y: number; width: number; height: number; customData?: { role?: string; state?: string } };
    const api = (window as unknown as {
      __ciacBoardApi: { getSceneElements(): E[]; getAppState(): { scrollX: number; scrollY: number; zoom: { value: number }; offsetLeft: number; offsetTop: number } };
    }).__ciacBoardApi;
    const a = api.getAppState();
    const e = api.getSceneElements().find((x) => x.customData?.role === "sticky" && x.customData?.state === st)!;
    return {
      x: (e.x + e.width / 2 + a.scrollX) * a.zoom.value + a.offsetLeft,
      y: (e.y + e.height / 2 + a.scrollY) * a.zoom.value + a.offsetTop,
    };
  }, state);
}

export async function expectOfflineEngine(page: Page) {
  const health = await page.request.get("/api/health");
  expect((await health.json()).mode).toBe("mock");
}
