/**
 * Pure, Excalidraw-free description of a board. Converted to real Excalidraw
 * elements on the client with `convertToExcalidrawElements` (see board/toExcalidraw.ts).
 */

export const COLORS = {
  ink: "#17191d",
  muted: "#5e6470",
  ghost: "#a2a6ae",
  hairline: "#d6d3ca",
  paper: "#ffffff",
  zone: "#faf9f6",
  aiFill: "#fcefd4",
  aiStroke: "#e8a317",
  transparent: "transparent",
} as const;

/** Helvetica — a clean system sans (Excalidraw FONT_FAMILY.Helvetica). */
export const FONT_SANS = 2;

export type ElementRole = "frame" | "title" | "structure" | "label" | "ghost" | "sticky";

export type BoardCustomData = {
  role: ElementRole;
  frameworkId: string;
  /** slot key: "q:topRight", "b:strengths", "c:<row>|<col>", "chain:why-2" … */
  slot?: string;
  source?: "ai" | "user";
  suggestionId?: string;
  sourceQuote?: string;
  state?: "provisional" | "accepted";
};

type Base = {
  id: string;
  x: number;
  y: number;
  locked?: boolean;
  customData?: BoardCustomData;
  strokeColor?: string;
  backgroundColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  roughness?: number;
  opacity?: number;
  roundness?: { type: number } | null;
};

export type SkelRect = Base & {
  type: "rectangle";
  width: number;
  height: number;
  label?: { text: string; fontSize?: number; fontFamily?: number; textAlign?: "left" | "center" | "right"; verticalAlign?: "top" | "middle" | "bottom"; strokeColor?: string };
};
export type SkelText = Base & {
  type: "text";
  text: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
};
export type SkelLine = Base & { type: "line" | "arrow"; width: number; height: number; points: [number, number][]; endArrowhead?: "arrow" | "triangle" | null; startArrowhead?: null };
export type SkelFrame = { id: string; type: "frame"; x: number; y: number; width: number; height: number; name: string; children: string[]; customData?: BoardCustomData };

export type SkelElement = SkelRect | SkelText | SkelLine | SkelFrame;

export type Box = { x: number; y: number; width: number; height: number };

export type BoardSkeleton = {
  frameworkId: string;
  elements: SkelElement[];
  bounds: Box;
};

export type RenderOptions = {
  /** prefix for every element id (unique per board) */
  idPrefix: string;
  /** suggestion that produced the fill (stored on AI stickies) */
  suggestionId?: string;
  /** top-left origin of the frame */
  origin?: { x: number; y: number };
  /** prefix for AI sticky ids (defaults to idPrefix); differs per re-fill so ids stay unique */
  stickyIdPrefix?: string;
};

/* ---------- builders ---------- */

export function clampText(text: string, max = 64): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, "")}…`;
}

const structure = (frameworkId: string, extra?: Partial<BoardCustomData>): BoardCustomData => ({
  role: "structure",
  frameworkId,
  ...extra,
});

export function rect(id: string, b: Box, opts: Partial<SkelRect> = {}): SkelRect {
  return {
    type: "rectangle",
    id,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    strokeColor: COLORS.ink,
    backgroundColor: COLORS.transparent,
    strokeWidth: 1.5,
    roughness: 0,
    fillStyle: "solid",
    roundness: null,
    ...opts,
  };
}

export function text(id: string, x: number, y: number, value: string, opts: Partial<SkelText> = {}): SkelText {
  return {
    type: "text",
    id,
    x,
    y,
    text: value,
    fontSize: 16,
    fontFamily: FONT_SANS,
    strokeColor: COLORS.ink,
    roughness: 0,
    ...opts,
  };
}

export function line(id: string, x1: number, y1: number, x2: number, y2: number, opts: Partial<SkelLine> = {}): SkelLine {
  return {
    type: "line",
    id,
    x: x1,
    y: y1,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    strokeColor: COLORS.ink,
    strokeWidth: 1.5,
    roughness: 0,
    ...opts,
  };
}

export function arrow(id: string, x1: number, y1: number, x2: number, y2: number, opts: Partial<SkelLine> = {}): SkelLine {
  return { ...line(id, x1, y1, x2, y2, opts), type: "arrow", endArrowhead: "triangle", startArrowhead: null, ...opts };
}

export type StickyInput = { text: string; sourceQuote?: string };

export const STICKY = { width: 180, height: 84, fontSize: 15, gap: 12 };

/** An AI-placed, provisional sticky note. */
export function aiSticky(
  id: string,
  b: Box,
  item: StickyInput,
  frameworkId: string,
  slot: string,
  suggestionId?: string,
  fontSize = STICKY.fontSize,
): SkelRect {
  return rect(id, b, {
    strokeColor: COLORS.aiStroke,
    backgroundColor: COLORS.aiFill,
    strokeStyle: "dashed",
    strokeWidth: 1.5,
    roundness: { type: 3 },
    label: {
      text: `✦ ${clampText(item.text, 64)}`,
      fontSize,
      fontFamily: FONT_SANS,
      textAlign: "center",
      verticalAlign: "middle",
      strokeColor: COLORS.ink,
    },
    customData: {
      role: "sticky",
      frameworkId,
      slot,
      source: "ai",
      suggestionId,
      sourceQuote: item.sourceQuote,
      state: "provisional",
    },
  });
}

export function ghost(id: string, x: number, y: number, value: string, frameworkId: string, slot: string, opts: Partial<SkelText> = {}): SkelText {
  return text(id, x, y, value, {
    fontSize: 16,
    strokeColor: COLORS.ghost,
    locked: true,
    customData: { role: "ghost", frameworkId, slot },
    ...opts,
  });
}

/** Rough width estimate for Helvetica text (used to centre labels without measuring). */
export function estimateTextWidth(value: string, fontSize: number): number {
  return Math.round(value.length * fontSize * 0.55);
}

export function centredText(id: string, cx: number, y: number, value: string, opts: Partial<SkelText> = {}): SkelText {
  const fs = opts.fontSize ?? 16;
  return text(id, cx - estimateTextWidth(value, fs) / 2, y, value, { textAlign: "center", ...opts });
}

export { structure };

/**
 * Assign items to the nearest free cell in a grid. Cells are pre-computed
 * non-overlapping boxes, so the result never overlaps.
 */
export function packIntoCells<T>(
  items: { item: T; target: { x: number; y: number }; preferred: (cell: Box & { group: string }) => boolean }[],
  cells: (Box & { group: string })[],
): { item: T; cell: Box & { group: string } }[] {
  const free = new Set(cells.map((_, i) => i));
  const out: { item: T; cell: Box & { group: string } }[] = [];
  for (const { item, target, preferred } of items) {
    let best = -1;
    let bestScore = Infinity;
    for (const i of free) {
      const c = cells[i];
      const cx = c.x + c.width / 2;
      const cy = c.y + c.height / 2;
      const d = Math.hypot(cx - target.x, cy - target.y) + (preferred(c) ? 0 : 1_000_000);
      if (d < bestScore) {
        bestScore = d;
        best = i;
      }
    }
    if (best === -1) break; // no room left — caller handles overflow
    free.delete(best);
    out.push({ item, cell: cells[best] });
  }
  return out;
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
