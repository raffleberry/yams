<script setup lang="ts">
import { computed, ref } from "vue";
import { useLibraryStore, type PlaylistWithTracks } from "@/stores/library";
import { useUiStore } from "@/stores/ui";
import type { Song } from "@/types";
import ModalShell from "../ModalShell.vue";
import Icon from "../Icon.vue";

const ui = useUiStore();
const library = useLibraryStore();

const props = defineProps<{ song: Song }>();

const creating = ref(false);
const name = ref("");
const description = ref("");
const saving = ref(false);

const lists = computed(() => library.playlistList.filter((p) => p.Type === "LIST"));

async function toggle(playlist: PlaylistWithTracks) {
  try {
    await library.togglePlaylistMembership(playlist, props.song);
  } catch {
    ui.toast("Could not update playlist", "error");
  }
}

async function create() {
  if (name.value.trim().length < 1) return;
  saving.value = true;
  try {
    const playlist = await library.createPlaylist({
      Name: name.value.trim(),
      Description: description.value.trim(),
      Type: "LIST",
      Query: "",
    });
    await library.togglePlaylistMembership(playlist, props.song);
    name.value = "";
    description.value = "";
    creating.value = false;
  } catch {
    ui.toast("Could not create playlist", "error");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <ModalShell
    title="Add to playlist"
    :description="song.Title"
    @close="ui.closeModal()"
  >
    <!-- Create form -->
    <form v-if="creating" class="mb-4 space-y-2" @submit.prevent="create">
      <input
        v-model="name"
        type="text"
        placeholder="Playlist name"
        class="w-full rounded-lg border hairline surface-2 px-3 py-2 text-sm outline-none focus:border-accent-500"
        autofocus
      />
      <input
        v-model="description"
        type="text"
        placeholder="Description (optional)"
        class="w-full rounded-lg border hairline surface-2 px-3 py-2 text-sm outline-none focus:border-accent-500"
      />
      <div class="flex gap-2 pt-1">
        <button type="submit" class="btn-primary-token" :disabled="saving || !name.trim()">
          <span v-if="saving" class="spinner" />
          Create & add
        </button>
        <button type="button" class="btn-ghost-token" @click="creating = false">Cancel</button>
      </div>
    </form>

    <!-- Existing playlists -->
    <ul v-if="lists.length" class="space-y-0.5">
      <li v-for="playlist in lists" :key="playlist.Id">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:surface-2"
          @click="toggle(playlist)"
        >
          <span
            class="grid size-5 shrink-0 place-items-center rounded border transition-colors"
            :class="
              library.contains(playlist, song)
                ? 'border-accent-500 bg-accent-500 text-white'
                : 'border-current/30'
            "
          >
            <Icon v-if="library.contains(playlist, song)" name="check" :size="13" :stroke-width="3" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-main">{{ playlist.Name }}</span>
            <span v-if="playlist.Description" class="block truncate text-xs text-muted-token">
              {{ playlist.Description }}
            </span>
          </span>
          <span class="shrink-0 text-xs tabular-nums text-faint">{{ playlist.Tracks.length }}</span>
        </button>
      </li>
    </ul>

    <p v-else-if="!creating" class="py-6 text-center text-sm text-muted-token">
      You haven't created any playlists yet.
    </p>

    <button
      v-if="!creating"
      type="button"
      class="btn-ghost-token mt-4 w-full"
      @click="creating = true"
    >
      <Icon name="plus" :size="16" />
      New playlist
    </button>

    <template #footer>
      <button type="button" class="btn-ghost-token w-full" @click="ui.closeModal()">Done</button>
    </template>
  </ModalShell>
</template>
