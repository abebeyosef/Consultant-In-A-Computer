/**
 * Provisional (AI-placed) sticky handling — pure functions over Excalidraw-like
 * element objects, so they can be unit tested without the editor.
 *
 * An AI sticky is a container rectangle with customData.source === 'ai' and
 * state 'provisional', plus a bound text element. When the facilitator moves,
 * resizes or edits one, it becomes a solid neutral sticky ('accepted').
 *
 * Edit detection compares a signature (position, width, text) recorded at
 * placement — not raw versions, because Excalidraw bumps versions itself when
 * it re-measures text after fonts load.
 */
import { COLORS } from "@/lib/frameworks/skeleton";

export type El = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted?: boolean;
  version?: number;
  versionNonce?: number;
  containerId?: string | null;
  boundElements?: readonly { id: string; type: string }[] | null;
  customData?: Record<string, unknown> | undefined;
  strokeColor?: string;
  backgroundColor?: string;
  strokeStyle?: string;
  text?: string;
  originalText?: string;
  [k: string]: unknown;
};

export const SPARK_PREFIX = "✦ ";

export function isAiSticky(e: El): boolean {
  return !e.isDeleted && e.type === "rectangle" && e.customData?.source === "ai" && e.customData?.role === "sticky";
}
export function isProvisional(e: El): boolean {
  return isAiSticky(e) && e.customData?.state === "provisional";
}

export function boundText(elements: readonly El[], container: El): El | undefined {
  const id = container.boundElements?.find((b) => b.type === "text")?.id;
  return id ? elements.find((e) => e.id === id && !e.isDeleted) : undefined;
}

export function signature(elements: readonly El[], container: El): string {
  const t = boundText(elements, container);
  const txt = (t?.originalText ?? t?.text ?? "").replace(/\s+/g, " ").trim();
  return `${Math.round(container.x)},${Math.round(container.y)},${Math.round(container.width)}|${txt}`;
}

export type Placement = Record<string, string>;

export function recordPlacement(elements: readonly El[], existing: Placement = {}): Placement {
  const out: Placement = { ...existing };
  for (const e of elements) if (isProvisional(e) && !(e.id in out)) out[e.id] = signature(elements, e);
  return out;
}

/** Provisional stickies the user has changed since placement. */
export function detectEdited(elements: readonly El[], placement: Placement): string[] {
  const ids: string[] = [];
  for (const e of elements) {
    if (!isProvisional(e)) continue;
    const sig = placement[e.id];
    if (sig !== undefined && sig !== signature(elements, e)) ids.push(e.id);
  }
  return ids;
}

const bump = <T extends El>(e: T, patch: Partial<El>): T =>
  ({
    ...e,
    ...patch,
    version: (e.version ?? 1) + 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    updated: Date.now(),
  }) as T;

/** Turn the given provisional stickies into solid neutral ones (and drop the spark prefix). */
export function acceptElements<T extends El>(elements: readonly T[], ids: readonly string[]): T[] {
  const set = new Set(ids);
  const textIds = new Set<string>();
  for (const e of elements) {
    if (set.has(e.id)) {
      const t = e.boundElements?.find((b) => b.type === "text");
      if (t) textIds.add(t.id);
    }
  }
  return elements.map((e) => {
    if (set.has(e.id)) {
      return bump(e, {
        strokeColor: COLORS.ink,
        backgroundColor: COLORS.paper,
        strokeStyle: "solid",
        customData: { ...(e.customData ?? {}), state: "accepted" },
      });
    }
    if (textIds.has(e.id)) {
      const strip = (s?: string) => (s?.startsWith(SPARK_PREFIX) ? s.slice(SPARK_PREFIX.length) : s);
      return bump(e, { text: strip(e.text), originalText: strip(e.originalText) });
    }
    return e;
  });
}

/** Delete every provisional sticky (and its text). */
export function clearProvisional<T extends El>(elements: readonly T[]): T[] {
  const doomed = new Set<string>();
  for (const e of elements) {
    if (isProvisional(e)) {
      doomed.add(e.id);
      for (const b of e.boundElements ?? []) doomed.add(b.id);
    }
  }
  return elements.map((e) => (doomed.has(e.id) ? bump(e, { isDeleted: true }) : e));
}

export function provisionalIds(elements: readonly El[]): string[] {
  return elements.filter(isProvisional).map((e) => e.id);
}

/** Elements suitable for the room view / sharing: no provisional AI items or ghosts. */
export function acceptedOnly<T extends El>(elements: readonly T[]): T[] {
  const hidden = new Set<string>();
  for (const e of elements) {
    if (e.isDeleted) continue;
    if (isProvisional(e) || e.customData?.role === "ghost") {
      hidden.add(e.id);
      for (const b of e.boundElements ?? []) hidden.add(b.id);
    }
  }
  return elements.filter((e) => !e.isDeleted && !hidden.has(e.id) && !(e.containerId && hidden.has(e.containerId)));
}

/** The container (sticky) an element belongs to — itself, or its container for bound text. */
export function stickyFor(elements: readonly El[], el: El | undefined): El | undefined {
  if (!el) return undefined;
  if (el.type === "text" && el.containerId) return elements.find((e) => e.id === el.containerId);
  return el;
}
