<script setup lang="ts">
import { useUiStore } from "@/stores/ui";
import Icon from "../components/Icon.vue";

/** Mobile catch-all destination: secondary sections plus appearance controls. */
const ui = useUiStore();

const links = [
  { to: "/folders", icon: "folder", label: "Folders", hint: "Browse by directory" },
  { to: "/years", icon: "clock", label: "Years", hint: "Browse by release year" },
  { to: "/history", icon: "wave", label: "History", hint: "Recently played" },
];
</script>

<template>
  <div class="min-h-full">
    <header class="px-4 pb-5 pt-6 sm:px-6 sm:pt-8">
      <h1 class="text-2xl font-bold tracking-tight text-main">More</h1>
      <p class="mt-1 text-sm text-muted-token">Everything else in your library</p>
    </header>

    <div class="space-y-6 px-4 pb-8 sm:px-6">
      <!-- Sections -->
      <section class="space-y-2">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="card-hover flex items-center gap-3 rounded-xl px-3 py-3 hover:surface-2"
        >
          <div class="grid size-11 shrink-0 place-items-center rounded-lg surface-3 text-muted-token">
            <Icon :name="link.icon" :size="20" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-main">{{ link.label }}</p>
            <p class="truncate text-xs text-muted-token">{{ link.hint }}</p>
          </div>
          <Icon name="chevronRight" :size="18" class="shrink-0 text-faint" />
        </RouterLink>
      </section>

      <!-- Settings -->
      <section class="space-y-2">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-faint">Settings</h2>
        <button
          type="button"
          class="card-hover flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:surface-2"
          @click="ui.openModal('settings')"
        >
          <div class="grid size-11 shrink-0 place-items-center rounded-lg surface-3 text-muted-token">
            <Icon name="settings" :size="20" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-main">Library & playback</p>
            <p class="truncate text-xs text-muted-token">Scan, theme, lyrics</p>
          </div>
          <Icon name="chevronRight" :size="18" class="shrink-0 text-faint" />
        </button>
      </section>

      <!-- Theme -->
      <section class="space-y-2">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-faint">Appearance</h2>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="option in (['dark', 'light'] as const)"
            :key="option"
            type="button"
            class="flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm capitalize transition-colors"
            :class="
              ui.theme === option
                ? 'border-accent-500 bg-accent-500/12 text-main'
                : 'hairline surface-2 text-muted-token'
            "
            @click="ui.setTheme(option)"
          >
            <span class="flex items-center gap-2">
              <Icon :name="option === 'dark' ? 'moon' : 'sun'" :size="16" />
              {{ option }}
            </span>
            <Icon v-if="ui.theme === option" name="check" :size="16" class="text-accent-400" />
          </button>
        </div>
      </section>

      <!-- Keyboard reference -->
      <section class="space-y-2">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-faint">Shortcuts</h2>
        <dl class="divide-y hairline rounded-xl surface-2 px-4">
          <div v-for="row in [
            ['Space', 'Play / pause'],
            ['← →', 'Seek 10s'],
            ['⇧ ← →', 'Previous / next track'],
            ['↑ ↓', 'Volume'],
            ['M', 'Mute'],
            ['S', 'Shuffle'],
            ['R', 'Repeat mode'],
            ['/', 'Search'],
          ]" :key="row[0]" class="flex items-center justify-between py-2 text-sm">
            <dt><kbd class="kbd">{{ row[0] }}</kbd></dt>
            <dd class="text-muted-token">{{ row[1] }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
