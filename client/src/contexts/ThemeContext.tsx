import React, { createContext, useContext, useEffect, useState } from "react";

import { resolveAppColorScheme, type AppColorScheme } from "../../../shared/appearance";

type Theme = "light" | "dark";
export type ColorScheme = AppColorScheme;

export const COLOR_SCHEME_OPTIONS: { id: ColorScheme; name: string; description: string; preview: string }[] = [
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
    document.documentElement.dataset.colorScheme = colorScheme;
    localStorage.setItem("golf-trip-color-scheme", colorScheme);
  }, [colorScheme]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable, colorScheme, setColorScheme }}>
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
