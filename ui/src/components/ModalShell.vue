<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import Icon from "./Icon.vue";

/**
 * Accessible dialog shell: backdrop click and Escape both close, focus is
 * trapped loosely by moving into the panel on open.
 */
const props = defineProps<{ title: string; description?: string }>();
const emit = defineEmits<{ close: [] }>();

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.stopPropagation();
    emit("close");
  }
}

onMounted(() => {
  document.addEventListener("keydown", onKey);
  document.body.style.overflow = "hidden";
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[65] grid place-items-center p-4">
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="emit('close')"
      />
      <div
        class="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border hairline surface-1 shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="props.title"
      >
        <header class="flex items-start justify-between gap-4 border-b hairline px-5 py-4">
          <div>
            <h2 class="text-base font-semibold text-main">{{ props.title }}</h2>
            <p v-if="props.description" class="mt-0.5 text-xs text-muted-token">
              {{ props.description }}
            </p>
          </div>
          <button type="button" class="icon-btn -mr-1" aria-label="Close" @click="emit('close')">
            <Icon name="close" :size="18" />
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="border-t hairline px-5 py-3">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
