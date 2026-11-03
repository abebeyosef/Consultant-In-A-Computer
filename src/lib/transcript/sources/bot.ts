import { type DiffState, diffSegments, initialDiff } from "@/lib/bot/diff";
import type { BotTranscript } from "@/lib/bot/types";
import type { SourceListener, TranscriptSource } from "../types";

const PARAGRAPH_GAP_MS = 2000;

/**
 * Meeting-bot source (behind ENABLE_MEET_BOT=1): asks the server to send a bot
 * into the call, then polls the transcript and feeds finals/interim into the
 * same pipeline as the microphone. The session clock follows the call.
 */
export class BotSource implements TranscriptSource {
  readonly kind = "bot" as const;
  private listener: SourceListener | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private diff: DiffState;
  private running = false;
  private baseMs: number;
  private wallAt: number | null = null;
  private joined = false;
  private lastSpeaker: string | undefined;

  constructor(
    private meetUrl: string,
    opts: { startAtMs?: number; pollMs?: number; fetchImpl?: typeof fetch } = {},
  ) {
    this.baseMs = opts.startAtMs ?? 0;
    this.diff = initialDiff(opts.startAtMs ?? 0);
    this.pollMs = opts.pollMs ?? 2000;
    this.fetchImpl = opts.fetchImpl ?? ((...a) => fetch(...a));
  }
  private pollMs: number;
  private fetchImpl: typeof fetch;

  private q() {
    return `/api/bot?meetUrl=${encodeURIComponent(this.meetUrl)}`;
  }

  async start(listener: SourceListener) {
    this.listener = listener;
    if (!this.meetUrl) {
      listener({ type: "status", status: "error", message: "No meeting link for this session." });
      return;
    }
    try {
      const res = await this.fetchImpl("/api/bot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetUrl: this.meetUrl }) });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        listener({ type: "status", status: "error", message: body.error ?? "The meeting bot couldn't join." });
        return;
      }
    } catch {
      listener({ type: "status", status: "error", message: "Couldn't reach the server to start the meeting bot." });
      return;
    }
    listener({ type: "status", status: "listening", message: "Bot is joining the call — admit it from Meet if asked." });
    this.running = true;
    this.wallAt = Date.now();
    void this.poll();
  }

  private schedule() {
    if (this.running) this.timer = setTimeout(() => void this.poll(), this.pollMs);
  }

  private async poll() {
    if (!this.running || !this.listener) return;
    try {
      const res = await this.fetchImpl(this.q(), { cache: "no-store" });
      const t = (await res.json()) as BotTranscript;
      if (!this.running || !this.listener) return;
      if (t.status === "error" && t.message) this.listener({ type: "status", status: "listening", message: t.message });
      if (t.status === "in_call" && !this.joined) {
        this.joined = true;
        this.listener({ type: "status", status: "listening" });
      }
      const { finals, interim, state } = diffSegments(this.diff, t.segments ?? []);
      let prevEnd = this.diff.lastEndMs;
      this.diff = state;
      for (const f of finals) {
        const paragraphStart = f.startMs - prevEnd >= PARAGRAPH_GAP_MS || (!!f.speaker && f.speaker !== this.lastSpeaker);
        this.listener({ type: "final", text: f.text, startMs: f.startMs, endMs: f.endMs, paragraphStart });
        this.lastSpeaker = f.speaker;
        prevEnd = f.endMs;
      }
      this.listener({ type: "interim", text: interim, atMs: this.now() });
      if (t.status === "ended" && this.joined) {
        this.running = false;
        this.listener({ type: "status", status: "ended" });
        return;
      }
    } catch {
      // transient: keep polling quietly
    }
    this.schedule();
  }

  pause() {
    // The bot stays in the call; we just stop reading (and the clock stops).
    if (this.wallAt !== null) this.baseMs += Date.now() - this.wallAt;
    this.wallAt = null;
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }

  resume() {
    if (this.running || !this.listener) return;
    this.running = true;
    this.wallAt = Date.now();
    void this.poll();
  }

  stop() {
    this.pause();
    this.listener = null;
    if (this.meetUrl) void this.fetchImpl(this.q(), { method: "DELETE" }).catch(() => undefined);
  }

  now() {
    const wall = this.wallAt === null ? this.baseMs : this.baseMs + (Date.now() - this.wallAt);
    return Math.max(wall, this.diff.lastEndMs);
  }
}
