import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";

import { useAuth } from "@/features/auth/hooks/useAuth";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";

export default function Bookings() {
  const auth = useAuth();

  if (auth.isGuest || !auth.user) {
    return (
      <ScreenContainer>
        <View style={styles.guestContainer}>
          <Text style={styles.title}>
            Bookings
          </Text>

          <Text style={styles.subtitle}>
            Sign in to view and manage your bookings.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const logout = async () => {
    await auth.logout();
    router.replace("/");
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>
          Bookings
        </Text>

        <Text style={styles.subtitle}>
          Your bookings will appear here.
        </Text>

        <View style={styles.userSection}>
          <Text style={styles.sectionTitle}>
            Account Information
          </Text>

          <Text style={styles.info}>
            {auth.user.name}
          </Text>

          <Text style={styles.info}>
            {auth.user.email}
          </Text>

          <Text style={styles.info}>
            {auth.user.phone_number || "No phone number"}
          </Text>

          <Text style={styles.info}>
            Role: {auth.user.role}
          </Text>
        </View>

        <PrimaryButton
          title="Logout"
          onPress={logout}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },

  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },

  title: {
    marginTop: Spacing.lg,
    fontSize: FontSize.heading,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },

  subtitle: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    color: Colors.secondary,
    textAlign: "center",
  },

  userSection: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },

  sectionTitle: {
    marginBottom: Spacing.md,
    fontSize: FontSize.title,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },

  info: {
    marginBottom: 10,
    fontSize: FontSize.body,
    fontFamily: FontFamily.regular,
    color: Colors.secondary,
  },
});
