import { createPost, uploadVideoToStorage } from "@/services/posts";
import { useAuthStore } from "@/stores/useAuthStore";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Alert, Button, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const NewPost = () => {
  const [facing, setFacing] = useState<CameraType>("back");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [video, setVideo] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const user = useAuthStore((state) => state.user);

  const cameraRef = useRef<CameraView>(null);
  const queryClient = useQueryClient();

  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const videoPlayer = useVideoPlayer(null, (player) => {
    player.loop = true;
  });

  const { mutate: createNewPost, isPending } = useMutation({
    mutationFn: async ({ video, description }: { video: string; description: string }) => {
      const fileExtension = video.split(".").pop() || "mp4";
      const fileName = `${user?.id}/${Date.now()}.${fileExtension}`;

      const file = new FileSystem.File(video);
      const fileBuffer = await file.bytes();

      if (user) {
        const videoUrl = await uploadVideoToStorage({ fileName, fileExtension, fileBuffer });
        await createPost({ video_url: videoUrl, description, user_id: user?.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      videoPlayer.release();
      setDescription("");
      setVideo("");
      router.replace("/");
    },
    onError: (error) => {
      console.log("Error creating post:", error.message);
      Alert.alert("Error creating post:", error.message);
    },
  });

  useEffect(() => {
    (async () => {
      if (permission && !permission.granted && permission.canAskAgain) {
        await requestPermission();
      }
      if (microphonePermission && !microphonePermission.granted && microphonePermission.canAskAgain) {
        await requestMicrophonePermission();
      }
    })();
  }, [permission, microphonePermission]);

  if (!permission || !microphonePermission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (
    (permission && !permission.granted && !permission.canAskAgain) ||
    (microphonePermission && !microphonePermission.granted && !microphonePermission.canAskAgain)
  ) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to use the camera and microphone</Text>
        <Button onPress={() => Linking.openSettings()} title="grant permission" />
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const selectFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: true,
      aspect: [9, 16],
    });

    if (!result.canceled) {
      setVideo(result.assets[0].uri);
      await videoPlayer.replaceAsync({ uri: result.assets[0].uri });
      videoPlayer.play();
    }
  };

  const dismissVideo = () => {
    setVideo("");
    videoPlayer.release();
  };

  const postVideo = () => {
    if (!video) {
      Alert.alert("No video to post");
      return;
    }
    createNewPost({ video, description });
  };

  const startRecording = async () => {
    setIsRecording(true);
    // Start recording logic here
    const recordingVideo = await cameraRef.current?.recordAsync();
    if (recordingVideo?.uri) {
      setVideo(recordingVideo.uri);
      await videoPlayer.replaceAsync({ uri: recordingVideo.uri });
      videoPlayer.play();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Stop recording logic here
    cameraRef.current?.stopRecording();
  };

  const renderCamera = () => {
    return (
      <View style={{ flex: 1 }}>
        <CameraView mode="video" ref={cameraRef} style={{ flex: 1 }} facing={facing} />
        <View style={styles.topbar}>
          <Ionicons name="close" size={40} color="white" onPress={() => router.back()} />
        </View>
        <View style={styles.bottomContainer}>
          <Ionicons name="images" size={40} color="white" onPress={selectFromGallery} />

          <TouchableOpacity style={[styles.recordButton, isRecording && styles.recordingButton]} onPress={isRecording ? stopRecording : startRecording} />
          <Ionicons name="camera-reverse" size={40} color="white" onPress={toggleCameraFacing} />
        </View>
      </View>
    );
  };

  const renderRecordedVideo = () => {
    return (
      <View style={{ flex: 1 }}>
        <Ionicons name="close" size={40} color="white" onPress={dismissVideo} style={styles.closeIcon} />

        <View style={styles.videoWrapper}>
          <VideoView player={videoPlayer} contentFit="cover" style={styles.video} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.descriptionContainer} keyboardVerticalOffset={20}>
          {/* <TextInput placeholder="Write a caption..." style={styles.input} multiline value={description} onChangeText={setDescription} /> */}

          <TouchableOpacity style={styles.postButton} onPress={postVideo}>
            <Text style={styles.postText}>Next</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    );
  };

  return (
    <>
      {/* {renderRecordedVideo()} */}
      {video ? renderRecordedVideo() : renderCamera()}
    </>
  );
};

export default NewPost;

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  permissionText: {
    textAlign: "center",
    marginBottom: 8,
    color: "#ff0000",
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: "white",
    backgroundColor: "red",
    alignSelf: "center",
    marginVertical: 20,
  },
  recordingButton: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: "white",
    backgroundColor: "red",
    alignSelf: "center",
    marginVertical: 20,
  },
  topbar: {
    position: "absolute",
    top: 50,
    left: 10,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  closeIcon: {
    position: "absolute",
    top: 50,
    left: 10,
    zIndex: 1,
  },
  video: {
    aspectRatio: 9 / 16,
  },
  input: {
    flex: 1,
    color: "white",
    backgroundColor: "#111",
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 10,
    maxHeight: 100,
  },
  postText: {
    color: "white",
    fontWeight: "700",
    fontSize: 17,
  },
  postButton: {
    backgroundColor: "#ff4040",
    paddingHorizontal: 35,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-end",
  },
  videoWrapper: {
    flex: 1,
  },
  descriptionContainer: {
    paddingHorizontal: 5,
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
});
