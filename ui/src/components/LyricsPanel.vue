<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { usePlayerStore } from "@/stores/player";
import { useLyrics } from "@/composables/useLyrics";

/**
 * Synced-lyrics view. A rAF loop samples the audio clock so the active line
 * highlights in time with playback, and the box keeps that line centred.
 *
 * Centring writes scrollTop on the lyrics box itself rather than calling
 * scrollIntoView on the line: scrollIntoView scrolls every scrollable
 * ancestor (the whole pane and the page), while an explicit scrollTop only
 * ever moves this box.
 */
const player = usePlayerStore();

const lyrics = useLyrics(() => player.track.Path);

const scroller = ref<HTMLElement | null>(null);
const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let frame = 0;
let lastIndex = -2;

function tick() {
  const idx = lyrics.sync(player.audio?.currentTime ?? 0);
  if (idx !== lastIndex) {
    lastIndex = idx;
    if (idx >= 0) centerActiveLine(idx);
  }
  frame = requestAnimationFrame(tick);
}

function centerActiveLine(index: number) {
  const box = scroller.value;
  // Scoped to this box: with the panel and the sheet mounted at once, a
  // document-wide query could grab the line from the hidden copy.
  const line = box?.querySelector<HTMLElement>(`[data-lyric-index="${index}"]`);
  if (!box || !line) return;
  // Rect math instead of offsetTop, so no positioned-ancestor assumptions.
  const boxRect = box.getBoundingClientRect();
  const lineRect = line.getBoundingClientRect();
  const top =
    box.scrollTop +
    (lineRect.top - boxRect.top) -
    box.clientHeight / 2 +
    lineRect.height / 2;
  box.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
}

// New track: start from the top instead of inheriting the old position.
watch(
  () => player.track.Path,
  () => {
    lastIndex = -2;
    scroller.value?.scrollTo({ top: 0 });
  },
);

onMounted(() => {
  frame = requestAnimationFrame(tick);
});

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <div ref="scroller" class="min-h-0 overflow-y-auto rounded-xl surface-1 p-3">
    <div v-if="lyrics.loading.value" class="grid h-32 place-items-center">
      <span class="spinner spinner-lg text-faint" />
    </div>

    <div
      v-else-if="lyrics.instrumental.value && !lyrics.lines.value.length"
      class="grid h-32 place-items-center text-center"
    >
      <div>
        <p class="text-base font-medium text-muted-token">Instrumental</p>
        <p class="mt-1 text-sm text-faint">No lyrics for this track</p>
      </div>
    </div>

    <ol v-else-if="lyrics.lines.value.length" class="space-y-1.5">
      <li
        v-for="(line, i) in lyrics.lines.value"
        :key="`${line.time}-${i}`"
        :data-lyric-index="i"
        class="rounded-lg px-2.5 py-1 text-base transition-all duration-300"
        :class="
          i === lyrics.activeIndex.value
            ? 'scale-[1.02] bg-accent-500/15 font-semibold text-main'
            : i < lyrics.activeIndex.value
              ? 'text-faint'
              : 'text-muted-token'
        "
      >
        {{ line.text || "♪" }}
      </li>
    </ol>

    <p
      v-else-if="lyrics.plain.value"
      class="whitespace-pre-line text-base leading-relaxed text-muted-token"
    >
      {{ lyrics.plain.value }}
    </p>

    <div v-else class="grid h-32 place-items-center text-center">
      <p class="text-base text-muted-token">{{ lyrics.error.value ?? "No lyrics found" }}</p>
    </div>
  </div>
</template>
