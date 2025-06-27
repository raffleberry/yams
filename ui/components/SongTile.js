import { highlight, getArtwork, formatDuration, PAGE } from "../utils.js";
import { modalArtworkUrl } from "../modals.js";
import { ref } from "../vue.js";
import { currentTrack, isPlaying, playPause } from "../Player.js";


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

        const updateFavourite = async () => {
            let method = '';
            if (track.value.IsFavourite) {
                method = 'DELETE'
            } else {
                method = 'POST'
            }
            let url = `/api/playlists/favourites`;


            try {
                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(track.value)
                });

                if (res.status == 200) {
                    track.value.IsFavourite = !track.value.IsFavourite
                } else {
                    console.error("Failed to update favourite: ", res.status)
                }
            } catch (error) {
                console.error('Error upadting favourite:', error);
            }


        }


        return {

            PAGE,

            searchTerm: props.searchTerm,
            play: props.play,
            track: track,
            dontLinkArtists: props.dontLinkArtists,

            cTrack: currentTrack,
            playPause,
            isPlaying,

            updateFavourite: updateFavourite,
            formatDuration,
            highlight,
            getArtwork,
            modalArtworkUrl,
        }
    },
    template: `
    <li class="list-group-item d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
            <img :src="getArtwork(track.Path)" alt="Artwork" class="rounded me-3" style="width: 100px; height: 100px;"
                data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = getArtwork(track.Path)">
            <div>
                <div>
                    <button class="btn btn-info btn-sm" @click="updateFavourite">{{ track.IsFavourite ? '⭐' : '★' }}</button>
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
                 <router-link :to="{ name: PAGE.YEAR, params: { year: track.Year } }">
                    <small v-html="highlight(track.Year, searchTerm)"></small>
                </router-link>
                <br>
                <small>{{ formatDuration(track.Length) }} | {{ track.Bitrate }}KBps </small>
                <br>
                <button :class="['btn', 'btn-sm', cTrack.Path === track.Path ? 'btn-success':'btn-primary']"
                    @click="cTrack.Path !== track.Path ? play(track) : playPause()">{{ cTrack.Path !== track.Path ? 'Play' : ( isPlaying ? 'Pause' : 'Play' ) }}</button>
                <span class="ms-2"></span> {{ track.PlayCount }} plays
        </div>
        </div>
    </li>
    `
}
export { SongsTile };