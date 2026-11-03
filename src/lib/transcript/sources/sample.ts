import { SAMPLE_PARAGRAPHS } from "../sampleScript";
import { ReplaySource } from "./replay";

export function createSampleSource(opts: { speed?: number; startAtMs?: number } = {}) {
  return new ReplaySource({ kind: "sample", paragraphs: SAMPLE_PARAGRAPHS, speed: opts.speed ?? 1, startAtMs: opts.startAtMs });
}
