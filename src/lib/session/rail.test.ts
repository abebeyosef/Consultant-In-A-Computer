import { describe, expect, it } from "vitest";
import { partitionSuggestions } from "./rail";
import type { Suggestion } from "./types";

const sg = (id: string, createdAt: number, status: Suggestion["status"]): Suggestion => ({
  id,
  frameworkId: id,
  fit: "strong",
  reason: "r",
  evidenceQuote: "",
  evidenceSegmentIds: [],
  createdAt,
  createdAtWall: 0,
  status,
  fillStatus: "ready",
  manual: false,
});

describe("flag rail partition", () => {
  it("keeps fresh flags active, collapses opened and 10-minute-old ones, hides dismissed", () => {
    const list = [sg("a", 0, "new"), sg("b", 500_000, "seen"), sg("c", 100_000, "opened"), sg("d", 0, "dismissed")];
    const { active, earlier } = partitionSuggestions(list, 650_000);
    expect(active.map((s) => s.id)).toEqual(["b"]);
    expect(earlier.map((s) => s.id)).toEqual(["a", "c"]);
  });
});
