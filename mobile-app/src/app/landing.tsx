import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/PrimaryButton";
import ScreenContainer from "@/components/ScreenContainer";
import SecondaryButton from "@/components/SecondaryButton";

import { Colors } from "@/constants/colors";
import { FontSize, Spacing } from "@/constants/theme";
import { resetFirstLaunch } from "@/storage/authStorage";

export default function Landing() {

const handleResetFirstLaunch = async () => {
  await resetFirstLaunch();
  router.dismissAll();
  router.replace("/");
};

  return (

    <ScreenContainer>

      <View style={styles.container}>

        <Text style={styles.title}>
          Ride4Rent
        </Text>

        <Text style={styles.subtitle}>
          Continue as a guest or sign in to access all features.
        </Text>

        <PrimaryButton
          title="Continue as Guest"
          onPress={() => router.push("/(tabs)/home")}
        />

        <View style={{ height: 12 }} />

        <SecondaryButton
          title="Login"
          onPress={() => router.push("/auth")}
        />

        <View style={{ height: 12 }} />

        <SecondaryButton
          title="Register"
          onPress={() => router.push("/register")}
        />

        {__DEV__ && (

          <View style={styles.devContainer}>

            <Text style={styles.devTitle}>
              Developer Tools
            </Text>

            <SecondaryButton
              title="Reset First Launch"
              onPress={handleResetFirstLaunch}
            />

          </View>

        )}

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

    color: Colors.dark,

    textAlign: "center",

    marginBottom: 10,

  },

  subtitle: {

    textAlign: "center",

    color: Colors.secondary,

    marginBottom: 40,

  },

  devContainer: {

    marginTop: 50,

    borderTopWidth: 1,

    borderColor: Colors.border,

    paddingTop: 20,

  },

  devTitle: {

    textAlign: "center",

    marginBottom: 12,

    color: Colors.secondary,

    fontSize: 13,

  },

});
