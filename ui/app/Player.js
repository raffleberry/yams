import { modalArtworkUrl } from "./modals.js";
import { fetchProps } from "./Props.js";
import { albumsPlaylist } from "./tabs/Albums.js";
import { artistsPlaylist } from "./tabs/Artists.js";
import { historyPlaylist } from "./tabs/History.js";
import { playlistsPlaylist } from "./tabs/Playlists.js";
import { songsPlaylist } from "./tabs/Songs.js";
import { formatDuration, getArtwork, getSrc, PAGE, setMediaSessionMetadata } from "./utils.js";
import { computed, ref, useTemplateRef, watch } from "./vue.js";

export const currentPlaylist = ref(PAGE.SONGS);

function wc(playlist) {
  return computed(() => playlist.value.filter(t => t.Path))
}
const playlistMap = {
  [PAGE.SONGS]: wc(songsPlaylist),
  [PAGE.HISTORY]: wc(historyPlaylist),
  [PAGE.ARTIST]: wc(artistsPlaylist),
  [PAGE.ALBUM]: wc(albumsPlaylist),
  [PAGE.PLAYLIST]: wc(playlistsPlaylist),
}

const playlist = () => {
  return playlistMap[currentPlaylist.value]
}


const audio = new Audio()

/* playback history logic ::: START*/
var lastTime = 0
var playbackTime = 0
var playbackPosted = false
var playbackPosting = false
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

export const playTrack = async (track) => {
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
  let currentIndex = (playlist().value.findIndex(t => t.Title === currentTrack.value.Title && t.Artists === currentTrack.value.Artists));
  let newIndex = 0
  if (currentIndex !== -1) {
    newIndex = currentIndex - 1
    if (newIndex < 0) {
      newIndex = 0
    }
  }
  playTrack(playlist().value[newIndex]);
}

export const nextTrack = () => {
  let currentIndex = (playlist().value.findIndex(t => t.Title === currentTrack.value.Title && t.Artists === currentTrack.value.Artists));
  let newIndex = 0
  if (currentIndex !== -1) {
    newIndex = (currentIndex + 1) % playlist().value.length
  }
  playTrack(playlist().value[newIndex]);
};

export const playPause = () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
};



const playbackMode = ref('autoPlayNext');

export const togglePlaybackMode = () => {
  playbackMode.value = playbackMode.value === 'autoPlayNext' ? 'repeatCurrent' : 'autoPlayNext';
};

const Player = {
  props: {

  },
  setup() {

    const currentTime = ref(0);

    const currentVolume = ref(0.5);

    audio.volume = currentVolume.value

    const waveformDiv = useTemplateRef("waveform");
    const waveformCanvas = useTemplateRef("waveformCanvas");

    let waveformData = []; // stores precomputed peaks
    let waveformCtx = null;

    watch(audioBlob, generateWaveform)

    async function generateWaveform() {
      waveformData = []
      const canvas = waveformCanvas.value;
      const ctx = canvas.getContext("2d");

      waveformDiv.value.style.display = "block";
      const cssWidth = waveformDiv.value.clientWidth;
      const cssHeight = 70;
      const scale = window.devicePixelRatio || 1;
      canvas.width = cssWidth * scale;
      canvas.height = cssHeight * scale;
      canvas.style.height = cssHeight + "px";

      ctx.scale(scale, scale);
      const blob = audioBlob.value;
      const arrayBuffer = await blob.arrayBuffer()
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const rawData = audioBuffer.getChannelData(0); // left channel
      const samples = cssWidth; // number of peaks we want
      const blockSize = Math.floor(rawData.length / samples);

      const filteredData = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[(i * blockSize) + j]);
        }
        filteredData.push(sum / blockSize);
      }

      const max = Math.max(...filteredData);
      waveformData = filteredData.map(n => n / max);

      drawWaveform();
    }

    // Draw waveform background
    function drawWaveform(progressRatio = 0) {
      const canvas = waveformCanvas.value;
      if (!canvas || !waveformData) return;
      const ctx = canvas.getContext("2d");

      const cssWidth = canvas.clientWidth;
      const cssHeight = parseInt(canvas.style.height);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const middle = cssHeight / 2;
      const barWidth = 1; // exactly one pixel wide

      waveformData.forEach((val, i) => {
        const barHeight = val * cssHeight;
        ctx.fillStyle = i / waveformData.length < progressRatio ? "rgba(13, 110, 253, 1)" : "whitesmoke";
        ctx.fillRect(i * barWidth, middle - barHeight / 2, barWidth, barHeight);
      });
    }

    function seek(event) {
      const rect = waveformCanvas.value.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const width = waveformCanvas.value.clientWidth;
      const seekTime = (clickX / width) * currentTrack.value.Length;
      audio.currentTime = seekTime;
      currentTime.value = Math.floor(seekTime);
    }

    const changeVolume = (event) => {
      const volBar = event.currentTarget;
      const clickX = event.offsetX;
      const width = volBar.clientWidth;
      const newVolume = (clickX / width);
      audio.volume = newVolume;
      currentVolume.value = newVolume;
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
        playTrack(currentTrack.value);
      }
    };


    return {
      getArtwork,
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
      changeVolume,
      modalArtworkUrl,
      fetchProps
    }

  },

  template: `
    <div class="fixed-bottom d-flex bg-dark text-white p-3 d-flex align-items-center">
      <div class="me-3">
        <img :src="getArtwork(currentTrack.Path)" alt="Artwork" class="rounded" style="width: 150px; height: 150px;"
          data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = getArtwork(currentTrack.Path)">
      </div>
      <div class="mt-2 flex-grow-1">
        <div class="flex-grow-1">
          <div><strong>{{ currentTrack.Title || 'No Track Selected' }}</strong> - <em>{{ currentTrack.Artists }}</em>
          </div>
          <div ref="waveform" v-show="audioBlob">
            <canvas ref="waveformCanvas" 
              class="mt-2" 
              style="width: 100%; cursor: pointer;" 
              @click="seek">
            </canvas>
          </div>
          <div class="d-flex justify-content-between">
            <small>{{ formatDuration(currentTime) }}</small>
            <small>{{ formatDuration(currentTrack.Length) }}</small>
          </div>
        </div>
        <div class="d-flex flex-wrap align-items-center justify-content-center ms-3" style="flex: 0 0 auto; gap: 10px;">
          <div>
            <button class="btn btn-dark btn-lg"
              data-bs-toggle="modal" data-bs-target="#modalProps" @click="fetchProps">
              <i class="bi bi-three-dots"></i>
            </button>
            <button class="btn btn-dark btn-lg" @click="togglePlaybackMode">
              <i class="bi"
                :class="{'bi-repeat': playbackMode === 'autoPlayNext', 'bi-repeat-1': playbackMode !== 'autoPlayNext' }"></i>
            </button>
          </div>
          <div>
            <button class="btn btn-dark btn-lg" @click="previousTrack">
              <i class="bi bi-caret-left"></i>
            </button>
            <button class="btn btn-dark btn-lg" @click="playPause">
              <i class="bi" :class="{ 'bi-play': !playing, 'bi-pause': playing }"></i>
            </button>
            <button class="btn btn-dark btn-lg" @click="nextTrack">
              <i class="bi bi-caret-right"></i>
            </button>
          </div>
          <div class="progress" style="width: 150px; height: 5px; cursor: pointer;" @click="changeVolume">
            <div class="progress-bar" :style="{ width: currentVolume * 100 +'%'  }"></div>
          </div>
        </div>
      </div>
    </div>
`
}

export { Player };
