import { currentPage, isMobile, PAGE, showNowPlaying, theme } from "../utils.js";


const Navigation = {
  props: {

  },
  components: {

  },
  setup: (props) => {



    const toggleTheme = () => {
      theme.value = theme.value === "light" ? "dark" : "light";
    };

    return {
      c: currentPage,
      theme,
      toggleTheme,
      PAGE,
      showNowPlaying,
      isMobile
    }
  },
  template: `
    <div class="nav nav-tabs d-flex justify-content-between bg-body" >
      <div class="d-flex flex-row flex-wrap">
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.SONGS }" to="/">Songs</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.ALBUMS || c === PAGE.ALBUM }" to="/albums">Albums</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.ARTISTS || c === PAGE.ARTIST }" to="/artists">Artists</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.PLAYLISTS || c === PAGE.PLAYLIST }" to="/playlists">Playlist</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.FOLDERS || c === PAGE.FOLDER }" to="/folders">Folders</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.YEARS || c === PAGE.YEAR }" to="/years">Years</router-link></li>
        <li class="nav-item"><router-link :class="{'nav-link': true, active: c === PAGE.HISTORY }" to="/history">History</router-link></li>
      </div>

      <div class="d-flex flex-grow-1 flex-row-reverse">
        <button v-if="isMobile" class="btn btn-link" @click="showNowPlaying = !showNowPlaying" aria-label="showNowPlaying">
            <i :class="['bi', showNowPlaying ? 'bi-arrow-bar-right' : 'bi-arrow-bar-left' ]" style="font-size: 1.25rem;"></i>
        </button>
        <button class="btn btn-link" data-bs-toggle="modal" data-bs-target="#modalSettings" aria-label="Settings">
          <i class="bi bi-gear-fill" style="font-size: 1.25rem;"></i>
        </button>
        <button class="btn btn-link" @click="toggleTheme" aria-label="darkMode">
          <i :class="{'bi bi-brightness-high-fill': theme !== 'light', 'bi bi-moon-fill': theme !== 'dark'}" style="font-size: 1.25rem;"></i>
        </button>
      </div>

    </div>
    `
}
export { Navigation };
