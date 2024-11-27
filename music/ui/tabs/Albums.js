import { currentPage } from "../main.js";
import { PAGE, scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount, useRoute } from "../vue.js";


const Albums = {
    components: {

    },

    setup: () => {
        const r = useRoute()
        const names = r.params.names



        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.ALBUMS] = window.scrollY;
        });

        onMounted(() => {
            currentPage.value = PAGE.ALBUMS;
            window.scrollTo({ left: 0, top: scrollPositions.value[PAGE.ALBUMS] || 0, behavior: "auto" })
            if (names) {
                currentPage.value = `${PAGE.ALBUM} - ${names}`;
            } else {
                currentPage.value = PAGE.ALBUMS;
            }

        });

        return {
            names
        }
    },


    template: `
    <div v-if="names"> albums: {{ names }} </div>
    <div v-else>albums</div>
    `
}
export { Albums };