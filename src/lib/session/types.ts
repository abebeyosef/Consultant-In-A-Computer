import type { AnyFill } from "@/lib/frameworks/types";
import type { SourceKind, TranscriptSegment } from "@/lib/transcript/types";

export type Fit = "strong" | "possible";

export type Suggestion = {
  id: string;
  frameworkId: string;
  fit: Fit;
  reason: string;
  evidenceQuote: string;
  evidenceSegmentIds: string[];
  createdAt: number; // session clock ms
  createdAtWall: number; // Date.now()
  status: "new" | "seen" | "opened" | "dismissed";
  fillStatus: "pending" | "ready" | "error";
  fill?: AnyFill | null;
  fillOrigin?: "live" | "mock";
  boardId?: string;
  manual: boolean;
  /** what the model looked for — shown on hover of the fit label */
  fitHint?: string;
  engine?: "live" | "mock";
};

export type SessionSource = {
  kind: SourceKind;
  /** pasted transcript text (paste sessions) */
  pasteText?: string;
  instant?: boolean;
  speed?: number;
  /** position on the source clock, for resuming after reload */
  positionMs: number;
  lang?: string;
  deviceId?: string;
  meetUrl?: string;
};

export type SessionStatus = "ready" | "live" | "paused" | "ended";

export type Session = {
  id: string;
  name: string;
  mode: "private" | "room";
  startedAt: number;
  segments: TranscriptSegment[];
  suggestions: Suggestion[];
  boardIds: string[];
  mutedFrameworkIds: string[];
  source: SessionSource;
  status: SessionStatus;
  /** board currently shown in the room (M8) */
  roomBoardId?: string | null;
  /** pasted transcript processed instantly has been scanned for flags */
  instantScanned?: boolean;
};
