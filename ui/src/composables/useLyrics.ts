import { ref, watch } from "vue";
import { fetchLyrics } from "@/api";
import { activeLyricIndex, parseLrc } from "@/utils/format";
import type { LyricLine } from "@/types";

/**
 * Loads lyrics for a track and exposes the active line.
 *
 * Playback time is sampled explicitly via `sync()` rather than tracked
 * reactively, because the audio element's currentTime is not a reactive
 * source — a caller-driven rAF loop keeps this cheap and accurate.
 */
export function useLyrics(getPath: () => string) {
  const lines = ref<LyricLine[]>([]);
  const plain = ref("");
  const instrumental = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeIndex = ref(-1);

  let loadedFor = "";
  let token = 0;

  async function load(path: string) {
    if (!path) {
      reset();
      return;
    }
    if (path === loadedFor) return;
    const current = ++token;
    loadedFor = path;
    reset();
    loading.value = true;

    try {
      const res = await fetchLyrics(path);
      if (current !== token) return;
      if (res.SyncedLyrics) lines.value = parseLrc(res.SyncedLyrics);
      plain.value = res.Lyrics ?? "";
      instrumental.value = res.Instrumental === 1;
      if (!lines.value.length && !plain.value && !instrumental.value) {
        error.value = "No lyrics found";
      }
    } catch (err) {
      if (current !== token) return;
      // A 404 just means the track has no lyrics, which is not an error
      // worth surfacing loudly; anything else is a real failure.
      error.value =
        err instanceof Error && err.message.startsWith("404")
          ? "No lyrics found"
          : "Could not load lyrics";
    } finally {
      if (current === token) loading.value = false;
    }
  }

  function reset() {
    lines.value = [];
    plain.value = "";
    instrumental.value = false;
    activeIndex.value = -1;
    error.value = null;
  }

  /** Recompute the active line. Returns the index so callers can detect change. */
  function sync(time: number): number {
    if (!lines.value.length) {
      if (activeIndex.value !== -1) activeIndex.value = -1;
      return -1;
    }
    const idx = activeLyricIndex(lines.value, time);
    if (idx !== activeIndex.value) activeIndex.value = idx;
    return activeIndex.value;
  }

  watch(getPath, load, { immediate: true });

  return { lines, plain, instrumental, loading, error, activeIndex, sync, reload: () => {
    loadedFor = "";
    void load(getPath());
  } };
}
