/**
 * Check scheduler and pacing rules (BUILD_PLAN §6.4). Pure: all time is the
 * session clock in ms, passed in by the caller.
 */

export type PacingProfile = {
  checkEveryMs: number;
  minNewWords: number;
  minGapBetweenFlagsMs: number;
  sameFrameworkCooldownMs: number;
};

export const PACING = {
  default: { checkEveryMs: 30_000, minNewWords: 40, minGapBetweenFlagsMs: 120_000, sameFrameworkCooldownMs: 600_000 },
  demo: { checkEveryMs: 15_000, minNewWords: 40, minGapBetweenFlagsMs: 45_000, sameFrameworkCooldownMs: 600_000 },
} satisfies Record<string, PacingProfile>;

export type PacingName = keyof typeof PACING;

export type SchedulerState = {
  lastCheckAtMs: number | null;
  wordsAtLastCheck: number;
  inFlight: boolean;
  lastAutoFlagAtMs: number | null;
  /** last time each framework was flagged (auto or manual) */
  flaggedAt: Record<string, number>;
};

export const initialScheduler = (): SchedulerState => ({
  lastCheckAtMs: null,
  wordsAtLastCheck: 0,
  inFlight: false,
  lastAutoFlagAtMs: null,
  flaggedAt: {},
});

export type Trigger = "tick" | "mark" | "manual";

export function shouldCheck(st: SchedulerState, nowMs: number, totalWords: number, p: PacingProfile, trigger: Trigger): boolean {
  if (st.inFlight) return false;
  if (trigger === "manual") return true;
  const newWords = totalWords - st.wordsAtLastCheck;
  if (trigger === "mark") return totalWords > 0 && autoGapOpen(st, nowMs, p);
  if (newWords < p.minNewWords) return false;
  if (st.lastCheckAtMs !== null && nowMs - st.lastCheckAtMs < p.checkEveryMs) return false;
  // No point asking if an auto flag couldn't be shown yet.
  return autoGapOpen(st, nowMs, p);
}

export function autoGapOpen(st: SchedulerState, nowMs: number, p: PacingProfile): boolean {
  return st.lastAutoFlagAtMs === null || nowMs - st.lastAutoFlagAtMs >= p.minGapBetweenFlagsMs;
}

/** Frameworks the model must not suggest right now. */
export function blockedFrameworks(st: SchedulerState, nowMs: number, p: PacingProfile, muted: string[]): { recent: string[]; muted: string[] } {
  const recent = Object.entries(st.flaggedAt)
    .filter(([, at]) => nowMs - at < p.sameFrameworkCooldownMs)
    .map(([id]) => id);
  return { recent, muted };
}

export function canFlag(st: SchedulerState, nowMs: number, p: PacingProfile, frameworkId: string, manual: boolean, muted: string[]): boolean {
  if (muted.includes(frameworkId)) return false;
  if (manual) return true;
  const last = st.flaggedAt[frameworkId];
  if (last !== undefined && nowMs - last < p.sameFrameworkCooldownMs) return false;
  return autoGapOpen(st, nowMs, p);
}

export function beginCheck(st: SchedulerState, nowMs: number, totalWords: number): SchedulerState {
  return { ...st, inFlight: true, lastCheckAtMs: nowMs, wordsAtLastCheck: totalWords };
}

export function endCheck(st: SchedulerState): SchedulerState {
  return { ...st, inFlight: false };
}

export function recordFlag(st: SchedulerState, nowMs: number, frameworkId: string, manual: boolean): SchedulerState {
  return {
    ...st,
    lastAutoFlagAtMs: manual ? st.lastAutoFlagAtMs : nowMs,
    flaggedAt: { ...st.flaggedAt, [frameworkId]: nowMs },
  };
}
