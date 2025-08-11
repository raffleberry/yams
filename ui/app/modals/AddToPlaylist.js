import { PlaylistListItem } from "../components/PlaylistListItem.js"
import { usePlaylistStore } from "../stores/playlist.js"
import { inPlaylist } from "../utils.js"
import { computed, storeToRefs } from "../vue.js"
import { selectedTrack } from "./common.js"


const ModalAddToPlaylist = {
  components: {
    PlaylistListItem
  },
  setup(props) {
    const store = usePlaylistStore()

    const { playlists } = storeToRefs(store)

    const playlistItems = computed(() => {
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
      return [...already, ...rest]
    })

    const onClick = (checked, id) => {
      if (!checked) {
        store.rem(id, selectedTrack.value)
      } else {
        store.add(id, selectedTrack.value)
      }
    }
    return {
      track: selectedTrack,
      playlistItems,
      onClick,
    }

  },

  template: `
    <div id="ModalAddToPlaylist" class="modal fade" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ track.Title }} - {{ track.Artists }}</h5>
            <button type="button" class="btn-close" data-bs-toggle="modal" data-bs-target="#ModalAddToPlaylist"></button>
          </div>
          <div class="modal-body text-center">
            <div class="my-3 d-flex flex-column">
              <ul class="list-group">
                  <PlaylistListItem v-for="(item, key) in playlistItems" :key="item.Id" :id="item.Id"
                      :checkbox="true" :checkboxHandler="onClick"/>
              </ul>
              <ul class="list-group">
                <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#ModalCreatePlaylist">Create Playlist</button>
              </ul>
          </div>
          </div>
        </div>
      </div>
    </div>
`
}

export { ModalAddToPlaylist }
