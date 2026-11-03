"use client";

import { Pause, Play, Square } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useConsole } from "./ConsoleContext";
import { ListeningPill, type PillState } from "./ListeningPill";

export function TopBar({
  onPause,
  onResume,
  onStop,
  onSpeed,
  roomControls,
}: {
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSpeed: (s: number) => void;
  roomControls?: React.ReactNode;
}) {
  const name = useConsole((s) => s.session.name);
  const status = useConsole((s) => s.session.status);
  const kind = useConsole((s) => s.session.source.kind);
  const speed = useConsole((s) => s.session.source.speed ?? 1);
  const clockMs = useConsole((s) => s.clockMs);
  const level = useConsole((s) => s.level);
  const unseen = useConsole((s) => s.session.suggestions.some((x) => x.status === "new"));
  const replay = kind === "sample" || kind === "paste";

  const pill: PillState = status === "live" ? (replay ? "replaying" : "listening") : status === "paused" ? "paused" : "idle";

  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-hairline px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="grid size-6 shrink-0 place-items-center rounded-[6px] bg-ink text-[11px] font-bold text-paper" aria-label="Home">
          C
        </Link>
        <h1 className="truncate text-[14px] font-semibold" data-testid="session-name">
          {name}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <ListeningPill
          state={status === "ended" ? "idle" : pill}
          elapsedMs={clockMs}
          level={kind === "mic" ? level : undefined}
          unseen={unseen}
        />
        {kind === "sample" && status !== "ended" ? (
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={String(speed)}
            onValueChange={(v) => v && onSpeed(Number(v))}
            aria-label="Replay speed"
            className="h-7"
          >
            {[1, 1.5, 3].map((s) => (
              <ToggleGroupItem key={s} value={String(s)} className="h-7 px-2 font-mono text-[11px] data-[state=on]:bg-ink/10 data-[state=on]:text-ink">
                {s}×
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-1.5">
        {status === "ended" ? (
          <span className="mr-2 text-[13px] text-ink-muted">Session ended</span>
        ) : status === "live" ? (
          <Button variant="ghost" size="sm" onClick={onPause} data-testid="pause">
            <Pause strokeWidth={1.5} /> Pause
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onResume} data-testid="resume">
            <Play strokeWidth={1.5} /> {status === "ready" ? "Start" : "Resume"}
          </Button>
        )}
        {roomControls}
        <ThemeToggle />
        {status !== "ended" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="danger" size="sm" onClick={onStop} data-testid="stop">
                <Square strokeWidth={1.5} className="fill-current" /> Stop
              </Button>
            </TooltipTrigger>
            <TooltipContent>End the session (the transcript and boards are kept)</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </header>
  );
}
