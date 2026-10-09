<script setup lang="ts">
const items = [
  { to: "/", icon: "music", label: "Songs" },
  { to: "/albums", icon: "album", label: "Albums" },
  { to: "/artists", icon: "artist", label: "Artists" },
  { to: "/playlists", icon: "playlist", label: "Lists" },
  { to: "/more", icon: "menu", label: "More" },
];
</script>

<template>
  <nav
    class="grid shrink-0 grid-cols-5 border-t hairline pb-[env(safe-area-inset-bottom)] lg:hidden"
    aria-label="Main"
  >
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors text-faint"
      active-class="!text-accent-400"
    >
      <Icon :name="item.icon" :size="20" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
