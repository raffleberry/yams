import {
    apiAddFavourite,
    apiAddToPlaylist,
    apiCreatePlaylist,
    apiDeletePlaylist,
    apiGetFavourites,
    apiGetPlaylists,
    apiGetPlaylistTracks,
    apiRemoveFavourite,
    apiRemoveFromPlaylist,
} from "../api.js";
import { defineStore, ref } from "../vue.js";


export const usePlaylistStore = defineStore('playlist', () => {
    const loading = ref(true)
    const favs = ref([])

    /**
     * {
     *   "id": {
     *     "Name": "name",
     *     "Description": "description",
     *     "Type": "LIST/QUERY",
     *     "Query": "SELECT * FROM table;",
     *     "Tracks": []
     *   }
     * }
     */
    const playlists = ref({})

    const fetchFav = async () => {
        try {
            const json = await apiGetFavourites()
            favs.value = json.Data
        } catch (error) {
            console.error('Error fetching favourites:', error);
        }
    }

    const fetchTracks = async (id) => {
        try {
            const json = await apiGetPlaylistTracks(id)
            return { res: json.Data, err: null }
        } catch (error) {
            console.error('Error fetching playlist:', error);
            return { res: [], err: error }
        }
    }

    const fetchAll = async () => {
        try {
            loading.value = true
            const json = await apiGetPlaylists()
            const data = {}
            for (const playlist of json.Data) {
                data[playlist.Id] = playlist
                data[playlist.Id].Tracks = []
                const { res, err } = await fetchTracks(playlist.Id)
                if (err) {
                    console.error(err)
                    continue
                }
                data[playlist.Id].Tracks = res
            }
            playlists.value = data
        } catch (error) {
            console.error('Error fetching playlists:', error);
        } finally {
            loading.value = false
        }
    }



    const addFav = async (track) => {
        try {
            await apiAddFavourite(track)

            favs.value.push(track)
        } catch (error) {
            console.error(error)
        }
    }

    const remFav = async (track) => {
        try {
            await apiRemoveFavourite(track)

            favs.value.splice(favs.value.indexOf(track), 1)
        } catch (error) {
            console.error(error)
        }
    }

    const create = async (name, desc, typ, query) => {
        try {
            const json = await apiCreatePlaylist(name, desc, typ, query)
            const id = json.Id
            playlists.value[id] = json
            playlists.value[id].Tracks = []
            return null
        } catch (error) {
            console.error(error)
            return error
        }
    }

    const del = async (id) => {
        try {
            await apiDeletePlaylist(id)
            let d = {
                ...playlists.value
            }
            delete d[id]
            playlists.value = d
            return null
        } catch (error) {
            console.error(error)
            return error
        }
    }

    const add = async (id, track) => {
        try {
            await apiAddToPlaylist(id, track)

            if (!playlists.value[id]) {
                await fetchTracks(id)
            }

            playlists.value[id].Tracks.push(track)
        } catch (error) {
            console.error(error)
        }
    }

    const rem = async (id, track) => {
        try {
            await apiRemoveFromPlaylist(id, track)

            if (!playlists.value[id]) {
                await fetchTracks(id)
            }

            playlists.value[id].Tracks.splice(playlists.value[id].Tracks.indexOf(track), 1)

        } catch (error) {
            console.error(error)
        }
    }
    fetchAll();
    fetchFav();
    return {
        favs, playlists,
        fetchFav, fetchAll,
        addFav, remFav,
        create, add, rem,
        del,
        loading
    }

})
