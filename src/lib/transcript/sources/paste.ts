import { ReplaySource, type ReplayParagraph } from "./replay";

const TIMESTAMP = /^\s*[[(]?\d{1,2}:\d{2}(?::\d{2})?[\])]?\s*[-–—]?\s*/;
const SPEAKER = /^\s*(?:[A-Z][\w.'’-]*(?:\s[A-Z][\w.'’-]*){0,3}|Speaker\s*\d+|Participant\s*\d+)\s*:\s+/;

/** Turn pasted text (meeting exports, notes) into paragraphs: strips timestamps and speaker labels. */
export function parsePasted(raw: string): ReplayParagraph[] {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    const t = current.join(" ").replace(/\s+/g, " ").trim();
    if (t) paragraphs.push(t);
    current = [];
  };
  for (const line of lines) {
    let l = line.replace(TIMESTAMP, "");
    const hadSpeaker = SPEAKER.test(l);
    l = l.replace(SPEAKER, "").trim();
    if (!l) {
      flush();
      continue;
    }
    if (hadSpeaker && current.length) flush(); // a new speaker starts a new paragraph
    current.push(/[.!?…]["”']?$/.test(l) ? l : `${l}.`);
  }
  flush();
  return paragraphs.map((text) => ({ text }));
}

export function createPasteSource(text: string, opts: { speed?: number; startAtMs?: number; instant?: boolean } = {}) {
  return new ReplaySource({ kind: "paste", paragraphs: parsePasted(text), speed: opts.speed ?? 2, startAtMs: opts.startAtMs, instant: opts.instant });
}
