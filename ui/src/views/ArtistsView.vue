<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchArtistSongs, fetchArtists } from "@/api";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import { splitArtists } from "@/utils/format";
import type { Song } from "@/types";
import Icon from "../components/Icon.vue";
import PageHeader from "../components/PageHeader.vue";
import SkeletonList from "../components/SkeletonList.vue";
import SongRow from "../components/SongRow.vue";

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const ui = useUiStore();

const artists = ref<string[]>([]);
const tracks = ref<Song[]>([]);
const loading = ref(true);
const loadingTracks = ref(false);
const filter = ref("");

const artistName = computed(() => ((route.params.names as string) ?? "").trim());
const isDetail = computed(() => artistName.value !== "");

/** Artists in the context we're viewing get their name shown as plain text. */
const hiddenArtists = computed(() =>
  isDetail.value ? splitArtists(artistName.value) : [],
);

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase();
  if (!q) return artists.value;
  return artists.value.filter((a) => a.toLowerCase().includes(q));
});

/** Deterministic accent per artist so the grid isn't monotonous. */
function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const tintFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return `oklch(0.45 0.13 ${hash})`;
};

async function loadArtists() {
  loading.value = true;
  try {
    const res = await fetchArtists();
    artists.value = (res.Data ?? []).map((a) => a.Artists).sort((a, b) => a.localeCompare(b));
  } catch {
    ui.toast("Could not load artists", "error");
  } finally {
    loading.value = false;
  }
}

async function loadArtist() {
  const name = artistName.value;
  if (!name) return;
  loadingTracks.value = true;
  try {
    const res = await fetchArtistSongs(name);
    tracks.value = res.Data ?? [];
  } catch {
    ui.toast("Could not load artist", "error");
    tracks.value = [];
  } finally {
    loadingTracks.value = false;
  }
}

watch(
  () => route.params.names,
  () => {
    if (isDetail.value) {
      document.title = `${artistName.value} · YAMS`;
      void loadArtist();
    } else {
      document.title = "Artists · YAMS";
      void loadArtists();
    }
  },
  { immediate: true },
);

function playAll() {
  if (tracks.value.length) player.setQueue(tracks.value, 0, `artist:${artistName.value}`);
}

function play(song: Song) {
  player.play(song, tracks.value, `artist:${artistName.value}`);
}

function onMenu(event: MouseEvent | TouchEvent, song: Song) {
  const point = "touches" in event ? event.touches[0] : event;
  ui.openContextMenu(point.clientX, point.clientY, { song, from: "list" });
}

const albumsOf = computed(() => {
  const names = new Set<string>();
  for (const t of tracks.value) if (t.Album) names.add(t.Album);
  return [...names].sort();
});
</script>

<template>
  <!-- Artist detail -->
  <div v-if="isDetail" class="min-h-full">
    <PageHeader :title="artistName" :subtitle="`${tracks.length} song${tracks.length === 1 ? '' : 's'}`">
      <template #actions>
        <button v-if="tracks.length" type="button" class="btn-primary-token" @click="playAll">
          <Icon name="play" :size="16" />
          Play
        </button>
      </template>
    </PageHeader>

    <div v-if="albumsOf.length" class="px-4 pb-4 sm:px-6">
      <div class="flex flex-wrap gap-2">
        <RouterLink
          v-for="album in albumsOf"
          :key="album"
          :to="{ name: 'album', params: { names: album } }"
          class="rounded-full surface-2 px-3 py-1.5 text-sm text-muted-token transition-colors hover:text-main"
        >
          {{ album }}
        </RouterLink>
      </div>
    </div>

    <SkeletonList v-if="loadingTracks" :count="8" />

    <div v-else-if="!tracks.length" class="grid place-items-center px-6 py-20 text-center">
      <p class="text-base text-muted-token">No tracks found for this artist.</p>
    </div>

    <div v-else class="px-2 sm:px-3">
      <SongRow
        v-for="(song, i) in tracks"
        :key="song.Path + i"
        :song="song"
        :index="i"
        :hide-artists="hiddenArtists"
        :playing="player.playing"
        :is-current="player.isCurrent(song)"
        :active="player.isActive(song, player.queue.indexOf(song))"
        :favourite="false"
        @play="play(song)"
        @menu="onMenu($event, song)"
        @navigate="(kind, value) => kind === 'album' && router.push({ name: 'album', params: { names: value } })"
      />
    </div>
  </div>

  <!-- Artist grid -->
  <div v-else class="min-h-full">
    <PageHeader title="Artists" :subtitle="`${artists.length} artists`" />

    <div v-if="artists.length" class="px-4 pb-4 sm:px-6">
      <div class="relative">
        <Icon
          name="search"
          :size="17"
          class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          v-model="filter"
          type="search"
          placeholder="Filter artists…"
          aria-label="Filter artists"
          class="w-full rounded-full border hairline surface-2 py-2.5 pl-11 pr-4 text-base outline-none transition-colors placeholder:text-faint focus:border-accent-500"
        />
      </div>
    </div>

    <SkeletonList v-if="loading" :count="8" />

    <div
      v-else-if="!filtered.length"
      class="grid place-items-center px-6 py-20 text-center"
    >
      <p class="text-base text-muted-token">No artists found.</p>
    </div>

    <div v-else class="grid grid-cols-2 gap-4 px-4 pb-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 sm:px-6">
      <RouterLink
        v-for="artist in filtered"
        :key="artist"
        :to="{ name: 'artist', params: { names: artist } }"
        class="card-hover group flex flex-col items-center rounded-xl p-3 text-center hover:surface-2"
      >
        <div
          class="grid aspect-square w-full max-w-[8rem] place-items-center rounded-full text-2xl font-bold text-white shadow-lg"
          :style="{ background: tintFor(artist) }"
        >
          {{ initials(artist) }}
        </div>
        <p class="mt-2.5 line-clamp-2 w-full text-base font-medium text-main">{{ artist }}</p>
      </RouterLink>
    </div>
  </div>
</template>
