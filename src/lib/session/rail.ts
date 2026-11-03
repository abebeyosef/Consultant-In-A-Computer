import type { Suggestion } from "./types";

/** Untouched flags collapse into the "Earlier" list after 10 minutes (§9.3). */
export const EARLIER_AFTER_MS = 10 * 60_000;

export function partitionSuggestions(list: Suggestion[], clockMs: number) {
  const active: Suggestion[] = [];
  const earlier: Suggestion[] = [];
  for (const s of list) {
    if (s.status === "dismissed") continue;
    const stale = clockMs - s.createdAt > EARLIER_AFTER_MS && s.status !== "opened";
    if (s.status === "opened" || stale) earlier.push(s);
    else active.push(s);
  }
  return { active, earlier };
}
