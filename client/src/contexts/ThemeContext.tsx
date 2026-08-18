import React, { createContext, useContext, useEffect, useState } from "react";

import { resolveAppColorScheme, resolveEffectiveAppColorScheme, type AppColorScheme } from "../../../shared/appearance";

type Theme = "light" | "dark";
export type ColorScheme = AppColorScheme;

export const COLOR_SCHEME_OPTIONS: { id: ColorScheme; name: string; description: string; preview: string }[] = [
  { id: "system", name: "Follow System", description: "Use Fairway Green in dark mode and Sand Light in light mode.", preview: "linear-gradient(135deg, #062b20 0 50%, #fff7e6 50% 100%)" },
  { id: "fairway", name: "Fairway Green", description: "The original golf-green appearance.", preview: "linear-gradient(135deg, #062b20, #22c55e)" },
  { id: "ocean", name: "Ocean Blue", description: "A cool blue background with sky accents.", preview: "linear-gradient(135deg, #0b1f3a, #38bdf8)" },
  { id: "plum", name: "Plum Night", description: "A deep purple night scheme with lilac accents.", preview: "linear-gradient(135deg, #25123b, #c084fc)" },
  { id: "sand", name: "Sand Light", description: "A bright, low-glare sand and navy scheme.", preview: "linear-gradient(135deg, #fff7e6, #d6a557)" },
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  hasPersonalColorScheme: boolean;
  useTripDefaultColorScheme: (scheme?: string | null) => void;
  clearPersonalColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    return resolveAppColorScheme(localStorage.getItem("golf-trip-color-scheme"));
  });
  const [hasPersonalColorScheme, setHasPersonalColorScheme] = useState(() => localStorage.getItem("golf-trip-has-personal-colour-scheme") === "true");
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  useEffect(() => {
    if (colorScheme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemPrefersDark(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [colorScheme]);

  useEffect(() => {
    document.documentElement.dataset.colorScheme = resolveEffectiveAppColorScheme(colorScheme, systemPrefersDark);
    localStorage.setItem("golf-trip-color-scheme", colorScheme);
  }, [colorScheme, systemPrefersDark]);

  const chooseColorScheme = (scheme: ColorScheme) => {
    setColorScheme(scheme);
    setHasPersonalColorScheme(true);
    localStorage.setItem("golf-trip-has-personal-colour-scheme", "true");
  };

  const useTripDefaultColorScheme = (scheme?: string | null) => {
    if (hasPersonalColorScheme || !scheme) return;
    setColorScheme(resolveAppColorScheme(scheme));
  };

  const clearPersonalColorScheme = () => {
    setHasPersonalColorScheme(false);
    localStorage.removeItem("golf-trip-has-personal-colour-scheme");
  };

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable, colorScheme, setColorScheme: chooseColorScheme, hasPersonalColorScheme, useTripDefaultColorScheme, clearPersonalColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
