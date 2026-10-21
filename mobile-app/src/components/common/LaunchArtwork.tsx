import { Animated, Easing, Image, ImageProps, View, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

export const FIRST_SPLASH_TOP_RATIO = 0.2;
export const FIRST_SPLASH_FADE_MS = 600;

// Keep the artwork fade stable across rerenders while its slide starts on image load.
const artworkOpacity = new Animated.Value(0);
let fadeStartedAt: number | null = null;

export default function LaunchArtwork({ height, topSpacing, onLoad, onError }: {
  height: number;
  topSpacing: number;
  onLoad?: ImageProps["onLoad"];
  onError?: ImageProps["onError"];
}) {
  const handleLoad: NonNullable<ImageProps["onLoad"]> = (event) => {
    if (fadeStartedAt === null) fadeStartedAt = Date.now();
    const remaining = Math.max(0, FIRST_SPLASH_FADE_MS - (Date.now() - fadeStartedAt));
    if (remaining === 0) artworkOpacity.setValue(1);
    else Animated.timing(artworkOpacity, { toValue: 1, duration: remaining, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    onLoad?.(event);
  };

  return (
    <Animated.View style={[styles.frame, { height: height + topSpacing, opacity: artworkOpacity }]}>
      <View style={[styles.topExtension, { height: topSpacing }]} />
      <Image source={require("@/assets/images/1st.png")} resizeMode="cover"
        onLoad={handleLoad} onError={onError}
        style={{ position: "absolute", left: 0, top: topSpacing, width: "100%", height }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { position: "absolute", top: 0, left: 0, right: 0 },
  topExtension: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: Colors.primary },
});
