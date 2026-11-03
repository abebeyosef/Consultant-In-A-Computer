"use client";

import { Captions, EyeOff, MonitorUp, Presentation, SquareX } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { loadBoard } from "@/lib/board/store";
import { cn } from "@/lib/utils";
import type { RoomBridge } from "./useRoomBridge";

/** Top-bar room status: "Open room view" until a room window exists, then a status menu. */
export function RoomControls({ room }: { room: RoomBridge }) {
  const title = useMemo(() => (room.roomBoardId ? loadBoard(room.roomBoardId)?.title ?? null : null), [room.roomBoardId]);
  const showing = !!room.roomBoardId && !room.blank;

  if (!room.connected && !room.roomBoardId) {
    return (
      <Button variant="ghost" size="sm" onClick={room.openWindow} data-testid="open-room">
        <Presentation strokeWidth={1.5} /> Open room view
      </Button>
    );
  }

  const label = room.blank ? "Room blanked" : showing ? "In the room" : "Room";
  const full = showing && title ? `Room is showing ${title}` : label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-testid="room-status"
          data-state={room.blank ? "blank" : showing ? "showing" : "idle"}
          aria-label={`${full}${room.connected ? "" : " (room window closed)"}`}
          title={full}
          className={cn(
            "border",
            showing ? "border-live text-live hover:text-live" : "border-hairline text-ink-muted",
          )}
        >
          {room.blank ? <EyeOff strokeWidth={1.5} /> : <Presentation strokeWidth={1.5} />}
          <span className="truncate">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onSelect={room.openWindow}>
          <MonitorUp strokeWidth={1.5} /> {room.connected ? "Bring room window forward" : "Open room view"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={room.toggleBlank} data-testid="room-blank">
          <EyeOff strokeWidth={1.5} /> {room.blank ? "Show the room view again" : "Blank the room view"}
          <DropdownMenuShortcut>B</DropdownMenuShortcut>
        </DropdownMenuItem>
        {room.captionsAvailable ? (
          <DropdownMenuItem onSelect={room.toggleCaptions}>
            <Captions strokeWidth={1.5} /> {room.captions ? "Hide captions" : "Show captions"}
            <DropdownMenuShortcut>J</DropdownMenuShortcut>
          </DropdownMenuItem>
        ) : null}
        {room.roomBoardId ? (
          <DropdownMenuItem onSelect={room.stopShowing} data-testid="room-stop">
            <SquareX strokeWidth={1.5} /> Stop showing the board
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
