"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Route-level fallback. Sessions and boards are saved in this browser, so a retry loses nothing. */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[ui] route error", error);
  }, [error]);
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-6 text-center" role="alert">
      <div className="flex max-w-[420px] flex-col items-center gap-3">
        <h1 className="text-[20px]">Something went wrong on this screen</h1>
        <p className="text-[14px] text-ink-muted">Your transcript and boards are saved in this browser. Try again, or start from the home screen.</p>
        <div className="mt-2 flex gap-2">
          <Button onClick={() => retry()}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
