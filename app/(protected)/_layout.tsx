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
    </Stack>
  );
};

export default ProtectedLayout;
