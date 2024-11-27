import { ref, onMounted, watch, onBeforeUnmount } from "../vue.js";
import { highlight, getArtwork, formatDuration, scrollPositions, PAGE } from "../utils.js";
import { currentPlaylist, playTrack } from "../Player.js";
import { modalArtworkUrl } from "../modals.js";
import { currentPage } from "../main.js";

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
            currentPage.value = PAGE.SONGS;
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
            <li v-for="(track, index) in songsPlaylist" :key="index"
                class="list-group-item d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <img :src="getArtwork(track.Path)" alt="Artwork" class="rounded me-3" style="width: 100px; height: 100px;"
                        data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = getArtwork(track.Path)">
                    <div>
                        <div v-html="highlight(track.Title, searchTerm)"></div>
                        <router-link :to="{ name: PAGE.ARTIST, params: { names: track.Artists } }">
                            <div v-html="highlight(track.Artists, searchTerm)"></div>
                        </router-link>
                        <router-link :to="{ name: PAGE.ALBUM, params: { names: track.Album } }"><small v-html="highlight(track.Album, searchTerm)"></small></router-link> - <router-link :to="{ name: PAGE.YEAR, params: { year: track.Year } }"><small v-html="highlight(track.Year, searchTerm)"></small></router-link>
                        <br><small>{{ formatDuration(track.Length) }}</small>
                    </div>
                </div>
                <button class="btn btn-primary btn-sm" @click="play(track)">Play</button>
            </li>
        </ul>
        <button v-if="searchTerm.length > 1 && nextSearchOffset !== -1" @click="(e) => searchMusic(nextSearchOffset)"
        class="btn btn-primary mt-3">Load More</button>
    </div>
    `
}
export { Songs };