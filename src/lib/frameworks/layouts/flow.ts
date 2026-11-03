import { type Box, STICKY } from "../skeleton";

/** Stickies flowing left→right, top→bottom inside a box (below a label band). */
export function flowCells(box: Box, count: number, labelBand: number, pad = 14, gap = STICKY.gap, maxStickyWidth = STICKY.width) {
  const sw = Math.min(maxStickyWidth, box.width - pad * 2);
  const sh = STICKY.height;
  const perRow = Math.max(1, Math.floor((box.width - pad * 2 + gap) / (sw + gap)));
  const usedW = perRow * sw + (perRow - 1) * gap;
  const startX = box.x + (box.width - usedW) / 2;
  const cells: Box[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    cells.push({ x: startX + c * (sw + gap), y: box.y + labelBand + r * (sh + gap), width: sw, height: sh });
  }
  return cells;
}

/** Height needed to hold `count` stickies in a box of the given width. */
export function flowHeight(width: number, count: number, labelBand: number, pad = 14, gap = STICKY.gap, maxStickyWidth = STICKY.width) {
  const sw = Math.min(maxStickyWidth, width - pad * 2);
  const perRow = Math.max(1, Math.floor((width - pad * 2 + gap) / (sw + gap)));
  const rows = Math.ceil(count / perRow);
  return labelBand + rows * (STICKY.height + gap) - (rows ? gap : 0) + pad;
}
