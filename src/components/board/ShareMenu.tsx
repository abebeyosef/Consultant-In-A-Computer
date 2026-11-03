"use client";

import { FileJson, ImageDown, Link2, NotebookText, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ExElement, downloadBlob, elementsToExcalidrawJson, elementsToPng } from "@/lib/board/excalidraw";
import { acceptedOnly } from "@/lib/board/provisional";
import { fileName, shareUrl } from "@/lib/board/share";

export async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("Couldn't reach the clipboard — check the browser's permissions.");
  }
}

/**
 * Board header "Share" menu. Share link and PNG carry kept items only (amber
 * AI suggestions stay private); the .excalidraw file is the full working board.
 */
export function ShareMenu({
  title,
  getElements,
  onCopyNotes,
}: {
  title: string;
  getElements: () => readonly ExElement[];
  onCopyNotes?: () => void;
}) {
  const copyLink = () => void copyText(shareUrl(window.location.origin, { title, elements: getElements() }), "Read-only link copied");
  const png = async () => {
    try {
      const kept = acceptedOnly(getElements());
      downloadBlob(await elementsToPng(kept), fileName(title, "png"));
    } catch {
      toast.error("Couldn't export the image.");
    }
  };
  const json = async () => {
    try {
      const text = await elementsToExcalidrawJson(getElements());
      downloadBlob(new Blob([text], { type: "application/json" }), fileName(title, "excalidraw"));
    } catch {
      toast.error("Couldn't export the board file.");
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-ink-muted" data-testid="share-menu">
          <Share2 strokeWidth={1.5} /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[12px] font-normal text-ink-muted">Kept items only</DropdownMenuLabel>
        <DropdownMenuItem onSelect={copyLink} data-testid="copy-share-link">
          <Link2 strokeWidth={1.5} /> Copy read-only link
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void png()} data-testid="export-png">
          <ImageDown strokeWidth={1.5} /> Download PNG
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void json()} data-testid="export-json">
          <FileJson strokeWidth={1.5} /> Download .excalidraw file
        </DropdownMenuItem>
        {onCopyNotes ? (
          <DropdownMenuItem onSelect={onCopyNotes} data-testid="copy-notes">
            <NotebookText strokeWidth={1.5} /> Copy session notes
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
