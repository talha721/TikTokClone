import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/lib/supabase";
import { fetchUnreadInboxCount } from "@/services/messages";
import { fetchUnreadNotificationCount } from "@/services/notifications";
import { useAuthStore } from "@/stores/useAuthStore";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

function TabBadge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View
      style={{
        position: "absolute",
        top: -4,
        right: -8,
        backgroundColor: "#fe2c55",
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 3,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);

  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadInbox, setUnreadInbox] = useState(0);

  const refreshCounts = async () => {
    if (!user) return;
    const [notifs, inbox] = await Promise.all([fetchUnreadNotificationCount(user.id), fetchUnreadInboxCount(user.id)]);
    setUnreadNotifs(notifs);
    setUnreadInbox(inbox);
  };

  useEffect(() => {
    if (!user) return;
    refreshCounts();

    // Realtime: re-fetch counts whenever notifications or messages change
    const channel = supabase
      .channel(`tab-badges:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refreshCounts)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, refreshCounts)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refreshCounts)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refreshCounts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => (
            <View style={{ position: "relative" }}>
              <Feather name="bell" size={24} color={color} />
              <TabBadge count={unreadNotifs} color={color} />
            </View>
          ),
        }}
        listeners={{ tabPress: () => setUnreadNotifs(0) }}
      />
      <Tabs.Screen
        name="newPost"
        options={{
          title: "New Post",
          tabBarIcon: ({ color }) => <Feather name="plus-circle" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color }) => (
            <View style={{ position: "relative" }}>
              <Feather name="inbox" size={24} color={color} />
              <TabBadge count={unreadInbox} color={color} />
            </View>
          ),
        }}
        listeners={{ tabPress: () => setUnreadInbox(0) }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
