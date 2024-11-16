import { currentPage } from "../main.js";
import { scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount } from "../vue.js";


const Playlists = {
    components: {

    },
    setup: () => {
        onBeforeUnmount(() => {
            scrollPositions.value["Playlists"] = window.scrollY;
        });

        onMounted(() => {
            currentPage.value = 'Playlists';
            window.scrollTo({ left: 0, top: scrollPositions.value["Playlists"] || 0, behavior: "auto" })
        });


    },
    template: `
    <div>Playlists</div>
    `
}
export { Playlists };