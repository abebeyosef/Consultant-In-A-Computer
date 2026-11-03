import type { FrameworkTemplate } from "@/lib/frameworks/types";
import { formatTimestamp } from "@/lib/transcript/store";
import type { CatalogueEntry, SegmentLite } from "./schemas";

export const CHECK_SYSTEM = `You are a senior strategy consultant quietly supporting a workshop facilitator.
You read the latest part of a live workshop transcript and decide whether ONE
framework from the catalogue would genuinely help structure the discussion
right now. Be conservative: most of the time the answer is "none".

Return "strong" only when the room is clearly doing the work the framework is
for (e.g. comparing several options on two dimensions, mapping people and their
influence, weighing build/buy/partner). Return "possible" when it might help.
Return "none" for logistics, small talk, introductions, recaps of decisions
already made, or when the conversation is not yet substantive.
Never suggest a framework in the "recently suggested" or "muted" lists.

Disambiguation:
- Use value-feasibility for choosing among strategic opportunities, ideas or use cases;
  use impact-effort for prioritising concrete actions, fixes or tasks.
- Prefer build-buy-partner over options-appraisal when the options are literally
  building, buying or partnering.
- Use stakeholder-map when several named people/teams and their influence,
  sign-off, support or resistance are being discussed.

The reason must be ONE short sentence of at most 18 words, written to the facilitator,
grounded in what was said ("You've listed six ideas and keep weighing value
against effort."). No hype, no percentages.
The evidenceQuote must be copied exactly from the transcript (max 25 words).
If fit is "none", set frameworkId to null and leave reason and evidenceQuote empty.
Reply with JSON matching the schema: {"fit": "strong"|"possible"|"none", "frameworkId": string|null, "reason": string, "evidenceQuote": string}.`;

function lines(segs: SegmentLite[]) {
  return segs.map((s) => `${s.startMs !== undefined ? `[${formatTimestamp(s.startMs)}] ` : ""}${s.text}`).join("\n");
}

export function buildCheckUser(opts: {
  window: SegmentLite[];
  marked: SegmentLite[];
  catalogue: CatalogueEntry[];
  recent: string[];
  muted: string[];
  manual: boolean;
}) {
  const cat = opts.catalogue
    .map((c) => `- ${c.id} — ${c.name}: ${c.whenToUse} Signals: ${c.signals.slice(0, 15).join("; ")}.`)
    .join("\n");
  return `FRAMEWORK CATALOGUE
${cat}

RECENTLY SUGGESTED (do not suggest): ${opts.recent.length ? opts.recent.join(", ") : "none"}
MUTED (do not suggest): ${opts.muted.length ? opts.muted.join(", ") : "none"}
${opts.manual ? "The facilitator pressed \"Suggest a framework\": pick the most helpful framework if any reasonably fits (\"possible\" is fine), otherwise \"none\".\n" : ""}
${opts.marked.length ? `MOMENTS THE FACILITATOR MARKED AS IMPORTANT\n${lines(opts.marked)}\n\n` : ""}LATEST TRANSCRIPT
${lines(opts.window)}`;
}

function layoutSpec(fw: FrameworkTemplate): string {
  const l = fw.layout;
  switch (l.type) {
    case "matrix2x2":
      return `Layout: 2x2 matrix. x axis = ${l.x.label} (1 = ${l.x.low}, 5 = ${l.x.high}); y axis = ${l.y.label} (1 = ${l.y.low}, 5 = ${l.y.high}).
Quadrants: top-right "${l.quadrants.topRight}", top-left "${l.quadrants.topLeft}", bottom-right "${l.quadrants.bottomRight}", bottom-left "${l.quadrants.bottomLeft}".
Each item is one ${l.itemNoun.replace(/s$/, "")} the room discussed, scored 1-5 on each axis as judged from the conversation.
Return: {"items": [{"text": "...", "x": 1-5, "y": 1-5, "sourceQuote": "..."}]}`;
    case "canvas":
      return `Layout: canvas with named blocks. Block ids: ${l.blocks.map((b) => `"${b.id}" (${b.label}${b.hint ? ` — ${b.hint}` : ""})`).join(", ")}.
Return: {"blocks": {"<blockId>": [{"text": "...", "sourceQuote": "..."}]}} using only those block ids; omit blocks the room didn't talk about.`;
    case "table":
      return `Layout: table. Rows: ${l.rows.map((r) => `"${r.label}"`).join(", ")}. ${
        l.dynamicColumns
          ? `Columns are the ${l.dynamicColumns.noun} the room discussed (${l.dynamicColumns.min}-${l.dynamicColumns.max}); name them in "columns" (short labels). Defaults if unclear: ${l.columns.map((c) => `"${c.label}"`).join(", ")}.`
          : `Columns: ${l.columns.map((c) => `"${c.label}"`).join(", ")}.`
      }
Return: {${l.dynamicColumns ? `"columns": ["..."], ` : ""}"cells": [{"row": "<row label>", "col": "<column label>", "text": "...", "sourceQuote": "..."}]}`;
    case "chain":
      return `Layout: five whys chain: ${l.problemLabel} → Why 1..${l.whyCount} → ${l.rootCauseLabel} → ${l.countermeasureLabel}.
Return: {"problem": {"text","sourceQuote"} | null, "whys": [{"text","sourceQuote"}], "rootCause": {...} | null, "countermeasure": {...} | null}`;
  }
}

export const FILL_SYSTEM = `You pre-fill a consulting framework from a live workshop transcript so the facilitator
can start from what the room actually said. Rules:
- Use only what was said in the room. Never invent facts, names or numbers.
- Item text is short and concrete, sticky-note style: at most 8 words.
- Each item's sourceQuote is copied verbatim from the transcript (max 25 words).
- Include every option, idea, person or point the room actually named that belongs on this
  framework — even ones mentioned only once in a list — up to 12 items in total.
- For matrices, give integer scores 1-5 on each axis judged from the conversation; when the
  room gave no view on an axis for an item, score it 3.
- If the room said nothing relevant to a slot, leave it empty — the board shows a placeholder.
Reply with JSON only.`;

export function buildFillUser(fw: FrameworkTemplate, transcript: SegmentLite[], marked: SegmentLite[]) {
  return `FRAMEWORK: ${fw.name}
When it's used: ${fw.whenToUse}
${layoutSpec(fw)}

${marked.length ? `MARKED MOMENTS\n${lines(marked)}\n\n` : ""}TRANSCRIPT
${lines(transcript)}`;
}
