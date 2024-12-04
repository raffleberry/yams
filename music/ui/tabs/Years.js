import { updatePageTitle } from "../main.js";
import { PAGE, scrollPositions } from "../utils.js";
import { onBeforeUnmount, onMounted, useRoute } from "../vue.js";

const Years = {
    components: {

    },
    setup: () => {
        const r = useRoute()
        const year = r.params.year

        onBeforeUnmount(() => {
            scrollPositions.value[PAGE.YEARS] = window.scrollY;
        });


        onMounted(() => {
            updatePageTitle(PAGE.YEARS)
            window.scrollTo({ left: 0, top: scrollPositions.value[PAGE.ARTISTS] || 0, behavior: "auto" })

        });
        return {
            year
        }
    },
    template: `
    <div v-if="year"> Year: {{ year }} </div>
    <div v-else>Years</div>
    `
}
export { Years };