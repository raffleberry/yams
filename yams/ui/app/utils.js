import { ref, watch } from "./vue.js";

export const setupMediaSession = (playTrack, pauseTrack, nextTrack, previousTrack) => {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            playTrack();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            pauseTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            nextTrack();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            previousTrack();
        });
    }
};

export const PAGE = {
    SONGS: 'Songs',

    PLAYLIST: 'Playlist',
    PLAYLISTS: 'Playlists',

    ALBUM: 'Album',
    ALBUMS: 'Albums',

    ARTIST: 'Artist',
    ARTISTS: 'Artists',

    FOLDER: 'Folder',
    FOLDERS: 'Folders',

    YEAR: 'Year',
    YEARS: 'Years',

    HISTORY: 'History',

    NOW_PLAYING: 'NowPlaying'
}

export const currentPage = ref(PAGE.SONGS)

export const scrollPositions = ref({ Songs: 0, Playlists: 0, Albums: 0, Artists: 0, Folders: 0, Years: 0, History: 0, NowPlaying: 0 });

export const getArtwork = (path) => {
    return `/api/artwork?path=${encodeURIComponent(path)}`
}

export const getProps = (path) => {
    return `/api/props?path=${encodeURIComponent(path)}`
}


export const getSrc = (path) => {
    return `/api/files?path=${encodeURIComponent(path)}`
}

export const highlight = (text, highlight) => {
    if (!highlight) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    return text.replace(regex, `<strong>$1</strong>`);
}

export const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
};

export const setMediaSessionMetadata = (track) => {
    let artSrc = getArtwork(track.Path)
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.Title,
            artist: track.Artists,
            album: track.Album,
            artwork: [
                { src: artSrc },
            ]
        });
    }
}

export const isSameTrack = (track1, track2) => {
    return track1.Title === track2.Title && track1.Artists === track2.Artists && track1.Album === track2.Album;
}

export const inPlaylist = (playlist, track) => {
    if (playlist.Type !== "LIST") return 0
    return playlist.Tracks.findIndex(t => isSameTrack(t, track)) !== -1
}

const mediaQuery = window.matchMedia('(max-width: 1000px)')
export const isMobile = ref(mediaQuery.matches)
const updateIsMobile = (event) => { isMobile.value = event.matches }
mediaQuery.addEventListener('change', updateIsMobile)

export const theme = ref(localStorage.getItem("theme") || "light");
watch(theme, () => {
    document.documentElement.setAttribute("data-bs-theme", theme.value);
    localStorage.setItem("theme", theme.value);
}, { immediate: true });

export const showNowPlaying = ref(false)
