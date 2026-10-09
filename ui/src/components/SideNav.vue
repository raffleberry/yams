<script setup lang="ts">
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import Icon from "./Icon.vue";

const ui = useUiStore();
const player = usePlayerStore();

const items = [
  { to: "/", icon: "music", label: "Songs" },
  { to: "/albums", icon: "album", label: "Albums" },
  { to: "/artists", icon: "artist", label: "Artists" },
  { to: "/playlists", icon: "playlist", label: "Playlists" },
  { to: "/folders", icon: "folder", label: "Folders" },
  { to: "/years", icon: "clock", label: "Years" },
  { to: "/history", icon: "wave", label: "History" },
];
</script>

<template>
  <nav
    class="hidden w-56 shrink-0 flex-col gap-1 border-r hairline px-3 py-4 lg:flex"
    aria-label="Main"
  >
    <div class="mb-4 flex items-center gap-2.5 px-2">
      <div
        class="grid size-8 place-items-center rounded-lg bg-accent-600 text-white shadow-lg"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
        </svg>
      </div>
      <span class="text-base font-bold tracking-tight text-main">YAMS</span>
    </div>

    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] font-medium text-muted-token transition-colors hover:text-main"
      active-class="!text-accent-400 bg-accent-500/12"
    >
      <Icon :name="item.icon" :size="18" />
      <span>{{ item.label }}</span>
    </RouterLink>

    <div class="mt-auto space-y-3 px-1">
      <!-- Former top-bar controls live here on desktop -->
      <div class="flex items-center gap-0.5 px-1">
        <button
          type="button"
          class="icon-btn"
          aria-label="Settings"
          title="Settings"
          @click="ui.openModal('settings')"
        >
          <Icon name="settings" :size="18" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :aria-label="ui.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          :title="ui.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="ui.toggleTheme()"
        >
          <Icon :name="ui.theme === 'dark' ? 'sun' : 'moon'" :size="18" />
        </button>
        <button
          v-if="player.hasTrack"
          type="button"
          class="icon-btn"
          aria-label="Track details"
          title="Track details"
          @click="ui.openModal('details')"
        >
          <Icon name="info" :size="18" />
        </button>
        <div class="flex-1" />
        <button
          type="button"
          class="icon-btn"
          :aria-label="ui.queueOpen ? 'Hide now playing panel' : 'Show now playing panel'"
          :title="ui.queueOpen ? 'Hide now playing panel' : 'Show now playing panel'"
          @click="ui.setQueueOpen(!ui.queueOpen)"
        >
          <Icon :name="ui.queueOpen ? 'shrink' : 'expand'" :size="18" />
        </button>
      </div>

      <div>
        <p class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-faint">
          Shortcuts
        </p>
        <p class="px-2 text-[11px] leading-relaxed text-faint">
          <kbd class="kbd">Space</kbd> play/pause
          <kbd class="kbd ml-1">←→</kbd> seek
          <kbd class="kbd ml-1">⇧←→</kbd> track
          <kbd class="kbd ml-1">/</kbd> search
        </p>
      </div>
    </div>
  </nav>
</template>
