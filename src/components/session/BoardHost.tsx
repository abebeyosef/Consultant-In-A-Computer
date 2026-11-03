"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { BoardPanel } from "@/components/board/BoardPanel";
import { BoardSwitcher } from "@/components/board/BoardSwitcher";
import type { ExcalidrawImperativeAPI } from "@/components/board/ExcalidrawCanvas";
import { SendToRoom } from "@/components/board/SendToRoom";
import { ShareMenu } from "@/components/board/ShareMenu";
import type { ExElement } from "@/lib/board/excalidraw";
import { type StoredBoard, loadBoard, saveBoard } from "@/lib/board/store";
import { matchQuoteToSegments } from "@/lib/brain/evidence";
import type { RoomViewport } from "@/lib/room/bridge";
import { useConsole, useConsoleStore } from "./ConsoleContext";
import { copySessionNotes } from "./copyNotes";
import { useRoom } from "./useRoomBridge";

/** The board panel inside the console (takes over the transcript column). */
export function BoardHost({
  boardId,
  animateIn,
  autoFill,
  onRefill,
}: {
  boardId: string;
  animateIn?: boolean;
  autoFill?: boolean;
  onRefill?: (b: StoredBoard) => Promise<StoredBoard | null>;
}) {
  const store = useConsoleStore();
  const room = useRoom();
  const closeBoard = useConsole((s) => s.closeBoard);
  const openBoard = useConsole((s) => s.openBoard);
  const boardIds = useConsole((s) => s.session.boardIds);
  const [board] = useState(() => loadBoard(boardId));
  const latest = useRef(board);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const getElements = useCallback(
    () => (api.current?.getSceneElements() as unknown as readonly ExElement[] | undefined) ?? latest.current?.elements ?? [],
    [],
  );
  const showQuote = useMemo(
    () => (quote: string) => {
      const ids = matchQuoteToSegments(quote, store.getState().session.segments);
      if (ids.length) store.getState().scrollTo(ids);
    },
    [store],
  );
  const onBoardChange = useCallback(
    (b: StoredBoard) => {
      latest.current = b;
      saveBoard(b);
      room?.boardSaved(b);
    },
    [room],
  );
  const onViewport = useCallback((v: RoomViewport) => room?.viewport(boardId, v), [room, boardId]);
  const refill = useMemo(
    () =>
      onRefill
        ? async (b: StoredBoard) => {
            const next = await onRefill(b);
            if (next) {
              latest.current = next;
              room?.boardSaved(next);
            }
            return next;
          }
        : undefined,
    [onRefill, room],
  );
  if (!board) {
    return <p className="grid flex-1 place-items-center text-[14px] text-ink-muted">That board couldn&apos;t be found.</p>;
  }
  return (
    <BoardPanel
      board={board}
      animateIn={animateIn}
      autoFill={autoFill}
      onBoardChange={onBoardChange}
      onClose={closeBoard}
      onRefill={refill}
      onShowQuote={showQuote}
      onViewport={onViewport}
      onApiReady={(a) => {
        api.current = a;
      }}
      headerRight={
        <>
          <ShareMenu title={board.title} getElements={getElements} onCopyNotes={() => copySessionNotes(store)} />
          <BoardSwitcher boardIds={boardIds} currentId={boardId} roomBoardId={room?.roomBoardId} onSelect={(id) => openBoard(id)} />
          {room ? <SendToRoom inRoom={room.roomBoardId === boardId} onSend={() => latest.current && room.send(latest.current)} /> : null}
        </>
      }
    />
  );
}
