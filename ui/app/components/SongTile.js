import { modalArtworkUrl } from "../modals.js";
import { selectedTrack as mTrack } from "../modals/common.js";
import { currentTrack, isPlaying, playPause } from "../Player.js";
import { usePlaylistStore } from "../stores/playlist.js";
import { formatDuration, getArtwork, highlight, inPlaylist, PAGE } from "../utils.js";
import { computed, ref, storeToRefs } from "../vue.js";


const SongsTile = {
    props: {
        track: {
            type: Object,
            required: true
        },
        play: {
            type: Function,
            required: true
        },
        searchTerm: {
            type: String,
            default: ''
        },
        dontLinkArtists: {
            type: Object,
            default: () => []
        },
        dontLinkAlbum: {
            type: Boolean,
            default: false
        },
        dontLinkYear: {
            type: Boolean,
            default: false
        }
    },
    components: {

    },
    setup: (props) => {
        const track = ref(props.track)

        const store = usePlaylistStore()
        const { addFav, remFav } = store
        const { favs, playlists } = storeToRefs(store)

        const isFavourite = computed(() => {
            if (favs.value.includes(track.value)) {
                return true
            }
            return false
        })

        const updateFavourite = () => {
            if (favs.value.includes(track.value)) {
                remFav(track.value)
            } else {
                addFav(track.value)
            }
        }

        const addToPlaylist = (track) => {
            mTrack.value = track
        }

        const inPlaylistCnt = computed(() => {
            let cnt = 0;
            for (const [id, val] of Object.entries(playlists.value)) {
                if (inPlaylist(val, track.value)) {
                    cnt++;
                }
            }

            if (cnt > 0) {
                return `${cnt}`;
            } else {
                return '+';
            }
        })


        return {

            PAGE,

            cTrack: currentTrack,
            playPause,
            isPlaying,

            isFavourite,

            updateFavourite: updateFavourite,
            formatDuration,
            highlight,
            getArtwork,
            addToPlaylist,
            inPlaylistCnt,
            modalArtworkUrl,
        }
    },
    template: `
    <li class="list-group-item d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
            <img :src="getArtwork(track.Path)" alt="Artwork" class="rounded border border-3 me-3" style="width: 100px; height: 100px;"
                data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = getArtwork(track.Path)">
            <div>
                <div>
                    <button class="btn btn-info btn-sm" @click="updateFavourite">{{ isFavourite ? '⭐' : '★' }}</button>
                    <button data-bs-toggle="modal" data-bs-target="#ModalAddToPlaylist" @click="addToPlaylist(track)" class="btn btn-primary btn-sm">{{inPlaylistCnt}}</button>
                    <span class="ms-2"></span>
                    <span v-if="dontLinkAlbum">{{ track.Track }}. </span>
                    <span v-html="highlight(track.Title, searchTerm)"></span>
                </div>
                <div>
                    <span v-for="(artist, index) in track.Artists.split(',')">
                        <component
                            :is="dontLinkArtists.includes(artist.trim()) ? 'span' : 'router-link'"
                            :key="artist"
                            :to="{ name: PAGE.ARTIST, params: { names: artist.trim() } }">
                            <small v-html="highlight(artist, searchTerm)"></small>
                        </component>
                        <span v-if="index !== track.Artists.split(',').length - 1">,</span>
                    </span>
                </div>
                <component
                    :is="dontLinkAlbum ? 'span' : 'router-link'"
                    :to="{ name: PAGE.ALBUM, params: { names: track.Album } }">
                    <small v-html="highlight(track.Album, searchTerm)"></small>
                </component>
                 - 
                 <component
                    :is="track.Year ? 'span' : 'router-link'"
                    :to="{ name: PAGE.YEAR, params: { year: track.Year } }">
                    <small v-html="highlight(track.Year, searchTerm)"></small>
                </component>
                <br>
                <small>{{ formatDuration(track.Length) }} | {{ track.Bitrate }}KBps </small>
                <br>
                <button :class="['btn', 'btn-sm', cTrack.Path === track.Path ? 'btn-success':'btn-primary']"
                    :title="track.Path" :disabled="!track.Path"
                    @click="cTrack.Path !== track.Path ? play(track) : playPause()">{{ cTrack.Path !== track.Path ? 'Play' : ( isPlaying ? 'Pause' : 'Play' ) }}</button>
                <span class="ms-2"></span> {{ track.PlayCount }} plays
        </div>
        </div>
    </li>
    `
}
export { SongsTile };
