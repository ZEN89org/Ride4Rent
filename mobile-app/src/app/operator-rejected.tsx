import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    StyleSheet,
    Text,
    View,
} from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Spacing,
} from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function OperatorRejected() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/auth");
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="close-circle-outline"
            size={64}
            color="#D32F2F"
          />
        </View>

        <Text style={styles.title}>
          Registration Rejected
        </Text>

        <Text style={styles.message}>
          Your operator registration was not approved
          by the Ride4Rent Administrator.
        </Text>

        {user?.operator_profile?.rejection_reason ? (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonTitle}>
              Reason
            </Text>

            <Text style={styles.reason}>
              {user.operator_profile.rejection_reason}
            </Text>
          </View>
        ) : null}

        <PrimaryButton
          title="Return to Login"
          onPress={handleLogout}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },

  iconContainer: {
    marginBottom: Spacing.lg,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
    textAlign: "center",
  },

  message: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 24,
  },

  reasonContainer: {
    width: "100%",
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  reasonTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },

  reason: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.secondary,
    lineHeight: 21,
  },
});
