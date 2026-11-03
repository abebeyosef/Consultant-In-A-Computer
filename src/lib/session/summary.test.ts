import { describe, expect, it } from "vitest";
import { summarise } from "./summary";
import type { Session, Suggestion } from "./types";

const sg = (id: string, status: Suggestion["status"], manual = false): Suggestion => ({
  id,
  frameworkId: "swot",
  fit: "strong",
  reason: "",
  evidenceQuote: "",
  evidenceSegmentIds: [],
  createdAt: 0,
  createdAtWall: 0,
  status,
  fillStatus: "ready",
  manual,
});

describe("summarise", () => {
  it("counts words, flags, boards and marked moments", () => {
    const session = {
      id: "s",
      name: "n",
      mode: "private",
      startedAt: 0,
      segments: [
        { id: "a", startMs: 0, endMs: 1, text: "one two three", final: true, marked: true },
        { id: "b", startMs: 1, endMs: 2, text: "four", final: true, marked: true },
        { id: "c", startMs: 2, endMs: 3, text: "five six", final: true },
        { id: "d", startMs: 3, endMs: 4, text: "seven", final: true, marked: true },
      ],
      suggestions: [sg("1", "opened"), sg("2", "dismissed"), sg("3", "new", true)],
      boardIds: ["b1", "gone"],
      mutedFrameworkIds: [],
      source: { kind: "sample", positionMs: 0 },
      status: "ended",
    } satisfies Session;
    const s = summarise(session, 90_000, (id) => (id === "b1" ? "SWOT" : null));
    expect(s.words).toBe(7);
    expect(s.flags).toEqual({ raised: 3, opened: 1, dismissed: 1, manual: 1 });
    expect(s.boards).toEqual([{ id: "b1", title: "SWOT" }]);
    expect(s.markedMoments).toBe(2);
    expect(s.durationMs).toBe(90_000);
  });
});
