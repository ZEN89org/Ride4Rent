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
                animation: "fade",
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
              <Stack.Screen name="profile" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="driver-license" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="vehicles/[id]" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="faq" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="terms" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="support" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="about" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="operator/[id]" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="chat/[id]" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="live-tracking" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="operator-maintenance" options={{ animation: "slide_from_right" }} />
            </Stack>
          </FavoritesProvider>
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
