/** Formatting and parsing helpers shared across the UI. */

/** Render seconds as m:ss (or h:mm:ss for long tracks). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Human readable bitrate, e.g. 131 -> "131 kbps". */
export function formatBitrate(kbps: number): string {
  return kbps > 0 ? `${kbps} kbps` : "";
}

/** Split a comma-separated artist string into trimmed, non-empty names. */
export function splitArtists(artists: string): string[] {
  return artists
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

/**
 * Wrap every case-insensitive occurrence of `term` in <mark>.
 * The term is regex-escaped so user input can't inject markup.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlight(text: string, term: string): string {
  if (!term) return escapeHtml(text);
  const pattern = new RegExp(`(${escapeRegExp(term)})`, "gi");
  return escapeHtml(text).replace(pattern, "<mark>$1</mark>");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Parse an LRC file into time-sorted lyric lines. */
export function parseLrc(raw: string): { time: number; text: string }[] {
  if (!raw) return [];
  const out: { time: number; text: string }[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/\[(\d+):(\d+(?:[.:]\d+)?)\](.*)/);
    if (!match) continue;
    const minutes = Number.parseInt(match[1], 10);
    const seconds = Number.parseFloat(match[2].replace(":", "."));
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) continue;
    out.push({ time: minutes * 60 + seconds, text: match[3].trim() });
  }
  return out.sort((a, b) => a.time - b.time);
}

/** Index of the last lyric line at or before `time`. */
export function activeLyricIndex(
  lines: { time: number }[],
  time: number,
): number {
  let low = 0;
  let high = lines.length - 1;
  let result = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].time <= time) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

/** Stable identity for a track, used for keys and playlist membership. */
export function trackKey(song: { Path?: string; Title?: string; Artists?: string }): string {
  return song.Path || `${song.Title ?? ""}::${song.Artists ?? ""}`;
}

/** Two tracks refer to the same recording. */
export function isSameTrack(
  a: { Title?: string; Artists?: string; Album?: string },
  b: { Title?: string; Artists?: string; Album?: string },
): boolean {
  return a.Title === b.Title && a.Artists === b.Artists && a.Album === b.Album;
}
