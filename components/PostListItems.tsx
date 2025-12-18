// import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { Dimensions, View } from "react-native";

const videoSource = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function PostListItems() {
  const { height } = Dimensions.get("window");

  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });

  //   const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });

  return (
    <View style={{ height }}>
      <VideoView style={{ flex: 1 }} player={player} contentFit="cover" nativeControls={false} />
    </View>
  );
}

// const styles = StyleSheet.create({
//   contentContainer: {
//     flex: 1,
//     padding: 10,
//     alignItems: "center",
//     justifyContent: "center",
//     paddingHorizontal: 50,
//   },
//   video: {
//     width: 350,
//     height: 500,
//   },
//   controlsContainer: {
//     padding: 10,
//   },
// });
