import { z } from "zod";
import { FrameworkTemplateSchema } from "@/lib/frameworks/types";

export const SegmentLiteSchema = z.object({
  id: z.string(),
  text: z.string().max(4000),
  startMs: z.number().optional(),
});
export type SegmentLite = z.infer<typeof SegmentLiteSchema>;

export const CatalogueEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  whenToUse: z.string(),
  signals: z.array(z.string()),
});
export type CatalogueEntry = z.infer<typeof CatalogueEntrySchema>;

export const CheckRequestSchema = z.object({
  window: z.array(SegmentLiteSchema).max(400),
  marked: z.array(SegmentLiteSchema).max(50).default([]),
  catalogue: z.array(CatalogueEntrySchema).min(1).max(60),
  recent: z.array(z.string()).default([]),
  muted: z.array(z.string()).default([]),
  manual: z.boolean().default(false),
});
export type CheckRequest = z.infer<typeof CheckRequestSchema>;

/** What the model must return for a check. */
export const ModelCheckSchema = z.object({
  fit: z.enum(["strong", "possible", "none"]),
  frameworkId: z.string().nullable(),
  reason: z.string(),
  evidenceQuote: z.string(),
});
export type ModelCheck = z.infer<typeof ModelCheckSchema>;

export type CheckResult = {
  fit: "strong" | "possible" | "none";
  frameworkId: string | null;
  reason: string;
  evidenceQuote: string;
  evidenceSegmentIds: string[];
  fitHint?: string;
  engine: "live" | "mock";
  latencyMs: number;
};

export const FillRequestSchema = z.object({
  framework: FrameworkTemplateSchema,
  transcript: z.array(SegmentLiteSchema).max(1500),
  marked: z.array(SegmentLiteSchema).max(50).default([]),
});
export type FillRequest = z.infer<typeof FillRequestSchema>;

export type FillResult = {
  fill: unknown;
  engine: "live" | "mock";
  latencyMs: number;
  /** true if the mock used the canned sample-workshop fill */
  canned?: boolean;
};
