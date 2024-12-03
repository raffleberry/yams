import { highlight, getArtwork, formatDuration, PAGE } from "../utils.js";
import { modalArtworkUrl } from "../modals.js";

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

        return {

            PAGE,

            searchTerm: props.searchTerm,
            play: props.play,
            track: props.track,
            dontLinkArtists: props.dontLinkArtists,


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
                <div v-html="highlight(track.Title, searchTerm)"></div>
                <div>
                    <component
                        v-for="(artist, index) in track.Artists.split(',')"
                        :is="dontLinkArtists.includes(artist.trim()) ? 'span' : 'router-link'"
                        :key="artist"
                        :to="{ name: PAGE.ARTIST, params: { names: artist.trim() } }">
                        {{index !== 0 ?", ":""}}
                        <small v-html="highlight(artist, searchTerm)"></small>
                    </component>
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
                <br><small>{{ formatDuration(track.Length) }}</small>
            </div>
        </div>
        <button class="btn btn-primary btn-sm" @click="play(track)">Play</button>
    </li>
    `
}
export { SongsTile };