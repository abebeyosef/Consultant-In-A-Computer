"use client";

import { Check, RotateCw, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Spark } from "@/components/common/Spark";
import { Button } from "@/components/ui/button";

/** Floating bar (bottom centre) shown while AI items are still provisional. */
export function ProvisionalBar({
  count,
  onKeepAll,
  onClear,
  onRefill,
  refilling,
  emptyOfAi,
}: {
  count: number;
  onKeepAll: () => void;
  onClear: () => void;
  onRefill?: () => void;
  refilling?: boolean;
  /** the board has no AI items at all (e.g. fill failed) — offer only re-fill */
  emptyOfAi?: boolean;
}) {
  const reduce = useReducedMotion();
  const show = count > 0 || (emptyOfAi && !!onRefill);
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="bar"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-hairline bg-surface py-1 pl-3.5 pr-1 text-[13px]"
          data-testid="provisional-bar"
          role="toolbar"
          aria-label="AI suggestions on this board"
        >
          {count > 0 ? (
            <>
              <span className="mr-1.5 inline-flex items-center gap-1.5 text-ink-muted">
                <Spark size={12} />
                <span>
                  {count} suggested {count === 1 ? "item" : "items"}
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={onKeepAll} className="rounded-full">
                <Check strokeWidth={1.5} /> Keep all
              </Button>
              <Button size="sm" variant="ghost" onClick={onClear} className="rounded-full">
                <X strokeWidth={1.5} /> Clear AI items
              </Button>
            </>
          ) : (
            <span className="mr-1.5 text-ink-muted">Nothing filled in yet</span>
          )}
          {onRefill ? (
            <Button size="sm" variant="ghost" onClick={onRefill} disabled={refilling} className="rounded-full">
              <RotateCw strokeWidth={1.5} className={refilling ? "animate-spin" : undefined} />
              {refilling ? "Re-filling…" : "Re-fill from transcript"}
            </Button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
