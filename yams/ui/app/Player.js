import { modalArtworkUrl } from "./modals.js";
import { fetchProps } from "./Props.js";
import { formatDuration, getArtwork, getSrc, PAGE, setMediaSessionMetadata } from "./utils.js";
import { computed, ref } from "./vue.js";

export const currentTracklistId = ref("");

/**readonly */
export const trackQueue = ref([])
/**readonly */
export const trackIndex = ref(-1)

export const setTracklist = (trackList) => {
    trackIndex.value = -1
    trackQueue.value = trackList.filter(t => t.Path)
}


const audio = new Audio()

/* playback history logic ::: START*/
let lastTime = 0
let playbackTime = 0
let playbackPosted = false
let playbackPosting = false
const playbackTimeThreshold = 30


const setupPlaybackTimeCapture = () => {
    lastTime = 0
    playbackTime = 0
    playbackPosted = false
    playbackPosting = false
}

const postPlaybackHistory = async (track) => {
    if (playbackPosted) {
        console.log("Bad code :|")
        // precautionary
        return
    }
    playbackPosting = true
    let url = '/api/history'
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(track)
        })

        const resJson = await res.json()
        console.log("History recorded: ", resJson)
        playbackPosted = true
    } catch (error) {
        console.error('Error posting playback history:', error)
    }
    playbackPosting = false
}

/* playback history logic ::: END*/



const playing = ref(false);

export const isPlaying = computed(() => {
    return playing.value
})

export const currentTrack = ref({
    Path: "",
    Title: "",
    Size: 0,
    Artists: "",
    Album: "",
    Genre: "",
    Year: "",
    Track: 0,
    Length: 0,
    Bitrate: 0,
    Samplerate: 0,
    Channels: 0,
    Props: ""
});

const audioBlob = ref(null)

export const playTrack = async (index, track) => {
    if (!track) {
        track = trackQueue.value[index]
        trackIndex.value = index
    }
    currentTrack.value = track
    setupPlaybackTimeCapture()
    const url = getSrc(track.Path)
    try {
        URL.revokeObjectURL(audio.src)
        const res = await fetch(url)
        const blob = await res.blob()
        audioBlob.value = blob
        audio.src = URL.createObjectURL(blob)
        setMediaSessionMetadata(track)
    } catch (error) {
        console.log("Error setting audio source: ", error)
    }
};

export const previousTrack = () => {
    let currentIndex = trackIndex.value;
    let newIndex = 0
    if (currentIndex !== -1) {
        newIndex = currentIndex - 1
        if (newIndex < 0) {
            newIndex = 0
        }
    }
    playTrack(newIndex);
}

export const nextTrack = () => {
    let currentIndex = trackIndex.value;
    let newIndex = 0
    if (currentIndex !== -1) {
        newIndex = (currentIndex + 1) % trackQueue.value.length
    }
    playTrack(newIndex);
};

export const playPause = () => {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
};



export const playbackMode = ref('autoPlayNext');

export const togglePlaybackMode = () => {
    playbackMode.value = playbackMode.value === 'autoPlayNext' ? 'repeatCurrent' : 'autoPlayNext';
};

export const currentVolume = ref(1);

const Player = {
    props: {

    },
    setup() {

        const currentTime = ref(0);

        const currentVolume = ref(0.5);

        audio.volume = currentVolume.value

        const seek = (event) => {
            const progressBar = event.currentTarget;
            const clickX = event.offsetX;
            const width = progressBar.clientWidth;
            const seekTime = (clickX / width) * currentTrack.value.Length;
            audio.currentTime = seekTime;
            currentTime.value = Math.floor(seekTime);
        };


        const progress = computed(() => (currentTime.value / currentTrack.value.Length) * 100);

        audio.onloadeddata = () => {
            if (audio.paused) {
                audio.play()
            }
        }
        audio.ontimeupdate = () => {
            const c = audio.currentTime;
            currentTime.value = Math.floor(c);
            if (playing.value) {
                let diff = c - lastTime
                if (diff >= 0 && diff < 2) {
                    playbackTime += diff;
                }
                if (!playbackPosted && playbackTime >= playbackTimeThreshold && !playbackPosting) {
                    postPlaybackHistory(currentTrack.value)
                }
            }
            lastTime = c;

            if (waveformData.length > 0 && audio.duration > 0) {
                const ratio = audio.currentTime / audio.duration;
                drawWaveform(ratio);
            }
        }

        audio.onplay = () => {
            playing.value = true;
            lastTime = audio.currentTime;
        }

        audio.onpause = () => {
            playbackTime += audio.currentTime - lastTime;
            playing.value = false;
        }

        audio.onended = () => {
            if (playbackMode.value === 'autoPlayNext') {
                nextTrack();
            } else if (playbackMode.value === 'repeatCurrent') {
                audio.currentTime = 0;
                playTrack(-69, currentTrack.value);
            }
        };

        const artworkUrl = computed(() => {
            if (currentTrack.value.Path) {
                return getArtwork(currentTrack.value.Path)
            }
            return '/android-chrome-192x192.png'
        })

        return {
            PAGE,
            audioBlob,
            currentTrack,
            currentTime,
            playing,
            playbackMode,
            currentVolume,
            progress,
            formatDuration,
            seek,
            playPause,
            nextTrack,
            previousTrack,
            togglePlaybackMode,
            artworkUrl,
            modalArtworkUrl,
            fetchProps
        }

    },

    template: `
    <div class="d-flex m-2" style="height: 200px;">
        <img :src="artworkUrl" alt="Artwork" class="rounded" style="height: 200px; width: auto;"
            data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = artworkUrl" />
        <div class="d-flex flex-column mx-2 flex-grow-1 justify-content-between">
            <h4 class="fw-bold ellipsis-2"> {{currentTrack.Title}} </h4>
            <p class="text-body-secondary ellipsis-2">{{currentTrack.Artists}}</p>

            <div class="d-flex flex-row justify-content-start align-self-center">
                <button class="btn btn-lg" @click="playPause">
                    <i class="bi" :class="{ 'bi-play': !playing, 'bi-pause': playing }" style="font-size: 1.25rem;"></i>
                </button>
                <button class="btn btn-lg" @click="previousTrack">
                    <i class="bi bi-skip-start" style="font-size: 1.25rem;"></i>
                </button>
                <button class="btn btn-lg" @click="nextTrack">
                    <i class="bi bi-skip-end" style="font-size: 1.25rem;"></i>
                </button>
                <button class="btn btn-lg" @click="togglePlaybackMode">
                    <i class="bi" :class="{'bi-repeat': playbackMode === 'autoPlayNext', 'bi-repeat-1': playbackMode !== 'autoPlayNext' }" style="font-size: 1.25rem;"></i>
                </button>
                <button class="btn btn-lg" data-bs-toggle="modal" data-bs-target="#modalProps" @click="fetchProps">
                    <i class="bi bi-three-dots" style="font-size: 1.25rem;"></i>
                </button>
            </div>
            
            <div class="row align-items-center">
                <div class="col-auto text-body-secondary" > {{ formatDuration(currentTime) }} </div>
                <div class="col" >
                    <div class="progress" style="height: 10px; cursor: pointer;" @click="seek">
                        <div class="progress-bar" role="progressbar" :style="{ width: progress + '%'  }"></div>
                    </div>
                </div>
                <div class="col-auto text-body-secondary" > {{ formatDuration(currentTrack.Length) }} </div>
            </div>
        </div>
    </div>
`
}

export { Player };
