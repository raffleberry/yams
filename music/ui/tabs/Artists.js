import { ArtistListItem } from "../components/ArtistListItem.js";
import { SongsTile } from "../components/SongTile.js";
import { currentPage } from "../main.js";
import { modalArtworkUrl } from "../modals.js";
import { currentPlaylist, playTrack } from "../Player.js";
import { formatDuration, getArtwork, PAGE, scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount, useRoute, ref, onUpdated, watch } from "../vue.js";

export const artistsPlaylist = ref([]);

const allArtists = ref([]);

const fetchAllArtists = async () => {

    if (allArtists.value.length > 0) return;

    let url = `/api/artists`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            allArtists.value = result.Data
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const fetchSongs = async (artists) => {

    currentPage.value = `${PAGE.ARTIST} - ${artists}`;

    let url = `/api/artists/${encodeURIComponent(artists)}`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            artistsPlaylist.value = result.Data
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const Artists = {
    components: {
        SongsTile,
        ArtistListItem
    },
    setup: () => {
        const r = useRoute()

        const names = ref("")

        watch(() => r.params.names, (n) => {
            names.value = n
            if (n) {
                fetchSongs(n)
            } else {
                fetchAllArtists()
            }
        }, { immediate: true })

        const play = (track) => {
            if (currentPlaylist.value !== PAGE.ARTIST) {
                currentPlaylist.value = PAGE.ARTIST
            }
            playTrack(track)
        }

        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.ARTISTS] = window.scrollY;
        });

        onMounted(() => {
            currentPage.value = PAGE.ARTISTS;
            window.scrollTo({ left: 0, top: scrollPositions.value[PAGE.ARTISTS] || 0, behavior: "auto" })
        });

        return {
            names,

            artistsPlaylist,

            PAGE,
            allArtists,

            play,
            formatDuration,
            getArtwork,
            modalArtworkUrl,
        }
    },
    template: `
    <div v-if="names">
        <div class="my-3 d-flex flex-column">
            <ul class="list-group">
                <SongsTile v-for="(track, index) in artistsPlaylist" :key="index+track.Artists" :track="track" :play="play">
                </SongsTile>
            </ul>
        </div>
    </div>
    <div v-else>
        <div class="my-3 d-flex flex-column">
            <ul class="list-group">
                <ArtistListItem v-for="(item, index) in allArtists" :key="index+item.Artists" :item="item" />
            </ul>
        </div>
    </div>
    `
}
export { Artists };