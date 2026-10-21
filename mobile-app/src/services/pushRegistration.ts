import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";
import api from "./api";
import { getToken } from "@/features/auth/storage/authStorage";
import { requestDeviceNotificationPermission, setupNotificationChannel, STORAGE_KEY_NOTIFS } from "./deviceNotificationService";

const TOKEN_KEY = "@ride4rent_push_token";

export async function registerPushDevice(): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice || isRunningInExpoGo()) return;
  if (await AsyncStorage.getItem(STORAGE_KEY_NOTIFS) === "false") return;
  try {
    const sessionToken = await getToken();
    if (!sessionToken) return;
    if (!await requestDeviceNotificationPermission()) return;
    await setupNotificationChannel();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    // Load only in an installed native app: Expo Go cannot register Android FCM.
    const { getExpoPushTokenAsync } = require("expo-notifications/build/getExpoPushTokenAsync");
    const token = (await getExpoPushTokenAsync({ projectId })).data;
    if (await getToken() !== sessionToken || await AsyncStorage.getItem(STORAGE_KEY_NOTIFS) === "false") return;
    await api.post("/notifications/devices", { token });
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.warn("Remote reminders unavailable; check EAS FCM credentials and backend deployment:", error);
  }
}

export async function unregisterPushDevice(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) await api.delete("/notifications/devices", { data: { token }, timeout: 5000 });
}
