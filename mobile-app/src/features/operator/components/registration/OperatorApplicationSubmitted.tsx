import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    View
} from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Radius,
    Spacing,
} from "@/constants/theme";

type OperatorApplicationSubmittedBottomSheetProps = {
  visible: boolean;
  onBackToLogin: () => void;
};

const { height } = Dimensions.get("window");

export default function OperatorApplicationSubmittedBottomSheet({
  visible,
  onBackToLogin,
}: OperatorApplicationSubmittedBottomSheetProps) {
  const [translateY] = useState(
    () => new Animated.Value(height)
  );

  const [backdropOpacity] = useState(
    () => new Animated.Value(0)
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
  }, [
    visible,
    translateY,
    backdropOpacity,
  ]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        />

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
        >
          <View style={styles.handle} />

          <View style={styles.iconContainer}>
            <Ionicons
              name="checkmark"
              size={32}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.title}>
            Application Submitted!
          </Text>

          <Text style={styles.description}>
            Thank you for registering as a Ride4Rent
            Operator.
          </Text>

          <Text style={styles.description}>
            Our team is reviewing your application to
            ensure a safe and trusted marketplace.
          </Text>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>
              Estimated review time
            </Text>

            <Text style={styles.reviewTime}>
              12–24 Hours
            </Text>
          </View>

          <Text style={styles.notificationText}>
            We’ll notify you once your account has been
            approved.
          </Text>

          <PrimaryButton
            title="Back to Login"
            onPress={onBackToLogin}
            style={styles.button}
          />
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
    marginBottom: Spacing.xl,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E8",
    marginBottom: Spacing.lg,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    textAlign: "center",
  },

  description: {
    marginTop: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: 23,
    color: Colors.secondary,
    textAlign: "center",
  },

  reviewCard: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: "#F7F7F7",
    alignItems: "center",
  },

  reviewLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
  },

  reviewTime: {
    marginTop: 4,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  notificationText: {
    marginTop: Spacing.lg,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.secondary,
    textAlign: "center",
  },

  button: {
    marginTop: Spacing.xl,
  },
});
