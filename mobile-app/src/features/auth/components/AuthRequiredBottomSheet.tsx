import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { FontSize, Radius, Spacing } from "@/constants/theme";

interface AuthRequiredBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const { height } = Dimensions.get("window");

export default function AuthRequiredBottomSheet({
  visible,
  onClose,
}: AuthRequiredBottomSheetProps) {
  const [translateY] = useState(() => new Animated.Value(height));
  const [backdropOpacity] = useState(() => new Animated.Value(0));

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }, [translateY, backdropOpacity, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return gestureState.dy > 5;
        },

        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },

        onPanResponderRelease: (_, gestureState) => {
          if (
            gestureState.dy > 100 ||
            gestureState.vy > 1
          ) {
            closeSheet();
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [translateY, closeSheet]
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    translateY.setValue(height);
    backdropOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateY, backdropOpacity]);

  const continueToAuth = () => {
    closeSheet();

    setTimeout(() => {
      router.push("/auth");
    }, 220);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={closeSheet}
    >
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <Pressable
            style={styles.backdrop}
            onPress={closeSheet}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />

          <Pressable
            style={styles.closeButton}
            onPress={closeSheet}
            hitSlop={10}
          >
            <Ionicons
              name="close"
              size={24}
              color={Colors.secondary}
            />
          </Pressable>

          <View style={styles.iconContainer}>
            <Ionicons
              name="warning"
              size={30}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.title}>
            Sign In Required
          </Text>

          <Text style={styles.description}>
            You’re currently browsing as a guest. Create an
            account or sign in to access all features and enjoy
            a personalized, secure experience.
          </Text>

          <Pressable
            style={styles.continueButton}
            onPress={continueToAuth}
          >
            <Text style={styles.continueText}>
              Continue
            </Text>
          </Pressable>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },

  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
    paddingBottom: 35,
    minHeight: 360,
    elevation: 12,

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: -4,
    },
  },

  handle: {
    width: 45,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D0D0D0",
    alignSelf: "center",
    marginBottom: 10,
  },

  closeButton: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFF5CC",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 18,
    marginBottom: 18,
  },

  title: {
    fontSize: FontSize.heading,
    fontWeight: "700",
    color: Colors.dark,
    textAlign: "center",
  },

  description: {
    fontSize: FontSize.body,
    color: Colors.secondary,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 16,
  },

  continueButton: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },

  continueText: {
    fontSize: FontSize.body,
    fontWeight: "700",
    color: Colors.white,
  },
});
