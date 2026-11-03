import type { CanvasFill, CanvasLayout, FrameworkTemplate } from "../types";
import {
  type BoardSkeleton,
  type Box,
  type RenderOptions,
  type SkelElement,
  COLORS,
  aiSticky,
  estimateTextWidth,
  ghost,
  rect,
  structure,
  text,
} from "../skeleton";
import { PAD, TITLE_BLOCK, titleElement, wrapInFrame } from "./common";
import { flowCells, flowHeight } from "./flow";

const LABEL_BAND = 48;

export function canvasGeometry(layout: CanvasLayout, counts: Record<string, number>) {
  const innerW = layout.columns >= 4 ? 1480 : 1160;
  const colW = innerW / layout.columns;
  const baseRowH: number = layout.rows <= 2 ? 330 : 220;
  const rowH = Array.from({ length: layout.rows }, () => baseRowH);
  const need = (b: CanvasLayout["blocks"][number]) => flowHeight(colW * b.colSpan, counts[b.id] ?? 0, LABEL_BAND);
  for (const b of layout.blocks) if (b.rowSpan === 1) rowH[b.row] = Math.max(rowH[b.row], need(b));
  for (const b of layout.blocks) {
    if (b.rowSpan === 1) continue;
    const span = rowH.slice(b.row, b.row + b.rowSpan).reduce((a, n) => a + n, 0);
    const deficit = need(b) - span;
    if (deficit > 0) for (let r = b.row; r < b.row + b.rowSpan; r++) rowH[r] += Math.ceil(deficit / b.rowSpan);
  }
  const rowY = rowH.reduce<number[]>((acc, h, i) => [...acc, i === 0 ? 0 : acc[i - 1] + rowH[i - 1]], []);
  const blockBox = (b: CanvasLayout["blocks"][number], ox: number, oy: number): Box => ({
    x: ox + PAD + b.col * colW,
    y: oy + TITLE_BLOCK + rowY[b.row],
    width: colW * b.colSpan,
    height: rowH.slice(b.row, b.row + b.rowSpan).reduce((a, n) => a + n, 0),
  });
  const totalH = rowH.reduce((a, n) => a + n, 0);
  return { innerW, colW, rowH, blockBox, width: innerW + PAD * 2, height: TITLE_BLOCK + totalH + PAD };
}

export function renderCanvas(fw: FrameworkTemplate, layout: CanvasLayout, fill: CanvasFill | null, opts: RenderOptions): BoardSkeleton {
  const ox = opts.origin?.x ?? 0;
  const oy = opts.origin?.y ?? 0;
  const p = opts.idPrefix;
  const blocksFill = normaliseBlocks(layout, fill);
  const counts = Object.fromEntries(Object.entries(blocksFill).map(([k, v]) => [k, v.length]));
  const g = canvasGeometry(layout, counts);
  const els: SkelElement[] = [titleElement(p, fw, ox, oy)];
  let n = 0;
  for (const b of layout.blocks) {
    const box = g.blockBox(b, ox, oy);
    els.push(rect(`${p}-blk-${b.id}`, box, { locked: true, customData: structure(fw.id, { slot: `b:${b.id}` }) }));
    els.push(
      text(`${p}-blk-${b.id}-label`, box.x + 16, box.y + 14, b.label, {
        fontSize: 19,
        strokeColor: COLORS.ink,
        locked: true,
        customData: structure(fw.id, { role: "label", slot: `b:${b.id}` }),
      }),
    );
    const items = blocksFill[b.id] ?? [];
    if (items.length === 0) {
      const label = b.hint ?? "Add notes here";
      els.push(
        ghost(`${p}-ghost-${b.id}`, box.x + box.width / 2 - estimateTextWidth(label, 16) / 2, box.y + box.height / 2, label, fw.id, `b:${b.id}`, {
          textAlign: "center",
        }),
      );
      continue;
    }
    flowCells(box, items.length, LABEL_BAND).forEach((cell, i) => {
      els.push(aiSticky(`${p}-ai-${n++}`, cell, items[i], fw.id, `b:${b.id}`, opts.suggestionId));
    });
  }
  const bounds = { x: ox, y: oy, width: g.width, height: g.height };
  return { frameworkId: fw.id, elements: wrapInFrame(p, fw, bounds, els), bounds };
}

/** Map fill block keys onto layout block ids (tolerates labels or different casing). */
export function normaliseBlocks(layout: CanvasLayout, fill: CanvasFill | null) {
  const out: Record<string, { text: string; sourceQuote?: string }[]> = {};
  if (!fill?.blocks) return out;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, items] of Object.entries(fill.blocks)) {
    const k = norm(key);
    const block = layout.blocks.find((b) => norm(b.id) === k || norm(b.label) === k || norm(b.label).startsWith(k) || k.startsWith(norm(b.id)));
    if (!block || !Array.isArray(items)) continue;
    out[block.id] = [...(out[block.id] ?? []), ...items];
  }
  return out;
}
