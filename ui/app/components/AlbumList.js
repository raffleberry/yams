import { PAGE } from "../utils.js";

const AlbumList = {
    props: {
        albumSongs: {
            type: Object,
            required: true
        }
    },
    components: {

    },
    setup: (props) => {

        return {
            PAGE,
            albumSongs
        }
    },
    template: `
    <ul class="list-group">
        <li v-for="(song, index) in albumSongs" class="list-group-item d-flex justify-content-flex-start">
            {{ song.Title }}, {{ song.Artists }}, {{ song.Length }}, {{ song.Bitrate }}
        </li>
    </ul>
    `
}
export { AlbumList };
