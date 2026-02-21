import { Ionicons } from "@expo/vector-icons";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const FRAME_COUNT = 15;
const FRAME_WIDTH = 50;
const FRAME_HEIGHT = 80;
const FRAME_GAP = 2;
const SELECTOR_WIDTH = FRAME_WIDTH + FRAME_GAP;
// The selector window sits in the center of the strip container
const STRIP_PADDING = (SCREEN_WIDTH - SELECTOR_WIDTH) / 2;

type Props = {
  visible: boolean;
  videoUri: string;
  onConfirm: (thumbnailUri: string) => void;
  onDismiss: () => void;
};

type Frame = {
  uri: string;
  time: number; // ms
};

const CoverPicker = ({ visible, videoUri, onConfirm, onDismiss }: Props) => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  // Try to estimate duration by binary-searching for a valid thumbnail
  const estimateDuration = async (uri: string): Promise<number> => {
    const candidates = [60000, 30000, 15000, 10000, 5000, 2000];
    let duration = 5000;
    for (const ms of candidates) {
      try {
        await VideoThumbnails.getThumbnailAsync(uri, { time: ms, quality: 0.1 });
        duration = ms;
      } catch {
        break;
      }
    }
    return duration;
  };

  useEffect(() => {
    if (!visible || !videoUri) return;

    const generateFrames = async () => {
      setLoading(true);
      setFrames([]);
      setSelectedIndex(0);

      try {
        const probe = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 0 });
        const estimatedDurationMs = await estimateDuration(videoUri);
        const interval = Math.max(500, Math.floor(estimatedDurationMs / (FRAME_COUNT - 1)));

        const generated: Frame[] = [];
        for (let i = 0; i < FRAME_COUNT; i++) {
          const time = Math.min(i * interval, estimatedDurationMs);
          try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time, quality: 0.5 });
            generated.push({ uri, time });
          } catch {
            break;
          }
        }
        setFrames(generated.length > 0 ? generated : [{ uri: probe.uri, time: 0 }]);
      } catch (e) {
        console.warn("CoverPicker: failed to generate frames", e);
      } finally {
        setLoading(false);
      }
    };

    generateFrames();
  }, [visible, videoUri]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SELECTOR_WIDTH);
    const clamped = Math.max(0, Math.min(index, frames.length - 1));
    setSelectedIndex(clamped);
  };

  const handleConfirm = () => {
    if (frames[selectedIndex]) {
      onConfirm(frames[selectedIndex].uri);
    }
  };

  const selectedUri = frames[selectedIndex]?.uri;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select cover</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn} disabled={frames.length === 0}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>

        {/* Large preview */}
        <View style={styles.previewContainer}>
          {loading ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color="white" size="large" />
              <Text style={styles.loadingText}>Generating frames…</Text>
            </View>
          ) : selectedUri ? (
            <Image source={{ uri: selectedUri }} style={styles.previewImage} resizeMode="cover" />
          ) : null}
        </View>

        {/* Filmstrip */}
        <View style={styles.stripWrapper}>
          {!loading && frames.length > 0 && (
            <>
              {/* Fixed selector window in the center */}
              <View pointerEvents="none" style={styles.selectorWindow} />

              <ScrollView
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={SELECTOR_WIDTH}
                decelerationRate="fast"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                contentContainerStyle={{
                  paddingHorizontal: STRIP_PADDING,
                  alignItems: "center",
                }}
              >
                {frames.map((frame, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedIndex(i);
                      scrollRef.current?.scrollTo({ x: i * SELECTOR_WIDTH, animated: true });
                    }}
                  >
                    <Image
                      source={{ uri: frame.uri }}
                      style={[
                        styles.frameThumb,
                        i === selectedIndex && styles.frameThumbSelected,
                        i === 0 && { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
                        i === frames.length - 1 && { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
          {loading && (
            <View style={styles.stripLoadingContainer}>
              <ActivityIndicator color="#fe2c55" />
            </View>
          )}
        </View>

        <Text style={styles.hint}>Drag to choose a cover frame</Text>
      </View>
    </Modal>
  );
};

export default CoverPicker;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
  },
  headerBtn: {
    width: 40,
  },
  headerTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 4,
  },
  confirmText: {
    color: "#fe2c55",
    fontWeight: "700",
    fontSize: 16,
  },
  previewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 24,
  },
  previewLoading: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  stripWrapper: {
    height: FRAME_HEIGHT + 20,
    justifyContent: "center",
    marginBottom: 4,
  },
  selectorWindow: {
    position: "absolute",
    left: (SCREEN_WIDTH - SELECTOR_WIDTH) / 2,
    top: 10,
    width: SELECTOR_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 3,
    borderColor: "#fe2c55",
    borderRadius: 4,
    zIndex: 10,
  },
  frameThumb: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    marginHorizontal: FRAME_GAP / 2,
    opacity: 0.6,
  },
  frameThumbSelected: {
    opacity: 1,
  },
  stripLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: FRAME_HEIGHT,
  },
  hint: {
    color: "#555",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 30,
  },
});
