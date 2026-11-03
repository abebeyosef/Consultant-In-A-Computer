import { createStore } from "zustand/vanilla";
import { appendFinal, markRecent } from "@/lib/transcript/store";
import type { SourceStatus } from "@/lib/transcript/types";
import { saveSession } from "./storage";
import type { Session, Suggestion } from "./types";

export type ConsoleView = { kind: "transcript" } | { kind: "board"; boardId: string; animateIn?: boolean };

export type ConsoleState = {
  session: Session;
  interim: string;
  sourceStatus: SourceStatus;
  sourceMessage?: string;
  level: number;
  clockMs: number;
  view: ConsoleView;
  focus: boolean;
  /** segment id to scroll to + flash (quote click) */
  scrollTarget: { ids: string[]; nonce: number } | null;
  engineMode: "live" | "mock" | "unknown";
  /** seconds counter while waiting for a fill the user asked to open */
  waitingFor: { suggestionId: string; since: number } | null;
};

export type ConsoleActions = {
  setInterim(text: string): void;
  addFinal(text: string, startMs: number, endMs: number, paragraphStart?: boolean): void;
  mark(): string[];
  setSourceStatus(s: SourceStatus, message?: string): void;
  setLevel(l: number): void;
  setClock(ms: number): void;
  setStatus(s: Session["status"]): void;
  setName(name: string): void;
  setSpeed(speed: number): void;
  addSuggestion(s: Suggestion): void;
  updateSuggestion(id: string, patch: Partial<Suggestion>): void;
  mute(frameworkId: string): void;
  addBoard(boardId: string): void;
  openBoard(boardId: string, animateIn?: boolean): void;
  closeBoard(): void;
  toggleFocus(force?: boolean): void;
  scrollTo(ids: string[]): void;
  setEngineMode(m: ConsoleState["engineMode"]): void;
  setWaiting(w: ConsoleState["waitingFor"]): void;
  setRoomBoard(id: string | null): void;
};

export type ConsoleStore = ReturnType<typeof createConsoleStore>;

export function createConsoleStore(initial: Session) {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const store = createStore<ConsoleState & ConsoleActions>()((set, get) => {
    const patchSession = (patch: Partial<Session> | ((s: Session) => Partial<Session>)) => {
      set((st) => ({ session: { ...st.session, ...(typeof patch === "function" ? patch(st.session) : patch) } }));
    };
    return {
      session: initial,
      interim: "",
      sourceStatus: "idle",
      level: 0,
      clockMs: initial.source.positionMs,
      view: { kind: "transcript" },
      focus: false,
      scrollTarget: null,
      engineMode: "unknown",
      waitingFor: null,

      setInterim: (text) => set({ interim: text }),
      addFinal: (text, startMs, endMs, paragraphStart) =>
        set((st) => ({
          interim: "",
          session: { ...st.session, segments: appendFinal(st.session.segments, text, startMs, endMs, paragraphStart) },
        })),
      mark: () => {
        const { segments, ids } = markRecent(get().session.segments, get().clockMs);
        patchSession({ segments });
        return ids;
      },
      setSourceStatus: (s, message) => set({ sourceStatus: s, sourceMessage: message }),
      setLevel: (l) => {
        if (Math.abs(get().level - l) > 0.02) set({ level: l });
      },
      setClock: (ms) =>
        set((st) => (st.clockMs === ms ? st : { clockMs: ms, session: { ...st.session, source: { ...st.session.source, positionMs: ms } } })),
      setStatus: (status) => patchSession({ status }),
      setName: (name) => patchSession({ name: name.trim() || "Untitled workshop" }),
      setSpeed: (speed) => patchSession((s) => ({ source: { ...s.source, speed } })),
      addSuggestion: (sg) => patchSession((s) => ({ suggestions: [sg, ...s.suggestions] })),
      updateSuggestion: (id, patch) =>
        patchSession((s) => ({ suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      mute: (fid) =>
        patchSession((s) => ({
          mutedFrameworkIds: s.mutedFrameworkIds.includes(fid) ? s.mutedFrameworkIds : [...s.mutedFrameworkIds, fid],
          suggestions: s.suggestions.map((x) => (x.frameworkId === fid && x.status !== "opened" ? { ...x, status: "dismissed" } : x)),
        })),
      addBoard: (bid) => patchSession((s) => ({ boardIds: s.boardIds.includes(bid) ? s.boardIds : [...s.boardIds, bid] })),
      openBoard: (boardId, animateIn) => set({ view: { kind: "board", boardId, animateIn }, focus: false }),
      closeBoard: () => set({ view: { kind: "transcript" } }),
      toggleFocus: (force) => set((st) => ({ focus: force ?? !st.focus })),
      scrollTo: (ids) => set({ scrollTarget: { ids, nonce: Date.now() }, view: { kind: "transcript" }, focus: false }),
      setEngineMode: (m) => set({ engineMode: m }),
      setWaiting: (w) => set({ waitingFor: w }),
      setRoomBoard: (id) => patchSession({ roomBoardId: id }),
    };
  });

  // Persist the session (debounced) whenever it changes.
  store.subscribe((st, prev) => {
    if (st.session === prev.session) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveSession(store.getState().session), 400);
  });
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => saveSession(store.getState().session));
  }
  return store;
}
