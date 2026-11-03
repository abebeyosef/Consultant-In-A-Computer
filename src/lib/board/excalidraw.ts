/**
 * Client-only bridge to Excalidraw. Everything here dynamically imports the
 * package so it never runs during SSR or in unit tests.
 */
import type { BoardSkeleton } from "@/lib/frameworks/skeleton";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}

export type ExElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  locked: boolean;
  frameId: string | null;
  containerId?: string | null;
  boundElements?: { id: string; type: string }[] | null;
  customData?: Record<string, unknown>;
  strokeColor: string;
  backgroundColor: string;
  strokeStyle: string;
  text?: string;
  originalText?: string;
  [k: string]: unknown;
};

export function ensureAssetPath() {
  if (typeof window !== "undefined" && !window.EXCALIDRAW_ASSET_PATH) {
    window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/";
  }
}

let modPromise: Promise<typeof import("@excalidraw/excalidraw")> | null = null;
export function loadExcalidraw() {
  ensureAssetPath();
  modPromise ??= import("@excalidraw/excalidraw");
  return modPromise;
}

export async function skeletonToElements(sk: BoardSkeleton): Promise<ExElement[]> {
  const { convertToExcalidrawElements } = await loadExcalidraw();
  // Our skeleton is a strict subset of ExcalidrawElementSkeleton.
  const els = convertToExcalidrawElements(sk.elements as unknown as Parameters<typeof convertToExcalidrawElements>[0], {
    regenerateIds: false,
  });
  return els as unknown as ExElement[];
}

export async function elementsToSvg(elements: ExElement[], opts: { dark?: boolean; padding?: number } = {}) {
  const { exportToSvg } = await loadExcalidraw();
  return exportToSvg({
    elements: elements as never,
    appState: { exportBackground: false, exportWithDarkMode: !!opts.dark, viewBackgroundColor: "transparent" },
    files: null,
    exportPadding: opts.padding ?? 16,
    skipInliningFonts: true,
  });
}

const BOARD_PAPER = "#f8f7f3";

/** PNG of the given elements on paper, 2× for crisp slides. */
export async function elementsToPng(elements: readonly ExElement[]): Promise<Blob> {
  const { exportToBlob } = await loadExcalidraw();
  return exportToBlob({
    elements: elements.filter((e) => !e.isDeleted) as never,
    appState: { exportBackground: true, viewBackgroundColor: BOARD_PAPER, exportWithDarkMode: false, exportScale: 2 },
    files: null,
    mimeType: "image/png",
    exportPadding: 32,
  });
}

/** A `.excalidraw` file (opens in excalidraw.com or the desktop app). */
export async function elementsToExcalidrawJson(elements: readonly ExElement[]): Promise<string> {
  const { serializeAsJSON } = await loadExcalidraw();
  return serializeAsJSON(elements.filter((e) => !e.isDeleted) as never, { viewBackgroundColor: BOARD_PAPER }, {}, "local");
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
