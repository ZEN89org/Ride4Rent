import { Ionicons } from "@expo/vector-icons";
import {
    Pressable,
    StyleSheet,
    View,
} from "react-native";

import { useState } from "react";

import AuthRequiredBottomSheet from "@/components/AuthRequiredBottomSheet";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function CustomTabBar({
  state,
  navigation,
}: CustomTabBarProps) {

  const { isGuest } = useAuth();

  const [showAuthSheet, setShowAuthSheet] = useState(false);

  const icons = {
    home: "home-outline",
    search: "search-outline",
    favorites: "heart-outline",
    chats: "chatbubble-outline",
  } as const;

  const handleTabPress = (
    routeName: string,
    routeKey: string,
    isFocused: boolean
  ) => {

    if (routeName === "bookings") {

      if (isGuest) {
        setShowAuthSheet(true);
        return;
      }

      navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      });

      if (!isFocused) {
        navigation.navigate(routeName);
      }

      return;
    }

    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  return (
    <>
      <View style={styles.container}>

        {state.routes.map(
          (route: any, index: number) => {

            const isFocused =
              state.index === index;

            if (
              ![
                "home",
                "search",
                "bookings",
                "favorites",
                "chats",
              ].includes(route.name)
            ) {
              return null;
            }

            if (route.name === "bookings") {
              return (
                <Pressable
                  key={route.key}
                  onPress={() =>
                    handleTabPress(
                      route.name,
                      route.key,
                      isFocused
                    )
                  }
                  style={styles.bookingButton}
                >
                  <View
                    style={[
                      styles.bookingCircle,
                      isFocused && styles.bookingCircleActive,
                    ]}
                  >
                    <Ionicons
                      name="car-sport"
                      size={30}
                      color={Colors.white}
                    />
                  </View>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={route.key}
                onPress={() =>
                  handleTabPress(
                    route.name,
                    route.key,
                    isFocused
                  )
                }
                style={styles.tabButton}
              >
                <View
                  style={[
                    styles.iconContainer,
                    isFocused &&
                      styles.activeIconContainer,
                  ]}
                >
                  <Ionicons
                    name={
                      icons[
                        route.name as keyof typeof icons
                      ]
                    }
                    size={25}
                    color={
                      isFocused
                        ? Colors.primary
                        : Colors.secondary
                    }
                  />
                </View>
              </Pressable>
            );
          }
        )}

      </View>

      <AuthRequiredBottomSheet
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
