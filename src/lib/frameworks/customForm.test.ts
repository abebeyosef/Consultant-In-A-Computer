import { describe, expect, it } from "vitest";
import { renderFramework } from "./toSkeleton";
import { buildCustomFramework, exportCustomJson, mergeCustom, parseImport, toInput, type CustomInput } from "./customForm";

const risk: CustomInput = {
  name: "Risk heat map",
  whenToUse: "The group is listing things that could go wrong and weighing how likely and how bad each one is.",
  signals: "risk, could go wrong, likelihood, worst case, severity, risk",
  layout: "matrix2x2",
  xLabel: "Likelihood",
  yLabel: "Severity",
  topLeft: "Watch",
  topRight: "Act now",
  bottomLeft: "Accept",
  bottomRight: "Reduce",
  itemNoun: "risks",
};

describe("buildCustomFramework", () => {
  it("builds a valid 2×2 with a custom id and deduped signals", () => {
    const r = buildCustomFramework(risk);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.framework.id).toBe("custom-risk-heat-map");
    expect(r.framework.source).toBe("custom");
    expect(r.framework.signals).toEqual(["risk", "could go wrong", "likelihood", "worst case", "severity"]);
    // renders without throwing, with ghost labels
    const sk = renderFramework(r.framework, null, { idPrefix: "t" });
    expect(sk.elements.some((e) => (e as { customData?: { role?: string } }).customData?.role === "ghost")).toBe(true);
  });

  it("keeps ids unique and round-trips through the form", () => {
    const r = buildCustomFramework(risk, ["custom-risk-heat-map"]);
    expect(r.ok && r.framework.id).toBe("custom-risk-heat-map-2");
    if (!r.ok) return;
    const again = buildCustomFramework(toInput(r.framework), [], r.framework.id);
    expect(again.ok && again.framework).toEqual(r.framework);
  });

  it("explains what's missing", () => {
    const r = buildCustomFramework({ name: "", whenToUse: "short", signals: "one", layout: "matrix2x2" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join(" ")).toMatch(/name/);
    expect(r.errors.join(" ")).toMatch(/signal/);
    expect(r.errors.join(" ")).toMatch(/horizontal axis/);
  });

  it("lays out canvas blocks and tables", () => {
    const c = buildCustomFramework({ ...risk, layout: "canvas", blocks: "People\nProcess\nTechnology\nData\nCulture" });
    expect(c.ok && c.framework.layout.type === "canvas" && c.framework.layout.columns).toBe(3);
    const t = buildCustomFramework({ ...risk, layout: "table", rows: "Cost\nRisk", columns: "Option A\nOption B" });
    expect(t.ok).toBe(true);
    const ch = buildCustomFramework({ ...risk, layout: "chain", whyCount: 3 });
    expect(ch.ok && ch.framework.layout.type === "chain" && ch.framework.layout.whyCount).toBe(3);
  });
});

describe("import/export", () => {
  it("round-trips a bundle and renames clashing built-in ids", () => {
    const r = buildCustomFramework(risk);
    if (!r.ok) throw new Error("build failed");
    const back = parseImport(exportCustomJson([r.framework]));
    expect(back.errors).toEqual([]);
    expect(back.frameworks[0]).toEqual(r.framework);
    const clash = parseImport(JSON.stringify({ ...r.framework, id: "swot" }));
    expect(clash.frameworks[0].id).toBe("custom-swot");
    expect(parseImport("nope").errors[0]).toMatch(/JSON/);
    expect(mergeCustom([r.framework], [{ ...r.framework, name: "New" }])).toHaveLength(1);
  });
});
