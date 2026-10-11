import {
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
  hasGlowShadow?: boolean;
}

export default function OnboardingSlide({
  image,
  imageWidth,
  imageHeight,
  title,
  description,
  hasGlowShadow = false,
}: Props) {
  return (
    <View style={[styles.container, { width }]}>
      <View
        style={[
          styles.imageWrapper,
          hasGlowShadow && styles.glowContainer,
        ]}
      >
        {hasGlowShadow && (
          <View
            style={[
              styles.glowBackdrop,
              {
                width: imageWidth * 0.94,
                height: imageHeight * 0.62,
                top: imageHeight * 0.28,
              },
            ]}
          />
        )}

        <Image
          source={image}
          contentFit="contain"
          style={{
            width: imageWidth,
            height: imageHeight,
            alignSelf: "center",
          }}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },

  imageWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },

  glowContainer: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 10,
  },

  glowBackdrop: {
    position: "absolute",
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 14,
  },

  textContainer: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
    textAlign: "center",
  },

  description: {
    marginTop: 8,
    textAlign: "center",
    color: Colors.secondary,
    lineHeight: 24,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
  },
});
