import { selectedTrack } from "../modals/common.js";
import { usePlaylistStore } from "../stores/playlist.js";
import { inPlaylist, PAGE } from "../utils.js";
import { computed, storeToRefs } from "../vue.js";

const PlaylistListItem = {
    props: {
        id: {
            required: true
        },
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
        let count = null;
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
            count = computed(() => {
                return favs.value.length
            })
        } else {
            item = computed(() => {
                return playlists.value[props.id]
            })
            count = computed(() => {
                return playlists.value[props.id].Tracks.length
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
            count,
            checkbox: props.checkbox,
            checked,
            checkboxHandler
        }
    },
    template: `
    <li class="list-group-item d-flex justify-content-between align-items-center">
        <div>
            <span class="px-2" v-if="checkbox"> <input :checked="checked" type="checkbox" @change="checkboxHandler" /> </span>
            <router-link :to="{ name: PAGE.PLAYLIST, params: { name: item.Id !== -1 ? item.Id : item.Name?.toLowerCase() } }"> {{ item.Name }} </router-link> &nbsp;• {{ item.Description }} <span v-if="item.Type === 'LIST'"> </span>
        </div>
        <button type="button" class="btn btn-info">{{ count }}</button>
    </li>
    `
}
export { PlaylistListItem };
