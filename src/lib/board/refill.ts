import { renderFramework } from "@/lib/frameworks/toSkeleton";
import type { AnyFill, FrameworkTemplate } from "@/lib/frameworks/types";
import { type Box, boxesOverlap } from "@/lib/frameworks/skeleton";
import { type ExElement, skeletonToElements } from "./excalidraw";
import { SPARK_PREFIX, boundText, clearProvisional, isAiSticky, recordPlacement } from "./provisional";
import type { StoredBoard } from "./store";

const normText = (s: string) => s.replace(SPARK_PREFIX, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Find a nearby free spot for `box` that doesn't overlap any of `taken`. */
export function nudgeFree(box: Box, taken: Box[], step = 24, maxRings = 12): Box {
  if (!taken.some((t) => boxesOverlap(box, t))) return box;
  for (let ring = 1; ring <= maxRings; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (const dy of [-ring, ring]) {
        const cand = { ...box, x: box.x + dx * step * 3, y: box.y + dy * step * 2 };
        if (!taken.some((t) => boxesOverlap(cand, t))) return cand;
      }
    }
    for (let dy = -ring + 1; dy <= ring - 1; dy++) {
      for (const dx of [-ring, ring]) {
        const cand = { ...box, x: box.x + dx * step * 3, y: box.y + dy * step * 2 };
        if (!taken.some((t) => boxesOverlap(cand, t))) return cand;
      }
    }
  }
  return box;
}

/**
 * Merge a fresh fill into an existing board: removes current provisional AI
 * items, adds the new ones, never touches accepted or user-made items, and skips
 * duplicates of anything already on the board.
 */
export async function mergeFill(board: StoredBoard, fw: FrameworkTemplate, fill: AnyFill, suggestionId?: string): Promise<StoredBoard> {
  const gen = (board.fillGeneration ?? 1) + 1;
  const kept = clearProvisional(board.elements);
  const live = kept.filter((e) => !e.isDeleted);
  const frame = live.find((e) => e.type === "frame");

  const existingTexts = new Set(
    live
      .filter((e) => e.type === "rectangle" && !e.locked)
      .map((e) => normText(boundText(live, e)?.originalText ?? ""))
      .filter(Boolean),
  );
  const taken: Box[] = live.filter((e) => e.type === "rectangle" && !e.locked).map((e) => ({ x: e.x, y: e.y, width: e.width, height: e.height }));

  const sk = renderFramework(fw, fill, { idPrefix: board.id, stickyIdPrefix: `${board.id}-g${gen}`, suggestionId });
  const stickyIds = new Set(sk.elements.filter((e) => e.customData?.role === "sticky").map((e) => e.id));
  const stickySkel = sk.elements.filter((e) => stickyIds.has(e.id));
  const converted = await skeletonToElements({ ...sk, elements: stickySkel });

  const additions: ExElement[] = [];
  for (const c of converted) {
    if (c.type !== "rectangle" || !isAiSticky(c)) continue;
    const t = converted.find((x) => x.containerId === c.id);
    if (t && existingTexts.has(normText(t.originalText ?? t.text ?? ""))) continue;
    const spot = nudgeFree({ x: c.x, y: c.y, width: c.width, height: c.height }, taken);
    const dx = spot.x - c.x;
    const dy = spot.y - c.y;
    taken.push(spot);
    additions.push({ ...c, x: spot.x, y: spot.y, frameId: frame?.id ?? null });
    if (t) additions.push({ ...t, x: t.x + dx, y: t.y + dy, frameId: frame?.id ?? null });
  }
  const elements = [...kept, ...additions];
  return {
    ...board,
    elements,
    placement: recordPlacement(elements, board.placement),
    fillGeneration: gen,
    updatedAt: Date.now(),
  };
}
