import post from "@/assets/data/post.json";
import PostListItems from "@/components/PostListItems";
import { useRef, useState } from "react";
import { Dimensions, FlatList, View, ViewToken } from "react-native";

export default function HomeScreen() {
  const { height } = Dimensions.get("window");

  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0]?.index || 0);
    }
  });

  return (
    <View>
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

// const styles = StyleSheet.create({});
