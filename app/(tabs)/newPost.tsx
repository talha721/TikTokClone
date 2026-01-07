import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

const NewPost = () => {
  const [facing, setFacing] = useState<CameraType>("back");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [video, setVideo] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();

  const videoPlayer = useVideoPlayer(null, (player) => {
    player.loop = true;
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

  const selectFromGallery = () => {
    // router.push("/(tabs)/newPost/gallery");
  };

  const dismissVideo = () => {};
  const postVideo = () => {};

  const startRecording = async () => {
    setIsRecording(true);
    // Start recording logic here
    const recordingVideo = await cameraRef.current?.recordAsync();
    if (recordingVideo?.uri) {
      // Handle the recorded video (e.g., navigate to a preview screen)
      console.log("Video recorded:", recordingVideo.uri);
      setVideo(recordingVideo.uri);
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
        <VideoView player={videoPlayer} contentFit="cover" style={styles.video} />

        <TextInput
          placeholder="Write a caption..."
          style={{ position: "absolute", bottom: 100, left: 10, right: 10, height: 40, backgroundColor: "white", paddingHorizontal: 10, borderRadius: 5 }}
          multiline
          value={description}
          onChangeText={setDescription}
        />
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 40,
            left: 10,
            right: 10,
            backgroundColor: "blue",
            padding: 15,
            borderRadius: 5,
            alignItems: "center",
          }}
          onPress={postVideo}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Upload</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return <>{video ? renderRecordedVideo() : renderCamera()}</>;
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
  },
  video: {
    flex: 1,
  },
});
