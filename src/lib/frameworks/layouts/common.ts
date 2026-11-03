import type { FrameworkTemplate } from "../types";
import { type Box, type SkelElement, type SkelFrame, COLORS, text } from "../skeleton";

export const TITLE_SIZE = 30;
export const PAD = 40;
export const TITLE_BLOCK = 92; // vertical space used by the title

export function titleElement(prefix: string, fw: FrameworkTemplate, ox: number, oy: number) {
  return text(`${prefix}-title`, ox + PAD, oy + 30, fw.name, {
    fontSize: TITLE_SIZE,
    strokeColor: COLORS.ink,
    locked: true,
    customData: { role: "title", frameworkId: fw.id },
  });
}

export function wrapInFrame(prefix: string, fw: FrameworkTemplate, box: Box, inner: SkelElement[]): SkelElement[] {
  const frame: SkelFrame = {
    id: `${prefix}-frame`,
    type: "frame",
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    name: fw.name,
    children: inner.map((e) => e.id),
    customData: { role: "frame", frameworkId: fw.id },
  };
  return [...inner, frame];
}

/** Plural noun → ghost label, e.g. "Add initiatives here". */
export function ghostLabel(noun: string) {
  return `Add ${noun} here`;
}
