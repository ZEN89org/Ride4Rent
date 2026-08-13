import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";

type AnimatedBackdropProps = {
  visible: boolean;
  onPress: () => void;
};

export default function AnimatedBackdrop({
  visible,
  onPress,
}: AnimatedBackdropProps) {
  const [opacity] = useState(
    () => new Animated.Value(0)
  );

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.container,
        {
          opacity,
        },
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onPress}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
});
