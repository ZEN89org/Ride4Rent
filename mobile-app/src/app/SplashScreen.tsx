import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import AppLogo from "@/components/AppLogo";
import ScreenContainer from "@/components/ScreenContainer";

import { Colors } from "@/constants/colors";

import { getToken, isFirstLaunch } from "@/storage/authStorage";

export default function SplashScreen() {

  useEffect(() => {

    const initialize = async () => {

      await new Promise(resolve => setTimeout(resolve, 3000));

      const firstLaunch = await isFirstLaunch();

      if (firstLaunch) {

        router.replace("/onboarding");

        return;

      }

      const token = await getToken();

      if (token) {

        router.replace("/(tabs)/home");

      } else {

        router.replace("/auth");

      }

    };

    initialize();

  }, []);

  return (

    <ScreenContainer>

      <View style={styles.container}>

        <AppLogo />

      </View>

    </ScreenContainer>

  );

}

const styles = StyleSheet.create({

  container: {

    flex: 1,

    justifyContent: "center",

    alignItems: "center",

  },

});