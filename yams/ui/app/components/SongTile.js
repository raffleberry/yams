import { modalArtworkUrl } from "../modals.js";
import { selectedTrack as mTrack } from "../modals/common.js";
import { currentTrack, isPlaying, playPause } from "../Player.js";
import { usePlaylistStore } from "../stores/playlist.js";
import { formatDuration, getArtwork, highlight, inPlaylist, PAGE } from "../utils.js";
import { computed, onMounted, ref, storeToRefs, useTemplateRef } from "../vue.js";

const { computePosition, offset, flip, shift } = window.FloatingUIDOM;


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

        const selectTrack = (track) => {
            mTrack.value = track
        }

        const inPlaylistCnt = computed(() => {
            let cnt = 0;
            for (const [id, val] of Object.entries(playlists.value)) {
                if (inPlaylist(val, track.value)) {
                    cnt++;
                }
            }
            return cnt
        })

        const songTileRef = useTemplateRef("songTile")
        const menu = document.querySelector('#songsTileCtxMenu')
        let touchTimeout;

        const showCtxMenu = (x, y) => {
            selectTrack(track.value)
            const virtualElement = {
                getBoundingClientRect: () => ({
                    x, y, left: x, top: y, right: x, bottom: y, width: 0, height: 0
                })
            };
            computePosition(virtualElement, menu, {
                placement: 'right-start',
                middleware: [offset(4), flip(), shift()]
            }).then(({ x, y }) => {
                Object.assign(menu.style, {
                    left: `${x}px`,
                    top: `${y}px`,
                    display: 'block'
                });
            });
        }

        onMounted(() => {
            songTileRef.value.addEventListener('contextmenu', (e) => {
                if (songTileRef.value.contains(e.target)) {
                    e.preventDefault();
                    showCtxMenu(e.clientX, e.clientY);
                } else {
                    menu.style.display = 'none';
                }
            });

            songTileRef.value.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    touchTimeout = setTimeout(() => {
                        showCtxMenu(touch.clientX, touch.clientY);
                    }, 600);
                }
            });
            songTileRef.value.addEventListener('touchend', () => clearTimeout(touchTimeout));
            songTileRef.value.addEventListener('touchmove', () => clearTimeout(touchTimeout));
        })


        return {

            PAGE,

            cTrack: currentTrack,
            playPause,
            isPlaying,

            isFavourite,


            updateFavourite,
            formatDuration,
            highlight,
            getArtwork,
            selectTrack,
            inPlaylistCnt,
            modalArtworkUrl,
        }
    },
    template: `
    <li ref="songTile" class="list-group-item d-flex justify-content-between align-items-start list-group-item-action"
        >
        <div class="d-flex align-items-center">
            <img :src="getArtwork(track.Path)" alt="Artwork" class="rounded border border-3 me-3" style="width: 100px; height: 100px;"
                data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = getArtwork(track.Path)">
            <div>
                <div>
                    <span class="me-2" v-if="isFavourite">⭐</span>
                    <span v-if="dontLinkAlbum">{{ track.Track }}. </span>
                    <span v-html="highlight(track.Title, searchTerm)"></span>
                    <button
                        data-bs-toggle="modal" data-bs-target="#ModalAddToPlaylist" @click="selectTrack(track)"
                        class="btn badge text-bg-primary rounded-pill ms-2" v-if="inPlaylistCnt">
                        {{inPlaylistCnt}}
                    </button>
                </div>
                
                <div>
                    <span v-for="(artist, index) in track.Artists.split(',')">
                        <component
                            :is="dontLinkArtists.includes(artist.trim()) ? 'span' : 'router-link'"
                            :key="artist"
                            :class="{ 'router-text-link': !dontLinkArtists.includes(artist.trim()) }"
                            :to="{ name: PAGE.ARTIST, params: { names: artist.trim() } }">
                            <small v-html="highlight(artist, searchTerm)"></small>
                        </component>
                        <span v-if="index !== track.Artists.split(',').length - 1">,</span>
                    </span>
                </div>

                <component
                    :is="dontLinkAlbum ? 'span' : 'router-link'"
                    :class="{ 'router-text-link': !dontLinkAlbum }"
                    :to="{ name: PAGE.ALBUM, params: { names: track.Album } }">
                    <small v-html="highlight(track.Album, searchTerm)"></small>
                </component>
                 - 
                 <component
                    :is="track.Year ? 'span' : 'router-link'"
                    :class="{ 'router-text-link': !track.Year }"
                    :to="{ name: PAGE.YEAR, params: { year: track.Year } }">
                    <small v-html="highlight(track.Year, searchTerm)"></small>
                </component>
                <br>

                <small>{{ formatDuration(track.Length) }} | {{ track.Bitrate }}KBps </small>
                <br>

                <button :class="['btn', 'btn-sm', cTrack.Path === track.Path ? 'btn-success':'btn-primary']"
                    :title="track.Path" :disabled="!track.Path"
                    @click="cTrack.Path !== track.Path ? play() : playPause()">
                    {{ cTrack.Path !== track.Path ? 'Play' : ( isPlaying ? 'Pause' : 'Play' ) }}
                </button>

                <span class="ms-2"></span> {{ track.PlayCount }} plays
            </div>
        </div>
    </li>
    `
}
export { SongsTile };
