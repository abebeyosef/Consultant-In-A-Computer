import { splitSentences } from "../sampleScript";
import type { SourceKind, SourceListener, TranscriptSource } from "../types";

export type ReplayParagraph = { at?: number; text: string };

export type TimelineEvent =
  | { t: number; kind: "interim"; text: string }
  | { t: number; kind: "final"; text: string; startMs: number; endMs: number; paragraphStart: boolean };

const PARAGRAPH_PAUSE_MS = 2400;

/**
 * Build a replay timeline: words appear one by one as interim text, then each
 * sentence is finalised. Paragraph anchors (`at`, seconds) are honoured — if a
 * paragraph is too long to fit before the next anchor, its pace is compressed.
 */
export function buildTimeline(paragraphs: ReplayParagraph[], wpm = 150): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const baseMsPerWord = 60_000 / wpm;
  let cursor = 0;
  paragraphs.forEach((p, pi) => {
    const sentences = splitSentences(p.text);
    const words = sentences.reduce((n, s) => n + s.split(/\s+/).length, 0);
    let start = p.at !== undefined ? Math.max(p.at * 1000, cursor) : pi === 0 ? 0 : cursor + PARAGRAPH_PAUSE_MS;
    if (pi > 0 && p.at !== undefined && start < cursor + 300) start = cursor + 300;
    const next = paragraphs[pi + 1];
    let msPerWord = baseMsPerWord;
    if (next?.at !== undefined) {
      const budget = next.at * 1000 - start - 700;
      if (budget > 0 && words * msPerWord > budget) msPerWord = budget / words;
    }
    let t = start;
    sentences.forEach((sentence, si) => {
      const ws = sentence.split(/\s+/);
      const sStart = t;
      for (let i = 0; i < ws.length; i++) {
        t += msPerWord;
        events.push({ t: Math.round(t), kind: "interim", text: ws.slice(0, i + 1).join(" ") });
      }
      t += 120;
      events.push({ t: Math.round(t), kind: "final", text: sentence, startMs: Math.round(sStart), endMs: Math.round(t), paragraphStart: si === 0 });
    });
    cursor = t;
  });
  return events;
}

export type ReplayOptions = {
  kind: SourceKind;
  paragraphs: ReplayParagraph[];
  speed?: number;
  /** resume from this point on the replay clock */
  startAtMs?: number;
  /** emit every final at once (paste: "process instantly") */
  instant?: boolean;
  wpm?: number;
};

export class ReplaySource implements TranscriptSource {
  readonly kind: SourceKind;
  private timeline: TimelineEvent[];
  private idx = 0;
  private virtualMs: number;
  private speed: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastReal = 0;
  private listener: SourceListener | null = null;
  private instant: boolean;
  private ended = false;

  constructor(opts: ReplayOptions) {
    this.kind = opts.kind;
    this.timeline = buildTimeline(opts.paragraphs, opts.wpm);
    this.speed = opts.speed ?? 1;
    this.virtualMs = opts.startAtMs ?? 0;
    this.instant = !!opts.instant;
    // skip events already replayed
    while (this.idx < this.timeline.length && this.timeline[this.idx].t <= this.virtualMs) this.idx++;
  }

  get durationMs() {
    return this.timeline.length ? this.timeline[this.timeline.length - 1].t : 0;
  }

  start(listener: SourceListener) {
    this.listener = listener;
    if (this.instant) {
      for (; this.idx < this.timeline.length; this.idx++) {
        const e = this.timeline[this.idx];
        if (e.kind === "final") listener({ type: "final", text: e.text, startMs: e.startMs, endMs: e.endMs, paragraphStart: e.paragraphStart });
      }
      this.virtualMs = this.durationMs;
      this.finish();
      return;
    }
    listener({ type: "status", status: "listening" });
    this.run();
  }

  private run() {
    if (this.timer) return;
    this.lastReal = performance.now();
    this.timer = setInterval(() => this.tick(), 50);
  }

  private tick() {
    const nowReal = performance.now();
    this.virtualMs += (nowReal - this.lastReal) * this.speed;
    this.lastReal = nowReal;
    const l = this.listener;
    if (!l) return;
    while (this.idx < this.timeline.length && this.timeline[this.idx].t <= this.virtualMs) {
      const e = this.timeline[this.idx++];
      if (e.kind === "interim") l({ type: "interim", text: e.text, atMs: e.t });
      else l({ type: "final", text: e.text, startMs: e.startMs, endMs: e.endMs, paragraphStart: e.paragraphStart });
    }
    if (this.idx >= this.timeline.length && this.virtualMs > this.durationMs + 1500) this.finish();
  }

  private finish() {
    if (this.ended) return;
    this.ended = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.listener?.({ type: "status", status: "ended" });
  }

  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.listener?.({ type: "status", status: "paused" });
  }

  resume() {
    if (this.ended) return;
    this.listener?.({ type: "status", status: "listening" });
    this.run();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.ended = true;
    this.listener = null;
  }

  now() {
    return Math.round(this.virtualMs);
  }

  setSpeed(speed: number) {
    this.speed = Math.max(0.25, Math.min(8, speed));
  }
}
