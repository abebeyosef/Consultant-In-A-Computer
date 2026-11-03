import { BUILTIN_FRAMEWORKS } from "./builtins";
import type { FrameworkTemplate } from "./types";
import { loadCustomFrameworks } from "./custom";

/** All frameworks available in this browser: built-ins first, then custom. */
export function getAllFrameworks(): FrameworkTemplate[] {
  return [...BUILTIN_FRAMEWORKS, ...loadCustomFrameworks()];
}

export function getFramework(id: string): FrameworkTemplate | undefined {
  return getAllFrameworks().find((f) => f.id === id);
}
