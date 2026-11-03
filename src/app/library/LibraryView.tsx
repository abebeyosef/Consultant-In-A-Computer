"use client";

import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/common/SiteHeader";
import { FrameworkPreview } from "@/components/board/FrameworkPreview";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BUILTIN_FRAMEWORKS } from "@/lib/frameworks/builtins";
import { loadCustomFrameworks, saveCustomFrameworks } from "@/lib/frameworks/custom";
import { exportCustomJson, mergeCustom, parseImport, toInput } from "@/lib/frameworks/customForm";
import { downloadBlob } from "@/lib/board/excalidraw";
import { CustomFrameworkDialog } from "./CustomFrameworkDialog";
import { previewFillFor } from "@/lib/frameworks/sampleFills";
import type { FrameworkTemplate } from "@/lib/frameworks/types";

const LAYOUT_NAMES = { matrix2x2: "2×2 matrix", canvas: "Canvas", table: "Table", chain: "Chain" } as const;

export function LibraryView() {
  const [mode, setMode] = useState<"empty" | "filled">("filled");
  const [custom, setCustom] = useState<FrameworkTemplate[]>([]);
  const [dialog, setDialog] = useState<{ editing?: FrameworkTemplate; nonce: number } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setCustom(loadCustomFrameworks());
  }, []);
  const all: FrameworkTemplate[] = [...BUILTIN_FRAMEWORKS, ...custom];

  const persist = (list: FrameworkTemplate[]) => {
    saveCustomFrameworks(list);
    setCustom(list);
  };
  const onSave = (fw: FrameworkTemplate) => {
    persist(mergeCustom(custom, [fw]));
    setDialog(null);
    toast.success(`${fw.name} is in the library`);
  };
  const remove = (fw: FrameworkTemplate) => {
    if (!window.confirm(`Remove “${fw.name}” from the library? Boards already made keep their content.`)) return;
    persist(custom.filter((f) => f.id !== fw.id));
  };
  const importFile = async (file: File) => {
    const { frameworks, errors } = parseImport(await file.text());
    if (frameworks.length) {
      persist(mergeCustom(custom, frameworks));
      toast.success(`Imported ${frameworks.length} framework${frameworks.length === 1 ? "" : "s"}`);
    }
    if (errors.length) toast.error(errors[0]);
  };
  const exportAll = () =>
    downloadBlob(new Blob([exportCustomJson(custom)], { type: "application/json" }), "custom-frameworks.json");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-8 pb-24 pt-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-[28px] leading-tight">Framework library</h1>
            <p className="mt-1.5 max-w-[60ch] text-ink-muted">
              The frameworks the assistant listens for. Each one opens as an editable board, pre-filled from what the room said.
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as "empty" | "filled")}
            variant="outline"
            size="sm"
            aria-label="Preview mode"
          >
            <ToggleGroupItem value="filled" className="px-3">Example fill</ToggleGroupItem>
            <ToggleGroupItem value="empty" className="px-3">Empty</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <section className="mt-8 flex flex-wrap items-center gap-2 rounded-[12px] border border-hairline bg-surface px-4 py-3" aria-label="Your frameworks">
          <p className="mr-auto text-[13px] text-ink-muted">
            {custom.length
              ? `${custom.length} of your own framework${custom.length === 1 ? "" : "s"} in this browser.`
              : "Add your firm's own frameworks — they're suggested and pre-filled just like the built-ins."}
          </p>
          <Button size="sm" onClick={() => setDialog({ nonce: Date.now() })} data-testid="custom-new">
            <Plus strokeWidth={1.5} /> Add a framework
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload strokeWidth={1.5} /> Import JSON
          </Button>
          <Button size="sm" variant="outline" onClick={exportAll} disabled={!custom.length} data-testid="custom-export">
            <Download strokeWidth={1.5} /> Export JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            data-testid="custom-import-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importFile(f);
              e.target.value = "";
            }}
          />
        </section>

        <ul className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {all.map((fw) => (
            <li key={fw.id} data-testid={`library-card-${fw.id}`} className="flex flex-col overflow-hidden rounded-[12px] border border-hairline bg-surface">
              <FrameworkPreview
                fw={fw}
                fill={mode === "filled" ? previewFillFor(fw.id) : null}
                className="aspect-[4/3] border-b border-hairline bg-paper"
              />
              <div className="flex flex-col gap-1.5 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px]">{fw.name}</h2>
                  <span className="ml-auto text-mono-sm">{LAYOUT_NAMES[fw.layout.type]}</span>
                </div>
                <p className="line-clamp-3 text-[13px] leading-[1.5] text-ink-muted">{fw.whenToUse}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/board?fw=${fw.id}&fill=${mode === "filled" ? "example" : "none"}`}>Open board</Link>
                  </Button>
                  {fw.source === "custom" ? (
                    <>
                      <span className="text-[12px] text-ink-muted">Custom</span>
                      <Button size="icon-sm" variant="ghost" className="ml-auto text-ink-muted" aria-label={`Edit ${fw.name}`} onClick={() => setDialog({ editing: fw, nonce: Date.now() })}>
                        <Pencil strokeWidth={1.5} />
                      </Button>
                      <Button size="icon-sm" variant="ghost" className="text-ink-muted hover:text-danger" aria-label={`Remove ${fw.name}`} onClick={() => remove(fw)}>
                        <Trash2 strokeWidth={1.5} />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </main>
      {dialog ? (
        <CustomFrameworkDialog
          key={dialog.nonce}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          initial={dialog.editing ? toInput(dialog.editing) : undefined}
          editingId={dialog.editing?.id}
          existingIds={custom.map((f) => f.id)}
          onSave={onSave}
        />
      ) : null}
    </div>
  );
}
