import { usePlaylistStore } from "../stores/playlist.js"
import { inPlaylist, PAGE } from "../utils.js"
import { computed, storeToRefs } from "../vue.js"
import { selectedTrack } from "./common.js"


const ModalAddToPlaylist = {
  setup(props) {
    const store = usePlaylistStore()

    const { playlists } = storeToRefs(store)

    const plists = computed(() => {
      const already = [], rest = []
      for (const [id, playlist] of Object.entries(playlists.value)) {
        if (playlist.Type === 'QUERY') {
          continue
        }
        if (inPlaylist(playlist, selectedTrack.value)) {
          already.push(playlist)
        } else {
          rest.push(playlist)
        }
      }
      return {
        already,
        rest
      }
    })

    const onClick = (present, id) => {
      if (present) {
        store.rem(id, selectedTrack.value)
      } else {
        store.add(id, selectedTrack.value)
      }
    }

    const close = () => {
      selectedTrack.value = {}
    }

    return {
      track: selectedTrack,
      plists,
      onClick,
      close,
      PAGE
    }

  },

  template: `
    <div id="ModalAddToPlaylist" class="modal fade" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ track.Title }} - {{ track.Artists }}</h5>
            <button @click="close" type="button" class="btn-close" data-bs-toggle="modal" data-bs-target="#ModalAddToPlaylist"></button>
          </div>
          <div class="modal-body text-center">
            <div class="my-3 d-flex flex-column">
              <ul class="list-group">
                  <li v-for="(item, idx) in plists.already" :key="item.Id" class="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                          <input checked type="checkbox" @change="() => onClick(true, item.Id)" />
                          &nbsp;
                          <router-link :to="{ name: PAGE.PLAYLIST, params: { pid: item.Id !== -1 ? item.Id : item.Name?.toLowerCase() } }"> {{ item.Name }} </router-link> <span v-if="item.Description"> • {{ item.Description }} </span>
                      </div>
                      <button type="button" class="btn btn-info">{{ item.Tracks.length }}</button>
                  </li>
                  <li v-for="(item, idx) in plists.rest" :key="item.Id" class="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                          <input type="checkbox" @change="() => onClick(false, item.Id)" />
                          &nbsp;
                          <router-link :to="{ name: PAGE.PLAYLIST, params: { pid: item.Id !== -1 ? item.Id : item.Name?.toLowerCase() } }"> {{ item.Name }} </router-link> <span v-if="item.Description"> • {{ item.Description }} </span>
                      </div>
                      <button type="button" class="btn btn-info" data-bs-toggle="modal" data-bs-target="#ModalCreatePlaylist">{{ item.Tracks.length }}</button>
                  </li>
              </ul>
              <ul class="list-group">
                <button type="button" class="btn btn-light" data-bs-toggle="modal" data-bs-target="#ModalCreatePlaylist"><i class="bi bi-plus"></i></button>
              </ul>
          </div>
          </div>
        </div>
      </div>
    </div>
`
}

export { ModalAddToPlaylist }
