import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";

type RegistrationRoleBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelectRenter: () => void;
  onSelectOperator: () => void;
};

const { height } = Dimensions.get("window");

export default function RegistrationRoleBottomSheet({
  visible,
  onClose,
  onSelectRenter,
  onSelectOperator,
}: RegistrationRoleBottomSheetProps) {
  const [translateY] = useState(
    () => new Animated.Value(height)
  );

  const [backdropOpacity] = useState(
    () => new Animated.Value(0)
  );

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 220,
        useNativeDriver: true,
      }),

      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }, [
    translateY,
    backdropOpacity,
    onClose,
  ]);

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
  }, [
    visible,
    translateY,
    backdropOpacity,
  ]);

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
              tension: 65,
              friction: 11,
            }).start();
          }
        },
      }),
    [translateY, closeSheet]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={closeSheet}
    >
      <View style={styles.container}>

        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeSheet}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY,
                },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>
            Create an Account
          </Text>

          <Text style={styles.subtitle}>
            Choose how you want to use Ride4Rent.
          </Text>

          <Pressable
            style={styles.roleOption}
            onPress={onSelectRenter}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name="person-outline"
                size={24}
                color={Colors.primary}
              />
            </View>

            <View style={styles.roleContent}>
              <Text style={styles.roleTitle}>
                Renter
              </Text>

              <Text style={styles.roleDescription}>
                Find and rent vehicles near you.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.secondary}
            />
          </Pressable>

          <Pressable
            style={styles.roleOption}
            onPress={onSelectOperator}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name="car-outline"
                size={24}
                color={Colors.primary}
              />
            </View>

            <View style={styles.roleContent}>
              <Text style={styles.roleTitle}>
                Operator
              </Text>

              <Text style={styles.roleDescription}>
                List and manage your rental vehicles.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.secondary}
            />
          </Pressable>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D9D9D9",
    marginBottom: Spacing.lg,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    textAlign: "center",
  },

  subtitle: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
  },

  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 76,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 16,
    backgroundColor: "#F7F7F7",
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },

  roleContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  roleTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  roleDescription: {
    marginTop: 3,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },

});
