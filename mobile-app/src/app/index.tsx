import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  getToken,
  getUser,
  isFirstLaunch,
} from "@/features/auth/storage/authStorage";

export default function Index() {
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const firstLaunch = await isFirstLaunch();

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
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
}