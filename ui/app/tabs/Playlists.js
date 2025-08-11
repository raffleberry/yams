import { SongsTile } from "../components/SongTile.js";
import { updatePageTitle } from "../main.js";
import { currentPlaylist, playTrack } from "../Player.js";
import { usePlaylistStore } from "../stores/playlist.js";
import { currentPage, PAGE, scrollPositions } from "../utils.js";
import { onBeforeUnmount, onMounted, ref, storeToRefs, useRoute, watch } from "../vue.js";

export const playlistsPlaylist = ref([]);

const PlaylistListItem = {
    props: {
        Id: {
            required: true
        },
        Name: {
            required: true
        },
        Description: {
            required: true,
            default: ""
        },
        Count: {
            required: true
        },
        Type: {
            required: true
        },
        onEdit: {
            type: Function,
            required: true
        },
        onDelete: {
            type: Function,
            required: true
        },
    },

    setup: (props) => {
        const hover = ref(false)

        return {
            PAGE,
            hover,
            ...props
        }
    },
    template: `
    <li @mouseover="hover = true" @mouseleave="hover = false" class="list-group-item d-flex justify-content-between align-items-center">
        <div>
            <i style="font-size: 1.5rem; color: cornflowerblue;" :class="{'bi bi-journal': Type === 'LIST', 'bi bi-filetype-sql': Type === 'QUERY'}"></i>
            <router-link :to="{ name: PAGE.PLAYLIST, params: { pid: Id } }"> {{ Name }} </router-link> <span v-if="Description"> • {{ Description }} </span>
        </div>
        <div>
            <button v-show="hover" type="button" class="btn btn-outline-primary m-1" @click="(e) => onEdit(Id)">
                <i class="bi bi-pencil-square"></i>
            </button>
            <button v-show="hover" type="button" class="btn btn-outline-primary m-1" @click="(e) => onDelete(Id)">
                <i class="bi bi-trash-fill"></i>
            </button>
            <button type="button" class="btn btn-info m-1">{{ Count }}</button>
        </div>
    </li>
    `
}

const Playlists = {
    components: {
        SongsTile,
        PlaylistListItem
    },
    setup: () => {

        const r = useRoute()

        const store = usePlaylistStore()

        const { favs, playlists, loading } = storeToRefs(store)

        const name = ref("")


        const setupPid = (pid) => {
            if (pid === "favourites") {
                setupFavourites()
            } else if (playlists.value[pid]) {
                setupPlaylist(pid)
            } else {
                updatePageTitle(`${PAGE.PLAYLIST} - Not Found`)
            }
            currentPage.value = PAGE.PLAYLIST
        }
        const setupFavourites = () => {
            name.value = "favourites"
            updatePageTitle(`${PAGE.PLAYLIST} - favourites`)
            currentPage.value = PAGE.PLAYLIST
            playlistsPlaylist.value = favs.value
        }

        const setupPlaylist = (id) => {
            name.value = playlists.value[id].Name
            updatePageTitle(`${PAGE.PLAYLIST} - ${name.value}`)
            currentPage.value = PAGE.PLAYLIST
            if (!loading.value) {
                playlistsPlaylist.value = playlists.value[id].Tracks
            }
        }

        watch(() => r.params.pid, (pid) => {
            if (pid) {
                setupPid(pid)
            } else {
                name.value = ""
                updatePageTitle(PAGE.PLAYLISTS)
                currentPage.value = PAGE.PLAYLISTS
            }
        }, { immediate: true })

        watch(loading, () => {
            if (!loading.value) {
                if (r.params.pid) {
                    setupPid(r.params.pid)
                }
            }
        })


        const play = (track) => {
            if (currentPlaylist.value !== PAGE.PLAYLIST) {
                currentPlaylist.value = PAGE.PLAYLIST
            }
            playTrack(track)
        }

        onBeforeUnmount(() => {
            scrollPositions.value["Playlists"] = window.scrollY;
        });

        onMounted(() => {
            updatePageTitle(PAGE.PLAYLISTS);
            window.scrollTo({ left: 0, top: scrollPositions.value["Playlists"] || 0, behavior: "auto" })
        });

        const onEdit = (id) => {
            console.log(`Open Edit Modal - ${id}`)
        }

        const onDelete = async (id) => {
            if (window.confirm("Are you sure you want to delete this playlist?")) {
                let data = prompt("Please type DELETE to confirm deletion")
                if (data !== "DELETE") {
                    alert("Deletion cancelled")
                } else {
                    const res = await store.del(id)
                    if (res) {
                        alert(`FAILED TO DELETE: ${res}`)
                    }
                }
            }
        }

        return {
            PAGE,
            play,
            name,
            favs,
            onEdit,
            onDelete,
            playlistsPlaylist,
            playlists
        }
    },
    template: `
    <div v-if="!name">
        <div class="my-3 d-flex flex-column">
            <ul class="list-group">

                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <i style="font-size: 1.5rem; color: cornflowerblue;" class="bi bi-star-fill"></i>
                        <router-link :to="{ name: PAGE.PLAYLIST, params: { pid: 'favourites' } }"> Favourites </router-link> 
                    </div>
                    <button type="button" class="btn btn-info">{{ favs.length }}</button>
                </li>

                <PlaylistListItem
                    v-for="item in playlists"
                    :key="item.Id"
                    :Id="item.Id"
                    :Name="item.Name"
                    :Description="item.Description"
                    :Count="item.Tracks.length"
                    :Type="item.Type"
                    :onEdit="onEdit"
                    :onDelete="onDelete"
                    >
                </PlaylistListItem>
            </ul>
        </div>
    </div>
    <div v-else>
        <div class="my-3 d-flex flex-column">
            <ul class="list-group">
                <SongsTile v-for="(track, index) in playlistsPlaylist"
                    :key="index+name+track.Path"
                    :track="track"
                    :play="play">
                </SongsTile>
            </ul>
        </div>
    </div>
    `
}
export { Playlists };
