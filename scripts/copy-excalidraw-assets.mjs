// Copies Excalidraw's fonts into public/ so boards render offline (window.EXCALIDRAW_ASSET_PATH).
import fs from "node:fs";
import path from "node:path";

const src = path.resolve("node_modules/@excalidraw/excalidraw/dist/prod/fonts");
const dest = path.resolve("public/excalidraw-assets/fonts");
if (!fs.existsSync(src)) {
  console.warn("[assets] Excalidraw fonts not found; skipping");
  process.exit(0);
}
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log("[assets] Excalidraw fonts copied to public/excalidraw-assets/fonts");
