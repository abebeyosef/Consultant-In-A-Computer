/**
 * Console ↔ room view sync over BroadcastChannel (same browser, same origin).
 * The console is the source of truth; the room asks for a snapshot on load.
 */
import { acceptedOnly } from "@/lib/board/provisional";
import type { ExElement } from "@/lib/board/excalidraw";

export type RoomViewport = { scrollX: number; scrollY: number; zoom: number; width: number; height: number };

export type RoomBoard = { id: string; title: string; elements: ExElement[] };

export type RoomHold = { sessionName: string; listening: boolean };

export type RoomSnapshot = {
  hold: RoomHold;
  board: RoomBoard | null;
  viewport: RoomViewport | null;
  blank: boolean;
  captions: { on: boolean; text: string };
};

/** console → room */
export type ToRoom =
  | { type: "ping" }
  | { type: "snapshot"; snapshot: RoomSnapshot }
  | { type: "hold"; hold: RoomHold }
  | { type: "board"; board: RoomBoard | null }
  | { type: "viewport"; viewport: RoomViewport }
  | { type: "blank"; on: boolean }
  | { type: "captions"; on: boolean; text: string };

/** room → console */
export type FromRoom = { type: "hello" } | { type: "bye" };

export type RoomMessage = ({ dir: "toRoom" } & ToRoom) | ({ dir: "fromRoom" } & FromRoom);

export const channelName = (sessionId: string) => `ciac-room-${sessionId}`;
export const roomUrl = (sessionId: string) => `/room?s=${encodeURIComponent(sessionId)}`;
export const roomWindowName = (sessionId: string) => `ciac-room-${sessionId}`;

export function openChannel(sessionId: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(channelName(sessionId));
}

/** What the room may see of a board: accepted items only, no ghost labels. */
export function toRoomBoard(board: { id: string; title: string; elements: readonly ExElement[] }): RoomBoard {
  return { id: board.id, title: board.title, elements: acceptedOnly(board.elements).map((e) => ({ ...e })) };
}

export type Rect = { x: number; y: number; width: number; height: number };

/** Scene-space bounding box of some elements (null if none). */
export function contentBounds(elements: readonly { x: number; y: number; width: number; height: number; isDeleted?: boolean }[]): Rect | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of elements) {
    if (e.isDeleted) continue;
    x0 = Math.min(x0, e.x, e.x + e.width);
    y0 = Math.min(y0, e.y, e.y + e.height);
    x1 = Math.max(x1, e.x, e.x + e.width);
    y1 = Math.max(y1, e.y, e.y + e.height);
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : null;
}

/**
 * Map the facilitator's visible scene rectangle onto the room's viewport, so
 * the room shows the same area (letterboxed) at whatever size it is.
 * If `content` is given, the visible rectangle is first clipped to it (plus a
 * small margin): a zoomed-out console doesn't waste projector space on empty
 * canvas, while zooming in on a corner is still followed exactly.
 * Excalidraw: screen = (scene + scroll) * zoom.
 */
export function followViewport(
  src: RoomViewport,
  dst: { width: number; height: number },
  content: Rect | null = null,
  limits = { min: 0.1, max: 4 },
): { scrollX: number; scrollY: number; zoom: number } {
  let x0 = -src.scrollX;
  let y0 = -src.scrollY;
  let x1 = x0 + src.width / src.zoom;
  let y1 = y0 + src.height / src.zoom;
  if (content) {
    const m = Math.max(content.width, content.height) * 0.03;
    const cx0 = Math.max(x0, content.x - m);
    const cy0 = Math.max(y0, content.y - m);
    const cx1 = Math.min(x1, content.x + content.width + m);
    const cy1 = Math.min(y1, content.y + content.height + m);
    if (cx1 - cx0 > 1 && cy1 - cy0 > 1) [x0, y0, x1, y1] = [cx0, cy0, cx1, cy1];
  }
  const w = x1 - x0;
  const h = y1 - y0;
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const raw = Math.min(dst.width / Math.max(w, 1), dst.height / Math.max(h, 1));
  const zoom = Math.min(limits.max, Math.max(limits.min, raw));
  return { scrollX: dst.width / (2 * zoom) - cx, scrollY: dst.height / (2 * zoom) - cy, zoom };
}

/** Last couple of sentences for the caption band (final text + interim), trimmed from the left. */
export function captionText(finals: readonly string[], interim: string, maxChars = 160): string {
  const tail = [...finals.slice(-3), interim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (tail.length <= maxChars) return tail;
  const cut = tail.slice(tail.length - maxChars);
  const sp = cut.indexOf(" ");
  return `…${sp >= 0 ? cut.slice(sp + 1) : cut}`;
}
