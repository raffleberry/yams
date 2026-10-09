import { base, url } from "./config";
import type {
  Album,
  Artist,
  Folder,
  HistoryEntry,
  Page,
  Playlist,
  Song,
  SongLyrics,
  TrackProps,
} from "./types";

/**
 * Typed API client. Every function throws an ApiError on a non-2xx response so
 * callers can surface failures instead of silently doing nothing.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url(path), init);
  } catch {
    throw new ApiError(0, "Network unavailable. Check your connection.");
  }
  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText || "Request failed"}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

const qs = (params: Record<string, string | number>): string => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) search.set(k, String(v));
  return search.toString();
};

/* ------------------------------------------------------------------ library */

export const fetchRandomSongs = () => request<Page<Song>>("/api/all");

export const searchSongs = (query: string, offset = 0) =>
  request<Page<Song>>(`/api/search?${qs({ query, offset })}`);

/* ----------------------------------------------------------------- artists */

export const fetchArtists = () => request<{ Data: Artist[] }>("/api/artists");

export const fetchArtistSongs = (artists: string) =>
  request<{ Data: Song[] }>(`/api/artists/${encodeURIComponent(artists)}`);

/* ------------------------------------------------------------------ albums */

export const fetchAlbums = (offset = 0) => request<Page<Album>>(`/api/albums?${qs({ offset })}`);

export const fetchAlbumSongs = (album: string) =>
  request<{ Data: Song[] }>(`/api/albums/${encodeURIComponent(album)}`);

/* ----------------------------------------------------------------- folders */

export const fetchFolders = (path = "") =>
  request<{ Data: Folder[] }>(`/api/folders?${qs({ path })}`);

/* ------------------------------------------------------------------- years */

export const fetchYears = () => request<{ Data: string[] }>("/api/years");

export const fetchYearSongs = (year: string) =>
  request<{ Data: Song[] }>(`/api/years/${encodeURIComponent(year)}`);

/* ----------------------------------------------------------------- history */

export const fetchHistory = (offset = 0) =>
  request<Page<HistoryEntry>>(`/api/history?${qs({ offset })}`);

export const postHistory = (song: Song) =>
  request<{ Message: string }>("/api/history", json("POST", song));

/* ------------------------------------------------------------- favourites */

export const fetchFavourites = () => request<Page<Song>>("/api/favourites");

export const addFavourite = (song: Song) =>
  request<{ Message: string }>("/api/favourites", json("POST", song));

export const removeFavourite = (song: Song) =>
  request<{ Message: string }>("/api/favourites", json("DELETE", song));

/* --------------------------------------------------------------- playlists */

export const fetchPlaylists = () => request<{ Data: Playlist[] }>("/api/playlists");

export const fetchPlaylistSongs = (id: number | "favourites", offset = 0) =>
  request<Page<Song>>(
    id === "favourites"
      ? `/api/favourites?${qs({ offset })}`
      : `/api/playlists/${id}?${qs({ offset })}`,
  );

export const createPlaylist = (p: {
  Name: string;
  Description: string;
  Type: "LIST" | "QUERY";
  Query: string;
}) => request<Playlist>("/api/playlists", json("POST", p));

export const updatePlaylist = (p: {
  Id: number;
  Name: string;
  Description: string;
  Type: "LIST" | "QUERY";
  Query: string;
}) => request<Playlist>("/api/playlists", json("PUT", p));

export const deletePlaylist = (id: number) =>
  request<{ Message: string; Count: number }>(`/api/playlists?${qs({ id })}`, {
    method: "DELETE",
  });

export const addToPlaylist = (id: number, song: Song) =>
  request<{ Message: string }>(`/api/playlists/${id}`, json("POST", song));

export const removeFromPlaylist = (id: number, song: Song) =>
  request<{ Message: string }>(`/api/playlists/${id}`, json("DELETE", song));

/* ------------------------------------------------------------------- misc. */

export const fetchProps = (path: string) =>
  request<TrackProps>(`/api/props?${qs({ path })}`);

export const fetchLyrics = (path: string) =>
  request<SongLyrics>(`/api/lyrics?${qs({ path })}`);

export const isScanning = () => request<boolean>("/api/isScanning");

export const triggerScan = () => fetch(url("/api/triggerScan"));

/* ------------------------------------------------------------------ assets */

export const artworkUrl = (path: string): string =>
  `${base}/api/artwork?${qs({ path })}`;

export const streamUrl = (path: string): string => `${base}/api/files?${qs({ path })}`;

export const DEFAULT_ART = `${base}/android-chrome-192x192.png`;
