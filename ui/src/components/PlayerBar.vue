<script setup lang="ts">
import { computed } from "vue";
import { useLibraryStore } from "@/stores/library";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import { formatDuration } from "@/utils/format";
import ArtworkThumb from "./ArtworkThumb.vue";
import Icon from "./Icon.vue";
import ProgressBar from "./ProgressBar.vue";

/**
 * The persistent transport bar.
 *
 * Desktop (md+) is a full-width three-zone layout: the track cluster on the
 * left, a centred transport + scrubber column, and volume/queue/expand on the
 * right. On mobile it collapses to a compact bar that expands into the Now
 * Playing sheet via the `expand` emit.
 */
const emit = defineEmits<{ expand: [] }>();

const player = usePlayerStore();
const library = useLibraryStore();
const ui = useUiStore();

const repeatLabel = computed(() => `Repeat ${player.repeat}`);
const shuffleLabel = computed(() => `Shuffle (${player.shuffle ? "on" : "off"})`);

const volumeIcon = computed(() => {
  if (player.muted || player.volume === 0) return "volumeMute";
  return player.volume < 0.5 ? "volumeLow" : "volume";
});

const isBusy = computed(() => player.status === "loading" || player.status === "buffering");

const isFav = computed(() => player.hasTrack && library.isFavourite(player.track));

function toggleFav() {
  if (!player.hasTrack) return;
  void library
    .toggleFavourite(player.track)
    .catch(() => ui.toast("Could not update favourites", "error"));
}

function openMenu(e: MouseEvent) {
  if (!player.hasTrack) return;
  ui.openContextMenu(e.clientX, e.clientY, {
    song: player.track,
    index: player.index,
    from: "playerbar",
  });
}

const stateLabel = computed(() => {
  switch (player.status) {
    case "loading":
      return "Loading";
    case "buffering":
      return "Buffering";
    case "error":
      return player.error ?? "Playback error";
    case "playing":
      return "";
    default:
      return "";
  }
});
</script>

<template>
  <footer
    class="glass relative z-30 shrink-0 border-t hairline"
    :class="player.hasTrack ? '' : 'opacity-90'"
  >
    <!-- Ambient glow driven by the current cover art -->
    <div
      class="pointer-events-none absolute inset-x-0 -top-24 h-24 opacity-60 blur-3xl"
      :style="{ background: 'var(--ambient, transparent)' }"
    />

    <!-- Desktop: full-width three-zone bar -->
    <div
      class="relative hidden w-full grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,1fr)] items-center gap-4 px-4 py-3 md:grid lg:gap-6 lg:px-6"
    >
      <!-- Left: track cluster -->
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left transition-colors hover:surface-2"
          :aria-label="player.hasTrack ? 'Open now playing' : 'Nothing playing'"
          @click="emit('expand')"
        >
          <ArtworkThumb
            :path="player.track.Path"
            :alt="player.track.Album"
            :size="52"
            rounded="rounded-xl"
            class="shrink-0 shadow-lg"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[15px] font-semibold text-main">
              {{ player.track.Title || "Nothing playing" }}
            </span>
            <span class="block truncate text-sm text-muted-token">
              <span v-if="stateLabel" class="text-accent-400">{{ stateLabel }}</span>
              <span v-else>{{ player.track.Artists || "Pick something from your library" }}</span>
            </span>
          </span>
        </button>
        <div class="hidden shrink-0 items-center lg:flex">
          <button
            type="button"
            class="icon-btn"
            :class="isFav ? 'text-rose-400' : ''"
            :disabled="!player.hasTrack"
            :aria-label="isFav ? 'Remove from favourites' : 'Add to favourites'"
            :aria-pressed="isFav"
            @click="toggleFav"
          >
            <Icon name="heart" :size="17" />
          </button>
          <button
            type="button"
            class="icon-btn"
            :disabled="!player.hasTrack"
            aria-label="More actions for this track"
            @click="openMenu"
          >
            <Icon name="more" :size="17" />
          </button>
        </div>
      </div>

      <!-- Centre: transport over a wide scrubber -->
      <div class="flex w-full min-w-0 max-w-2xl flex-col gap-1 justify-self-center">
        <div class="flex items-center justify-center gap-1 sm:gap-2">
          <button
            type="button"
            class="icon-btn"
            :class="player.shuffle ? 'text-accent-400' : ''"
            :disabled="!player.hasTrack"
            :aria-label="shuffleLabel"
            :aria-pressed="player.shuffle"
            @click="player.toggleShuffle()"
          >
            <Icon name="shuffle" :size="17" />
          </button>

          <button
            type="button"
            class="icon-btn"
            :disabled="!player.hasTrack"
            aria-label="Previous track"
            @click="player.previous()"
          >
            <Icon name="skipBack" :size="19" />
          </button>

          <button
            type="button"
            class="grid size-12 place-items-center rounded-full bg-main text-[var(--surface-0)] shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
            :disabled="!player.hasTrack"
            :aria-label="player.playing ? 'Pause' : 'Play'"
            @click="player.toggle()"
          >
            <Icon :name="player.playing ? 'pause' : 'play'" :size="21" :stroke-width="2" />
          </button>

          <button
            type="button"
            class="icon-btn"
            :disabled="!player.hasTrack"
            aria-label="Next track"
            @click="player.next()"
          >
            <Icon name="skipForward" :size="19" />
          </button>

          <button
            type="button"
            class="icon-btn"
            :class="player.repeat !== 'off' ? 'text-accent-400' : ''"
            :disabled="!player.hasTrack"
            :aria-label="repeatLabel"
            @click="player.cycleRepeat()"
          >
            <Icon :name="player.repeat === 'one' ? 'repeatOne' : 'repeat'" :size="17" />
          </button>
        </div>

        <div class="flex items-center gap-2.5">
          <span class="w-10 shrink-0 text-right text-xs tabular-nums text-faint">
            {{ formatDuration(player.currentTime) }}
          </span>
          <ProgressBar
            :value="player.currentTime"
            :max="player.duration || player.track.Length"
            :buffered="player.buffered"
            :disabled="!player.hasTrack"
            size="sm"
            class="text-accent-400"
            @seek="player.seekToFraction($event)"
          />
          <span class="w-10 shrink-0 text-xs tabular-nums text-faint">
            {{ formatDuration(player.duration || player.track.Length) }}
          </span>
        </div>
      </div>

      <!-- Right: volume, queue, expand -->
      <div class="flex items-center justify-end gap-0.5 sm:gap-1">
        <button
          type="button"
          class="icon-btn"
          :aria-label="player.muted ? 'Unmute' : 'Mute'"
          @click="player.toggleMute()"
        >
          <Icon :name="volumeIcon" :size="17" />
        </button>
        <div class="hidden w-24 text-main lg:block xl:w-28">
          <ProgressBar
            :value="player.muted ? 0 : player.volume * 100"
            :max="100"
            size="sm"
            :disabled="false"
            unit=""
            @seek="player.setVolume($event)"
          />
        </div>
        <button
          type="button"
          class="icon-btn"
          :class="ui.queueOpen ? 'text-accent-400' : ''"
          aria-label="Toggle now playing panel"
          :aria-pressed="ui.queueOpen"
          @click="ui.toggleQueue()"
        >
          <Icon name="queue" :size="17" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :disabled="!player.hasTrack"
          aria-label="Open now playing"
          @click="emit('expand')"
        >
          <Icon name="expand" :size="17" />
        </button>
      </div>
    </div>

    <!-- Loading / error strip -->
    <Transition name="fade">
      <div
        v-if="isBusy || player.status === 'error'"
        class="relative flex items-center justify-center gap-2 px-4 py-1.5 text-sm"
        :class="player.status === 'error' ? 'text-rose-400' : 'text-muted-token'"
      >
        <span v-if="isBusy" class="spinner" aria-hidden="true" />
        <span v-if="player.status === 'error'">{{ player.error }}</span>
        <button
          v-if="player.status === 'error'"
          type="button"
          class="underline underline-offset-2 hover:text-rose-300"
          @click="player.retry()"
        >
          Retry
        </button>
      </div>
    </Transition>

    <!-- Mobile transport strip -->
    <div class="relative flex items-center justify-between gap-3 px-3 pb-1 md:hidden">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 text-left"
        @click="emit('expand')"
      >
        <span class="truncate text-sm tabular-nums text-faint">
          {{ formatDuration(player.currentTime) }}
        </span>
        <ProgressBar
          :value="player.currentTime"
          :max="player.duration || player.track.Length"
          :buffered="player.buffered"
          :disabled="!player.hasTrack"
          size="sm"
          class="text-accent-400"
          @seek="player.seekToFraction($event)"
        />
        <span class="shrink-0 text-sm tabular-nums text-faint">
          {{ formatDuration(player.duration || player.track.Length) }}
        </span>
      </button>

      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="icon-btn"
          :class="player.shuffle ? 'text-accent-400' : ''"
          aria-label="Toggle shuffle"
          @click="player.toggleShuffle()"
        >
          <Icon name="shuffle" :size="16" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :class="player.repeat !== 'off' ? 'text-accent-400' : ''"
          aria-label="Cycle repeat mode"
          @click="player.cycleRepeat()"
        >
          <Icon :name="player.repeat === 'one' ? 'repeatOne' : 'repeat'" :size="16" />
        </button>
        <button type="button" class="icon-btn" aria-label="Next track" @click="player.next()">
          <Icon name="skipForward" :size="17" />
        </button>
      </div>
    </div>
  </footer>
</template>
