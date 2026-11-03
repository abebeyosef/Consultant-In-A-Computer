"use client";

import { ArrowDown, Pin } from "lucide-react";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatTimestamp, toParagraphs } from "@/lib/transcript/store";
import type { TranscriptSegment } from "@/lib/transcript/types";
import { cn } from "@/lib/utils";
import { useConsole } from "./ConsoleContext";
import { LevelMeter } from "./ListeningPill";

const Paragraph = memo(function Paragraph({
  segs,
  evidence,
  flash,
  fresh,
  interim,
}: {
  segs: TranscriptSegment[];
  evidence: Set<string>;
  flash: Set<string>;
  fresh: Set<string>;
  interim?: string;
}) {
  const marked = segs.some((s) => s.marked);
  return (
    <div className="group relative" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 120px" }}>
      <div className="absolute -left-[76px] top-[5px] flex w-[60px] items-center justify-end gap-1.5 text-mono-sm">
        {marked ? <Pin className="size-3.5 text-ink-muted" strokeWidth={1.5} aria-label="Marked moment" /> : null}
        <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">{formatTimestamp(segs[0].startMs)}</span>
      </div>
      <p className="text-[17px] leading-[1.65] text-ink">
        {segs.map((s) => (
          <span
            key={s.id}
            data-seg-id={s.id}
            className={cn(
              "rounded-[3px] transition-colors duration-300",
              fresh.has(s.id) && "ciac-ink-in",
              s.marked && "bg-ink/[0.045]",
              evidence.has(s.id) && "underline decoration-signal/60 decoration-[1.5px] underline-offset-[5px]",
              flash.has(s.id) && "bg-signal-tint",
            )}
          >
            {s.text}{" "}
          </span>
        ))}
        {interim ? (
          <span className="text-ink-muted" data-testid="interim">
            {interim}
          </span>
        ) : null}
      </p>
    </div>
  );
});

export function TranscriptView() {
  const segments = useConsole((s) => s.session.segments);
  const interim = useConsole((s) => s.interim);
  const status = useConsole((s) => s.session.status);
  const kind = useConsole((s) => s.session.source.kind);
  const level = useConsole((s) => s.level);
  const suggestions = useConsole((s) => s.session.suggestions);
  const scrollTarget = useConsole((s) => s.scrollTarget);
  const sourceMessage = useConsole((s) => s.sourceMessage);
  const sourceStatus = useConsole((s) => s.sourceStatus);

  const scroller = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  const followRef = useRef(true);
  const [initialIds] = useState(() => new Set(segments.map((s) => s.id)));
  const [flash, setFlash] = useState<Set<string>>(new Set());

  const paragraphs = useMemo(() => toParagraphs(segments), [segments]);
  const evidence = useMemo(
    () => new Set(suggestions.filter((s) => s.status !== "dismissed").flatMap((s) => s.evidenceSegmentIds)),
    [suggestions],
  );
  const fresh = useMemo(() => new Set(segments.filter((s) => !initialIds.has(s.id)).map((s) => s.id)), [segments, initialIds]);

  // Pinned to the bottom while following.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && followRef.current) el.scrollTop = el.scrollHeight;
  }, [segments.length, interim]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom !== followRef.current) {
      followRef.current = atBottom;
      setFollow(atBottom);
    }
  };

  const jumpToLive = () => {
    followRef.current = true;
    setFollow(true);
    const el = scroller.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // Quote click → scroll to the evidence lines and flash them briefly.
  useEffect(() => {
    if (!scrollTarget || !scrollTarget.ids.length) return;
    const el = scroller.current?.querySelector(`[data-seg-id="${scrollTarget.ids[0]}"]`);
    if (!el) return;
    followRef.current = false;
    setFollow(false);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlash(new Set(scrollTarget.ids));
    const t = setTimeout(() => setFlash(new Set()), 1800);
    return () => clearTimeout(t);
  }, [scrollTarget]);

  const empty = segments.length === 0 && !interim;
  const live = status === "live";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto" data-testid="transcript" aria-live="off">
        <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-[92px] pb-[30vh] pt-12">
          {empty ? (
            <div className="flex flex-col items-start gap-3 pt-[12vh] text-ink-muted">
              {sourceStatus === "error" && sourceMessage ? (
                <p role="alert" className="text-[15px] text-danger">
                  {sourceMessage}
                </p>
              ) : status === "ready" ? (
                <p className="text-[17px]">Ready when you are. Press Start to begin.</p>
              ) : (
                <>
                  <LevelMeter level={kind === "mic" ? level : undefined} active={live} className={live ? "text-live" : "text-ink-muted/60"} />
                  <p className="text-[17px]">{live ? "Listening. Your conversation will appear here." : "Paused. Resume to keep transcribing."}</p>
                </>
              )}
            </div>
          ) : (
            paragraphs.map((p, i) => (
              <Paragraph
                key={p[0].id}
                segs={p}
                evidence={evidence}
                flash={flash}
                fresh={fresh}
                interim={i === paragraphs.length - 1 ? interim : undefined}
              />
            ))
          )}
          {paragraphs.length === 0 && interim ? (
            <p className="text-[17px] leading-[1.65] text-ink-muted" data-testid="interim">
              {interim}
            </p>
          ) : null}
          {segments.length > 0 && sourceStatus === "error" && sourceMessage ? (
            <p role="alert" className="text-[14px] text-danger">
              {sourceMessage}
            </p>
          ) : null}
        </div>
      </div>
      {!follow && !empty ? (
        <Button
          variant="outline"
          size="sm"
          onClick={jumpToLive}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-surface"
          data-testid="jump-to-live"
        >
          <ArrowDown strokeWidth={1.5} /> Jump to live
        </Button>
      ) : null}
    </div>
  );
}
