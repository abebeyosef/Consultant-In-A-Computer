"use client";

import { useCallback, useState } from "react";
import { createBoard, type StoredBoard } from "@/lib/board/store";
import type { FrameworkTemplate } from "@/lib/frameworks/types";
import type { ConsoleStore } from "@/lib/session/consoleStore";
import type { Suggestion } from "@/lib/session/types";

/** M4 stub — replaced by the real check/fill pipeline in M5. */
export function useBrain(store: ConsoleStore, frameworks: FrameworkTemplate[], now: () => number) {
  void now;
  const [manualBusy] = useState(false);
  const openFramework = useCallback(
    async (fw: FrameworkTemplate) => {
      const st = store.getState();
      const b = await createBoard({ sessionId: st.session.id, fw, fill: null, fillOrigin: "none" });
      st.addBoard(b.id);
      st.openBoard(b.id, true);
    },
    [store],
  );
  const openSuggestion = useCallback(
    async (s: Suggestion) => {
      const fw = frameworks.find((f) => f.id === s.frameworkId);
      if (fw) await openFramework(fw);
    },
    [frameworks, openFramework],
  );
  const checkNow = useCallback((reason: "mark" | "manual") => void reason, []);
  const refillBoard = useCallback(async (b: StoredBoard): Promise<StoredBoard | null> => (void b, null), []);
  return { openFramework, openSuggestion, checkNow, refillBoard, manualBusy, manualNote: null as string | null };
}
