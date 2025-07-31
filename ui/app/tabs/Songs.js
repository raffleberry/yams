import { currentPlaylist, playTrack } from "../Player.js";
import { SongsTile } from "../components/SongTile.js";
import { updatePageTitle } from "../main.js";
import { modalArtworkUrl } from "../modals.js";
import { PAGE, currentPage, formatDuration, getArtwork, highlight, scrollPositions } from "../utils.js";
import { onBeforeUnmount, onMounted, ref, watch } from "../vue.js";

export const songsPlaylist = ref([]);
var shuffleList = []

var calledOnce = false;
const nextSearchOffset = ref(-1);
const searchTerm = ref('');

const fetchShuffle = async () => {
    let url = `/api/all`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            shuffleList = result.Data
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const fetchAndSetShuffle = async () => {
    await fetchShuffle()
    songsPlaylist.value = shuffleList
}

const searchMusic = async (offset = 0) => {
    let url = `/api/search?query=${searchTerm.value}&offset=${offset}`
    if (offset === 0) {
        songsPlaylist.value = [];
    }
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            songsPlaylist.value = [...songsPlaylist.value, ...result.Data];
            nextSearchOffset.value = result.Next;
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const Songs = {
    components: {
        SongsTile
    },
    setup: () => {

        const play = (track) => {
            if (currentPlaylist.value !== PAGE.SONGS) {
                currentPlaylist.value = PAGE.SONGS
            }
            playTrack(track)
        }

        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.SONGS] = window.scrollY;
        });

        onMounted(() => {
            updatePageTitle(PAGE.SONGS);
            currentPage.value = PAGE.SONGS
            window.scrollTo({ left: 0, top: scrollPositions.value[PAGE.SONGS] || 0, behavior: "auto" })

            if (!calledOnce) {
                calledOnce = true;
                fetchAndSetShuffle()
            }
        });

        watch(searchTerm, (nv, ov) => {
            if (searchTerm.value.length > 1) {
                searchMusic();
            }
            // restore shuffle
            if (ov.length > 1 && nv.length <= 1) {
                songsPlaylist.value = shuffleList
            }
        })

        return {
            songsPlaylist,
            nextSearchOffset,
            searchMusic,
            fetchAndSetShuffle,
            searchTerm,

            PAGE,

            play,
            formatDuration,
            highlight,
            getArtwork,
            modalArtworkUrl,
        }
    },
    template: `
    <div class="my-3 d-flex flex-column">
        <div class="mb-3 d-flex">
            <button class="btn btn-link" @click="searchTerm = ''; fetchAndSetShuffle();">
                <i class="bi bi-shuffle" style="font-size: 1.25rem;"></i>
            </button>
            <input type="text" class="form-control" v-model="searchTerm">
        </div>
        <ul class="list-group">
            <SongsTile v-for="(track, index) in songsPlaylist" :key="index+track.Path" :track="track" :play="play" :searchTerm="searchTerm">
            </SongsTile>
        </ul>
        <button v-if="searchTerm.length > 1 && nextSearchOffset !== -1" @click="(e) => searchMusic(nextSearchOffset)"
        class="btn btn-primary mt-3">Load More</button>
    </div>
    `
}
export { Songs };
