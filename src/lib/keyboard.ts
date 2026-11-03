/** True when a keyboard event is aimed at a text field or the whiteboard (so app shortcuts should stand down). */
export function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return false;
}

export function isInsideBoard(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t?.closest?.(".excalidraw");
}

export function isCmdK(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k";
}

/** ⌘K anywhere, or "/" when not typing. */
export function isFrameworkMenuKey(e: KeyboardEvent): boolean {
  if (isCmdK(e)) return true;
  return e.key === "/" && !e.metaKey && !e.ctrlKey && !isTypingTarget(e);
}
