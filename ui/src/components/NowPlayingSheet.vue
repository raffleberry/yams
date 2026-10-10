<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import { formatDuration } from "@/utils/format";
import ArtworkThumb from "./ArtworkThumb.vue";
import Icon from "./Icon.vue";
import LyricsPanel from "./LyricsPanel.vue";
import ProgressBar from "./ProgressBar.vue";

/**
 * Expanded "now playing" view.
 *
 * On phones this is a full-screen sheet. From `sm` up it becomes a centred
 * dialog, which is what makes the track title/artwork in the player bar a
 * working affordance on desktop too (the sheet used to be lg:hidden, so
 * clicking the title there silently did nothing).
 *
 * The container carries the frosted backdrop and never transforms, so the blur
 * stays stable; an inner wrapper handles the entrance animation.
 */
const player = usePlayerStore();
const ui = useUiStore();

const volumeIcon = computed(() => {
  if (player.muted || player.volume === 0) return "volumeMute";
  return player.volume < 0.5 ? "volumeLow" : "volume";
});

/**
 * Template expressions can't see `window`, so the coordinates for the
 * (now anchored, not cursor-positioned) options sheet come from here.
 */
function openMenu(e: MouseEvent) {
  ui.openContextMenu(e.clientX, e.clientY, {
    song: player.track,
    index: player.index,
    from: "nowplaying",
  });
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && ui.nowPlayingOpen) ui.nowPlayingOpen = false;
}

onMounted(() => document.addEventListener("keydown", onKey));

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});

// Lock the page behind the sheet while it is open.
watch(
  () => ui.nowPlayingOpen,
  (open) => {
    document.body.style.overflow = open ? "hidden" : "";
  },
);</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.nowPlayingOpen && player.hasTrack"
      class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Now playing"
    >
      <!-- Dim + frosted backdrop -->
      <div class="sheet-backdrop absolute inset-0" @click="ui.nowPlayingOpen = false" />

      <div
        class="surface-1 sheet-body relative flex max-h-full w-full flex-col overflow-hidden border hairline sm:max-h-[88vh] sm:max-w-4xl sm:rounded-3xl"
      >
        <!-- Ambient tint sampled from the current cover art -->
        <div
          class="pointer-events-none absolute inset-x-0 -top-1/3 h-2/3 opacity-70 blur-3xl"
          :style="{ background: 'var(--ambient, transparent)' }"
        />

        <!-- Header -->
        <header
          class="relative flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5"
        >
          <button
            type="button"
            class="icon-btn"
            aria-label="Close now playing"
            @click="ui.nowPlayingOpen = false"
          >
            <Icon name="chevronDown" :size="22" />
          </button>
          <div class="text-center">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
              Now playing
            </p>
            <p class="max-w-[14rem] truncate text-sm text-muted-token">
              {{ player.track.Album || "—" }}
            </p>
          </div>
          <button
            type="button"
            class="icon-btn"
            aria-label="More options"
            @click="openMenu"
          >
            <Icon name="more" :size="20" />
          </button>
        </header>

        <!-- Body: stacked on mobile, two columns from lg up -->
        <div class="relative min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
            <!-- Left: artwork + metadata + scrubber -->
            <div class="flex flex-col">
              <ArtworkThumb
                :path="player.track.Path"
                :alt="player.track.Album"
                :size="720"
                rounded="rounded-3xl"
                class="mx-auto my-4 w-full max-w-sm shadow-2xl lg:max-w-none"
              />

              <div class="mt-2 text-center lg:text-left">
                <h2 class="line-clamp-2 text-3xl font-bold tracking-tight text-main">
                  {{ player.track.Title || "Unknown" }}
                </h2>
                <p class="mt-1 truncate text-base text-muted-token">
                  {{ player.track.Artists || "Unknown artist" }}
                </p>
                <p v-if="player.track.Album" class="truncate text-sm text-faint">
                  {{ player.track.Album }}
                  <span v-if="player.track.Year"> · {{ player.track.Year }}</span>
                </p>
              </div>

              <div class="mt-6">
                <ProgressBar
                  :value="player.currentTime"
                  :max="player.duration || player.track.Length"
                  :buffered="player.buffered"
                  class="text-accent-400"
                  @seek="player.seekToFraction($event)"
                />
                <div class="mt-1.5 flex justify-between text-xs tabular-nums text-faint">
                  <span>{{ formatDuration(player.currentTime) }}</span>
                  <span>{{ formatDuration(player.duration || player.track.Length) }}</span>
                </div>
              </div>

              <p
                v-if="player.status === 'error'"
                class="mt-3 text-center text-sm text-rose-400 lg:text-left"
              >
                {{ player.error }}
                <button class="underline underline-offset-2" @click="player.retry()">
                  Retry
                </button>
              </p>
            </div>

            <!-- Right: transport, volume, lyrics, queue -->
            <div class="flex flex-col">
              <!-- Transport -->
              <div class="flex items-center justify-center gap-5 lg:mt-2">
                <button
                  type="button"
                  class="icon-btn"
                  :class="player.shuffle ? 'text-accent-400' : ''"
                  aria-label="Toggle shuffle"
                  @click="player.toggleShuffle()"
                >
                  <Icon name="shuffle" :size="19" />
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  aria-label="Previous"
                  @click="player.previous()"
                >
                  <Icon name="skipBack" :size="26" />
                </button>
                <button
                  type="button"
                  class="grid size-16 place-items-center rounded-full bg-main text-[var(--surface-0)] shadow-xl transition-transform active:scale-95"
                  :aria-label="player.playing ? 'Pause' : 'Play'"
                  @click="player.toggle()"
                >
                  <Icon
                    :name="player.playing ? 'pause' : 'play'"
                    :size="26"
                    :stroke-width="2"
                  />
                </button>
                <button type="button" class="icon-btn" aria-label="Next" @click="player.next()">
                  <Icon name="skipForward" :size="26" />
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  :class="player.repeat !== 'off' ? 'text-accent-400' : ''"
                  aria-label="Cycle repeat mode"
                  @click="player.cycleRepeat()"
                >
                  <Icon
                    :name="player.repeat === 'one' ? 'repeatOne' : 'repeat'"
                    :size="19"
                  />
                </button>
              </div>

              <!-- Volume -->
              <div class="mt-5 flex items-center gap-3 px-2">
                <button
                  type="button"
                  class="icon-btn"
                  :aria-label="player.muted ? 'Unmute' : 'Mute'"
                  @click="player.toggleMute()"
                >
                  <Icon :name="volumeIcon" :size="18" />
                </button>
                <ProgressBar
                  :value="player.muted ? 0 : player.volume * 100"
                  :max="100"
                  class="flex-1 text-main"
                  unit=""
                  @seek="player.setVolume($event)"
                />
              </div>

              <!-- Lyrics -->
              <div class="mt-5 flex items-center justify-between">
                <h3
                  class="text-xs font-semibold uppercase tracking-widest"
                  :class="ui.lyricsOpen ? 'text-accent-400' : 'text-faint'"
                >
                  Lyrics
                </h3>
                <button
                  type="button"
                  class="btn-ghost-token !py-1 text-xs"
                  :aria-pressed="ui.lyricsOpen"
                  @click="ui.setLyricsOpen(!ui.lyricsOpen)"
                >
                  <Icon name="lyrics" :size="14" />
                  {{ ui.lyricsOpen ? "Hide" : "Show" }}
                </button>
              </div>
              <LyricsPanel v-if="ui.lyricsOpen" class="mt-2 max-h-72 shrink-0 lg:max-h-80" />

              <!-- Queue -->
              <div class="mt-5">
                <div class="mb-2 flex items-center justify-between">
                  <h3 class="text-base font-semibold text-muted-token">
                    Queue <span class="text-sm text-faint">{{ player.queue.length }}</span>
                  </h3>
                  <button
                    v-if="player.queue.length"
                    type="button"
                    class="text-sm text-faint hover:text-main"
                    @click="player.clearQueue()"
                  >
                    Clear
                  </button>
                </div>
                <div class="space-y-1">
                  <button
                    v-for="(song, i) in player.queue"
                    :key="song.Path + i"
                    type="button"
                    class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:surface-2"
                    :class="player.isActive(song, i) ? 'bg-accent-500/15' : ''"
                    @click="player.playIndex(i)"
                  >
                    <ArtworkThumb :path="song.Path" :size="36" class="shrink-0" />
                    <span class="min-w-0 flex-1">
                      <span
                        class="block truncate text-[15px] font-medium"
                        :class="player.isActive(song, i) ? 'text-accent-400' : 'text-main'"
                      >
                        {{ song.Title }}
                      </span>
                      <span class="block truncate text-sm text-muted-token">
                        {{ song.Artists }}
                      </span>
                    </span>
                    <span class="shrink-0 text-sm tabular-nums text-faint">
                      {{ formatDuration(song.Length) }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
