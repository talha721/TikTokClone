import { useTheme } from "@/hooks/use-theme";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Story = {
  id: string;
  name: string;
  avatar: string;
  isCreate?: boolean;
};

type MessageItem = {
  id: string;
  type: "followers" | "activity" | "message";
  name: string;
  subtitle: string;
  avatar?: string;
  badge?: number;
  time?: string;
  hasCamera?: boolean;
  hasDot?: boolean;
};

const STORIES: Story[] = [
  { id: "create", name: "Create", avatar: "", isCreate: true },
  { id: "1", name: "Moco", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { id: "2", name: "M...yousif", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { id: "3", name: "saweragoh...", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
];

const MESSAGES: MessageItem[] = [
  // {
  //   id: "followers",
  //   type: "followers",
  //   name: "New followers",
  //   subtitle: "Ali Khan started following you.",
  //   badge: 1,
  // },
  // {
  //   id: "activity",
  //   type: "activity",
  //   name: "Activity",
  //   subtitle: "Jam Arsalan, 🐦🐦👥👥👥...",
  //   badge: 6,
  // },
  {
    id: "2",
    type: "message",
    name: "ABID KHAN ✅ ⭐",
    subtitle: "shared a video",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    time: "19h",
    hasDot: true,
  },
  {
    id: "3",
    type: "message",
    name: "hassanjaam344 💔😞😞💔...",
    subtitle: "Active yesterday",
    avatar: "https://randomuser.me/api/portraits/men/36.jpg",
    hasCamera: true,
  },
  {
    id: "4",
    type: "message",
    name: "Ali Sheikh 333 ❤️❤️❤️❤️",
    subtitle: "Active 4h ago",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
    hasCamera: true,
  },
  {
    id: "5",
    type: "message",
    name: "TikTok friends 🏆",
    subtitle: "You shared a video · 1d",
    avatar: "https://randomuser.me/api/portraits/lego/1.jpg",
    hasCamera: true,
  },
  {
    id: "6",
    type: "message",
    name: "Angel 😇",
    subtitle: "Active 1h ago",
    avatar: "https://randomuser.me/api/portraits/women/90.jpg",
    hasCamera: true,
  },
];

const StoryItem = ({ item }: { item: Story }) => {
  const { colors } = useTheme();

  if (item.isCreate) {
    return (
      <View style={styles.storyWrapper}>
        <View style={styles.createTooltip}>
          <Text style={styles.createTooltipText}>{"What's\nup?"}</Text>
        </View>
        <View style={[styles.storyAvatarContainer, { borderColor: colors.tint }]}>
          <View style={[styles.createAvatar, { backgroundColor: "#2a2a2a" }]}>
            <Ionicons name="person" size={24} color="#aaa" />
          </View>
          <View style={styles.createPlusButton}>
            <Ionicons name="add" size={14} color="#fff" />
          </View>
        </View>
        <Text style={[styles.storyName, { color: colors.text }]}>Create</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.storyWrapper}>
      <View style={[styles.storyAvatarContainer, { borderColor: "#20c997" }]}>
        <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
      </View>
      <Text style={[styles.storyName, { color: colors.text }]} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );
};

const MessageRow = ({ item }: { item: MessageItem }) => {
  const { colors } = useTheme();

  // if (item.type === "followers") {
  //   return (
  //     <TouchableOpacity style={styles.messageRow}>
  //       <View style={[styles.specialIconContainer, { backgroundColor: "#3b82f6" }]}>
  //         <MaterialCommunityIcons name="account-multiple-plus" size={26} color="#fff" />
  //       </View>
  //       <View style={styles.messageTextContainer}>
  //         <Text style={[styles.messageName, { color: colors.text }]}>{item.name}</Text>
  //         <Text style={[styles.messageSubtitle, { color: colors.icon }]}>{item.subtitle}</Text>
  //       </View>
  //       {item.badge ? (
  //         <View style={styles.badge}>
  //           <Text style={styles.badgeText}>{item.badge}</Text>
  //         </View>
  //       ) : null}
  //     </TouchableOpacity>
  //   );
  // }

  // if (item.type === "activity") {
  //   return (
  //     <TouchableOpacity style={styles.messageRow}>
  //       <View style={[styles.specialIconContainer, { backgroundColor: "#f43f5e" }]}>
  //         <Ionicons name="heart" size={26} color="#fff" />
  //       </View>
  //       <View style={styles.messageTextContainer}>
  //         <Text style={[styles.messageName, { color: colors.text }]}>{item.name}</Text>
  //         <Text style={[styles.messageSubtitle, { color: colors.icon }]}>{item.subtitle}</Text>
  //       </View>
  //       {item.badge ? (
  //         <View style={styles.badge}>
  //           <Text style={styles.badgeText}>{item.badge}</Text>
  //         </View>
  //       ) : null}
  //     </TouchableOpacity>
  //   );
  // }

  return (
    <TouchableOpacity style={styles.messageRow}>
      <Image source={{ uri: item.avatar }} style={styles.messageAvatar} />
      <View style={styles.messageTextContainer}>
        <Text style={[styles.messageName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.messageSubtitle, { color: colors.icon }]} numberOfLines={1}>
          {item.subtitle}
          {item.time ? ` · ${item.time}` : ""}
        </Text>
      </View>
      <View style={styles.messageRight}>
        {item.hasDot && <View style={styles.unreadDot} />}
        {item.hasCamera && <Feather name="camera" size={20} color={colors.icon} />}
      </View>
    </TouchableOpacity>
  );
};

const Inbox = () => {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <MaterialCommunityIcons name="account-multiple-plus-outline" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Inbox</Text>
          <View style={styles.onlineDot} />
        </View>
        <TouchableOpacity>
          <Ionicons name="search" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={MESSAGES}
        keyExtractor={(item) => item.id}
        // ListHeaderComponent={
        //   <>
        //     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContainer}>
        //       {STORIES.map((story) => (
        //         <StoryItem key={story.id} item={story} />
        //       ))}
        //     </ScrollView>
        //     <View style={[styles.divider, { backgroundColor: colors.icon + "33" }]} />
        //   </>
        // }
        renderItem={({ item }) => <MessageRow item={item} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
  },
  storiesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 16,
  },
  storyWrapper: {
    alignItems: "center",
    width: 68,
  },
  storyAvatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 2,
    position: "relative",
  },
  storyAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  createAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  createPlusButton: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  createTooltip: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  createTooltipText: {
    fontSize: 11,
    color: "#000",
    textAlign: "center",
  },
  storyName: {
    fontSize: 11,
    marginTop: 5,
    textAlign: "center",
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  specialIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  messageAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    flexShrink: 0,
  },
  messageTextContainer: {
    flex: 1,
    gap: 2,
  },
  messageName: {
    fontSize: 15,
    fontWeight: "600",
  },
  messageSubtitle: {
    fontSize: 13,
  },
  messageRight: {
    alignItems: "center",
    justifyContent: "center",
    width: 28,
  },
  badge: {
    backgroundColor: "#f43f5e",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f43f5e",
  },
});

export default Inbox;
