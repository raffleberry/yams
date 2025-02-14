import { usePlaylistStore } from "../stores/playlist.js";
import { computed } from "../vue.js";


const OnPlaylistBtn = {
    props: {
        track: {
            type: Object,
            required: true
        },
    },
    components: {

    },
    setup: (props) => {
        const store = usePlaylistStore()

        const onPlaylistCount = computed(() => {
            let cnt = 0;
            for (let i = 0; i < store.playlists.length; i++) {
                if (store.playlists[i].Tracks.includes(props.track)) {
                    cnt++;
                }
            }
            return cnt;
        })

        const onClick = () => {
            for (let i = 0; i < store.playlists.length; i++) {
                if (store.playlists[i].Tracks.includes(props.track)) {
                    window.location.href = `/playlists/${store.playlists[i].Id}`;
                    return;
                }
            }
        }

        return {
            onClick,
            onPlaylistCount

        }
    },
    template: `
`
}
export { OnPlaylistBtn };
