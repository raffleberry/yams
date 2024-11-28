import { currentPage } from "../main.js";
import { modalArtworkUrl } from "../modals.js";
import { currentPlaylist, playTrack } from "../Player.js";
import { formatDuration, getArtwork, PAGE, scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount, useRoute, ref } from "../vue.js";

export const artistsPlaylist = ref([]);

const fetchSongs = async (artists) => {
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

    },
    setup: () => {
        const r = useRoute()
        const names = r.params.names

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
            if (names) {
                currentPage.value = `${PAGE.ARTIST} - ${names}`;
            } else {
                currentPage.value = PAGE.ARTISTS;
            }

            if (names) {
                fetchSongs(names)
            }

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
                <li v-for="(track, index) in artistsPlaylist" :key="index"
                    class="list-group-item d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <img :src="getArtwork(track.Path)" alt="Artwork" class="rounded me-3" style="width: 100px; height: 100px;"
                            data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = getArtwork(track.Path)">
                        <div>
                            <div v-html="track.Title"></div>
                            <div v-html="track.Artists"></div>
                            <router-link :to="{ name: PAGE.ALBUM, params: { names: track.Album } }"><small v-html="track.Album"></small></router-link> - <router-link :to="{ name: PAGE.YEAR, params: { year: track.Year } }"><small v-html="track.Year"></small></router-link>
                            <br><small>{{ formatDuration(track.Length) }}</small>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" @click="play(track)">Play</button>
                </li>
            </ul>
        </div>
    </div>
    <div v-else>artists</div>
    `
}
export { Artists };