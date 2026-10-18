import AppLogo from "@/components/common/AppLogo";
import { Colors } from "@/constants/colors";
import {
  getToken,
  getUser,
  isFirstLaunch,
} from "@/features/auth/storage/authStorage";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

export default function Index() {
  const { width, height } = useWindowDimensions();
  // Adjust this value to move the artwork down and change the visible gap at the top.
  const artworkTopSpacing = height * 0.2;
  // This narrow primary-color box fills only the added top spacing, then slides away with the artwork.
  const primaryExtensionHeight = artworkTopSpacing;
  // Adjust this duration to control the upward slide speed.
  const slideUpDurationMs = 1500;
  // Adjust these offsets to move the logo's zoom origin left/right or up/down.
  const logoZoomOffsetX = 0;
  const logoZoomOffsetY = 0;
  // Adjust this duration to make the logo zoom faster or slower.
  const logoZoomDurationMs = 850;
  // Adjust this duration to control how quickly the white screen fades in after the zoom.
  const whiteFadeDurationMs = 350;
  // Adjust the base size or multiplier to control the logo's final zoom size.
  const logoBaseSize = 200;
  const logoZoomScale = (Math.max(width, height) / logoBaseSize) * 4;
  const [imageTranslateY] = useState(() => new Animated.Value(0));
  const [logoOpacity] = useState(() => new Animated.Value(0));
  const [logoScale] = useState(() => new Animated.Value(1));
  const [whiteFadeOpacity] = useState(() => new Animated.Value(0));
  const [artworkLoaded, setArtworkLoaded] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!artworkLoaded) {
      return;
    }

    isMounted.current = true;
    imageTranslateY.setValue(0);
    logoOpacity.setValue(0);
    logoScale.setValue(1);
    whiteFadeOpacity.setValue(0);

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
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.delay(500),
          Animated.parallel([
            Animated.timing(logoScale, {
              toValue: logoZoomScale,
              duration: logoZoomDurationMs,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
              toValue: 0,
              duration: logoZoomDurationMs,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(whiteFadeOpacity, {
            toValue: 1,
            duration: whiteFadeDurationMs,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(120),
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
      logoScale.stopAnimation();
      whiteFadeOpacity.stopAnimation();
    };
  }, [
    artworkLoaded,
    artworkTopSpacing,
    height,
    imageTranslateY,
    logoOpacity,
    logoScale,
    logoZoomDurationMs,
    logoZoomScale,
    slideUpDurationMs,
    whiteFadeDurationMs,
    whiteFadeOpacity,
  ]);

  const handleArtworkLoad = () => {
    setArtworkLoaded(true);
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch((error) => {
        console.error("Failed to hide the native splash screen:", error);
      });
    });
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
        <View
          style={[
            styles.primaryExtension,
            { height: primaryExtensionHeight },
          ]}
        />
        <Animated.Image
          source={require("@/assets/images/1st.png")}
          resizeMode="cover"
          onLoad={handleArtworkLoad}
          onError={handleArtworkError}
          style={[
            styles.splashArtwork,
            {
              top: artworkTopSpacing,
              height,
            },
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.secondSplash, { opacity: logoOpacity }]}>
        <Animated.View
          style={{
            transform: [
              { translateX: logoZoomOffsetX },
              { translateY: logoZoomOffsetY },
              { scale: logoScale },
            ],
          }}
        >
          <AppLogo size={logoBaseSize} />
        </Animated.View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.whiteFade, { opacity: whiteFadeOpacity }]}
      />
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
  primaryExtension: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary,
  },
  splashArtwork: {
    position: "absolute",
    left: 0,
    width: "100%",
  },
  secondSplash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  whiteFade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FFFFFF",
  },
});
