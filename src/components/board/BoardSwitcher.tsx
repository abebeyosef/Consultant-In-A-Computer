"use client";

import { Check, ChevronDown, Presentation } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { loadBoard } from "@/lib/board/store";

/** Board header menu listing this session's boards (shown once there are two or more). */
export function BoardSwitcher({
  boardIds,
  currentId,
  roomBoardId,
  onSelect,
}: {
  boardIds: string[];
  currentId: string;
  roomBoardId?: string | null;
  onSelect: (id: string) => void;
}) {
  const boards = useMemo(
    () => boardIds.flatMap((id) => {
      const b = loadBoard(id);
      return b ? [{ id, title: b.title }] : [];
    }),
    [boardIds],
  );
  if (boards.length < 2) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-ink-muted" data-testid="board-switcher">
          Boards <span className="font-mono text-[11px]">{boards.length}</span>
          <ChevronDown strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-[12px] font-normal text-ink-muted">This session&apos;s boards</DropdownMenuLabel>
        {boards.map((b) => (
          <DropdownMenuItem key={b.id} onSelect={() => b.id !== currentId && onSelect(b.id)}>
            <span className="w-4">{b.id === currentId ? <Check strokeWidth={1.5} /> : null}</span>
            <span className="flex-1 truncate">{b.title}</span>
            {b.id === roomBoardId ? <Presentation strokeWidth={1.5} className="text-live" aria-label="In the room" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
