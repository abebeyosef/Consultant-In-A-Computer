import { readJSON, removeKey, writeJSON } from "@/lib/storage";
import { newId } from "@/lib/ids";
import { renderFramework } from "@/lib/frameworks/toSkeleton";
import type { AnyFill, FrameworkTemplate } from "@/lib/frameworks/types";
import { type ExElement, skeletonToElements } from "./excalidraw";
import { type Placement, recordPlacement } from "./provisional";

export type FillOrigin = "live" | "mock" | "sample" | "none";

export type StoredBoard = {
  id: string;
  sessionId: string;
  frameworkId: string;
  title: string;
  elements: ExElement[];
  placement: Placement;
  suggestionId?: string;
  fillOrigin: FillOrigin;
  /** how many fills have been merged into this board (for unique ids on re-fill) */
  fillGeneration: number;
  createdAt: number;
  updatedAt: number;
};

const key = (id: string) => `board.${id}`;
const indexKey = (sessionId: string) => `boards.${sessionId}`;

export function loadBoard(id: string): StoredBoard | null {
  return readJSON<StoredBoard | null>(key(id), null);
}

export function listBoardIds(sessionId: string): string[] {
  return readJSON<string[]>(indexKey(sessionId), []);
}

export function listBoards(sessionId: string): StoredBoard[] {
  return listBoardIds(sessionId)
    .map(loadBoard)
    .filter((b): b is StoredBoard => !!b);
}

export function saveBoard(board: StoredBoard) {
  const live = board.elements.filter((e) => !e.isDeleted);
  writeJSON(key(board.id), { ...board, elements: live, updatedAt: Date.now() });
  const ids = listBoardIds(board.sessionId);
  if (!ids.includes(board.id)) writeJSON(indexKey(board.sessionId), [...ids, board.id]);
}

export function deleteBoard(board: StoredBoard) {
  removeKey(key(board.id));
  writeJSON(
    indexKey(board.sessionId),
    listBoardIds(board.sessionId).filter((id) => id !== board.id),
  );
}

/** Build a new board from a framework and an optional fill (client only). */
export async function createBoard(opts: {
  sessionId: string;
  fw: FrameworkTemplate;
  fill: AnyFill | null;
  fillOrigin: FillOrigin;
  suggestionId?: string;
}): Promise<StoredBoard> {
  const id = newId("b");
  const sk = renderFramework(opts.fw, opts.fill, { idPrefix: id, suggestionId: opts.suggestionId });
  const elements = await skeletonToElements(sk);
  const now = Date.now();
  const board: StoredBoard = {
    id,
    sessionId: opts.sessionId,
    frameworkId: opts.fw.id,
    title: opts.fw.name,
    elements,
    placement: recordPlacement(elements),
    suggestionId: opts.suggestionId,
    fillOrigin: opts.fillOrigin,
    fillGeneration: 1,
    createdAt: now,
    updatedAt: now,
  };
  saveBoard(board);
  return board;
}
