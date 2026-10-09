<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { fetchFolders } from "@/api";
import { useUiStore } from "@/stores/ui";
import type { Folder } from "@/types";
import Icon from "../components/Icon.vue";
import PageHeader from "../components/PageHeader.vue";

const router = useRouter();
const ui = useUiStore();

const folders = ref<Folder[]>([]);
const path = ref("");
const loading = ref(false);
const trail = ref<{ name: string; path: string }[]>([]);

async function load(target: string) {
  loading.value = true;
  path.value = target;
  try {
    const res = await fetchFolders(target);
    folders.value = (res.Data ?? []).sort((a, b) => a.Name.localeCompare(b.Name));
    if (!folders.value.length && target) {
      ui.toast("That folder can't be browsed", "info");
      void router.push({ name: "folders" }).catch(() => {});
    }
  } catch {
    ui.toast("Could not load folders", "error");
    folders.value = [];
  } finally {
    loading.value = false;
  }
}

/** Split the current path into breadcrumb segments. */
watch(
  path,
  (value) => {
    if (!value) {
      trail.value = [];
      return;
    }
    const parts = value.split("/").filter(Boolean);
    let acc = "";
    trail.value = parts.map((part) => {
      acc += `/${part}`;
      return { name: part, path: acc };
    });
  },
  { immediate: true },
);

const currentName = computed(() => {
  const parts = path.value.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "Folders";
});

onMounted(() => void load(""));
</script>

<template>
  <div class="min-h-full">
    <PageHeader title="Folders" :subtitle="path || 'Browse your music directory'">
      <template #actions>
        <button
          v-if="path"
          type="button"
          class="btn-ghost-token"
          @click="load(path.split('/').slice(0, -1).join('/'))"
        >
          <Icon name="chevronUp" :size="16" />
          Up
        </button>
      </template>
    </PageHeader>

    <!-- Breadcrumbs -->
    <nav v-if="trail.length" class="flex flex-wrap items-center gap-1 px-4 pb-4 text-base sm:px-6">
      <button type="button" class="text-accent-400 hover:underline" @click="load('')">
        Folders
      </button>
      <template v-for="crumb in trail" :key="crumb.path">
        <Icon name="chevronRight" :size="14" class="text-faint" />
        <button
          type="button"
          class="text-muted-token transition-colors hover:text-main hover:underline"
          :class="crumb.path === path ? 'text-main' : ''"
          @click="load(crumb.path)"
        >
          {{ crumb.name }}
        </button>
      </template>
    </nav>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:grid-cols-4 sm:px-6">
      <div v-for="i in 8" :key="i" class="skeleton h-20 rounded-xl" />
    </div>

    <!-- Empty -->
    <div v-else-if="!folders.length" class="grid place-items-center px-6 py-20 text-center">
      <div>
        <div class="mx-auto mb-4 grid size-14 place-items-center rounded-2xl surface-2 text-faint">
          <Icon name="folder" :size="24" />
        </div>
        <p class="text-base font-medium text-main">No sub-folders here</p>
        <p class="mt-1 text-sm text-muted-token">
          Songs are still playable from the Songs tab.
        </p>
      </div>
    </div>

    <!-- Folder grid -->
    <div v-else class="grid grid-cols-1 gap-2 px-4 pb-8 sm:grid-cols-2 md:grid-cols-3 sm:px-6">
      <button
        v-for="folder in folders"
        :key="folder.Path"
        type="button"
        class="card-hover flex items-center gap-3 rounded-xl px-3 py-3 text-left hover:surface-2"
        @click="load(folder.Path)"
      >
        <div class="grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white">
          <Icon name="folder" :size="20" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-base font-semibold text-main">{{ folder.Name }}</p>
          <p class="text-sm text-muted-token">{{ folder.Songs }} songs</p>
        </div>
        <Icon name="chevronRight" :size="18" class="shrink-0 text-faint" />
      </button>
    </div>
  </div>
</template>
