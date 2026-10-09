import { createRouter, createWebHistory } from "vue-router";
import { base } from "@/config";

/**
 * All views are lazy-loaded so the initial bundle stays small; the songs view
 * is the only one worth loading eagerly since it's the default landing page.
 */
const routes = [
  { path: "/", name: "songs", component: () => import("@/views/SongsView.vue") },

  { path: "/albums", name: "albums", component: () => import("@/views/AlbumsView.vue") },
  { path: "/albums/:names", name: "album", component: () => import("@/views/AlbumsView.vue") },

  { path: "/artists", name: "artists", component: () => import("@/views/ArtistsView.vue") },
  { path: "/artists/:names", name: "artist", component: () => import("@/views/ArtistsView.vue") },

  {
    path: "/playlists",
    name: "playlists",
    component: () => import("@/views/PlaylistsView.vue"),
  },
  {
    path: "/playlists/:pid",
    name: "playlist",
    component: () => import("@/views/PlaylistsView.vue"),
  },

  { path: "/folders", name: "folders", component: () => import("@/views/FoldersView.vue") },
  { path: "/years", name: "years", component: () => import("@/views/YearsView.vue") },
  { path: "/years/:year", name: "year", component: () => import("@/views/YearsView.vue") },
  { path: "/history", name: "history", component: () => import("@/views/HistoryView.vue") },

  { path: "/:pathMatch(.*)*", redirect: "/" },
];

export const router = createRouter({
  history: createWebHistory(base),
  routes,
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 };
  },
});
