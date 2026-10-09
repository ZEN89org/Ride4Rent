import { router } from "expo-router";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Radius,
    Spacing,
} from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function OperatorPending() {
  const {
    user,
    isOperatorPending,
    logout,
  } = useAuth();

  if (!isOperatorPending) {
    router.replace("/login");
    return null;
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>!</Text>
        </View>

        <Text style={styles.title}>
          Registration Under Review
        </Text>

        <Text style={styles.subtitle}>
          Thank you for registering as a Ride4Rent
          operator.
        </Text>

        <Text style={styles.description}>
          Your registration and business documents
          are currently being reviewed by the
          Ride4Rent Administrator.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.label}>
            Account
          </Text>

          <Text style={styles.value}>
            {user?.email}
          </Text>

          <Text style={styles.label}>
            Business
          </Text>

          <Text style={styles.value}>
            {user?.operatorProfile?.business_name ??
              "Your registered business"}
          </Text>

          <Text style={styles.label}>
            Status
          </Text>

          <Text style={styles.status}>
            Pending Administrator Review
          </Text>
        </View>

        <Text style={styles.note}>
          You can navigate and preview your Operator Dashboard while your application is under review. Full features such as vehicle publishing and bookings will unlock upon approval.
        </Text>

        <PrimaryButton style={{ width: "100%" }}
          title="Explore Operator Dashboard"
          onPress={() => router.replace("/operator-home")}
        />

        <TouchableOpacity
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
          style={styles.backToLoginButton}
          activeOpacity={0.7}
        >
          <Text style={styles.backToLoginText}>Sign Out & Back to Login</Text>
        </TouchableOpacity>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF4E8",
    marginBottom: Spacing.lg,
  },

  icon: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    color: Colors.primary,
  },

  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    textAlign: "center",
  },

  subtitle: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.dark,
    textAlign: "center",
  },

  description: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.secondary,
    textAlign: "center",
  },

  infoCard: {
    width: "100%",
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: "#F7F7F7",
  },

  label: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },

  value: {
    marginTop: 2,
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
  },

  status: {
    marginTop: 2,
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },

  note: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.secondary,
    textAlign: "center",
  },

  backToLoginButton: {
    marginTop: Spacing.md,
    paddingVertical: 12,
    alignItems: "center",
  },

  backToLoginText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.secondary,
  },
});
