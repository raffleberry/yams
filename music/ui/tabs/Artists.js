import { currentPage } from "../main.js";
import { PAGE, scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount, useRoute } from "../vue.js";

const Artists = {
    components: {

    },
    setup: () => {
        const r = useRoute()
        const names = r.params.names

        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.ARTISTS] = window.scrollY;
        });

        onMounted(() => {
            currentPage.value = PAGE.ARTISTS;
            window.scrollTo({ left: 0, top: scrollPositions.value[PAGE.ARTISTS] || 0, behavior: "auto" })
            if (names) {
                currentPage.value = `${PAGE.ARTIST} - ${names}`;
            } else {
                currentPage.value = PAGE.ARTISTS;
            }
        });
        return {
            names
        }
    },
    template: `
    <div v-if="names"> artist: {{ names }} </div>
    <div v-else>artists</div>
    `
}
export { Artists };