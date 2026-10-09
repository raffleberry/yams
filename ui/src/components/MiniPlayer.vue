<script setup lang="ts">
import { computed } from "vue";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import ArtworkThumb from "./ArtworkThumb.vue";
import Equalizer from "./Equalizer.vue";
import Icon from "./Icon.vue";

/** Compact player bar shown on small screens. */
const player = usePlayerStore();
const ui = useUiStore();

const statusText = computed(() => {
  if (player.status === "loading") return "Loading…";
  if (player.status === "buffering") return "Buffering…";
  if (player.status === "error") return player.error ?? "Error";
  if (!player.hasTrack) return "Nothing playing";
  return player.track.Artists;
});
</script>

<template>
  <div
    v-if="player.hasTrack"
    class="flex w-full items-center gap-3 border-t hairline px-3 py-2 md:hidden"
  >
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-3 text-left"
      aria-label="Open now playing"
      @click="ui.nowPlayingOpen = true"
    >
      <ArtworkThumb :path="player.track.Path" :size="40" class="shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-[15px] font-semibold text-main">{{ player.track.Title }}</p>
        <p
          class="truncate text-sm"
          :class="player.status === 'error' ? 'text-rose-400' : 'text-muted-token'"
        >
          {{ statusText }}
        </p>
      </div>
    </button>

    <span
      v-if="player.status === 'loading' || player.status === 'buffering'"
      class="spinner shrink-0 text-accent-400"
    />
    <Equalizer v-else-if="player.playing" class="shrink-0 text-accent-400" active />

    <button
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-full text-main active:scale-95"
      :aria-label="player.playing ? 'Pause' : 'Play'"
      @click="player.toggle()"
    >
      <Icon :name="player.playing ? 'pause' : 'play'" :size="22" :stroke-width="2" />
    </button>
  </div>
</template>
