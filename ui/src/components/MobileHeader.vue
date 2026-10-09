<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import Icon from "./Icon.vue";

/**
 * Mobile top bar + slide-in navigation drawer. Mirrors the desktop side nav
 * (same destinations and controls) so mobile and desktop stay in sync. The
 * player (mini player / transport strip) is untouched.
 */
const ui = useUiStore();
const player = usePlayerStore();
const route = useRoute();

const items = [
  { to: "/", icon: "music", label: "Songs" },
  { to: "/albums", icon: "album", label: "Albums" },
  { to: "/artists", icon: "artist", label: "Artists" },
  { to: "/playlists", icon: "playlist", label: "Playlists" },
  { to: "/folders", icon: "folder", label: "Folders" },
  { to: "/years", icon: "clock", label: "Years" },
  { to: "/history", icon: "wave", label: "History" },
];

/* Navigating closes the drawer. */
watch(
  () => route.fullPath,
  () => ui.setMobileNavOpen(false),
);
</script>

<template>
  <!-- Mobile top bar -->
  <header
    class="glass sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b hairline px-3 py-2 lg:hidden"
  >
    <button
      type="button"
      class="icon-btn"
      aria-label="Open navigation menu"
      :aria-expanded="ui.mobileNavOpen"
      @click="ui.setMobileNavOpen(true)"
    >
      <Icon name="menu" :size="22" />
    </button>
    <div class="flex items-center gap-2">
      <div
        class="grid size-7 place-items-center rounded-lg bg-accent-600 text-white shadow-lg"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
        </svg>
      </div>
      <span class="text-lg font-bold tracking-tight text-main">YAMS</span>
    </div>
  </header>

  <!-- Navigation drawer -->
  <Teleport to="body">
    <div
      v-if="ui.mobileNavOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="ui.setMobileNavOpen(false)"
    />
    <Transition name="drawer-left">
      <nav
        v-if="ui.mobileNavOpen"
        class="surface-1 fixed inset-y-0 left-0 z-40 flex w-80 max-w-[86vw] flex-col gap-1 overflow-y-auto border-r hairline px-3 py-4 shadow-2xl lg:hidden"
        aria-label="Main"
      >
        <div class="mb-3 flex items-center gap-2.5 px-2">
          <div
            class="grid size-8 place-items-center rounded-lg bg-accent-600 text-white shadow-lg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
            </svg>
          </div>
          <span class="text-lg font-bold tracking-tight text-main">YAMS</span>
          <div class="flex-1" />
          <button
            type="button"
            class="icon-btn"
            aria-label="Close navigation menu"
            @click="ui.setMobileNavOpen(false)"
          >
            <Icon name="close" :size="18" />
          </button>
        </div>

        <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-muted-token transition-colors hover:text-main"
          active-class="!text-accent-400 bg-accent-500/12"
        >
          <Icon :name="item.icon" :size="20" />
          <span>{{ item.label }}</span>
        </RouterLink>

        <div class="mt-auto space-y-1 px-1 pt-4">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-muted-token transition-colors hover:text-main"
            @click="ui.openModal('settings'); ui.setMobileNavOpen(false)"
          >
            <Icon name="settings" :size="20" />
            <span>Settings</span>
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-muted-token transition-colors hover:text-main"
            @click="ui.toggleTheme()"
          >
            <Icon :name="ui.theme === 'dark' ? 'sun' : 'moon'" :size="20" />
            <span>{{ ui.theme === "dark" ? "Light theme" : "Dark theme" }}</span>
          </button>
          <button
            v-if="player.hasTrack"
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base font-medium text-muted-token transition-colors hover:text-main"
            @click="ui.openModal('details'); ui.setMobileNavOpen(false)"
          >
            <Icon name="info" :size="20" />
            <span>Track details</span>
          </button>
        </div>
      </nav>
    </Transition>
  </Teleport>
</template>
