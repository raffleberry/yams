import { audio, currentTrack } from "../Player.js";
import { onMounted, ref, watch } from "../vue.js";

const msg = ref("")

function parseLRC(lrc) {
    return lrc.split("\n").map(line => {
        const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
        if (!match) return null;
        const [, min, sec, lyric] = match;
        return { time: parseFloat(min) * 60 + parseFloat(sec), lyric: lyric.trim() };
    }).filter(Boolean);
}

async function loadLyrics(track) {
    try {
        const searchParams = {
            track_name: track.Title,
            artist_name: track.Artists,
            duration: track.Length
        }
        const queryString = new URLSearchParams(searchParams).toString();
        const url = `/api/lyrics?${queryString}`
        const res = await fetch(url, {
            method: 'GET',
        });
        const text = await res.text();
        return parseLRC(text);
    } catch (error) {
        console.error(error)
        msg.value = "Error loading lyrics"
    }
}

const lyrics = ref([])
const lyricIndex = ref(-1)
const loading = ref(false)
let loadedLyric = ""

const fetchAndSetLyrics = () => {
    loading.value = true;
    if (currentTrack.value.Path === "") return
    if (currentTrack.value.Path === loadedLyric) {
        loading.value = false
        return
    }
    (async () => {
        msg.value = ""
        lyricIndex.value = -1
        lyrics.value = await loadLyrics(currentTrack.value)
        if (lyrics.value.length === 0 && msg.value.length === 0) {
            msg.value = "No lyrics found"
        }
        loadedLyric = currentTrack.value.Path
        loading.value = false
    })()
}

const Lrc = {
    props: {
    },

    setup: (props) => {
        watch(currentTrack, () => {
            fetchAndSetLyrics()
        })

        onMounted(() => {
            fetchAndSetLyrics()
        })

        const ok = (index) => {
            return index >= 0 && index < lyrics.value.length
        }

        audio.addEventListener("timeupdate", () => {
            if (msg.value) return
            const curIndex = lyrics.value.findLastIndex(line => line.time <= audio.currentTime)
            lyricIndex.value = curIndex
        })

        return {
            lyricIndex,
            currentTrack,
            msg,
            lyrics,
            loading,
            ok
        }
    },

    template: `
    <div class="d-flex justify-content-center" v-if="currentTrack.Path" style="min-height: 5em">
        <div v-if="loading" class="spinner-grow align-self-center" style="width: 3rem; height: 3rem;" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
        <div v-else-if="msg" class="align-self-center text-warning" > {{ msg }} </div>
        <div v-else class="align-self-center">
            <div class="text-center text-secondary">
                &nbsp{{ ok(lyricIndex-1) ? lyrics[lyricIndex-1].lyric : " " }}
            </div>
            <div class="text-center"
                style="font-size: 1.25em; font-weight: bold">
                &nbsp{{ ok(lyricIndex) ? lyrics[lyricIndex].lyric : " " }}
            </div>
            <div class="text-center text-secondary" >
                &nbsp{{ ok(lyricIndex+1) ? lyrics[lyricIndex+1].lyric : " " }}
            </div>
        </div>
    </div>
    `
}



export { Lrc };
