import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import ScreenContainer from "@/components/common/ScreenContainer";
import AuthRequiredBottomSheet from "@/features/auth/components/AuthRequiredBottomSheet";
import AvailableVehicles from "@/features/renter/components/home/AvailableVehicles";
import HomeHeader from "@/features/renter/components/home/HomeHeader";
import HomeTipsCarousel from "@/features/renter/components/home/HomeTipsCarousel";
import TopRatedVehicles from "@/features/renter/components/home/TopRatedVehicles";

import { useSideNav } from "@/context/SideNavContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

export default function Home() {
  const {
    user,
    isGuest,
  } = useAuth();

  const {
    openSideNav,
  } = useSideNav();

  const [
    showAuthSheet,
    setShowAuthSheet,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const handleNotificationPress = () => {
    if (isGuest) {
      setShowAuthSheet(true);
      return;
    }
    router.push("/notifications" as any);
  };

  const handleMenuPress = () => {
    openSideNav();
  };

  const handleSearchSubmit = () => {
    if (search.trim()) {
      router.push({
        pathname: "/(tabs)/search",
        params: { query: search.trim() },
      } as any);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <HomeHeader
          user={user}
          isGuest={isGuest}
          search={search}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          onNotificationPress={handleNotificationPress}
          onMenuPress={handleMenuPress}
        />

        <HomeTipsCarousel />

        <AvailableVehicles searchQuery={search} />

        <TopRatedVehicles
          onViewPress={(vehicle) => {
            router.push(`/vehicles/${vehicle.id}` as any);
          }}
        />

        <AuthRequiredBottomSheet
          visible={showAuthSheet}
          onClose={() => setShowAuthSheet(false)}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
