import type { BotSegment } from "./types";

export type DiffState = { emitted: Set<string>; lastEndMs: number };

export const initialDiff = (sinceMs = 0): DiffState => ({ emitted: new Set(), lastEndMs: sinceMs });

/**
 * Turn a polled transcript into new finals (completed segments not yet emitted,
 * in time order, skipping anything before `lastEndMs` — e.g. already restored
 * after a reload) and the current interim text (incomplete segments).
 */
export function diffSegments(state: DiffState, segments: BotSegment[]): { finals: BotSegment[]; interim: string; state: DiffState } {
  const sorted = [...segments].sort((a, b) => a.startMs - b.startMs);
  const emitted = new Set(state.emitted);
  let lastEndMs = state.lastEndMs;
  const finals: BotSegment[] = [];
  const interimParts: string[] = [];
  for (const s of sorted) {
    const text = s.text.replace(/\s+/g, " ").trim();
    if (!text || emitted.has(s.id)) continue;
    if (!s.completed) {
      if (s.endMs > lastEndMs) interimParts.push(text);
      continue;
    }
    if (s.endMs <= state.lastEndMs) {
      emitted.add(s.id);
      continue;
    }
    emitted.add(s.id);
    finals.push({ ...s, text });
    lastEndMs = Math.max(lastEndMs, s.endMs);
  }
  return { finals, interim: interimParts.join(" "), state: { emitted, lastEndMs } };
}
