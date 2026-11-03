/**
 * Custom frameworks ("firms upload their own"): the library form's input →
 * a validated FrameworkTemplate, plus JSON import/export.
 */
import { BUILTIN_FRAMEWORKS } from "./builtins";
import { FrameworkTemplateSchema, type FrameworkTemplate, type LayoutType } from "./types";

export type CustomInput = {
  name: string;
  whenToUse: string;
  signals: string; // comma-separated
  layout: LayoutType;
  // matrix2x2
  xLabel?: string;
  yLabel?: string;
  topLeft?: string;
  topRight?: string;
  bottomLeft?: string;
  bottomRight?: string;
  itemNoun?: string;
  // canvas: one block per line
  blocks?: string;
  // table: one per line
  rows?: string;
  columns?: string;
  // chain
  problemLabel?: string;
  whyCount?: number;
  rootCauseLabel?: string;
  countermeasureLabel?: string;
};

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "framework";

const lines = (s?: string) =>
  (s ?? "")
    .split(/\n|;/)
    .map((x) => x.trim())
    .filter(Boolean);

const uniqueIds = (labels: string[]) => {
  const seen = new Map<string, number>();
  return labels.map((label) => {
    const base = slug(label);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { id: n ? `${base}-${n + 1}` : base, label };
  });
};

export function shortNameFor(name: string): string {
  const n = name.trim();
  if (n.length <= 22) return n;
  return n.replace(/\s+(matrix|map|canvas|framework|analysis)$/i, "").slice(0, 22).trim();
}

export type BuildResult = { ok: true; framework: FrameworkTemplate } | { ok: false; errors: string[] };

/** Build a custom framework from the form. `existingIds` keeps ids unique (pass the current id when editing). */
export function buildCustomFramework(input: CustomInput, existingIds: string[] = [], keepId?: string): BuildResult {
  const errors: string[] = [];
  const name = input.name.trim();
  if (!name) errors.push("Give the framework a name.");
  const whenToUse = input.whenToUse.trim();
  if (whenToUse.length < 12) errors.push("Describe when it helps in a sentence or two — the assistant reads this.");
  const signals = [...new Set(input.signals.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 30);
  if (signals.length < 2) errors.push("Add at least two signal phrases, separated by commas.");

  let layout: FrameworkTemplate["layout"] | null = null;
  switch (input.layout) {
    case "matrix2x2": {
      const req = { "horizontal axis": input.xLabel, "vertical axis": input.yLabel, "top-left quadrant": input.topLeft, "top-right quadrant": input.topRight, "bottom-left quadrant": input.bottomLeft, "bottom-right quadrant": input.bottomRight };
      for (const [k, v] of Object.entries(req)) if (!v?.trim()) errors.push(`Name the ${k}.`);
      layout = {
        type: "matrix2x2",
        x: { label: input.xLabel?.trim() ?? "", low: "Low", high: "High" },
        y: { label: input.yLabel?.trim() ?? "", low: "Low", high: "High" },
        quadrants: {
          topLeft: input.topLeft?.trim() ?? "",
          topRight: input.topRight?.trim() ?? "",
          bottomLeft: input.bottomLeft?.trim() ?? "",
          bottomRight: input.bottomRight?.trim() ?? "",
        },
        itemNoun: input.itemNoun?.trim() || "items",
      };
      break;
    }
    case "canvas": {
      const bl = lines(input.blocks).slice(0, 12);
      if (bl.length < 2) errors.push("List at least two blocks, one per line.");
      const columns = bl.length <= 4 ? 2 : 3;
      layout = {
        type: "canvas",
        columns,
        rows: Math.max(1, Math.ceil(bl.length / columns)),
        blocks: uniqueIds(bl).map((b, i) => ({ ...b, col: i % columns, row: Math.floor(i / columns), colSpan: 1, rowSpan: 1 })),
      };
      break;
    }
    case "table": {
      const rows = lines(input.rows).slice(0, 10);
      const cols = lines(input.columns).slice(0, 6);
      if (rows.length < 1) errors.push("List at least one row, one per line.");
      if (cols.length < 2) errors.push("List at least two columns, one per line.");
      layout = { type: "table", rows: uniqueIds(rows), columns: uniqueIds(cols) };
      break;
    }
    case "chain": {
      const whyCount = Math.round(Math.min(7, Math.max(1, Number(input.whyCount) || 5)));
      layout = {
        type: "chain",
        problemLabel: input.problemLabel?.trim() || "Problem",
        whyCount,
        rootCauseLabel: input.rootCauseLabel?.trim() || "Root cause",
        countermeasureLabel: input.countermeasureLabel?.trim() || "Countermeasure",
      };
      break;
    }
  }
  if (errors.length || !layout) return { ok: false, errors };

  let id = keepId ?? `custom-${slug(name)}`;
  if (!keepId) {
    const taken = new Set([...existingIds, ...BUILTIN_FRAMEWORKS.map((f) => f.id)]);
    let n = 2;
    const base = id;
    while (taken.has(id)) id = `${base}-${n++}`;
  }
  const parsed = FrameworkTemplateSchema.safeParse({
    id,
    name,
    shortName: shortNameFor(name),
    whenToUse,
    signals,
    tuned: false,
    source: "custom",
    layout,
  });
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  return { ok: true, framework: parsed.data };
}

/** Form values back from a framework (for editing). */
export function toInput(fw: FrameworkTemplate): CustomInput {
  const base = { name: fw.name, whenToUse: fw.whenToUse, signals: fw.signals.join(", "), layout: fw.layout.type };
  const l = fw.layout;
  switch (l.type) {
    case "matrix2x2":
      return { ...base, xLabel: l.x.label, yLabel: l.y.label, ...l.quadrants, itemNoun: l.itemNoun };
    case "canvas":
      return { ...base, blocks: l.blocks.map((b) => b.label).join("\n") };
    case "table":
      return { ...base, rows: l.rows.map((r) => r.label).join("\n"), columns: l.columns.map((c) => c.label).join("\n") };
    case "chain":
      return { ...base, problemLabel: l.problemLabel, whyCount: l.whyCount, rootCauseLabel: l.rootCauseLabel, countermeasureLabel: l.countermeasureLabel };
  }
}

export function exportCustomJson(list: FrameworkTemplate[]): string {
  return JSON.stringify({ kind: "consultant-in-a-computer/frameworks", version: 1, frameworks: list }, null, 2);
}

/** Parse an import file: an export bundle, an array, or a single framework. Built-in ids are refused. */
export function parseImport(text: string): { frameworks: FrameworkTemplate[]; errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { frameworks: [], errors: ["That file isn't valid JSON."] };
  }
  const arr: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { frameworks?: unknown }).frameworks)
      ? (data as { frameworks: unknown[] }).frameworks
      : [data];
  const builtin = new Set(BUILTIN_FRAMEWORKS.map((f) => f.id));
  const frameworks: FrameworkTemplate[] = [];
  const errors: string[] = [];
  arr.forEach((raw, i) => {
    const p = FrameworkTemplateSchema.safeParse({ ...(raw as object), source: "custom", tuned: false });
    if (!p.success) {
      errors.push(`Item ${i + 1}: ${p.error.issues[0]?.path.join(".")} ${p.error.issues[0]?.message}`);
      return;
    }
    const fw = p.data;
    if (builtin.has(fw.id)) fw.id = `custom-${fw.id}`;
    frameworks.push(fw);
  });
  return { frameworks, errors };
}

/** Merge imported frameworks into the list (same id replaces). */
export function mergeCustom(list: FrameworkTemplate[], incoming: FrameworkTemplate[]): FrameworkTemplate[] {
  const byId = new Map(list.map((f) => [f.id, f]));
  for (const f of incoming) byId.set(f.id, f);
  return [...byId.values()];
}
