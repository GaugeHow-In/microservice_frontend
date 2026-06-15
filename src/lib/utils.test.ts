import { describe, expect, it } from "vitest";
import { cn, formatPercent } from "@/lib/utils";

describe("utils", () => {
  it("merges conditional and tailwind classes predictably", () => {
    expect(cn("px-2", false && "hidden", "px-4", "text-sm")).toBe("px-4 text-sm");
  });

  it("formats percentages as rounded strings", () => {
    expect(formatPercent(67.6)).toBe("68%");
    expect(formatPercent(12.2)).toBe("12%");
  });
});
