import { currentTrack } from "../Player.js";
import { fetchProps } from "../Props.js";
import { formatDuration, getArtwork } from "../utils.js";
import { computed } from "../vue.js";

const NowPlaying = {
    components: {

    },
    setup: () => {
        const artworkUrl = computed(() => {
            if (currentTrack.value.Path) {
                return getArtwork(currentTrack.value.Path)
            }
            return '/android-chrome-192x192.png'
        })
        return {
            t: currentTrack,
            artworkUrl,
            formatDuration,
            fetchProps
        }
    },
    template: `
        <div v-if="t.Path" class="col">
            <div class="d-flex" style="height: 160px;">
                <img :src="artworkUrl" alt="Artwork" class="rounded" style="height: 150px; width: auto;"
                    data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = artworkUrl">
                <div class="d-flex flex-column mx-2">
                    <h4 class="fw-bold">{{t.Title}} </h4>
                    <p class="text-body-secondary">{{t.Artists}}</p>
                    <div class="d-flex flex-row-reverse justify-content-start">
                    <button class="btn btn-link" data-bs-toggle="modal" data-bs-target="#modalProps" @click="fetchProps">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    </div>
                </div>
            </div>

            <div class="queue">
                <div class="d-flex mt-1">
                </div>
            </div>
        </div>
        <div v-else>
            <div class="d-flex flex-column w-100 h-100 justify-content-center align-items-center">
                <h2>🪇</h2>
                <h2>🎻</h2>
                <h2>🎸🎤🥁🪈🎹</h2>
                <h2>🎛️</h2>
                <h2>🎺</h2>
            </div>
        </div>
    `
}
export { NowPlaying };
