import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ReactNode, useEffect, useState } from "react";
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

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { useNotificationCount } from "@/context/NotificationContext";
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
  const { user, logout, loading, isOperatorActive, isOperatorPending } = useAuth();
  const { unreadCount } = useNotificationCount();
  const profile = user?.operatorProfile ?? user?.operator_profile;
  const profilePhoto = user?.profile_photo;

  const isOperatorAllowed = isOperatorActive || isOperatorPending;

  useEffect(() => {
    if (!loading && !isOperatorAllowed) {
      if (user?.account_status === "rejected") {
        router.replace("/operator-rejected");
      } else {
        router.replace("/login");
      }
    }
  }, [loading, isOperatorAllowed]);

  if (loading || !isOperatorAllowed) {
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

  const appTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -DRAWER_WIDTH],
  });

  const drawerTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [DRAWER_WIDTH, 0],
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.mainAppContainer,
            {
              transform: [{ translateX: appTranslateX }],
            },
          ]}
        >
          {/* Top Header matching signature Ride4Rent aesthetic: Only on Home / Dashboard */}
          {activeRoute === "dashboard" && (
            <View style={styles.topHeader}>
              <View style={styles.userRow}>
                <TouchableOpacity
                  style={styles.profileContainer}
                  onPress={() => router.push("/operator-profile" as any)}
                  activeOpacity={0.8}
                >
                  {profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto }}
                      contentFit="cover"
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.defaultProfile}>
                      <Ionicons name="person" size={22} color={Colors.dark} />
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.userInfo}>
                  <Text style={styles.username} numberOfLines={1}>
                    {profile?.business_name || user?.first_name || "Operator"}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.subtitle}>Fleet Manager</Text>
                    {isOperatorPending && (
                      <View style={styles.pendingPill}>
                        <Text style={styles.pendingPillText}>Under Review</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push("/notifications" as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="notifications-outline" size={21} color={Colors.dark} />
                    {unreadCount > 0 && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Text>
                      </View>
                    )}
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
          )}

          {/* Content Area */}
          <View style={styles.content}>{children}</View>

          {/* Bottom Tab Bar matching Renter CustomTabBar exactly */}
          <View style={styles.bottomBar}>
            {/* 1. Home / Dashboard */}
            <Pressable
              onPress={() => router.push("/operator-home" as any)}
              style={styles.tabButton}
            >
              <View
                style={[
                  styles.iconContainer,
                  activeRoute === "dashboard" && styles.activeIconContainer,
                ]}
              >
                <Ionicons
                  name="home-outline"
                  size={25}
                  color={activeRoute === "dashboard" ? Colors.primary : Colors.secondary}
                />
              </View>
            </Pressable>

            {/* 2. Trips / Bookings */}
            <Pressable
              onPress={() => router.push("/operator-bookings" as any)}
              style={styles.tabButton}
            >
              <View
                style={[
                  styles.iconContainer,
                  activeRoute === "bookings" && styles.activeIconContainer,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={25}
                  color={activeRoute === "bookings" ? Colors.primary : Colors.secondary}
                />
              </View>
            </Pressable>

            {/* 3. Center Circle Button: Fleet Catalog (Vehicles) */}
            <Pressable
              onPress={() => router.push("/operator-vehicles" as any)}
              style={styles.bookingButton}
            >
              <View
                style={[
                  styles.bookingCircle,
                  activeRoute === "vehicles" && styles.bookingCircleActive,
                ]}
              >
                <Ionicons name="car-sport" size={30} color={Colors.white} />
              </View>
            </Pressable>

            {/* 4. Chats */}
            <Pressable
              onPress={() => router.push("/operator-chats" as any)}
              style={styles.tabButton}
            >
              <View
                style={[
                  styles.iconContainer,
                  activeRoute === "chats" && styles.activeIconContainer,
                ]}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={25}
                  color={activeRoute === "chats" ? Colors.primary : Colors.secondary}
                />
              </View>
            </Pressable>

            {/* 5. Profile */}
            <Pressable
              onPress={() => router.push("/operator-profile" as any)}
              style={styles.tabButton}
            >
              <View
                style={[
                  styles.iconContainer,
                  activeRoute === "profile" && styles.activeIconContainer,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={25}
                  color={activeRoute === "profile" ? Colors.primary : Colors.secondary}
                />
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* SideNav matching renter design */}
        {menuVisible && (
          <View style={styles.sideNavContainer} pointerEvents="box-none">
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
              <View style={styles.drawerContent}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                    <Text style={styles.headerTitle}>Ride4Rent</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                      {profile?.business_name ||
                        (user?.first_name ? `Hi, ${user.first_name}!` : user?.name || "Operator")}
                    </Text>
                    {isOperatorPending && (
                      <View style={[styles.pendingPill, { marginTop: 4, alignSelf: "flex-start" }]}>
                        <Text style={styles.pendingPillText}>Account Under Review</Text>
                      </View>
                    )}
                  </View>

                  <Pressable onPress={closeMenu} style={styles.closeButton} hitSlop={10}>
                    <Ionicons name="close" size={24} color={Colors.dark} />
                  </Pressable>
                </View>

                <View style={styles.divider} />

                {/* Section: Account & Business */}
                <View style={styles.menuSection}>
                  <Text style={styles.sectionTitle}>Account</Text>

                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      closeMenu();
                      router.push("/operator-profile" as any);
                    }}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons name="business-outline" size={21} color={Colors.dark} />
                    </View>
                    <Text style={styles.menuLabel}>Business Profile</Text>
                    <Ionicons name="chevron-forward" size={17} color={Colors.secondary} />
                  </Pressable>

                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      closeMenu();
                      router.push("/settings" as any);
                    }}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons name="settings-outline" size={21} color={Colors.dark} />
                    </View>
                    <Text style={styles.menuLabel}>Settings</Text>
                    <Ionicons name="chevron-forward" size={17} color={Colors.secondary} />
                  </Pressable>
                </View>

                {/* Section: Support */}
                <View style={styles.menuSection}>
                  <Text style={styles.sectionTitle}>Support</Text>

                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      closeMenu();
                      router.push("/faq" as any);
                    }}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons name="help-circle-outline" size={21} color={Colors.dark} />
                    </View>
                    <Text style={styles.menuLabel}>FAQ</Text>
                    <Ionicons name="chevron-forward" size={17} color={Colors.secondary} />
                  </Pressable>

                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      closeMenu();
                      router.push("/terms" as any);
                    }}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons name="document-text-outline" size={21} color={Colors.dark} />
                    </View>
                    <Text style={styles.menuLabel}>Terms & Conditions</Text>
                    <Ionicons name="chevron-forward" size={17} color={Colors.secondary} />
                  </Pressable>

                  <Pressable
                    style={styles.menuItem}
                    onPress={() => {
                      closeMenu();
                      router.push("/support" as any);
                    }}
                  >
                    <View style={styles.menuIcon}>
                      <Ionicons name="headset-outline" size={21} color={Colors.dark} />
                    </View>
                    <Text style={styles.menuLabel}>Contact Support</Text>
                    <Ionicons name="chevron-forward" size={17} color={Colors.secondary} />
                  </Pressable>
                </View>

                {/* Logout Button */}
                <Pressable
                  style={styles.logoutButton}
                  onPress={signOut}
                >
                  <Ionicons name="log-out-outline" size={21} color={Colors.white} />
                  <Text style={styles.logoutText}>Logout</Text>
                </Pressable>

                {/* Footer with social icons & copyright */}
                <View style={styles.footer}>
                  <View style={styles.socialContainer}>
                    <Pressable
                      style={styles.socialButton}
                      onPress={() => console.log("Facebook pressed")}
                    >
                      <Ionicons name="logo-facebook" size={19} color={Colors.dark} />
                    </Pressable>

                    <Pressable
                      style={styles.socialButton}
                      onPress={() => console.log("Instagram pressed")}
                    >
                      <Ionicons name="logo-instagram" size={19} color={Colors.dark} />
                    </Pressable>

                    <Pressable
                      style={styles.socialButton}
                      onPress={() => console.log("Gmail pressed")}
                    >
                      <Ionicons name="mail-outline" size={19} color={Colors.dark} />
                    </Pressable>
                  </View>

                  <Text style={styles.footerText}>@2026 Ride4Rent</Text>
                </View>
              </View>
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
    backgroundColor: Colors.white,
    overflow: "hidden",
  },
  mainAppContainer: {
    flex: 1,
  },
  topHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  defaultProfile: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: Spacing.sm,
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
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: Colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  badgeText: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 9,
    lineHeight: 11,
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    height: 70,
    backgroundColor: Colors.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: -3,
    },
  },
  tabButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    height: "100%",
    minWidth: 55,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 3,
    borderTopColor: "transparent",
  },
  activeIconContainer: {
    borderTopColor: Colors.primary,
  },
  bookingButton: {
    width: 75,
    height: 75,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -35,
  },
  bookingCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
  bookingCircleActive: {
    transform: [{ scale: 1.05 }],
  },
  sideNavContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    elevation: 20,
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 40,
    paddingBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.primary,
  },
  headerSubtitle: {
    marginTop: -5,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginTop: Spacing.lg,
  },
  menuSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuItem: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F7F7",
  },
  menuLabel: {
    flex: 1,
    marginLeft: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.dark,
  },
  logoutButton: {
    marginTop: Spacing.xl,
    minHeight: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  logoutText: {
    marginLeft: Spacing.sm,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.body,
    color: Colors.white,
  },
  footer: {
    marginTop: "auto",
    alignItems: "center",
  },
  socialContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  socialButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
  },
  footerText: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
  pendingPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#B45309",
  },
});
