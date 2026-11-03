import { describe, expect, it } from "vitest";
import { BotSource } from "@/lib/transcript/sources/bot";
import type { SourceEvent } from "@/lib/transcript/types";
import { diffSegments, initialDiff } from "./diff";
import { normaliseVexa } from "./server";
import { meetCode } from "./types";

const seg = (id: string, startMs: number, text: string, completed = true) => ({ id, startMs, endMs: startMs + 1000, text, completed });

describe("meetCode", () => {
  it("extracts Google Meet codes and rejects anything else", () => {
    expect(meetCode("https://meet.google.com/abc-defg-hij")).toBe("abc-defg-hij");
    expect(meetCode("https://meet.google.com/ABC-DEFG-HIJ?authuser=0")).toBe("abc-defg-hij");
    expect(meetCode("https://zoom.us/j/123")).toBeNull();
    expect(meetCode("https://meet.google.com/abc-defg-hij.evil.com")).toBeNull();
  });
});

describe("diffSegments", () => {
  it("emits each completed segment once, in order, with interim from incomplete ones", () => {
    let st = initialDiff();
    const a = diffSegments(st, [seg("2", 2000, "Second."), seg("1", 0, "First."), seg("3", 4000, "Third is", false)]);
    expect(a.finals.map((f) => f.text)).toEqual(["First.", "Second."]);
    expect(a.interim).toBe("Third is");
    st = a.state;
    const b = diffSegments(st, [seg("1", 0, "First."), seg("2", 2000, "Second."), seg("3", 4000, "Third is done.")]);
    expect(b.finals.map((f) => f.text)).toEqual(["Third is done."]);
    expect(b.interim).toBe("");
  });
  it("skips what was already restored before a reload", () => {
    const r = diffSegments(initialDiff(3000), [seg("1", 0, "Old."), seg("2", 1500, "Also old."), seg("3", 5000, "New.")]);
    expect(r.finals.map((f) => f.text)).toEqual(["New."]);
  });
});

describe("normaliseVexa", () => {
  it("maps Vexa's documented segment shape", () => {
    const out = normaliseVexa({ segments: [{ segment_id: "s:1", speaker: "Jane", text: "Lock pricing.", start: 12.4, end: 15.1, completed: true }, { text: 3 }] });
    expect(out).toEqual([{ id: "s:1", startMs: 12400, endMs: 15100, text: "Lock pricing.", completed: true, speaker: "Jane" }]);
    expect(normaliseVexa(null)).toEqual([]);
  });
});

describe("BotSource", () => {
  it("joins, polls and feeds finals into the pipeline, then leaves on stop", async () => {
    const calls: string[] = [];
    let n = 0;
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (init?.method === "POST" || init?.method === "DELETE") return new Response(JSON.stringify({ ok: true }));
      n++;
      const segments = n === 1 ? [seg("1", 0, "Hello room.")] : [seg("1", 0, "Hello room."), seg("2", 1500, "Next point.", n > 2)];
      return new Response(JSON.stringify({ status: "in_call", segments }));
    }) as typeof fetch;
    const events: SourceEvent[] = [];
    const src = new BotSource("https://meet.google.com/abc-defg-hij", { pollMs: 5, fetchImpl });
    await src.start((e) => events.push(e));
    await new Promise((r) => setTimeout(r, 60));
    src.stop();
    const finals = events.filter((e) => e.type === "final").map((e) => (e as { text: string }).text);
    expect(finals).toEqual(["Hello room.", "Next point."]);
    expect(events.some((e) => e.type === "interim" && e.text === "Next point.")).toBe(true);
    expect(calls[0]).toBe("POST /api/bot");
    expect(calls.at(-1)).toMatch(/^DELETE \/api\/bot\?meetUrl=/);
  });

  it("reports a clear error when the bot can't join", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ error: "The meeting-bot key was refused." }), { status: 502 })) as unknown as typeof fetch;
    const events: SourceEvent[] = [];
    await new BotSource("https://meet.google.com/abc-defg-hij", { fetchImpl }).start((e) => events.push(e));
    expect(events).toEqual([{ type: "status", status: "error", message: "The meeting-bot key was refused." }]);
  });
});
