import type { FrameworkTemplate, TableFill, TableLayout } from "../types";
import {
  type BoardSkeleton,
  type RenderOptions,
  type SkelElement,
  COLORS,
  aiSticky,
  clampText,
  estimateTextWidth,
  ghost,
  line,
  rect,
  structure,
  text,
} from "../skeleton";
import { PAD, TITLE_BLOCK, titleElement, wrapInFrame } from "./common";
import { flowCells, flowHeight } from "./flow";

const HEADER_H = 60;
const ROW_HEAD_W = 200;
const MIN_ROW_H = 120;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Resolve the columns to draw: fixed, or supplied by the fill for dynamic tables. */
export function resolveColumns(layout: TableLayout, fill: TableFill | null) {
  if (layout.dynamicColumns && fill?.columns && fill.columns.length >= 1) {
    const cols = fill.columns.slice(0, layout.dynamicColumns.max).map((label, i) => ({ id: `col-${i}`, label: clampText(label, 28) }));
    return cols.length >= layout.dynamicColumns.min ? cols : [...cols, ...layout.columns.slice(cols.length, layout.dynamicColumns.min)];
  }
  return layout.columns;
}

function matchIndex<T extends { id: string; label: string }>(list: T[], key: string): number {
  const k = norm(key);
  let i = list.findIndex((x) => norm(x.id) === k || norm(x.label) === k);
  if (i === -1) i = list.findIndex((x) => norm(x.label).startsWith(k) || k.startsWith(norm(x.label)) || norm(x.label).includes(k));
  if (i === -1 && /^\d+$/.test(key)) i = Number(key) - 1;
  return i;
}

export function renderTable(fw: FrameworkTemplate, layout: TableLayout, fill: TableFill | null, opts: RenderOptions): BoardSkeleton {
  const ox = opts.origin?.x ?? 0;
  const oy = opts.origin?.y ?? 0;
  const p = opts.idPrefix;
  const columns = resolveColumns(layout, fill);
  const rows = layout.rows;
  const colW = columns.length >= 5 ? 220 : columns.length === 4 ? 250 : 290;

  // bucket cells
  const buckets: Record<string, { text: string; sourceQuote?: string }[]> = {};
  for (const cell of fill?.cells ?? []) {
    const r = matchIndex(rows, cell.row);
    const c = matchIndex(columns, cell.col);
    if (r < 0 || c < 0 || r >= rows.length || c >= columns.length) continue;
    (buckets[`${r}|${c}`] ??= []).push({ text: cell.text, sourceQuote: cell.sourceQuote });
  }

  const rowH = rows.map((_, r) =>
    Math.max(MIN_ROW_H, ...columns.map((_, c) => flowHeight(colW, buckets[`${r}|${c}`]?.length ?? 0, 14, 14, 12, colW - 28))),
  );
  const left = ox + PAD;
  const top = oy + TITLE_BLOCK;
  const tableW = ROW_HEAD_W + columns.length * colW;
  const els: SkelElement[] = [titleElement(p, fw, ox, oy)];

  // headers
  els.push(rect(`${p}-hdr`, { x: left, y: top, width: tableW, height: HEADER_H }, { locked: true, backgroundColor: COLORS.zone, customData: structure(fw.id) }));
  columns.forEach((col, c) => {
    const x = left + ROW_HEAD_W + c * colW;
    els.push(
      text(`${p}-col-${c}`, x + colW / 2 - estimateTextWidth(col.label, 19) / 2, top + 18, col.label, {
        fontSize: 19,
        textAlign: "center",
        locked: true,
        customData: structure(fw.id, { role: "label", slot: `col:${c}` }),
      }),
    );
  });

  let y = top + HEADER_H;
  let n = 0;
  rows.forEach((row, r) => {
    els.push(rect(`${p}-row-${r}`, { x: left, y, width: tableW, height: rowH[r] }, { locked: true, customData: structure(fw.id) }));
    els.push(
      text(`${p}-rowlabel-${r}`, left + 16, y + 16, row.label, {
        fontSize: 18,
        strokeColor: COLORS.ink,
        locked: true,
        customData: structure(fw.id, { role: "label", slot: `row:${r}` }),
      }),
    );
    columns.forEach((_, c) => {
      const x = left + ROW_HEAD_W + c * colW;
      const cellBox = { x, y, width: colW, height: rowH[r] };
      const items = buckets[`${r}|${c}`] ?? [];
      if (items.length === 0) {
        els.push(ghost(`${p}-ghost-${r}-${c}`, x + colW / 2 - estimateTextWidth("—", 16) / 2, y + rowH[r] / 2 - 10, "—", fw.id, `c:${r}|${c}`));
        return;
      }
      flowCells(cellBox, items.length, 14, 14, 12, colW - 28).forEach((cell, i) => {
        els.push(aiSticky(`${opts.stickyIdPrefix ?? p}-ai-${n++}`, cell, items[i], fw.id, `c:${r}|${c}`, opts.suggestionId));
      });
    });
    y += rowH[r];
  });
  // column dividers
  columns.forEach((_, c) => {
    const x = left + ROW_HEAD_W + c * colW;
    els.push(
      line(`${p}-coldiv-${c}`, x, top, x, y, { strokeColor: COLORS.hairline, locked: true, customData: structure(fw.id) }),
    );
  });

  const bounds = { x: ox, y: oy, width: tableW + PAD * 2, height: y - oy + PAD };
  return { frameworkId: fw.id, elements: wrapInFrame(p, fw, bounds, els), bounds };
}
