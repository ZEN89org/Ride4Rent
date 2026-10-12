import AppLogo from "@/components/common/AppLogo";
import {
  getToken,
  getUser,
  isFirstLaunch,
} from "@/features/auth/storage/authStorage";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

export default function Index() {
  useEffect(() => {
    let isMounted = true;

    // Immediately hide the native OS splash screen so our unified in-app splash with AppLogo takes over smoothly
    SplashScreen.hideAsync().catch(() => {});

    const initialize = async () => {
      const minSplashTime = new Promise((resolve) => setTimeout(resolve, 600));

      try {
        const [firstLaunch] = await Promise.all([
          isFirstLaunch(),
          minSplashTime,
        ]);

        if (firstLaunch) {
          if (isMounted) {
            router.replace("/onboarding");
          }
          return;
        }

        const token = await getToken();
        const user = await getUser();

        if (token) {
          if (user?.role === "operator") {
            if (user?.account_status === "rejected") {
              if (isMounted) router.replace("/operator-rejected");
            } else {
              if (isMounted) router.replace("/operator-home");
            }
            return;
          }

          if (isMounted) router.replace("/(tabs)/home");
        } else {
          if (isMounted) router.replace("/auth");
        }
      } catch {
        if (isMounted) router.replace("/auth");
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <AppLogo size={200} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
