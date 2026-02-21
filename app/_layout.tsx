import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { ThemeProvider, useThemeContext } from "@/context/ThemeContext";

const queryClient = new QueryClient();

function NavigationThemeWrapper({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useThemeContext();

  const navTheme =
    colorScheme === "dark" ? { ...DarkTheme, colors: { ...DarkTheme.colors, primary: "white" } } : { ...DefaultTheme, colors: { ...DefaultTheme.colors } };

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      {children}
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <NavigationThemeWrapper>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(protected)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          </Stack>
        </QueryClientProvider>
      </NavigationThemeWrapper>
    </ThemeProvider>
  );
}
