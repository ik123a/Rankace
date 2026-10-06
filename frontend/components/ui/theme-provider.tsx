"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "rankace-theme";

/**
 * Reads the OS preference. Deliberately returns "dark" on a missing API
 * rather than throwing, because the inline script and the toggle both call
 * this and neither can afford to break the page over a browser quirk.
 */
function systemTheme(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/**
 * The inline script that runs before first paint.
 *
 * It MUST stay in sync with `resolveTheme` below -- if the two disagree the
 * page paints one theme and then React re-renders the other, which is a
 * visible flash. Kept as a string because it has to execute synchronously
 * in <head>, before the stylesheet's first frame is composited.
 */
export const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
    var t = (stored === 'light' || stored === 'dark')
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Re-apply the OS preference and drop any stored override. */
  useSystemTheme: () => void;
  /** True while the theme is tracking the OS rather than a stored choice. */
  followingSystem: boolean;
  toggleTheme: () => void;
  /** False until the effect has read the DOM attribute, so the toggle can
   *  avoid rendering a label that disagrees with what is on screen. */
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  useSystemTheme: () => {},
  followingSystem: true,
  toggleTheme: () => {},
  mounted: false
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Dark is the initial render's value so server and client markup agree.
  // The real value arrives in the effect below; the inline script has
  // already set the attribute by then, so the visible change is instant
  // and happens before hydration completes.
  const [theme, setThemeState] = useState<Theme>("dark");
  const [followingSystem, setFollowingSystem] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    setThemeState(attr === "light" ? "light" : "dark");
    // No stored key means the inline script fell through to the OS
    // preference, so the app is following the system.
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    setFollowingSystem(stored !== "light" && stored !== "dark");
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setFollowingSystem(false);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode / storage disabled -- the attribute still applied */
    }
  }, []);

  const useSystemTheme = useCallback(() => {
    const resolved = systemTheme();
    setThemeState(resolved);
    setFollowingSystem(true);
    document.documentElement.setAttribute("data-theme", resolved);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage disabled */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // While following the system, the OS flipping its preference must repaint
  // the app. Without this the user is stuck on whatever was resolved at load
  // until they touch the toggle.
  useEffect(() => {
    if (!followingSystem) return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia("(prefers-color-scheme: light)");
    } catch {
      return;
    }
    const onChange = () => {
      const next = systemTheme();
      setThemeState(next);
      document.documentElement.setAttribute("data-theme", next);
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    // Safari < 14 and friends.
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [followingSystem]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, useSystemTheme, followingSystem, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
