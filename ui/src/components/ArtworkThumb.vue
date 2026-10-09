<script setup lang="ts">
import { ref, watch } from "vue";
import { artworkUrl, DEFAULT_ART } from "@/api";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    path?: string;
    alt?: string;
    size?: number | string;
    rounded?: string;
  }>(),
  { alt: "", size: 48, rounded: "rounded-lg" },
);

/**
 * Artwork image with graceful degradation: a failed load falls back to the
 * app icon instead of showing a broken-image glyph.
 */
const failed = ref(false);
const src = ref(DEFAULT_ART);

watch(
  () => props.path,
  (path) => {
    failed.value = false;
    src.value = path ? artworkUrl(path) : DEFAULT_ART;
  },
  { immediate: true },
);
</script>

<template>
  <img
    :src="failed ? DEFAULT_ART : src"
    :alt="alt"
    :width="size"
    :height="size"
    loading="lazy"
    decoding="async"
    draggable="false"
    :class="[rounded, 'object-cover bg-black/20 aspect-square']"
    @error="failed = true"
  />
</template>
