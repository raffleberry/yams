<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { fetchProps } from "@/api";
import { usePlayerStore } from "@/stores/player";
import { formatBitrate, formatDuration, splitArtists } from "@/utils/format";
import ModalShell from "../ModalShell.vue";
import ArtworkThumb from "../ArtworkThumb.vue";
import type { TrackProps } from "@/types";

const player = usePlayerStore();

const props = ref<TrackProps>({});
const loading = ref(true);
const error = ref<string | null>(null);

const track = computed(() => player.track);

watch(
  () => track.value.Path,
  async (path) => {
    if (!path) return;
    loading.value = true;
    error.value = null;
    try {
      props.value = await fetchProps(path);
    } catch {
      error.value = "Could not load details";
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const facts = computed(() => {
  const t = track.value;
  const rows: [string, string][] = [];
  if (t.AlbumArtist) rows.push(["Album artist", t.AlbumArtist]);
  if (t.Genre) rows.push(["Genre", t.Genre]);
  if (t.Samplerate) rows.push(["Sample rate", `${(t.Samplerate / 1000).toFixed(1)} kHz`]);
  if (t.Channels) rows.push(["Channels", t.Channels === 1 ? "Mono" : t.Channels === 2 ? "Stereo" : String(t.Channels)]);
  if (t.Bitrate) rows.push(["Bitrate", formatBitrate(t.Bitrate)]);
  if (t.Length) rows.push(["Duration", formatDuration(t.Length)]);
  if (props.value.Size) rows.push(["File size", props.value.Size]);
  if (t.Path) rows.push(["Path", t.Path]);
  return rows;
});
</script>

<template>
  <ModalShell title="Track details" :description="track.Title" @close="$emit('close')">
    <div v-if="loading" class="grid place-items-center py-10">
      <span class="spinner spinner-lg text-faint" />
    </div>

    <p v-else-if="error" class="py-8 text-center text-sm text-rose-400">{{ error }}</p>

    <div v-else class="space-y-5">
      <div class="flex items-center gap-4">
        <ArtworkThumb :path="track.Path" :size="104" rounded="rounded-xl" class="shadow-lg" />
        <div class="min-w-0">
          <h3 class="truncate text-lg font-bold text-main">{{ track.Title || "Unknown" }}</h3>
          <p class="truncate text-sm text-muted-token">
            {{ splitArtists(track.Artists).join(", ") || "Unknown artist" }}
          </p>
          <p v-if="track.Album" class="truncate text-xs text-faint">
            {{ track.Album }}<span v-if="track.Year"> · {{ track.Year }}</span>
          </p>
        </div>
      </div>

      <dl class="divide-y hairline">
        <div v-for="[key, value] in facts" :key="key" class="flex gap-4 py-2 text-sm">
          <dt class="w-28 shrink-0 text-muted-token">{{ key }}</dt>
          <dd class="min-w-0 flex-1 break-words text-main">{{ value }}</dd>
        </div>
      </dl>

      <div v-if="props.Comment" class="space-y-1">
        <h4 class="text-xs font-semibold uppercase tracking-widest text-faint">Comment</h4>
        <p class="whitespace-pre-line text-sm text-muted-token">{{ props.Comment }}</p>
      </div>

      <div v-if="props.Lyrics" class="space-y-1">
        <h4 class="text-xs font-semibold uppercase tracking-widest text-faint">Lyrics</h4>
        <p class="max-h-48 overflow-y-auto whitespace-pre-line text-sm text-muted-token">
          {{ props.Lyrics }}
        </p>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn-ghost-token w-full" @click="$emit('close')">Close</button>
    </template>
  </ModalShell>
</template>

<script lang="ts">
export default { emits: ["close"] };
</script>
