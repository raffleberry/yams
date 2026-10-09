<script setup lang="ts">
import { computed } from "vue";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import { formatDuration } from "@/utils/format";
import ArtworkThumb from "./ArtworkThumb.vue";
import Icon from "./Icon.vue";
import LyricsPanel from "./LyricsPanel.vue";

/**
 * Desktop right-hand "now playing" pane.
 *
 * The whole pane is one scroll container with a compact hero and a
 * natural-height queue. Nothing is ever squeezed to zero: on short viewports
 * the pane scrolls instead of hiding the queue behind unshrinkable hero
 * content (the previous flex-1/flex-1 split did exactly that).
 *
 * Transport, scrubber and volume deliberately live only in the bottom player
 * bar, so the pane never duplicates them.
 */
const player = usePlayerStore();
const ui = useUiStore();

const heroArtwork = computed(() => player.track.Path);

function emitMenu(event: MouseEvent, index: number) {
  const song = player.queue[index];
  if (!song) return;
  event.preventDefault();
  ui.openContextMenu(event.clientX, event.clientY, { song, index, from: "queue" });
}

function remove(index: number) {
  player.removeFromQueue(index);
}
</script>

<template>
  <aside class="h-full overflow-y-auto overscroll-contain">
    <div v-if="player.hasTrack" class="flex flex-col gap-4 px-4 pb-5 pt-4">
      <!-- Pane header -->
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-faint">
          Now playing
        </h2>
        <div class="flex items-center">
          <button
            type="button"
            class="icon-btn !size-8"
            :class="ui.lyricsOpen ? 'text-accent-400' : ''"
            aria-label="Toggle lyrics"
            :aria-pressed="ui.lyricsOpen"
            @click="ui.setLyricsOpen(!ui.lyricsOpen)"
          >
            <Icon name="lyrics" :size="16" />
          </button>
          <button
            type="button"
            class="icon-btn !size-8"
            aria-label="Close now playing pane"
            @click="ui.setQueueOpen(false)"
          >
            <Icon name="close" :size="15" />
          </button>
        </div>
      </div>

      <!-- Artwork -->
      <div class="relative mx-auto w-full max-w-[15rem]">
        <div
          class="pointer-events-none absolute -inset-6 -z-10 scale-110 rounded-full opacity-70 blur-3xl"
          :style="{ background: 'var(--ambient, transparent)' }"
        />
        <ArtworkThumb
          :path="heroArtwork"
          :alt="player.track.Album"
          :size="480"
          rounded="rounded-2xl"
          class="w-full shadow-2xl"
        />
      </div>

      <!-- Metadata -->
      <div class="text-center">
        <h3 class="line-clamp-2 text-xl font-bold tracking-tight text-main">
          {{ player.track.Title || "Unknown" }}
        </h3>
        <p class="mt-0.5 truncate text-base text-muted-token">
          {{ player.track.Artists || "Unknown artist" }}
        </p>
        <p v-if="player.track.Album" class="truncate text-sm text-faint">
          {{ player.track.Album }}
          <span v-if="player.track.Year"> · {{ player.track.Year }}</span>
        </p>
      </div>

      <!-- Lyrics -->
      <LyricsPanel v-if="ui.lyricsOpen" class="max-h-80 shrink-0" />

      <!-- Queue -->
      <div>
        <div class="flex items-center justify-between pb-1.5">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-faint">
            Up next
            <span class="ml-1 tabular-nums">{{ player.queue.length }}</span>
          </h3>
          <button
            v-if="player.queue.length"
            type="button"
            class="text-xs text-faint transition-colors hover:text-main"
            @click="player.clearQueue()"
          >
            Clear
          </button>
        </div>

        <TransitionGroup name="fade" tag="div" class="space-y-0.5">
          <div
            v-for="(song, i) in player.queue"
            :key="song.Path + i"
            class="group flex cursor-default items-center gap-3 rounded-lg px-2 py-2 transition-colors"
            :class="player.isActive(song, i) ? 'bg-accent-500/15' : 'hover:surface-2'"
            @contextmenu.prevent="emitMenu($event, i)"
          >
            <ArtworkThumb :path="song.Path" :size="36" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <p
                class="truncate text-[15px] font-medium"
                :class="player.isActive(song, i) ? 'text-accent-400' : 'text-main'"
              >
                {{ song.Title }}
              </p>
              <p class="truncate text-sm text-muted-token">{{ song.Artists }}</p>
            </div>
            <span class="shrink-0 text-sm tabular-nums text-faint">
              {{ formatDuration(song.Length) }}
            </span>
            <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                class="icon-btn !size-7"
                aria-label="Play now"
                @click="player.playIndex(i)"
              >
                <Icon name="play" :size="14" />
              </button>
              <button
                type="button"
                class="icon-btn !size-7 hover:!text-rose-400"
                aria-label="Remove from queue"
                @click="remove(i)"
              >
                <Icon name="close" :size="14" />
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="grid h-full place-items-center px-6 text-center">
      <div>
        <div
          class="mx-auto mb-4 grid size-16 place-items-center rounded-2xl surface-2 text-faint"
        >
          <Icon name="music" :size="28" />
        </div>
        <p class="text-base font-medium text-muted-token">Nothing playing</p>
        <p class="mt-1 text-sm text-faint">Pick a track to get started</p>
      </div>
    </div>
  </aside>
</template>
