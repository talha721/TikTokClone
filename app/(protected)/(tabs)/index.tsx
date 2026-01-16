import FeedTab from "@/components/FeedTab";
import PostListItems from "@/components/PostListItems";
import { fetchPosts } from "@/services/posts";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, View, ViewToken } from "react-native";

const TABS = {
  EXPLORE: "Explore",
  FOLLOWING: "Following",
  FOR_YOU: "For You",
};

export default function HomeScreen() {
  const { height } = Dimensions.get("window");

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>(TABS.FOR_YOU);

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
    // queryFn: () => new Promise((resolve) => setTimeout(() => resolve(post), 1000)), // Mocking fetchPosts with a delay
  });

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
    <View>
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
        data={data || []}
        renderItem={({ item, index }) => <PostListItems postItem={item} isActive={index === currentIndex} />}
        keyExtractor={(item, index) => (item && (item as any).id != null ? String((item as any).id) : String(index))}
        showsVerticalScrollIndicator={false}
        snapToInterval={height - 80}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navigationBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
    // alignItems: "center",
    // marginVertical: 10,
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    position: "absolute",
    top: 70,
    zIndex: 1,
    paddingHorizontal: 20,
  },
});
