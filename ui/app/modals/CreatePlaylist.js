import { usePlaylistStore } from "../stores/playlist.js";
import { ref, useTemplateRef } from "../vue.js";



const ModalCreatePlaylist = {
  components: {
  },
  setup(props) {
    const store = usePlaylistStore()
    const Name = ref("")
    const Description = ref("")
    const Type = ref("LIST")
    const Query = ref("")

    const closeBtn = useTemplateRef("closeBtn")
    const submitBtn = useTemplateRef("submitBtn")
    const canSubmit = ref(true)

    const validate = () => {
      if (Name.value.length < 3) {
        throw new Error("Playlist name must be at least 3 characters long")
      }

      if (Type.value == "QUERY") {
        if (Query.value.length <= 10) {
          throw new Error("Playlist query must be valid")
        }
      }
    }

    const onSubmit = async (e) => {
      e.preventDefault()
      canSubmit.value = false
      try {
        validate()
        const err = await store.create(Name.value, Description.value, Type.value, Query.value)
        if (err) {
          throw err
        }
        closeBtn.value.click()
      } catch (error) {
        alert(error.message)
      } finally {
        canSubmit.value = true
      }
    }

    return {
      onSubmit,
      Name,
      Description,
      Type,
      Query,
      canSubmit
    }

  },

  template: `
    <div id="ModalCreatePlaylist" class="modal fade" data-bs-backdrop="static" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Create Playlist</h5>
            <button ref="closeBtn" type="button" class="btn-close" data-bs-toggle="modal" data-bs-target="#ModalAddToPlaylist"></button>
          </div>
          <div class="modal-body text-center">
            <div class="my-3 d-flex flex-column space-between">
              <ul class="list-group">
                <form>
                    <div class="form-group">
                        <input type="text" class="form-control"
                          id="playlistName" placeholder="Name"
                          minlength="3" v-model="Name" />
                        <br/>

                        <input type="text" class="form-control" id="playlistDescription" placeholder="Description" v-model="Description" />
                        <br/>

                        <div>
                            <label for="playlistTypeList">List</label>
                                &nbsp;<input type="radio" id="playlistType1" name="playlistType" value="LIST" v-model="Type" checked />
                                &nbsp;&nbsp;
                            <label for="playlistTypeQuery">Query</label>
                                &nbsp;<input type="radio" id="playlistType2" name="playlistType" value="QUERY" v-model="Type" />
                        </div>
                        <textarea minlength="10" type="text" class="form-control" id="playlistQuery" placeholder="Query" v-model="Query" v-if="Type === 'QUERY'">
                        </textarea>
                        <br/>
                    </div>
                    <button ref="submitBtn" class="btn btn-primary" @click="onSubmit" :disabled="!canSubmit">Create</button>
                </form>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
`
}

export { ModalCreatePlaylist };

