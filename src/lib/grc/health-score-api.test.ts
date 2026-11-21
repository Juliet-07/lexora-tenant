import { describe, expect, it } from "vitest";
import { readScore } from "./health-score-api";

describe("readScore", () => {
  it("says 'not started' when nothing has been measured, even at 0", () => {
    expect(readScore(0, 0)).toMatch(/^Not started/);
    expect(readScore(null)).toMatch(/^Not started/);
  });
  it("still reads a genuinely low measured score as critical", () => {
    expect(readScore(3, 1)).toMatch(/^Critical/);
  });
  it("reads a high score as excellent", () => {
    expect(readScore(95, 40)).toMatch(/^Excellent/);
  });
});
