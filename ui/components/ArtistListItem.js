import { highlight, getArtwork, formatDuration, PAGE } from "../utils.js";
import { modalArtworkUrl } from "../modals.js";

const ArtistListItem = {
    props: {
        item: {
            type: Object,
            required: true
        }
    },
    components: {

    },
    setup: (props) => {

        return {
            PAGE,
            item: props.item
        }
    },
    template: `
    <li class="list-group-item d-flex justify-content-flex-start align-items-center">
        <router-link :to="{ name: PAGE.ARTIST, params: { names: item.Artists } }"> {{ item.Artists }} </router-link>
    </li>
    `
}
export { ArtistListItem };