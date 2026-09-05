import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
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
import { useState } from "react";

type SideNavProps = {
  user?: any;
  isGuest?: boolean;
};

export default function SideNav({
  user,
  isGuest,
}: SideNavProps) {
  const {
    isVisible,
    animation,
    closeSideNav,
  } = useSideNav();

  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (!isVisible) {
    return null;
  }

  const drawerTranslateX = animation;

  const overlayOpacity = animation.interpolate({
    inputRange: [
      0,
      SIDE_NAV_WIDTH,
    ],
    outputRange: [
      0.45,
      0,
    ],
  });

  const handleAccountPress = () => {
    closeSideNav();

    if (isGuest) {
      router.push("/auth");
      return;
    }

    router.push("/profile");
  };

  const handleDriverLicensePress = () => {
    closeSideNav();

    if (isGuest) {
      router.push("/auth");
      return;
    }

    router.push("/driver-license" as any);
  };

  const handleFaqPress = () => {
    closeSideNav();
    router.push("/faq" as any);
  };

  const handleTermsPress = () => {
    closeSideNav();
    router.push("/terms" as any);
  };

  const handleContactPress = () => {
    closeSideNav();
    router.push("/support" as any);
  };

  const handleSettingsPress = () => {
    closeSideNav();
    router.push("/settings" as any);
  };

  const handleAboutPress = () => {
    closeSideNav();

    router.push("/about");
  };

    const handleAccountAction = async () => {
      if (loggingOut) {
        return;
      }

      closeSideNav();

      if (isGuest) {
        router.replace("/auth");
        return;
      }

      try {
        setLoggingOut(true);

        await logout();

        router.replace("/");
      } catch (error) {
        console.log("LOGOUT ERROR:", error);
        setLoggingOut(false);
      }
    };

  return (
    <View
      pointerEvents="box-none"
      style={styles.container}
    >
      <Pressable
        style={styles.backdrop}
        onPress={closeSideNav}
      />

      <Animated.View
        style={[
          styles.drawer,
          {
            width:
              SIDE_NAV_WIDTH,
            transform: [
              {
                translateX:
                  drawerTranslateX,
              },
            ],
          },
        ]}
      >
        <View
          style={styles.drawerContent}
        >
          <View
            style={styles.header}
          >
            <View>
              <Text
                style={
                  styles.headerTitle
                }
              >
                Ride4Rent
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                {isGuest
                  ? "Welcome to Ride4Rent"
                  : user?.first_name
                    ? `Hi, ${user.first_name}!`
                    : user?.name || "Ride4Rent User"}
              </Text>
            </View>

            <Pressable
              onPress={
                closeSideNav
              }
              style={
                styles.closeButton
              }
              hitSlop={10}
            >
              <Ionicons
                name="close"
                size={24}
                color={Colors.dark}
              />
            </Pressable>
          </View>

          <View
            style={styles.divider}
          />

          <View
            style={
              styles.menuSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Account
            </Text>

            <MenuItem
              icon="person-outline"
              label="My Profile"
              onPress={
                handleAccountPress
              }
            />

            <MenuItem
              icon="card-outline"
              label="Driver's License"
              onPress={
                handleDriverLicensePress
              }
            />
          </View>

          <View
            style={
              styles.menuSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Support
            </Text>

            <MenuItem
              icon="help-circle-outline"
              label="FAQ"
              onPress={
                handleFaqPress
              }
            />

            <MenuItem
              icon="document-text-outline"
              label="Terms & Conditions"
              onPress={
                handleTermsPress
              }
            />

            <MenuItem
              icon="headset-outline"
              label="Contact Support"
              onPress={
                handleContactPress
              }
            />
          </View>

          <View
            style={
              styles.menuSection
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              App
            </Text>

            <MenuItem
              icon="settings-outline"
              label="Settings"
              onPress={
                handleSettingsPress
              }
            />

            <MenuItem
              icon="information-circle-outline"
              label="About"
              onPress={
                handleAboutPress
              }
            />
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={handleAccountAction}
            disabled={loggingOut}
          >
            <Ionicons
              name={
                isGuest
                  ? "log-in-outline"
                  : "log-out-outline"
              }
              size={21}
              color={Colors.white}
            />

            <Text style={styles.logoutText}>
              {loggingOut
                ? "Logging out..."
                : isGuest
                ? "Log In"
                : "Logout"}
            </Text>
          </Pressable>

          <View
            style={styles.footer}
          >
            <View
              style={
                styles.socialContainer
              }
            >
              <Pressable
                style={
                  styles.socialButton
                }
                onPress={() =>
                  console.log(
                    "Facebook pressed"
                  )
                }
              >
                <Ionicons
                  name="logo-facebook"
                  size={19}
                  color={
                    Colors.dark
                  }
                />
              </Pressable>

              <Pressable
                style={
                  styles.socialButton
                }
                onPress={() =>
                  console.log(
                    "Instagram pressed"
                  )
                }
              >
                <Ionicons
                  name="logo-instagram"
                  size={19}
                  color={
                    Colors.dark
                  }
                />
              </Pressable>

              <Pressable
                style={
                  styles.socialButton
                }
                onPress={() =>
                  console.log(
                    "Gmail pressed"
                  )
                }
              >
                <Ionicons
                  name="mail-outline"
                  size={19}
                  color={
                    Colors.dark
                  }
                />
              </Pressable>
            </View>

            <Text
              style={
                styles.footerText
              }
            >
              @2026 Ride4Rent
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

type MenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function MenuItem({
  icon,
  label,
  onPress,
}: MenuItemProps) {
  return (
    <Pressable
      style={styles.menuItem}
      onPress={onPress}
    >
      <View
        style={styles.menuIcon}
      >
        <Ionicons
          name={icon}
          size={21}
          color={Colors.dark}
        />
      </View>

      <Text
        style={styles.menuLabel}
      >
        {label}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={17}
        color={
          Colors.secondary
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },

  drawerContent: {
    flex: 1,

    paddingHorizontal:
      Spacing.lg,

    paddingTop: 40,

    paddingBottom:
      Spacing.lg,
  },

  header: {
    flexDirection: "row",

    alignItems:
      "center",

    justifyContent:
      "space-between",
  },

  headerTitle: {
    fontFamily:
      FontFamily.bold,

    fontSize:
      FontSize.heading,

    color:
      Colors.primary,
  },

  headerSubtitle: {
    marginTop: -5,

    fontFamily:
      FontFamily.regular,

    fontSize: 13,

    color:
      Colors.secondary,
  },

  closeButton: {
    width: 40,
    height: 40,

    borderRadius: 20,

    alignItems:
      "center",

    justifyContent:
      "center",

    backgroundColor:
      "#F5F5F5",
  },

  divider: {
    height: 1,

    backgroundColor:
      "#EEEEEE",

    marginTop:
      Spacing.lg,
  },

  menuSection: {
    marginTop:
      Spacing.lg,
  },

  sectionTitle: {
    marginBottom:
      Spacing.xs,

    fontFamily:
      FontFamily.semiBold,

    fontSize: 13,

    color:
      Colors.secondary,

    textTransform:
      "uppercase",

    letterSpacing: 0.5,
  },

  menuItem: {
    minHeight: 48,

    flexDirection: "row",

    alignItems:
      "center",

    paddingVertical:
      Spacing.sm,
  },

  menuIcon: {
    width: 38,
    height: 38,

    borderRadius: 19,

    alignItems:
      "center",

    justifyContent:
      "center",

    backgroundColor: "#F7F7F7",
  },

  menuLabel: {
    flex: 1,

    marginLeft:
      Spacing.md,

    fontFamily:
      FontFamily.medium,

    fontSize:
      FontSize.body,

    color:
      Colors.dark,
  },

  logoutButton: {
    marginTop:
      Spacing.xl,

    minHeight: 50,

    borderRadius: 25,

    flexDirection: "row",

    alignItems:
      "center",

    justifyContent:
      "center",

    backgroundColor:
      Colors.primary,
  },

  logoutText: {
    marginLeft:
      Spacing.sm,

    fontFamily:
      FontFamily.bold,

    fontSize:
      FontSize.body,

    color:
      Colors.white,
  },

  footer: {
    marginTop:
      "auto",

    alignItems:
      "center",
  },

  socialContainer: {
    flexDirection: "row",

    alignItems:
      "center",

    justifyContent:
      "center",

    gap: Spacing.sm,
  },

  socialButton: {
    width: 38,
    height: 38,

    borderRadius: 19,

    alignItems:
      "center",

    justifyContent:
      "center",

    backgroundColor:
      "#F5F5F5",
  },

  footerText: {
    marginTop:
      Spacing.sm,

    fontFamily:
      FontFamily.regular,

    fontSize: 12,

    color:
      Colors.secondary,
  },
});
