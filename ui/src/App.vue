<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useAmbientArt } from "@/composables/useAmbientArt";
import { useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";
import { useLibraryStore } from "@/stores/library";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import Icon from "./components/Icon.vue";
import MiniPlayer from "./components/MiniPlayer.vue";
import MobileNav from "./components/MobileNav.vue";
import NowPlayingPanel from "./components/NowPlayingPanel.vue";
import NowPlayingSheet from "./components/NowPlayingSheet.vue";
import PlayerBar from "./components/PlayerBar.vue";
import SideNav from "./components/SideNav.vue";
import Toaster from "./components/Toaster.vue";
import TrackContextMenu from "./components/TrackContextMenu.vue";
import AddToPlaylistModal from "./components/modals/AddToPlaylistModal.vue";
import SettingsModal from "./components/modals/SettingsModal.vue";
import TrackDetailsModal from "./components/modals/TrackDetailsModal.vue";

const route = useRoute();
const player = usePlayerStore();
const library = useLibraryStore();
const ui = useUiStore();

/* The header wash follows the current cover art. */
useAmbientArt(() => (player.hasTrack ? player.artwork : undefined));

const title = computed(() => {
  const name = typeof route.name === "string" ? route.name : "YAMS";
  return name.charAt(0).toUpperCase() + name.slice(1);
});

const songsView = ref<{ focusSearch?: () => void } | null>(null);

function focusSearch() {
  songsView.value?.focusSearch?.();
}

useKeyboardShortcuts({
  toggle: () => player.toggle(),
  next: () => player.next(),
  previous: () => player.previous(),
  seekForward: () => player.seekBy(10),
  seekBackward: () => player.seekBy(-10),
  volumeUp: () => player.setVolume(player.volume + 0.05),
  volumeDown: () => player.setVolume(player.volume - 0.05),
  toggleMute: () => player.toggleMute(),
  shuffle: () => player.toggleShuffle(),
  repeat: () => player.cycleRepeat(),
  focusSearch,
  escape: () => {
    ui.closeContextMenu();
    ui.closeModal();
    ui.nowPlayingOpen = false;
  },
});

const modalSong = computed(() => ui.modalPayload as { song?: never } | null);

onMounted(() => {
  void library.loadAll().catch(() => ui.toast("Some library data failed to load", "error"));
});
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex min-h-0 flex-1">
      <SideNav />

      <!-- Main column -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Top bar -->
        <header
          class="glass sticky top-0 z-20 flex items-center gap-3 border-b hairline px-4 py-2.5 sm:px-6"
        >
          <span class="text-sm font-semibold text-main lg:hidden">{{ title }}</span>
          <span class="hidden text-sm font-semibold text-muted-token lg:block">{{ title }}</span>

          <div class="flex-1" />

          <button
            v-if="player.hasTrack"
            type="button"
            class="btn-ghost-token hidden !py-1.5 text-xs md:inline-flex"
            aria-label="Track details"
            @click="ui.openModal('details')"
          >
            <Icon name="info" :size="15" />
            Details
          </button>

          <button
            type="button"
            class="icon-btn lg:hidden"
            aria-label="Settings"
            @click="ui.openModal('settings')"
          >
            <Icon name="settings" :size="18" />
          </button>

          <button
            type="button"
            class="icon-btn hidden lg:grid"
            :aria-label="ui.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
            @click="ui.toggleTheme()"
          >
            <Icon :name="ui.theme === 'dark' ? 'sun' : 'moon'" :size="18" />
          </button>

          <button
            v-if="ui.queueOpen"
            type="button"
            class="icon-btn hidden lg:grid"
            aria-label="Hide now playing panel"
            @click="ui.setQueueOpen(false)"
          >
            <Icon name="shrink" :size="18" />
          </button>
        </header>

        <!-- Scrollable content -->
        <main class="min-h-0 flex-1 overflow-y-auto pb-8">
          <RouterView v-slot="{ Component }">
            <component :is="Component" ref="songsView" />
          </RouterView>
        </main>
      </div>

      <!--
        Docked now-playing panel (lg and up). Below lg there is not enough
        horizontal room to dock it, so the same panel is shown as a drawer.
      -->
      <div
        v-if="ui.queueOpen"
        class="hidden w-72 shrink-0 border-l hairline lg:block 2xl:w-96"
      >
        <NowPlayingPanel class="ambient h-full" />
      </div>
    </div>

    <!-- Drawer for md..lg, where the panel cannot be docked. -->
    <Teleport to="body">
      <div
        v-if="ui.queueOpen"
        class="fixed inset-0 z-40 hidden bg-black/50 md:block lg:hidden"
        @click="ui.setQueueOpen(false)"
      />
      <Transition name="drawer">
        <aside
          v-if="ui.queueOpen"
          class="surface-1 fixed inset-y-0 right-0 z-40 hidden w-80 max-w-[86vw] overflow-hidden border-l hairline shadow-2xl md:block lg:hidden"
          aria-label="Now playing and queue"
        >
          <NowPlayingPanel class="ambient h-full" />
        </aside>
      </Transition>
    </Teleport>

    <!-- Mobile now-playing sheet trigger + nav -->
    <MiniPlayer />
    <MobileNav />

    <!-- Desktop transport -->
    <PlayerBar class="hidden md:flex" @expand="ui.nowPlayingOpen = true" />

    <!-- Overlays -->
    <NowPlayingSheet />
    <TrackContextMenu />
    <Toaster />

    <AddToPlaylistModal
      v-if="ui.modal === 'add-to-playlist' && modalSong?.song"
      :song="modalSong.song"
    />
    <SettingsModal v-if="ui.modal === 'settings'" />
    <TrackDetailsModal v-if="ui.modal === 'details'" @close="ui.closeModal()" />
  </div>
</template>
