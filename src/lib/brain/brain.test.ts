import { describe, expect, it } from "vitest";
import { BUILTIN_FRAMEWORKS } from "@/lib/frameworks/builtins";
import { SAMPLE_PARAGRAPHS } from "@/lib/transcript/sampleScript";
import { buildTimeline } from "@/lib/transcript/sources/replay";
import { appendFinal, recentWindow, totalWords } from "@/lib/transcript/store";
import type { TranscriptSegment } from "@/lib/transcript/types";
import { postProcessCheck } from "./engine";
import { checkEvidence, matchQuoteToSegments } from "./evidence";
import { mockCheck, mockFill, scoreSignals, stickyText } from "./mock";
import {
  PACING,
  beginCheck,
  blockedFrameworks,
  canFlag,
  endCheck,
  initialScheduler,
  recordFlag,
  shouldCheck,
} from "./scheduler";

const catalogue = BUILTIN_FRAMEWORKS.map((f) => ({ id: f.id, name: f.name, whenToUse: f.whenToUse, signals: f.signals }));

describe("scheduler pacing", () => {
  const p = PACING.default;
  it("checks every 30s only when 40+ new words arrived", () => {
    let st = initialScheduler();
    expect(shouldCheck(st, 10_000, 20, p, "tick")).toBe(false);
    expect(shouldCheck(st, 10_000, 45, p, "tick")).toBe(true);
    st = endCheck(beginCheck(st, 10_000, 45));
    expect(shouldCheck(st, 25_000, 100, p, "tick")).toBe(false); // too soon
    expect(shouldCheck(st, 41_000, 70, p, "tick")).toBe(false); // too few new words
    expect(shouldCheck(st, 41_000, 90, p, "tick")).toBe(true);
  });

  it("never runs two checks at once; mark and manual run immediately", () => {
    let st = beginCheck(initialScheduler(), 0, 50);
    expect(shouldCheck(st, 60_000, 500, p, "manual")).toBe(false);
    st = endCheck(st);
    expect(shouldCheck(st, 1_000, 50, p, "manual")).toBe(true);
    expect(shouldCheck(st, 1_000, 50, p, "mark")).toBe(true);
  });

  it("allows one auto flag per 2 minutes and the same framework once per 10 minutes", () => {
    let st = recordFlag(initialScheduler(), 60_000, "swot", false);
    expect(canFlag(st, 100_000, p, "impact-effort", false, [])).toBe(false);
    expect(canFlag(st, 181_000, p, "impact-effort", false, [])).toBe(true);
    expect(canFlag(st, 400_000, p, "swot", false, [])).toBe(false);
    expect(canFlag(st, 661_000, p, "swot", false, [])).toBe(true);
    expect(blockedFrameworks(st, 300_000, p, []).recent).toEqual(["swot"]);
    // manual ignores the time gap but respects mutes
    expect(canFlag(st, 70_000, p, "jtbd", true, [])).toBe(true);
    expect(canFlag(st, 70_000, p, "jtbd", true, ["jtbd"])).toBe(false);
    st = recordFlag(st, 70_000, "jtbd", true);
    expect(st.lastAutoFlagAtMs).toBe(60_000);
  });

  it("demo profile is faster", () => {
    expect(PACING.demo.checkEveryMs).toBe(15_000);
    expect(PACING.demo.minGapBetweenFlagsMs).toBe(45_000);
  });
});

describe("evidence check", () => {
  const segs = [
    { id: "a", text: "Honestly, the summaries feel like the highest value to me, readers keep asking for them." },
    { id: "b", text: "The chatbot sounds great, but I think it's really hard, our archive data is a mess before 2015." },
  ];
  it("keeps verbatim quotes (ignoring case and punctuation) and maps them to segments", () => {
    const ev = checkEvidence("the summaries feel like the highest value to me", segs);
    expect(ev.verbatim).toBe(true);
    expect(ev.segmentIds).toEqual(["a"]);
    expect(matchQuoteToSegments("value to me, readers keep asking for them. The chatbot sounds great", segs)).toEqual(["a", "b"]);
  });
  it("substitutes the closest sentence for a paraphrase", () => {
    const ev = checkEvidence("the chatbot is really hard because the archive data is a mess", segs);
    expect(ev.verbatim).toBe(false);
    expect(ev.quote).toMatch(/^The chatbot sounds great/);
    expect(ev.segmentIds).toEqual(["b"]);
  });
  it("drops invented quotes", () => {
    expect(checkEvidence("we should hire three more engineers next year", segs).quote).toBe("");
  });
});

describe("mock engine", () => {
  it("stems signals", () => {
    expect(scoreSignals("We keep listing our strengths and weaknesses", ["strength", "weakness"]).hits).toHaveLength(2);
  });

  it("returns none for small talk", () => {
    const r = mockCheck({
      window: [{ id: "x", text: "Morning all, coffee is at the back. We'll break at eleven and lunch is upstairs." }],
      marked: [],
      catalogue,
      recent: [],
      muted: [],
      manual: false,
    });
    expect(r.fit).toBe("none");
  });

  it("fires value-feasibility → stakeholder-map → build-buy-partner on the sample, at sensible times", () => {
    const timeline = buildTimeline(SAMPLE_PARAGRAPHS);
    const p = PACING.demo;
    let segs: TranscriptSegment[] = [];
    let st = initialScheduler();
    const flags: { id: string; at: number; quote: string }[] = [];
    let ti = 0;
    const end = timeline[timeline.length - 1].t + 20_000;
    for (let now = 0; now <= end; now += 1000) {
      while (ti < timeline.length && timeline[ti].t <= now) {
        const e = timeline[ti++];
        if (e.kind === "final") segs = appendFinal(segs, e.text, e.startMs, e.endMs, e.paragraphStart);
      }
      const words = totalWords(segs);
      if (!shouldCheck(st, now, words, p, "tick")) continue;
      st = beginCheck(st, now, words);
      const { window, marked } = recentWindow(segs, now);
      const blocked = blockedFrameworks(st, now, p, []);
      const req = { window, marked, catalogue, recent: blocked.recent, muted: [], manual: false };
      const res = postProcessCheck(mockCheck(req), req, "mock", 0);
      st = endCheck(st);
      if (res.fit !== "none" && res.frameworkId && canFlag(st, now, p, res.frameworkId, false, [])) {
        st = recordFlag(st, now, res.frameworkId, false);
        flags.push({ id: res.frameworkId, at: now, quote: res.evidenceQuote });
      }
    }
    expect(flags.map((f) => f.id)).toEqual(["value-feasibility", "stakeholder-map", "build-buy-partner"]);
    expect(flags[0].at).toBeLessThanOrEqual(62_000);
    expect(flags[1].at).toBeGreaterThanOrEqual(90_000);
    expect(flags[1].at).toBeLessThanOrEqual(130_000);
    expect(flags[2].at).toBeGreaterThanOrEqual(140_000);
    expect(flags[2].at).toBeLessThanOrEqual(200_000);
    for (const f of flags) expect(f.quote.length).toBeGreaterThan(10);
  });

  it("uses canned fills for the sample and extracts something for other transcripts", () => {
    const sample = SAMPLE_PARAGRAPHS.map((p, i) => ({ id: `p${i}`, text: p.text }));
    const vf = BUILTIN_FRAMEWORKS.find((f) => f.id === "value-feasibility")!;
    expect(mockFill(vf, sample).canned).toBe(true);
    const other = [{ id: "o", text: "Our biggest strength is the loyal customer base. A weakness is our slow release process. Competitors are a real threat now." }];
    const swot = BUILTIN_FRAMEWORKS.find((f) => f.id === "swot")!;
    const r = mockFill(swot, other);
    expect(r.canned).toBe(false);
    expect(Object.values((r.fill as { blocks: Record<string, unknown[]> }).blocks).flat().length).toBeGreaterThan(0);
    expect(stickyText("Honestly, I think the summaries feel like the highest value to me.")).toBe("The summaries feel like the highest value to");
  });
});

describe("reason cleaning", () => {
  it("keeps short clean reasons and replaces run-ons", async () => {
    const { cleanReason } = await import("./engine");
    const fw = BUILTIN_FRAMEWORKS.find((f) => f.id === "stakeholder-map")!;
    expect(cleanReason("Several people and their sign-off power just came up.", fw)).toBe("Several people and their sign-off power just came up.");
    expect(cleanReason("You've surfaced CTO sign-off, editor resistance, legal review. You've surfaced CTO sign-off, again and again", fw)).toMatch(/^Several people/);
    expect(cleanReason("word ".repeat(30), fw)).toMatch(/^Several people/);
  });
});
