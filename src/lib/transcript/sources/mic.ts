import { startLevelMeter } from "../level";
import type { SourceListener, TranscriptSource } from "../types";

type SpeechResultLike = { isFinal: boolean; 0: { transcript: string }; length: number };
type SpeechResultListLike = { length: number; [i: number]: SpeechResultLike };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: SpeechResultListLike }) => void) | null;
  onerror: ((e: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognition(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSupported(): boolean {
  return getSpeechRecognition() !== null;
}

/** Pure: split a result list (from resultIndex) into newly-final texts and the current interim text. */
export function processResults(results: SpeechResultListLike, resultIndex: number): { finals: string[]; interim: string } {
  const finals: string[] = [];
  let interim = "";
  for (let i = resultIndex; i < results.length; i++) {
    const r = results[i];
    const text = (r?.[0]?.transcript ?? "").trim();
    if (!text) continue;
    if (r.isFinal) finals.push(text);
    else interim += (interim ? " " : "") + text;
  }
  return { finals, interim };
}

/** Chrome rarely punctuates; make finals read like sentences. */
export function tidyFinal(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return t;
  const cap = t[0].toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(cap) ? cap : `${cap}.`;
}

export const MIC_ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in the address bar, then resume.",
  "service-not-allowed": "Speech recognition isn't allowed in this browser profile.",
  "audio-capture": "No microphone was found.",
  network: "Chrome's speech service couldn't be reached. Check the connection, or paste a transcript instead.",
  "language-not-supported": "That language isn't supported by speech recognition.",
};

export class MicSource implements TranscriptSource {
  readonly kind = "mic" as const;
  private rec: SpeechRecognitionLike | null = null;
  private listener: SourceListener | null = null;
  private active = false;
  private paused = false;
  private clockBase: number;
  private runningSince: number | null = null;
  private utteranceStart: number | null = null;
  private restarts: number[] = [];
  private stopMeter: (() => void) | null = null;

  constructor(private opts: { lang?: string; startAtMs?: number; deviceId?: string } = {}) {
    this.clockBase = opts.startAtMs ?? 0;
  }

  now() {
    return Math.round(this.clockBase + (this.runningSince !== null ? performance.now() - this.runningSince : 0));
  }

  private runClock() {
    if (this.runningSince === null) this.runningSince = performance.now();
  }
  private haltClock() {
    if (this.runningSince !== null) {
      this.clockBase += performance.now() - this.runningSince;
      this.runningSince = null;
    }
  }

  async start(listener: SourceListener) {
    this.listener = listener;
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      listener({ type: "status", status: "error", message: "Live transcription needs Chrome (Web Speech API)." });
      return;
    }
    this.active = true;
    this.paused = false;
    this.startMeter();
    this.createAndStart(Ctor);
  }

  private async startMeter() {
    try {
      this.stopMeter?.();
      this.stopMeter = await startLevelMeter((level) => this.listener?.({ type: "level", level: this.paused ? 0 : level }), this.opts.deviceId);
    } catch (err) {
      console.warn("[mic] level meter unavailable", err);
    }
  }

  private createAndStart(Ctor: SpeechCtor) {
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.opts.lang ?? "en-GB";
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      this.runClock();
      this.listener?.({ type: "status", status: "listening" });
    };
    rec.onresult = (e) => {
      const { finals, interim } = processResults(e.results, e.resultIndex);
      const now = this.now();
      if ((finals.length || interim) && this.utteranceStart === null) this.utteranceStart = Math.max(0, now - 1500);
      for (const f of finals) {
        const text = tidyFinal(f);
        this.listener?.({ type: "final", text, startMs: this.utteranceStart ?? now, endMs: now });
        this.utteranceStart = null;
      }
      if (interim) this.listener?.({ type: "interim", text: interim, atMs: now });
      else if (finals.length) this.listener?.({ type: "interim", text: "", atMs: now });
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      const message = MIC_ERROR_MESSAGES[e.error] ?? `Speech recognition error: ${e.error}`;
      if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
        this.active = false;
        this.haltClock();
        this.listener?.({ type: "status", status: "error", message });
      } else {
        console.warn("[mic]", message);
      }
    };
    rec.onend = () => {
      if (!this.active || this.paused) return;
      // Chrome ends sessions after silence or ~60s; restart while live, but not in a tight loop.
      const now = Date.now();
      this.restarts = this.restarts.filter((t) => now - t < 10_000);
      this.restarts.push(now);
      if (this.restarts.length > 6) {
        this.active = false;
        this.haltClock();
        this.listener?.({ type: "status", status: "error", message: "Speech recognition keeps stopping. Check the microphone, then resume." });
        return;
      }
      setTimeout(() => {
        if (!this.active || this.paused) return;
        try {
          rec.start();
        } catch {
          this.createAndStart(Ctor);
        }
      }, 250);
    };
    this.rec = rec;
    try {
      rec.start();
    } catch (err) {
      console.warn("[mic] start failed", err);
    }
  }

  pause() {
    this.paused = true;
    this.haltClock();
    try {
      this.rec?.stop();
    } catch {
      /* ignore */
    }
    this.listener?.({ type: "status", status: "paused" });
  }

  resume() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    this.paused = false;
    this.active = true;
    if (!this.stopMeter) void this.startMeter();
    try {
      this.rec?.start();
    } catch {
      this.createAndStart(Ctor);
    }
  }

  stop() {
    this.active = false;
    this.haltClock();
    try {
      this.rec?.abort();
    } catch {
      /* ignore */
    }
    this.rec = null;
    this.stopMeter?.();
    this.stopMeter = null;
    this.listener = null;
  }
}
