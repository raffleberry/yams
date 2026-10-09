<script setup lang="ts">
withDefaults(defineProps<{ active?: boolean }>(), { active: false });
</script>

<template>
  <span
    class="inline-flex h-3.5 w-3.5 items-end justify-between gap-[2px]"
    :class="active ? '' : 'opacity-60'"
    aria-hidden="true"
  >
    <span class="equalizer-bar h-full w-[3px] rounded-full bg-current" />
    <span class="equalizer-bar h-full w-[3px] rounded-full bg-current" />
    <span class="equalizer-bar h-full w-[3px] rounded-full bg-current" />
  </span>
</template>
