import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { Platform, StatusBar as RNStatusBar } from "react-native";
import { TripLocationProvider } from "../context/TripLocationContext";
import { AuthProvider } from "../features/auth/context/AuthContext";
import { FavoritesProvider } from "../context/FavoritesContext";
import { ToastProvider } from "../context/ToastContext";
import { NotificationProvider } from "../context/NotificationContext";
import { SideNavProvider } from "../context/SideNavContext";
import { CallProvider } from "../context/CallContext";
import { Colors } from "../constants/colors";

// Let Expo dismiss Android's launch window automatically on the first render.
// The two intentional splash animations are owned by index.tsx.
SplashScreen.setOptions({ fade: false, duration: 0 });

export default function RootLayout() {
  // Load fonts in parallel; the image-only startup animation must not wait for them.
  useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });


  return (
    <ToastProvider>
      <AuthProvider>
        <TripLocationProvider>
          <CallProvider>
            <NotificationProvider>
              <FavoritesProvider>
                <SideNavProvider>
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
                    animationDuration: 120,
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
                  <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="profile" />
                  <Stack.Screen name="driver-license" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="faq" />
                  <Stack.Screen name="terms" />
                  <Stack.Screen name="support" />
                  <Stack.Screen name="about" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="current-location" />
                </Stack>
                </SideNavProvider>
              </FavoritesProvider>
            </NotificationProvider>
          </CallProvider>
        </TripLocationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
