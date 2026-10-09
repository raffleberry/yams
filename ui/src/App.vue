<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAmbientArt } from "@/composables/useAmbientArt";
import { useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";
import { useLibraryStore } from "@/stores/library";
import { usePlayerStore } from "@/stores/player";
import { useUiStore } from "@/stores/ui";
import MiniPlayer from "./components/MiniPlayer.vue";
import MobileHeader from "./components/MobileHeader.vue";
import NowPlayingPanel from "./components/NowPlayingPanel.vue";
import NowPlayingSheet from "./components/NowPlayingSheet.vue";
import PlayerBar from "./components/PlayerBar.vue";
import SideNav from "./components/SideNav.vue";
import Toaster from "./components/Toaster.vue";
import TrackContextMenu from "./components/TrackContextMenu.vue";
import AddToPlaylistModal from "./components/modals/AddToPlaylistModal.vue";
import SettingsModal from "./components/modals/SettingsModal.vue";
import TrackDetailsModal from "./components/modals/TrackDetailsModal.vue";

const player = usePlayerStore();
const library = useLibraryStore();
const ui = useUiStore();

/* The header wash follows the current cover art. */
useAmbientArt(() => (player.hasTrack ? player.artwork : undefined));

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
    ui.setMobileNavOpen(false);
  },
});

const modalSong = computed(() => ui.modalPayload as { song?: never } | null);

onMounted(() => {
  void library.loadAll().catch(() => ui.toast("Some library data failed to load", "error"));
});
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- Mobile top bar + navigation drawer (desktop uses the side nav) -->
    <MobileHeader />

    <div class="flex min-h-0 flex-1">
      <SideNav />

      <!--
        Main column. There is intentionally no top bar: on desktop its
        controls (settings, theme, track details, now-playing toggle) live in
        the side nav, and on mobile they live in the menu drawer.
      -->
      <div class="flex min-w-0 flex-1 flex-col">
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

    <!-- Mobile mini player -->
    <MiniPlayer />

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
