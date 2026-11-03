"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BoardPanel } from "@/components/board/BoardPanel";
import { ShareMenu } from "@/components/board/ShareMenu";
import { FrameworkCommand } from "@/components/board/FrameworkCommand";
import { Wordmark } from "@/components/common/SiteHeader";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Kbd } from "@/components/common/Kbd";
import { Button } from "@/components/ui/button";
import { mergeFill } from "@/lib/board/refill";
import { type StoredBoard, createBoard, loadBoard, saveBoard } from "@/lib/board/store";
import { getAllFrameworks, getFramework } from "@/lib/frameworks/registry";
import { previewFillFor } from "@/lib/frameworks/sampleFills";
import type { FrameworkTemplate } from "@/lib/frameworks/types";
import { isFrameworkMenuKey } from "@/lib/keyboard";

const SCRATCH = "scratch";

/** /board?fw=<id>[&fill=example] creates a board; /board?id=<boardId> reopens one. */
export function StandaloneBoard() {
  const params = useSearchParams();
  const router = useRouter();
  const [board, setBoard] = useState<StoredBoard | null>(null);
  const [fresh, setFresh] = useState(false);
  const [missing, setMissing] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const boardIdRef = useRef<string | null>(null);
  useEffect(() => {
    boardIdRef.current = board?.id ?? null;
  }, [board?.id]);
  const frameworks = getAllFrameworks();

  const open = useCallback(
    async (fw: FrameworkTemplate, withFill: boolean) => {
      const b = await createBoard({
        sessionId: SCRATCH,
        fw,
        fill: withFill ? previewFillFor(fw.id) : null,
        fillOrigin: withFill ? "sample" : "none",
      });
      setFresh(true);
      boardIdRef.current = b.id;
      setBoard(b);
      router.replace(`/board?id=${b.id}`);
    },
    [router],
  );

  const handledQuery = useRef<string | null>(null);
  useEffect(() => {
    const q = params.toString();
    if (handledQuery.current === q) return;
    handledQuery.current = q;
    const id = params.get("id");
    const fwId = params.get("fw");
    if (id) {
      if (boardIdRef.current === id) return;
      const b = loadBoard(id);
      if (b) {
        // localStorage is only readable after mount; syncing it into state here is intended.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFresh(false);
        setBoard(b);
      } else setMissing(true);
      return;
    }
    if (fwId) {
      const fw = getFramework(fwId);
      if (!fw) {
        setMissing(true);
        return;
      }
      void open(fw, params.get("fill") !== "none");
    }
  }, [params, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isFrameworkMenuKey(e) && !(e.key === "/" && (e.target as HTMLElement)?.closest?.(".excalidraw"))) {
        e.preventDefault();
        e.stopPropagation();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);

  const onRefill = useCallback(async (b: StoredBoard) => {
    const fw = getFramework(b.frameworkId);
    const fill = fw ? previewFillFor(fw.id) : null;
    if (!fw || !fill) {
      toast("Nothing to re-fill from here", { description: "Open the board from a session to fill it from the transcript." });
      return null;
    }
    const merged = await mergeFill(b, fw, fill);
    saveBoard(merged);
    return merged;
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-hairline px-5">
        <Wordmark />
        <div className="ml-auto flex items-center gap-2 text-[12px] text-ink-muted">
          <Button variant="ghost" size="sm" onClick={() => setCmdOpen(true)} className="gap-2 text-ink-muted">
            Frameworks <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </Button>
          <ThemeToggle />
        </div>
      </header>
      <main className="min-h-0 flex-1">
        {board ? (
          <BoardPanel
            key={board.id}
            board={board}
            animateIn={fresh}
            onBoardChange={(b) => {
              saveBoard(b);
            }}
            onClose={() => router.push("/library")}
            closeLabel="Library"
            onRefill={onRefill}
            headerRight={
              <ShareMenu
                title={board.title}
                getElements={() =>
                  ((window as unknown as { __ciacBoardApi?: { getSceneElements(): unknown } }).__ciacBoardApi?.getSceneElements() as typeof board.elements | undefined) ??
                  board.elements
                }
              />
            }
          />
        ) : missing ? (
          <p className="grid h-full place-items-center text-ink-muted">That board isn&apos;t in this browser.</p>
        ) : (
          <p className="grid h-full place-items-center text-[13px] text-ink-muted">Preparing board…</p>
        )}
      </main>
      <FrameworkCommand
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        frameworks={frameworks}
        onSelect={(fw) => void open(fw, true)}
        hint="Opens with an example fill (sessions fill from the transcript)"
      />
    </div>
  );
}
