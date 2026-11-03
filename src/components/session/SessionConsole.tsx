"use client";

import { Pin } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FrameworkCommand } from "@/components/board/FrameworkCommand";
import { Button } from "@/components/ui/button";
import { getAllFrameworks } from "@/lib/frameworks/registry";
import { isFrameworkMenuKey, isInsideBoard, isTypingTarget } from "@/lib/keyboard";
import { type ConsoleStore, createConsoleStore } from "@/lib/session/consoleStore";
import { loadSession } from "@/lib/session/storage";
import { BoardHost } from "./BoardHost";
import { ConsoleContext, useConsole } from "./ConsoleContext";
import { ConsoleLayout } from "./ConsoleLayout";
import { RoomControls } from "./RoomControls";
import { FlagRail } from "./FlagRail";
import { FocusMode } from "./FocusMode";
import { ShortcutBar, type Shortcut } from "./ShortcutBar";
import { TopBar } from "./TopBar";
import { TranscriptView } from "./TranscriptView";
import { useBrain } from "./useBrain";
import { useTranscriptSource } from "./useTranscriptSource";
import { RoomContext, useRoomBridge } from "./useRoomBridge";

export function SessionConsole({ id }: { id: string }) {
  const [store, setStore] = useState<ConsoleStore | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const s = loadSession(id);
    if (!s) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
      setMissing(true);
      return;
    }
    // A reloaded live session comes back paused: the mic only resumes on a click.
    setStore(createConsoleStore(s.status === "live" ? { ...s, status: "paused" } : s));
  }, [id]);

  if (missing) {
    return (
      <div className="grid h-dvh place-items-center bg-paper text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-ink-muted">This session isn&apos;t in this browser.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Start a new session</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (!store) return <div className="h-dvh bg-paper" />;
  return (
    <ConsoleContext.Provider value={store}>
      <Console store={store} />
    </ConsoleContext.Provider>
  );
}

function Console({ store }: { store: ConsoleStore }) {
  const router = useRouter();
  const params = useSearchParams();
  const source = useTranscriptSource(store);
  const view = useConsole((s) => s.view);
  const focus = useConsole((s) => s.focus);
  const status = useConsole((s) => s.session.status);
  const sessionId = useConsole((s) => s.session.id);
  const [cmdOpen, setCmdOpen] = useState(false);
  const frameworks = useMemo(() => getAllFrameworks(), []);
  const fwMap = useMemo(() => new Map(frameworks.map((f) => [f.id, f])), [frameworks]);
  const brain = useBrain(store, frameworks, source.now);
  const room = useRoomBridge(store);
  const autoStarted = useRef(false);

  // ?start=1 → begin immediately (the click happened on the start card), then drop the flag.
  useEffect(() => {
    if (autoStarted.current) return;
    if (params.get("start") === "1" && store.getState().session.status === "ready") {
      autoStarted.current = true;
      void source.start();
      router.replace(`/session/${sessionId}`);
    }
  }, [params, store, source, router, sessionId]);

  const markMoment = useCallback(() => {
    if (store.getState().session.segments.length === 0) return;
    store.getState().mark();
    brain.checkNow("mark");
  }, [store, brain]);

  // Console shortcuts (stand down while typing or working inside the whiteboard).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (isFrameworkMenuKey(e)) {
        if (e.key === "/" && isInsideBoard(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setCmdOpen(true);
        return;
      }
      if (isTypingTarget(e) || isInsideBoard(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (k === "m") {
        e.preventDefault();
        markMoment();
      } else if (k === "f" && store.getState().view.kind === "transcript") {
        e.preventDefault();
        store.getState().toggleFocus();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [store, markMoment]);

  const roomKeys: Shortcut[] = room.connected
    ? [
        { keys: ["B"], label: room.blank ? "Unblank room" : "Blank room" },
        ...(room.captionsAvailable ? [{ keys: ["J"], label: room.captions ? "Hide captions" : "Captions" }] : []),
      ]
    : [];
  const shortcuts: Shortcut[] =
    view.kind === "board"
      ? [
          { keys: ["Esc"], label: "Back to transcript" },
          { keys: ["⌘", "K"], label: "Frameworks" },
          ...roomKeys,
        ]
      : [
          { keys: ["M"], label: "Mark moment" },
          { keys: ["F"], label: focus ? "Show transcript" : "Focus" },
          { keys: ["⌘", "K"], label: "Frameworks" },
          ...roomKeys,
        ];

  return (
    <RoomContext.Provider value={room}>
      <ConsoleLayout
        topBar={
          <TopBar
            onPause={source.pause}
            onResume={() => void source.start()}
            onStop={source.stop}
            onSpeed={source.setSpeed}
            roomControls={<RoomControls room={room} />}
          />
        }
        main={
          view.kind === "board" ? (
            <BoardHost key={view.boardId} boardId={view.boardId} animateIn={view.animateIn} autoFill={view.autoFill} onRefill={brain.refillBoard} />
          ) : focus ? (
            <FocusMode />
          ) : (
            <TranscriptView />
          )
        }
        rail={
          <FlagRail
            frameworks={fwMap}
            onOpen={brain.openSuggestion}
            onNotNow={(s) => store.getState().updateSuggestion(s.id, { status: "dismissed" })}
            onMute={(s) => store.getState().mute(s.frameworkId)}
            onQuote={(s) => store.getState().scrollTo(s.evidenceSegmentIds)}
            onSeen={(s) => s.status === "new" && store.getState().updateSuggestion(s.id, { status: "seen" })}
            onSuggest={() => brain.checkNow("manual")}
            suggesting={brain.manualBusy}
            suggestNote={brain.manualNote}
          />
        }
        footer={
          <ShortcutBar
            shortcuts={shortcuts}
            right={
              view.kind === "transcript" && status !== "ended" ? (
                <Button variant="ghost" size="xs" onClick={markMoment} className="text-ink-muted" data-testid="mark-moment">
                  <Pin strokeWidth={1.5} /> Mark moment
                </Button>
              ) : null
            }
          />
        }
      />
      <FrameworkCommand open={cmdOpen} onOpenChange={setCmdOpen} frameworks={frameworks} onSelect={(fw) => void brain.openFramework(fw)} />
    </RoomContext.Provider>
  );
}
