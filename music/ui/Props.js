import { currentTrack } from "./Player.js";
import { getProps } from "./utils.js";
import { onMounted, ref } from "./vue.js";

export const propsModalData = ref({})

const propsList = ["Lyrics", "Copyright", "Encoding", "Comment", "Date"]

export const fetchProps = async () => {
    let url = getProps(currentTrack.value.Path)
    try {
        const res = await fetch(url)
        const resJson = await res.json()
        console.log(resJson)
        const jsonKeys = Object.keys(resJson)
        const filteredJson = {}
        for (const prop of propsList) {
            for (const key of jsonKeys) {
                if (key.toLowerCase() === prop.toLowerCase()) {
                    filteredJson[prop] = resJson[key][0]
                }
            }
        }
        propsModalData.value = filteredJson
    } catch (error) {
        console.error('Error fetching props:', error)
    }
}

const PropsModal = {
    setup() {
        return {
            propsModalData
        }
    },
    template:
        `
<div id="modalProps" class="modal fade" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5);">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">Details</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="container-fluid">

                    <div class="accordion" id="propsAccordian">
                        <div v-for="(value, key) in propsModalData" class="accordion-item" :key="key">
                            <h2 class="accordion-header">
                                <button class="accordion-button" type="button" data-bs-toggle="collapse"
                                    :data-bs-target="'#collapse-'+key">
                                    {{key}}
                                </button>
                            </h2>
                            <div :id="'collapse-'+ key" class="accordion-collapse collapse show"
                                data-bs-parent="#propsAccordian">
                                <div class="accordion-body preformat">
                                    {{value}}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>
`
}

export { PropsModal }