<script setup lang="ts">
import { useUiStore } from "@/stores/ui";
import Icon from "./Icon.vue";

const ui = useUiStore();

const toneClass = {
  info: "text-main",
  success: "text-emerald-400",
  error: "text-rose-400",
};
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-28"
      role="status"
      aria-live="polite"
    >
      <TransitionGroup name="sheet">
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          class="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border hairline surface-1 px-4 py-2.5 text-sm shadow-2xl"
        >
          <Icon
            :name="toast.tone === 'error' ? 'warning' : toast.tone === 'success' ? 'check' : 'info'"
            :size="16"
            :class="toneClass[toast.tone]"
          />
          <span class="text-main">{{ toast.message }}</span>
          <button
            v-if="toast.action"
            type="button"
            class="shrink-0 text-xs font-semibold text-accent-400 hover:underline"
            @click="
              toast.action?.run();
              ui.dismissToast(toast.id);
            "
          >
            {{ toast.action.label }}
          </button>
          <button
            type="button"
            class="icon-btn !size-6 shrink-0"
            aria-label="Dismiss"
            @click="ui.dismissToast(toast.id)"
          >
            <Icon name="close" :size="13" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
