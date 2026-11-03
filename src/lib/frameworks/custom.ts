import { readJSON, writeJSON } from "@/lib/storage";
import { FrameworkTemplateSchema, type FrameworkTemplate } from "./types";

const KEY = "customFrameworks";

export function loadCustomFrameworks(): FrameworkTemplate[] {
  const raw = readJSON<unknown[]>(KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const p = FrameworkTemplateSchema.safeParse(r);
    return p.success ? [{ ...p.data, source: "custom" as const }] : [];
  });
}

export function saveCustomFrameworks(list: FrameworkTemplate[]) {
  writeJSON(KEY, list);
}
