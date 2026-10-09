import { beforeEach, describe, expect, it } from "bun:test";
import { createPinia, setActivePinia } from "pinia";
import { useUiStore } from "./src/stores/ui";

describe("now-playing visibility state", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("toggleQueue flips the panel/drawer visibility", () => {
    const ui = useUiStore();
    const start = ui.queueOpen;

    ui.toggleQueue();
    expect(ui.queueOpen).toBe(!start);

    ui.toggleQueue();
    expect(ui.queueOpen).toBe(start);
  });

  it("setQueueOpen marks the choice as the user's own", () => {
    const ui = useUiStore();
    ui.setQueueOpen(false);
    expect(ui.queueOpen).toBe(false);
    ui.setQueueOpen(true);
    expect(ui.queueOpen).toBe(true);
  });

  it("lyrics visibility persists across reloads", () => {
    const ui = useUiStore();
    ui.setLyricsOpen(false);
    expect(localStorage.getItem("yams:lyrics")).toBe("false");

    // A fresh store (e.g. after a breakpoint remount) restores it.
    setActivePinia(createPinia());
    const fresh = useUiStore();
    expect(fresh.lyricsOpen).toBe(false);

    fresh.setLyricsOpen(true);
    expect(localStorage.getItem("yams:lyrics")).toBe("true");
  });
});
