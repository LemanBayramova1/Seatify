import { create } from "zustand";

const STORAGE_KEY = "seatify_theme";

function systemPrefersLight() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches;
}

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return systemPrefersLight() ? "light" : "dark";
}

// Flips the `dark`/`light` class on <html> — index.css keys its light-theme overrides off
// `html.light`, and Tailwind's `dark:` variants (darkMode: "class") key off `html.dark`.
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

// Applied at module load — before React's first render — so there's no flash of the wrong
// theme between page load and the store initializing.
const initialTheme = loadTheme();
applyTheme(initialTheme);

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme() {
    get().setTheme(get().theme === "dark" ? "light" : "dark");
  },
}));
