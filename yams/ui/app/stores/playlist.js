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
            const res = await fetch('/api/favourites')
            if (res.status == 200) {
                const json = await res.json()
                favs.value = json.Data
            }
        } catch (error) {
            console.error('Error fetching favourites:', error);
        }
    }

    const fetchTracks = async (id) => {
        try {
            const res = await fetch(`/api/playlists/${id}`)
            if (res.status != 200) {
                throw new Error(`Failed to fetch playlist ${id}'s tracks`)
            }
            const json = await res.json()
            return { res: json.Data, err: null }
        } catch (error) {
            console.error('Error fetching playlist:', error);
            return { res: [], err: error }
        }
    }

    const fetchAll = async () => {
        try {
            loading.value = true
            const res = await fetch('/api/playlists')
            if (res.status != 200) {
                throw new Error('Failed to fetch playlists')
            }
            const json = await res.json()
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
            const res = await fetch('/api/favourites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(track)
            })

            if (res.status != 200) {
                throw new Error('Failed to add track to favourites')
            }

            favs.value.push(track)
        } catch (error) {
            console.error(error)
        }
    }

    const remFav = async (track) => {
        try {
            const res = await fetch('/api/favourites', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(track)
            })

            if (res.status != 200) {
                throw new Error('Failed to remove track from favourites')
            }

            favs.value.splice(favs.value.indexOf(track), 1)
        } catch (error) {
            console.error(error)
        }
    }

    const create = async (name, desc, typ, query) => {
        try {
            const res = await fetch('/api/playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Name: name,
                    Description: desc,
                    Type: typ,
                    Query: query
                })
            })

            const json = await res.json()

            if (res.status != 200) {
                throw new Error('Failed to create playlist')
            }
            const id = json.Id
            if (id === -1) {
                console.error(json)
                throw new Error("Playlist creation failed")
            }
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
            const res = await fetch(`/api/playlists?id=${id}`, {
                method: 'DELETE',
            })

            if (res.status != 200) {
                throw new Error('Failed to DELETE playlist')
            }
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
            const res = await fetch(`/api/playlists/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(track)
            })

            if (res.status != 200) {
                throw new Error('Failed to add track to playlist')
            }

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
            const res = await fetch(`/api/playlists/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(track)
            })

            if (res.status != 200) {
                throw new Error('Failed to remove track from playlist')
            }

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

