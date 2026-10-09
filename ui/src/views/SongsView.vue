<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { fetchRandomSongs, searchSongs } from "@/api";
import { useLibraryStore } from "@/stores/library";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import type { Song } from "@/types";
import ArtworkThumb from "../components/ArtworkThumb.vue";
import Icon from "../components/Icon.vue";
import PageHeader from "../components/PageHeader.vue";
import SkeletonList from "../components/SkeletonList.vue";
import SongRow from "../components/SongRow.vue";

const router = useRouter();
const player = usePlayerStore();
const library = useLibraryStore();
const ui = useUiStore();

const songs = ref<Song[]>([]);
const loading = ref(true);
const searching = ref(false);
const nextOffset = ref(-1);
const term = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

/** Debounce handle so typing doesn't fire a request per keystroke. */
let searchTimer: number | undefined;
let searchToken = 0;

const isSearch = computed(() => term.value.trim().length > 1);

async function loadShuffle() {
  loading.value = true;
  try {
    const res = await fetchRandomSongs();
    songs.value = res.Data ?? [];
    nextOffset.value = -1;
  } catch {
    ui.toast("Could not load your library", "error");
    songs.value = [];
  } finally {
    loading.value = false;
  }
}

async function runSearch() {
  const query = term.value.trim();
  if (query.length <= 1) {
    await loadShuffle();
    return;
  }
  const token = ++searchToken;
  searching.value = true;
  try {
    const res = await searchSongs(query, 0);
    if (token !== searchToken) return;
    songs.value = res.Data ?? [];
    nextOffset.value = res.Next;
  } catch {
    if (token === searchToken) {
      ui.toast("Search failed", "error");
      songs.value = [];
    }
  } finally {
    if (token === searchToken) searching.value = false;
  }
}

async function loadMore() {
  if (nextOffset.value < 0 || searching.value) return;
  searching.value = true;
  try {
    const res = await searchSongs(term.value.trim(), nextOffset.value);
    songs.value = [...songs.value, ...(res.Data ?? [])];
    nextOffset.value = res.Next;
  } catch {
    ui.toast("Could not load more results", "error");
  } finally {
    searching.value = false;
  }
}

watch(term, () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => void runSearch(), 280);
});

/** Play a row: build the queue from the currently visible list. */
function play(song: Song) {
  player.play(song, songs.value, isSearch.value ? `search:${term.value}` : "songs");
}

function playAll() {
  if (!songs.value.length) return;
  player.setQueue(songs.value, 0, isSearch.value ? `search:${term.value}` : "songs");
}

function shuffleAll() {
  if (!songs.value.length) return;
  if (!player.shuffle) player.toggleShuffle();
  player.setQueue(songs.value, 0, isSearch.value ? `search:${term.value}` : "songs");
}

function onMenu(event: MouseEvent | TouchEvent, song: Song) {
  const point = "touches" in event ? event.touches[0] : event;
  ui.openContextMenu(point.clientX, point.clientY, { song, from: "list" });
}

function navigate(kind: "artist" | "album" | "year", value: string) {
  if (!value) return;
  if (kind === "year") void router.push({ name: "year", params: { year: value } });
  else void router.push({ name: kind, params: { names: value } });
}

defineExpose({ focusSearch: () => searchInput.value?.focus() });

onMounted(() => void loadShuffle());
</script>

<template>
  <div class="min-h-full">
    <PageHeader
      :title="isSearch ? 'Results' : 'Songs'"
      :subtitle="
        isSearch
          ? `${songs.length} match${songs.length === 1 ? '' : 'es'} for “${term.trim()}”`
          : 'A random selection from your library'
      "
    >
      <template #actions>
        <button
          v-if="songs.length"
          type="button"
          class="btn-ghost-token hidden sm:inline-flex"
          @click="shuffleAll"
        >
          <Icon name="shuffle" :size="16" />
          Shuffle all
        </button>
        <button
          v-if="songs.length"
          type="button"
          class="btn-primary-token"
          @click="playAll"
        >
          <Icon name="play" :size="16" />
          Play
        </button>
      </template>
    </PageHeader>

    <!-- Search -->
    <div class="px-4 pb-4 sm:px-6">
      <div class="relative">
        <Icon
          name="search"
          :size="17"
          class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          ref="searchInput"
          v-model="term"
          type="search"
          placeholder="Search songs, artists, albums…"
          aria-label="Search"
          class="w-full rounded-full border hairline surface-2 py-2.5 pl-11 pr-10 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent-500"
        />
        <button
          v-if="term"
          type="button"
          class="icon-btn absolute right-2 top-1/2 !size-7 -translate-y-1/2"
          aria-label="Clear search"
          @click="term = ''"
        >
          <Icon name="close" :size="15" />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <SkeletonList v-if="loading" :count="10" />

    <!-- Empty -->
    <div v-else-if="!songs.length" class="grid place-items-center px-6 py-20 text-center">
      <div>
        <div class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl surface-2 text-faint">
          <Icon :name="isSearch ? 'search' : 'music'" :size="24" />
        </div>
        <p class="text-sm font-medium text-main">
          {{ isSearch ? "No results" : "Nothing to play yet" }}
        </p>
        <p class="mt-1 text-xs text-muted-token">
          {{
            isSearch
              ? "Try a different artist, album or title."
              : "Add music to your library folder and run a scan."
          }}
        </p>
      </div>
    </div>

    <!-- List -->
    <div v-else class="px-2 sm:px-3">
      <SongRow
        v-for="(song, i) in songs"
        :key="song.Path + i"
        :song="song"
        :index="i"
        :search-term="term"
        :playing="player.playing"
        :is-current="player.isCurrent(song)"
        :active="player.isActive(song, player.queue.indexOf(song))"
        :favourite="library.isFavourite(song)"
        :playlist-count="library.membership(song)"
        @play="play(song)"
        @favourite="library.toggleFavourite(song).catch(() => ui.toast('Could not update favourites', 'error'))"
        @menu="onMenu($event, song)"
        @navigate="navigate"
      />
    </div>

    <!-- Load more -->
    <div v-if="nextOffset >= 0" class="flex justify-center px-4 py-6">
      <button type="button" class="btn-ghost-token" :disabled="searching" @click="loadMore">
        <span v-if="searching" class="spinner" />
        {{ searching ? "Loading…" : "Load more" }}
      </button>
    </div>
  </div>
</template>
