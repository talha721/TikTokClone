// import { useAuthStore } from "@/stores/useAuthStore";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
// import { Stack, useRouter, useSegments } from "expo-router";
// import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "react-native-reanimated";

const queryClient = new QueryClient();

// import { useColorScheme } from "@/hooks/use-color-scheme";

// export const unstable_settings = {
//   anchor: "(tabs)",
// };

export default function RootLayout() {
  // const colorScheme = useColorScheme();
  // const { isAuthenticated } = useAuthStore();
  // const segments = useSegments();
  // const router = useRouter();

  // useEffect(() => {
  //   const inAuthGroup = segments[0] === "(auth)";

  //   if (!isAuthenticated && !inAuthGroup) {
  //     // Redirect to login if not authenticated
  //     router.replace("/(auth)/login");
  //   } else if (isAuthenticated && inAuthGroup) {
  //     // Redirect to tabs if authenticated
  //     router.replace("/(protected)/(tabs)");
  //   }
  // }, [isAuthenticated, segments]);

  const myTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: "white",
    },
  };

  return (
    <ThemeProvider value={myTheme}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
      {/* <StatusBar style="auto" /> */}
    </ThemeProvider>
  );
}
