"use client";

import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { ConsoleActions, ConsoleState, ConsoleStore } from "@/lib/session/consoleStore";

export const ConsoleContext = createContext<ConsoleStore | null>(null);

export function useConsoleStore(): ConsoleStore {
  const s = useContext(ConsoleContext);
  if (!s) throw new Error("ConsoleContext missing");
  return s;
}

export function useConsole<T>(selector: (s: ConsoleState & ConsoleActions) => T): T {
  return useStore(useConsoleStore(), selector);
}
