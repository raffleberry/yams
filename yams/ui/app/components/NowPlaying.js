import { modalArtworkUrl } from "../modals.js";
import { currentTrack, isPlaying, nextTrack, playbackMode, Player, playPause, playTrack, previousTrack, togglePlaybackMode, trackQueue } from "../Player.js";
import { fetchProps } from "../Props.js";
import { formatDuration, getArtwork, isMobile } from "../utils.js";
import { computed, ref } from "../vue.js";

const QueueItem = {
    props: {
        track: {
            type: Object,
            required: true
        },
        index: {
            type: Number,
            required: true
        }
    },

    setup: (props) => {
        const hover = ref(false)
        const playingThis = computed(() => {
            return currentTrack.value.Path === props.track.Path
        })
        return {
            t: props.track,
            hover,
            index: props.index,
            formatDuration,
            playTrack,
            playingThis,
            isPlaying
        }
    },

    template: `
        <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            :class="{ 'active': playingThis , 'playing': playingThis && isPlaying }"
            @mouseover="hover = true" @mouseleave="hover = false"
            >
            <div class="text-truncate">
                {{t.Title}} - {{t.Artists}}
            </div>
            <div class="d-flex">
                <button :class="{ 'invisible': !hover}" type="button" class="btn btn-link"
                    @click="playTrack(index)">
                    <i class="bi bi-play-fill"></i>
                </button>
                <span class="align-self-center">
                    {{formatDuration(t.Length)}}
                </span>
            </div>
    </li>
    `
}

const NowPlaying = {
    components: {
        Player,
        QueueItem
    },
    setup: () => {

        const artworkUrl = computed(() => getArtwork(currentTrack.value.Path))

        return {
            t: currentTrack,

            fetchProps,
            trackQueue,
            togglePlaybackMode,
            playbackMode,
            previousTrack,
            playPause,
            nextTrack,
            isMobile,
            artworkUrl,
            modalArtworkUrl

        }
    },
    template: `
        <div v-if="t.Path" class="container-fluid d-flex h-100 flex-column">
            <div v-if="!isMobile">
                <Player />
            </div>
            <div v-else class="align-self-center">
                <img :src="artworkUrl" alt="Artwork" class="rounded object-fit-cover"
                    style="width: 200px; height: auto;"
                    data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = artworkUrl" />
            </div>
            <div class="overflow-auto w-100">
                <h3 class="m-2">Queue</h3>
                <ul class="list-group">
                    <QueueItem v-for="(track, index) in trackQueue" :key="index+track.Path" :track="track" :index="index"/>
                </ul>
            </div>
        </div>
        <div v-else>
            <div class="d-flex flex-column w-100 h-100 justify-content-center align-items-center">
                <h2>🎸🥁🎹</h2>
            </div>
        </div>
    `
}



export { NowPlaying };
