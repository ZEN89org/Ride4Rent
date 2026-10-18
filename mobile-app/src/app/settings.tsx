import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";


import { Colors } from "@/constants/colors";
import { FontFamily, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import {
  cancelAllBookingReminders,
  STORAGE_KEY_BOOKING_REMINDERS,
  STORAGE_KEY_LOCATION,
  STORAGE_KEY_NOTIFS,
} from "@/services/deviceNotificationService";

let Notifications: any = null;
try {
  Notifications = require("expo-notifications/build/NotificationPermissions");
} catch {
  try {
    Notifications = require("expo-notifications");
  } catch {
    Notifications = null;
  }
}

const PROTECTED_STORAGE_KEYS = new Set([
  "@ride4rent_token",
  "@ride4rent_user",
  "@ride4rent_favorites",
  "@ride4rent_has_onboarded",
  "@ride4rent_location",
  STORAGE_KEY_NOTIFS,
  STORAGE_KEY_LOCATION,
  STORAGE_KEY_BOOKING_REMINDERS,
]);

export default function SettingsScreen() {
  const { showSuccess, showInfo, showModal } = useAppToast();

  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);

  const syncSettingsAndPermissions = useCallback(async () => {
    try {
      const [savedNotifs, savedLoc] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_NOTIFS),
        AsyncStorage.getItem(STORAGE_KEY_LOCATION),
      ]);

      // Sync notification toggle with stored preference & OS permission
      let notifPref = savedNotifs !== null ? JSON.parse(savedNotifs) : true;
      if (Notifications && typeof Notifications.getPermissionsAsync === "function") {
        try {
          const perm = await Notifications.getPermissionsAsync();
          if (perm?.status === "denied" && savedNotifs === null) {
            notifPref = false;
          }
        } catch {
          // ignore
        }
      }
      setNotifications(notifPref);

      // Sync location toggle with stored preference & OS permission
      let locPref = savedLoc !== null ? JSON.parse(savedLoc) : true;
      try {
        const locPerm = await Location.getForegroundPermissionsAsync();
        if (!locPerm.granted && savedLoc === null) {
          locPref = false;
        }
      } catch {
        // ignore
      }
      setLocationServices(locPref);
    } catch (e) {
      console.log("Error reading settings storage:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const idleId =
        typeof requestIdleCallback === "function"
          ? requestIdleCallback(() => syncSettingsAndPermissions())
          : setTimeout(() => syncSettingsAndPermissions(), 150);

      return () => {
        if (typeof cancelIdleCallback === "function" && typeof idleId === "number") {
          cancelIdleCallback(idleId);
        } else {
          clearTimeout(idleId as any);
        }
      };
    }, [syncSettingsAndPermissions])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncSettingsAndPermissions();
      }
    });
    return () => sub.remove();
  }, [syncSettingsAndPermissions]);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      if (Notifications && typeof Notifications.requestPermissionsAsync === "function") {
        try {
          const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
          if (status !== "granted") {
            setNotifications(false);
            await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(false));
            showModal(
              "Permission Required",
              "Notifications are disabled in your phone settings. Enable them to receive booking updates.",
              [
                { text: "Cancel", style: "cancel" },
                ...(canAskAgain === false
                  ? [{ text: "Open Settings", onPress: () => Linking.openSettings() }]
                  : []),
              ],
              "warning"
            );
            return;
          }
        } catch {
          // continue in Expo Go fallback
        }
      }
      setNotifications(true);
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(true));
      showSuccess("Notifications On", "You will receive live booking and trip updates.");
    } else {
      setNotifications(false);
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(false));
      await cancelAllBookingReminders();
      showInfo("Notifications Off", "Push alerts have been muted.");
    }
  };

  const handleToggleLocation = async (value: boolean) => {
    if (value) {
      try {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationServices(false);
          await AsyncStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(false));
          showModal(
            "Location Permission Required",
            "Location access is turned off in your device settings.",
            [
              { text: "Cancel", style: "cancel" },
              ...(canAskAgain === false
                ? [{ text: "Open Settings", onPress: () => Linking.openSettings() }]
                : []),
            ],
            "warning"
          );
          return;
        }
      } catch {
        // fallback
      }
      setLocationServices(true);
      await AsyncStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(true));
      showSuccess("Location Enabled", "Nearby vehicles will be shown on your home screen.");
    } else {
      setLocationServices(false);
      await AsyncStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(false));
      showInfo("Location Disabled", "Showing all available vehicles without location filtering.");
    }
  };

  const handleClearCache = async () => {
    try {
      setClearingCache(true);
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((k) => !PROTECTED_STORAGE_KEYS.has(k));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      showSuccess("Cache Cleared", "Temporary offline cache has been cleared.");
    } catch {
      showInfo("Notice", "Could not clear cached data.");
    } finally {
      setClearingCache(false);
    }
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Clean Minimal Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.sectionGroup}>
          <View style={styles.settingCard}>
            <View style={styles.iconBox}>
              <Ionicons name="notifications-outline" size={20} color={Colors.dark} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSubtitle}>
                Booking approvals, messages, and trip reminders
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: "#E2E2E2", true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={styles.iconBox}>
              <Ionicons name="navigate-outline" size={20} color={Colors.dark} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>Location Services</Text>
              <Text style={styles.rowSubtitle}>
                Show available vehicles near your location
              </Text>
            </View>
            <Switch
              value={locationServices}
              onValueChange={handleToggleLocation}
              trackColor={{ false: "#E2E2E2", true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* Storage & System */}
        <Text style={styles.sectionLabel}>Storage & System</Text>
        <View style={styles.sectionGroup}>
          <TouchableOpacity
            style={styles.settingCard}
            onPress={handleClearCache}
            disabled={clearingCache}
            activeOpacity={0.8}
          >
            <View style={styles.iconBox}>
              <Ionicons name="trash-outline" size={20} color={Colors.dark} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>Clear Offline Cache</Text>
              <Text style={styles.rowSubtitle}>
                Free up temporary cached bookings and data
              </Text>
            </View>
            {clearingCache ? (
              <ActivityIndicator size="small" color={Colors.dark} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingCard}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.8}
          >
            <View style={styles.iconBox}>
              <Ionicons name="settings-outline" size={20} color={Colors.dark} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.rowTitle}>System Permissions</Text>
              <Text style={styles.rowSubtitle}>
                Manage camera, photos, and OS access
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={Colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Version Footer */}
        <Text style={styles.versionText}>Ride4Rent v{appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
    marginTop: 14,
    marginBottom: 10,
  },
  sectionGroup: {
    gap: 10,
    marginBottom: 8,
  },
  settingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  textCol: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
  },
  rowSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 1,
  },
  versionText: {
    marginTop: 28,
    textAlign: "center",
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
});
