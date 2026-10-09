<script setup lang="ts">
defineProps<{ count?: number }>();
</script>

<template>
  <div class="space-y-2 px-4 sm:px-6">
    <div v-for="i in count ?? 8" :key="i" class="flex items-center gap-3 py-2 sm:gap-4">
      <div class="skeleton size-12 shrink-0 rounded-lg sm:size-14" />
      <div class="flex-1 space-y-2">
        <div class="skeleton h-3.5 rounded" :style="{ width: `${40 + ((i * 13) % 45)}%` }" />
        <div class="skeleton h-3 rounded" :style="{ width: `${20 + ((i * 7) % 30)}%` }" />
      </div>
      <div class="skeleton h-3 w-10 rounded" />
    </div>
  </div>
</template>
