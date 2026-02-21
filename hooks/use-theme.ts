/**
 * Primary hook for dark/light mode throughout the app.
 *
 * Usage:
 *   const { colorScheme, isDark, toggleTheme, setTheme, colors } = useTheme();
 */

import { Colors } from "@/constants/theme";
import { useThemeContext } from "@/context/ThemeContext";

export function useTheme() {
  const ctx = useThemeContext();
  return {
    ...ctx,
    colors: Colors[ctx.colorScheme],
  };
}
