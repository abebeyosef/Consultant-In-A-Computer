"use client";

import { ArrowLeft, Quote } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spark } from "@/components/common/Spark";
import { Kbd } from "@/components/common/Kbd";
import { Button } from "@/components/ui/button";
import type { ExElement } from "@/lib/board/excalidraw";
import {
  type El,
  acceptElements,
  clearProvisional,
  detectEdited,
  isAiSticky,
  provisionalIds,
  recordPlacement,
  stickyFor,
} from "@/lib/board/provisional";
import type { StoredBoard } from "@/lib/board/store";
import { cn } from "@/lib/utils";
import { type AppState, ExcalidrawCanvas, type ExcalidrawImperativeAPI } from "./ExcalidrawCanvas";
import { ProvisionalBar } from "./ProvisionalBar";

type Popover = { id: string; quote: string; x: number; y: number } | null;

const STAGGER_MS = 40;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function sceneHash(elements: readonly ExElement[]) {
  let h = elements.length;
  for (const e of elements) h = (h * 31 + (e.version ?? 0) + (e.isDeleted ? 7 : 0)) | 0;
  return h;
}

export type BoardPanelProps = {
  board: StoredBoard;
  /** play the one-by-one arrival of AI items (only for freshly created boards) */
  animateIn?: boolean;
  /** fill from the transcript as soon as the board opens (⌘K) */
  autoFill?: boolean;
  onBoardChange: (board: StoredBoard) => void;
  onClose?: () => void;
  /** Re-fill: parent fetches a new fill and returns the merged board */
  onRefill?: (board: StoredBoard) => Promise<StoredBoard | null>;
  onShowQuote?: (quote: string) => void;
  /** extra controls on the right of the board header (Send to room, switcher…) */
  headerRight?: React.ReactNode;
  headerLeft?: React.ReactNode;
  /** live viewport/scene updates (room view follows pan & zoom) */
  onViewport?: (v: { scrollX: number; scrollY: number; zoom: number; width: number; height: number }) => void;
  onApiReady?: (api: ExcalidrawImperativeAPI) => void;
  className?: string;
};

export function BoardPanel({
  board,
  animateIn,
  autoFill,
  onBoardChange,
  onClose,
  onRefill,
  onShowQuote,
  headerRight,
  headerLeft,
  onViewport,
  onApiReady,
  className,
}: BoardPanelProps) {
  const { resolvedTheme } = useTheme();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const boardRef = useRef(board);
  const placementRef = useRef(board.placement);
  const lastHash = useRef<number>(0);
  const pendingCheck = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staggering = useRef(false);
  const [provisionalCount, setProvisionalCount] = useState(() => provisionalIds(board.elements as El[]).length);
  const [aiTotal, setAiTotal] = useState(() => board.elements.filter((e) => isAiSticky(e as El)).length);
  const [popover, setPopover] = useState<Popover>(null);
  const [refilling, setRefilling] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const autoFilled = useRef(false);

  // Initial elements: when animating in, start with structure only.
  const { initial, queued } = useMemo(() => {
    const els = board.elements;
    if (!animateIn || prefersReducedMotion()) return { initial: els, queued: [] as ExElement[][] };
    const aiIds = new Set(els.filter((e) => isAiSticky(e as El)).map((e) => e.id));
    const isAi = (e: ExElement) => aiIds.has(e.id) || (!!e.containerId && aiIds.has(e.containerId));
    const groups = els
      .filter((e) => aiIds.has(e.id))
      .map((c) => els.filter((e) => e.id === c.id || e.containerId === c.id));
    return { initial: els.filter((e) => !isAi(e)), queued: groups };
    // board identity is the key; we intentionally compute once per board
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const persist = useCallback(
    (elements: readonly ExElement[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const next: StoredBoard = {
          ...boardRef.current,
          elements: elements.filter((e) => !e.isDeleted).map((e) => ({ ...e })),
          placement: placementRef.current,
          updatedAt: Date.now(),
        };
        boardRef.current = next;
        onBoardChange(next);
      }, 350);
    },
    [onBoardChange],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const fit = useCallback((animate = false) => {
    const api = apiRef.current;
    if (!api) return;
    const els = api.getSceneElements();
    if (!els.length) return;
    api.scrollToContent(els, { fitToViewport: true, viewportZoomFactor: 0.84, animate });
  }, []);

  const runStagger = useCallback(async () => {
    const api = apiRef.current;
    if (!api || queued.length === 0) return;
    staggering.current = true;
    const { CaptureUpdateAction } = await import("@excalidraw/excalidraw");
    for (const group of queued) {
      await new Promise((r) => setTimeout(r, STAGGER_MS));
      const current = api.getSceneElementsIncludingDeleted();
      const have = new Set(current.map((e) => e.id));
      const add = group.filter((e) => !have.has(e.id));
      if (add.length === 0) continue; // already added (e.g. StrictMode double-mount)
      api.updateScene({ elements: [...current, ...(add as never[])], captureUpdate: CaptureUpdateAction.NEVER });
    }
    staggering.current = false;
  }, [queued]);

  const handleApi = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      if (apiRef.current === api) return;
      apiRef.current = api;
      setApiReady(true);
      // test/debug hook (used by Playwright to locate elements on the canvas)
      (window as unknown as { __ciacBoardApi?: ExcalidrawImperativeAPI }).__ciacBoardApi = api;
      onApiReady?.(api);
      // Let Excalidraw measure its container before fitting.
      requestAnimationFrame(() =>
        setTimeout(() => {
          fit(false);
          void runStagger();
        }, 60),
      );
    },
    [fit, runStagger, onApiReady],
  );

  const updatePopover = useCallback((elements: readonly ExElement[], appState: AppState) => {
    const sel = Object.keys(appState.selectedElementIds ?? {});
    const busy = appState.selectedElementsAreBeingDragged || appState.isResizing || appState.editingTextElement;
    if (busy || sel.length === 0 || sel.length > 2) {
      setPopover((p) => (p ? null : p));
      return;
    }
    const first = elements.find((e) => e.id === sel[0]);
    const sticky = stickyFor(elements as readonly El[], first as El | undefined);
    if (!sticky || !isAiSticky(sticky) || (sel.length === 2 && !sel.includes(sticky.id))) {
      setPopover((p) => (p ? null : p));
      return;
    }
    const quote = String(sticky.customData?.sourceQuote ?? "");
    if (!quote) {
      setPopover((p) => (p ? null : p));
      return;
    }
    const zoom = appState.zoom.value;
    const x = (sticky.x + sticky.width / 2 + appState.scrollX) * zoom;
    const y = (sticky.y + sticky.height + appState.scrollY) * zoom + 10;
    setPopover((p) =>
      p && p.id === sticky.id && Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5 ? p : { id: sticky.id, quote, x, y },
    );
  }, []);

  const handleChange = useCallback(
    (elements: readonly ExElement[], appState: AppState) => {
      updatePopover(elements, appState);
      onViewport?.({
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom.value,
        width: appState.width,
        height: appState.height,
      });
      const h = sceneHash(elements);
      const busy =
        appState.selectedElementsAreBeingDragged || appState.isResizing || appState.editingTextElement || appState.newElement;
      if (h === lastHash.current && !pendingCheck.current) return;
      if (busy || staggering.current) {
        // re-check once the gesture ends (the final onChange may not bump versions)
        pendingCheck.current = h !== lastHash.current || pendingCheck.current;
        lastHash.current = h;
        return;
      }
      lastHash.current = h;
      pendingCheck.current = false;

      const edited = detectEdited(elements as readonly El[], placementRef.current);
      if (edited.length) {
        const api = apiRef.current;
        const next = acceptElements(elements as ExElement[], edited);
        void import("@excalidraw/excalidraw").then(({ CaptureUpdateAction }) => {
          api?.updateScene({ elements: next as never, captureUpdate: CaptureUpdateAction.EVENTUALLY });
        });
        return; // the update triggers another onChange which persists
      }
      setProvisionalCount(provisionalIds(elements as readonly El[]).length);
      setAiTotal(elements.filter((e) => isAiSticky(e as El)).length);
      persist(elements);
    },
    [persist, updatePopover, onViewport],
  );

  const keepAll = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const { CaptureUpdateAction } = await import("@excalidraw/excalidraw");
    const els = api.getSceneElementsIncludingDeleted() as unknown as ExElement[];
    api.updateScene({ elements: acceptElements(els, provisionalIds(els as El[])) as never, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  }, []);

  const clearAi = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    const { CaptureUpdateAction } = await import("@excalidraw/excalidraw");
    const els = api.getSceneElementsIncludingDeleted() as unknown as ExElement[];
    api.updateScene({ elements: clearProvisional(els) as never, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
  }, []);

  const refill = useCallback(async () => {
    const api = apiRef.current;
    if (!api || !onRefill) return;
    setRefilling(true);
    try {
      const current: StoredBoard = {
        ...boardRef.current,
        elements: (api.getSceneElements() as unknown as ExElement[]).map((e) => ({ ...e })),
        placement: placementRef.current,
      };
      const merged = await onRefill(current);
      if (!merged) return;
      placementRef.current = recordPlacement(merged.elements as El[], merged.placement);
      boardRef.current = { ...merged, placement: placementRef.current };
      const { CaptureUpdateAction } = await import("@excalidraw/excalidraw");
      api.updateScene({ elements: merged.elements as never, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
    } finally {
      setRefilling(false);
    }
  }, [onRefill]);

  // ⌘K boards: fill from the transcript as soon as the canvas is ready.
  useEffect(() => {
    if (!autoFill || !apiReady || autoFilled.current) return;
    const t = setTimeout(() => {
      autoFilled.current = true;
      void refill();
    }, 120);
    return () => clearTimeout(t);
  }, [autoFill, apiReady, refill]);

  // Esc returns to the transcript — but only when Excalidraw has nothing to cancel.
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // App dialogs (⌘K etc.) own Esc; Excalidraw's hidden style panel also renders role=dialog pickers, ignore those.
      const appDialog = [...document.querySelectorAll("[role=dialog]")].some((d) => !d.closest(".excalidraw"));
      if (appDialog) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) return;
      const api = apiRef.current;
      const st = api?.getAppState();
      if (api && st) {
        if (st.editingTextElement || st.newElement || st.openMenu || st.openPopup || st.openDialog) return;
        if (st.activeTool?.type && st.activeTool.type !== "selection") return; // Excalidraw resets the tool
        if (Object.keys(st.selectedElementIds ?? {}).length > 0) {
          // First Esc deselects; the next one goes back to the transcript.
          e.preventDefault();
          e.stopPropagation();
          api.updateScene({ appState: { selectedElementIds: {}, selectedGroupIds: {} } as never });
          return;
        }
      }
      onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <section className={cn("relative flex h-full min-h-0 flex-col", className)} aria-label={`${board.title} board`} data-testid="board-panel">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-hairline px-3">
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-ink-muted" aria-label="Back to transcript">
            <ArrowLeft strokeWidth={1.5} />
            <span>Transcript</span>
            <Kbd className="ml-0.5">Esc</Kbd>
          </Button>
        ) : null}
        {headerLeft}
        <h2 className="truncate px-1 text-[14px] font-semibold" data-testid="board-title">
          {board.title}
        </h2>
        <div className="ml-auto flex items-center gap-2">{headerRight}</div>
      </header>
      <div className="relative min-h-0 flex-1">
        <ExcalidrawCanvas key={board.id} initialElements={initial} theme={theme} onApi={handleApi} onChange={handleChange} />
        {popover ? (
          <div
            role="note"
            data-testid="source-popover"
            className="pointer-events-auto absolute z-10 w-[300px] -translate-x-1/2 rounded-[12px] border border-hairline bg-surface p-3 text-[13px]"
            style={{ left: popover.x, top: popover.y }}
          >
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] text-ink-muted">
              <Spark size={11} /> From the transcript
            </div>
            <p className="italic leading-[1.5] text-ink">&ldquo;{popover.quote}&rdquo;</p>
            {onShowQuote ? (
              <Button
                variant="link"
                size="xs"
                className="mt-1 h-auto px-0 text-[12px]"
                onClick={() => onShowQuote(popover.quote)}
              >
                <Quote strokeWidth={1.5} /> Show in transcript
              </Button>
            ) : null}
          </div>
        ) : null}
        <ProvisionalBar
          count={provisionalCount}
          onKeepAll={keepAll}
          onClear={clearAi}
          onRefill={onRefill ? refill : undefined}
          refilling={refilling}
          emptyOfAi={aiTotal === 0}
        />
      </div>
    </section>
  );
}
