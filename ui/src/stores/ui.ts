import { ref } from "vue";
import { defineStore } from "pinia";

export type Theme = "light" | "dark";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "success" | "error";
  action?: { label: string; run: () => void };
}

/**
 * Cross-cutting UI state: theme, transient toasts, the context-menu anchor and
 * which modal (if any) is open.
 */
export const useUiStore = defineStore("ui", () => {
  const theme = ref<Theme>(readTheme());

  /**
   * Viewport class decides where "now playing" lives:
   *   >= lg   docked side panel
   *   md..lg  slide-over drawer
   *   < md    full-screen sheet
   */
  const wideQuery = window.matchMedia("(min-width: 1024px)");
  const isWide = ref(wideQuery.matches);

  /**
   * Open by default on desktop, where the docked panel is the primary surface.
   * The resize handler re-opens it when crossing into a wide viewport, so
   * coming back from a phone-sized window never leaves it unreachable.
   */
  let queueUserSet = false;
  const queueOpen = ref(wideQuery.matches);

  function setQueueOpen(next: boolean) {
    queueUserSet = true;
    queueOpen.value = next;
  }

  function setLyricsOpen(next: boolean) {
    lyricsOpen.value = next;
    localStorage.setItem("yams:lyrics", String(next));
  }

  function toggleQueue() {
    setQueueOpen(!queueOpen.value);
  }

  wideQuery.addEventListener("change", (e) => {
    isWide.value = e.matches;
    if (e.matches && !queueUserSet) queueOpen.value = true;
  });

  const nowPlayingOpen = ref(false);
  /** Mobile hamburger drawer visibility. */
  const mobileNavOpen = ref(false);

  function setMobileNavOpen(next: boolean) {
    mobileNavOpen.value = next;
  }
  /**
   * Lyrics panel visibility. Lives here (rather than in the panel) so it
   * survives the panel unmounting when the viewport crosses a breakpoint.
   */
  const lyricsOpen = ref(localStorage.getItem("yams:lyrics") !== "false");

  /** id of the modal currently open, or null. */
  const modal = ref<string | null>(null);
  const modalPayload = ref<unknown>(null);

  const toasts = ref<Toast[]>([]);
  let toastId = 0;

  function applyTheme() {
    const root = document.documentElement;
    // Both classes are managed explicitly: the stylesheet defines the dark
    // palette on :root and the light palette on `html.light`, so a stale
    // class left behind would pin the wrong palette.
    root.classList.toggle("dark", theme.value === "dark");
    root.classList.toggle("light", theme.value === "light");
    root.style.colorScheme = theme.value;
    localStorage.setItem("yams:theme", theme.value);
  }

  function setTheme(next: Theme) {
    theme.value = next;
    applyTheme();
  }

  function toggleTheme() {
    setTheme(theme.value === "dark" ? "light" : "dark");
  }

  function openModal(id: string, payload?: unknown) {
    modalPayload.value = payload ?? null;
    modal.value = id;
  }

  function closeModal() {
    modal.value = null;
    modalPayload.value = null;
  }

  function toast(message: string, tone: Toast["tone"] = "info", action?: Toast["action"]) {
    const id = ++toastId;
    toasts.value = [...toasts.value, { id, message, tone, action }];
    setTimeout(() => dismissToast(id), tone === "error" ? 6000 : 3500);
  }

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  /** Context-menu anchor in viewport coordinates plus the target track. */
  const contextMenu = ref<{ x: number; y: number; song: unknown } | null>(null);

  function openContextMenu(x: number, y: number, song: unknown) {
    contextMenu.value = { x, y, song };
  }

  function closeContextMenu() {
    contextMenu.value = null;
  }

  applyTheme();

  return {
    theme,
    isWide,
    queueOpen,
    nowPlayingOpen,
    mobileNavOpen,
    lyricsOpen,
    modal,
    modalPayload,
    toasts,
    contextMenu,
    setTheme,
    toggleTheme,
    setLyricsOpen,
    setMobileNavOpen,
    setQueueOpen,
    toggleQueue,
    openModal,
    closeModal,
    toast,
    dismissToast,
    openContextMenu,
    closeContextMenu,
  };
});

function readTheme(): Theme {
  const stored = localStorage.getItem("yams:theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
