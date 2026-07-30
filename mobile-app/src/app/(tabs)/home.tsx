import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import AuthRequiredBottomSheet from "@/components/AuthRequiredBottomSheet";
import PrimaryButton from "@/components/PrimaryButton";
import ScreenContainer from "@/components/ScreenContainer";

import { useAuth } from "@/hooks/useAuth";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";

export default function Home() {
  const {
    user,
    isGuest,
  } = useAuth();

  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const handleBookVehicle = () => {
    if (isGuest) {
      setShowAuthSheet(true);
      return;
    }

    router.push("/(tabs)/bookings");
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>

        <Text style={styles.title}>
          Welcome to Ride4Rent
        </Text>

        <Text style={styles.subtitle}>
          {isGuest
            ? "You are browsing as Guest"
            : `You are browsing as ${user?.name}`}
        </Text>

        <PrimaryButton
          title="Book a Vehicle"
          onPress={handleBookVehicle}
        />

      </View>

      <AuthRequiredBottomSheet
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
      />

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },

  title: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    marginBottom: Spacing.xl,
    fontFamily: FontFamily.regular,
    color: Colors.secondary,
    textAlign: "center",
  },
});
