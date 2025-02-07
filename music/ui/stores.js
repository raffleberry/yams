import { computed, defineStore, ref } from "./vue.js";

const playlistStore = ref({
    favourites: []
})

const favs = computed(() => {
    return {
        Id: "favourites",
        Name: "Favourites",
        Description: "Favourites",
        Tracks: playlists.value.favourites,
        Count: playlists.value.favourites.length
    }
})

const fetchFavourites = () => {
    (async () => {
        try {
            const res = await fetch('/api/favourites')
            if (res.status == 200) {
                const json = await res.json()
                playlists.value.favourites = json.Data
            }
            console.log("Hello", playlists.value.favourites)
            console.log("FETCHED")
        } catch (error) {
            console.error('Error fetching favourites:', error);
        }
    })()
}

const fetchPlaylists = async () => {
    try {
        const res = await fetch('/api/playlists')
        if (res.status == 200) {
            playlists.value = await res.json()
        }
    } catch (error) {
        console.error('Error fetching playlists:', error);
    }
}

const favAdd = (track) => {
    try {
        fetch('/api/favourites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(track)
        })
        playlists.value.favourites.push(track)
    } catch (error) {
        console.error(error)
    }
}

const favRem = (track) => {
    try {
        fetch(urlFav, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(track)
        })
        playlists.value.favourites.splice(playlists.value.favourites.indexOf(track), 1)
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
        if (!playlists.value[id]) {
            playlists.value[id] = []
        }
        playlists.value[id].push(track)
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
        favs, favAdd, favRem

    },

}
