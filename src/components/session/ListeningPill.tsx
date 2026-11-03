"use client";

import { cn } from "@/lib/utils";

export type PillState = "listening" | "paused" | "idle" | "replaying";

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Three-bar level meter: the only constant motion in the console. */
export function LevelMeter({ level, active, className }: { level?: number; active: boolean; className?: string }) {
  const l = Math.max(0, Math.min(1, level ?? 0));
  const heights = [0.55, 1, 0.75].map((k, i) => {
    if (!active) return 0.25;
    if (level === undefined) return undefined; // CSS idle animation
    return Math.max(0.2, Math.min(1, l * k * 1.6 + 0.15 + (i === 1 ? 0.05 : 0)));
  });
  return (
    <span className={cn("inline-flex h-3 items-end gap-[2px]", className)} aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-current transition-[height] duration-150 ease-out",
            h === undefined && "ciac-meter-bar",
          )}
          style={h === undefined ? { animationDelay: `${i * 140}ms` } : { height: `${Math.round(h * 12)}px` }}
        />
      ))}
    </span>
  );
}

export function ListeningPill({
  state,
  elapsedMs,
  level,
  unseen,
  className,
}: {
  state: PillState;
  elapsedMs: number;
  level?: number;
  unseen?: boolean;
  className?: string;
}) {
  const live = state === "listening" || state === "replaying";
  const label =
    state === "listening" ? "Listening" : state === "replaying" ? "Sample" : state === "paused" ? "Paused" : "Ready";
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`${label}, ${formatElapsed(elapsedMs)}${unseen ? ", new suggestion" : ""}`}
      className={cn(
        "relative inline-flex h-8 items-center gap-2.5 rounded-full border border-hairline bg-surface pl-3 pr-3.5 text-[13px]",
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-full", live ? "bg-live" : "bg-ink-muted/50")}
        aria-hidden
      />
      <span className={cn("font-medium", live ? "text-ink" : "text-ink-muted")}>{label}</span>
      <LevelMeter level={level} active={live} className={live ? "text-live" : "text-ink-muted/60"} />
      <span className="text-mono-sm">{formatElapsed(elapsedMs)}</span>
      {unseen ? (
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-paper bg-signal" aria-hidden />
      ) : null}
    </div>
  );
}
