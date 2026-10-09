/**
 * Media helpers for playback UI.
 */

/**
 * Pick the buffered position to display for `time`, given the element's
 * buffered ranges.
 *
 * The naive `buffered.end(buffered.length - 1)` reports the end of an
 * arbitrary range, which jumps around after seeks (the browser keeps several
 * disjoint ranges). Instead: the end of the range containing the playhead, or
 * the furthest end behind it when sitting in a gap, or 0 when nothing behind
 * the playhead is buffered yet.
 */
export function bufferedEndForTime(buffered: TimeRanges, time: number): number {
  let behind = 0;
  for (let i = 0; i < buffered.length; i++) {
    let start: number;
    let end: number;
    try {
      start = buffered.start(i);
      end = buffered.end(i);
    } catch {
      continue;
    }
    if (time >= start && time <= end) return end;
    if (end <= time && end > behind) behind = end;
  }
  return behind;
}
