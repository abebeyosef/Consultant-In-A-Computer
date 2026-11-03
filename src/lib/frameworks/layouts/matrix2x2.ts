import type { FrameworkTemplate, Matrix2x2Layout, MatrixFill } from "../types";
import {
  type BoardSkeleton,
  type Box,
  type RenderOptions,
  type SkelElement,
  COLORS,
  aiSticky,
  arrow,
  centredText,
  estimateTextWidth,
  ghost,
  line,
  packIntoCells,
  rect,
  structure,
  text,
} from "../skeleton";
import { TITLE_BLOCK, ghostLabel, titleElement, wrapInFrame } from "./common";

export type QuadrantKey = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

export const MATRIX = {
  width: 1240,
  height: 1000,
  plotLeft: 120,
  plotTop: TITLE_BLOCK + 16,
  plotWidth: 1070,
  plotHeight: 790,
  sticky: { width: 160, height: 84, fontSize: 14 },
  cols: 3,
  rows: 3,
  labelBand: 46,
};

export function quadrantFor(x: number, y: number): QuadrantKey {
  const high = (s: number) => s >= 4;
  if (high(y)) return high(x) ? "topRight" : "topLeft";
  return high(x) ? "bottomRight" : "bottomLeft";
}

/** Fraction across a half-axis for a 1–5 score (0 = low edge of that half, 1 = high edge). */
function fractionInHalf(s: number): number {
  const v = Math.max(1, Math.min(5, Math.round(s)));
  return { 1: 0.1, 2: 0.5, 3: 0.9, 4: 0.25, 5: 0.85 }[v as 1 | 2 | 3 | 4 | 5];
}

export function renderMatrix(fw: FrameworkTemplate, layout: Matrix2x2Layout, fill: MatrixFill | null, opts: RenderOptions): BoardSkeleton {
  const ox = opts.origin?.x ?? 0;
  const oy = opts.origin?.y ?? 0;
  const p = opts.idPrefix;
  const M = MATRIX;
  const left = ox + M.plotLeft;
  const top = oy + M.plotTop;
  const qw = M.plotWidth / 2;
  const qh = M.plotHeight / 2;
  const els: SkelElement[] = [];

  els.push(titleElement(p, fw, ox, oy));

  // Plot border + dividers
  els.push(rect(`${p}-plot`, { x: left, y: top, width: M.plotWidth, height: M.plotHeight }, { locked: true, customData: structure(fw.id) }));
  els.push(line(`${p}-vdiv`, left + qw, top, left + qw, top + M.plotHeight, { strokeColor: COLORS.hairline, locked: true, customData: structure(fw.id) }));
  els.push(line(`${p}-hdiv`, left, top + qh, left + M.plotWidth, top + qh, { strokeColor: COLORS.hairline, locked: true, customData: structure(fw.id) }));

  // Axes
  const axisY = top + M.plotHeight + 28;
  els.push(arrow(`${p}-xaxis`, left, axisY, left + M.plotWidth, axisY, { strokeWidth: 1.5, locked: true, customData: structure(fw.id) }));
  els.push(centredText(`${p}-xlabel`, left + M.plotWidth / 2, axisY + 12, layout.x.label, { fontSize: 20, locked: true, customData: structure(fw.id) }));
  els.push(text(`${p}-xlow`, left, axisY + 12, layout.x.low, { fontSize: 14, strokeColor: COLORS.muted, locked: true, customData: structure(fw.id) }));
  els.push(
    text(`${p}-xhigh`, left + M.plotWidth - estimateTextWidth(layout.x.high, 14), axisY + 12, layout.x.high, {
      fontSize: 14,
      strokeColor: COLORS.muted,
      textAlign: "right",
      locked: true,
      customData: structure(fw.id),
    }),
  );
  const axisX = left - 28;
  els.push(arrow(`${p}-yaxis`, axisX, top + M.plotHeight, axisX, top, { strokeWidth: 1.5, locked: true, customData: structure(fw.id) }));
  const yLabelW = estimateTextWidth(layout.y.label, 20);
  els.push(
    text(`${p}-ylabel`, axisX - 30 - yLabelW / 2, top + M.plotHeight / 2 - 12, layout.y.label, {
      fontSize: 20,
      textAlign: "center",
      locked: true,
      customData: structure(fw.id),
      // rotate reading bottom-to-top
      ...({ angle: -Math.PI / 2 } as object),
    }),
  );
  els.push(text(`${p}-yhigh`, axisX - 10 - estimateTextWidth(layout.y.high, 14), top - 2, layout.y.high, { fontSize: 14, strokeColor: COLORS.muted, textAlign: "right", locked: true, customData: structure(fw.id) }));
  els.push(text(`${p}-ylow`, axisX - 10 - estimateTextWidth(layout.y.low, 14), top + M.plotHeight - 18, layout.y.low, { fontSize: 14, strokeColor: COLORS.muted, textAlign: "right", locked: true, customData: structure(fw.id) }));

  // Quadrants: label band + cell grid
  const quads: { key: QuadrantKey; box: Box }[] = [
    { key: "topLeft", box: { x: left, y: top, width: qw, height: qh } },
    { key: "topRight", box: { x: left + qw, y: top, width: qw, height: qh } },
    { key: "bottomLeft", box: { x: left, y: top + qh, width: qw, height: qh } },
    { key: "bottomRight", box: { x: left + qw, y: top + qh, width: qw, height: qh } },
  ];
  const cells: (Box & { group: string })[] = [];
  for (const q of quads) {
    els.push(
      text(`${p}-q-${q.key}`, q.box.x + 18, q.box.y + 14, layout.quadrants[q.key], {
        fontSize: 19,
        strokeColor: COLORS.muted,
        locked: true,
        customData: structure(fw.id, { role: "label", slot: `q:${q.key}` }),
      }),
    );
    const innerX = q.box.x + 12;
    const innerY = q.box.y + M.labelBand;
    const cw = (q.box.width - 24) / M.cols;
    const ch = (q.box.height - M.labelBand - 10) / M.rows;
    for (let r = 0; r < M.rows; r++) {
      for (let c = 0; c < M.cols; c++) {
        cells.push({
          group: q.key,
          x: innerX + c * cw + (cw - M.sticky.width) / 2,
          y: innerY + r * ch + (ch - M.sticky.height) / 2,
          width: M.sticky.width,
          height: M.sticky.height,
        });
      }
    }
  }

  const items = (fill?.items ?? []).slice(0, cells.length);
  const placed = packIntoCells(
    items.map((it) => {
      const qk = quadrantFor(it.x, it.y);
      const q = quads.find((qq) => qq.key === qk)!;
      const fx = fractionInHalf(it.x);
      const fy = 1 - fractionInHalf(it.y); // high scores sit near the top of their half
      return {
        item: it,
        target: { x: q.box.x + fx * q.box.width, y: q.box.y + M.labelBand + fy * (q.box.height - M.labelBand) },
        preferred: (cell: Box & { group: string }) => cell.group === qk,
      };
    }),
    cells,
  );
  const used = new Set<string>();
  placed.forEach(({ item, cell }, i) => {
    used.add(cell.group);
    els.push(aiSticky(`${p}-ai-${i}`, cell, item, fw.id, `q:${cell.group}`, opts.suggestionId, M.sticky.fontSize));
  });

  for (const q of quads) {
    if (used.has(q.key)) continue;
    const label = ghostLabel(layout.itemNoun);
    els.push(
      ghost(`${p}-ghost-${q.key}`, q.box.x + q.box.width / 2 - estimateTextWidth(label, 16) / 2, q.box.y + q.box.height / 2 + 6, label, fw.id, `q:${q.key}`, {
        textAlign: "center",
      }),
    );
  }

  const bounds = { x: ox, y: oy, width: M.width, height: M.height };
  return { frameworkId: fw.id, elements: wrapInFrame(p, fw, bounds, els), bounds };
}
