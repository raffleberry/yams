<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { fetchYearSongs, fetchYears } from "@/api";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import type { Song } from "@/types";
import Icon from "../components/Icon.vue";
import PageHeader from "../components/PageHeader.vue";
import SkeletonList from "../components/SkeletonList.vue";
import SongRow from "../components/SongRow.vue";

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const ui = useUiStore();

const years = ref<string[]>([]);
const tracks = ref<Song[]>([]);
const loading = ref(true);
const loadingTracks = ref(false);

const year = computed(() => (route.params.year as string) ?? "");
const isDetail = computed(() => year.value !== "");

/** Newest first. */
const sorted = computed(() => [...years.value].sort((a, b) => b.localeCompare(a)));

async function loadYears() {
  loading.value = true;
  try {
    const res = await fetchYears();
    years.value = res.Data ?? [];
  } catch {
    ui.toast("Could not load years", "error");
  } finally {
    loading.value = false;
  }
}

async function loadYear() {
  const value = year.value;
  if (!value) return;
  loadingTracks.value = true;
  try {
    const res = await fetchYearSongs(value);
    tracks.value = res.Data ?? [];
  } catch {
    ui.toast("Could not load that year", "error");
    tracks.value = [];
  } finally {
    loadingTracks.value = false;
  }
}

watch(
  () => route.params.year,
  () => {
    if (isDetail.value) {
      document.title = `${year.value} · YAMS`;
      void loadYear();
    } else {
      document.title = "Years · YAMS";
      void loadYears();
    }
  },
  { immediate: true },
);

function playAll() {
  if (tracks.value.length) player.setQueue(tracks.value, 0, `year:${year.value}`);
}

function play(song: Song) {
  player.play(song, tracks.value, `year:${year.value}`);
}

function onMenu(event: MouseEvent | TouchEvent, song: Song) {
  const point = "touches" in event ? event.touches[0] : event;
  ui.openContextMenu(point.clientX, point.clientY, { song, from: "list" });
}

const decades = computed(() => {
  const map = new Map<string, string[]>();
  for (const y of sorted.value) {
    const d = y.length >= 3 ? `${y.slice(0, 3)}0s` : "Other";
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(y);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
});

onMounted(() => void loadYears());
</script>

<template>
  <div v-if="isDetail" class="min-h-full">
    <PageHeader :title="year" :subtitle="`${tracks.length} song${tracks.length === 1 ? '' : 's'}`">
      <template #actions>
        <button v-if="tracks.length" type="button" class="btn-primary-token" @click="playAll">
          <Icon name="play" :size="16" />
          Play
        </button>
      </template>
    </PageHeader>

    <SkeletonList v-if="loadingTracks" :count="8" />

    <div v-else-if="!tracks.length" class="grid place-items-center px-6 py-20 text-center">
      <p class="text-sm text-muted-token">No tracks from this year.</p>
    </div>

    <div v-else class="px-2 sm:px-3">
      <SongRow
        v-for="(song, i) in tracks"
        :key="song.Path + i"
        :song="song"
        :index="i"
        :playing="player.playing"
        :is-current="player.isCurrent(song)"
        :active="player.isActive(song, player.queue.indexOf(song))"
        :favourite="false"
        @play="play(song)"
        @menu="onMenu($event, song)"
        @navigate="(kind, value) => router.push({ name: kind === 'year' ? 'year' : kind, params: kind === 'year' ? { year: value } : { names: value } })"
      />
    </div>
  </div>

  <div v-else class="min-h-full">
    <PageHeader title="Years" :subtitle="`${years.length} years in your library`" />

    <SkeletonList v-if="loading" :count="6" />

    <div v-else-if="!sorted.length" class="grid place-items-center px-6 py-20 text-center">
      <p class="text-sm text-muted-token">No year information found.</p>
    </div>

    <div v-else class="space-y-6 px-4 pb-8 sm:px-6">
      <section v-for="[decade, list] in decades" :key="decade">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-widest text-faint">
          {{ decade }}
        </h2>
        <div class="flex flex-wrap gap-2">
          <RouterLink
            v-for="y in list"
            :key="y"
            :to="{ name: 'year', params: { year: y } }"
            class="rounded-full surface-2 px-3.5 py-1.5 text-sm text-muted-token transition-colors hover:bg-accent-500/15 hover:text-accent-400"
          >
            {{ y }}
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>
