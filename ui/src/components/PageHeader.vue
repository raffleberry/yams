<script setup lang="ts">
import Icon from "./Icon.vue";

defineProps<{
  title: string;
  subtitle?: string;
  /** Optional artwork shown as a hero backdrop. */
  art?: string;
}>();
</script>

<template>
  <header class="relative overflow-hidden px-4 pb-5 pt-6 sm:px-6 sm:pt-8">
    <div
      class="pointer-events-none absolute inset-0 -z-10"
      :style="{ background: 'var(--ambient, transparent)' }"
    />
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-3xl font-bold tracking-tight text-main sm:text-4xl">{{ title }}</h1>
        <p v-if="subtitle" class="mt-1 truncate text-base text-muted-token">{{ subtitle }}</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
