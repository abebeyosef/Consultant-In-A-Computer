"use client";

import { useMemo, useState } from "react";
import { BoardPanel } from "@/components/board/BoardPanel";
import { type StoredBoard, loadBoard, saveBoard } from "@/lib/board/store";
import { matchQuoteToSegments } from "@/lib/brain/evidence";
import { useConsole, useConsoleStore } from "./ConsoleContext";

/** The board panel inside the console (takes over the transcript column). */
export function BoardHost({
  boardId,
  animateIn,
  onRefill,
  headerRight,
}: {
  boardId: string;
  animateIn?: boolean;
  onRefill?: (b: StoredBoard) => Promise<StoredBoard | null>;
  headerRight?: React.ReactNode;
}) {
  const store = useConsoleStore();
  const closeBoard = useConsole((s) => s.closeBoard);
  const [board] = useState(() => loadBoard(boardId));
  const showQuote = useMemo(
    () => (quote: string) => {
      const ids = matchQuoteToSegments(quote, store.getState().session.segments);
      if (ids.length) store.getState().scrollTo(ids);
    },
    [store],
  );
  if (!board) {
    return <p className="grid flex-1 place-items-center text-[14px] text-ink-muted">That board couldn&apos;t be found.</p>;
  }
  return (
    <BoardPanel
      board={board}
      animateIn={animateIn}
      onBoardChange={saveBoard}
      onClose={closeBoard}
      onRefill={onRefill}
      onShowQuote={showQuote}
      headerRight={headerRight}
    />
  );
}
