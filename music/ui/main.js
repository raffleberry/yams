import { modalArtworkUrl } from "./ui/modals.js";
import { Player, playPause, nextTrack, previousTrack, currentTrack, isPlaying } from "./ui/Player.js";
import { Settings } from "./ui/Settings.js";
import { Albums } from "./ui/tabs/Albums.js";
import { Songs } from "./ui/tabs/Songs.js";
import { Artists } from "./ui/tabs/Artists.js";
import { Playlists } from "./ui/tabs/Playlists.js";
import { PAGE, setupMediaSession } from "./ui/utils.js";
import { computed, createApp, createRouter, createWebHistory, onMounted, ref, watch } from "./ui/vue.js";
import { Folders } from "./ui/tabs/Folders.js";
import { History } from "./ui/tabs/History.js";
import { PropsModal } from "./ui/Props.js";
import { NowPlaying } from "./ui/tabs/NowPlaying.js";
import { Years } from "./ui/tabs/Years.js";

const currentPage = ref(PAGE.SONGS);

const routes = [
    { path: '/', component: Songs, name: PAGE.SONGS },

    { path: '/artists/:names', component: Artists, name: PAGE.ARTIST },
    { path: '/artists', component: Artists, name: PAGE.ARTISTS },

    { path: '/albums/:names', component: Albums, name: PAGE.ALBUM },
    { path: '/albums', component: Albums, name: PAGE.ALBUMS },


    { path: '/playlists/:name', component: Playlists, name: PAGE.PLAYLIST },
    { path: '/playlists', component: Playlists, name: PAGE.PLAYLISTS },

    { path: '/folders/:folder', component: Folders, name: PAGE.FOLDER },
    { path: '/folders', component: Folders, name: PAGE.FOLDERS },

    { path: '/years/:year', component: Years, name: PAGE.YEAR },
    { path: '/years', component: Years, name: PAGE.YEARS },

    { path: '/history', component: History, name: PAGE.HISTORY },
    { path: '/now', component: NowPlaying, name: PAGE.NOW_PLAYING },

];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export const updatePageTitle = (title) => {
    console.log("updated title : ", title)
    currentPage.value = title;
}

const pageTitle = computed(() => {
    if (isPlaying && currentTrack.value.Title) {
        return `${currentTrack.value.Title} - ${currentTrack.value.Artists} | ${currentPage.value}`
    }
    return currentPage.value
});

watch(pageTitle, () => {
    document.title = pageTitle.value
})

const app = createApp({
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
})

app.use(router)
app.mount('#app')
