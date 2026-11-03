"use client";

import { LayoutGrid } from "lucide-react";
import { useMemo } from "react";
import { loadBoard } from "@/lib/board/store";
import { summarise } from "@/lib/session/summary";
import { formatElapsed } from "./ListeningPill";
import { useConsole } from "./ConsoleContext";

/** Shown at the top of the rail once a session has ended. */
export function SessionSummary({ actions }: { actions?: React.ReactNode }) {
  const session = useConsole((s) => s.session);
  const clockMs = useConsole((s) => s.clockMs);
  const openBoard = useConsole((s) => s.openBoard);
  const sum = useMemo(() => summarise(session, clockMs, (id) => loadBoard(id)?.title ?? null), [session, clockMs]);

  const stats: [string, string][] = [
    ["Duration", formatElapsed(sum.durationMs)],
    ["Words", sum.words.toLocaleString("en-GB")],
    ["Suggestions", `${sum.flags.raised}${sum.flags.opened ? ` · ${sum.flags.opened} opened` : ""}`],
    ["Marked moments", String(sum.markedMoments)],
  ];

  return (
    <section className="mb-5 rounded-[12px] border border-hairline bg-surface p-4" aria-label="Session summary" data-testid="session-summary">
      <h3 className="mb-3 text-[14px] font-semibold">Session summary</h3>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {stats.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-[12px] text-ink-muted">{k}</dt>
            <dd className="font-mono text-[13px] tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {sum.boards.length ? (
        <>
          <h4 className="mb-1 mt-4 text-[12px] font-normal text-ink-muted">Boards</h4>
          <ul className="flex flex-col">
            {sum.boards.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => openBoard(b.id)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px] hover:bg-muted"
                >
                  <LayoutGrid size={14} strokeWidth={1.5} className="text-ink-muted" />
                  <span className="truncate">{b.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 text-[13px] text-ink-muted">No boards were opened.</p>
      )}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}
