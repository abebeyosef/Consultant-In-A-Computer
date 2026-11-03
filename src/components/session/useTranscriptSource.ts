"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ConsoleStore } from "@/lib/session/consoleStore";
import { BotSource } from "@/lib/transcript/sources/bot";
import { MicSource } from "@/lib/transcript/sources/mic";
import { createPasteSource } from "@/lib/transcript/sources/paste";
import { createSampleSource } from "@/lib/transcript/sources/sample";
import type { SourceEvent, TranscriptSource } from "@/lib/transcript/types";

/** Owns the active TranscriptSource and pipes its events into the console store. */
export function useTranscriptSource(store: ConsoleStore, opts: { createBotSource?: () => TranscriptSource } = {}) {
  const srcRef = useRef<TranscriptSource | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const botFactory = opts.createBotSource;

  const listener = useCallback(
    (e: SourceEvent) => {
      const st = store.getState();
      switch (e.type) {
        case "interim":
          st.setInterim(e.text);
          break;
        case "final":
          st.addFinal(e.text, e.startMs, e.endMs, e.paragraphStart);
          break;
        case "level":
          st.setLevel(e.level);
          break;
        case "status":
          st.setSourceStatus(e.status, e.message);
          if (e.status === "ended") {
            st.setInterim("");
            st.setStatus("ended");
            st.setClock(srcRef.current?.now() ?? st.clockMs);
          } else if (e.status === "error") {
            st.setStatus("paused");
          } else if (e.status === "listening") {
            st.setStatus("live");
          }
          break;
      }
    },
    [store],
  );

  const create = useCallback((): TranscriptSource => {
    const { source } = store.getState().session;
    switch (source.kind) {
      case "sample":
        return createSampleSource({ speed: source.speed ?? 1, startAtMs: source.positionMs });
      case "paste":
        return createPasteSource(source.pasteText ?? "", { speed: source.speed ?? 2, startAtMs: source.positionMs, instant: source.instant });
      case "bot":
        return botFactory ? botFactory() : new BotSource(source.meetUrl ?? "", { startAtMs: source.positionMs });
      case "mic":
      default:
        return new MicSource({ lang: source.lang ?? "en-GB", startAtMs: source.positionMs, deviceId: source.deviceId });
    }
  }, [store, botFactory]);

  const startTicking = useCallback(() => {
    if (tick.current) return;
    tick.current = setInterval(() => {
      const s = srcRef.current;
      if (s) store.getState().setClock(s.now());
    }, 250);
  }, [store]);

  const stopTicking = useCallback(() => {
    if (tick.current) clearInterval(tick.current);
    tick.current = null;
  }, []);

  const start = useCallback(async () => {
    if (srcRef.current) {
      srcRef.current.resume();
      startTicking();
      return;
    }
    const src = create();
    srcRef.current = src;
    startTicking();
    await src.start(listener);
  }, [create, listener, startTicking]);

  const pause = useCallback(() => {
    srcRef.current?.pause();
    const st = store.getState();
    st.setStatus("paused");
    st.setInterim("");
    st.setLevel(0);
    if (srcRef.current) st.setClock(srcRef.current.now());
  }, [store]);

  const stop = useCallback(() => {
    const st = store.getState();
    if (srcRef.current) st.setClock(srcRef.current.now());
    srcRef.current?.stop();
    srcRef.current = null;
    stopTicking();
    st.setStatus("ended");
    st.setSourceStatus("ended");
    st.setInterim("");
    st.setLevel(0);
  }, [store, stopTicking]);

  const setSpeed = useCallback(
    (speed: number) => {
      srcRef.current?.setSpeed?.(speed);
      store.getState().setSpeed(speed);
    },
    [store],
  );

  // Stop the source on real unmount only (StrictMode's simulated unmount/remount must not kill it).
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (mounted.current) return;
        srcRef.current?.stop();
        srcRef.current = null;
        stopTicking();
      }, 0);
    };
  }, [stopTicking]);

  const now = useCallback(() => srcRef.current?.now() ?? store.getState().clockMs, [store]);

  return { start, pause, stop, setSpeed, now };
}
