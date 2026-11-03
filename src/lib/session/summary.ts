import type { Session } from "./types";

export type SessionSummary = {
  durationMs: number;
  words: number;
  flags: { raised: number; opened: number; dismissed: number; manual: number };
  boards: { id: string; title: string }[];
  markedMoments: number;
};

/** Pure: what happened in a session (board titles are looked up by the caller). */
export function summarise(session: Session, clockMs: number, titleFor: (boardId: string) => string | null): SessionSummary {
  const words = session.segments.reduce((n, s) => n + (s.text.trim() ? s.text.trim().split(/\s+/).length : 0), 0);
  const sg = session.suggestions;
  // consecutive marked segments count as one moment
  let markedMoments = 0;
  let prev = false;
  for (const s of session.segments) {
    if (s.marked && !prev) markedMoments++;
    prev = !!s.marked;
  }
  return {
    durationMs: clockMs,
    words,
    flags: {
      raised: sg.length,
      opened: sg.filter((s) => s.status === "opened").length,
      dismissed: sg.filter((s) => s.status === "dismissed").length,
      manual: sg.filter((s) => s.manual).length,
    },
    boards: session.boardIds.flatMap((id) => {
      const title = titleFor(id);
      return title ? [{ id, title }] : [];
    }),
    markedMoments,
  };
}
