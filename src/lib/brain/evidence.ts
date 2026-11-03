import { splitSentences } from "@/lib/transcript/sampleScript";

/**
 * Evidence check: make sure a quote shown to the facilitator really appears in
 * the transcript. Exact (normalised) matches are kept; otherwise the closest
 * transcript sentence is used if it overlaps strongly; otherwise the quote is
 * dropped rather than showing invented words.
 */

type Seg = { id: string; text: string };

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP = new Set("a an the and or but so to of in on at for with is are was were be it its it's that this we i you they our us me my your their them there here as by from if not no yes do does did have has had will would can could should just really very".split(" "));

function words(s: string): string[] {
  return normalise(s).split(" ").filter(Boolean);
}

function contentWords(s: string): string[] {
  return words(s).filter((w) => !STOP.has(w) && w.length > 1);
}

export function clampWords(s: string, max = 25): string {
  const w = s.trim().split(/\s+/);
  return w.length <= max ? s.trim() : `${w.slice(0, max).join(" ")}…`;
}

/** Map an (exact, normalised) quote to the segment ids it spans. */
export function matchQuoteToSegments(quote: string, segments: Seg[]): string[] {
  const q = normalise(quote.replace(/…$/, ""));
  if (!q) return [];
  let joined = "";
  const spans: { id: string; start: number; end: number }[] = [];
  for (const s of segments) {
    const n = normalise(s.text);
    if (!n) continue;
    const start = joined.length ? joined.length + 1 : 0;
    joined = joined ? `${joined} ${n}` : n;
    spans.push({ id: s.id, start, end: joined.length });
  }
  const at = joined.lastIndexOf(q);
  if (at >= 0) return spans.filter((sp) => sp.end > at && sp.start < at + q.length).map((sp) => sp.id);
  // fall back: best overlapping segment
  const best = bestSentence(quote, segments);
  return best && best.score >= 0.5 ? [best.segId] : [];
}

function bestSentence(quote: string, segments: Seg[]) {
  const qw = new Set(contentWords(quote));
  if (qw.size === 0) return null;
  let best: { sentence: string; segId: string; score: number } | null = null;
  for (const s of segments) {
    for (const sentence of splitSentences(s.text)) {
      const sw = new Set(contentWords(sentence));
      if (!sw.size) continue;
      let hit = 0;
      for (const w of qw) if (sw.has(w)) hit++;
      const score = hit / qw.size;
      if (!best || score > best.score) best = { sentence, segId: s.id, score };
    }
  }
  return best;
}

export type Evidence = { quote: string; segmentIds: string[]; verbatim: boolean };

export function checkEvidence(quote: string | null | undefined, segments: Seg[], minOverlap = 0.5): Evidence {
  const q = (quote ?? "").trim().replace(/^["“']+|["”']+$/g, "");
  if (!q) return { quote: "", segmentIds: [], verbatim: false };
  const joined = normalise(segments.map((s) => s.text).join(" "));
  if (normalise(q) && joined.includes(normalise(q))) {
    return { quote: clampWords(q), segmentIds: matchQuoteToSegments(q, segments), verbatim: true };
  }
  const best = bestSentence(q, segments);
  if (best && best.score >= minOverlap) {
    return { quote: clampWords(best.sentence), segmentIds: [best.segId], verbatim: false };
  }
  return { quote: "", segmentIds: [], verbatim: false };
}
