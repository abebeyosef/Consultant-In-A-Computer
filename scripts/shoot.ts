/**
 * Screenshot QA: npx tsx scripts/shoot.ts <baseUrl> <name>=<path>[@WxH] ...
 * Writes qa/screenshots/<name>-light.png and -dark.png.
 * Optional env: SHOOT_WAIT (ms after load), SHOOT_THEMES=light,dark
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";

async function main() {
  const [base, ...specs] = process.argv.slice(2);
  if (!base || specs.length === 0) {
    console.error("usage: shoot.ts <baseUrl> name=/path[@1440x900] ...");
    process.exit(1);
  }
  fs.mkdirSync("qa/screenshots", { recursive: true });
  const themes = (process.env.SHOOT_THEMES ?? "light,dark").split(",") as ("light" | "dark")[];
  const wait = Number(process.env.SHOOT_WAIT ?? 800);
  const browser = await chromium.launch();
  for (const spec of specs) {
    const [name, rest] = spec.split("=");
    const [p, size] = rest.split("@");
    const [w, h] = (size ?? "1440x900").split("x").map(Number);
    for (const theme of themes) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(base + p, { waitUntil: "networkidle" });
      await page.waitForTimeout(wait);
      const out = `qa/screenshots/${name}-${theme}.png`;
      await page.screenshot({ path: out, fullPage: process.env.SHOOT_FULL === "1" });
      console.log(`${out}${errors.length ? `  ERRORS: ${errors.slice(0, 3).join(" | ")}` : ""}`);
      await ctx.close();
    }
  }
  await browser.close();
}
main();
