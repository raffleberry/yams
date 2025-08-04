import { selectedTrack } from "../modals/common.js";
import { usePlaylistStore } from "../stores/playlist.js";
import { inPlaylist, PAGE } from "../utils.js";
import { computed, storeToRefs } from "../vue.js";

const PlaylistListItem = {
    props: {
        id: {},
        checkbox: {
            type: Boolean,
            required: false,
            default: false
        },
        checkboxHandler: {
            type: Function,
            required: false,
            default: (checked, id) => { }
        }
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
                    Type: "LIST",
                    Count: favs.value.length
                }
            })
        } else {
            item = computed(() => {
                return playlists.value[props.id]
            })
        }

        const checkboxHandler = (e) => {
            if (e.target.checked) {
                props.checkboxHandler(true, item.value.Id)
            } else {
                props.checkboxHandler(false, item.value.Id)
            }
        }

        const checked = computed(() => {
            return inPlaylist(item.value, selectedTrack.value)
        })


        return {
            PAGE,
            item,
            checkbox: props.checkbox,
            checked,
            checkboxHandler
        }
    },
    template: `
    <li class="list-group-item d-flex justify-content-flex-start align-items-center">
        <span class="px-2" v-if="checkbox"> <input :checked="checked" type="checkbox" @change="checkboxHandler" /> </span>
        <router-link :to="{ name: PAGE.PLAYLIST, params: { name: item.Id !== -1 ? item.Id : item.Name?.toLowerCase() } }"> {{ item.Name }} </router-link> <span> - {{ item.Description }} </span> <span v-if="item.Type === 'LIST'"> ({{ item.Count }}) </span> </span>
    </li>
    `
}
export { PlaylistListItem };
