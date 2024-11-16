import { modalArtworkUrl } from "./modals.js";
import { Player, playPause, nextTrack, previousTrack, currentTrack } from "./Player.js";
import { Settings } from "./Settings.js";
import { Albums } from "./tabs/Albums.js";
import { Songs } from "./tabs/Songs.js";
import { Artists } from "./tabs/Artists.js";
import { Playlists } from "./tabs/Playlists.js";
import { PAGE, setupMediaSession } from "./utils.js";
import { computed, createApp, createRouter, createWebHistory, onMounted, ref, watch } from "./vue.js";
import { Folders } from "./tabs/Folders.js";
import { History } from "./tabs/History.js";
import { PropsModal } from "./Props.js";
import { NowPlaying } from "./tabs/NowPlaying.js";

export const currentPage = ref(PAGE.SONGS);

const routes = [
    { path: '/', component: Songs, name: PAGE.SONGS },
    { path: '/artists', component: Artists, name: PAGE.ARTISTS },
    { path: '/albums', component: Albums, name: PAGE.ALBUMS },
    { path: '/playlists', component: Playlists, name: PAGE.PLAYLISTS },
    { path: '/folders', component: Folders, name: PAGE.FOLDERS },
    { path: '/history', component: History, name: PAGE.HISTORY },
    { path: '/now', component: NowPlaying, name: PAGE.NOW_PLAYING },

];

const router = createRouter({
    history: createWebHistory(),
    routes
});

const pageTitle = computed(() => {
    if (currentTrack.value.Title) {
        return `${currentTrack.value.Title} - ${currentTrack.value.Artists} | ${currentPage.value}`
    }
    return currentPage.value
});

watch(pageTitle, () => {
    document.title = pageTitle.value
})

createApp({
    components: {
        Player,
        Settings,
        PropsModal,
    },

    setup() {

        onMounted(() => {
            setupMediaSession(playPause, playPause, nextTrack, previousTrack);
        });

        return {
            modalArtworkUrl,
            pageTitle
        };
    }
}).use(router).mount('#app');