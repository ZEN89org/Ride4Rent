import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import AppLogo from "@/components/AppLogo";
import PrimaryButton from "@/components/PrimaryButton";
import ScreenContainer from "@/components/ScreenContainer";
import SecondaryButton from "@/components/SecondaryButton";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";

export default function Auth() {

  return (

    <ScreenContainer>

      <View style={styles.container}>

        <View style={styles.centerContent}>

          <AppLogo />

          <Text style={styles.brand}>
            Ride4Rent
          </Text>

        </View>

        <View style={styles.bottomContent}>

          <Text style={styles.tagline}>
            Find your perfect ride
          </Text>

          <PrimaryButton
            title="Sign In"
            onPress={() => router.push("/login")}
          />

          <View style={styles.spacing} />

          <SecondaryButton
            title="Create Account"
            onPress={() => router.push("/register")}
          />

        </View>

      </View>

    </ScreenContainer>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    justifyContent: "space-between",

    padding: Spacing.lg,

  },

  centerContent: {

    flex: 1,

    justifyContent: "center",

    alignItems: "center",

  },

  brand: {

    marginTop: -20,

    fontSize: FontSize.heading,

    fontFamily: FontFamily.medium,

    color: Colors.dark,

  },

  bottomContent: {

    paddingBottom: Spacing.xl,

  },

  tagline: {

    textAlign: "center",

    marginBottom: Spacing.lg,

    color: Colors.secondary,

    fontSize: FontSize.body,

  },

  spacing: {

    height: Spacing.md,

  },

});
