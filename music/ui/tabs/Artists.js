import { SongsTile } from "../components/SongTile.js";
import { currentPage } from "../main.js";
import { modalArtworkUrl } from "../modals.js";
import { currentPlaylist, playTrack } from "../Player.js";
import { formatDuration, getArtwork, PAGE, scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount, useRoute, ref, onUpdated, watch } from "../vue.js";

export const artistsPlaylist = ref([]);

export const linkArtists = (artists) => {
    let res = ""
    artists.split(',').forEach((artist) => {
        artist = artist.trim()
        res += `<router-link to="{ name: PAGE.ARTIST, params: { names: '${artist}' } }">${artist}</router-link>, `
    })
    console.log(res)

    return res
}

const fetchSongs = async (artists) => {

    currentPage.value = `${PAGE.ARTIST} - ${artists}`;

    let url = `/api/artists/${artists}`;
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
        SongsTile
    },
    setup: () => {
        const r = useRoute()

        const names = ref("")

        watch(() => r.params.names, (n) => {
            names.value = n
            fetchSongs(n)
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
                <SongsTile v-for="(track, index) in artistsPlaylist" :key="index+track.Path+names" :track="track" :play="play" :dontLinkArtists="names.split(',').flatMap((x) => x.trim())">
                </SongsTile>
            </ul>
        </div>
    </div>
    <div v-else>artists</div>
    `
}
export { Artists };