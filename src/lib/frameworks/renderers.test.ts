import { describe, expect, it } from "vitest";
import { BUILTIN_FRAMEWORKS } from "./builtins";
import { renderFramework } from "./toSkeleton";
import { previewFillFor, SAMPLE_BUILD_BUY_PARTNER, SAMPLE_STAKEHOLDERS, SAMPLE_VALUE_FEASIBILITY } from "./sampleFills";
import { type Box, type SkelElement, type SkelRect, boxesOverlap } from "./skeleton";
import { FrameworkTemplateSchema, type AnyFill, type FrameworkTemplate, fillSchemaFor } from "./types";
import { resolveColumns } from "./layouts/table";

function twelveItemFill(fw: FrameworkTemplate): AnyFill {
  const items = Array.from({ length: 12 }, (_, i) => ({ text: `Item number ${i + 1} with a few words`, sourceQuote: `quote ${i}` }));
  const l = fw.layout;
  switch (l.type) {
    case "matrix2x2":
      // deliberately crowd one quadrant to exercise packing
      return { items: items.map((it, i) => ({ ...it, x: i < 8 ? 5 : (i % 5) + 1, y: i < 8 ? 5 : ((i * 3) % 5) + 1 })) };
    case "canvas":
      return { blocks: Object.fromEntries(l.blocks.map((b, bi) => [b.id, items.filter((_, i) => (i > 8 ? 0 : i % l.blocks.length) === bi)])) };
    case "table": {
      const cols = l.columns.map((c) => c.label);
      return { cells: items.map((it, i) => ({ ...it, row: l.rows[i % l.rows.length].label, col: cols[i % 2] })) };
    }
    case "chain":
      return { problem: items[0], whys: items.slice(1, 6), rootCause: items[6], countermeasure: items[7] };
  }
}

const stickies = (els: SkelElement[]) => els.filter((e): e is SkelRect => e.type === "rectangle" && e.customData?.role === "sticky");
const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height;

describe("framework templates", () => {
  it("has ten valid built-ins with unique ids", () => {
    expect(BUILTIN_FRAMEWORKS).toHaveLength(10);
    expect(new Set(BUILTIN_FRAMEWORKS.map((f) => f.id)).size).toBe(10);
    for (const f of BUILTIN_FRAMEWORKS) {
      expect(() => FrameworkTemplateSchema.parse(f)).not.toThrow();
      expect(f.signals.length).toBeGreaterThanOrEqual(8);
      expect(f.signals.length).toBeLessThanOrEqual(15);
    }
    expect(BUILTIN_FRAMEWORKS.filter((f) => f.tuned).map((f) => f.id).sort()).toEqual(
      ["impact-effort", "stakeholder-map", "swot", "value-feasibility"].sort(),
    );
  });
});

describe.each(BUILTIN_FRAMEWORKS.map((f) => [f.id, f] as const))("renderer: %s", (_id, fw) => {
  it("places 12 items without overlap, inside the frame", () => {
    const fill = twelveItemFill(fw);
    expect(fillSchemaFor(fw.layout.type).safeParse(fill).success).toBe(true);
    const sk = renderFramework(fw, fill, { idPrefix: "t" });
    const s = stickies(sk.elements);
    const expected = fw.layout.type === "chain" ? 8 : fw.layout.type === "table" ? 12 : 12;
    expect(s.length).toBe(expected);
    for (let i = 0; i < s.length; i++) {
      expect(inside(s[i], sk.bounds)).toBe(true);
      for (let j = i + 1; j < s.length; j++) expect(boxesOverlap(s[i], s[j])).toBe(false);
    }
    for (const st of s) {
      expect(st.customData?.state).toBe("provisional");
      expect(st.customData?.source).toBe("ai");
    }
  });

  it("renders an empty frame with ghost labels", () => {
    const sk = renderFramework(fw, null, { idPrefix: "e" });
    expect(stickies(sk.elements)).toHaveLength(0);
    expect(sk.elements.filter((e) => e.customData?.role === "ghost").length).toBeGreaterThan(0);
    const frame = sk.elements.find((e) => e.type === "frame");
    expect(frame && frame.type === "frame" ? frame.name : "").toBe(fw.name);
  });

  it("has unique ids and a frame that lists every element", () => {
    const sk = renderFramework(fw, previewFillFor(fw.id), { idPrefix: "u" });
    const ids = sk.elements.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const frame = sk.elements.find((e) => e.type === "frame");
    expect(frame?.type === "frame" && frame.children.length).toBe(sk.elements.length - 1);
  });
});

describe("canned sample fills", () => {
  const byId = (id: string) => BUILTIN_FRAMEWORKS.find((f) => f.id === id)!;

  it("value vs feasibility puts summaries in Prioritise and the chatbot in Big bets", () => {
    const sk = renderFramework(byId("value-feasibility"), SAMPLE_VALUE_FEASIBILITY, { idPrefix: "v" });
    const slot = (t: string) => stickies(sk.elements).find((s) => s.label?.text.includes(t))?.customData?.slot;
    expect(slot("Article summaries")).toBe("q:topRight");
    expect(slot("Archive chatbot")).toBe("q:topLeft");
    expect(slot("Archive auto-tagging")).toBe("q:bottomRight");
  });

  it("stakeholder map places the board in Keep satisfied", () => {
    const sk = renderFramework(byId("stakeholder-map"), SAMPLE_STAKEHOLDERS, { idPrefix: "s" });
    const board = stickies(sk.elements).find((s) => s.label?.text.includes("The board"));
    expect(board?.customData?.slot).toBe("q:topLeft");
  });

  it("build/buy/partner fills twelve cells", () => {
    const sk = renderFramework(byId("build-buy-partner"), SAMPLE_BUILD_BUY_PARTNER, { idPrefix: "b" });
    expect(stickies(sk.elements)).toHaveLength(12);
  });

  it("dynamic tables use fill-supplied columns", () => {
    const fw = byId("customer-journey");
    if (fw.layout.type !== "table") throw new Error();
    expect(resolveColumns(fw.layout, { columns: ["Discover", "Trial", "Subscribe"], cells: [] }).map((c) => c.label)).toEqual([
      "Discover",
      "Trial",
      "Subscribe",
    ]);
  });
});
