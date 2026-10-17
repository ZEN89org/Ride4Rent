import { Animated, Dimensions, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";
import { Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  currentIndex?: number;
  scrollX?: Animated.Value;
  total: number;
}

export default function Pagination({
  currentIndex = 0,
  scrollX,
  total,
}: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => {
        if (scrollX) {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: "clamp",
          });

          const scaleX = scrollX.interpolate({
            inputRange,
            outputRange: [10 / 28, 1, 10 / 28],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    currentIndex === index ? Colors.primary : "#D0D0D0",
                  opacity,
                  transform: [{ scaleX }],
                },
              ]}
            />
          );
        }

        return (
          <View
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.active : styles.inactive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },

  dot: {
    width: 28,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },

  inactive: {
    width: 10,
    backgroundColor: "#D0D0D0",
  },

  active: {
    width: 28,
    backgroundColor: Colors.primary,
  },
});