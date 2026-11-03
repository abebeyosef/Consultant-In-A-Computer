"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type CustomInput, buildCustomFramework } from "@/lib/frameworks/customForm";
import type { FrameworkTemplate, LayoutType } from "@/lib/frameworks/types";

const EMPTY: CustomInput = {
  name: "",
  whenToUse: "",
  signals: "",
  layout: "matrix2x2",
  xLabel: "",
  yLabel: "",
  topLeft: "",
  topRight: "",
  bottomLeft: "",
  bottomRight: "",
  itemNoun: "",
  blocks: "",
  rows: "",
  columns: "",
  problemLabel: "Problem",
  whyCount: 5,
  rootCauseLabel: "Root cause",
  countermeasureLabel: "Countermeasure",
};

const LAYOUTS: { id: LayoutType; label: string }[] = [
  { id: "matrix2x2", label: "2×2 matrix" },
  { id: "canvas", label: "Canvas" },
  { id: "table", label: "Table" },
  { id: "chain", label: "Chain" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-ink-muted">{label}</span>
      {children}
      {hint ? <span className="text-[12px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function CustomFrameworkDialog({
  open,
  onOpenChange,
  initial,
  editingId,
  existingIds,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: CustomInput;
  editingId?: string;
  existingIds: string[];
  onSave: (fw: FrameworkTemplate) => void;
}) {
  const [v, setV] = useState<CustomInput>(() => ({ ...EMPTY, ...initial }));
  const [errors, setErrors] = useState<string[]>([]);
  const errRef = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    if (errors.length) errRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [errors]);
  const set = <K extends keyof CustomInput>(k: K, val: CustomInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const text = (k: keyof CustomInput, placeholder?: string, testId?: string) => (
    <Input value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} placeholder={placeholder} data-testid={testId} />
  );

  const save = () => {
    const r = buildCustomFramework(v, existingIds, editingId);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors([]);
    onSave(r.framework);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[620px]" data-testid="custom-dialog">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit framework" : "Add your own framework"}</DialogTitle>
          <DialogDescription>
            It joins the library: the assistant listens for it, ⌘K opens it, and boards pre-fill from the transcript.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Name">{text("name", "e.g. Risk heat map", "custom-name")}</Field>
          <Field label="When it helps" hint="One or two sentences. The model reads this to decide when to suggest it.">
            <Textarea
              value={v.whenToUse}
              onChange={(e) => set("whenToUse", e.target.value)}
              placeholder="e.g. The group is listing things that could go wrong and weighing how likely and how bad each one is."
              className="min-h-[72px] text-[14px]"
              data-testid="custom-when"
            />
          </Field>
          <Field label="Signals" hint="Words or phrases people say when it would help, separated by commas.">
            {text("signals", "e.g. risk, could go wrong, worst case, likelihood", "custom-signals")}
          </Field>
          <Field label="Layout">
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={v.layout}
              onValueChange={(x) => x && set("layout", x as LayoutType)}
              className="justify-start"
              aria-label="Layout"
            >
              {LAYOUTS.map((l) => (
                <ToggleGroupItem key={l.id} value={l.id} className="px-3" data-testid={`custom-layout-${l.id}`}>
                  {l.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <div className="rounded-[12px] border border-hairline bg-surface-sunken/60 p-4">
            {v.layout === "matrix2x2" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Horizontal axis (low → high)">{text("xLabel", "e.g. Likelihood", "custom-x")}</Field>
                <Field label="Vertical axis (low → high)">{text("yLabel", "e.g. Severity", "custom-y")}</Field>
                <Field label="Top-left quadrant">{text("topLeft", "e.g. Watch", "custom-tl")}</Field>
                <Field label="Top-right quadrant">{text("topRight", "e.g. Act now", "custom-tr")}</Field>
                <Field label="Bottom-left quadrant">{text("bottomLeft", "e.g. Accept", "custom-bl")}</Field>
                <Field label="Bottom-right quadrant">{text("bottomRight", "e.g. Reduce", "custom-br")}</Field>
                <Field label="What goes on the stickies (plural)">{text("itemNoun", "e.g. risks")}</Field>
              </div>
            ) : v.layout === "canvas" ? (
              <Field label="Blocks, one per line">
                <Textarea value={v.blocks} onChange={(e) => set("blocks", e.target.value)} placeholder={"People\nProcess\nTechnology\nData"} className="min-h-[120px] text-[14px]" />
              </Field>
            ) : v.layout === "table" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rows, one per line">
                  <Textarea value={v.rows} onChange={(e) => set("rows", e.target.value)} placeholder={"Cost\nRisk\nTime to value"} className="min-h-[120px] text-[14px]" />
                </Field>
                <Field label="Columns, one per line">
                  <Textarea value={v.columns} onChange={(e) => set("columns", e.target.value)} placeholder={"Option A\nOption B"} className="min-h-[120px] text-[14px]" />
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="First box">{text("problemLabel")}</Field>
                <Field label="Steps (1–7)">
                  <Input type="number" min={1} max={7} value={v.whyCount ?? 5} onChange={(e) => set("whyCount", Number(e.target.value))} />
                </Field>
                <Field label="Second-to-last box">{text("rootCauseLabel")}</Field>
                <Field label="Last box">{text("countermeasureLabel")}</Field>
              </div>
            )}
          </div>

          {errors.length ? (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-ink" role="alert" data-testid="custom-errors" ref={errRef}>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} data-testid="custom-save">
            {editingId ? "Save changes" : "Add to library"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
