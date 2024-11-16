import { currentPage } from "../main.js";
import { scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount } from "../vue.js";


const Folders = {
    components: {

    },
    setup: () => {
        onBeforeUnmount(() => {
            scrollPositions.value["Folders"] = window.scrollY;
        });

        onMounted(() => {
            currentPage.value = 'Folders';
            window.scrollTo({ left: 0, top: scrollPositions.value["Folders"] || 0, behavior: "auto" })
        });


    },
    template: `
    <div>Folders</div>
    `
}
export { Folders };