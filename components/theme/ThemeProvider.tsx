"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "praxis-theme";
const THEME_COLORS: Record<Theme, string> = {
  light: "#f6f3ec",
  dark: "#0b0c0f",
};

interface ThemeContextValue {
  theme: Theme | null;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | undefined | null): value is Theme {
  return value === "light" || value === "dark";
}

function applyTheme(theme: Theme, transition: boolean) {
  const root = document.documentElement;
  if (transition) root.classList.add("theme-transition");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", THEME_COLORS[theme]));
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme | null>(null);
  const transitionTimer = useRef<number | null>(null);

  useEffect(() => {
    const initial = isTheme(document.documentElement.dataset.theme)
      ? document.documentElement.dataset.theme
      : "dark";
    setThemeState(initial);
    applyTheme(initial, false);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !isTheme(event.newValue)) return;
      setThemeState(event.newValue);
      applyTheme(event.newValue, true);
      window.setTimeout(() => {
        document.documentElement.classList.remove("theme-transition");
      }, 220);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current);
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    if (transitionTimer.current != null) window.clearTimeout(transitionTimer.current);
    setThemeState(nextTheme);
    applyTheme(nextTheme, true);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
    transitionTimer.current = window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
      transitionTimer.current = null;
    }, 220);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
    }),
    [setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}
