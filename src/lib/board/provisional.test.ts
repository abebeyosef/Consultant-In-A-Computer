import { describe, expect, it } from "vitest";
import {
  type El,
  acceptElements,
  acceptedOnly,
  clearProvisional,
  detectEdited,
  provisionalIds,
  recordPlacement,
} from "./provisional";

function sticky(id: string, x: number, text: string): El[] {
  return [
    {
      id,
      type: "rectangle",
      x,
      y: 0,
      width: 160,
      height: 80,
      version: 1,
      boundElements: [{ id: `${id}-t`, type: "text" }],
      customData: { role: "sticky", source: "ai", state: "provisional", sourceQuote: "q" },
      strokeStyle: "dashed",
    },
    { id: `${id}-t`, type: "text", x: x + 10, y: 10, width: 140, height: 20, version: 1, containerId: id, text: `✦ ${text}`, originalText: `✦ ${text}` },
  ];
}
const frame: El = { id: "f", type: "frame", x: 0, y: 0, width: 1000, height: 800 };
const ghost: El = { id: "g", type: "text", x: 0, y: 0, width: 10, height: 10, customData: { role: "ghost" } };

describe("provisional stickies", () => {
  const base = [frame, ghost, ...sticky("a", 0, "Alpha"), ...sticky("b", 300, "Beta")];
  const placement = recordPlacement(base);

  it("records every provisional sticky", () => {
    expect(Object.keys(placement).sort()).toEqual(["a", "b"]);
  });

  it("ignores version bumps that don't change position or text (font re-measure)", () => {
    const remeasured = base.map((e) => (e.id === "a-t" ? { ...e, version: 5, width: 150, height: 22 } : e));
    expect(detectEdited(remeasured, placement)).toEqual([]);
  });

  it("detects moves and text edits", () => {
    const moved = base.map((e) => (e.id === "a" ? { ...e, x: 40, version: 2 } : e));
    expect(detectEdited(moved, placement)).toEqual(["a"]);
    const edited = base.map((e) => (e.id === "b-t" ? { ...e, originalText: "✦ Beta prime", text: "✦ Beta prime" } : e));
    expect(detectEdited(edited, placement)).toEqual(["b"]);
  });

  it("accepting makes a solid neutral sticky without the spark", () => {
    const out = acceptElements(base, ["a"]);
    const a = out.find((e) => e.id === "a")!;
    expect(a.customData?.state).toBe("accepted");
    expect(a.strokeStyle).toBe("solid");
    expect(a.version).toBe(2);
    expect(out.find((e) => e.id === "a-t")!.text).toBe("Alpha");
    expect(provisionalIds(out)).toEqual(["b"]);
  });

  it("clear removes only provisional items and their text", () => {
    const accepted = acceptElements(base, ["a"]);
    const out = clearProvisional(accepted).filter((e) => !e.isDeleted);
    expect(out.map((e) => e.id).sort()).toEqual(["a", "a-t", "f", "g"]);
  });

  it("room view hides provisional items and ghosts", () => {
    const out = acceptedOnly(acceptElements(base, ["a"]));
    expect(out.map((e) => e.id).sort()).toEqual(["a", "a-t", "f"]);
  });
});
