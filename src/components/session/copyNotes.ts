import { copyText } from "@/components/board/ShareMenu";
import { loadBoard } from "@/lib/board/store";
import type { ConsoleStore } from "@/lib/session/consoleStore";
import { sessionNotes } from "@/lib/session/notes";

/** Copy the session's Markdown notes (boards with kept items, marked moments). */
export function copySessionNotes(store: ConsoleStore) {
  const st = store.getState();
  const boards = st.session.boardIds.flatMap((id) => {
    const b = loadBoard(id);
    return b ? [b] : [];
  });
  void copyText(sessionNotes(st.session, boards, st.clockMs), "Session notes copied as Markdown");
}
