import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/PrimaryButton";
import ScreenContainer from "@/components/ScreenContainer";

import { useAuth } from "@/hooks/useAuth";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

export default function Bookings() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isGuest) {
      router.replace("/auth");
    }
  }, [auth.isGuest]);

  if (auth.isGuest || !auth.user) {
    return null;
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
