import CoverPicker from "@/components/CoverPicker";
import { createPost, uploadImageToStorage, uploadVideoToStorage } from "@/services/posts";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNewPostStore } from "@/stores/useNewPostStore";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUGGESTED_LOCATIONS = ["Park, Lahore, Pakistan", "Islamabad View Point"];

const PostDetails = () => {
  const { videoUri, reset } = useNewPostStore();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [description, setDescription] = useState("");
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  const videoPlayer = useVideoPlayer(videoUri ? { uri: videoUri } : null, (player) => {
    player.loop = true;
    player.muted = true;
  });

  useEffect(() => {
    if (videoUri) {
      videoPlayer.play();
    }
  }, [videoUri, videoPlayer]);

  const { mutate: submitPost, isPending } = useMutation({
    mutationFn: async () => {
      if (!videoUri || !user) return;

      // Upload video
      const videoExtension = videoUri.split(".").pop() || "mp4";
      const videoFileName = `${user.id}/${Date.now()}.${videoExtension}`;
      const videoFile = new FileSystem.File(videoUri);
      const videoBuffer = await videoFile.bytes();
      const videoUrl = await uploadVideoToStorage({
        fileName: videoFileName,
        fileExtension: videoExtension,
        fileBuffer: videoBuffer,
      });

      // Upload thumbnail if selected
      let thumbnailUrl: string | undefined;
      if (thumbnailUri) {
        const thumbExtension = thumbnailUri.split(".").pop()?.split("?")[0] || "jpg";
        const thumbFileName = `${user.id}/${Date.now()}_thumb.${thumbExtension}`;
        const thumbFile = new FileSystem.File(thumbnailUri);
        const thumbBuffer = await thumbFile.bytes();
        thumbnailUrl = await uploadImageToStorage({
          fileName: thumbFileName,
          fileExtension: thumbExtension,
          fileBuffer: thumbBuffer,
        });
      }

      await createPost({
        video_url: videoUrl,
        description,
        user_id: user.id,
        thumbnail_url: thumbnailUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      videoPlayer.release();
      reset();
      router.replace("/");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message);
    },
  });

  const handleCoverConfirm = (uri: string) => {
    setThumbnailUri(uri);
    setShowCoverPicker(false);
  };

  const handleBack = () => {
    videoPlayer.release();
    router.back();
  };

  const appendText = (text: string) => {
    setDescription((prev) => (prev ? `${prev} ${text}` : text));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <CoverPicker visible={showCoverPicker} videoUri={videoUri} onConfirm={handleCoverConfirm} onDismiss={() => setShowCoverPicker(false)} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={28} color="#111" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Description + video preview */}
          <View style={styles.descriptionSection}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Add description..."
              placeholderTextColor="#bbb"
              multiline
              maxLength={300}
              value={description}
              onChangeText={setDescription}
            />

            {/* Video preview card */}
            <TouchableOpacity style={styles.videoCard} onPress={() => setShowCoverPicker(true)} activeOpacity={0.9}>
              {thumbnailUri ? (
                <Image source={{ uri: thumbnailUri }} style={styles.videoCardMedia} />
              ) : videoUri ? (
                <VideoView player={videoPlayer} contentFit="cover" style={styles.videoCardMedia} nativeControls={false} />
              ) : (
                <View style={[styles.videoCardMedia, styles.videoPlaceholder]} />
              )}
              {/* Preview label */}
              <View style={styles.previewLabelContainer}>
                <Text style={styles.previewLabel}>Preview</Text>
              </View>
              {/* Edit cover button */}
              <View style={styles.editCoverBtn}>
                <Text style={styles.editCoverText}>Edit cover</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Hashtag / Mention pills */}
          <View style={styles.pillRow}>
            <TouchableOpacity style={styles.pill} onPress={() => appendText("#")}>
              <Text style={styles.pillText}># Hashtags</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pill} onPress={() => appendText("@")}>
              <Text style={styles.pillText}>@ Mention</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Location */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <Ionicons name="person-circle-outline" size={22} color="#111" />
              <Text style={styles.optionLabel}>Location</Text>
              <Ionicons name="information-circle-outline" size={16} color="#aaa" />
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
          </TouchableOpacity>

          {/* Location chips */}
          <View style={styles.locationChips}>
            {SUGGESTED_LOCATIONS.map((loc) => (
              <TouchableOpacity key={loc} style={styles.locationChip} activeOpacity={0.7}>
                <Text style={styles.locationChipText} numberOfLines={1}>
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Add link */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <Feather name="plus-square" size={20} color="#111" />
              <Text style={styles.optionLabel}>Add link</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Privacy */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <MaterialIcons name="public" size={22} color="#111" />
              <Text style={styles.optionLabel}>Everyone can view this post</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* More options */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.7}>
            <View style={styles.optionLeft}>
              <Ionicons name="settings-outline" size={22} color="#111" />
              <Text style={styles.optionLabel}>More options</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
          </TouchableOpacity>

          <View style={styles.divider} />
        </ScrollView>

        {/* Fixed bottom bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.draftsBtn} activeOpacity={0.8}>
            <Ionicons name="save-outline" size={18} color="#555" />
            <Text style={styles.draftsBtnText}>Drafts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.postBtn} activeOpacity={0.85} onPress={() => submitPost()} disabled={isPending}>
            {isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="arrow-up-circle" size={20} color="white" />
                <Text style={styles.postBtnText}>Post</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PostDetails;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  /* Description section */
  descriptionSection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 14,
    alignItems: "flex-start",
  },
  descriptionInput: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    minHeight: 120,
    textAlignVertical: "top",
  },

  /* Video card */
  videoCard: {
    width: 100,
    height: 140,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  videoCardMedia: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    backgroundColor: "#222",
  },
  previewLabelContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 6,
  },
  previewLabel: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  editCoverBtn: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingVertical: 5,
    alignItems: "center",
  },
  editCoverText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },

  /* Pills */
  pillRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  pill: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },

  /* Divider */
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e8e8e8",
    marginHorizontal: 16,
  },

  /* Option rows */
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    color: "#111",
  },

  /* Location chips */
  locationChips: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexWrap: "wrap",
  },
  locationChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 200,
  },
  locationChipText: {
    fontSize: 12,
    color: "#333",
  },

  /* Bottom bar */
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e8e8e8",
    backgroundColor: "#fff",
  },
  draftsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 100,
    paddingVertical: 13,
    backgroundColor: "#f2f2f2",
  },
  draftsBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  postBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 100,
    paddingVertical: 13,
    backgroundColor: "#fe2c55",
  },
  postBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
