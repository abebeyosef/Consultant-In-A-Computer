export type TranscriptSegment = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  final: boolean;
  marked?: boolean;
  /** starts a new paragraph (≥ ~2s pause before it) */
  paragraphStart?: boolean;
};

export type SourceKind = "mic" | "paste" | "sample" | "bot";

export type SourceStatus = "idle" | "listening" | "paused" | "ended" | "error";

export type SourceEvent =
  | { type: "interim"; text: string; atMs: number }
  | { type: "final"; text: string; startMs: number; endMs: number; paragraphStart?: boolean }
  | { type: "status"; status: SourceStatus; message?: string }
  | { type: "level"; level: number };

export type SourceListener = (e: SourceEvent) => void;

export interface TranscriptSource {
  readonly kind: SourceKind;
  /** start (or restart) emitting events */
  start(listener: SourceListener): void | Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  /** current position on the session clock, in ms */
  now(): number;
  /** replay speed (sample/paste only) */
  setSpeed?(speed: number): void;
}
