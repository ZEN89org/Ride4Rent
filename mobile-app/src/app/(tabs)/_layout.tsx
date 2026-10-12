import CustomTabBar from "@/components/navigation/CustomTabBar";
import SideNav from "@/components/navigation/SideNav";
import {
  SIDE_NAV_WIDTH,
  useSideNav,
} from "@/context/SideNavContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import AssistantModal from "@/features/assistant/components/AssistantModal";
import FloatingAssistantFab from "@/features/assistant/components/FloatingAssistantFab";
import { Tabs, router } from "expo-router";
import {
  Animated,
  BackHandler,
  StyleSheet,
  View,
} from "react-native";
import { useEffect, useState } from "react";

export default function TabsLayout() {
  const {
    isVisible,
    animation,
    closeSideNav,
  } = useSideNav();

  const {
    user,
    isGuest,
    loading,
  } = useAuth();

  const [assistantVisible, setAssistantVisible] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (isVisible) {
        closeSideNav();
        return true;
      }
      // Intercept hardware back press: navigate to home tab and prevent popping root stack to index or auth
      router.navigate("/(tabs)/home" as any);
      return true;
    };

    const backSub = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => backSub.remove();
  }, [isVisible, closeSideNav]);

  useEffect(() => {
    if (!loading && user?.role === "operator") {
      if (user.account_status === "rejected") {
        router.replace("/operator-rejected");
      } else {
        router.replace("/operator-home");
      }
    }
  }, [user, loading]);

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
            sceneStyle: { backgroundColor: "#FFFFFF" },
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

        {/* Intelligent Floating Chat Assistant FAB */}
        <FloatingAssistantFab onPress={() => setAssistantVisible(true)} />

        {/* Intelligent Assistant Modal Sheet */}
        <AssistantModal
          visible={assistantVisible}
          onClose={() => setAssistantVisible(false)}
        />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  tabsContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
