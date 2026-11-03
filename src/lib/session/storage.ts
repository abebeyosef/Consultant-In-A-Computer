import { newId } from "@/lib/ids";
import { readJSON, removeKey, writeJSON } from "@/lib/storage";
import type { Session, SessionSource } from "./types";

type IndexEntry = { id: string; name: string; startedAt: number; kind: SessionSource["kind"] };

const key = (id: string) => `session.${id}`;

export function loadSession(id: string): Session | null {
  return readJSON<Session | null>(key(id), null);
}

export function saveSession(s: Session) {
  writeJSON(key(s.id), s);
  const idx = readJSON<IndexEntry[]>("sessions", []);
  const entry: IndexEntry = { id: s.id, name: s.name, startedAt: s.startedAt, kind: s.source.kind };
  const at = idx.findIndex((e) => e.id === s.id);
  if (at === -1) writeJSON("sessions", [entry, ...idx].slice(0, 30));
  else if (idx[at].name !== s.name) {
    idx[at] = entry;
    writeJSON("sessions", idx);
  }
}

export function listSessions(): IndexEntry[] {
  return readJSON<IndexEntry[]>("sessions", []);
}

export function deleteSession(id: string) {
  removeKey(key(id));
  writeJSON(
    "sessions",
    listSessions().filter((e) => e.id !== id),
  );
}

export function createSession(opts: { name?: string; mode: Session["mode"]; source: Omit<SessionSource, "positionMs"> }): Session {
  const s: Session = {
    id: newId("ses"),
    name: opts.name?.trim() || "Untitled workshop",
    mode: opts.mode,
    startedAt: Date.now(),
    segments: [],
    suggestions: [],
    boardIds: [],
    mutedFrameworkIds: [],
    source: { ...opts.source, positionMs: 0 },
    status: "ready",
    roomBoardId: null,
  };
  saveSession(s);
  return s;
}
