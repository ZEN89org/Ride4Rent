import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { Platform, StatusBar as RNStatusBar } from "react-native";
import { AuthProvider } from "../features/auth/context/AuthContext";
import { FavoritesProvider } from "../context/FavoritesContext";
import { ToastProvider } from "../context/ToastContext";
import { NotificationProvider } from "../context/NotificationContext";
import { Colors } from "../constants/colors";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <FavoritesProvider>
            {Platform.OS === "android" && (
              <RNStatusBar
                translucent
                backgroundColor="transparent"
                barStyle="dark-content"
              />
            )}
            <ExpoStatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                // Simple and smooth fade animation (no horizontal slide)
                animation: "fade",
                animationDuration: 200,
                gestureEnabled: true,
                contentStyle: { backgroundColor: "#FFFFFF" },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="landing" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="login" options={{ contentStyle: { backgroundColor: Colors.primary } }} />
              <Stack.Screen name="register" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </FavoritesProvider>
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
