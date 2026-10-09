<script setup lang="ts">
/**
 * Inline SVG icon set. Bundling the handful of glyphs we need avoids pulling
 * in an icon library and keeps the payload small.
 */
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    name: keyof typeof paths | string;
    size?: number | string;
    strokeWidth?: number;
  }>(),
  { size: 20, strokeWidth: 1.75 },
);

const paths = {
  play: "M6.5 4.8a1 1 0 0 1 1.53-.85l9.2 6.2a1 1 0 0 1 0 1.7l-9.2 6.2A1 1 0 0 1 6.5 17.2z",
  pause: "M9 5v14M15 5v14",
  skipBack: "M18 5.5v13L8 12zM6 5v14",
  skipForward: "M6 5.5v13L16 12zM18 5v14",
  shuffle: "M17 4l3 3-3 3M17 14l3 3-3 3M3 7h3.5c1.2 0 2.3.6 3 1.6l3.9 5.8c.7 1 1.8 1.6 3 1.6H20M3 17h3.5c1.2 0 2.3-.6 3-1.6l.7-1M20 7h-3.5c-1.2 0-2.3.6-3 1.6l-.7 1",
  repeat: "M17 2l3 3-3 3M7 22l-3-3 3-3M3 11V9a4 4 0 0 1 4-4h13M21 13v2a4 4 0 0 1-4 4H4",
  repeatOne: "M17 2l3 3-3 3M7 22l-3-3 3-3M3 11V9a4 4 0 0 1 4-4h13M21 13v2a4 4 0 0 1-4 4H4M11.5 10.5L13 9.5v6",
  volume: "M11 5 6.5 9H3v6h3.5L11 19zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
  volumeLow: "M11 5 6.5 9H3v6h3.5L11 19zM15.5 8.5a5 5 0 0 1 0 7",
  volumeMute: "M11 5 6.5 9H3v6h3.5L11 19zM16 9.5l5 5M21 9.5l-5 5",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  music: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  disc: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  album: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  artist: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0",
  playlist: "M3 6h12M3 11h12M3 16h8M17 12v8M13 20h8",
  queue: "M4 6h16M4 12h16M4 18h10M18 16v6M15 22h6",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  heart: "M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z",
  star: "m12 3.5 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.9z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M18 6 6 18M6 6l12 12",
  check: "m20 6-11 11-5-5",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  chevronDown: "m6 9 6 6 6-6",
  chevronUp: "m18 15-6-6-6 6",
  more: "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5h.01",
  warning: "M12 3 2 20h20zM12 10v4M12 17.5h.01",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5",
  edit: "M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16z",
  lyrics: "M4 5h16M4 10h10M4 15h16M4 20h7",
  expand: "M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5",
  shrink: "M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5",
  menu: "M3 6h18M3 12h18M3 18h18",
  drag: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
  wave: "M3 12h2l2-6 3 14 3-16 3 12 2-4h3",
};

const filled = computed(() => props.name === "play" || props.name === "heart" || props.name === "star");
const d = computed(() => (paths as Record<string, string>)[props.name] ?? "");
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    :stroke="filled ? 'none' : 'currentColor'"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path :d="d" />
  </svg>
</template>
