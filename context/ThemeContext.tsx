import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

export type ThemePreference = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

interface ThemeContextValue {
  /** The user's saved preference: 'light', 'dark', or 'system' */
  themePreference: ThemePreference;
  /** The resolved active scheme after applying system fallback */
  colorScheme: ColorScheme;
  isDark: boolean;
  /** Set a specific preference */
  setTheme: (pref: ThemePreference) => void;
  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;
}

const STORAGE_KEY = "@app_theme_preference";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemePreference(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setTheme = useCallback(async (pref: ThemePreference) => {
    setThemePreference(pref);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pref);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    // If currently following system, switch to the opposite of the system scheme
    setTheme(themePreference === "system" ? (systemScheme === "dark" ? "light" : "dark") : themePreference === "dark" ? "light" : "dark");
  }, [themePreference, systemScheme, setTheme]);

  const colorScheme: ColorScheme = themePreference === "system" ? systemScheme : themePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      themePreference,
      colorScheme,
      isDark: colorScheme === "dark",
      setTheme,
      toggleTheme,
    }),
    [themePreference, colorScheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Internal hook – consumed by useTheme and useThemeColor */
export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used inside <ThemeProvider>");
  }
  return ctx;
}
