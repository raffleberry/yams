<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    value: number;
    max: number;
    buffered?: number;
    size?: "sm" | "md";
    disabled?: boolean;
  }>(),
  { buffered: 0, size: "md", disabled: false },
);

const emit = defineEmits<{ seek: [fraction: number] }>();

const track = ref<HTMLElement | null>(null);
const scrubbing = ref(false);
const hover = ref(false);
const hoverFraction = ref(0);
/** Cursor position during a drag. Committed only on release (see below). */
const previewFraction = ref(0);

const percent = computed(() =>
  props.max > 0 ? Math.min(100, Math.max(0, (props.value / props.max) * 100)) : 0,
);
const bufferedPercent = computed(() =>
  props.max > 0 ? Math.min(100, Math.max(0, (props.buffered / props.max) * 100)) : 0,
);

/**
 * Fill follows the drag preview while scrubbing so the bar tracks the cursor
 * without seeking; the actual seek commits on pointer-up.
 */
const displayPercent = computed(() =>
  scrubbing.value
    ? Math.min(100, Math.max(0, previewFraction.value * 100))
    : percent.value,
);

/** Thumb tracks the cursor while hovering/scrubbing, playback otherwise. */
const thumbPercent = computed(() => {
  if (props.max <= 0) return 0;
  if (scrubbing.value) {
    return Math.min(100, Math.max(0, previewFraction.value * 100));
  }
  if (hover.value) {
    return Math.min(100, Math.max(0, hoverFraction.value * 100));
  }
  return percent.value;
});

function fractionFrom(e: PointerEvent): number {
  const el = track.value;
  if (!el) return 0;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0) return 0;
  return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled || props.max <= 0) return;
  scrubbing.value = true;
  previewFraction.value = fractionFrom(e);
  track.value?.setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (props.disabled) return;
  hoverFraction.value = fractionFrom(e);
  hover.value = true;
  if (scrubbing.value) previewFraction.value = hoverFraction.value;
}

function onPointerUp() {
  if (!scrubbing.value) return;
  scrubbing.value = false;
  emit("seek", Math.min(1, Math.max(0, previewFraction.value)));
}

/** Interrupted drag (alert, gesture, unplug): discard, don't seek. */
function onPointerCancel() {
  scrubbing.value = false;
}

function onKey(e: KeyboardEvent) {
  if (props.disabled || props.max <= 0) return;
  const step = props.max / 20;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    emit("seek", Math.min(1, (props.value + step) / props.max));
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    emit("seek", Math.max(0, (props.value - step) / props.max));
  } else if (e.key === "Home") {
    e.preventDefault();
    emit("seek", 0);
  } else if (e.key === "End") {
    e.preventDefault();
    emit("seek", 1);
  }
}
</script>

<template>
  <div
    ref="track"
    role="slider"
    tabindex="0"
    :aria-valuemin="0"
    :aria-valuemax="Math.floor(max)"
    :aria-valuenow="Math.floor(value)"
    :aria-disabled="disabled || max <= 0"
    aria-label="Seek"
    class="group relative flex w-full touch-none items-center"
    :class="disabled ? 'cursor-default opacity-60' : 'cursor-pointer'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @pointerleave="hover = false"
    @keydown="onKey"
  >
    <div
      class="relative w-full overflow-hidden rounded-full bg-current/15 transition-[height] duration-150"
      :class="size === 'sm' ? 'h-1' : 'h-1.5 group-hover:h-2.5'"
    >
      <div
        class="absolute inset-y-0 left-0 bg-current/25 transition-[width] duration-150"
        :style="{ width: `${bufferedPercent}%` }"
      />
      <div
        class="absolute inset-y-0 left-0 bg-current"
        :style="{ width: `${displayPercent}%` }"
      />
      <div
        class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-0 shadow transition-opacity group-hover:opacity-100"
        :class="scrubbing ? 'opacity-100' : ''"
        :style="{ left: `${thumbPercent}%` }"
      />
    </div>
    <div
      v-if="hover && !disabled"
      class="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums surface-3 text-main shadow"
      :style="{ left: `${hoverFraction * 100}%` }"
    >
      {{ Math.floor(hoverFraction * max) }}s
    </div>
  </div>
</template>
