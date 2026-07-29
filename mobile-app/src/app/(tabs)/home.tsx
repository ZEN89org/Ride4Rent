import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";

import ScreenContainer from "@/components/ScreenContainer";
import PrimaryButton from "@/components/PrimaryButton";

import { useAuth } from "@/hooks/useAuth";

import { Colors } from "@/constants/colors";
import { FontSize, Spacing } from "@/constants/theme";

export default function Home() {

  const {

    user,

    isGuest,

  } = useAuth();

  const handleBookVehicle = () => {

    if (isGuest) {

      router.push("/auth");

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
            : `You are browsing as ${user.name}`}

        </Text>

        <PrimaryButton
          title="Book a Vehicle"
          onPress={handleBookVehicle}
        />

      </View>

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

    fontWeight: "700",

    textAlign: "center",

    marginBottom: 12,

    color: Colors.dark,

  },

  subtitle: {

    textAlign: "center",

    marginBottom: 35,

    color: Colors.secondary,

  },

});