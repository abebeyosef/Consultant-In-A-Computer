"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_FULL_TEXT } from "@/lib/transcript/sampleScript";
import { countWords } from "@/lib/transcript/store";

export function PasteDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (text: string, instant: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [instant, setInstant] = useState(false);
  const words = countWords(text);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Paste a transcript</DialogTitle>
          <DialogDescription>
            It plays through the same pipeline as live audio, so suggestions appear as the conversation unfolds. Timestamps and speaker names are tidied away.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste meeting notes or a transcript export…"
          className="h-[280px] resize-none text-[14px] leading-[1.55]"
          data-testid="paste-textarea"
          autoFocus
        />
        <div className="flex items-center justify-between text-[13px] text-ink-muted">
          <span className="text-mono-sm">{words} words</span>
          <Button variant="link" size="xs" className="px-0 text-ink-muted" onClick={() => setText(SAMPLE_FULL_TEXT)}>
            Use the sample transcript
          </Button>
        </div>
        <DialogFooter className="items-center sm:justify-between">
          <label className="flex items-center gap-2.5 text-[13px]">
            <Switch checked={instant} onCheckedChange={setInstant} aria-label="Process instantly" />
            <span>
              Process instantly <span className="text-ink-muted">· skip the replay</span>
            </span>
          </label>
          <Button onClick={() => onSubmit(text, instant)} disabled={words < 10} data-testid="paste-submit">
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
