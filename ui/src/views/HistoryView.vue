<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { fetchHistory } from "@/api";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import { formatDuration } from "@/utils/format";
import type { HistoryEntry } from "@/types";
import ArtworkThumb from "../components/ArtworkThumb.vue";
import Icon from "../components/Icon.vue";
import PageHeader from "../components/PageHeader.vue";
import SkeletonList from "../components/SkeletonList.vue";

const router = useRouter();
const player = usePlayerStore();
const ui = useUiStore();

const entries = ref<HistoryEntry[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const nextOffset = ref(0);

/** Group consecutive plays by calendar day for section headers. */
const groups = computed(() => {
  const out: { label: string; items: HistoryEntry[] }[] = [];
  for (const entry of entries.value) {
    const date = new Date(entry.Time);
    const label = Number.isNaN(date.getTime())
      ? "Unknown date"
      : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(entry);
    else out.push({ label, items: [entry] });
  }
  return out;
});

async function load(offset = 0) {
  if (offset === 0) loading.value = true;
  else loadingMore.value = true;
  try {
    const res = await fetchHistory(offset);
    entries.value = offset === 0 ? (res.Data ?? []) : [...entries.value, ...(res.Data ?? [])];
    nextOffset.value = res.Next;
  } catch {
    ui.toast("Could not load history", "error");
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

function play(entry: HistoryEntry) {
  player.play(entry, entries.value, "history");
}

onMounted(() => void load(0));
</script>

<template>
  <div class="min-h-full">
    <PageHeader
      title="History"
      :subtitle="entries.length ? `${entries.length} recent plays` : 'Nothing played yet'"
    >
      <template #actions>
        <button
          v-if="entries.length"
          type="button"
          class="btn-primary-token"
          @click="player.setQueue(entries, 0, 'history')"
        >
          <Icon name="play" :size="16" />
          Play all
        </button>
      </template>
    </PageHeader>

    <SkeletonList v-if="loading" :count="8" />

    <div v-else-if="!entries.length" class="grid place-items-center px-6 py-20 text-center">
      <div>
        <div class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl surface-2 text-faint">
          <Icon name="clock" :size="24" />
        </div>
        <p class="text-base font-medium text-main">No listening history</p>
        <p class="mt-1 text-sm text-muted-token">Tracks you play will show up here.</p>
      </div>
    </div>

    <div v-else class="space-y-6 px-4 pb-8 sm:px-6">
      <section v-for="group in groups" :key="group.label">
        <h2 class="mb-1.5 text-xs font-semibold uppercase tracking-widest text-faint">
          {{ group.label }}
        </h2>
        <div class="space-y-0.5">
          <div
            v-for="(entry, i) in group.items"
            :key="`${entry.Path}-${entry.Time}-${i}`"
            class="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:surface-2 sm:gap-4 sm:px-3"
            :class="player.isCurrent(entry) ? 'bg-accent-500/15' : ''"
            role="button"
            tabindex="0"
            @click="play(entry)"
            @keydown.enter.prevent="play(entry)"
            @keydown.space.prevent="play(entry)"
          >
            <ArtworkThumb :path="entry.Path" :size="44" class="shrink-0" />
            <div class="min-w-0 flex-1">
              <p
                class="truncate text-base font-medium"
                :class="player.isCurrent(entry) ? 'text-accent-400' : 'text-main'"
              >
                {{ entry.Title }}
              </p>
              <p class="truncate text-sm text-muted-token">
                {{ entry.Artists }}
                <span v-if="entry.Album" class="text-faint"> · {{ entry.Album }}</span>
              </p>
            </div>
            <span class="hidden shrink-0 text-sm tabular-nums text-faint sm:block">
              {{ new Date(entry.Time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) }}
            </span>
            <span class="shrink-0 text-sm tabular-nums text-muted-token">
              {{ formatDuration(entry.Length) }}
            </span>
            <button
              type="button"
              class="icon-btn shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Go to album"
              @click.stop="router.push({ name: 'album', params: { names: entry.Album } })"
            >
              <Icon name="album" :size="15" />
            </button>
          </div>
        </div>
      </section>
    </div>

    <div v-if="nextOffset >= 0 && !loading" class="flex justify-center px-4 pb-8">
      <button type="button" class="btn-ghost-token" :disabled="loadingMore" @click="load(nextOffset)">
        <span v-if="loadingMore" class="spinner" /> Load more
      </button>
    </div>
  </div>
</template>
