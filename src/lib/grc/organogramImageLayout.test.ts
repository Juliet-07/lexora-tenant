import { describe, expect, it } from "vitest";
import { getOrganogramImageLayout } from "./organogramImageLayout";

describe("organogram image framing", () => {
  it("keeps the full chart at readable natural size with only 32px margins", () => {
    const layout = getOrganogramImageLayout({ x: 24, y: 24, width: 516, height: 960 });
    expect(layout).toEqual({
      width: 580,
      height: 1024,
      transform: "translate(8px, 8px) scale(1)",
    });
  });

  it("includes wide charts and negative coordinates without shrinking or clipping", () => {
    expect(getOrganogramImageLayout({ x: -400, y: -120, width: 3200, height: 600 })).toEqual({
      width: 3264,
      height: 664,
      transform: "translate(432px, 152px) scale(1)",
    });
  });
});