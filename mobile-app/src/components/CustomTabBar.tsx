import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs/types";
import { Pressable, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/colors";

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const icons = {
    home: "home-outline",
    search: "search-outline",
    bookings: "steering-wheel",
    favorites: "heart-outline",
    chats: "chatbubble-outline",
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isBooking = route.name === "bookings";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          if (isBooking) {
            return (
              <View key={route.key} style={styles.bookingContainer}>
                <Pressable
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.bookingButton}
                >
                    <MaterialCommunityIcons
                    name="steering"
                    size={40}
                    color={Colors.white}
                    />
                </Pressable>
              </View>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              {isFocused && <View style={styles.activeLine} />}

              {route.name === "home" && (
                <Ionicons
                  name={icons.home as any}
                  size={25}
                  color={isFocused ? Colors.primary : Colors.secondary}
                />
              )}

              {route.name === "search" && (
                <Ionicons
                  name={icons.search as any}
                  size={25}
                  color={isFocused ? Colors.primary : Colors.secondary}
                />
              )}

              {route.name === "favorites" && (
                <Ionicons
                  name={icons.favorites as any}
                  size={25}
                  color={isFocused ? Colors.primary : Colors.secondary}
                />
              )}

              {route.name === "chats" && (
                <Ionicons
                  name={icons.chats as any}
                  size={25}
                  color={isFocused ? Colors.primary : Colors.secondary}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
  },
  tabBar: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    position: "relative",
  },
  tab: {
    flex: 1,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeLine: {
    position: "absolute",
    top: 0,
    width: 34,
    height: 3,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  bookingContainer: {
    width: 80,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -50,
  },
  bookingButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },
});
