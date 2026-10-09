<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useLibraryStore } from "@/stores/library";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import type { Song } from "@/types";
import Icon from "./Icon.vue";

/** Right-click / long-press menu for a track row. */
const ui = useUiStore();
const player = usePlayerStore();
const library = useLibraryStore();
const router = useRouter();

const el = ref<HTMLElement | null>(null);
const pos = ref({ x: 0, y: 0 });

interface Target {
  song: Song;
  index?: number;
  from?: string;
}

const target = computed<Target | null>(() => (ui.contextMenu?.song as Target) ?? null);
const song = computed(() => target.value?.song ?? null);
const isFavourite = computed(() => (song.value ? library.isFavourite(song.value) : false));
const playlistCount = computed(() => (song.value ? library.membership(song.value) : 0));

function place() {
  const node = el.value;
  if (!node) return;
  const rect = node.getBoundingClientRect();
  // Flip to the other side of the cursor when we'd overflow the viewport.
  let x = pos.value.x;
  let y = pos.value.y;
  if (x + rect.width > window.innerWidth - 8) {
    x = Math.max(8, pos.value.x - rect.width);
  }
  if (y + rect.height > window.innerHeight - 8) {
    y = Math.max(8, window.innerHeight - rect.height - 8);
  }
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
}

watch(
  () => ui.contextMenu,
  async (menu) => {
    if (!menu) return;
    pos.value = { x: menu.x, y: menu.y };
    await nextTick();
    place();
  },
  { immediate: true },
);

function close() {
  ui.closeContextMenu();
}

function run(action: () => void) {
  action();
  close();
}

const items = computed(() => {
  const list: { key: string; label: string; icon: string; danger?: boolean }[] = [];

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
  list.push({ key: "playlist", label: "Add to playlist…", icon: "playlist" });
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

function onDocClick(e: MouseEvent) {
  if (!ui.contextMenu) return;
  if (el.value?.contains(e.target as Node)) return;
  close();
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("click", onDocClick, true);
  document.addEventListener("keydown", onKey);
  window.addEventListener("resize", close);
  window.addEventListener("scroll", close, true);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick, true);
  document.removeEventListener("keydown", onKey);
  window.removeEventListener("resize", close);
  window.removeEventListener("scroll", close, true);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="ui.contextMenu && song"
        ref="el"
        class="fixed z-[60] w-56 overflow-hidden rounded-xl border hairline surface-1 py-1 shadow-2xl"
        role="menu"
      >
        <button
          v-for="item in items"
          :key="item.key"
          type="button"
          role="menuitem"
          class="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition-colors hover:surface-3 disabled:opacity-50"
          :class="item.danger ? 'text-rose-400' : 'text-main'"
          :disabled="item.key === 'divider'"
          @click="onClick(item.key)"
        >
          <template v-if="item.key === 'divider'">
            <hr class="my-1 border-t hairline" />
          </template>
          <template v-else>
            <Icon :name="item.icon" :size="15" class="text-faint" />
            <span class="truncate">{{ item.label }}</span>
            <span
              v-if="item.key === 'playlist' && playlistCount"
              class="ml-auto text-xs text-faint"
            >
              {{ playlistCount }}
            </span>
          </template>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
