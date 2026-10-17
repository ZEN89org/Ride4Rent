import CustomTabBar from "@/components/navigation/CustomTabBar";
import SideNav from "@/components/navigation/SideNav";
import { useAuth } from "@/features/auth/hooks/useAuth";
import AssistantModal from "@/features/assistant/components/AssistantModal";
import FloatingAssistantFab from "@/features/assistant/components/FloatingAssistantFab";
import { Tabs, router } from "expo-router";
import {
  BackHandler,
  StyleSheet,
  View,
} from "react-native";
import { memo, useEffect, useState } from "react";

const TabsContent = memo(function TabsContent() {
  const [assistantVisible, setAssistantVisible] = useState(false);

  return (
    <>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          sceneStyle: { backgroundColor: "#FFFFFF" },
        }}
      >
        <Tabs.Screen name="home" options={{ title: "Home" }} />
        <Tabs.Screen name="search" options={{ title: "Search" }} />
        <Tabs.Screen name="bookings" options={{ title: "Booking" }} />
        <Tabs.Screen name="favorites" options={{ title: "Favorites" }} />
        <Tabs.Screen name="chats" options={{ title: "Chats" }} />
      </Tabs>

      <FloatingAssistantFab onPress={() => setAssistantVisible(true)} />
      <AssistantModal
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
      />
    </>
  );
});

export default function TabsLayout() {
  const {
    user,
    isGuest,
    loading,
  } = useAuth();

  useEffect(() => {
    const onBackPress = () => {
      // Intercept hardware back press: navigate to home tab and prevent popping root stack to index or auth
      router.navigate("/(tabs)/home" as any);
      return true;
    };

    const backSub = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => backSub.remove();
  }, []);

  useEffect(() => {
    if (!loading && user?.role === "operator") {
      if (user.account_status === "rejected") {
        router.replace("/operator-rejected");
      } else {
        router.replace("/operator-home");
      }
    }
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <TabsContent />
      </View>

      <SideNav
        user={user}
        isGuest={isGuest}
      />
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
