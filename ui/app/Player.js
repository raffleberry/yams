import { modalArtworkUrl } from "./modals.js";
import { fetchProps } from "./Props.js";
import { albumsPlaylist } from "./tabs/Albums.js";
import { artistsPlaylist } from "./tabs/Artists.js";
import { historyPlaylist } from "./tabs/History.js";
import { playlistsPlaylist } from "./tabs/Playlists.js";
import { songsPlaylist } from "./tabs/Songs.js";
import { formatDuration, getArtwork, getSrc, PAGE, setMediaSessionMetadata } from "./utils.js";
import { computed, ref } from "./vue.js";

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


const startPlaybackTimeCapture = () => {
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



const currentTime = ref(0);

const playing = ref(false);

const currentVolume = ref(0.5);

audio.volume = currentVolume.value

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


export const playTrack = (track) => {
  currentTrack.value = track
  startPlaybackTimeCapture()
  audio.src = getSrc(track.Path)
  setMediaSessionMetadata(track)
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


const changeVolume = (event) => {
  const volBar = event.currentTarget;
  const clickX = event.offsetX;
  const width = volBar.clientWidth;
  const newVolume = (clickX / width);
  audio.volume = newVolume;
  currentVolume.value = newVolume;
};


export const playPause = () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
};

const seek = (event) => {
  const progressBar = event.currentTarget;
  const clickX = event.offsetX;
  const width = progressBar.clientWidth;
  const seekTime = (clickX / width) * currentTrack.value.Length;
  audio.currentTime = seekTime;
  currentTime.value = Math.floor(seekTime);
};

const progress = computed(() => (currentTime.value / currentTrack.value.Length) * 100);

const playbackMode = ref('autoPlayNext');

export const togglePlaybackMode = () => {
  playbackMode.value = playbackMode.value === 'autoPlayNext' ? 'repeatCurrent' : 'autoPlayNext';
};

const Player = {
  props: {

  },
  setup() {

    return {
      getArtwork,
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
          <div class="progress mt-2" style="height: 5px; cursor: pointer;" @click="seek">
            <div class="progress-bar" role="progressbar" :style="{ width: progress + '%'  }"></div>
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
              <i class="bi bi-rewind"></i>
            </button>
            <button class="btn btn-dark btn-lg" @click="playPause">
              <i class="bi" :class="{ 'bi-play': !playing, 'bi-pause': playing }"></i>
            </button>
            <button class="btn btn-dark btn-lg" @click="nextTrack">
              <i class="bi bi-fast-forward"></i>
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
