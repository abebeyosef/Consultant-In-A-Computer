"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { type StoredBoard, loadBoard } from "@/lib/board/store";
import { isTypingTarget } from "@/lib/keyboard";
import {
  type RoomMessage,
  type RoomSnapshot,
  type RoomViewport,
  type ToRoom,
  captionText,
  openChannel,
  roomUrl,
  roomWindowName,
  toRoomBoard,
} from "@/lib/room/bridge";
import type { ConsoleStore } from "@/lib/session/consoleStore";

export type RoomBridge = {
  /** a room window has said hello and not bye */
  connected: boolean;
  roomBoardId: string | null;
  blank: boolean;
  captions: boolean;
  /** captions are offered in Room mode only */
  captionsAvailable: boolean;
  openWindow(): void;
  send(board: StoredBoard): void;
  stopShowing(): void;
  toggleBlank(): void;
  toggleCaptions(): void;
  /** called by the board host on every save */
  boardSaved(board: StoredBoard): void;
  /** called by the board host on pan/zoom */
  viewport(boardId: string, v: RoomViewport): void;
};

export const RoomContext = createContext<RoomBridge | null>(null);
export const useRoom = () => useContext(RoomContext);

export function useRoomBridge(store: ConsoleStore): RoomBridge {
  const sessionId = store.getState().session.id;
  const chan = useRef<BroadcastChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomBoardId, setRoomBoardId] = useState<string | null>(() => store.getState().session.roomBoardId ?? null);
  const [blank, setBlank] = useState(false);
  const [captions, setCaptions] = useState(false);
  const captionsAvailable = store.getState().session.mode === "room";
  const viewports = useRef(new Map<string, RoomViewport>());
  const state = useRef({ roomBoardId, blank, captions });
  useEffect(() => {
    state.current = { roomBoardId, blank, captions };
  }, [roomBoardId, blank, captions]);

  const post = useCallback((m: ToRoom) => {
    chan.current?.postMessage({ dir: "toRoom", ...m } satisfies RoomMessage);
  }, []);

  const hold = useCallback(() => {
    const s = store.getState().session;
    return { sessionName: s.name, listening: s.status === "live" };
  }, [store]);

  const captionNow = useCallback(() => {
    const st = store.getState();
    return captionText(
      st.session.segments.slice(-3).map((s) => s.text),
      st.interim,
    );
  }, [store]);

  const snapshot = useCallback((): RoomSnapshot => {
    const { roomBoardId: id, blank: b, captions: c } = state.current;
    const board = id ? loadBoard(id) : null;
    return {
      hold: hold(),
      board: board ? toRoomBoard(board) : null,
      viewport: id ? viewports.current.get(id) ?? null : null,
      blank: b,
      captions: { on: c, text: c ? captionNow() : "" },
    };
  }, [hold, captionNow]);

  // Channel lifetime.
  useEffect(() => {
    const ch = openChannel(sessionId);
    chan.current = ch;
    if (!ch) return;
    ch.onmessage = (ev: MessageEvent<RoomMessage>) => {
      const m = ev.data;
      if (!m || m.dir !== "fromRoom") return;
      if (m.type === "hello") {
        setConnected(true);
        post({ type: "snapshot", snapshot: snapshot() });
      } else if (m.type === "bye") {
        setConnected(false);
      }
    };
    // A room window left open from before a reload says hello again on this ping.
    post({ type: "ping" });
    return () => {
      ch.close();
      chan.current = null;
    };
  }, [sessionId, post, snapshot]);

  // Holding screen: name + listening state.
  useEffect(
    () =>
      store.subscribe((st, prev) => {
        if (st.session.name !== prev.session.name || st.session.status !== prev.session.status) post({ type: "hold", hold: hold() });
      }),
    [store, post, hold],
  );

  // Caption band (Room mode only), throttled.
  useEffect(() => {
    if (!captions) return;
    let last = "";
    let t: ReturnType<typeof setTimeout> | null = null;
    const push = () => {
      t = null;
      const text = captionNow();
      if (text !== last) {
        last = text;
        post({ type: "captions", on: true, text });
      }
    };
    push();
    const unsub = store.subscribe((st, prev) => {
      if (st.interim === prev.interim && st.session.segments === prev.session.segments) return;
      t ??= setTimeout(push, 200);
    });
    return () => {
      unsub();
      if (t) clearTimeout(t);
    };
  }, [captions, store, post, captionNow]);

  const openWindow = useCallback(() => {
    const w = window.open(roomUrl(sessionId), roomWindowName(sessionId), "popup=yes,width=1280,height=760");
    w?.focus();
  }, [sessionId]);

  const send = useCallback(
    (board: StoredBoard) => {
      setRoomBoardId(board.id);
      state.current.roomBoardId = board.id;
      store.getState().setRoomBoard(board.id);
      post({ type: "board", board: toRoomBoard(board) });
      const v = viewports.current.get(board.id);
      if (v) post({ type: "viewport", viewport: v });
      if (state.current.blank) {
        setBlank(false);
        post({ type: "blank", on: false });
      }
      if (!connected) openWindow();
    },
    [store, post, connected, openWindow],
  );

  const stopShowing = useCallback(() => {
    setRoomBoardId(null);
    state.current.roomBoardId = null;
    store.getState().setRoomBoard(null);
    post({ type: "board", board: null });
  }, [store, post]);

  const toggleBlank = useCallback(() => {
    const on = !state.current.blank;
    setBlank(on);
    post({ type: "blank", on });
  }, [post]);

  const toggleCaptions = useCallback(() => {
    if (!captionsAvailable) return;
    const on = !state.current.captions;
    setCaptions(on);
    if (!on) post({ type: "captions", on: false, text: "" });
  }, [captionsAvailable, post]);

  const boardSaved = useCallback(
    (board: StoredBoard) => {
      if (state.current.roomBoardId === board.id) post({ type: "board", board: toRoomBoard(board) });
    },
    [post],
  );

  const raf = useRef<number | null>(null);
  const pendingVp = useRef<RoomViewport | null>(null);
  const viewport = useCallback(
    (boardId: string, v: RoomViewport) => {
      viewports.current.set(boardId, v);
      if (state.current.roomBoardId !== boardId) return;
      pendingVp.current = v;
      raf.current ??= requestAnimationFrame(() => {
        raf.current = null;
        if (pendingVp.current) post({ type: "viewport", viewport: pendingVp.current });
      });
    },
    [post],
  );

  // B blanks the room; J toggles captions (Room mode). Both work over the board too
  // (Excalidraw doesn't bind either key), but stand down while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e)) return;
      if (document.querySelector("[role=dialog]:not(.excalidraw [role=dialog])")) return;
      const k = e.key.toLowerCase();
      if (k === "b") {
        e.preventDefault();
        toggleBlank();
      } else if (k === "j" && captionsAvailable) {
        e.preventDefault();
        toggleCaptions();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleBlank, toggleCaptions, captionsAvailable]);

  return useMemo(
    () => ({
      connected,
      roomBoardId,
      blank,
      captions,
      captionsAvailable,
      openWindow,
      send,
      stopShowing,
      toggleBlank,
      toggleCaptions,
      boardSaved,
      viewport,
    }),
    [connected, roomBoardId, blank, captions, captionsAvailable, openWindow, send, stopShowing, toggleBlank, toggleCaptions, boardSaved, viewport],
  );
}
