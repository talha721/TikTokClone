import { useAuthStore } from "@/stores/useAuthStore";
import { Redirect, Stack } from "expo-router";
import { FC } from "react";

const ProtectedLayout: FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="postDetails" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="chat/[conversationId]" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
};

export default ProtectedLayout;
