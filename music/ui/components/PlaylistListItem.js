import { highlight, getArtwork, formatDuration, PAGE } from "../utils.js";

const PlaylistListItem = {
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
        <router-link :to="{ name: PAGE.PLAYLIST, params: { name: item.Id !== -1 ? item.Id : item.Name?.toLowerCase() } }"> {{ item.Name }} </router-link> <span> - {{ item.Description }} ({{ item.Count }}) </span>
    </li>
    `
}
export { PlaylistListItem };