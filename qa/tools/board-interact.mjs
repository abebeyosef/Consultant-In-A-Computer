import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3200";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(`${base}/board?fw=value-feasibility&fill=example`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const info = () =>
  p.evaluate(() => {
    const api = window.__ciacBoardApi;
    const st = api.getAppState();
    const els = api.getSceneElements();
    const st2 = els.filter((e) => e.type === "rectangle" && e.customData?.role === "sticky");
    return {
      stickies: st2.map((e) => ({
        id: e.id,
        state: e.customData.state,
        stroke: e.strokeStyle,
        cx: (e.x + e.width / 2 + st.scrollX) * st.zoom.value + st.offsetLeft,
        cy: (e.y + e.height / 2 + st.scrollY) * st.zoom.value + st.offsetTop,
      })),
    };
  });
let s = (await info()).stickies;
console.log("initial", s.map((x) => x.state).join(","));
const first = s[0];
await p.mouse.move(first.cx, first.cy);
await p.mouse.down();
await p.mouse.move(first.cx + 40, first.cy + 30, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(400);
// popover should show for the selected AI sticky
console.log("popover visible", await p.locator("[data-testid=source-popover]").isVisible());
await p.screenshot({ path: "qa/screenshots/board-dragged.png" });
s = (await info()).stickies;
console.log("after drag", s.map((x) => `${x.id === first.id ? "*" : ""}${x.state}/${x.stroke}`).join(","));
await p.keyboard.press("Escape");
await p.getByRole("button", { name: "Keep all" }).click();
await p.waitForTimeout(300);
s = (await info()).stickies;
console.log("after keep all", s.map((x) => x.state).join(","));
console.log("bar visible", await p.locator("[data-testid=provisional-bar]").isVisible());
await p.waitForTimeout(600);
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(2000);
s = (await info()).stickies;
console.log("after reload", s.length, s.map((x) => x.state).join(","));
await p.screenshot({ path: "qa/screenshots/board-accepted.png" });
// re-fill adds provisional items again (duplicates skipped => none) then Clear AI
console.log("errors", errs);
await b.close();
