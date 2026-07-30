import CustomTabBar from "@/components/CustomTabBar";
import { AuthProvider } from "@/context/AuthContext";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <AuthProvider>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
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
    </AuthProvider>
  );
}
