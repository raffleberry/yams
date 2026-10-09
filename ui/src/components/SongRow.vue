<script setup lang="ts">
import { computed } from "vue";
import ArtworkThumb from "./ArtworkThumb.vue";
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

/**
 * Mobile tap-to-play: a tap anywhere on the row (outside a button) starts
 * playback. Desktop keeps the previous behaviour (artwork button only) so
 * text selection and hover interactions are unaffected.
 */
function onRowClick(event: MouseEvent) {
  if (window.matchMedia("(min-width: 640px)").matches) return;
  if ((event.target as HTMLElement).closest("button, a")) return;
  emit("play");
}
</script>

<template>
  <div
    class="group relative grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2 py-3 transition-colors active:surface-2 sm:cursor-default sm:gap-4 sm:px-3 sm:py-2 sm:hover:surface-2 sm:active:surface-3"
    :class="[
      active ? 'bg-accent-500/15' : '',
      !song.Path && 'opacity-50',
    ]"
    :style="active ? { boxShadow: 'inset 0 0 0 1px var(--color-accent-500)' } : undefined"
    role="row"
    @click="onRowClick"
  >
    <!-- Artwork / index -->
    <button
      type="button"
      class="relative shrink-0 overflow-hidden rounded-lg"
      :aria-label="`Play ${song.Title}`"
      @click.stop="emit('play')"
      @contextmenu.prevent="emit('menu', $event)"
    >
      <ArtworkThumb
        :path="song.Path"
        :alt="song.Album || song.Title"
        :size="56"
        class="size-14 transition-transform duration-300 sm:group-hover:scale-105"
      />
      <span
        class="absolute inset-0 grid place-items-center bg-black/55 opacity-0 backdrop-blur-[1px] transition-opacity sm:group-hover:opacity-100"
        :class="isCurrent ? '!opacity-100' : ''"
      >
        <Icon v-if="active && playing" name="pause" :size="20" class="text-white" />
        <Icon v-else name="play" :size="20" class="text-white" />
      </span>
    </button>

    <!-- Text (larger on mobile) -->
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <span
          class="truncate text-lg font-medium sm:text-base"
          :class="active ? 'text-accent-400' : 'text-main'"
          v-html="highlight(song.Title || 'Unknown', searchTerm)"
        />
        <span v-if="playlistCount > 0" class="chip" :title="`In ${playlistCount} playlist(s)`">
          {{ playlistCount }}
        </span>
        <!-- Mobile-only favourite indicator (non-interactive; toggling lives in the ⋯ menu) -->
        <span
          v-if="favourite"
          class="ml-auto grid shrink-0 place-items-center pr-0.5 text-rose-400 sm:hidden"
          aria-hidden="true"
          title="Favourite"
        >
          <Icon name="heart" :size="13" />
        </span>
      </div>

      <div class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[15px] text-muted-token sm:text-sm">
        <template v-for="(artist, i) in artists" :key="artist + i">
          <!-- Desktop: navigable link. Mobile: plain text (see the span below). -->
          <button
            v-if="linked(artist)"
            type="button"
            class="hidden truncate transition-colors sm:inline sm:hover:text-accent-400 sm:hover:underline"
            v-html="highlight(artist, searchTerm)"
            @click.stop="emit('navigate', 'artist', artist)"
          />
          <span v-else class="hidden truncate sm:inline" v-html="highlight(artist, searchTerm)" />
          <span class="truncate sm:hidden" v-html="highlight(artist, searchTerm)" />
          <span v-if="i < artists.length - 1">,</span>
        </template>
        <template v-if="subtitle && showAlbum">
          <span class="text-faint">·</span>
          <button
            type="button"
            class="hidden truncate transition-colors sm:inline sm:hover:text-accent-400 sm:hover:underline"
            @click.stop="emit('navigate', 'album', song.Album)"
            v-html="highlight(song.Album, searchTerm)"
          />
          <span class="truncate sm:hidden" v-html="highlight(song.Album, searchTerm)" />
        </template>
      </div>
    </div>

    <!-- Meta + actions -->
    <div class="flex shrink-0 items-center gap-0.5 sm:gap-2">
      <span
        v-if="showIndex"
        class="hidden w-6 text-right text-xs tabular-nums text-faint sm:block"
      >
        {{ song.Track || index + 1 }}
      </span>

      <span class="hidden text-xs tabular-nums text-faint lg:block">
        {{ formatBitrate(song.Bitrate) }}
      </span>

      <span class="w-10 text-right text-[15px] tabular-nums text-muted-token sm:text-sm">
        {{ formatDuration(song.Length) }}
      </span>

      <!-- Desktop-only favourite toggle; on mobile this lives in the ⋯ menu -->
      <button
        type="button"
        class="hidden size-8 place-items-center rounded-full transition-colors sm:grid sm:hover:bg-current/10"
        :class="favourite ? 'text-rose-400' : 'text-faint sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100'"
        :aria-label="favourite ? 'Remove from favourites' : 'Add to favourites'"
        :aria-pressed="favourite"
        @click.stop="emit('favourite')"
      >
        <Icon name="heart" :size="16" />
      </button>

      <!-- Always visible on touch; hover-reveal on desktop -->
      <button
        type="button"
        class="grid size-10 place-items-center rounded-full text-muted-token transition-colors active:surface-2 sm:size-8 sm:text-faint sm:opacity-0 sm:hover:bg-current/10 sm:hover:text-main sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
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
