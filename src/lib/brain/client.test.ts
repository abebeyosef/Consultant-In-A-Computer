import { describe, expect, it } from "vitest";
import { stripFences } from "./client";

describe("stripFences", () => {
  it("removes json code fences", () => {
    expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("extracts the object from surrounding prose", () => {
    expect(JSON.parse(stripFences('Sure! {"a":1} hope that helps'))).toEqual({ a: 1 });
  });
});
