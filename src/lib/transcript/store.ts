import { newId } from "@/lib/ids";
import type { TranscriptSegment } from "./types";

/** Pure helpers over the transcript (kept out of React so they're unit-testable). */

export const PARAGRAPH_GAP_MS = 2000;
export const MARK_WINDOW_MS = 30_000;

export function appendFinal(
  segments: TranscriptSegment[],
  text: string,
  startMs: number,
  endMs: number,
  forceParagraph?: boolean,
): TranscriptSegment[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return segments;
  const prev = segments[segments.length - 1];
  const paragraphStart = !prev || !!forceParagraph || startMs - prev.endMs >= PARAGRAPH_GAP_MS;
  return [...segments, { id: newId("s"), startMs, endMs: Math.max(endMs, startMs), text: clean, final: true, paragraphStart }];
}

/** Mark every segment that ended within the last `windowMs`. Returns ids marked. */
export function markRecent(segments: TranscriptSegment[], nowMs: number, windowMs = MARK_WINDOW_MS) {
  const from = nowMs - windowMs;
  const ids: string[] = [];
  const next = segments.map((s) => {
    if (s.endMs >= from) {
      ids.push(s.id);
      return s.marked ? s : { ...s, marked: true };
    }
    return s;
  });
  // If nothing ended in the window (long silence), mark the last segment.
  if (ids.length === 0 && next.length) {
    const last = next[next.length - 1];
    next[next.length - 1] = { ...last, marked: true };
    ids.push(last.id);
  }
  return { segments: next, ids };
}

export function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

export function totalWords(segments: TranscriptSegment[]): number {
  return segments.reduce((n, s) => n + countWords(s.text), 0);
}

/** Group segments into paragraphs for display. */
export function toParagraphs(segments: TranscriptSegment[]): TranscriptSegment[][] {
  const out: TranscriptSegment[][] = [];
  for (const s of segments) {
    if (s.paragraphStart || out.length === 0) out.push([s]);
    else out[out.length - 1].push(s);
  }
  return out;
}

/**
 * The recent window sent to /api/check: last ~3 minutes or 600 words, whichever
 * is shorter — plus any marked moments (always included).
 */
export function recentWindow(segments: TranscriptSegment[], nowMs: number, maxMs = 180_000, maxWords = 600) {
  const out: TranscriptSegment[] = [];
  let words = 0;
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    if (nowMs - s.endMs > maxMs) break;
    const w = countWords(s.text);
    if (words + w > maxWords && out.length) break;
    out.unshift(s);
    words += w;
  }
  const inWindow = new Set(out.map((s) => s.id));
  const marked = segments.filter((s) => s.marked && !inWindow.has(s.id)).slice(-12);
  return { window: out, marked };
}

/** Fuller transcript for /api/fill: last ~15 minutes, capped by words. */
export function fillWindow(segments: TranscriptSegment[], nowMs: number, maxMs = 15 * 60_000, maxWords = 3000) {
  return recentWindow(segments, nowMs, maxMs, maxWords);
}

export function formatTimestamp(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
