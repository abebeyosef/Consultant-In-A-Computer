"use client";

import { MoreHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Spark } from "@/components/common/Spark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type FlagCardProps = {
  frameworkName: string;
  reason: string;
  quote?: string;
  fit: "strong" | "possible";
  fitHint?: string;
  manual?: boolean;
  /** seconds spent waiting on the fill, when the user asked to open before it was ready */
  preparingSeconds?: number | null;
  fillError?: boolean;
  opened?: boolean;
  onOpen?: () => void;
  onNotNow?: () => void;
  onMute?: () => void;
  onQuoteClick?: () => void;
  className?: string;
  animate?: boolean;
};

export function FlagCard({
  frameworkName,
  reason,
  quote,
  fit,
  fitHint,
  manual,
  preparingSeconds,
  opened,
  onOpen,
  onNotNow,
  onMute,
  onQuoteClick,
  className,
  animate = true,
}: FlagCardProps) {
  const reduce = useReducedMotion();
  const preparing = preparingSeconds !== null && preparingSeconds !== undefined;
  return (
    <motion.article
      layout={!reduce}
      initial={animate ? (reduce ? { opacity: 0 } : { opacity: 0, x: 8, y: 4 }) : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 8 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      data-testid="flag-card"
      aria-label={`Suggestion: ${frameworkName}`}
      className={cn(
        "relative overflow-hidden rounded-[12px] border border-signal/25 bg-surface shadow-flag",
        className,
      )}
    >
      <div className="absolute inset-0 bg-signal-tint" aria-hidden />
      <div className="absolute inset-y-0 left-0 w-[3px] bg-signal" aria-hidden />
      <div className="relative flex flex-col gap-2.5 py-3.5 pl-[18px] pr-3.5">
        <header className="flex items-start gap-2">
          <Spark className="mt-[3px]" />
          <h3 className="flex-1 text-[15px] font-semibold leading-snug tracking-[-0.01em]">{frameworkName}</h3>
          {onMute ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label="More options" className="-mr-1 -mt-0.5 text-ink-muted">
                  <MoreHorizontal strokeWidth={1.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onMute}>Don&apos;t suggest this again today</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </header>
        <p className="text-[14px] leading-[1.45] text-ink">{reason}</p>
        {quote ? (
          <button
            type="button"
            onClick={onQuoteClick}
            className="text-left text-[13px] italic leading-[1.45] text-ink-muted underline-offset-2 hover:text-ink hover:underline focus-visible:rounded-sm"
            title="Show in transcript"
          >
            &ldquo;{quote}&rdquo;
          </button>
        ) : null}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={onOpen} disabled={preparing} data-testid="open-board" className="min-w-[96px]">
            {preparing ? (
              <span className="inline-flex items-center gap-1.5">
                Preparing board…<span className="font-mono text-[11px] opacity-80">{preparingSeconds}s</span>
              </span>
            ) : opened ? (
              "Open again"
            ) : (
              "Open board"
            )}
          </Button>
          {onNotNow ? (
            <Button size="sm" variant="ghost" onClick={onNotNow} className="text-ink-muted">
              Not now
            </Button>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="ml-auto cursor-default whitespace-nowrap text-[12px] text-signal-ink">
                {manual && fit === "possible" ? "Possible fit" : fit === "strong" ? "Strong fit" : "Possible fit"}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[240px]">
              {fitHint ?? "What the model looked for in the conversation."}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.article>
  );
}
