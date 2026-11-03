/**
 * Server-side meeting-bot adapter (behind ENABLE_MEET_BOT=1).
 * Providers: "vexa" (Apache-2.0; hosted api.cloud.vexa.ai or self-hosted) and
 * "mock" (replays the sample workshop as a fake call — for demos and tests).
 * The provider key never reaches the browser.
 */
import { splitSentences, SAMPLE_FULL_TEXT } from "@/lib/transcript/sampleScript";
import type { BotSegment, BotTranscript } from "./types";

export const botEnabled = () => process.env.ENABLE_MEET_BOT === "1";

export function botProvider(): "vexa" | "mock" {
  const p = (process.env.MEET_BOT_PROVIDER ?? "").toLowerCase();
  if (p === "mock") return "mock";
  if (p === "vexa") return "vexa";
  return process.env.VEXA_API_KEY ? "vexa" : "mock";
}

/* ---------------- Vexa ---------------- */

const vexaBase = () => (process.env.VEXA_API_BASE ?? "https://api.cloud.vexa.ai").replace(/\/$/, "");

async function vexa(path: string, init: RequestInit = {}) {
  const res = await fetch(`${vexaBase()}${path}`, {
    ...init,
    headers: { "X-API-Key": process.env.VEXA_API_KEY ?? "", "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  return res;
}

type VexaSegment = { segment_id?: string; text?: string; start?: number; end?: number; completed?: boolean; speaker?: string };

export function normaliseVexa(body: unknown): BotSegment[] {
  const segs = (body as { segments?: VexaSegment[] } | null)?.segments;
  if (!Array.isArray(segs)) return [];
  return segs.flatMap((s, i) => {
    if (typeof s?.text !== "string" || typeof s.start !== "number") return [];
    const startMs = Math.round(s.start * 1000);
    const endMs = Math.round((typeof s.end === "number" ? s.end : s.start) * 1000);
    return [{ id: s.segment_id ?? `v${i}-${startMs}`, startMs, endMs, text: s.text, completed: s.completed !== false, speaker: s.speaker }];
  });
}

/* ---------------- Mock (in-memory fake call) ---------------- */

const mockCalls = new Map<string, number>(); // code → joined at (wall ms)
const MOCK_JOIN_MS = 3000;
const MOCK_WPM = 170;

function mockTranscript(code: string): BotTranscript {
  const joined = mockCalls.get(code);
  if (joined === undefined) return { status: "ended", segments: [] };
  const elapsed = Date.now() - joined - MOCK_JOIN_MS;
  if (elapsed < 0) return { status: "joining", segments: [] };
  const segments: BotSegment[] = [];
  let t = 0;
  for (const [i, sentence] of splitSentences(SAMPLE_FULL_TEXT).entries()) {
    const dur = Math.max(1200, (sentence.split(/\s+/).length / MOCK_WPM) * 60_000);
    if (t > elapsed) break;
    const done = t + dur <= elapsed;
    const words = sentence.split(/\s+/);
    const text = done ? sentence : words.slice(0, Math.max(1, Math.floor((words.length * (elapsed - t)) / dur))).join(" ");
    segments.push({ id: `mock-${i}`, startMs: t, endMs: t + dur, text, completed: done, speaker: i % 2 ? "Sam" : "Alex" });
    t += dur + 400;
  }
  return { status: "in_call", segments };
}

/* ---------------- API used by the route ---------------- */

export async function startBot(code: string, botName = "Workshop notes"): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (botProvider() === "mock") {
    if (!mockCalls.has(code)) mockCalls.set(code, Date.now());
    return { ok: true };
  }
  const res = await vexa("/bots", {
    method: "POST",
    body: JSON.stringify({ platform: "google_meet", native_meeting_id: code, bot_name: botName, language: "en" }),
  });
  if (res.ok || res.status === 409) return { ok: true }; // 409: a bot is already in this call (e.g. after a reload)
  const text = await res.text().catch(() => "");
  console.warn("[bot] vexa start failed", res.status, text.slice(0, 200));
  return { ok: false, status: res.status, message: res.status === 401 || res.status === 403 ? "The meeting-bot key was refused." : res.status === 503 ? "The bot service has no transcription backend configured." : "The meeting bot couldn't join." };
}

export async function getTranscript(code: string): Promise<BotTranscript> {
  if (botProvider() === "mock") return mockTranscript(code);
  const res = await vexa(`/transcripts/google_meet/${encodeURIComponent(code)}`);
  if (res.status === 404) return { status: "joining", segments: [] };
  if (!res.ok) return { status: "error", segments: [], message: `Bot service answered ${res.status}` };
  return { status: "in_call", segments: normaliseVexa(await res.json()) };
}

export async function stopBot(code: string): Promise<void> {
  if (botProvider() === "mock") {
    mockCalls.delete(code);
    return;
  }
  await vexa(`/bots/google_meet/${encodeURIComponent(code)}`, { method: "DELETE" }).catch(() => undefined);
}
