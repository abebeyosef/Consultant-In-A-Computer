/** "Copy session notes": a plain Markdown record of the session. */
import type { ExElement } from "@/lib/board/excalidraw";
import { SPARK_PREFIX } from "@/lib/board/provisional";
import { formatTimestamp } from "@/lib/transcript/store";
import type { Session } from "./types";

type BoardLike = { title: string; elements: readonly ExElement[] };

function textOf(els: readonly ExElement[], container: ExElement): string {
  const id = container.boundElements?.find((b) => b.type === "text")?.id;
  const t = id ? els.find((e) => e.id === id && !e.isDeleted) : undefined;
  return String(t?.originalText ?? t?.text ?? "")
    .replace(SPARK_PREFIX, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Group a board's kept items under their quadrant / block / cell / step names. */
export function boardItems(board: BoardLike): { groups: { label: string; items: string[] }[]; unreviewed: number } {
  const els = board.elements.filter((e) => !e.isDeleted);
  const labels = new Map<string, string>();
  for (const e of els) {
    const cd = e.customData as { role?: string; slot?: string } | undefined;
    if (cd?.role === "label" && cd.slot && e.type === "text") labels.set(cd.slot, String(e.originalText ?? e.text ?? "").trim());
  }
  const labelFor = (slot?: string): string => {
    if (!slot) return "Other notes";
    const m = /^c:(\d+)\|(\d+)$/.exec(slot);
    if (m) return [labels.get(`row:${m[1]}`), labels.get(`col:${m[2]}`)].filter(Boolean).join(" · ") || "Other notes";
    return labels.get(slot) ?? "Other notes";
  };
  const groups = new Map<string, string[]>();
  let unreviewed = 0;
  for (const e of els) {
    const cd = e.customData as { role?: string; slot?: string; state?: string; source?: string } | undefined;
    let text = "";
    let slot: string | undefined;
    if (cd?.role === "sticky") {
      if (cd.state === "provisional") {
        unreviewed++;
        continue;
      }
      text = textOf(els, e);
      slot = cd.slot;
    } else if (!e.locked && !cd?.role) {
      // things the facilitator drew: rectangles with text, free text
      if (e.type === "text" && !e.containerId) text = String(e.originalText ?? e.text ?? "").trim();
      else if (e.type !== "text") text = textOf(els, e);
    }
    if (!text) continue;
    const label = labelFor(slot);
    groups.set(label, [...(groups.get(label) ?? []), text]);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === "Other notes" ? 1 : b === "Other notes" ? -1 : 0));
  return { groups: ordered.map(([label, items]) => ({ label, items })), unreviewed };
}

export function sessionNotes(session: Session, boards: BoardLike[], clockMs: number, now = new Date()): string {
  const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const lines: string[] = [`# ${session.name}`, "", `${date} · ${formatTimestamp(clockMs)} recorded`, ""];
  if (boards.length) {
    lines.push("## Boards", "");
    for (const b of boards) {
      const { groups, unreviewed } = boardItems(b);
      lines.push(`### ${b.title}`, "");
      if (!groups.length) lines.push("_No items kept yet._", "");
      for (const g of groups) {
        lines.push(`**${g.label}**`);
        for (const it of g.items) lines.push(`- ${it}`);
        lines.push("");
      }
      if (unreviewed) lines.push(`_${unreviewed} AI suggestion${unreviewed === 1 ? "" : "s"} not yet reviewed._`, "");
    }
  }
  const marked = session.segments.filter((s) => s.marked);
  if (marked.length) {
    lines.push("## Marked moments", "");
    for (const s of marked) lines.push(`- [${formatTimestamp(s.startMs)}] ${s.text}`);
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}
