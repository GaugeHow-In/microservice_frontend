"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "gaugehow-theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [resolvedTheme, setResolvedTheme] = useState<Theme>("light");

  useEffect(() => {
    // Light is the product default everywhere; dark is strictly opt-in via
    // the toggle (never inherited from the OS preference).
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme = storedTheme === "dark" ? "dark" : "light";

    setResolvedTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const setTheme = (theme: Theme) => {
    setResolvedTheme(theme);
    applyTheme(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ resolvedTheme, setTheme, toggleTheme }}>
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
