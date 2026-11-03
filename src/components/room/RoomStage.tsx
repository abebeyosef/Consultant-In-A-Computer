"use client";

import { Moon, Sun } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExcalidrawCanvas, type ExcalidrawImperativeAPI } from "@/components/board/ExcalidrawCanvas";
import { LevelMeter } from "@/components/session/ListeningPill";
import { loadBoard } from "@/lib/board/store";
import {
  type RoomBoard,
  type RoomHold,
  type RoomMessage,
  type RoomViewport,
  contentBounds,
  followViewport,
  openChannel,
  toRoomBoard,
} from "@/lib/room/bridge";
import { loadSession } from "@/lib/session/storage";
import { cn } from "@/lib/utils";
import { CaptionBand } from "./CaptionBand";

/**
 * The projector window. Light by default ("dim room" switches to the dark
 * palette). Shows a calm holding screen until the facilitator sends a board,
 * then only that board's accepted items, following the facilitator's pan/zoom.
 */
export function RoomStage() {
  const params = useSearchParams();
  const sessionId = params.get("s") ?? "";
  const [hold, setHold] = useState<RoomHold>({ sessionName: "", listening: false });
  const [board, setBoard] = useState<RoomBoard | null>(null);
  const [blank, setBlank] = useState(false);
  const [captions, setCaptions] = useState<{ on: boolean; text: string }>({ on: false, text: "" });
  const [dim, setDim] = useState(false);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const viewportRef = useRef<RoomViewport | null>(null);
  const boardRef = useRef<RoomBoard | null>(null);

  // Before the console answers, show what's in storage (same browser).
  useEffect(() => {
    if (!sessionId) return;
    const s = loadSession(sessionId);
    if (!s) return;
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage is only readable after mount */
    setHold({ sessionName: s.name, listening: false });
    const b = s.roomBoardId ? loadBoard(s.roomBoardId) : null;
    if (b) setBoard(toRoomBoard(b));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sessionId]);

  const applyViewport = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const v = viewportRef.current;
    if (!v) {
      const els = api.getSceneElements();
      if (els.length) api.scrollToContent(els, { fitToViewport: true, viewportZoomFactor: 0.9, animate: false });
      return;
    }
    const st = api.getAppState();
    const next = followViewport(v, { width: st.width, height: st.height }, contentBounds(api.getSceneElements()));
    api.updateScene({ appState: { scrollX: next.scrollX, scrollY: next.scrollY, zoom: { value: next.zoom } } as never });
  }, []);

  const applyBoard = useCallback(
    (b: RoomBoard | null) => {
      const prev = boardRef.current;
      boardRef.current = b;
      setBoard(b);
      const api = apiRef.current;
      if (!api || !b) return;
      if (prev && prev.id === b.id) {
        void import("@excalidraw/excalidraw").then(({ CaptureUpdateAction }) => {
          api.updateScene({ elements: b.elements as never, captureUpdate: CaptureUpdateAction.NEVER });
        });
      }
      // a different board remounts the canvas (keyed by id) and fits on API ready
    },
    [],
  );

  useEffect(() => {
    if (!sessionId) return;
    const ch = openChannel(sessionId);
    if (!ch) return;
    const hello = () => ch.postMessage({ dir: "fromRoom", type: "hello" } satisfies RoomMessage);
    ch.onmessage = (ev: MessageEvent<RoomMessage>) => {
      const m = ev.data;
      if (!m || m.dir !== "toRoom") return;
      switch (m.type) {
        case "ping":
          hello();
          break;
        case "snapshot":
          setHold(m.snapshot.hold);
          viewportRef.current = m.snapshot.viewport;
          applyBoard(m.snapshot.board);
          setBlank(m.snapshot.blank);
          setCaptions(m.snapshot.captions);
          requestAnimationFrame(applyViewport);
          break;
        case "hold":
          setHold(m.hold);
          break;
        case "board":
          if (!m.board || m.board.id !== boardRef.current?.id) viewportRef.current = null;
          applyBoard(m.board);
          break;
        case "viewport":
          viewportRef.current = m.viewport;
          applyViewport();
          break;
        case "blank":
          setBlank(m.on);
          break;
        case "captions":
          setCaptions({ on: m.on, text: m.text });
          break;
      }
    };
    hello();
    const bye = () => ch.postMessage({ dir: "fromRoom", type: "bye" } satisfies RoomMessage);
    window.addEventListener("pagehide", bye);
    return () => {
      bye();
      window.removeEventListener("pagehide", bye);
      ch.close();
    };
  }, [sessionId, applyBoard, applyViewport]);

  // Re-fit when the canvas area changes (window resize, caption band on/off).
  const boardBox = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = boardBox.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTimeout(applyViewport, 50));
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyViewport, board?.id, blank]);

  // D toggles dim room (also available as a quiet button).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey) setDim((d) => !d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onApi = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
      (window as unknown as { __ciacRoomApi?: ExcalidrawImperativeAPI }).__ciacRoomApi = api;
      requestAnimationFrame(() => setTimeout(applyViewport, 60));
    },
    [applyViewport],
  );

  return (
    <div
      data-theme={dim ? "dark" : "light"}
      className="relative h-dvh w-full overflow-hidden bg-paper text-ink"
      data-testid="room-stage"
      data-state={blank ? "blank" : board ? "board" : "hold"}
    >
      {board && !blank ? (
        <div ref={boardBox} className={cn("absolute inset-x-0 top-0", captions.on ? "bottom-[136px]" : "bottom-0")} data-testid="room-board">
          <ExcalidrawCanvas key={board.id} initialElements={board.elements} theme={dim ? "dark" : "light"} room onApi={onApi} />
        </div>
      ) : null}

      {!board && !blank ? (
        <div className="grid h-full place-items-center px-16 text-center" data-testid="room-hold">
          <div className="flex flex-col items-center gap-8">
            <h1 className="text-[56px] font-semibold leading-[1.1] tracking-[-0.02em]">{hold.sessionName || "Workshop"}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-3 rounded-full border border-hairline bg-surface px-5 py-2 text-[22px]",
                hold.listening ? "text-live" : "text-ink-muted",
              )}
            >
              <span className={cn("size-2.5 rounded-full", hold.listening ? "bg-live" : "bg-ink-muted/50")} aria-hidden />
              <span className="text-ink">{hold.listening ? "Listening" : "Paused"}</span>
              {hold.listening ? <LevelMeter active className="scale-150" /> : null}
            </span>
          </div>
        </div>
      ) : null}

      {captions.on && !blank ? <CaptionBand text={captions.text} /> : null}

      <button
        type="button"
        onClick={() => setDim((d) => !d)}
        className="absolute bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] text-ink-muted opacity-0 transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100"
        aria-label={dim ? "Light room" : "Dim room"}
        data-testid="room-dim"
      >
        {dim ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
        {dim ? "Light room" : "Dim room"}
      </button>
    </div>
  );
}
