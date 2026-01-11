import { Stack } from "expo-router";
import { FC } from "react";

const ProtectedLayout: FC = () => {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};

export default ProtectedLayout;
