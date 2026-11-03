"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ExcalidrawCanvas } from "@/components/board/ExcalidrawCanvas";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { type SharedBoard, decodeShare } from "@/lib/board/share";

/** Read-only board from a share link (`/view#…`). Nothing is stored. */
export function SharedView() {
  const { resolvedTheme } = useTheme();
  const [state, setState] = useState<{ board: SharedBoard | null; ready: boolean }>({ board: null, ready: false });

  useEffect(() => {
    const read = () => setState({ board: decodeShare(window.location.hash), ready: true });
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline px-5">
        <span className="grid size-6 shrink-0 place-items-center rounded-[6px] bg-ink text-[11px] font-bold text-paper" aria-hidden>
          C
        </span>
        <h1 className="truncate text-[14px] font-semibold" data-testid="view-title">
          {state.board?.title ?? "Shared board"}
        </h1>
        <span className="text-[12px] text-ink-muted">Read-only</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <main className="min-h-0 flex-1" data-testid="view-board">
        {!state.ready ? null : state.board ? (
          <ExcalidrawCanvas initialElements={state.board.elements} theme={resolvedTheme === "dark" ? "dark" : "light"}
            viewMode
            onApi={(api) => {
              (window as unknown as { __ciacViewApi?: unknown }).__ciacViewApi = api;
            }}
          />
        ) : (
          <p className="grid h-full place-items-center text-[14px] text-ink-muted" data-testid="view-empty">
            This link doesn&apos;t contain a board. Ask for a fresh link.
          </p>
        )}
      </main>
    </div>
  );
}
