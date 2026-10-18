import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily } from "@/constants/theme";

interface Props {
  onPress: () => void;
}

const FAB_SIZE = 56;
const SIDE_MARGIN = 16;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function createAssistantPanResponder(
  pan: Animated.ValueXY,
  onPress: () => void,
) {
  let dragDistance = 0;
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.hypot(gestureState.dx, gestureState.dy) > 4;
    },
    onPanResponderGrant: () => {
      dragDistance = 0;
      pan.setOffset({
        x: (pan.x as any)._value,
        y: (pan.y as any)._value,
      });
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (_, gestureState) => {
      dragDistance = Math.hypot(gestureState.dx, gestureState.dy);
      pan.setValue({ x: gestureState.dx, y: gestureState.dy });
    },
    onPanResponderRelease: (_, gestureState) => {
      pan.flattenOffset();
      const dist = Math.hypot(gestureState.dx, gestureState.dy);

      // If user tapped without dragging, trigger open
      if (dist < 8 && dragDistance < 8) {
        onPress();
        return;
      }

      const curX = (pan.x as any)._value;
      const curY = (pan.y as any)._value;

      // Auto-dock to closest edge (Left or Right side of the screen)
      const snapX =
        curX + FAB_SIZE / 2 < SCREEN_WIDTH / 2
          ? SIDE_MARGIN
          : SCREEN_WIDTH - FAB_SIZE - SIDE_MARGIN;

      // Keep vertical position within visible viewport (away from top notch & bottom tabs)
      const clampedY = Math.min(
        Math.max(60, curY),
        SCREEN_HEIGHT - FAB_SIZE - 95,
      );

      Animated.spring(pan, {
        toValue: { x: snapX, y: clampedY },
        useNativeDriver: false,
        friction: 6,
        tension: 45,
      }).start();
    },
  });
}

export default function FloatingAssistantFab({ onPress }: Props) {
  const pulseAnim = useState(() => new Animated.Value(1))[0];
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Initial draggable position (docked on the right edge above tab bar)
  const initialX = SCREEN_WIDTH - FAB_SIZE - SIDE_MARGIN;
  const initialY = SCREEN_HEIGHT - 170;

  const pan = useState(
    () => new Animated.ValueXY({ x: initialX, y: initialY }),
  )[0];

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      );

      pulseLoop.start();
      return () => {
        pulseLoop.stop();
        pulseAnim.setValue(1);
      };
    }, [pulseAnim]),
  );

  const panResponder = useMemo(
    () => createAssistantPanResponder(pan, onPress),
    [pan, onPress],
  );

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.fabButton,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={styles.iconWrapper}>
          <MaterialCommunityIcons
            name="robot-excited-outline"
            size={26}
            color={Colors.white}
          />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>AI</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: 9999,
    elevation: 10,
  },
  fabButton: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 9,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: Colors.dark,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.primary,
  },
});
