"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { elementsToSvg, skeletonToElements } from "@/lib/board/excalidraw";
import { renderFramework } from "@/lib/frameworks/toSkeleton";
import type { AnyFill, FrameworkTemplate } from "@/lib/frameworks/types";
import { cn } from "@/lib/utils";

/** Static SVG thumbnail of a framework, rendered by Excalidraw's exporter. */
export function FrameworkPreview({ fw, fill, className }: { fw: FrameworkTemplate; fill: AnyFill | null; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sk = renderFramework(fw, fill, { idPrefix: `pv-${fw.id}` });
        const els = await skeletonToElements(sk);
        const svg = await elementsToSvg(els, { dark: resolvedTheme === "dark", padding: 8 });
        if (cancelled || !ref.current) return;
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        ref.current.replaceChildren(svg);
        setError(false);
      } catch (err) {
        console.error("[preview]", fw.id, err);
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fw, fill, resolvedTheme]);

  return (
    <div className={cn("relative", className)}>
      <div ref={ref} className="absolute inset-0" data-testid={`preview-${fw.id}`} />
      {error ? <p className="absolute inset-0 grid place-items-center text-[13px] text-ink-muted">Preview unavailable</p> : null}
    </div>
  );
}
