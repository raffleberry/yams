<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { isScanning, triggerScan } from "@/api";
import { useUiStore } from "@/stores/ui";
import ModalShell from "../ModalShell.vue";
import Icon from "../Icon.vue";

const ui = useUiStore();
const scanning = ref(false);
const busy = ref(false);
const message = ref<string | null>(null);
let timer: number | undefined;

async function poll() {
  try {
    scanning.value = await isScanning();
  } catch {
    scanning.value = false;
  }
  if (scanning.value) {
    timer = window.setTimeout(poll, 4000);
  }
}

/** Null-safe checkbox handler (no inline `as` cast in the template). */
function onLyricsToggle(e: Event) {
  if (e.target instanceof HTMLInputElement) ui.setLyricsOpen(e.target.checked);
}

async function runScan() {
  busy.value = true;
  message.value = null;
  try {
    const res = await triggerScan();
    if (res.status === 503) {
      message.value = "A scan is already running.";
    } else if (res.status === 202) {
      message.value = "Scan started.";
      scanning.value = true;
      timer = window.setTimeout(poll, 4000);
    } else {
      message.value = `Scan failed (${res.status}).`;
    }
  } catch {
    message.value = "Could not reach the server.";
  } finally {
    busy.value = false;
  }
}

watch(
  () => ui.modal,
  (id) => {
    if (id === "settings") void poll();
    else if (timer) window.clearTimeout(timer);
  },
);

onBeforeUnmount(() => {
  if (timer) window.clearTimeout(timer);
});
</script>

<template>
  <ModalShell title="Settings" @close="ui.closeModal()">
    <div class="space-y-6">
      <!-- Library -->
      <section class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-widest text-faint">Library</h3>
        <div class="flex items-center justify-between gap-3 rounded-xl surface-2 px-4 py-3">
          <div class="flex items-center gap-2.5">
            <span v-if="scanning" class="spinner text-accent-400" />
            <Icon v-else name="disc" :size="18" class="text-faint" />
            <div>
              <p class="text-base font-medium text-main">
                {{ scanning ? "Scanning…" : "Rescan library" }}
              </p>
              <p class="text-sm text-muted-token">
                {{ scanning ? "New files are being indexed" : "Pick up newly added music" }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn-primary-token shrink-0"
            :disabled="scanning || busy"
            @click="runScan"
          >
            {{ scanning ? "Scanning" : "Scan" }}
          </button>
        </div>
        <p v-if="message" class="text-sm text-muted-token">{{ message }}</p>
      </section>

      <!-- Appearance -->
      <section class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-widest text-faint">Appearance</h3>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="option in (['dark', 'light'] as const)"
            :key="option"
            type="button"
            class="flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-base capitalize transition-colors"
            :class="
              ui.theme === option
                ? 'border-accent-500 bg-accent-500/12 text-main'
                : 'hairline surface-2 text-muted-token hover:text-main'
            "
            @click="ui.setTheme(option)"
          >
            {{ option }}
            <Icon v-if="ui.theme === option" name="check" :size="16" class="text-accent-400" />
          </button>
        </div>
      </section>

      <!-- Playback -->
      <section class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-widest text-faint">Playback</h3>
        <label class="flex cursor-pointer items-center justify-between rounded-xl surface-2 px-4 py-3">
          <span class="text-base text-main">Show lyrics panel</span>
          <input
            :checked="ui.lyricsOpen"
            type="checkbox"
            class="size-4 accent-[var(--color-accent-500)]"
            @change="onLyricsToggle"
          />
        </label>
      </section>
    </div>

    <template #footer>
      <button type="button" class="btn-ghost-token w-full" @click="ui.closeModal()">Close</button>
    </template>
  </ModalShell>
</template>
