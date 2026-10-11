import {
  Animated,
  Dimensions,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

interface Props {
  image: ImageSourcePropType;
  imageWidth: number;
  imageHeight: number;
  title: string;
  description: string;
  isFullTop?: boolean;
  contentFit?: "contain" | "cover";
  contentPosition?: "top" | "center";
  textPaddingHorizontal?: number;
  textPaddingTop?: number;
  textPaddingBottom?: number;
  index?: number;
  scrollX?: Animated.Value;
}

export default function OnboardingSlide({
  image,
  imageWidth,
  imageHeight,
  title,
  description,
  isFullTop = false,
  contentFit = "contain",
  contentPosition = "center",
  textPaddingHorizontal,
  textPaddingTop,
  textPaddingBottom,
  index = 0,
  scrollX,
}: Props) {
  // Smooth animated interpolations when transitioning between slides
  let textOpacity: any = 1;
  let textTranslateY: any = 0;
  let imageScale: any = 1;
  let imageOpacity: any = 1;

  if (scrollX) {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    textOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: "clamp",
    });

    textTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [18, 0, 18],
      extrapolate: "clamp",
    });

    imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.94, 1, 0.94],
      extrapolate: "clamp",
    });

    imageOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
      extrapolate: "clamp",
    });
  }

  if (isFullTop) {
    return (
      <View style={[styles.containerFull, { width }]}>
        <Animated.View
          style={[
            styles.topFullImageWrapper,
            {
              height: imageHeight,
              opacity: imageOpacity,
              transform: [{ scale: imageScale }],
            },
          ]}
        >
          <Image
            source={image}
            contentFit={contentFit}
            contentPosition={contentPosition}
            priority="high"
            cachePolicy="memory-disk"
            transition={0}
            style={styles.topFullImage}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainerFull,
            textPaddingHorizontal !== undefined && { paddingHorizontal: textPaddingHorizontal },
            textPaddingTop !== undefined && { paddingTop: textPaddingTop },
            textPaddingBottom !== undefined && { paddingBottom: textPaddingBottom },
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width }]}>
      <Animated.View
        style={[
          styles.imageWrapper,
          {
            opacity: imageOpacity,
            transform: [{ scale: imageScale }],
          },
        ]}
      >
        <Image
          source={image}
          contentFit={contentFit}
          contentPosition={contentPosition}
          priority="high"
          cachePolicy="memory-disk"
          transition={0}
          style={{
            width: imageWidth,
            height: imageHeight,
            alignSelf: "center",
          }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.textContainer,
          textPaddingHorizontal !== undefined && { paddingHorizontal: textPaddingHorizontal },
          textPaddingTop !== undefined && { paddingTop: textPaddingTop },
          textPaddingBottom !== undefined && { paddingBottom: textPaddingBottom },
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 0,
  },

  containerFull: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
  },

  topFullImageWrapper: {
    width: "100%",
    overflow: "hidden",
  },

  topFullImage: {
    width: "100%",
    height: "100%",
  },

  imageWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  textContainer: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },

  textContainerFull: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    paddingBottom: Spacing.md,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
    textAlign: "center",
  },

  description: {
    marginTop: 6,
    textAlign: "center",
    color: Colors.secondary,
    lineHeight: 24,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
  },
});
