/**
 * Read-only share links: accepted elements compressed into the URL hash
 * (`/view#<lz-string>`). Nothing leaves the browser until the link is pasted.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { ExElement } from "./excalidraw";
import { acceptedOnly } from "./provisional";

export type SharedBoard = { v: 1; title: string; elements: ExElement[] };

// Fields Excalidraw restores with defaults if missing — dropped to keep links short.
const DROP = new Set(["versionNonce", "seed", "updated", "index", "link", "groupIds", "isDeleted"]);

function slim(e: ExElement): ExElement {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e)) {
    if (DROP.has(k)) continue;
    if (k === "customData") {
      const cd = v as Record<string, unknown> | undefined;
      if (cd) out.customData = { role: cd.role, state: cd.state, source: cd.source };
      continue;
    }
    out[k] = v;
  }
  return out as ExElement;
}

export function encodeShare(board: { title: string; elements: readonly ExElement[] }): string {
  const payload: SharedBoard = { v: 1, title: board.title, elements: acceptedOnly(board.elements).map(slim) };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShare(hash: string): SharedBoard | null {
  try {
    const raw = decompressFromEncodedURIComponent(hash.replace(/^#/, ""));
    if (!raw) return null;
    const data = JSON.parse(raw) as SharedBoard;
    if (data?.v !== 1 || !Array.isArray(data.elements) || typeof data.title !== "string") return null;
    return {
      v: 1,
      title: data.title.slice(0, 200),
      elements: data.elements.filter((e) => e && typeof e.id === "string" && typeof e.type === "string"),
    };
  } catch {
    return null;
  }
}

export function shareUrl(origin: string, board: { title: string; elements: readonly ExElement[] }): string {
  return `${origin}/view#${encodeShare(board)}`;
}

/** File-safe name from a title. */
export function fileName(title: string, ext: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "board";
  return `${base}.${ext}`;
}
