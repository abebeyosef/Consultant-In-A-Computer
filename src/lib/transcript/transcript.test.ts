import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_PARAGRAPHS } from "./sampleScript";
import { buildTimeline, ReplaySource } from "./sources/replay";
import { parsePasted } from "./sources/paste";
import { MicSource, processResults, tidyFinal } from "./sources/mic";
import { appendFinal, markRecent, recentWindow, toParagraphs, totalWords } from "./store";
import type { SourceEvent, TranscriptSegment } from "./types";

describe("transcript store", () => {
  it("starts a new paragraph after a 2s pause", () => {
    let s: TranscriptSegment[] = [];
    s = appendFinal(s, "One.", 0, 1000);
    s = appendFinal(s, "Two.", 1500, 2500);
    s = appendFinal(s, "Three.", 5000, 6000);
    expect(s.map((x) => !!x.paragraphStart)).toEqual([true, false, true]);
    expect(toParagraphs(s).map((p) => p.length)).toEqual([2, 1]);
  });

  it("marks the last 30 seconds", () => {
    let s: TranscriptSegment[] = [];
    s = appendFinal(s, "Old.", 0, 1000);
    s = appendFinal(s, "Recent.", 50_000, 55_000);
    const { segments, ids } = markRecent(s, 60_000);
    expect(ids).toHaveLength(1);
    expect(segments[1].marked).toBe(true);
    expect(segments[0].marked).toBeFalsy();
  });

  it("windows the last ~3 minutes / 600 words and always includes marked moments", () => {
    let s: TranscriptSegment[] = [];
    s = appendFinal(s, "Marked early thought.", 0, 1000);
    s = markRecent(s, 1000).segments;
    for (let i = 0; i < 30; i++) s = appendFinal(s, "word ".repeat(30), 300_000 + i * 2000, 301_000 + i * 2000);
    const { window, marked } = recentWindow(s, 400_000);
    expect(totalWords(window)).toBeLessThanOrEqual(600);
    expect(marked.map((m) => m.text)).toEqual(["Marked early thought."]);
  });
});

describe("sample replay timeline", () => {
  const tl = buildTimeline(SAMPLE_PARAGRAPHS);
  const finals = tl.filter((e) => e.kind === "final");

  it("honours paragraph anchors and runs ~3 minutes", () => {
    const end = tl[tl.length - 1].t;
    expect(end).toBeGreaterThan(180_000);
    expect(end).toBeLessThan(215_000);
    const p2 = finals.find((f) => f.kind === "final" && f.text.startsWith("Honestly"));
    expect(p2 && p2.kind === "final" ? p2.startMs : 0).toBeGreaterThanOrEqual(30_000);
  });

  it("emits interim words before each final sentence, in time order", () => {
    for (let i = 1; i < tl.length; i++) expect(tl[i].t).toBeGreaterThanOrEqual(tl[i - 1].t);
    expect(tl[0].kind).toBe("interim");
    expect(finals.length).toBeGreaterThan(30);
  });

  it("replays instantly when asked", () => {
    const events: SourceEvent[] = [];
    const src = new ReplaySource({ kind: "paste", paragraphs: SAMPLE_PARAGRAPHS, instant: true });
    src.start((e) => events.push(e));
    expect(events.filter((e) => e.type === "final").length).toBe(finals.length);
    expect(events[events.length - 1]).toEqual({ type: "status", status: "ended" });
  });

  it("resumes from a saved position without repeating finals", () => {
    const events: SourceEvent[] = [];
    const src = new ReplaySource({ kind: "sample", paragraphs: SAMPLE_PARAGRAPHS, startAtMs: 100_000, instant: true });
    src.start((e) => events.push(e));
    const texts = events.flatMap((e) => (e.type === "final" ? [e.text] : []));
    expect(texts[0]).not.toMatch(/^Okay, thanks everyone/);
    expect(texts.length).toBeLessThan(finals.length);
  });
});

describe("paste parsing", () => {
  it("strips timestamps and speaker labels, splitting paragraphs", () => {
    const p = parsePasted("[00:01] Anna: We should look at churn\n[00:05] Ben: Agreed, and pricing.\n\nNew topic here");
    expect(p.map((x) => x.text)).toEqual(["We should look at churn.", "Agreed, and pricing.", "New topic here."]);
  });
});

describe("mic source", () => {
  it("separates finals from interim results", () => {
    const results = {
      length: 3,
      0: { isFinal: true, length: 1, 0: { transcript: "old" } },
      1: { isFinal: true, length: 1, 0: { transcript: "we should prioritise" } },
      2: { isFinal: false, length: 1, 0: { transcript: "the summaries" } },
    };
    expect(processResults(results, 1)).toEqual({ finals: ["we should prioritise"], interim: "the summaries" });
    expect(tidyFinal("we should prioritise")).toBe("We should prioritise.");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("emits events and restarts after Chrome ends the session", async () => {
    vi.useFakeTimers();
    const instances: FakeRec[] = [];
    class FakeRec {
      continuous = false;
      interimResults = false;
      lang = "";
      maxAlternatives = 1;
      started = 0;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      onstart: (() => void) | null = null;
      constructor() {
        instances.push(this);
      }
      start() {
        this.started++;
        this.onstart?.();
      }
      stop() {}
      abort() {}
    }
    vi.stubGlobal("window", { webkitSpeechRecognition: FakeRec });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => Promise.reject(new Error("no audio in tests")) } });
    const events: SourceEvent[] = [];
    const mic = new MicSource({ lang: "en-GB" });
    await mic.start((e) => events.push(e));
    const rec = instances[0];
    expect(rec.continuous && rec.interimResults && rec.lang === "en-GB").toBe(true);
    rec.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: false, length: 1, 0: { transcript: "hello there" } } } });
    rec.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript: "hello there everyone" } } } });
    expect(events.some((e) => e.type === "interim" && e.text === "hello there")).toBe(true);
    expect(events.some((e) => e.type === "final" && e.text === "Hello there everyone.")).toBe(true);
    rec.onend?.();
    vi.advanceTimersByTime(300);
    expect(rec.started).toBe(2);
    rec.onerror?.({ error: "not-allowed" });
    expect(events.some((e) => e.type === "status" && e.status === "error")).toBe(true);
    mic.stop();
  });
});
