<script setup lang="ts">
import { computed } from "vue";
import ArtworkThumb from "./ArtworkThumb.vue";
import Equalizer from "./Equalizer.vue";
import Icon from "./Icon.vue";
import { formatBitrate, formatDuration, highlight, splitArtists } from "@/utils/format";
import type { Song } from "@/types";

const props = withDefaults(
  defineProps<{
    song: Song;
    index?: number;
    playing?: boolean;
    active?: boolean;
    isCurrent?: boolean;
    favourite?: boolean;
    playlistCount?: number;
    searchTerm?: string;
    showAlbum?: boolean;
    showIndex?: boolean;
    hideArtists?: string[];
  }>(),
  {
    index: -1,
    playing: false,
    active: false,
    isCurrent: false,
    favourite: false,
    playlistCount: 0,
    searchTerm: "",
    showAlbum: true,
    showIndex: false,
    hideArtists: () => [],
  },
);

const emit = defineEmits<{
  play: [];
  favourite: [];
  menu: [event: MouseEvent | TouchEvent];
  navigate: [kind: "artist" | "album" | "year", value: string];
}>();

const artists = computed(() => splitArtists(props.song.Artists));
const subtitle = computed(() => {
  const bits: string[] = [];
  if (props.song.Album) bits.push(props.song.Album);
  if (props.song.Year) bits.push(props.song.Year);
  return bits.join(" · ");
});

const linked = (artist: string) => !props.hideArtists.includes(artist);
</script>

<template>
  <div
    class="group relative grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition-colors sm:gap-4 sm:px-3"
    :class="[
      active ? 'bg-accent-500/15' : 'hover:surface-2',
      !song.Path && 'opacity-50',
    ]"
    :style="active ? { boxShadow: 'inset 0 0 0 1px var(--color-accent-500)' } : undefined"
    role="row"
  >
    <!-- Artwork / index -->
    <button
      type="button"
      class="relative shrink-0 overflow-hidden rounded-lg"
      :aria-label="`Play ${song.Title}`"
      @click="emit('play')"
      @contextmenu.prevent="emit('menu', $event)"
    >
      <ArtworkThumb
        :path="song.Path"
        :alt="song.Album || song.Title"
        :size="48"
        class="transition-transform duration-300 group-hover:scale-105 sm:size-14"
      />
      <span
        class="absolute inset-0 grid place-items-center bg-black/55 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100"
        :class="isCurrent ? '!opacity-100' : ''"
      >
        <Icon v-if="active && playing" name="pause" :size="20" class="text-white" />
        <Icon v-else name="play" :size="20" class="text-white" />
      </span>
    </button>

    <!-- Text -->
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <span
          class="truncate text-[15px] font-medium"
          :class="active ? 'text-accent-400' : 'text-main'"
          v-html="highlight(song.Title || 'Unknown', searchTerm)"
        />
        <span v-if="playlistCount > 0" class="chip" :title="`In ${playlistCount} playlist(s)`">
          {{ playlistCount }}
        </span>
      </div>

      <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-token">
        <template v-for="(artist, i) in artists" :key="artist + i">
          <button
            v-if="linked(artist)"
            type="button"
            class="truncate transition-colors hover:text-accent-400 hover:underline"
            v-html="highlight(artist, searchTerm)"
            @click.stop="emit('navigate', 'artist', artist)"
          />
          <span v-else class="truncate" v-html="highlight(artist, searchTerm)" />
          <span v-if="i < artists.length - 1">,</span>
        </template>
        <template v-if="subtitle && showAlbum">
          <span class="text-faint">·</span>
          <button
            type="button"
            class="truncate transition-colors hover:text-accent-400 hover:underline"
            @click.stop="emit('navigate', 'album', song.Album)"
            v-html="highlight(song.Album, searchTerm)"
          />
        </template>
      </div>
    </div>

    <!-- Meta + actions -->
    <div class="flex shrink-0 items-center gap-1 sm:gap-2">
      <span
        v-if="showIndex"
        class="hidden w-6 text-right text-xs tabular-nums text-faint sm:block"
      >
        {{ song.Track || index + 1 }}
      </span>

      <span class="hidden text-xs tabular-nums text-faint lg:block">
        {{ formatBitrate(song.Bitrate) }}
      </span>

      <span class="w-10 text-right text-xs tabular-nums text-muted-token">
        {{ formatDuration(song.Length) }}
      </span>

      <button
        type="button"
        class="grid size-8 place-items-center rounded-full transition-colors hover:bg-current/10"
        :class="favourite ? 'text-rose-400' : 'text-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100'"
        :aria-label="favourite ? 'Remove from favourites' : 'Add to favourites'"
        :aria-pressed="favourite"
        @click.stop="emit('favourite')"
      >
        <Icon name="heart" :size="16" />
      </button>

      <button
        type="button"
        class="grid size-8 place-items-center rounded-full text-faint opacity-0 transition-colors hover:bg-current/10 hover:text-main focus-visible:opacity-100 group-hover:opacity-100"
        aria-label="More actions"
        @click.stop="emit('menu', $event)"
      >
        <Icon name="more" :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding-inline: 0.3rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  background: color-mix(in oklab, var(--color-accent-500) 22%, transparent);
  color: var(--color-accent-400);
}
</style>
