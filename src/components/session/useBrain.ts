"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { mergeFill } from "@/lib/board/refill";
import { createBoard, saveBoard, type StoredBoard } from "@/lib/board/store";
import type { CheckRequest, CheckResult, FillResult, SegmentLite } from "@/lib/brain/schemas";
import {
  PACING,
  type PacingProfile,
  type SchedulerState,
  type Trigger,
  beginCheck,
  blockedFrameworks,
  canFlag,
  endCheck,
  initialScheduler,
  recordFlag,
  shouldCheck,
} from "@/lib/brain/scheduler";
import type { AnyFill, FrameworkTemplate } from "@/lib/frameworks/types";
import { newId } from "@/lib/ids";
import type { ConsoleStore } from "@/lib/session/consoleStore";
import type { Session, Suggestion } from "@/lib/session/types";
import { countWords, fillWindow, recentWindow, totalWords } from "@/lib/transcript/store";
import type { TranscriptSegment } from "@/lib/transcript/types";

const lite = (s: TranscriptSegment): SegmentLite => ({ id: s.id, text: s.text, startMs: s.startMs });

async function postJSON<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

function profileFor(session: Session): PacingProfile {
  return session.source.kind === "sample" ? PACING.demo : PACING.default;
}

/** Rebuild pacing memory from the session so a reload doesn't re-flag the same things. */
function schedulerFromSession(session: Session): SchedulerState {
  const st = initialScheduler();
  for (const s of [...session.suggestions].reverse()) {
    st.flaggedAt[s.frameworkId] = Math.max(st.flaggedAt[s.frameworkId] ?? 0, s.createdAt);
    if (!s.manual) st.lastAutoFlagAtMs = Math.max(st.lastAutoFlagAtMs ?? 0, s.createdAt);
  }
  st.wordsAtLastCheck = totalWords(session.segments);
  st.lastCheckAtMs = session.segments.length ? session.source.positionMs : null;
  return st;
}

export function useBrain(store: ConsoleStore, frameworks: FrameworkTemplate[], now: () => number) {
  const sched = useRef<SchedulerState>(schedulerFromSession(store.getState().session));
  const fwById = useMemo(() => new Map(frameworks.map((f) => [f.id, f])), [frameworks]);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualNote, setManualNote] = useState<string | null>(null);
  const fillsInFlight = useRef(new Set<string>());
  const scanning = useRef(false);

  const catalogue = useMemo(
    () => frameworks.map((f) => ({ id: f.id, name: f.name, whenToUse: f.whenToUse, signals: f.signals })),
    [frameworks],
  );

  // Engine status for the quiet "Offline mode" label.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((r) => r.json())
      .then((h: { mode: "live" | "mock" }) => !cancelled && store.getState().setEngineMode(h.mode))
      .catch(() => !cancelled && store.getState().setEngineMode("mock"));
    return () => {
      cancelled = true;
    };
  }, [store]);

  /* ---------------- boards ---------------- */

  const openBoardForSuggestion = useCallback(
    async (s: Suggestion, fill: AnyFill | null) => {
      const fw = fwById.get(s.frameworkId);
      if (!fw) return;
      const st = store.getState();
      const b = await createBoard({
        sessionId: st.session.id,
        fw,
        fill,
        fillOrigin: fill ? (s.fillOrigin ?? "mock") : "none",
        suggestionId: s.id,
      });
      st.addBoard(b.id);
      st.updateSuggestion(s.id, { boardId: b.id, status: "opened" });
      st.openBoard(b.id, true);
    },
    [fwById, store],
  );

  const fetchFill = useCallback(
    async (fw: FrameworkTemplate): Promise<{ fill: AnyFill | null; engine: "live" | "mock" }> => {
      const st = store.getState();
      const { window, marked } = fillWindow(st.session.segments, now());
      const res = await postJSON<FillResult>("/api/fill", { framework: fw, transcript: window.map(lite), marked: marked.map(lite) }, 60_000);
      if (res.engine === "mock" && st.engineMode === "live") st.setEngineMode("mock");
      return { fill: (res.fill as AnyFill) ?? null, engine: res.engine };
    },
    [store, now],
  );

  const startFill = useCallback(
    async (s: Suggestion) => {
      const fw = fwById.get(s.frameworkId);
      if (!fw || fillsInFlight.current.has(s.id)) return;
      fillsInFlight.current.add(s.id);
      try {
        const { fill, engine } = await fetchFill(fw);
        store.getState().updateSuggestion(s.id, { fill, fillStatus: "ready", fillOrigin: engine });
      } catch (err) {
        console.warn("[fill] failed", err);
        store.getState().updateSuggestion(s.id, { fillStatus: "error" });
      } finally {
        fillsInFlight.current.delete(s.id);
      }
      // If the facilitator is already waiting on this one, open it now.
      const st = store.getState();
      if (st.waitingFor?.suggestionId === s.id) {
        st.setWaiting(null);
        const latest = st.session.suggestions.find((x) => x.id === s.id);
        if (latest) await openBoardForSuggestion(latest, latest.fillStatus === "ready" ? (latest.fill ?? null) : null);
      }
    },
    [fwById, fetchFill, store, openBoardForSuggestion],
  );

  const openSuggestion = useCallback(
    async (s: Suggestion) => {
      const st = store.getState();
      const latest = st.session.suggestions.find((x) => x.id === s.id) ?? s;
      if (latest.boardId) {
        st.updateSuggestion(latest.id, { status: "opened" });
        st.openBoard(latest.boardId);
        return;
      }
      if (latest.fillStatus === "pending") {
        st.setWaiting({ suggestionId: latest.id, since: Date.now() });
        if (!fillsInFlight.current.has(latest.id)) void startFill(latest);
        return;
      }
      await openBoardForSuggestion(latest, latest.fillStatus === "ready" ? (latest.fill ?? null) : null);
    },
    [store, startFill, openBoardForSuggestion],
  );

  const openFramework = useCallback(
    async (fw: FrameworkTemplate) => {
      const st = store.getState();
      const b = await createBoard({ sessionId: st.session.id, fw, fill: null, fillOrigin: "none" });
      st.addBoard(b.id);
      // Pre-fill from the transcript straight away (the board shows its empty frame meanwhile).
      st.openBoard(b.id, false, st.session.segments.length > 0);
    },
    [store],
  );

  const refillBoard = useCallback(
    async (b: StoredBoard): Promise<StoredBoard | null> => {
      const fw = fwById.get(b.frameworkId);
      if (!fw) return null;
      if (store.getState().session.segments.length === 0) {
        toast("Nothing to fill from yet", { description: "Once the room has talked for a bit, re-fill will pick it up." });
        return null;
      }
      try {
        const { fill, engine } = await fetchFill(fw);
        if (!fill) return null;
        const merged = await mergeFill({ ...b, fillOrigin: engine }, fw, fill, b.suggestionId);
        saveBoard(merged);
        return merged;
      } catch (err) {
        console.warn("[refill] failed", err);
        toast.error("Couldn't re-fill the board", { description: "The board is unchanged. Try again in a moment." });
        return null;
      }
    },
    [fwById, fetchFill, store],
  );

  /* ---------------- checks ---------------- */

  const addFlag = useCallback(
    (res: CheckResult, atMs: number, manual: boolean) => {
      if (!res.frameworkId) return;
      const s: Suggestion = {
        id: newId("sg"),
        frameworkId: res.frameworkId,
        fit: res.fit === "possible" ? "possible" : "strong",
        reason: res.reason,
        evidenceQuote: res.evidenceQuote,
        evidenceSegmentIds: res.evidenceSegmentIds,
        createdAt: atMs,
        createdAtWall: Date.now(),
        status: "new",
        fillStatus: "pending",
        manual,
        fitHint: res.fitHint,
        engine: res.engine,
      };
      sched.current = recordFlag(sched.current, atMs, res.frameworkId, manual);
      store.getState().addSuggestion(s);
      void startFill(s); // pre-fill immediately so the board is ready before the click
    },
    [store, startFill],
  );

  const runCheck = useCallback(
    async (trigger: Trigger) => {
      const st = store.getState();
      const session = st.session;
      const p = profileFor(session);
      const t = now();
      const words = totalWords(session.segments);
      if (!shouldCheck(sched.current, t, words, p, trigger)) return null;
      sched.current = beginCheck(sched.current, t, words);
      const manual = trigger === "manual";
      if (manual) setManualBusy(true);
      try {
        const { window, marked } = recentWindow(session.segments, t);
        const blocked = blockedFrameworks(sched.current, t, p, session.mutedFrameworkIds);
        const req: CheckRequest = {
          window: window.map(lite),
          marked: marked.map(lite),
          catalogue: catalogue.filter((c) => !session.mutedFrameworkIds.includes(c.id)),
          recent: blocked.recent,
          muted: blocked.muted,
          manual,
        };
        const res = await postJSON<CheckResult>("/api/check", req, 25_000);
        st.setEngineMode(res.engine);
        if (res.fit !== "none" && res.frameworkId && canFlag(sched.current, t, p, res.frameworkId, manual, store.getState().session.mutedFrameworkIds)) {
          addFlag(res, t, manual);
          return res;
        }
        if (manual) {
          setManualNote("Nothing stands out yet. Keep going, or open any framework with ⌘K.");
          setTimeout(() => setManualNote(null), 6000);
        }
        return null;
      } catch (err) {
        console.warn("[check] failed", err);
        if (manual) {
          setManualNote("Couldn't check just now. Try again in a moment.");
          setTimeout(() => setManualNote(null), 6000);
        }
        return null;
      } finally {
        sched.current = endCheck(sched.current);
        if (manual) setManualBusy(false);
      }
    },
    [store, now, catalogue, addFlag],
  );

  const checkNow = useCallback(
    (trigger: "mark" | "manual") => {
      if (store.getState().session.segments.length === 0) {
        if (trigger === "manual") {
          setManualNote("Nothing to go on yet — suggestions need a little conversation first.");
          setTimeout(() => setManualNote(null), 5000);
        }
        return;
      }
      void runCheck(trigger);
    },
    [store, runCheck],
  );

  // Periodic checks while live.
  useEffect(() => {
    const t = setInterval(() => {
      const st = store.getState();
      if (st.session.status !== "live") return;
      void runCheck("tick");
    }, 1000);
    return () => clearInterval(t);
  }, [store, runCheck]);

  // Pasted transcript processed instantly: scan it in windows, as if it had played out.
  useEffect(() => {
    const unsub = store.subscribe((st) => {
      const s = st.session;
      if (scanning.current || !s.source.instant || s.status !== "ended" || s.suggestions.length || !s.segments.length) return;
      if (s.instantScanned) return;
      scanning.current = true;
      void (async () => {
        const p = PACING.scan;
        const segs = s.segments;
        let words = 0;
        let lastAt = 0;
        let checks = 0;
        for (let i = 0; i < segs.length && checks < 14; i++) {
          words += countWords(segs[i].text);
          const at = segs[i].endMs;
          const last = i === segs.length - 1;
          if (words - lastAt < 220 && !last) continue;
          lastAt = words;
          if (!canFlagAny(sched.current, at, p)) continue;
          checks++;
          const upTo = segs.slice(0, i + 1);
          const { window, marked } = recentWindow(upTo, at);
          const blocked = blockedFrameworks(sched.current, at, p, s.mutedFrameworkIds);
          try {
            const res = await postJSON<CheckResult>(
              "/api/check",
              { window: window.map(lite), marked: marked.map(lite), catalogue, recent: blocked.recent, muted: blocked.muted, manual: false },
              25_000,
            );
            store.getState().setEngineMode(res.engine);
            if (res.fit !== "none" && res.frameworkId && canFlag(sched.current, at, p, res.frameworkId, false, s.mutedFrameworkIds)) addFlag(res, at, false);
          } catch (err) {
            console.warn("[scan] check failed", err);
          }
        }
        store.getState().setInstantScanned();
        scanning.current = false;
      })();
    });
    return unsub;
  }, [store, catalogue, addFlag]);

  return { openFramework, openSuggestion, checkNow, refillBoard, manualBusy, manualNote };
}

function canFlagAny(st: SchedulerState, nowMs: number, p: PacingProfile) {
  return st.lastAutoFlagAtMs === null || nowMs - st.lastAutoFlagAtMs >= p.minGapBetweenFlagsMs;
}
