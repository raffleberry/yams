import { currentPage } from "../main.js";
import { scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount } from "../vue.js";


const Albums = {
    components: {

    },

    setup: () => {
        onBeforeUnmount(() => {
            scrollPositions.value["Albums"] = window.scrollY;
        });

        onMounted(() => {
            currentPage.value = 'Albums';
            window.scrollTo({ left: 0, top: scrollPositions.value["Albums"] || 0, behavior: "auto" })
        });
    },


    template: `
    <div>albums</div>
    `
}
export { Albums };