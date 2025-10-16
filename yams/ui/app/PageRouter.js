import { Navigation } from "./components/Navigation.js";
import { NowPlaying } from "./components/NowPlaying.js";
import { Player } from "./Player.js";
import { isMobile, showNowPlaying } from "./utils.js";
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
      showNowPlaying,
      isMobile
    }

  },

  template: `
    <div class="container-fluid vh-100 d-flex flex-column overflow-hidden">
      <Navigation></Navigation>
      <div class="flex-grow-1 d-flex flex-row mt-3 overflow-auto">
        <div class="col overflow-auto rounded-3 border p-2"
          :class="{ 'd-none': showNowPlaying && isMobile, 'flex-grow-1': !isMobile }">
          <RouterView></RouterView>
        </div>
        <NowPlaying
          class="col-md-4 overflow-auto rounded-3 border p-2 overflow-x-hidden"
          :class="{  'd-none': !showNowPlaying && isMobile, 'flex-grow-1': isMobile }">
        </NowPlaying>
      </div>
      <div v-if="isMobile">
        <Player></Player>
      </div>
    </div>
`
}

export { PageRouter };
