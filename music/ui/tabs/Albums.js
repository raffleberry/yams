import { AlbumListItem } from "../components/AlbumListItem.js";
import { SongsTile } from "../components/SongTile.js";
import { currentPage } from "../main.js";
import { modalArtworkUrl } from "../modals.js";
import { currentPlaylist, playTrack } from "../Player.js";
import { formatDuration, getArtwork, PAGE, scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount, useRoute, ref, onUpdated, watch } from "../vue.js";

export const albumsPlaylist = ref([]);

const allAlbums = ref([]);

const fetchSongs = async (albums) => {

    currentPage.value = `${PAGE.ALBUM} - ${albums}`;

    let url = `/api/albums/${encodeURIComponent(albums)}`;
    console.log(url)
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            albumsPlaylist.value = result.Data
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const fetchAllAlbums = async () => {
    if (allAlbums.value.length > 0) return;
    console.log("FETCHED")
    let url = `/api/albums`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            allAlbums.value = result.Data
        } else {
            console.error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
    }
}

const Albums = {
    components: {
        SongsTile,
        AlbumListItem
    },
    setup: () => {
        const r = useRoute()

        const names = ref("")

        watch(() => r.params.names, (n) => {
            names.value = n
            if (n) {
                fetchSongs(n)
            } else {
                fetchAllAlbums()
            }
        }, { immediate: true })

        const play = (track) => {
            if (currentPlaylist.value !== PAGE.ALBUM) {
                currentPlaylist.value = PAGE.ALBUM
            }
            playTrack(track)
        }

        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.ALBUMS] = window.scrollY;
        });

        onMounted(() => {

            currentPage.value = PAGE.ALBUMS;
            window.scrollTo({ left: 0, top: scrollPositions.value[PAGE.ALBUMS] || 0, behavior: "auto" })
        });

        return {
            names,

            albumsPlaylist,
            allAlbums,

            PAGE,

            play,
            formatDuration,
            getArtwork,
            modalArtworkUrl,
        }
    },
    template: `
    <div v-if="names">
        <div class="my-3 d-flex flex-column">
            <ul class="list-group">
                <SongsTile v-for="(track, index) in albumsPlaylist" :key="index+track.Path+names" :track="track" :play="play" :dontLink="names.split(',').flatMap((x) => x.trim())">
                </SongsTile>
            </ul>
        </div>
    </div>
    <div v-else>
        <div class="my-3 d-flex flex-column">
            <ul class="list-group">
                <AlbumListItem v-for="(item, index) in allAlbums" :key="index+item.Album+item.Year" :item="item">
                </AlbumListItem>
            </ul>
        </div>

    </div>
    `
}
export { Albums };