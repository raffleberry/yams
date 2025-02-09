import { PlaylistListItem } from "../components/PlaylistListItem.js";
import { SongsTile } from "../components/SongTile.js";
import { updatePageTitle } from "../../main.js";
import { currentPlaylist, playTrack } from "../Player.js";
import { PAGE, scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount, ref, useRoute, watch, computed, storeToRefs } from "../vue.js";
import { usePlaylistStore } from "../stores/playlist.js";

export const playlistsPlaylist = ref([]);

const Playlists = {
    components: {
        SongsTile,
        PlaylistListItem
    },
    setup: () => {

        const r = useRoute()

        const store = usePlaylistStore()

        const { favs, playlists } = storeToRefs(store)

        const name = ref("")

        watch(() => r.params.name, (n) => {
            name.value = n
            if (n) {
                updatePageTitle(`${PAGE.PLAYLIST} - ${n}`)
            } else {
                updatePageTitle(PAGE.PLAYLIST)
            }
        }, { immediate: true })

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



        return {
            play,
            name,
            playlistsPlaylist,
            playlists
        }
    },
    template: `
    <div v-if="name">
        <div class="my-3 d-flex flex-column">
            <ul class="list-group">
                <SongsTile v-for="(track, index) in playlistsPlaylist" :key="index+name+track.Path" :track="track" :play="play">
                </SongsTile>
            </ul>
        </div>
    </div>
    <div v-else>
        <div class="my-3 d-flex flex-column">
            <ul class="list-group">
                <PlaylistListItem :id="'favourites'" /> 
                <PlaylistListItem v-for="(item, key) in playlists" :key="key" :id="key" />
            </ul>
        </div>

    </div>
    `
}
export { Playlists };