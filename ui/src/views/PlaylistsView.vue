<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLibraryStore, type PlaylistWithTracks } from "@/stores/library";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import type { Song } from "@/types";
import ArtworkThumb from "../components/ArtworkThumb.vue";
import Icon from "../components/Icon.vue";
import ModalShell from "../components/ModalShell.vue";
import PageHeader from "../components/PageHeader.vue";
import SkeletonList from "../components/SkeletonList.vue";
import SongRow from "../components/SongRow.vue";

const route = useRoute();
const router = useRouter();
const library = useLibraryStore();
const player = usePlayerStore();
const ui = useUiStore();

const pid = computed(() => (route.params.pid as string) ?? "");
const isDetail = computed(() => pid.value !== "");

const tracks = ref<Song[]>([]);
const loadingTracks = ref(false);

/* Create ---------------------------------------------------------------- */

const showCreate = ref(false);
const newName = ref("");
const newDescription = ref("");
const newType = ref<"LIST" | "QUERY">("LIST");
const newQuery = ref("");
const creating = ref(false);

/* Edit ------------------------------------------------------------------ */

const editing = ref<PlaylistWithTracks | null>(null);
const editName = ref("");
const editDescription = ref("");

/* Delete ---------------------------------------------------------------- */

const deleting = ref<PlaylistWithTracks | null>(null);

const current = computed<PlaylistWithTracks | null>(() => {
  if (pid.value === "favourites") {
    return {
      Id: -1,
      Name: "Favourites",
      Description: "Songs you've starred",
      Type: "LIST",
      Query: "",
      Count: library.favourites.length,
      Tracks: library.favourites,
    };
  }
  const id = Number.parseInt(pid.value, 10);
  return Number.isFinite(id) ? (library.playlists[id] ?? null) : null;
});

async function loadTracks() {
  const target = current.value;
  if (!target) {
    tracks.value = [];
    return;
  }
  if (target.Id === -1) {
    tracks.value = target.Tracks;
    return;
  }
  loadingTracks.value = true;
  try {
    tracks.value = target.Tracks;
    if (target.Type === "QUERY" && !target.Tracks.length) {
      // QUERY playlists resolve server-side; refresh the library cache.
      await library.loadPlaylists();
      tracks.value = library.playlists[target.Id]?.Tracks ?? [];
    }
  } finally {
    loadingTracks.value = false;
  }
}

watch([pid, () => library.favourites, () => library.playlists], loadTracks, {
  immediate: true,
  deep: false,
});

watch(
  () => route.params.pid,
  () => {
    const name = current.value?.Name ?? "Playlists";
    document.title = `${name} · YAMS`;
  },
  { immediate: true },
);

async function create() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const playlist = await library.createPlaylist({
      Name: newName.value.trim(),
      Description: newDescription.value.trim(),
      Type: newType.value,
      Query: newType.value === "QUERY" ? newQuery.value.trim() : "",
    });
    ui.toast(`Created “${playlist.Name}”`, "success");
    newName.value = "";
    newDescription.value = "";
    newQuery.value = "";
    newType.value = "LIST";
    showCreate.value = false;
    void router.push({ name: "playlist", params: { pid: String(playlist.Id) } });
  } catch {
    ui.toast("Could not create playlist", "error");
  } finally {
    creating.value = false;
  }
}

function startEdit(playlist: PlaylistWithTracks) {
  editing.value = playlist;
  editName.value = playlist.Name;
  editDescription.value = playlist.Description;
}

async function saveEdit() {
  if (!editing.value) return;
  try {
    await library.editPlaylist(editing.value.Id, {
      Name: editName.value.trim(),
      Description: editDescription.value.trim(),
    });
    ui.toast("Playlist updated", "success");
    editing.value = null;
  } catch {
    ui.toast("Could not update playlist", "error");
  }
}

async function confirmDelete() {
  if (!deleting.value) return;
  const name = deleting.value.Name;
  const id = deleting.value.Id;
  deleting.value = null;
  try {
    await library.deletePlaylist(id);
    ui.toast(`Deleted “${name}”`, "success");
    if (pid.value === String(id)) void router.push({ name: "playlists" });
  } catch {
    ui.toast("Could not delete playlist", "error");
  }
}

function playAll() {
  if (tracks.value.length) player.setQueue(tracks.value, 0, `playlist:${pid.value}`);
}

function play(song: Song) {
  player.play(song, tracks.value, `playlist:${pid.value}`);
}

function onMenu(event: MouseEvent | TouchEvent, song: Song) {
  const point = "touches" in event ? event.touches[0] : event;
  ui.openContextMenu(point.clientX, point.clientY, { song, from: "list" });
}
</script>

<template>
  <!-- Playlist detail -->
  <div v-if="isDetail" class="min-h-full">
    <PageHeader
      :title="current?.Name ?? 'Not found'"
      :subtitle="
        current
          ? `${tracks.length} song${tracks.length === 1 ? '' : 's'}${
              current.Description ? ` · ${current.Description}` : ''
            }${current.Type === 'QUERY' ? ' · smart playlist' : ''}`
          : 'This playlist does not exist'
      "
    >
      <template #actions>
        <button v-if="current && current.Id !== -1" type="button" class="icon-btn" aria-label="Edit playlist" @click="startEdit(current)">
          <Icon name="edit" :size="17" />
        </button>
        <button v-if="tracks.length" type="button" class="btn-primary-token" @click="playAll">
          <Icon name="play" :size="16" />
          Play
        </button>
      </template>
    </PageHeader>

    <SkeletonList v-if="loadingTracks" :count="8" />

    <div v-else-if="!tracks.length" class="grid place-items-center px-6 py-20 text-center">
      <div>
        <div class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl surface-2 text-faint">
          <Icon name="playlist" :size="24" />
        </div>
        <p class="text-sm font-medium text-main">No songs yet</p>
        <p class="mt-1 text-xs text-muted-token">
          Add tracks with the ⋯ menu on any song.
        </p>
      </div>
    </div>

    <div v-else class="px-2 sm:px-3">
      <SongRow
        v-for="(song, i) in tracks"
        :key="song.Path + i"
        :song="song"
        :index="i"
        show-index
        :playing="player.playing"
        :is-current="player.isCurrent(song)"
        :active="player.isActive(song, player.queue.indexOf(song))"
        :favourite="library.isFavourite(song)"
        @play="play(song)"
        @favourite="library.toggleFavourite(song).catch(() => ui.toast('Could not update favourites', 'error'))"
        @menu="onMenu($event, song)"
        @navigate="(kind, value) => router.push({ name: kind, params: { names: value } })"
      />
    </div>
  </div>

  <!-- Playlist index -->
  <div v-else class="min-h-full">
    <PageHeader title="Playlists" :subtitle="`${library.playlistList.length} playlists`">
      <template #actions>
        <button type="button" class="btn-primary-token" @click="showCreate = true">
          <Icon name="plus" :size="16" />
          New
        </button>
      </template>
    </PageHeader>

    <div class="px-4 sm:px-6">
      <!-- Favourites -->
      <RouterLink
        :to="{ name: 'playlist', params: { pid: 'favourites' } }"
        class="card-hover mb-2 flex items-center gap-3 rounded-xl px-3 py-3 hover:surface-2"
      >
        <div class="grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 text-white">
          <Icon name="heart" :size="20" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-main">Favourites</p>
          <p class="text-xs text-muted-token">{{ library.favourites.length }} songs</p>
        </div>
        <Icon name="chevronRight" :size="18" class="shrink-0 text-faint" />
      </RouterLink>

      <!-- User playlists -->
      <RouterLink
        v-for="playlist in library.playlistList"
        :key="playlist.Id"
        :to="{ name: 'playlist', params: { pid: String(playlist.Id) } }"
        class="card-hover group mb-1 flex items-center gap-3 rounded-xl px-3 py-3 hover:surface-2"
      >
        <div
          class="grid size-11 shrink-0 place-items-center rounded-lg text-white"
          :class="playlist.Type === 'QUERY' ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-gradient-to-br from-accent-400 to-accent-600'"
        >
          <Icon :name="playlist.Type === 'QUERY' ? 'sparkle' : 'playlist'" :size="20" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-main">{{ playlist.Name }}</p>
          <p class="truncate text-xs text-muted-token">
            {{ playlist.Tracks.length }} songs
            <span v-if="playlist.Description"> · {{ playlist.Description }}</span>
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            class="icon-btn !size-8"
            aria-label="Edit playlist"
            @click.prevent.stop="startEdit(playlist)"
          >
            <Icon name="edit" :size="15" />
          </button>
          <button
            type="button"
            class="icon-btn !size-8 hover:!text-rose-400"
            aria-label="Delete playlist"
            @click.prevent.stop="deleting = playlist"
          >
            <Icon name="trash" :size="15" />
          </button>
        </div>
      </RouterLink>

      <div v-if="!library.playlistList.length" class="py-16 text-center">
        <div class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl surface-2 text-faint">
          <Icon name="playlist" :size="24" />
        </div>
        <p class="text-sm font-medium text-main">No playlists yet</p>
        <p class="mt-1 text-xs text-muted-token">Create one to group your favourite tracks.</p>
      </div>
    </div>

    <!-- Create modal -->
    <ModalShell v-if="showCreate" title="New playlist" @close="showCreate = false">
      <form class="space-y-3" @submit.prevent="create">
        <input
          v-model="newName"
          type="text"
          placeholder="Name"
          class="w-full rounded-lg border hairline surface-2 px-3 py-2 text-sm outline-none focus:border-accent-500"
          autofocus
        />
        <input
          v-model="newDescription"
          type="text"
          placeholder="Description (optional)"
          class="w-full rounded-lg border hairline surface-2 px-3 py-2 text-sm outline-none focus:border-accent-500"
        />
        <div class="flex gap-2">
          <label class="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
            :class="newType === 'LIST' ? 'border-accent-500 bg-accent-500/12 text-main' : 'hairline surface-2 text-muted-token'">
            <input v-model="newType" type="radio" value="LIST" class="sr-only" />
            <Icon name="playlist" :size="16" /> List
          </label>
          <label class="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
            :class="newType === 'QUERY' ? 'border-accent-500 bg-accent-500/12 text-main' : 'hairline surface-2 text-muted-token'">
            <input v-model="newType" type="radio" value="QUERY" class="sr-only" />
            <Icon name="sparkle" :size="16" /> Smart
          </label>
        </div>
        <textarea
          v-if="newType === 'QUERY'"
          v-model="newQuery"
          rows="3"
          placeholder="SELECT * FROM files WHERE …"
          class="w-full resize-none rounded-lg border hairline surface-2 px-3 py-2 font-mono text-xs outline-none focus:border-accent-500"
        />
        <div class="flex gap-2 pt-1">
          <button type="submit" class="btn-primary-token flex-1" :disabled="creating || !newName.trim()">
            <span v-if="creating" class="spinner" /> Create
          </button>
          <button type="button" class="btn-ghost-token" @click="showCreate = false">Cancel</button>
        </div>
      </form>
    </ModalShell>

    <!-- Edit modal -->
    <ModalShell v-if="editing" title="Edit playlist" @close="editing = null">
      <form class="space-y-3" @submit.prevent="saveEdit">
        <input
          v-model="editName"
          type="text"
          placeholder="Name"
          class="w-full rounded-lg border hairline surface-2 px-3 py-2 text-sm outline-none focus:border-accent-500"
          autofocus
        />
        <input
          v-model="editDescription"
          type="text"
          placeholder="Description"
          class="w-full rounded-lg border hairline surface-2 px-3 py-2 text-sm outline-none focus:border-accent-500"
        />
        <div class="flex gap-2 pt-1">
          <button type="submit" class="btn-primary-token flex-1">Save</button>
          <button type="button" class="btn-ghost-token" @click="editing = null">Cancel</button>
        </div>
      </form>
    </ModalShell>

    <!-- Delete confirm -->
    <ModalShell v-if="deleting" title="Delete playlist" @close="deleting = null">
      <p class="text-sm text-muted-token">
        Delete <span class="font-semibold text-main">{{ deleting.Name }}</span>? This removes the
        playlist and its track associations. Your audio files are not touched.
      </p>
      <template #footer>
        <div class="flex gap-2">
          <button type="button" class="btn-ghost-token flex-1" @click="deleting = null">Cancel</button>
          <button
            type="button"
            class="btn-primary-token flex-1 !bg-rose-600 hover:!bg-rose-500"
            @click="confirmDelete"
          >
            Delete
          </button>
        </div>
      </template>
    </ModalShell>
  </div>
</template>
