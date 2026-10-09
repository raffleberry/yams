import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { bufferedEndForTime } from "@/utils/media";
import {
  ApiError,
  artworkUrl,
  DEFAULT_ART,
  postHistory,
  streamUrl,
} from "@/api";
import type { RepeatMode, Song } from "@/types";

/** Coarse lifecycle of the audio element, surfaced to the UI. */
export type PlayerStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "error";

/** Seconds of real playback before the track is logged to history. */
const HISTORY_THRESHOLD_SECONDS = 20;

/** Seconds after which "previous" restarts the track instead of going back. */
const RESTART_AFTER_SECONDS = 3;

const EMPTY_TRACK: Song = {
  Path: "",
  Title: "",
  Size: 0,
  Artists: "",
  AlbumArtist: "",
  Album: "",
  Genre: "",
  Year: "",
  Track: 0,
  Length: 0,
  Bitrate: 0,
  Samplerate: 0,
  Channels: 0,
  Lyrics: "",
  Comment: "",
  IsFavourite: false,
  PlayCount: 0,
};

/** Fisher-Yates, returns a new array. */
function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const usePlayerStore = defineStore("player", () => {
  /* ------------------------------------------------------------- state */

  const audio = shallowRef<HTMLAudioElement | null>(null);
  const track = ref<Song>(EMPTY_TRACK);
  const queue = ref<Song[]>([]);
  const index = ref(-1);

  const status = ref<PlayerStatus>("idle");
  const error = ref<string | null>(null);
  const currentTime = ref(0);
  const duration = ref(0);
  const buffered = ref(0);
  const volume = ref(clampVolume(readStoredVolume()));
  const muted = ref(false);
  const repeat = ref<RepeatMode>(readStoredRepeat());
  const shuffle = ref(readStoredBool("yams:shuffle", false));

  /** Tracks ahead of the current one, in play order. */
  const upNext = ref<Song[]>([]);
  /** Identifier of the list the queue was built from (for dedupe/replace). */
  const queueSource = ref("");

  const playing = computed(() => status.value === "playing");
  const hasTrack = computed(() => track.value.Path !== "");
  const isCurrent = (song: Song) =>
    song.Path !== "" && song.Path === track.value.Path;
  const isActive = (song: Song, i: number) =>
    isCurrent(song) && i === index.value;

  const progress = computed(() =>
    duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0,
  );
  const bufferedProgress = computed(() =>
    duration.value > 0 ? (buffered.value / duration.value) * 100 : 0,
  );

  const artwork = computed(() =>
    track.value.Path ? artworkUrl(track.value.Path) : DEFAULT_ART,
  );

  /* ------------------------------------------------------- internal state */

  /**
   * Monotonic token bumped on every load request. Any async continuation
   * belonging to an older token is discarded, which is what stops a slow
   * response for song A from clobbering song B after a fast double-tap.
   */
  let loadToken = 0;
  let listenedSeconds = 0;
  let lastTickTime = 0;
  let historyLogged = false;
  let historyInFlight = false;

  function clampVolume(v: number): number {
    return Math.min(1, Math.max(0, v));
  }

  /* ---------------------------------------------------------- media element */

  function ensureAudio(): HTMLAudioElement {
    if (audio.value) return audio.value;

    const el = new Audio();
    el.preload = "metadata";
    el.volume = volume.value;
    el.muted = muted.value;
    // Never let the element reach out to the network on its own beyond the
    // current track; we control loading explicitly.
    el.crossOrigin = null;

    el.addEventListener("loadstart", () => {
      if (status.value !== "error") status.value = "loading";
    });
    el.addEventListener("loadedmetadata", () => {
      duration.value = Number.isFinite(el.duration) ? el.duration : 0;
      if (!track.value.Length && duration.value) {
        track.value = { ...track.value, Length: Math.round(duration.value) };
      }
    });
    el.addEventListener("durationchange", () => {
      duration.value = Number.isFinite(el.duration) ? el.duration : 0;
    });
    el.addEventListener("canplay", () => {
      if (status.value === "loading") status.value = el.paused ? "paused" : "playing";
    });
    el.addEventListener("playing", () => {
      status.value = "playing";
      error.value = null;
    });
    el.addEventListener("waiting", () => {
      if (!el.paused) status.value = "buffering";
    });
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("progress", updateBuffered);
    el.addEventListener("play", () => {
      status.value = "playing";
      lastTickTime = el.currentTime;
    });
    el.addEventListener("pause", () => {
      if (status.value !== "error") {
        status.value = el.ended ? "paused" : "paused";
      }
      flushListenTime();
    });
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);

    audio.value = el;
    setupMediaSession();
    return el;
  }

  /**
   * Refresh the buffered indicator from the range containing the playhead.
   * Called from both `progress` (new bytes arrived) and `timeupdate` (a seek
   * doesn't fire `progress`, so the bar would otherwise show a stale range).
   */
  function updateBuffered() {
    const el = audio.value;
    if (!el) return;
    try {
      buffered.value = bufferedEndForTime(el.buffered, el.currentTime);
    } catch {
      /* buffered can throw if the media is not seekable yet */
    }
  }

  function onTimeUpdate() {
    const el = audio.value;
    if (!el) return;
    currentTime.value = el.currentTime;
    updateBuffered();

    // Only count real, forward playback. A backwards jump is a seek, not
    // listening, so it never inflates the history threshold.
    if (!el.paused && !el.seeking && el.currentTime > lastTickTime) {
      const delta = el.currentTime - lastTickTime;
      if (delta < 2) listenedSeconds += delta;
    }
    lastTickTime = el.currentTime;

    if (!historyLogged && !historyInFlight && listenedSeconds >= HISTORY_THRESHOLD_SECONDS) {
      void recordHistory();
    }
  }

  function flushListenTime() {
    const el = audio.value;
    if (el && !el.paused) listenedSeconds += Math.max(0, el.currentTime - lastTickTime);
    lastTickTime = el ? el.currentTime : 0;
  }

  async function recordHistory() {
    const song = track.value;
    if (!song.Path || historyLogged) return;
    historyInFlight = true;
    try {
      await postHistory(song);
      historyLogged = true;
    } catch {
      // History is best-effort; a failure must never interrupt playback.
    } finally {
      historyInFlight = false;
    }
  }

  function onEnded() {
    flushListenTime();
    void recordHistory();
    switch (repeat.value) {
      case "one":
        playIndex(index.value, { restart: true });
        return;
      case "off":
        if (index.value >= queue.value.length - 1 && upNext.value.length === 0) {
          status.value = "paused";
          currentTime.value = duration.value;
          return;
        }
        break;
      default:
        break;
    }
    next();
  }

  function onError() {
    const el = audio.value;
    if (!el || !el.src) return;
    const code = el.error?.code;
    const message =
      code === MediaError.MEDIA_ERR_NETWORK
        ? "Connection lost while streaming this track."
        : code === MediaError.MEDIA_ERR_DECODE
          ? "This file could not be decoded."
          : code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
            ? "Unsupported audio format."
            : "Playback failed.";
    status.value = "error";
    error.value = message;
  }

  /* ------------------------------------------------------------ media session */

  function setupMediaSession() {
    if (!("mediaSession" in navigator) || !audio.value) return;
    const el = audio.value;
    type Handler = (details: MediaSessionActionDetails) => void;
    const handlers: [MediaSessionAction, Handler][] = [
      ["play", () => void resume()],
      ["pause", () => pause()],
      ["stop", () => stop()],
      ["previoustrack", () => previous()],
      ["nexttrack", () => next()],
      ["seekbackward", () => seekBy(-10)],
      ["seekforward", () => seekBy(10)],
      ["seekto", (details) => {
        if (typeof details.seekTime === "number") seekTo(details.seekTime);
      }],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        /* action unsupported on this browser */
      }
    }
    el.addEventListener("timeupdate", () => {
      if (el.duration && navigator.mediaSession.setPositionState) {
        try {
          navigator.mediaSession.setPositionState({
            duration: el.duration,
            playbackRate: el.playbackRate,
            position: Math.min(el.currentTime, el.duration),
          });
        } catch {
          /* position state can throw before metadata is known */
        }
      }
    });
  }

  function syncMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const song = track.value;
    if (!song.Path) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }
    const art = artworkUrl(song.Path);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.Title || "Unknown",
      artist: song.Artists || "",
      album: song.Album || "",
      artwork: [
        { src: art, sizes: "96x96", type: "image/jpeg" },
        { src: art, sizes: "256x256", type: "image/jpeg" },
        { src: art, sizes: "512x512", type: "image/jpeg" },
      ],
    });
    navigator.mediaSession.playbackState = status.value === "playing" ? "playing" : "paused";
  }

  /* ---------------------------------------------------------------- queueing */

  /** Replace the queue and start playing `startAt`. */
  function setQueue(songs: readonly Song[], startAt: number, source: string) {
    const playable = songs.filter((s) => Boolean(s.Path));
    queue.value = shuffle.value ? shuffled(playable) : playable;
    queueSource.value = source;
    const target = shuffle.value ? queue.value.findIndex((s) => s.Path === songs[startAt]?.Path) : startAt;
    playIndex(target >= 0 ? target : 0);
  }

  /** Insert tracks directly after the current one. */
  function playNext(songs: Song[]) {
    const valid = songs.filter((s) => s.Path);
    if (!valid.length) return;
    if (index.value < 0) {
      setQueue(valid, 0, queueSource.value || "queue-next");
      return;
    }
    queue.value.splice(index.value + 1, 0, ...valid);
  }

  /** Append tracks to the end of the queue. */
  function addToQueue(songs: Song[]) {
    const valid = songs.filter((s) => s.Path);
    if (!valid.length) return;
    if (index.value < 0) {
      setQueue(valid, 0, queueSource.value || "queue-add");
      return;
    }
    queue.value.push(...valid);
  }

  function removeFromQueue(position: number) {
    if (position < 0 || position >= queue.value.length) return;
    const removingCurrent = position === index.value;
    queue.value.splice(position, 1);
    if (position < index.value) index.value -= 1;
    if (removingCurrent) {
      if (queue.value.length === 0) stop();
      else playIndex(Math.min(position, queue.value.length - 1));
    }
  }

  function clearQueue() {
    stop();
    queue.value = [];
    index.value = -1;
  }

  function moveInQueue(from: number, to: number) {
    if (from === to) return;
    if (from < 0 || from >= queue.value.length) return;
    const target = Math.min(Math.max(to, 0), queue.value.length - 1);
    const nextQueue = queue.value.slice();
    const [item] = nextQueue.splice(from, 1);
    nextQueue.splice(target, 0, item);

    let nextIndex = index.value;
    if (index.value === from) nextIndex = target;
    else if (from < index.value && target >= index.value) nextIndex -= 1;
    else if (from > index.value && target <= index.value) nextIndex += 1;

    queue.value = nextQueue;
    index.value = nextIndex;
  }

  /* --------------------------------------------------------------- transport */

  /**
   * Load and play a queue entry.
   *
   * The source is assigned directly to the media element so the browser
   * streams over HTTP range requests instead of us buffering the whole file
   * into a Blob first. Assigning `src` implicitly aborts any in-flight load,
   * and `loadToken` guards our own async continuations.
   */
  async function playIndex(position: number, opts: { restart?: boolean } = {}) {
    const song = queue.value[position];
    if (!song || !song.Path) return;

    const el = ensureAudio();
    const token = ++loadToken;

    index.value = position;
    track.value = song;
    error.value = null;
    currentTime.value = 0;
    duration.value = song.Length || 0;
    buffered.value = 0;
    listenedSeconds = 0;
    historyLogged = false;
    historyInFlight = false;
    lastTickTime = 0;
    status.value = "loading";
    syncMediaSession();

    const nextSrc = streamUrl(song.Path);
    if (el.src !== nextSrc || opts.restart) {
      el.src = nextSrc;
      el.load();
    }
    if (opts.restart) el.currentTime = 0;

    try {
      await el.play();
      if (token !== loadToken) return;
      status.value = "playing";
    } catch (err) {
      if (token !== loadToken) return;
      // AbortError simply means a newer track superseded this one.
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Tap play to start audio."
          : `Could not play this track. ${err instanceof Error ? err.message : ""}`.trim();
      status.value = "error";
      error.value = message;
      syncMediaSession();
    }
  }

  /** Play a specific song, building the queue from `context` when needed. */
  function play(song: Song, context: readonly Song[] = [], source = "") {
    if (context.length) {
      const existing = queue.value.findIndex((s) => s.Path === song.Path);
      if (queueSource.value === source && existing >= 0) {
        void playIndex(existing);
        return;
      }
      const at = context.findIndex((s) => s.Path === song.Path);
      setQueue(context, at >= 0 ? at : 0, source);
      return;
    }
    const existing = queue.value.findIndex((s) => s.Path === song.Path);
    if (existing >= 0) {
      void playIndex(existing);
      return;
    }
    addToQueue([song]);
    void playIndex(queue.value.length - 1);
  }

  async function resume() {
    const el = ensureAudio();
    if (!el.src) return;
    try {
      await el.play();
    } catch {
      /* surfaced through the status watcher */
    }
  }

  function pause() {
    audio.value?.pause();
  }

  function toggle() {
    if (!hasTrack.value) return;
    const el = ensureAudio();
    if (el.paused) void resume();
    else pause();
  }

  function stop() {
    const el = audio.value;
    if (!el) return;
    loadToken++;
    el.pause();
    el.removeAttribute("src");
    el.load();
    status.value = "idle";
    currentTime.value = 0;
    duration.value = 0;
    buffered.value = 0;
    error.value = null;
    track.value = EMPTY_TRACK;
    index.value = -1;
    syncMediaSession();
  }

  function next() {
    const fromUpNext = upNext.value.shift();
    if (fromUpNext) {
      addToQueue([fromUpNext]);
    }
    if (index.value < 0) {
      if (queue.value.length) void playIndex(0);
      return;
    }
    const nextIndex = index.value + 1;
    if (nextIndex < queue.value.length) {
      void playIndex(nextIndex);
      return;
    }
    if (repeat.value === "all" && queue.value.length) {
      void playIndex(0);
      return;
    }
    status.value = "paused";
  }

  function previous() {
    const el = audio.value;
    if (el && el.currentTime > RESTART_AFTER_SECONDS) {
      seekTo(0);
      return;
    }
    if (index.value > 0) void playIndex(index.value - 1);
    else seekTo(0);
  }

  function seekTo(seconds: number) {
    const el = audio.value;
    if (!el) return;
    const max = duration.value || 0;
    const clamped = Math.min(Math.max(seconds, 0), max || seconds);
    try {
      el.currentTime = clamped;
      currentTime.value = clamped;
      lastTickTime = clamped;
    } catch {
      /* seeking before metadata is available is a no-op */
    }
  }

  function seekBy(delta: number) {
    seekTo(currentTime.value + delta);
  }

  /** Seek by fraction (0..1) of the track. */
  function seekToFraction(fraction: number) {
    seekTo(fraction * duration.value);
  }

  function retry() {
    const song = track.value;
    if (!song.Path) return;
    error.value = null;
    void playIndex(index.value >= 0 ? index.value : 0, { restart: true });
  }

  /* -------------------------------------------------------------- settings */

  function setVolume(v: number) {
    volume.value = clampVolume(v);
    muted.value = false;
    localStorage.setItem("yams:volume", String(volume.value));
    if (audio.value) audio.value.volume = volume.value;
  }

  function toggleMute() {
    muted.value = !muted.value;
    if (audio.value) audio.value.muted = muted.value;
  }

  function cycleRepeat() {
    repeat.value = repeat.value === "off" ? "all" : repeat.value === "all" ? "one" : "off";
    localStorage.setItem("yams:repeat", repeat.value);
  }

  function toggleShuffle() {
    shuffle.value = !shuffle.value;
    localStorage.setItem("yams:shuffle", String(shuffle.value));
  }

  /** Re-order the active queue to match a newly generated shuffle order. */
  function reshuffleQueue() {
    if (!shuffle.value || index.value < 0) return;
    const current = queue.value[index.value];
    const rest = queue.value.filter((_, i) => i !== index.value);
    queue.value = [current, ...shuffled(rest)];
    index.value = 0;
  }

  function restoreOrder(order: string[]) {
    if (index.value < 0) return;
    const current = queue.value[index.value];
    const byPath = new Map(queue.value.map((s) => [s.Path, s]));
    const next = order.map((p) => byPath.get(p)).filter((s): s is Song => Boolean(s));
    queue.value = [current, ...next.filter((s) => s.Path !== current.Path)];
    index.value = 0;
  }

  return {
    // state
    audio,
    track,
    queue,
    index,
    status,
    error,
    currentTime,
    duration,
    buffered,
    volume,
    muted,
    repeat,
    shuffle,
    upNext,
    queueSource,
    // derived
    playing,
    hasTrack,
    progress,
    bufferedProgress,
    artwork,
    isCurrent,
    isActive,
    // queueing
    setQueue,
    play,
    playNext,
    addToQueue,
    removeFromQueue,
    clearQueue,
    moveInQueue,
    reshuffleQueue,
    restoreOrder,
    // transport
    playIndex,
    resume,
    pause,
    toggle,
    stop,
    next,
    previous,
    seekTo,
    seekBy,
    seekToFraction,
    retry,
    // settings
    setVolume,
    toggleMute,
    cycleRepeat,
    toggleShuffle,
  };
});

/* ------------------------------------------------------------- persistence */

function readStoredVolume(): number {
  const raw = Number.parseFloat(localStorage.getItem("yams:volume") ?? "");
  return Number.isFinite(raw) ? raw : 0.8;
}

function readStoredRepeat(): RepeatMode {
  const raw = localStorage.getItem("yams:repeat");
  return raw === "all" || raw === "one" || raw === "off" ? raw : "off";
}

function readStoredBool(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : raw === "true";
}

export { ApiError };
