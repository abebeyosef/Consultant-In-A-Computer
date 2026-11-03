"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { FrameworkTemplate } from "@/lib/frameworks/types";

const LAYOUT = { matrix2x2: "2×2", canvas: "Canvas", table: "Table", chain: "Chain" } as const;

/** ⌘K / "/" — open any framework without waiting for a flag. */
export function FrameworkCommand({
  open,
  onOpenChange,
  frameworks,
  onSelect,
  hint = "Opens pre-filled from the transcript so far",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frameworks: FrameworkTemplate[];
  onSelect: (fw: FrameworkTemplate) => void;
  hint?: string;
}) {
  const builtin = frameworks.filter((f) => f.source === "builtin");
  const custom = frameworks.filter((f) => f.source === "custom");
  const item = (f: FrameworkTemplate) => (
    <CommandItem
      key={f.id}
      value={`${f.name} ${f.shortName} ${f.id}`}
      onSelect={() => {
        onOpenChange(false);
        onSelect(f);
      }}
    >
      <span>{f.name}</span>
      <span className="ml-auto text-mono-sm">{LAYOUT[f.layout.type]}</span>
    </CommandItem>
  );
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Open a framework" description={hint}>
      <Command>
        <CommandInput placeholder="Open a framework…" />
        <CommandList>
          <CommandEmpty>No framework matches.</CommandEmpty>
          <CommandGroup heading="Frameworks">{builtin.map(item)}</CommandGroup>
          {custom.length ? <CommandGroup heading="Your frameworks">{custom.map(item)}</CommandGroup> : null}
        </CommandList>
        <div className="border-t border-hairline px-3 py-2 text-[12px] text-ink-muted">{hint}</div>
      </Command>
    </CommandDialog>
  );
}
