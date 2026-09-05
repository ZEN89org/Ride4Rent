import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";

const STORAGE_KEY_NOTIFS = "@settings_notifications";
const STORAGE_KEY_LOCATION = "@settings_location";

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
  } catch (e) {
    console.log("expo-notifications module not loaded:", e);
  }
}

export default function SettingsScreen() {
  const { showSuccess, showInfo, showModal } = useAppToast();
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedNotifs = await AsyncStorage.getItem(STORAGE_KEY_NOTIFS);
      const savedLocation = await AsyncStorage.getItem(STORAGE_KEY_LOCATION);

      if (savedNotifs !== null) setNotifications(JSON.parse(savedNotifs));
      if (savedLocation !== null) setLocationServices(JSON.parse(savedLocation));
    } catch (e) {
      console.log("Error reading settings storage:", e);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(value));

    if (value) {
      if (Notifications) {
        try {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== "granted") {
            showModal(
              "Permission Required",
              "Notification permissions were denied in device system settings.",
              [{ text: "OK" }],
              "warning"
            );
            setNotifications(false);
            await AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(false));
            return;
          }
        } catch (e) {
          console.log("Notification permission check failed:", e);
        }
      }
      showSuccess("Enabled", "Push notifications have been activated.");
    } else {
      showInfo("Disabled", "Push notifications have been turned off.");
    }
  };

  const handleToggleLocation = async (value: boolean) => {
    setLocationServices(value);
    await AsyncStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(value));

    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showModal(
          "Permission Required",
          "Location permissions were denied in device system settings.",
          [{ text: "OK" }],
          "warning"
        );
        setLocationServices(false);
        await AsyncStorage.setItem(STORAGE_KEY_LOCATION, JSON.stringify(false));
      } else {
        showSuccess("Enabled", "Location services have been activated for nearby vehicle search.");
      }
    } else {
      showInfo("Disabled", "Location services have been turned off.");
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Preferences */}
        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSubtitle}>Receive booking updates and announcements</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Location Services</Text>
              <Text style={styles.rowSubtitle}>Allow automatic detection of available cars near you</Text>
            </View>
            <Switch
              value={locationServices}
              onValueChange={handleToggleLocation}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>
        </View>

        {/* Display */}
        <Text style={styles.sectionHeader}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Dark Theme</Text>
              <Text style={styles.rowSubtitle}>Enable dark color scheme across the app</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={(val) => {
                setDarkMode(val);
                if (val) showInfo("Coming Soon", "Dark theme is being refined for upcoming releases.");
              }}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>
        </View>

        {/* Data & Cache */}
        <Text style={styles.sectionHeader}>Data & Storage</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => showSuccess("Cache Cleared", "Temporary offline cache has been emptied.")}
            activeOpacity={0.7}
          >
            <Text style={styles.actionRowText}>Clear Offline Cache</Text>
            <Ionicons name="trash-outline" size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.md,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  rowTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.dark,
  },
  rowSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
    marginRight: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  actionRowText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.dark,
  },
});
