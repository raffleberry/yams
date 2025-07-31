import { currentPage, PAGE } from "../utils.js";

const Navigation = {
  props: {
  },
  components: {

  },
  setup: (props) => {
    console.log(currentPage.value)
    return {
      c: currentPage,
      PAGE,
    }
  },
  template: `
    <div class="nav nav-tabs sticky-top d-flex justify-content-between" style="background-color: white;">
      <div class="d-flex flex-row flex-wrap">
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.SONGS }" to="/">Songs</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.ALBUMS || c === PAGE.ALBUM }" to="/albums">Albums</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.ARTISTS || c === PAGE.ARTIST }" to="/artists">Artists</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.PLAYLISTS || c === PAGE.PLAYLIST }" to="/playlists">Playlist</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.FOLDERS || c === PAGE.FOLDER }" to="/folders">Folders</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.YEARS || c === PAGE.YEAR }" to="/years">Years</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.HISTORY }" to="/history">History</router-link></li>
      </div>

      <div class="d-flex flex-row">
        <button class="btn btn-link" data-bs-toggle="modal" data-bs-target="#modalSettings" aria-label="Settings">
          <i class="bi bi-gear-fill" style="font-size: 1.25rem;"></i>
        </button>
      </div>

    </div>
    `
}
export { Navigation };
