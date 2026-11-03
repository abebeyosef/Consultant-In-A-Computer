"use client";

import { catchError, type ErrorInfo } from "next/error";
import { Button } from "@/components/ui/button";

/**
 * Keeps a whiteboard crash inside the board column: the transcript, flags and
 * listening carry on, and the facilitator can retry or go back.
 */
function BoardFallback(props: { onBack?: () => void }, { error, retry }: ErrorInfo) {
  console.error("[board] crashed", error);
  return (
    <div className="grid h-full place-items-center px-6 text-center" role="alert" data-testid="board-error">
      <div className="flex max-w-[360px] flex-col items-center gap-3">
        <p className="text-[15px] font-semibold">The board couldn&apos;t be drawn</p>
        <p className="text-[13px] text-ink-muted">Listening and suggestions carry on. The board is saved; try again or go back to the transcript.</p>
        <div className="mt-1 flex gap-2">
          <Button size="sm" onClick={() => retry()}>
            Try again
          </Button>
          {props.onBack ? (
            <Button size="sm" variant="outline" onClick={props.onBack}>
              Back to transcript
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const BoardBoundary = catchError(BoardFallback);
