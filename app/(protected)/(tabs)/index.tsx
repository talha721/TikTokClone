import post from "@/assets/data/post.json";
import FeedTab from "@/components/FeedTab";
import PostListItems from "@/components/PostListItems";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Dimensions, FlatList, StyleSheet, View, ViewToken } from "react-native";

const TABS = {
  EXPLORE: "Explore",
  FOLLOWING: "Following",
  FOR_YOU: "For You",
};

export default function HomeScreen() {
  const { height } = Dimensions.get("window");

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>(TABS.FOR_YOU);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0]?.index || 0);
    }
  });

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
        data={post}
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
