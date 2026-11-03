"use client";

import { Loader2, Plus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useMemo } from "react";
import { Spark } from "@/components/common/Spark";
import { Button } from "@/components/ui/button";
import type { FrameworkTemplate } from "@/lib/frameworks/types";
import { partitionSuggestions } from "@/lib/session/rail";
import type { Suggestion } from "@/lib/session/types";
import { formatTimestamp } from "@/lib/transcript/store";
import { useNow } from "@/lib/useNow";
import { useConsole } from "./ConsoleContext";
import { FlagCard } from "./FlagCard";

export function FlagRail({
  frameworks,
  onOpen,
  onNotNow,
  onMute,
  onQuote,
  onSeen,
  onSuggest,
  suggesting,
  suggestNote,
}: {
  frameworks: Map<string, FrameworkTemplate>;
  onOpen: (s: Suggestion) => void;
  onNotNow: (s: Suggestion) => void;
  onMute: (s: Suggestion) => void;
  onQuote: (s: Suggestion) => void;
  onSeen: (s: Suggestion) => void;
  onSuggest: () => void;
  suggesting: boolean;
  suggestNote?: string | null;
}) {
  const suggestions = useConsole((s) => s.session.suggestions);
  const clockMs = useConsole((s) => s.clockMs);
  const waiting = useConsole((s) => s.waitingFor);
  const engineMode = useConsole((s) => s.engineMode);
  const { active, earlier } = useMemo(() => partitionSuggestions(suggestions, clockMs), [suggestions, clockMs]);
  const nowWall = useNow(500, !!waiting);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="flag-rail">
      <div className="flex h-10 shrink-0 items-center justify-between px-4 text-[12px] text-ink-muted">
        <span>Suggestions</span>
        {engineMode === "mock" ? (
          <span title="No model connection — using the built-in offline engine" data-testid="offline-mode">
            Offline mode
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {active.length === 0 && earlier.length === 0 ? (
          <p className="mx-auto mt-[18vh] max-w-[220px] text-center text-[14px] leading-[1.5] text-ink-muted" data-testid="rail-empty">
            Suggestions appear here when a framework could help.
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {active.map((s) => {
              const fw = frameworks.get(s.frameworkId);
              const preparing = waiting?.suggestionId === s.id ? Math.max(0, Math.floor((nowWall - waiting.since) / 1000)) : null;
              return (
                <div key={s.id} onPointerEnter={() => onSeen(s)} onFocusCapture={() => onSeen(s)}>
                  <FlagCard
                    frameworkName={fw?.name ?? s.frameworkId}
                    reason={s.reason}
                    quote={s.evidenceQuote || undefined}
                    fit={s.fit}
                    fitHint={s.fitHint ?? fw?.whenToUse}
                    manual={s.manual}
                    preparingSeconds={preparing}
                    onOpen={() => onOpen(s)}
                    onNotNow={() => onNotNow(s)}
                    onMute={() => onMute(s)}
                    onQuoteClick={() => onQuote(s)}
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </div>
        {earlier.length ? (
          <section className="mt-6" aria-label="Earlier suggestions" data-testid="earlier">
            <h3 className="mb-1.5 text-[12px] font-normal text-ink-muted">Earlier</h3>
            <ul className="flex flex-col">
              {earlier.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(s)}
                    className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] hover:bg-muted"
                  >
                    <Spark size={10} />
                    <span className="flex-1 truncate">{frameworks.get(s.frameworkId)?.shortName ?? s.frameworkId}</span>
                    <span className="text-mono-sm">{s.status === "opened" ? "opened" : formatTimestamp(s.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <div className="shrink-0 border-t border-hairline p-3">
        {suggestNote ? <p className="mb-2 px-1 text-[12px] text-ink-muted" role="status">{suggestNote}</p> : null}
        <Button variant="ghost" size="sm" className="w-full text-ink-muted" onClick={onSuggest} disabled={suggesting} data-testid="suggest-framework">
          {suggesting ? <Loader2 className="animate-spin" strokeWidth={1.5} /> : <Plus strokeWidth={1.5} />}
          {suggesting ? "Looking…" : "Suggest a framework"}
        </Button>
      </div>
    </div>
  );
}
