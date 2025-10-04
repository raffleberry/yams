import { AlbumListItem } from "../components/AlbumListItem.js";
import { SongsTile } from "../components/SongTile.js";
import { updatePageTitle } from "../main.js";
import { modalArtworkUrl } from "../modals.js";
import { currentTracklistId, playTrack, setTracklist } from "../Player.js";
import { currentPage, formatDuration, getArtwork, PAGE, scrollPositions } from "../utils.js";
import { onBeforeUnmount, onMounted, ref, useRoute, watch } from "../vue.js";

export const albumsPlaylist = ref([]);

const allAlbums = ref([]);
const nextOffset = ref(0);


const fetchSongs = async (albums) => {

    let url = `/api/albums/${encodeURIComponent(albums)}`;

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

const fetchAlbums = async () => {
    let url = `/api/albums?offset=${nextOffset.value}`;
    try {
        const response = await fetch(url);
        const result = await response.json();
        if (result) {
            allAlbums.value = [...allAlbums.value, ...result.Data]
            nextOffset.value = result.Next
            return null
        } else {
            throw new Error('Error server sent bad result:', result);
        }
    } catch (error) {
        console.error('Error fetching music data:', error);
        return error;
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
                updatePageTitle(`${PAGE.ALBUM} - ${n}`)
                currentPage.value = PAGE.ALBUM
                fetchSongs(n)
            } else {
                updatePageTitle(PAGE.ALBUMS)
                currentPage.value = PAGE.ALBUMS
                fetchAlbums()
            }
        }, { immediate: true })

        const play = (index) => {
            const id = `ALBUM_${names.value}`
            if (currentTracklistId.value !== id) {
                currentTracklistId.value = id
                setTracklist(albumsPlaylist.value)
            }
            playTrack(index)
        }

        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.ALBUMS] = window.scrollY;
        });

        onMounted(() => {
            window.scrollTo({ left: 0, top: scrollPositions.value[PAGE.ALBUMS] || 0, behavior: "auto" })
        });

        return {
            names,

            albumsPlaylist,
            allAlbums,

            PAGE,

            fetchAlbums,

            play,
            formatDuration,
            getArtwork,
            modalArtworkUrl,
        }
    },
    template: `
    <div v-if="names">
        <h1>{{ names }} </h1>
        <p>
            <span>{{ albumsPlaylist.length }} song(s)</span>
            <span v-if="albumsPlaylist.length > 0" > • {{ albumsPlaylist[0].Year }}</span>
        </p>

        <div class="my-3 d-flex flex-column">
            <ul class="list-group">
                <SongsTile v-for="(track, index) in albumsPlaylist" :key="index+names+track.Path" :track="track" :play="() => play(index)" :dontLinkAlbum="true">
                </SongsTile>
            </ul>
        </div>
    </div>
    <div v-else>
    <table class="table table-striped">
        <thead>
            <tr>
            <th scope="col">Artwork</th>
            <th scope="col">Album</th>
            <th scope="col">Artist</th>
            <th scope="col">Year</th>
            <th scope="col">Songs</th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="(item, index) in allAlbums" :key="item.Path">
                <td>
                    <img :src="getArtwork(item.Path)" alt="Artwork" class="rounded me-3" style="width: 100px; height: 100px;"
                    data-bs-toggle="modal" data-bs-target="#modalArtwork" @click="modalArtworkUrl = getArtwork(item.Path)">
                </td>
                <td><router-link :to="{ name: PAGE.ALBUM, params: { names: item.Album } }"> {{ item.Album }} </router-link></td>
                <td>
                    <component
                        :is="item.AlbumArtist.trim() ? 'router-link': 'span'"
                        :to="{ name: PAGE.ARTIST, params: { names: item.AlbumArtist.trim() } }">
                        {{ item.AlbumArtist }}
                    </component>
                </td>
                <td>{{ item.Year }}</td>
                <td>{{ item.Songs }}</td>
            </tr>
        </tbody>
    </table>
    <button @click="fetchAlbums"
        class="btn btn-primary mt-3">Load More</button>
    </div>
    `
}
export { Albums };

