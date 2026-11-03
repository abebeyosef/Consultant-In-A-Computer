// Long-session perf: seed a ~2-hour transcript (1,600 segments / ~19k words) and measure
// main-thread long tasks while the replay keeps streaming for 15 s.
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://localhost:3100";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(base + "/");
await p.getByTestId("paste-link").click();
await p.getByText("Use the sample transcript").click();
await p.getByTestId("paste-submit").click();
await p.waitForURL(/\/session\//);
await p.waitForTimeout(1500);
await p.getByTestId("pause").click();
await p.waitForTimeout(800);
const id = p.url().split("/session/")[1];
const sessionUrl = p.url();
await p.goto(base + "/library");
await p.evaluate((sid) => {
  const k = `ciac.session.${sid}`;
  const s = JSON.parse(localStorage.getItem(k));
  const words = "we talked about the roadmap and the budget and who owns the next step on the pilot".split(" ");
  const segs = [];
  let t = 0;
  for (let i = 0; i < 1600; i++) {
    const n = 8 + (i % 9);
    const text = Array.from({ length: n }, (_, j) => words[(i + j) % words.length]).join(" ") + ".";
    segs.push({ id: `seed${i}`, startMs: t, endMs: t + 4000, text, final: true, paragraphStart: i % 4 === 0 });
    t += 4500;
  }
  s.segments = [...segs, ...s.segments.map((x) => ({ ...x, startMs: x.startMs + t, endMs: x.endMs + t }))];
  localStorage.setItem(k, JSON.stringify(s));
}, id);
const t0 = Date.now();
await p.goto(sessionUrl);
await p.getByTestId("transcript").waitFor();
await p.waitForTimeout(3000); console.log("count", await p.evaluate(() => document.querySelectorAll("[data-seg-id]").length), await p.evaluate((sid) => JSON.parse(localStorage.getItem(`ciac.session.${sid}`)).segments.length, id), p.url());
console.log("load+render ms:", Date.now() - t0);
await p.evaluate(() => {
  window.__long = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: "longtask", buffered: false });
});
await p.getByTestId("resume").click();
await p.waitForTimeout(15000);
const long = await p.evaluate(() => window.__long);
const segs = await p.evaluate(() => document.querySelectorAll("[data-seg-id]").length);
console.log(`segments ${segs}; long tasks in 15s: ${long.length}, total ${Math.round(long.reduce((a, x) => a + x, 0))}ms, max ${Math.round(Math.max(0, ...long))}ms`);
await b.close();
