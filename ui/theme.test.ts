import { beforeEach, describe, expect, it } from "bun:test";
import { createPinia, setActivePinia } from "pinia";
import { useUiStore } from "./src/stores/ui";

describe("theme switching", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("adds the light class, which is what the light palette is keyed off", () => {
    const ui = useUiStore();

    ui.setTheme("light");
    expect(ui.theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    ui.setTheme("dark");
    expect(ui.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    // The light class must be removed, otherwise html.light keeps winning
    // over :root and the switch looks frozen.
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("toggleTheme alternates between dark and light", () => {
    const ui = useUiStore();
    ui.setTheme("dark");

    ui.toggleTheme();
    expect(ui.theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);

    ui.toggleTheme();
    expect(ui.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists the choice so it survives a reload", () => {
    const ui = useUiStore();
    ui.setTheme("light");
    expect(localStorage.getItem("yams:theme")).toBe("light");
  });

  it("restores the stored theme on boot", () => {
    localStorage.setItem("yams:theme", "light");
    setActivePinia(createPinia());

    const ui = useUiStore();
    expect(ui.theme).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });
});
