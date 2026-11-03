import { describe, expect, it } from "vitest";
import type { ExElement } from "./excalidraw";
import { decodeShare, encodeShare, fileName } from "./share";
import { boardItems, sessionNotes } from "@/lib/session/notes";
import type { Session } from "@/lib/session/types";

const el = (id: string, extra: Partial<ExElement> = {}): ExElement =>
  ({ id, type: "rectangle", x: 0, y: 0, width: 10, height: 10, version: 1, versionNonce: 9, isDeleted: false, locked: false, frameId: null, strokeColor: "#000", backgroundColor: "#fff", strokeStyle: "solid", ...extra }) as ExElement;

const board = {
  title: "SWOT",
  elements: [
    el("lab", { type: "text", locked: true, text: "Strengths", customData: { role: "label", slot: "b:s" } }),
    el("acc", { customData: { role: "sticky", slot: "b:s", state: "accepted", source: "ai", sourceQuote: "q" }, boundElements: [{ id: "acc-t", type: "text" }] }),
    el("acc-t", { type: "text", containerId: "acc", text: "✦ Loyal readers", originalText: "✦ Loyal readers" }),
    el("prov", { customData: { role: "sticky", slot: "b:s", state: "provisional", source: "ai" }, boundElements: [{ id: "prov-t", type: "text" }] }),
    el("prov-t", { type: "text", containerId: "prov", text: "Secret" }),
    el("mine", { type: "text", text: "Ask legal" }),
  ],
};

describe("share links", () => {
  it("round-trips accepted elements only, slimmed", () => {
    const enc = encodeShare(board);
    expect(enc).toMatch(/^[A-Za-z0-9+\-$]+$/);
    const dec = decodeShare(`#${enc}`)!;
    expect(dec.title).toBe("SWOT");
    expect(dec.elements.map((e) => e.id)).toEqual(["lab", "acc", "acc-t", "mine"]);
    expect(dec.elements[1].customData).toEqual({ role: "sticky", state: "accepted", source: "ai" });
    expect("versionNonce" in dec.elements[0]).toBe(false);
  });
  it("rejects garbage", () => {
    expect(decodeShare("#not-a-board")).toBeNull();
    expect(decodeShare("")).toBeNull();
  });
  it("makes file names", () => {
    expect(fileName("Build, buy or partner", "png")).toBe("build-buy-or-partner.png");
  });
});

describe("session notes", () => {
  it("groups kept items by label and counts unreviewed suggestions", () => {
    const { groups, unreviewed } = boardItems(board);
    expect(groups).toEqual([
      { label: "Strengths", items: ["Loyal readers"] },
      { label: "Other notes", items: ["Ask legal"] },
    ]);
    expect(unreviewed).toBe(1);
  });
  it("renders markdown with boards and marked moments", () => {
    const session = {
      id: "s", name: "Harbourline", mode: "private", startedAt: 0,
      segments: [{ id: "a", startMs: 65_000, endMs: 70_000, text: "Priya must sign off.", final: true, marked: true }],
      suggestions: [], boardIds: [], mutedFrameworkIds: [], source: { kind: "sample", positionMs: 0 }, status: "ended",
    } satisfies Session;
    const md = sessionNotes(session, [board], 190_000, new Date("2026-11-05T10:00:00Z"));
    expect(md).toContain("# Harbourline");
    expect(md).toContain("5 November 2026 · 03:10 recorded");
    expect(md).toContain("### SWOT\n\n**Strengths**\n- Loyal readers");
    expect(md).toContain("_1 AI suggestion not yet reviewed._");
    expect(md).toContain("- [01:05] Priya must sign off.");
  });
});
