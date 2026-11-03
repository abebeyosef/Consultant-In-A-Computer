import type { SourceListener, TranscriptSource } from "../types";

/**
 * Meeting-bot source (M13, behind ENABLE_MEET_BOT=1). Stub until then: reports
 * an error status so the UI can explain the feature is not configured.
 */
export class BotSource implements TranscriptSource {
  readonly kind = "bot" as const;
  private listener: SourceListener | null = null;
  start(listener: SourceListener) {
    this.listener = listener;
    listener({ type: "status", status: "error", message: "Meeting bot is not configured." });
  }
  pause() {}
  resume() {}
  stop() {
    this.listener = null;
  }
  now() {
    return 0;
  }
}
