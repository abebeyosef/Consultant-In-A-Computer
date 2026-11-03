import { z } from "zod";

/* ---------- Layout definitions (data, not code) ---------- */

export const AxisSchema = z.object({
  label: z.string().min(1),
  low: z.string().default("Low"),
  high: z.string().default("High"),
});

export const Matrix2x2LayoutSchema = z.object({
  type: z.literal("matrix2x2"),
  x: AxisSchema,
  y: AxisSchema,
  /** quadrant names, keyed by position */
  quadrants: z.object({
    topLeft: z.string(),
    topRight: z.string(),
    bottomLeft: z.string(),
    bottomRight: z.string(),
  }),
  /** plural noun for ghost labels, e.g. "initiatives" → "Add initiatives here" */
  itemNoun: z.string().default("items"),
});

export const CanvasBlockSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  hint: z.string().optional(),
  col: z.number().int().min(0),
  row: z.number().int().min(0),
  colSpan: z.number().int().min(1).default(1),
  rowSpan: z.number().int().min(1).default(1),
});

export const CanvasLayoutSchema = z.object({
  type: z.literal("canvas"),
  columns: z.number().int().min(1),
  rows: z.number().int().min(1),
  blocks: z.array(CanvasBlockSchema).min(1),
});

export const TableAxisItemSchema = z.object({ id: z.string().min(1), label: z.string().min(1), hint: z.string().optional() });

export const TableLayoutSchema = z.object({
  type: z.literal("table"),
  rows: z.array(TableAxisItemSchema).min(1),
  columns: z.array(TableAxisItemSchema).min(1),
  /** when set, the fill may supply its own column headers (stages, options) */
  dynamicColumns: z
    .object({ min: z.number().int().min(1), max: z.number().int().min(1), noun: z.string() })
    .optional(),
});

export const ChainLayoutSchema = z.object({
  type: z.literal("chain"),
  problemLabel: z.string().default("Problem"),
  whyCount: z.number().int().min(1).max(7).default(5),
  rootCauseLabel: z.string().default("Root cause"),
  countermeasureLabel: z.string().default("Countermeasure"),
});

export const LayoutSchema = z.discriminatedUnion("type", [
  Matrix2x2LayoutSchema,
  CanvasLayoutSchema,
  TableLayoutSchema,
  ChainLayoutSchema,
]);

export type Matrix2x2Layout = z.infer<typeof Matrix2x2LayoutSchema>;
export type CanvasLayout = z.infer<typeof CanvasLayoutSchema>;
export type TableLayout = z.infer<typeof TableLayoutSchema>;
export type ChainLayout = z.infer<typeof ChainLayoutSchema>;
export type Layout = z.infer<typeof LayoutSchema>;
export type LayoutType = Layout["type"];

export const FrameworkTemplateSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  shortName: z.string().min(1),
  whenToUse: z.string().min(1),
  signals: z.array(z.string().min(1)).min(1),
  tuned: z.boolean().default(false),
  source: z.enum(["builtin", "custom"]),
  layout: LayoutSchema,
});
export type FrameworkTemplate = z.infer<typeof FrameworkTemplateSchema>;

/* ---------- Fill payloads (what /api/fill returns) ---------- */

const shortText = z.string().trim().min(1).max(120);

export const FillItemSchema = z.object({
  text: shortText,
  sourceQuote: z.string().max(400).optional(),
});
export type FillItem = z.infer<typeof FillItemSchema>;

const score = z.coerce.number().min(1).max(5).transform((n) => Math.round(n));

export const MatrixFillSchema = z.object({
  items: z.array(FillItemSchema.extend({ x: score, y: score })).max(20),
});
export const CanvasFillSchema = z.object({
  blocks: z.record(z.string(), z.array(FillItemSchema)),
});
export const TableFillSchema = z.object({
  columns: z.array(z.string().trim().min(1).max(40)).optional(),
  cells: z.array(
    FillItemSchema.extend({ row: z.string().min(1), col: z.string().min(1) }),
  ),
});
export const ChainFillSchema = z.object({
  problem: FillItemSchema.nullish(),
  whys: z.array(FillItemSchema).max(7).default([]),
  rootCause: FillItemSchema.nullish(),
  countermeasure: FillItemSchema.nullish(),
});

export type MatrixFill = z.infer<typeof MatrixFillSchema>;
export type CanvasFill = z.infer<typeof CanvasFillSchema>;
export type TableFill = z.infer<typeof TableFillSchema>;
export type ChainFill = z.infer<typeof ChainFillSchema>;
export type AnyFill = MatrixFill | CanvasFill | TableFill | ChainFill;

export function fillSchemaFor(layout: LayoutType) {
  switch (layout) {
    case "matrix2x2":
      return MatrixFillSchema;
    case "canvas":
      return CanvasFillSchema;
    case "table":
      return TableFillSchema;
    case "chain":
      return ChainFillSchema;
  }
}

/** Count items in any fill payload. */
export function countFillItems(layout: LayoutType, fill: AnyFill | null | undefined): number {
  if (!fill) return 0;
  switch (layout) {
    case "matrix2x2":
      return (fill as MatrixFill).items?.length ?? 0;
    case "canvas":
      return Object.values((fill as CanvasFill).blocks ?? {}).reduce((n, a) => n + a.length, 0);
    case "table":
      return (fill as TableFill).cells?.length ?? 0;
    case "chain": {
      const c = fill as ChainFill;
      return (c.problem ? 1 : 0) + (c.whys?.length ?? 0) + (c.rootCause ? 1 : 0) + (c.countermeasure ? 1 : 0);
    }
  }
}
