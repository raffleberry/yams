import { describe, expect, it } from "bun:test";
import { bufferedEndForTime } from "./src/utils/media";

function ranges(pairs: [number, number][]): TimeRanges {
  return {
    length: pairs.length,
    start: (i: number) => pairs[i][0],
    end: (i: number) => pairs[i][1],
  } as TimeRanges;
}

describe("bufferedEndForTime", () => {
  it("reports the end of the range containing the playhead", () => {
    const b = ranges([
      [0, 30],
      [60, 120],
    ]);
    expect(bufferedEndForTime(b, 10)).toBe(30);
    expect(bufferedEndForTime(b, 90)).toBe(120);
  });

  it("falls back to the furthest end behind a gap", () => {
    const b = ranges([
      [0, 30],
      [60, 120],
    ]);
    // Sitting in the gap: only the first 30s are contiguously downloaded.
    expect(bufferedEndForTime(b, 45)).toBe(30);
  });

  it("returns 0 when nothing behind the playhead is buffered", () => {
    expect(bufferedEndForTime(ranges([[60, 120]]), 10)).toBe(0);
    expect(bufferedEndForTime(ranges([]), 10)).toBe(0);
  });

  it("treats range boundaries as inside", () => {
    const b = ranges([[0, 30]]);
    expect(bufferedEndForTime(b, 0)).toBe(30);
    expect(bufferedEndForTime(b, 30)).toBe(30);
  });

  it("ignores ranges that throw", () => {
    const b = {
      length: 2,
      start: (i: number) => {
        if (i === 0) throw new DOMException("bad range");
        return 60;
      },
      end: (i: number) => {
        if (i === 0) throw new DOMException("bad range");
        return 120;
      },
    } as TimeRanges;
    expect(bufferedEndForTime(b, 90)).toBe(120);
  });
});
