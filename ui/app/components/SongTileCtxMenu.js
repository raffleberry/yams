


import { selectedTrack } from "../modals/common.js";
import { playTrack, trackIndex, trackQueue } from "../Player.js";
import { usePlaylistStore } from "../stores/playlist.js";
import { computed, onMounted, storeToRefs } from "../vue.js";

const SongsTileCtxMenu = {
    props: {
    },
    components: {

    },
    setup: (props) => {
        let menu = null
        onMounted(() => {
            menu = document.getElementById('songsTileCtxMenu')
        })
        const store = usePlaylistStore()
        const { addFav, remFav } = store
        const { favs, playlists } = storeToRefs(store)

        const isFavourite = computed(() => {
            if (!selectedTrack.value) {
                return false
            }
            if (favs.value.includes(selectedTrack.value)) {
                return true
            }
            return false
        })

        const updateFavourite = () => {
            if (favs.value.includes(selectedTrack.value)) {
                remFav(selectedTrack.value)
            } else {
                addFav(selectedTrack.value)
            }
        }

        const qNext = () => {
            if (trackIndex.value === -1) {
                trackQueue.value.push(selectedTrack.value)
                playTrack(0)
            } else {
                trackQueue.value.splice(trackIndex.value + 1, 0, selectedTrack.value)
            }
        }
        const qTrack = () => {
            trackQueue.value.push(selectedTrack.value)
            if (trackIndex.value === -1) {
                playTrack(0)
            }
        }

        document.addEventListener('click', () => menu.style.display = 'none');

        return {
            qNext,
            qTrack,
            isFavourite,
            updateFavourite,
        }
    },
    template: `
        <ul id="songsTileCtxMenu" class="dropdown-menu show" style="display: none; position: absolute; z-index: 1050;">
            <li>
                <button class="dropdown-item" @click="qNext">
                    Queue Next
                </button>
            </li>
            <li>
                <button class="dropdown-item" @click="qTrack">
                    Queue
                </button>
            </li>
            <li>
                <button class="dropdown-item" @click="updateFavourite">
                    {{isFavourite ? "Unfavorite" : "Favorite"}}
                </button>
            </li>
            <li>
                <button class="dropdown-item" data-bs-toggle="modal" data-bs-target="#ModalAddToPlaylist">
                    Add to Playlist
                </button>
            </li>

        </ul>
    `
}

export { SongsTileCtxMenu };

