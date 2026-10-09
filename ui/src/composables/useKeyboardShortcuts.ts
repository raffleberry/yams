import { onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";

export interface ShortcutHandlers {
  toggle?: () => void;
  next?: () => void;
  previous?: () => void;
  seekForward?: () => void;
  seekBackward?: () => void;
  volumeUp?: () => void;
  volumeDown?: () => void;
  toggleMute?: () => void;
  shuffle?: () => void;
  repeat?: () => void;
  focusSearch?: () => void;
  escape?: () => void;
}

/** True when the event target is a text-entry surface. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Global keyboard shortcuts. Ignores events originating from inputs so typing a
 * search term never triggers playback controls.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const router = useRouter();

  function onKeyDown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "Escape") {
      handlers.escape?.();
      return;
    }

    if (isTyping(e.target)) return;

    switch (e.key) {
      case " ":
      case "k":
        e.preventDefault();
        handlers.toggle?.();
        break;
      case "ArrowRight":
        if (e.shiftKey) handlers.next?.();
        else handlers.seekForward?.();
        break;
      case "ArrowLeft":
        if (e.shiftKey) handlers.previous?.();
        else handlers.seekBackward?.();
        break;
      case "ArrowUp":
        e.preventDefault();
        handlers.volumeUp?.();
        break;
      case "ArrowDown":
        e.preventDefault();
        handlers.volumeDown?.();
        break;
      case "m":
        handlers.toggleMute?.();
        break;
      case "s":
        handlers.shuffle?.();
        break;
      case "r":
        handlers.repeat?.();
        break;
      case "/":
        e.preventDefault();
        handlers.focusSearch?.();
        router.push({ name: "songs" }).catch(() => {});
        break;
      default:
        break;
    }
  }

  onMounted(() => window.addEventListener("keydown", onKeyDown));
  onBeforeUnmount(() => window.removeEventListener("keydown", onKeyDown));
}
