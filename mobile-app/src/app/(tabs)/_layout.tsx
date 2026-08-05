import CustomTabBar from "@/components/CustomTabBar";
import SideNav from "@/components/SideNav";
import {
  SIDE_NAV_WIDTH,
  SideNavProvider,
  useSideNav,
} from "@/context/SideNavContext";
import { useAuth } from "@/hooks/useAuth";
import { Tabs } from "expo-router";
import {
  Animated,
  StyleSheet,
  View,
} from "react-native";

function TabsContent() {
  const {
    isVisible,
    animation,
  } = useSideNav();

  const {
    user,
    isGuest,
  } = useAuth();

  const appTranslateX =
    animation.interpolate({
      inputRange: [
        0,
        SIDE_NAV_WIDTH,
      ],
      outputRange: [
        -SIDE_NAV_WIDTH,
        0,
      ],
    });

  return (
    <View
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.tabsContainer,
          {
            transform: [
              {
                translateX:
                  appTranslateX,
              },
            ],
          },
        ]}
      >
        <Tabs
          tabBar={(props) => (
            <CustomTabBar
              {...props}
            />
          )}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: "Home",
            }}
          />

          <Tabs.Screen
            name="search"
            options={{
              title: "Search",
            }}
          />

          <Tabs.Screen
            name="bookings"
            options={{
              title: "Booking",
            }}
          />

          <Tabs.Screen
            name="favorites"
            options={{
              title: "Favorites",
            }}
          />

          <Tabs.Screen
            name="chats"
            options={{
              title: "Chats",
            }}
          />
        </Tabs>
      </Animated.View>

      {isVisible && (
        <SideNav
          user={user}
          isGuest={isGuest}
        />
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <SideNavProvider>
      <TabsContent />
    </SideNavProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },

  tabsContainer: {
    flex: 1,
  },
});
