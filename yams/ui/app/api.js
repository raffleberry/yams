import { base } from "./base.js"

export const ENDPOINT = Object.freeze({
  ALL: () => `${base}/api/all`,
  SEARCH: (query, offset) => `${base}/api/search?query=${query}&offset=${offset}`,
  ARTISTS_ALL: () => `${base}/api/artists`,
  ARTISTS_GET: (artists) => `${base}/api/artists/${encodeURIComponent(artists)}`,
  ALBUMS_ALL: (offset) => `${base}/api/albums?offset=${offset}`,
  ALBUMS_GET: (album) => `${base}/api/albums/${encodeURIComponent(album)}`,
  HISTORY_GET: (offset) => `${base}/api/history?offset=${offset}`,
  HISTORY_ADD: () => `${base}/api/history`,
  FAVOURITES: () => `${base}/api/favourites`,
  PLAYLISTS: () => `${base}/api/playlists`,
  PLAYLIST_DEL: (id) => `${base}/api/playlists?id=${id}`,
  PLAYLIST_GET: (id) => `${base}/api/playlists/${id}`,
  PROPS: (path) => `${base}/api/props?path=${encodeURIComponent(path)}`,
  LYRICS: (path) => `${base}/api/lyrics?path=${encodeURIComponent(path)}`,
  ARTWORK: (path) => `${base}/api/artwork?path=${encodeURIComponent(path)}`,
  FILES: (path) => `${base}/api/files?path=${encodeURIComponent(path)}`,
  IS_SCANNING: () => `${base}/api/isScanning`,
  TRIGGER_SCAN: () => `${base}/api/triggerScan`,
})

// Static asset urls (prefix-aware)
export const PLAY_PNG = () => `${base}/app/play.png`
export const DEFAULT_ICON = () => `${base}/android-chrome-192x192.png`

// Backwards-compatible url builders (kept here so callers import from one place)
export const getArtwork = (path) => ENDPOINT.ARTWORK(path)
export const getProps = (path) => ENDPOINT.PROPS(path)
export const getSrc = (path) => ENDPOINT.FILES(path)

const checkOk = async (res) => {
  if (!res.ok) {
    throw new Error(`${res.status} - ${res.statusText}`)
  }
  return res
}

export const apiGetShuffle = async () => {
  const res = await checkOk(await fetch(ENDPOINT.ALL()))
  return res.json()
}

export const apiSearchMusic = async (query, offset) => {
  const res = await checkOk(await fetch(ENDPOINT.SEARCH(query, offset)))
  return res.json()
}

export const apiGetArtists = async () => {
  const res = await checkOk(await fetch(ENDPOINT.ARTISTS_ALL()))
  return res.json()
}

export const apiGetArtistSongs = async (artists) => {
  const res = await checkOk(await fetch(ENDPOINT.ARTISTS_GET(artists)))
  return res.json()
}

export const apiGetAlbums = async (offset) => {
  const res = await checkOk(await fetch(ENDPOINT.ALBUMS_ALL(offset)))
  return res.json()
}

export const apiGetAlbumSongs = async (album) => {
  const res = await checkOk(await fetch(ENDPOINT.ALBUMS_GET(album)))
  return res.json()
}

export const apiGetHistory = async (offset) => {
  const res = await checkOk(await fetch(ENDPOINT.HISTORY_GET(offset)))
  return res.json()
}

export const apiPostHistory = async (track) => {
  const res = await checkOk(
    await fetch(ENDPOINT.HISTORY_ADD(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(track),
    }),
  )
  return res.json()
}

export const apiFetchAudioBlob = async (path) => {
  const res = await checkOk(await fetch(ENDPOINT.FILES(path)))
  return res.blob()
}

export const apiGetFavourites = async () => {
  const res = await checkOk(await fetch(ENDPOINT.FAVOURITES()))
  return res.json()
}

export const apiAddFavourite = async (track) => {
  await checkOk(
    await fetch(ENDPOINT.FAVOURITES(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(track),
    }),
  )
}

export const apiRemoveFavourite = async (track) => {
  await checkOk(
    await fetch(ENDPOINT.FAVOURITES(), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(track),
    }),
  )
}

export const apiGetPlaylists = async () => {
  const res = await checkOk(await fetch(ENDPOINT.PLAYLISTS()))
  return res.json()
}

export const apiGetPlaylistTracks = async (id) => {
  const res = await fetch(ENDPOINT.PLAYLIST_GET(id))
  if (res.status != 200) {
    throw new Error(`Failed to fetch playlist ${id}'s tracks`)
  }
  return res.json()
}

export const apiCreatePlaylist = async (name, desc, typ, query) => {
  const res = await fetch(ENDPOINT.PLAYLISTS(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Name: name, Description: desc, Type: typ, Query: query }),
  })
  const json = await res.json()
  if (res.status != 200 || json.Id === -1) {
    throw new Error("Playlist creation failed")
  }
  return json
}

export const apiDeletePlaylist = async (id) => {
  const res = await fetch(ENDPOINT.PLAYLIST_DEL(id), { method: "DELETE" })
  if (res.status != 200) {
    throw new Error("Failed to DELETE playlist")
  }
}

export const apiAddToPlaylist = async (id, track) => {
  const res = await fetch(ENDPOINT.PLAYLIST_GET(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(track),
  })
  if (res.status != 200) {
    throw new Error("Failed to add track to playlist")
  }
}

export const apiRemoveFromPlaylist = async (id, track) => {
  const res = await fetch(ENDPOINT.PLAYLIST_GET(id), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(track),
  })
  if (res.status != 200) {
    throw new Error("Failed to remove track from playlist")
  }
}

export const apiGetProps = async (path) => {
  const res = await checkOk(await fetch(ENDPOINT.PROPS(path)))
  return res.json()
}

export const apiGetLyrics = async (path) => {
  const res = await fetch(ENDPOINT.LYRICS(path), { method: "GET" })
  return res
}

export const apiIsScanning = async () => {
  const res = await checkOk(await fetch(ENDPOINT.IS_SCANNING()))
  return res.json()
}

export const apiTriggerScan = async () => {
  return fetch(ENDPOINT.TRIGGER_SCAN())
}
