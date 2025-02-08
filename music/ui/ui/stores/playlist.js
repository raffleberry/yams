import { computed, ref } from "../vue.js";

const favStore = ref([])
const playlistStore = ref({})

const favs = computed(() => {
    return {
        Id: "favourites",
        Name: "Favourites",
        Description: "Favourites",
        Tracks: favStore.value,
        Count: favStore.value.length
    }
})

const fetchFav = async () => {
    try {
        const res = await fetch('/api/favourites')
        if (res.status == 200) {
            const json = await res.json()
            favStore.value = json.Data
        }
    } catch (error) {
        console.error('Error fetching favourites:', error);
    }
}

const fetchAll = async () => {
    try {
        const res = await fetch(`/api/playlists/${id}`)
        if (res.status == 200) {
            playlistStore.value = await res.json()
        }
    } catch (error) {
        console.error('Error fetching playlists:', error);
    }
}

const addFav = (track) => {
    try {
        fetch('/api/favourites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(track)
        })
        favStore.value.push(track)
    } catch (error) {
        console.error(error)
    }
}

const remFav = (track) => {
    try {
        fetch(urlFav, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(track)
        })
        favStore.value.splice(favStore.value.indexOf(track), 1)
    } catch (error) {
        console.error(error)
    }
}

const add = (id, track) => {
    try {
        fetch(`/api/playlists/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(track)
        })
        if (!playlistStore.value[id]) {
            playlistStore.value[id] = []
        }
        playlistStore.value[id].push(track)
    } catch (error) {
        console.error(error)
    }
}

const rem = (id, track) => {
    try {
        fetch(`/api/playlists/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(track)
        })

    } catch (error) {
        console.error(error)
    }
}

export const store = {
    playlist: {
        add, rem,
        favs, addFav, remFav,

        fetchAll, fetchFav
    },
}
