<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useLibraryStore } from "@/stores/library";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import type { Song } from "@/types";
import ArtworkThumb from "./ArtworkThumb.vue";
import Icon from "./Icon.vue";

/**
 * Track options sheet: slides up from the bottom on mobile, docks on the
 * right side on desktop. The open/close contract (ui.contextMenu) is
 * unchanged, so every existing ⋯ button and right-click keeps working.
 */
const ui = useUiStore();
const player = usePlayerStore();
const library = useLibraryStore();
const router = useRouter();

interface Target {
  song: Song;
  index?: number;
  from?: string;
}

const target = computed<Target | null>(() => (ui.contextMenu?.song as Target) ?? null);
const song = computed(() => target.value?.song ?? null);
const isFavourite = computed(() => (song.value ? library.isFavourite(song.value) : false));
const playlistCount = computed(() => (song.value ? library.membership(song.value) : 0));

function close() {
  ui.closeContextMenu();
}

function run(action: () => void) {
  action();
  close();
}

const items = computed(() => {
  const list: { key: string; label: string; hint?: string; icon: string; danger?: boolean }[] = [];

  list.push({
    key: "play",
    label: song.value && player.isCurrent(song.value) ? "Play now" : "Play",
    icon: "play",
  });
  if (target.value?.from === "queue") {
    list.push({ key: "playNext", label: "Play next", icon: "queue" });
    list.push({ key: "removeQueue", label: "Remove from queue", icon: "close", danger: true });
  } else {
    list.push({ key: "playNext", label: "Play next", icon: "queue" });
    list.push({ key: "addQueue", label: "Add to queue", icon: "plus" });
  }
  list.push({ key: "divider", label: "", icon: "" });
  list.push({
    key: "fav",
    label: isFavourite.value ? "Remove from favourites" : "Add to favourites",
    icon: "heart",
  });
  list.push({
    key: "playlist",
    label: "Add to playlist…",
    hint: playlistCount.value ? String(playlistCount.value) : undefined,
    icon: "playlist",
  });
  list.push({ key: "divider", label: "", icon: "" });
  if (song.value) {
    list.push({ key: "artist", label: `Go to ${song.value.Artists || "artist"}`, icon: "artist" });
    if (song.value.Album) {
      list.push({ key: "album", label: `Go to ${song.value.Album}`, icon: "album" });
    }
  }
  return list;
});

function onClick(key: string) {
  const current = song.value;
  if (!current || key === "divider") return;
  switch (key) {
    case "play":
      run(() => player.play(current, player.queue, player.queueSource));
      break;
    case "playNext":
      run(() => player.playNext([current]));
      break;
    case "addQueue":
      run(() => player.addToQueue([current]));
      break;
    case "removeQueue":
      run(() => {
        if (typeof target.value?.index === "number") player.removeFromQueue(target.value.index);
      });
      break;
    case "fav":
      run(() => {
        void library.toggleFavourite(current).catch(() => {
          ui.toast("Could not update favourites", "error");
        });
      });
      break;
    case "playlist":
      run(() => ui.openModal("add-to-playlist", { song: current }));
      break;
    case "artist":
      run(() => void router.push({ name: "artist", params: { names: current.Artists } }));
      break;
    case "album":
      run(() => void router.push({ name: "album", params: { names: current.Album } }));
      break;
    default:
      break;
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", close);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", close);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="ui.contextMenu && song"
        class="fixed inset-0 z-[60] bg-black/50"
        @click="close"
      />
    </Transition>
    <Transition name="menu-sheet">
      <aside
        v-if="ui.contextMenu && song"
        class="surface-1 fixed z-[60] flex flex-col overflow-hidden border hairline shadow-2xl inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-0 md:right-0 md:top-0 md:max-h-none md:h-full md:w-96 md:max-w-[92vw] md:rounded-none md:border-l md:pb-0"
        role="dialog"
        aria-label="Track options"
      >
        <!-- Grab handle (mobile) -->
        <div class="grid shrink-0 place-items-center pt-2.5 md:hidden" aria-hidden="true">
          <span class="h-1 w-10 rounded-full surface-3" />
        </div>

        <!-- Track header -->
        <div class="flex shrink-0 items-center gap-3 px-5 pb-3 pt-3">
          <ArtworkThumb :path="song.Path" :alt="song.Album || song.Title" :size="56" class="size-14 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-lg font-semibold text-main">{{ song.Title || "Unknown" }}</p>
            <p class="truncate text-sm text-muted-token">{{ song.Artists || "Unknown artist" }}</p>
            <p v-if="song.Album" class="truncate text-sm text-faint">
              {{ song.Album }}
              <span v-if="song.Year"> · {{ song.Year }}</span>
            </p>
          </div>
          <button type="button" class="icon-btn shrink-0" aria-label="Close options" @click="close">
            <Icon name="close" :size="18" />
          </button>
        </div>

        <!-- Actions -->
        <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          <template v-for="item in items" :key="item.key">
            <hr v-if="item.key === 'divider'" class="mx-3 my-2 border-t hairline" />
            <button
              v-else
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium transition-colors active:surface-2 sm:hover:surface-2"
              :class="item.danger ? 'text-rose-400' : 'text-main'"
              @click="onClick(item.key)"
            >
              <Icon
                :name="item.icon"
                :size="19"
                :class="item.danger ? 'text-rose-400' : item.key === 'fav' && isFavourite ? 'text-rose-400' : 'text-faint'"
              />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <span v-if="item.hint" class="text-sm text-faint">{{ item.hint }}</span>
              <Icon
                v-if="item.key === 'fav' && isFavourite"
                name="check"
                :size="17"
                class="shrink-0 text-rose-400"
              />
            </button>
          </template>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
