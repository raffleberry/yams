import { updatePageTitle } from "../main.js";
import { modalArtworkUrl } from "../modals.js";
import { currentTracklistId, playTrack, setTracklist } from "../Player.js";
import { currentPage, formatDuration, getArtwork, PAGE, scrollPositions } from "../utils.js";
import { onBeforeUnmount, onMounted, ref } from "../vue.js";

export const historyPlaylist = ref([]);
const nextOffset = ref(-1);

const fetchMusic = async (offset = 0) => {
    let url = `/api/history?offset=${offset}`;

    if (offset === 0) {
        historyPlaylist.value = [];
    }
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            historyPlaylist.value = [...historyPlaylist.value, ...result.Data];
            nextOffset.value = result.Next;
            if (currentTracklistId.value === PAGE.HISTORY) {
                setTracklist(historyPlaylist.value)
            }
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const History = {
    components: {

    },
    setup: () => {
        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.HISTORY] = window.scrollY;
        });

        onMounted(() => {
            updatePageTitle(PAGE.HISTORY);
            currentPage.value = PAGE.HISTORY
            window.scrollTo({ left: 0, top: scrollPositions.value[PAGE.HISTORY] || 0, behavior: "auto" })
            fetchMusic()
        });

        const play = (index) => {
            if (currentTracklistId.value !== PAGE.HISTORY) {
                currentTracklistId.value = PAGE.HISTORY
                setTracklist(historyPlaylist.value)
            }
            playTrack(index)
        }


        return {
            // this component
            nextOffset,
            historyPlaylist,
            fetchMusic,
            play,

            // others
            getArtwork,
            formatDuration,
            modalArtworkUrl
        }

    },
    template: `
    <ul class="list-group">
        <li v-for="(track, index) in historyPlaylist" :key="index"
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center">
                <img :src="getArtwork(track.Path)" alt="Artwork" class="rounded border border-3 me-3" style="width: 100px; height: 100px;"
                    data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = getArtwork(track.Path)">
                <div>
                    <div>{{ (new Date(track.Time)).toLocaleString() }} </div>
                    <div>{{ track.Title }}</div>
                    <div>{{ track.Artists }}</div>
                    <small>{{ track.Album }}</small> - <small>{{ track.Year }}</small>
                    <br><small>{{ formatDuration(track.Length) }}</small>
                </div>
            </div>
            <button class="btn btn-primary btn-sm" @click="play(index)">Play</button>
        </li>
    </ul>
    <button v-if="nextOffset !== -1" @click="(e) => fetchMusic(nextOffset)"
        class="btn btn-primary mt-3">Load More</button>
    `
}
export { History };
