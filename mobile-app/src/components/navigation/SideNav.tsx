import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import {
  FontFamily,
  FontSize,
  Spacing,
} from "@/constants/theme";
import {
  SIDE_NAV_WIDTH,
  useSideNav,
} from "@/context/SideNavContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

type SideNavProps = {
  user?: any;
  isGuest?: boolean;
};

export default function SideNav({
  user: userProp,
  isGuest: isGuestProp,
}: SideNavProps) {
  const {
    isVisible,
    isSettled,
    animation,
    closeSideNav,
    closeImmediate,
  } = useSideNav();

  const pathname = usePathname();
  const openedPathnameRef = useRef<string | null>(null);
  const navigatingRef = useRef(false);

  const { logout, user: authUser, isGuest: authIsGuest } = useAuth();
  const currentUser = userProp ?? authUser;
  const isActuallyGuest =
    isGuestProp === true ||
    authIsGuest === true ||
    !currentUser ||
    !currentUser?.id ||
    currentUser?.role === "guest";

  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      openedPathnameRef.current = pathname;
      navigatingRef.current = false;
    } else {
      openedPathnameRef.current = null;
      navigatingRef.current = false;
    }
  }, [isVisible]);

  // Close the drawer silently in the background ONLY after the target screen has mounted
  useEffect(() => {
    if (
      isVisible &&
      openedPathnameRef.current !== null &&
      pathname !== openedPathnameRef.current
    ) {
      const timer = setTimeout(() => {
        closeImmediate();
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [pathname, isVisible, closeImmediate]);

  useEffect(() => {
    if (!isVisible) return;
    const onBackPress = () => {
      closeSideNav();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [isVisible, closeSideNav]);

  if (!isVisible) {
    return null;
  }

  const drawerTranslateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [SIDE_NAV_WIDTH, 0],
  });

  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const navigateDirectly = (path: string) => {
    if (navigatingRef.current) {
      return;
    }
    navigatingRef.current = true;
    router.navigate(path as any);
    setTimeout(() => {
      navigatingRef.current = false;
    }, 500);
  };

  const handleAccountPress = () => {
    if (isActuallyGuest) {
      navigateDirectly("/login");
      return;
    }
    navigateDirectly("/profile");
  };

  const handleDriverLicensePress = () => {
    if (isActuallyGuest) {
      navigateDirectly("/login");
      return;
    }
    navigateDirectly("/driver-license");
  };

  const handleFaqPress = () => {
    navigateDirectly("/faq");
  };

  const handleTermsPress = () => {
    navigateDirectly("/terms");
  };

  const handleContactPress = () => {
    navigateDirectly("/support");
  };

  const handleSettingsPress = () => {
    navigateDirectly("/settings");
  };

  const handleAboutPress = () => {
    navigateDirectly("/about");
  };

  const handleAccountAction = async () => {
    if (loggingOut) {
      return;
    }

    if (isActuallyGuest) {
      navigateDirectly("/login");
      return;
    }

    try {
      setLoggingOut(true);
      await logout();
      closeImmediate();
      router.replace("/auth");
    } catch (error) {
      console.log("LOGOUT ERROR:", error);
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        pointerEvents="box-none"
        style={[styles.backdrop, { opacity: overlayOpacity }]}
      >
        <Pressable
          style={styles.backdropTouchArea}
          onPress={() => closeSideNav()}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            width: SIDE_NAV_WIDTH,
          },
          !isSettled && {
            transform: [
              {
                translateX: drawerTranslateX,
              },
            ],
          },
        ]}
      >
        <View style={styles.drawerContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Ride4Rent</Text>

              <Text style={styles.headerSubtitle}>
                {isActuallyGuest
                  ? "Welcome to Ride4Rent"
                  : currentUser?.first_name
                    ? `Hi, ${currentUser.first_name}!`
                    : currentUser?.name || "Ride4Rent User"}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => closeSideNav()}
              style={styles.closeButton}
              activeOpacity={0.6}
              delayPressIn={0}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Account</Text>

            <MenuItem
              icon="person-outline"
              label="My Profile"
              onPress={handleAccountPress}
            />

            <MenuItem
              icon="card-outline"
              label="Driver's License"
              onPress={handleDriverLicensePress}
            />
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Support</Text>

            <MenuItem
              icon="help-circle-outline"
              label="FAQ"
              onPress={handleFaqPress}
            />

            <MenuItem
              icon="document-text-outline"
              label="Terms & Conditions"
              onPress={handleTermsPress}
            />

            <MenuItem
              icon="headset-outline"
              label="Contact Support"
              onPress={handleContactPress}
            />
          </View>

          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>App</Text>

            <MenuItem
              icon="settings-outline"
              label="Settings"
              onPress={handleSettingsPress}
            />

            <MenuItem
              imageSource={require("@/assets/images/applogo.png")}
              label="About Ride4Rent"
              onPress={handleAboutPress}
            />
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleAccountAction}
            disabled={loggingOut}
            activeOpacity={0.75}
            delayPressIn={0}
          >
            <Ionicons
              name={isActuallyGuest ? "log-in-outline" : "log-out-outline"}
              size={21}
              color={Colors.dark}
            />

            <Text style={styles.logoutText}>
              {loggingOut
                ? "Logging out..."
                : isActuallyGuest
                ? "Login"
                : "Logout"}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.7}
                delayPressIn={0}
                onPress={() => console.log("Facebook pressed")}
              >
                <Ionicons name="logo-facebook" size={19} color={Colors.dark} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.7}
                delayPressIn={0}
                onPress={() => console.log("Instagram pressed")}
              >
                <Ionicons name="logo-instagram" size={19} color={Colors.dark} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                activeOpacity={0.7}
                delayPressIn={0}
                onPress={() => console.log("Gmail pressed")}
              >
                <Ionicons name="mail-outline" size={19} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.footerText}>@2026 Ride4Rent</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

type MenuItemProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  imageSource?: any;
  label: string;
  onPress: () => void;
};

function MenuItem({
  icon,
  imageSource,
  label,
  onPress,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.55}
      delayPressIn={0}
    >
      <View style={styles.menuIcon}>
        {imageSource ? (
          <Image
            source={imageSource}
            style={{ width: 22, height: 22, borderRadius: 5 }}
            contentFit="contain"
          />
        ) : (
          <Ionicons name={icon!} size={21} color={Colors.dark} />
        )}
      </View>

      <Text style={styles.menuLabel}>{label}</Text>

      <Ionicons name="chevron-forward" size={17} color={Colors.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 20,
  },

  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  backdropTouchArea: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: SIDE_NAV_WIDTH,
  },

  drawer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    backgroundColor: Colors.white,
    elevation: 24,
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
    color: Colors.dark,
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
});

