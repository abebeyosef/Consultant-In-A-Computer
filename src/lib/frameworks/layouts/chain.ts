import type { ChainFill, ChainLayout, FrameworkTemplate } from "../types";
import {
  type BoardSkeleton,
  type RenderOptions,
  type SkelElement,
  COLORS,
  aiSticky,
  arrow,
  ghost,
  rect,
  structure,
  text,
} from "../skeleton";
import { PAD, TITLE_BLOCK, titleElement, wrapInFrame } from "./common";

const BOX_W = 620;
const BOX_H = 104;
const LABEL_H = 30;
const GAP = 22;

export function chainSteps(layout: ChainLayout) {
  return [
    { key: "problem", label: layout.problemLabel, hint: "What keeps happening?" },
    ...Array.from({ length: layout.whyCount }, (_, i) => ({ key: `why-${i + 1}`, label: `Why ${i + 1}`, hint: "Why does that happen?" })),
    { key: "root", label: layout.rootCauseLabel, hint: "The cause worth fixing" },
    { key: "counter", label: layout.countermeasureLabel, hint: "What we'll change" },
  ];
}

export function renderChain(fw: FrameworkTemplate, layout: ChainLayout, fill: ChainFill | null, opts: RenderOptions): BoardSkeleton {
  const ox = opts.origin?.x ?? 0;
  const oy = opts.origin?.y ?? 0;
  const p = opts.idPrefix;
  const steps = chainSteps(layout);
  const values: Record<string, { text: string; sourceQuote?: string } | null | undefined> = {
    problem: fill?.problem,
    root: fill?.rootCause,
    counter: fill?.countermeasure,
  };
  (fill?.whys ?? []).slice(0, layout.whyCount).forEach((w, i) => (values[`why-${i + 1}`] = w));

  const els: SkelElement[] = [titleElement(p, fw, ox, oy)];
  const left = ox + PAD + 60;
  let y = oy + TITLE_BLOCK;
  let n = 0;
  steps.forEach((s, i) => {
    els.push(
      text(`${p}-step-${s.key}-label`, left, y, s.label, {
        fontSize: 17,
        strokeColor: i === 0 || i >= steps.length - 2 ? COLORS.ink : COLORS.muted,
        locked: true,
        customData: structure(fw.id, { role: "label", slot: `chain:${s.key}` }),
      }),
    );
    const box = { x: left, y: y + LABEL_H, width: BOX_W, height: BOX_H };
    els.push(rect(`${p}-step-${s.key}`, box, { locked: true, roundness: { type: 3 }, customData: structure(fw.id, { slot: `chain:${s.key}` }) }));
    const v = values[s.key];
    if (v?.text) {
      els.push(
        aiSticky(`${p}-ai-${n++}`, { x: box.x + 14, y: box.y + 10, width: BOX_W - 28, height: BOX_H - 20 }, v, fw.id, `chain:${s.key}`, opts.suggestionId, 16),
      );
    } else {
      els.push(ghost(`${p}-ghost-${s.key}`, box.x + 24, box.y + BOX_H / 2 - 10, s.hint, fw.id, `chain:${s.key}`));
    }
    y = box.y + BOX_H;
    if (i < steps.length - 1) {
      // next label sits GAP below; the arrow runs beside it to the next box
      els.push(arrow(`${p}-arrow-${i}`, left + BOX_W / 2, y + 6, left + BOX_W / 2, y + GAP + LABEL_H - 6, { strokeColor: COLORS.muted, locked: true, customData: structure(fw.id) }));
      y += GAP;
    }
  });
  const bounds = { x: ox, y: oy, width: BOX_W + PAD * 2 + 120, height: y - oy + PAD };
  return { frameworkId: fw.id, elements: wrapInFrame(p, fw, bounds, els), bounds };
}
