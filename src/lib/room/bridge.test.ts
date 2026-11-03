import { describe, expect, it } from "vitest";
import type { ExElement } from "@/lib/board/excalidraw";
import { captionText, followViewport, toRoomBoard } from "./bridge";

const el = (id: string, extra: Partial<ExElement> = {}): ExElement =>
  ({
    id,
    type: "rectangle",
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    version: 1,
    versionNonce: 1,
    isDeleted: false,
    locked: false,
    frameId: null,
    strokeColor: "#000",
    backgroundColor: "#fff",
    strokeStyle: "solid",
    ...extra,
  }) as ExElement;

describe("toRoomBoard", () => {
  it("keeps structure and accepted stickies, drops provisional items, their text and ghosts", () => {
    const els = [
      el("frame", { type: "frame" }),
      el("acc", { customData: { source: "ai", role: "sticky", state: "accepted" }, boundElements: [{ id: "acc-t", type: "text" }] }),
      el("acc-t", { type: "text", containerId: "acc", text: "Kept" }),
      el("prov", { customData: { source: "ai", role: "sticky", state: "provisional" }, boundElements: [{ id: "prov-t", type: "text" }] }),
      el("prov-t", { type: "text", containerId: "prov", text: "Hidden" }),
      el("ghost", { type: "text", customData: { role: "ghost" } }),
      el("gone", { isDeleted: true }),
    ];
    const rb = toRoomBoard({ id: "b1", title: "T", elements: els });
    expect(rb.elements.map((e) => e.id)).toEqual(["frame", "acc", "acc-t"]);
  });
});

describe("followViewport", () => {
  it("shows the same scene centre in a differently sized room", () => {
    const src = { scrollX: -100, scrollY: -50, zoom: 1, width: 800, height: 600 };
    const v = followViewport(src, { width: 1600, height: 1200 });
    expect(v.zoom).toBeCloseTo(2);
    // scene centre (500, 350) lands at the room centre (800, 600)
    expect((500 + v.scrollX) * v.zoom).toBeCloseTo(800);
    expect((350 + v.scrollY) * v.zoom).toBeCloseTo(600);
  });

  it("letterboxes a wide source into a tall room", () => {
    const src = { scrollX: 0, scrollY: 0, zoom: 0.5, width: 1000, height: 500 };
    const v = followViewport(src, { width: 1000, height: 1000 });
    expect(v.zoom).toBeCloseTo(0.5);
    expect((1000 + v.scrollX) * v.zoom).toBeCloseTo(500);
  });
});

describe("followViewport with content", () => {
  it("clips a zoomed-out view to the board so the room fills the screen", () => {
    // console shows scene 0..2000 x 0..1000 but the board is 500..1500 x 250..750
    const src = { scrollX: 0, scrollY: 0, zoom: 0.5, width: 1000, height: 500 };
    const content = { x: 500, y: 250, width: 1000, height: 500 };
    const v = followViewport(src, { width: 1000, height: 500 }, content);
    expect(v.zoom).toBeGreaterThan(0.85); // vs 0.5 without clipping
    expect((1000 + v.scrollX) * v.zoom).toBeCloseTo(500);
  });
  it("follows exactly when zoomed in inside the board", () => {
    const src = { scrollX: -600, scrollY: -300, zoom: 2, width: 400, height: 200 };
    const content = { x: 0, y: 0, width: 2000, height: 1000 };
    const v = followViewport(src, { width: 400, height: 200 }, content);
    expect(v.zoom).toBeCloseTo(2);
    expect(v.scrollX).toBeCloseTo(-600);
  });
});

describe("captionText", () => {
  it("joins the last finals and interim, trimming from the left on a word boundary", () => {
    expect(captionText(["One.", "Two."], "three")).toBe("One. Two. three");
    const long = captionText(["a ".repeat(100)], "end", 20);
    expect(long.startsWith("…")).toBe(true);
    expect(long.endsWith("end")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(21);
  });
});
