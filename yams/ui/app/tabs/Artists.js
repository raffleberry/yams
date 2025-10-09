import { ArtistListItem } from "../components/ArtistListItem.js";
import { SongsTile } from "../components/SongTile.js";
import { updatePageTitle } from "../main.js";
import { modalArtworkUrl } from "../modals.js";
import { currentTracklistId, playTrack, setTracklist } from "../Player.js";
import { currentPage, formatDuration, getArtwork, PAGE, scrollPositions } from "../utils.js";
import { onBeforeUnmount, onMounted, ref, useRoute, watch } from "../vue.js";

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
                updatePageTitle(`${PAGE.ARTIST} - ${n}`)
                currentPage.value = PAGE.ARTIST
                fetchSongs(n)
            } else {
                updatePageTitle(PAGE.ARTISTS)
                currentPage.value = PAGE.ARTISTS
                fetchAllArtists()
            }
        }, { immediate: true })

        const play = (index) => {
            const id = `ARTISTS_${names.value}`
            if (currentTracklistId.value !== id) {
                currentTracklistId.value = id
                setTracklist(artistsPlaylist.value)
            }
            playTrack(index)
        }

        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.ARTISTS] = window.scrollY;
        });

        onMounted(() => {
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
                <SongsTile v-for="(track, index) in artistsPlaylist" :key="index+names+track.Artists" :track="track" :play="() => play(index)" :dontLinkArtists="names.split(',').flatMap((x) => x.trim())">
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

