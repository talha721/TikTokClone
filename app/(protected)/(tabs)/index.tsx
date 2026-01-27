import FeedTab from "@/components/FeedTab";
import PostListItems from "@/components/PostListItems";
import { fetchPosts } from "@/services/posts";
import { useAuthStore } from "@/stores/useAuthStore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, useWindowDimensions, View, ViewToken } from "react-native";

const TABS = {
  EXPLORE: "Explore",
  FOLLOWING: "Following",
  FOR_YOU: "For You",
};

const viewabilityConfig = {
  itemVisiblePercentThreshold: 80,
};

export default function HomeScreen() {
  const { height } = useWindowDimensions();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>(TABS.FOR_YOU);

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
        <Ionicons name="search" size={24} color="grey" />
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
