/**
 * Offline mock engine (BUILD_PLAN §6.5). Used when there's no API key, when
 * MOCK_MODE=1, or when a live call fails. Keyword scoring over each
 * framework's `signals`, per-framework reason templates, canned fills for the
 * scripted sample, and simple extraction otherwise.
 */
import { SAMPLE_CANNED_FILLS } from "@/lib/frameworks/sampleFills";
import type {
  AnyFill,
  CanvasFill,
  ChainFill,
  FrameworkTemplate,
  MatrixFill,
  TableFill,
} from "@/lib/frameworks/types";
import { splitSentences } from "@/lib/transcript/sampleScript";
import { checkEvidence, clampWords, normalise } from "./evidence";
import type { CatalogueEntry, CheckRequest, ModelCheck, SegmentLite } from "./schemas";

/* ---------- text utils ---------- */

export function stem(word: string): string {
  let w = word.toLowerCase().replace(/'s$/, "");
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es") && !w.endsWith("ses")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith("ly")) w = w.slice(0, -2);
  return w;
}

export function stemTokens(text: string): string[] {
  return normalise(text.replace(/-/g, " ")).split(" ").filter(Boolean).map(stem);
}

function containsPhrase(tokens: string[], phrase: string[]): number {
  if (!phrase.length) return 0;
  let count = 0;
  outer: for (let i = 0; i + phrase.length <= tokens.length; i++) {
    for (let j = 0; j < phrase.length; j++) if (tokens[i + j] !== phrase[j]) continue outer;
    count++;
  }
  return count;
}

/** Score = sum over matched signals of (1 + 0.5 per extra word in the phrase); repeats add a little. */
export function scoreSignals(text: string, signals: string[]) {
  const tokens = stemTokens(text);
  let score = 0;
  const hits: string[] = [];
  for (const sig of signals) {
    const phrase = stemTokens(sig);
    const c = containsPhrase(tokens, phrase);
    if (c > 0) {
      score += 1 + 0.5 * (phrase.length - 1) + Math.min(c - 1, 2) * 0.25;
      hits.push(sig);
    }
  }
  return { score, hits };
}

/* ---------- check ---------- */

export const MOCK_THRESHOLDS = { strong: 4.5, possible: 2 };

/** Specific frameworks win ties with their generic cousins. */
const PREFER: Record<string, string[]> = {
  "build-buy-partner": ["options-appraisal"],
  "value-feasibility": ["impact-effort"],
};

const REASONS: Record<string, string> = {
  "value-feasibility": "Sounds like you're weighing several ideas on value and how hard they'd be.",
  "impact-effort": "You're sorting actions by how much they'd help versus the effort involved.",
  swot: "The room is assessing strengths, gaps and outside pressures on your position.",
  "stakeholder-map": "Several people and their influence over this have come up — worth mapping who to involve.",
  jtbd: "You're circling what customers are really trying to get done.",
  "customer-journey": "Someone is walking through the experience step by step.",
  "five-whys": "A recurring problem keeps coming up; digging to the root cause could help.",
  "options-appraisal": "You're weighing a few alternatives and their trade-offs.",
  "business-model-canvas": "You're shaping how this would make money, reach customers and run.",
  "build-buy-partner": "You're choosing between building it, buying it or partnering.",
};

const HINTS: Record<string, string> = {
  "value-feasibility": "Several options compared on value and feasibility.",
  "impact-effort": "Concrete actions compared on impact and effort.",
  swot: "Strengths, weaknesses and outside forces discussed together.",
  "stakeholder-map": "Named people or teams with differing power and interest.",
  "build-buy-partner": "In-house versus vendor versus partnership trade-offs.",
};

export function reasonFor(fw: CatalogueEntry): string {
  return REASONS[fw.id] ?? `The conversation matches when you'd use ${fw.name.toLowerCase()}.`;
}
export function hintFor(id: string): string | undefined {
  return HINTS[id];
}

export function mockCheck(req: Pick<CheckRequest, "window" | "marked" | "catalogue" | "recent" | "muted" | "manual">): ModelCheck & {
  scores: Record<string, number>;
} {
  const segs = [...req.marked, ...req.window];
  const text = segs.map((s) => s.text).join(" ");
  const blocked = new Set([...req.recent, ...req.muted]);
  const scores: Record<string, number> = {};
  for (const fw of req.catalogue) scores[fw.id] = scoreSignals(text, fw.signals).score;

  const ranked = req.catalogue
    .filter((fw) => !blocked.has(fw.id))
    .map((fw) => ({ fw, score: scores[fw.id] }))
    .sort((a, b) => b.score - a.score);

  // apply preferences when the preferred framework is close behind
  if (ranked.length > 1) {
    const top = ranked[0];
    for (const [pref, over] of Object.entries(PREFER)) {
      if (over.includes(top.fw.id)) {
        const p = ranked.find((r) => r.fw.id === pref);
        if (p && p.score >= top.score * 0.75 && p.score >= MOCK_THRESHOLDS.possible) {
          ranked.splice(ranked.indexOf(p), 1);
          ranked.unshift(p);
        }
      }
    }
  }

  const best = ranked[0];
  if (!best || best.score < MOCK_THRESHOLDS.possible) {
    return { fit: "none", frameworkId: null, reason: "", evidenceQuote: "", scores };
  }
  const fit = best.score >= MOCK_THRESHOLDS.strong ? "strong" : "possible";

  // Evidence: the sentence with the most signal hits (prefer recent ones on ties).
  let bestSentence = "";
  let bestHits = 0;
  for (const s of segs) {
    for (const sentence of splitSentences(s.text)) {
      const { score } = scoreSignals(sentence, best.fw.signals);
      if (score >= bestHits && score > 0) {
        bestHits = score;
        bestSentence = sentence;
      }
    }
  }
  return { fit, frameworkId: best.fw.id, reason: reasonFor(best.fw), evidenceQuote: clampWords(bestSentence, 25), scores };
}

/* ---------- fill ---------- */

const SAMPLE_MARKERS = ["harbourline", "cancellation model", "podcast network"];

export function looksLikeSample(transcript: SegmentLite[]): boolean {
  const t = normalise(transcript.map((s) => s.text).join(" "));
  return SAMPLE_MARKERS.filter((m) => t.includes(m)).length >= 2;
}

const FILLER = /^(?:(?:okay|ok|so|and|but|well|right|honestly|actually|look|yeah|um|uh|i think|i guess|we think|basically|also|then)[,\s]+)+/i;

/** Sticky-note text from a sentence: drop filler, keep ~8 words. */
export function stickyText(sentence: string, maxWords = 8): string {
  const s = sentence.replace(FILLER, "").replace(/[.!?]+$/, "").trim();
  const words = s.split(/\s+/);
  const t = words.slice(0, maxWords).join(" ").replace(/[,;:]$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const HIGH_Y = ["valuable", "highest", "value", "important", "big", "revenue", "impact", "critical", "control", "sign off", "budget", "champion", "veto", "power"];
const LOW_Y = ["boring", "nice to have", "small", "minor", "no real", "eventually", "barely"];
const HIGH_X = ["easy", "quick", "simple", "weeks", "already", "cheap", "interested", "keen", "desperate", "vocal"];
const LOW_X = ["hard", "mess", "not sure", "months", "expensive", "difficult", "complex", "barely know", "no idea"];

function cueScore(sentence: string, hi: string[], lo: string[]): number {
  const n = normalise(sentence);
  let s = 3;
  for (const h of hi) if (n.includes(h)) s += 1;
  for (const l of lo) if (n.includes(l)) s -= 1;
  return Math.max(1, Math.min(5, s));
}

function candidateSentences(fw: FrameworkTemplate, transcript: SegmentLite[], max = 10) {
  const all = transcript.flatMap((s) => splitSentences(s.text));
  const scored = all.map((sentence, i) => ({ sentence, i, score: scoreSignals(sentence, fw.signals).score }));
  const picked = scored.filter((s) => s.score > 0);
  const pool = picked.length >= 3 ? picked : scored.filter((s) => s.sentence.split(/\s+/).length >= 5);
  const seen = new Set<string>();
  return pool
    .sort((a, b) => b.score - a.score || b.i - a.i)
    .filter((s) => {
      const k = stickyText(s.sentence).toLowerCase();
      if (seen.has(k) || !k) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max)
    .sort((a, b) => a.i - b.i)
    .map((s) => s.sentence);
}

export function mockFill(fw: FrameworkTemplate, transcript: SegmentLite[]): { fill: AnyFill; canned: boolean } {
  if (looksLikeSample(transcript) && SAMPLE_CANNED_FILLS[fw.id]) {
    return { fill: SAMPLE_CANNED_FILLS[fw.id], canned: true };
  }
  const sentences = candidateSentences(fw, transcript, fw.layout.type === "chain" ? 8 : 8);
  const l = fw.layout;
  switch (l.type) {
    case "matrix2x2": {
      const fill: MatrixFill = {
        items: sentences.slice(0, 8).map((s) => ({
          text: stickyText(s),
          x: cueScore(s, HIGH_X, LOW_X),
          y: cueScore(s, HIGH_Y, LOW_Y),
          sourceQuote: clampWords(s, 25),
        })),
      };
      return { fill, canned: false };
    }
    case "canvas": {
      const blocks: CanvasFill["blocks"] = {};
      sentences.forEach((s, i) => {
        const n = normalise(s);
        const match = l.blocks.find((b) => stemTokens(b.label).some((w) => w.length > 3 && stemTokens(n).includes(w)));
        const b = match ?? l.blocks[i % l.blocks.length];
        (blocks[b.id] ??= []).push({ text: stickyText(s), sourceQuote: clampWords(s, 25) });
      });
      return { fill: { blocks }, canned: false };
    }
    case "table": {
      const cols = l.columns.map((c) => c.label);
      const cells: TableFill["cells"] = sentences.slice(0, 9).map((s, i) => {
        const n = normalise(s);
        const col = cols.find((c) => n.includes(normalise(c))) ?? cols[i % cols.length];
        const row = l.rows.find((r) => stemTokens(r.label).some((w) => w.length > 3 && stemTokens(n).includes(w)))?.label ?? l.rows[i % l.rows.length].label;
        return { row, col, text: stickyText(s), sourceQuote: clampWords(s, 25) };
      });
      return { fill: { cells }, canned: false };
    }
    case "chain": {
      const [problem, ...rest] = sentences;
      const fill: ChainFill = {
        problem: problem ? { text: stickyText(problem), sourceQuote: clampWords(problem, 25) } : null,
        whys: rest.slice(0, Math.min(3, l.whyCount)).map((s) => ({ text: stickyText(s), sourceQuote: clampWords(s, 25) })),
        rootCause: null,
        countermeasure: null,
      };
      return { fill, canned: false };
    }
  }
}

/** Make fill quotes honest: keep verbatim ones, map near-misses to the real sentence, drop the rest. */
export function verifyFillQuotes<T extends AnyFill>(fill: T, transcript: SegmentLite[]): T {
  const fix = <I extends { sourceQuote?: string }>(item: I): I => {
    if (!item.sourceQuote) return item;
    const ev = checkEvidence(item.sourceQuote, transcript);
    return { ...item, sourceQuote: ev.quote || undefined };
  };
  const f = fill as AnyFill;
  if ("items" in f) return { ...f, items: f.items.map(fix) } as T;
  if ("blocks" in f) return { ...f, blocks: Object.fromEntries(Object.entries(f.blocks).map(([k, v]) => [k, v.map(fix)])) } as T;
  if ("cells" in f) return { ...f, cells: f.cells.map(fix) } as T;
  const c = f as ChainFill;
  return {
    ...c,
    problem: c.problem ? fix(c.problem) : c.problem,
    whys: (c.whys ?? []).map(fix),
    rootCause: c.rootCause ? fix(c.rootCause) : c.rootCause,
    countermeasure: c.countermeasure ? fix(c.countermeasure) : c.countermeasure,
  } as T;
}

/** Enforce plan limits: ≤ 12 items, short texts. */
export function limitFill<T extends AnyFill>(fill: T, max = 12): T {
  const short = <I extends { text: string }>(i: I): I => ({ ...i, text: clampWords(i.text, 10).replace(/…$/, "") });
  const f = fill as AnyFill;
  if ("items" in f) return { ...f, items: f.items.slice(0, max).map(short) } as T;
  if ("cells" in f) return { ...f, cells: f.cells.slice(0, max).map(short) } as T;
  if ("blocks" in f) {
    let left = max;
    const blocks: CanvasFill["blocks"] = {};
    for (const [k, v] of Object.entries(f.blocks)) {
      const take = v.slice(0, Math.max(0, left)).map(short);
      left -= take.length;
      if (take.length) blocks[k] = take;
    }
    return { ...f, blocks } as T;
  }
  const c = f as ChainFill;
  return {
    ...c,
    problem: c.problem ? short(c.problem) : c.problem,
    whys: (c.whys ?? []).map(short),
    rootCause: c.rootCause ? short(c.rootCause) : c.rootCause,
    countermeasure: c.countermeasure ? short(c.countermeasure) : c.countermeasure,
  } as T;
}
