<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchAlbums, fetchAlbumSongs } from "@/api";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import type { Album, Song } from "@/types";
import ArtworkThumb from "../components/ArtworkThumb.vue";
import Icon from "../components/Icon.vue";
import PageHeader from "../components/PageHeader.vue";
import SkeletonList from "../components/SkeletonList.vue";
import SongRow from "../components/SongRow.vue";

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const ui = useUiStore();

const albums = ref<Album[]>([]);
const tracks = ref<Song[]>([]);
const loading = ref(true);
const loadingTracks = ref(false);
const nextOffset = ref(0);

const albumName = computed(() => (route.params.names as string) ?? "");
const isDetail = computed(() => albumName.value !== "");

const year = computed(() => tracks.value[0]?.Year ?? "");

async function loadAlbums() {
  loading.value = true;
  try {
    const res = await fetchAlbums(0);
    albums.value = res.Data ?? [];
    nextOffset.value = res.Next;
  } catch {
    ui.toast("Could not load albums", "error");
    albums.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (nextOffset.value < 0 || loading.value) return;
  loading.value = true;
  try {
    const res = await fetchAlbums(nextOffset.value);
    albums.value = [...albums.value, ...(res.Data ?? [])];
    nextOffset.value = res.Next;
  } finally {
    loading.value = false;
  }
}

async function loadAlbum() {
  const name = albumName.value;
  if (!name) return;
  loadingTracks.value = true;
  try {
    const res = await fetchAlbumSongs(name);
    tracks.value = res.Data ?? [];
  } catch {
    ui.toast("Could not load album", "error");
    tracks.value = [];
  } finally {
    loadingTracks.value = false;
  }
}

watch(
  () => route.params.names,
  () => {
    if (isDetail.value) {
      void loadAlbum();
      document.title = `${albumName.value} · YAMS`;
    } else {
      document.title = "Albums · YAMS";
      void loadAlbums();
    }
  },
  { immediate: true },
);

function playAll() {
  if (tracks.value.length) player.setQueue(tracks.value, 0, `album:${albumName.value}`);
}

function play(song: Song) {
  player.play(song, tracks.value, `album:${albumName.value}`);
}

function onMenu(event: MouseEvent | TouchEvent, song: Song) {
  const point = "touches" in event ? event.touches[0] : event;
  ui.openContextMenu(point.clientX, point.clientY, { song, from: "list" });
}

const totalSongs = computed(() => albums.value.reduce((n, a) => n + a.Songs, 0));
</script>

<template>
  <!-- Album detail -->
  <div v-if="isDetail" class="min-h-full">
    <PageHeader :title="albumName" :subtitle="`${tracks.length} song${tracks.length === 1 ? '' : 's'}${year ? ` · ${year}` : ''}`">
      <template #actions>
        <button
          v-if="tracks.length"
          type="button"
          class="btn-primary-token"
          @click="playAll"
        >
          <Icon name="play" :size="16" />
          Play
        </button>
      </template>
    </PageHeader>

    <SkeletonList v-if="loadingTracks" :count="8" />

    <div v-else-if="!tracks.length" class="grid place-items-center px-6 py-20 text-center">
      <p class="text-base text-muted-token">This album has no tracks.</p>
    </div>

    <div v-else class="px-2 sm:px-3">
      <SongRow
        v-for="(song, i) in tracks"
        :key="song.Path + i"
        :song="song"
        :index="i"
        show-index
        :show-album="false"
        :playing="player.playing"
        :is-current="player.isCurrent(song)"
        :active="player.isActive(song, player.queue.indexOf(song))"
        :favourite="false"
        @play="play(song)"
        @menu="onMenu($event, song)"
        @navigate="(kind, value) => kind === 'artist' && router.push({ name: 'artist', params: { names: value } })"
      />
    </div>
  </div>

  <!-- Album grid -->
  <div v-else class="min-h-full">
    <PageHeader
      title="Albums"
      :subtitle="albums.length ? `${albums.length} albums · ${totalSongs} songs` : 'Loading…'"
    />

    <SkeletonList v-if="loading" :count="8" />

    <div
      v-else-if="!albums.length"
      class="grid place-items-center px-6 py-20 text-center"
    >
      <p class="text-base text-muted-token">No albums found.</p>
    </div>

    <div v-else class="grid grid-cols-2 gap-4 px-4 pb-8 sm:grid-cols-3 sm:px-6 md:grid-cols-4 xl:grid-cols-5">
      <RouterLink
        v-for="album in albums"
        :key="album.Path"
        :to="{ name: 'album', params: { names: album.Album } }"
        class="card-hover group rounded-xl p-2 hover:surface-2"
      >
        <ArtworkThumb
          :path="album.Path"
          :alt="album.Album"
          :size="400"
          rounded="rounded-lg"
          class="w-full shadow-md"
        />
        <p class="mt-2 truncate text-base font-semibold text-main">{{ album.Album }}</p>
        <p class="truncate text-sm text-muted-token">
          {{ album.AlbumArtist || "Unknown" }}
          <span v-if="album.Year"> · {{ album.Year }}</span>
        </p>
        <p class="mt-0.5 text-xs text-faint">{{ album.Songs }} songs</p>
      </RouterLink>
    </div>

    <div v-if="nextOffset >= 0 && !loading" class="flex justify-center px-4 pb-8">
      <button type="button" class="btn-ghost-token" @click="loadMore">Load more</button>
    </div>
  </div>
</template>
