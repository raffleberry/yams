import { currentPage } from "../main.js";
import { scrollPositions } from "../utils.js";
import { onMounted, onBeforeUnmount } from "../vue.js";

const Artists = {
    components: {

    },
    setup: () => {
        onBeforeUnmount(() => {
            scrollPositions.value["Artists"] = window.scrollY;
        });

        onMounted(() => {
            currentPage.value = 'Artists';
            window.scrollTo({ left: 0, top: scrollPositions.value["Artists"] || 0, behavior: "auto" })
        });

    },
    template: `
    <div>artists</div>
    `
}
export { Artists };