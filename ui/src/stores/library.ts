import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  addFavourite,
  addToPlaylist,
  createPlaylist as apiCreatePlaylist,
  deletePlaylist as apiDeletePlaylist,
  fetchFavourites,
  fetchPlaylistSongs,
  fetchPlaylists,
  removeFavourite,
  removeFromPlaylist,
  updatePlaylist as apiUpdatePlaylist,
} from "@/api";
import { isSameTrack, trackKey } from "@/utils/format";
import type { Playlist, Song } from "@/types";

/** A user playlist with its tracks resolved (QUERY playlists resolve server-side). */
export interface PlaylistWithTracks extends Playlist {
  Tracks: Song[];
}

export const useLibraryStore = defineStore("library", () => {
  const playlists = ref<Record<number, PlaylistWithTracks>>({});
  const favourites = ref<Song[]>([]);
  const loading = ref(true);
  const loaded = ref(false);

  const playlistList = computed(() =>
    Object.values(playlists.value).sort((a, b) => a.Name.localeCompare(b.Name)),
  );

  const favouriteKeys = computed(() => new Set(favourites.value.map(trackKey)));
  const isFavourite = (song: Song) => favouriteKeys.value.has(trackKey(song));

  /** Number of LIST playlists (QUERY playlists can't be edited by hand). */
  const membership = (song: Song) => {
    let count = 0;
    for (const playlist of Object.values(playlists.value)) {
      if (playlist.Type === "LIST" && playlist.Tracks.some((t) => isSameTrack(t, song))) {
        count++;
      }
    }
    return count;
  };

  async function loadPlaylists() {
    const res = await fetchPlaylists();
    const next: Record<number, PlaylistWithTracks> = {};
    await Promise.all(
      res.Data.map(async (p) => {
        const detail = p.Type === "QUERY" ? null : await safeTracks(p.Id);
        next[p.Id] = { ...p, Tracks: detail ?? [] };
      }),
    );
    playlists.value = next;
  }

  async function safeTracks(id: number): Promise<Song[] | null> {
    try {
      const res = await fetchPlaylistSongs(id);
      return res.Data ?? [];
    } catch {
      return null;
    }
  }

  async function loadFavourites() {
    const res = await fetchFavourites();
    favourites.value = res.Data ?? [];
  }

  async function loadAll() {
    loading.value = true;
    try {
      await Promise.all([loadPlaylists(), loadFavourites()]);
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function toggleFavourite(song: Song) {
    const key = trackKey(song);
    const wasFavourite = favouriteKeys.value.has(key);
    // Optimistic: flip immediately, roll back if the request fails.
    if (wasFavourite) {
      favourites.value = favourites.value.filter((s) => trackKey(s) !== key);
    } else {
      favourites.value = [...favourites.value, song];
    }
    try {
      if (wasFavourite) await removeFavourite(song);
      else await addFavourite(song);
    } catch (err) {
      await loadFavourites();
      throw err;
    }
  }

  async function createPlaylist(input: {
    Name: string;
    Description: string;
    Type: "LIST" | "QUERY";
    Query: string;
  }): Promise<PlaylistWithTracks> {
    const created = await apiCreatePlaylist(input);
    const playlist: PlaylistWithTracks = { ...created, Tracks: [] };
    playlists.value = { ...playlists.value, [created.Id]: playlist };
    return playlist;
  }

  async function editPlaylist(id: number, input: { Name: string; Description: string }) {
    const updated = await apiUpdatePlaylist({
      Id: id,
      Name: input.Name,
      Description: input.Description,
      Type: playlists.value[id]?.Type ?? "LIST",
      Query: playlists.value[id]?.Query ?? "",
    });
    playlists.value = {
      ...playlists.value,
      [id]: { ...(playlists.value[id] ?? ({} as PlaylistWithTracks)), ...updated },
    };
  }

  async function deletePlaylist(id: number) {
    await apiDeletePlaylist(id);
    const next = { ...playlists.value };
    delete next[id];
    playlists.value = next;
  }

  function contains(playlist: PlaylistWithTracks, song: Song) {
    if (playlist.Type !== "LIST") return false;
    return playlist.Tracks.some((t) => isSameTrack(t, song));
  }

  async function togglePlaylistMembership(playlist: PlaylistWithTracks, song: Song) {
    const present = contains(playlist, song);
    const tracks = playlist.Tracks.slice();
    if (present) {
      tracks.splice(tracks.findIndex((t) => isSameTrack(t, song)), 1);
    } else {
      tracks.push(song);
    }
    // Optimistic update
    playlists.value = {
      ...playlists.value,
      [playlist.Id]: { ...playlist, Tracks: tracks, Count: tracks.length },
    };
    try {
      if (present) await removeFromPlaylist(playlist.Id, song);
      else await addToPlaylist(playlist.Id, song);
    } catch (err) {
      playlists.value = {
        ...playlists.value,
        [playlist.Id]: { ...playlist, Tracks: playlist.Tracks.slice() },
      };
      throw err;
    }
  }

  /** Apply the server-reported favourite state for a set of tracks. */
  function mergeFavouriteFlags(songs: Song[]) {
    return songs.map((s) => ({ ...s, IsFavourite: favouriteKeys.value.has(trackKey(s)) }));
  }

  return {
    playlists,
    playlistList,
    favourites,
    loading,
    loaded,
    isFavourite,
    membership,
    contains,
    loadAll,
    loadPlaylists,
    loadFavourites,
    toggleFavourite,
    createPlaylist,
    editPlaylist,
    deletePlaylist,
    togglePlaylistMembership,
    mergeFavouriteFlags,
  };
});
