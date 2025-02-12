import { usePlaylistStore } from "../stores/playlist.js";
import { highlight, getArtwork, formatDuration, PAGE } from "../utils.js";
import { computed, storeToRefs, toRef } from "../vue.js";

const PlaylistListItem = {
    props: {
        id: {}
    },
    components: {

    },
    setup: (props) => {
        const store = usePlaylistStore()

        const { playlists, favs } = storeToRefs(store)
        let item = null;
        if (props.id == "favourites") {
            item = computed(() => {
                return {
                    Id: "favourites",
                    Name: "Favourites",
                    Description: "Favourites",
                    Tracks: favs.value,
                    Count: favs.value.length
                }
            })
        } else {
            item = computed(() => {
                return playlists.value[props.id]
            })
        }


        return {
            PAGE,
            item
        }
    },
    template: `
    <li class="list-group-item d-flex justify-content-flex-start align-items-center">
        <router-link :to="{ name: PAGE.PLAYLIST, params: { name: item.Id !== -1 ? item.Id : item.Name?.toLowerCase() } }"> {{ item.Name }} </router-link> <span> - {{ item.Description }} ({{ item.Tracks.length }}) </span>
    </li>
    `
}
export { PlaylistListItem };