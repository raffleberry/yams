import { Navigation } from "./components/Navigation.js";
import { NowPlaying } from "./components/NowPlaying.js";
import { Player } from "./Player.js";
import { isMobile, onNowPlaying } from "./utils.js";
import { RouterView } from "./vue.js";


const PageRouter = {
  components: {
    Navigation,
    NowPlaying,
    Player
  },
  props: {
    RouterView,
  },
  setup() {

    return {
      onNowPlaying,
      isMobile
    }

  },

  template: `
    <div class="container-fluid vh-100 d-flex flex-column overflow-hidden">
      <Navigation></Navigation>
      <div class="flex-grow-1 d-flex flex-row mt-3 overflow-auto">
        <div :class="[onNowPlaying ? 'hide-on-mobile': '', 'col', 'overflow-auto','rounded-3', 'border', 'p-2' ]">
          <RouterView></RouterView>
        </div>
        <NowPlaying
          :class="[onNowPlaying ? '': 'hide-on-mobile', 'col-md-4', 'overflow-auto','rounded-3', 'border', 'p-2', 'overflow-x-hidden']">
        </NowPlaying>
      </div>

      <Player></Player>

    </div>
`
}

export { PageRouter };
