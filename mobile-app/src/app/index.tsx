import LaunchArtwork, { FIRST_SPLASH_TOP_RATIO } from "@/components/common/LaunchArtwork";
import AppLogo from "@/components/common/AppLogo";
import {
  getToken,
  getUser,
  isFirstLaunch,
} from "@/features/auth/storage/authStorage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

export default function Index() {
  const { height } = useWindowDimensions();
  // Adjust this value to move the artwork down and change the visible gap at the top.
  const artworkTopSpacing = height * FIRST_SPLASH_TOP_RATIO;
  // Adjust this duration to control the upward slide speed.
  const slideUpDurationMs = 1500;
  const logoFadeDurationMs = 650;
  const logoBaseSize = 200;
  const [imageTranslateY] = useState(() => new Animated.Value(0));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [artworkLoaded, setArtworkLoaded] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!artworkLoaded) {
      return;
    }

    isMounted.current = true;
    imageTranslateY.setValue(0);
    logoOpacity.setValue(0);

    const initialize = async (): Promise<
      | "/onboarding"
      | "/operator-rejected"
      | "/operator-home"
      | "/(tabs)/home"
      | "/auth"
    > => {
      try {
        if (await isFirstLaunch()) {
          return "/onboarding";
        }

        const token = await getToken();
        if (!token) {
          return "/auth";
        }

        const user = await getUser();
        if (user?.role === "operator") {
          return user.account_status === "rejected"
            ? "/operator-rejected"
            : "/operator-home";
        }

        return "/(tabs)/home";
      } catch {
        return "/auth";
      }
    };

    const playSplashSequence = () =>
      new Promise<void>((resolve) => {
        Animated.sequence([
          Animated.timing(imageTranslateY, {
            toValue: -(height + artworkTopSpacing),
            duration: slideUpDurationMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.delay(500),
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: logoFadeDurationMs,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            resolve();
          }
        });
      });

    Promise.all([initialize(), playSplashSequence()]).then(([destination]) => {
      if (isMounted.current) {
        router.replace(destination);
      }
    });

    return () => {
      isMounted.current = false;
      imageTranslateY.stopAnimation();
      logoOpacity.stopAnimation();
    };
  }, [
    artworkLoaded,
    artworkTopSpacing,
    height,
    imageTranslateY,
    logoOpacity,
    slideUpDurationMs,
  ]);

  const handleArtworkLoad = () => {
    setArtworkLoaded(true);
  };

  const handleArtworkError = (event: {
    nativeEvent: { error: string };
  }) => {
    console.error("Failed to load the first splash artwork:", event.nativeEvent.error);
    handleArtworkLoad();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.firstSplash,
          {
            height: height + artworkTopSpacing,
            transform: [{ translateY: imageTranslateY }],
          },
        ]}
      >
        <LaunchArtwork height={height} topSpacing={artworkTopSpacing} onLoad={handleArtworkLoad} onError={handleArtworkError} />
      </Animated.View>
      <Animated.View style={[styles.secondSplash, { opacity: logoOpacity }]}>
        <AppLogo size={logoBaseSize} />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  firstSplash: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  secondSplash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

});
