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


const sLyrics = ref([])
const lyrics = ref("")
const slyricsIndex = ref(-1)
const instrumental = ref(false)
const loading = ref(false)
let loadedLyric = ""

async function loadLyrics(path) {
    msg.value = ""
    slyricsIndex.value = -1
    let statusCode = 200
    try {
        const url = `/api/lyrics?path=${encodeURIComponent(path)}`
        const res = await fetch(url, {
            method: 'GET',
        });
        statusCode = res.status
        if (statusCode === 400) {
            msg.value = "File Not Found / Bad Path"
        } else if (statusCode !== 200) {
            msg.value = `Error loading lyrics - ${statusCode}`
        } else {
            const json = await res.json();
            lyrics.value = json["Lyrics"]
            sLyrics.value = parseLRC(json["SyncedLyrics"])
            instrumental.value = json["Instrumental"] === 1 ? true : false
            if (sLyrics.value.length === 0 && lyrics.value.length === 0) {
                msg.value = "No lyrics found"
            }
            loadedLyric = currentTrack.value.Path
        }
        // TODO render LRC
    } catch (error) {
        console.error(error)
        msg.value = `Error loading lyrics - ${statusCode}`
    } finally {
        loading.value = false
    }
}


const fetchAndSetLyrics = () => {
    loading.value = true;
    if (currentTrack.value.Path === "") return
    if (currentTrack.value.Path === loadedLyric) {
        return
    }
    loadLyrics(currentTrack.value.Path)
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
            return index >= 0 && index < sLyrics.value.length
        }

        audio.addEventListener("timeupdate", () => {
            if (msg.value) return
            const curIndex = sLyrics.value.findLastIndex(line => line.time <= audio.currentTime)
            slyricsIndex.value = curIndex
        })

        return {
            lyricIndex: slyricsIndex,
            currentTrack,
            msg,
            sLyrics,
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
                &nbsp{{ ok(lyricIndex-1) ? sLyrics[lyricIndex-1].lyric : " " }}
            </div>
            <div class="text-center"
                style="font-size: 1.25em; font-weight: bold">
                &nbsp{{ ok(lyricIndex) ? sLyrics[lyricIndex].lyric : " " }}
            </div>
            <div class="text-center text-secondary" >
                &nbsp{{ ok(lyricIndex+1) ? sLyrics[lyricIndex+1].lyric : " " }}
            </div>
        </div>
    </div>
    `
}



export { Lrc };
