import { AlbumListItem } from "../components/AlbumListItem.js";
import { PlaylistListItem } from "../components/PlaylistListItem.js";
import { SongsTile } from "../components/SongTile.js";
import { updatePageTitle } from "../main.js";
import { currentPlaylist, playTrack } from "../Player.js";
import { PAGE, scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount, ref, useRoute, watch } from "../vue.js";

export const playlistsPlaylist = ref([]);

const allPlaylists = ref([]);

const fetchSongs = async (playlist) => {

    let url = `/api/playlists/${encodeURIComponent(playlist)}`;

    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            playlistsPlaylist.value = result.Data
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const fetchAllPlaylists = async () => {
    if (allPlaylists.value.length > 0) return;

    let url = `/api/playlists`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            allPlaylists.value = result.Data
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const Playlists = {
    components: {
        SongsTile,
        PlaylistListItem

    },
    setup: () => {

        const r = useRoute()

        const name = ref("")

        watch(() => r.params.name, (n) => {
            name.value = n
            if (n) {
                updatePageTitle(`${PAGE.PLAYLIST} - ${n}`)
                fetchSongs(n)
            } else {
                updatePageTitle(PAGE.PLAYLIST)
                fetchAllPlaylists()
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
            name,
            playlistsPlaylist,
            allPlaylists
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
                <PlaylistListItem v-for="(item, index) in allPlaylists" :key="index+item.Name" :item="item">
                </PlaylistListItem>
            </ul>
        </div>

    </div>
    `
}
export { Playlists };