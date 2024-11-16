import { ref } from "./vue.js";

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
    PLAYLISTS: 'Playlists',
    ALBUMS: 'Albums',
    ARTISTS: 'Artists',
    FOLDERS: 'Folders',
    HISTORY: 'History',
    NOW_PLAYING: 'NowPlaying'
}

export const scrollPositions = ref({ Songs: 0, Playlists: 0, Albums: 0, Artists: 0, Folders: 0 });

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