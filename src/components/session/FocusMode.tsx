"use client";

import { Kbd } from "@/components/common/Kbd";
import { useConsole } from "./ConsoleContext";
import { LevelMeter, formatElapsed } from "./ListeningPill";

/** F: hides the transcript, leaving the pill and flags. */
export function FocusMode() {
  const status = useConsole((s) => s.session.status);
  const clockMs = useConsole((s) => s.clockMs);
  const level = useConsole((s) => s.level);
  const kind = useConsole((s) => s.session.source.kind);
  const live = status === "live";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 text-ink-muted" data-testid="focus-mode">
      <div className="flex items-center gap-4">
        <span className={live ? "size-2.5 rounded-full bg-live" : "size-2.5 rounded-full bg-ink-muted/50"} />
        <LevelMeter level={kind === "mic" ? level : undefined} active={live} className={live ? "scale-150 text-live" : "scale-150"} />
        <span className="font-mono text-[28px] tabular-nums text-ink">{formatElapsed(clockMs)}</span>
      </div>
      <p className="text-[14px]">
        {live ? "Listening quietly." : status === "ended" ? "Session ended." : "Paused."} Suggestions still arrive on the right.
      </p>
      <p className="inline-flex items-center gap-1.5 text-[12px]">
        <Kbd>F</Kbd> to show the transcript
      </p>
    </div>
  );
}
