"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { SiteHeader } from "@/components/common/SiteHeader";
import { FrameworkPreview } from "@/components/board/FrameworkPreview";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BUILTIN_FRAMEWORKS } from "@/lib/frameworks/builtins";
import { loadCustomFrameworks } from "@/lib/frameworks/custom";
import { previewFillFor } from "@/lib/frameworks/sampleFills";
import type { FrameworkTemplate } from "@/lib/frameworks/types";

const LAYOUT_NAMES = { matrix2x2: "2×2 matrix", canvas: "Canvas", table: "Table", chain: "Chain" } as const;

const noop = () => () => {};

export function LibraryView() {
  const [mode, setMode] = useState<"empty" | "filled">("filled");
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const custom = useMemo(() => (hydrated ? loadCustomFrameworks() : []), [hydrated]);
  const all: FrameworkTemplate[] = [...BUILTIN_FRAMEWORKS, ...custom];

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-8 pb-24 pt-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[28px] leading-tight">Framework library</h1>
            <p className="mt-1.5 max-w-[60ch] text-ink-muted">
              The frameworks the assistant listens for. Each one opens as an editable board, pre-filled from what the room said.
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as "empty" | "filled")}
            variant="outline"
            size="sm"
            aria-label="Preview mode"
          >
            <ToggleGroupItem value="filled" className="px-3">Example fill</ToggleGroupItem>
            <ToggleGroupItem value="empty" className="px-3">Empty</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {all.map((fw) => (
            <li key={fw.id} className="flex flex-col overflow-hidden rounded-[12px] border border-hairline bg-surface">
              <FrameworkPreview
                fw={fw}
                fill={mode === "filled" ? previewFillFor(fw.id) : null}
                className="aspect-[4/3] border-b border-hairline bg-paper"
              />
              <div className="flex flex-col gap-1.5 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px]">{fw.name}</h2>
                  <span className="ml-auto text-mono-sm">{LAYOUT_NAMES[fw.layout.type]}</span>
                </div>
                <p className="line-clamp-3 text-[13px] leading-[1.5] text-ink-muted">{fw.whenToUse}</p>
                {fw.source === "custom" ? <span className="text-[12px] text-ink-muted">Custom</span> : null}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
