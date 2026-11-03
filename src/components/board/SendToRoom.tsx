"use client";

import { Check, MonitorUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Board header action: show this board's accepted items in the room view. */
export function SendToRoom({ inRoom, onSend }: { inRoom: boolean; onSend: () => void }) {
  return inRoom ? (
    <Button variant="ghost" size="sm" onClick={onSend} className="border border-live text-live hover:text-live" data-testid="send-to-room" data-state="in-room" title="Showing in the room — click to resend">
      <Check strokeWidth={1.5} /> In the room
    </Button>
  ) : (
    <Button variant="outline" size="sm" onClick={onSend} data-testid="send-to-room" title="Show accepted items in the room view">
      <MonitorUp strokeWidth={1.5} /> Send to room
    </Button>
  );
}
