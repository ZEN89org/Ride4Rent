import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import AppLogo from "@/components/common/AppLogo";
import ScreenContainer from "@/components/common/ScreenContainer";


import {
    getToken,
    getUser,
    isFirstLaunch,
} from "@/features/auth/storage/authStorage";

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
      const user = await getUser();

      if (token) {
        if (user?.role === "operator") {
          if (user.account_status === "pending") {
            router.replace("/operator-pending");
          } else if (user.account_status === "rejected") {
            router.replace("/operator-rejected");
          } else {
            router.replace("/operator-home");
          }
          return;
        }

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
