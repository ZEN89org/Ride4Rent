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
  isFullTop?: boolean;
}

export default function OnboardingSlide({
  image,
  imageWidth,
  imageHeight,
  title,
  description,
  isFullTop = false,
}: Props) {
  if (isFullTop) {
    return (
      <View style={[styles.containerFull, { width }]}>
        <View style={[styles.topFullImageWrapper, { height: imageHeight }]}>
          <Image
            source={image}
            contentFit="fill"
            style={styles.topFullImage}
          />
        </View>

        <View style={styles.textContainerFull}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.imageWrapper}>
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
    marginTop: 8,
    textAlign: "center",
    color: Colors.secondary,
    lineHeight: 24,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
  },
});
