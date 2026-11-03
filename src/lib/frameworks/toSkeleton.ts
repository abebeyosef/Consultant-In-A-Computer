import { renderCanvas } from "./layouts/canvas";
import { renderChain } from "./layouts/chain";
import { renderMatrix } from "./layouts/matrix2x2";
import { renderTable } from "./layouts/table";
import type { AnyFill, CanvasFill, ChainFill, FrameworkTemplate, MatrixFill, TableFill } from "./types";
import type { BoardSkeleton, RenderOptions } from "./skeleton";

/** Render any framework (optionally pre-filled) to a pure board skeleton. */
export function renderFramework(fw: FrameworkTemplate, fill: AnyFill | null, opts: RenderOptions): BoardSkeleton {
  const l = fw.layout;
  switch (l.type) {
    case "matrix2x2":
      return renderMatrix(fw, l, fill as MatrixFill | null, opts);
    case "canvas":
      return renderCanvas(fw, l, fill as CanvasFill | null, opts);
    case "table":
      return renderTable(fw, l, fill as TableFill | null, opts);
    case "chain":
      return renderChain(fw, l, fill as ChainFill | null, opts);
  }
}
