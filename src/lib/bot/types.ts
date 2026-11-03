/** Meeting-bot transcript, normalised across providers (session clock = ms since the bot joined). */
export type BotSegment = { id: string; startMs: number; endMs: number; text: string; completed: boolean; speaker?: string };

export type BotStatus = "joining" | "in_call" | "ended" | "error";

export type BotTranscript = { status: BotStatus; segments: BotSegment[]; message?: string };

/** Google Meet code from a link: https://meet.google.com/abc-defg-hij → abc-defg-hij */
export function meetCode(url: string): string | null {
  const m = /^https:\/\/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#].*)?$/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
}
