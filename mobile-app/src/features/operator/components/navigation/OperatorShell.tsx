import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useEffect, useState } from "react";
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";

type ActiveRoute = "dashboard" | "vehicles" | "bookings" | "chats" | "profile";
type Tab = {
  key: ActiveRoute;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const tabs: Tab[] = [
  { key: "dashboard", label: "Home", icon: "home-outline", route: "/operator-home" },
  { key: "vehicles", label: "Vehicles", icon: "car-outline", route: "/operator-vehicles" },
  { key: "bookings", label: "Bookings", icon: "calendar-outline", route: "/operator-bookings" },
  { key: "chats", label: "Chats", icon: "chatbubble-outline", route: "/operator-chats" },
];

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
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(drawerAnimation, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMenuVisible(false);
    });
  };

  const drawerTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [340, 0],
  });
  const contentTranslateX = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -32],
  });
  const backdropOpacity = drawerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.42],
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.greeting}>
            <Text style={styles.greetingName}>
              Hello, {user?.first_name ?? "Operator"}
            </Text>
            <Text style={styles.greetingMessage}>
              Manage your rental business.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityLabel="View notifications"
              onPress={() => undefined}
              style={styles.actionButton}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={Colors.dark}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Open operator menu"
              onPress={openMenu}
              style={styles.actionButton}
            >
              <Ionicons name="menu-outline" size={25} color={Colors.dark} />
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View style={[styles.content, { transform: [{ translateX: contentTranslateX }] }]}>{children}</Animated.View>

        <View style={styles.bottomBar}>
          {tabs.map((tab) => {
            const isFocused = activeRoute === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                accessibilityLabel={tab.label}
                onPress={() => router.push(tab.route)}
                style={styles.tabButton}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isFocused && styles.activeIconContainer,
                  ]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={25}
                    color={isFocused ? Colors.primary : Colors.secondary}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <View style={styles.modal}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          </Animated.View>
          <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTranslateX }] }]}>
          <SafeAreaView edges={["top", "bottom"]} style={styles.drawerSafeArea}>
            <View style={styles.drawerHeader}>
              <View style={styles.avatar}>
                <Ionicons
                  name="business-outline"
                  size={25}
                  color={Colors.dark}
                />
              </View>
              <View style={styles.identity}>
                <Text style={styles.drawerName}>
                  {profile?.business_name ?? "Your business"}
                </Text>
                <Text style={styles.drawerEmail}>{user?.email}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close operator menu"
                onPress={closeMenu}
              >
                <Ionicons name="close" size={24} color={Colors.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />
            <Text style={styles.section}>Manage</Text>
            <DrawerItem
              icon="home-outline"
              label="Dashboard"
              route="/operator-home"
              close={closeMenu}
            />
            <DrawerItem
              icon="car-outline"
              label="My vehicles"
              route="/operator-vehicles"
              close={closeMenu}
            />
            <DrawerItem
              icon="calendar-outline"
              label="Bookings"
              route="/operator-bookings"
              close={closeMenu}
            />

            <TouchableOpacity style={styles.logout} onPress={signOut}>
              <Ionicons
                name="log-out-outline"
                size={21}
                color={Colors.white}
              />
              <Text style={styles.logoutText}>Sign out</Text>
            </TouchableOpacity>
          </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DrawerItem({
  icon,
  label,
  route,
  close,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  close: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.drawerItem}
      onPress={() => {
        close();
        router.push(route);
      }}
    >
      <Ionicons name={icon} size={21} color={Colors.dark} />
      <Text style={styles.drawerItemText}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={Colors.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.white,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greeting: {
    flex: 1,
  },
  greetingName: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
  },
  greetingMessage: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 10,
    marginTop: 2,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  content: {
    flex: 1,
  },
  bottomBar: {
    alignItems: "center",
    backgroundColor: Colors.white,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    elevation: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    shadowColor: Colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    height: 70,
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    borderTopColor: "transparent",
    borderTopWidth: 3,
    height: "100%",
    justifyContent: "center",
    minWidth: 55,
  },
  activeIconContainer: {
    borderTopColor: Colors.primary,
  },
  modal: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.42)",
    flex: 1,
  },
  drawer: {
    backgroundColor: Colors.white,
    bottom: 0,
    left: 0,
    paddingHorizontal: Spacing.lg,
    position: "absolute",
    top: 0,
    width: "82%",
  },
  drawerSafeArea: {
    flex: 1,
  },
  drawerHeader: {
    alignItems: "center",
    flexDirection: "row",
    paddingTop: Spacing.lg,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: Colors.logoBackground,
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  identity: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  drawerName: {
    color: Colors.dark,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
  },
  drawerEmail: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 3,
  },
  divider: {
    backgroundColor: Colors.border,
    height: 1,
    marginVertical: Spacing.lg,
  },
  section: {
    color: Colors.secondary,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    textTransform: "uppercase",
  },
  drawerItem: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: Spacing.md,
  },
  drawerItemText: {
    color: Colors.dark,
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    marginLeft: Spacing.md,
  },
  logout: {
    alignItems: "center",
    backgroundColor: Colors.dark,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: "auto",
    padding: Spacing.md,
  },
  logoutText: {
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
    marginLeft: Spacing.sm,
  },
});
