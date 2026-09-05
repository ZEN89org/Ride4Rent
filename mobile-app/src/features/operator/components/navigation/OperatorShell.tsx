import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { ReactNode, useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

type ActiveRoute = "dashboard" | "vehicles" | "bookings" | "chats" | "profile";

export default function OperatorShell({
  children,
  activeRoute,
}: {
  children: ReactNode;
  activeRoute: ActiveRoute;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [drawerAnimation] = useState(() => new Animated.Value(0));
  const { user, logout, loading, isOperatorActive } = useAuth();
  const profile = user?.operatorProfile ?? user?.operator_profile;
  const profilePhoto = user?.profile_photo;

  useEffect(() => {
    if (!loading && !isOperatorActive) {
      router.replace("/login");
    }
  }, [loading, isOperatorActive]);

  if (loading || !isOperatorActive) {
    return null;
  }

  const signOut = async () => {
    await logout();
    router.replace("/auth");
  };

  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(drawerAnimation, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(drawerAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMenuVisible(false);
    });
  };

  const drawerTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_WIDTH, 0],
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header matching renter aesthetic with Notification icon */}
        <View style={styles.topHeader}>
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="business" size={24} color={Colors.dark} />
              )}
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.username} numberOfLines={1}>
                {profile?.business_name || user?.first_name || "Host Workspace"}
              </Text>
              <Text style={styles.subtitle}>Operator & Host Fleet Manager</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push("/notifications" as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={21} color={Colors.dark} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={openMenu}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="menu" size={23} color={Colors.dark} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content Area */}
        <View style={styles.content}>{children}</View>

        {/* Bottom Tab Bar at the very bottom */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => router.push("/operator-home" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, activeRoute === "dashboard" && styles.activeIconContainer]}>
              <Ionicons
                name="home-outline"
                size={22}
                color={activeRoute === "dashboard" ? Colors.primary : Colors.secondary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => router.push("/operator-vehicles" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, activeRoute === "vehicles" && styles.activeIconContainer]}>
              <Ionicons
                name="car-outline"
                size={22}
                color={activeRoute === "vehicles" ? Colors.primary : Colors.secondary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => router.push("/operator-bookings" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, activeRoute === "bookings" && styles.activeIconContainer]}>
              <Ionicons
                name="calendar-outline"
                size={22}
                color={activeRoute === "bookings" ? Colors.primary : Colors.secondary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => router.push("/operator-chats" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, activeRoute === "chats" && styles.activeIconContainer]}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={22}
                color={activeRoute === "chats" ? Colors.primary : Colors.secondary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabButton}
            onPress={() => router.push("/operator-profile" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, activeRoute === "profile" && styles.activeIconContainer]}>
              <Ionicons
                name="person-outline"
                size={22}
                color={activeRoute === "profile" ? Colors.primary : Colors.secondary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* SideNav matching renter design */}
        {menuVisible && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable style={styles.backdrop} onPress={closeMenu} />
            <Animated.View
              style={[
                styles.drawer,
                {
                  width: DRAWER_WIDTH,
                  transform: [{ translateX: drawerTranslateX }],
                },
              ]}
            >
              <View style={styles.drawerHeader}>
                <View>
                  <Text style={styles.drawerTitle}>Ride4Rent Host</Text>
                  <Text style={styles.drawerSubtitle}>
                    {profile?.business_name || user?.first_name || "Operator"}
                  </Text>
                </View>
                <TouchableOpacity onPress={closeMenu} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color={Colors.dark} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>Fleet Operations</Text>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/operator-vehicle-upload" as any);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={Colors.dark} />
                  <Text style={styles.menuItemText}>List New Vehicle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/operator-vehicles" as any);
                  }}
                >
                  <Ionicons name="car-outline" size={20} color={Colors.dark} />
                  <Text style={styles.menuItemText}>Manage Fleet Vehicles</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/operator-bookings" as any);
                  }}
                >
                  <Ionicons name="clipboard-outline" size={20} color={Colors.dark} />
                  <Text style={styles.menuItemText}>Rental Reservations</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>Account & Settings</Text>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/operator-profile" as any);
                  }}
                >
                  <Ionicons name="person-outline" size={20} color={Colors.dark} />
                  <Text style={styles.menuItemText}>Business Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/settings" as any);
                  }}
                >
                  <Ionicons name="settings-outline" size={20} color={Colors.dark} />
                  <Text style={styles.menuItemText}>App Preferences</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    router.push("/faq" as any);
                  }}
                >
                  <Ionicons name="help-circle-outline" size={20} color={Colors.dark} />
                  <Text style={styles.menuItemText}>FAQ & Support</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }} />

              <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
  },
  topHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    height: 60,
    backgroundColor: Colors.white,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingBottom: 2,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIconContainer: {
    transform: [{ scale: 1.1 }],
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  drawerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  drawerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  menuSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  menuItemText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.dark,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  logoutText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.error,
  },
});
