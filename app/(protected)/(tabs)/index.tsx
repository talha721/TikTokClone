import FeedTab from "@/components/FeedTab";
import PostListItems from "@/components/PostListItems";
import { searchUsers } from "@/services/messages";
import { fetchPosts } from "@/services/posts";
import { useAuthStore } from "@/stores/useAuthStore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View, ViewToken } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TABS = {
  EXPLORE: "Explore",
  FOLLOWING: "Following",
  FOR_YOU: "For You",
};

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
};

type UserResult = { id: string; username: string; avatar_url?: string };

// ─── Search Modal ─────────────────────────────────────────────────────────────

const SearchModal = ({ visible, onClose, currentUserId }: { visible: boolean; onClose: () => void; currentUserId: string }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text.trim()) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const users = await searchUsers(text, currentUserId);
          setResults(users as UserResult[]);
        } catch {
        } finally {
          setSearching(false);
        }
      }, 350);
    },
    [currentUserId],
  );

  const handleSelect = (user: UserResult) => {
    onClose();
    setQuery("");
    setResults([]);
    router.push({
      pathname: "/(protected)/userProfile",
      params: { userId: user.id, username: user.username, avatar: user.avatar_url ?? "" },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={search.container}>
        {/* Header */}
        <View style={search.header}>
          <View style={search.inputWrap}>
            <Ionicons name="search" size={18} color="#888" style={{ marginRight: 6 }} />
            <TextInput
              style={search.input}
              placeholder="Search users..."
              placeholderTextColor="#666"
              value={query}
              onChangeText={handleChange}
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity onPress={onClose} style={search.cancelBtn}>
            <Text style={search.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {searching ? (
          <ActivityIndicator color="#fe2c55" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={search.row} onPress={() => handleSelect(item)} activeOpacity={0.75}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={search.avatar} />
                ) : (
                  <View style={search.avatarPlaceholder}>
                    <Ionicons name="person" size={20} color="#888" />
                  </View>
                )}
                <View>
                  <Text style={search.username}>{item.username}</Text>
                  <Text style={search.handle}>@{item.username.toLowerCase()}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.trim().length > 0 && !searching ? (
                <View style={search.emptyWrap}>
                  <Text style={search.emptyText}>No users found</Text>
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { height } = useWindowDimensions();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>(TABS.FOR_YOU);
  const [searchVisible, setSearchVisible] = useState(false);

  const user = useAuthStore((state) => state.user);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: ({ pageParam }) => fetchPosts(pageParam, user?.id as string),
    initialPageParam: { limit: 3, cursor: undefined },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === 0) {
        return undefined;
      }

      return {
        limit: 1,
        cursor: lastPage[lastPage.length - 1].id,
      };
    },
  });

  const posts = useMemo(() => data?.pages.flat() || [], [data]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0]?.index || 0);
    }
  });

  if (isLoading) {
    return <ActivityIndicator size="large" color="#0000ff" style={{ flex: 1, justifyContent: "center", alignItems: "center" }} />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="alert-circle" size={50} color="red" />
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>Error fetching posts. Please try again later.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <MaterialIcons name="live-tv" size={24} color="grey" />
        <View style={styles.navigationBar}>
          <FeedTab title={TABS.EXPLORE} activeTab={activeTab} setActiveTab={setActiveTab} />
          <FeedTab title={TABS.FOLLOWING} activeTab={activeTab} setActiveTab={setActiveTab} />
          <FeedTab title={TABS.FOR_YOU} activeTab={activeTab} setActiveTab={setActiveTab} />
        </View>
        <TouchableOpacity onPress={() => setSearchVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="search" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={({ item, index }) => <PostListItems postItem={item} isActive={index === currentIndex} videoHeight={height} refetch={refetch} />}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate={"fast"}
        disableIntervalMomentum={true}
        pagingEnabled={true}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => !isFetchingNextPage && hasNextPage && fetchNextPage()}
        onEndReachedThreshold={2}
      />

      {user && <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} currentUserId={user.id} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  navigationBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
  },
});

const search = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
  },
  cancelBtn: {
    paddingHorizontal: 4,
  },
  cancelText: {
    color: "#fe2c55",
    fontSize: 15,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  handle: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: "#666",
    fontSize: 15,
  },
});
