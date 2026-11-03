"use client";

import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI, AppState } from "@excalidraw/excalidraw/types";
import dynamic from "next/dynamic";
import { ensureAssetPath, type ExElement } from "@/lib/board/excalidraw";

ensureAssetPath();

const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-[13px] text-ink-muted" aria-busy="true">
      Loading board…
    </div>
  ),
});

export type { ExcalidrawImperativeAPI, AppState };

export const BOARD_BG = "#f8f7f3";

export function ExcalidrawCanvas({
  initialElements,
  theme,
  viewMode = false,
  room = false,
  onApi,
  onChange,
  className,
}: {
  initialElements: readonly ExElement[];
  theme: "light" | "dark";
  viewMode?: boolean;
  /** projector: no UI at all, follows the console */
  room?: boolean;
  onApi?: (api: ExcalidrawImperativeAPI) => void;
  onChange?: (elements: readonly ExElement[], appState: AppState) => void;
  className?: string;
}) {
  return (
    <div className={`ciac-board relative h-full w-full ${viewMode ? "ciac-board--view" : ""} ${room ? "ciac-board--room" : ""} ${className ?? ""}`}>
      <Excalidraw
        excalidrawAPI={onApi}
        theme={theme}
        viewModeEnabled={viewMode || room}
        zenModeEnabled={room}
        detectScroll
        initialData={{
          elements: initialElements as never,
          appState: {
            viewBackgroundColor: BOARD_BG,
            currentItemFontFamily: 2,
            currentItemRoughness: 0,
            currentItemStrokeColor: "#17191d",
            currentItemBackgroundColor: "#ffffff",
            currentItemFillStyle: "solid",
            currentItemStrokeWidth: 1,
            currentItemRoundness: "round",
            currentItemFontSize: 16,
            frameRendering: { enabled: true, name: false, outline: true, clip: true },
          },
          scrollToContent: true,
        }}
        onChange={onChange as never}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false,
          },
          tools: { image: false },
        }}
      />
    </div>
  );
}
