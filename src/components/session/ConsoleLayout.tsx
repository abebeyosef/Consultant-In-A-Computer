"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "@/lib/utils";

/** 48px top bar · centre column (transcript or board) · 320px flag rail · shortcut footer. */
export function ConsoleLayout({
  topBar,
  main,
  rail,
  footer,
  className,
}: {
  topBar: React.ReactNode;
  main: React.ReactNode;
  rail: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-dvh min-h-0 flex-col bg-paper text-ink", className)}>
      {topBar}
      <Group orientation="horizontal" className="min-h-0 flex-1">
        <Panel id="main" minSize={480} className="min-w-0">
          <div className="flex h-full min-h-0 flex-col">{main}</div>
        </Panel>
        <Separator className="group relative w-px bg-hairline outline-none data-[separator=active]:bg-accent-blue/50 hover:bg-ink/15">
          <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
        </Separator>
        <Panel id="rail" defaultSize={320} minSize={280} maxSize={440} className="min-w-0">
          <aside aria-label="Suggestions" className="flex h-full min-h-0 flex-col">
            {rail}
          </aside>
        </Panel>
      </Group>
      {footer}
    </div>
  );
}
