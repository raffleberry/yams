import { usePlaylistStore } from "../stores/playlist.js";
import { ref } from "../vue.js";



const ModalCreatePlaylist = {
  components: {
  },
  setup(props) {
    const store = usePlaylistStore()
    // const onClick = (checked, id) => {
    //     if (!checked) {
    //         store.rem(id, selectedTrack.value)
    //     } else {
    //         store.add(id, selectedTrack.value)
    //     }
    // }

    const Name = ref("")
    const Description = ref("")
    const Type = ref("")
    const Query = ref("")

    const createPlaylist = () => {
      // store.create()
    }
    const show = () => {
      console.log(Name.value, Description.value, Type.value, Query.value)
    }

    return {
      createPlaylist,
      show,

      Name,
      Description,
      Type,
      Query
    }

  },

  template: `
    <div id="ModalCreatePlaylist" class="modal fade" data-bs-backdrop="static" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Create Playlist</h5>
            <button type="button" class="btn-close" data-bs-toggle="modal" data-bs-target="#ModalAddToPlaylist"></button>
          </div>
          <div class="modal-body text-center">
            <div class="my-3 d-flex flex-column space-between">
              <ul class="list-group">
                <form>
                    <div class="form-group">
                        <input type="text" class="form-control" id="playlistName" placeholder="Name" v-model="Name">
                        <br/>

                        <input type="text" class="form-control" id="playlistDescription" placeholder="Description" v-model="Description">
                        <br/>

                        <div>
                            <label for="playlistTypeList">List</label>
                                &nbsp;<input type="radio" id="playlistType1" name="playlistType" value="LIST" v-model="Type" checked>
                                &nbsp;&nbsp;
                            <label for="playlistTypeQuery">Query</label>
                                &nbsp;<input type="radio" id="playlistType2" name="playlistType" value="QUERY" v-model="Type">
                        </div>
                        <input type="text" class="form-control" id="playlistQuery" placeholder="Query" v-model="Query" v-if="Type === 'QUERY'">
                        <br/>
                    </div>
                    <button type="submit" class="btn btn-primary" @click="createPlaylist">Create</button>
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

