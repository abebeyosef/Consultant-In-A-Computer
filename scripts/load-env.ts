import fs from "node:fs";
import path from "node:path";

/** Load .env.local (then .env) into process.env for CLI scripts. Existing vars win. */
export function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (!m || line.trim().startsWith("#")) continue;
      const val = m[2].replace(/^["']|["']$/g, "");
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}
