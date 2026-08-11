import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

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

  const handleBookVehicle = () => {
    if (isGuest) {
      setShowAuthSheet(true);
      return;
    }

    router.push(
      "/(tabs)/bookings"
    );
  };

  const handleNotificationPress = () => {
    console.log(
      "Notifications pressed"
    );
  };

  const handleMenuPress = () => {
    openSideNav();
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <HomeHeader
          user={user}
          isGuest={isGuest}
          search={search}
          onSearchChange={
            setSearch
          }
          onNotificationPress={
            handleNotificationPress
          }
          onMenuPress={
            handleMenuPress
          }
        />

        <HomeTipsCarousel />

        <AvailableVehicles />

        <TopRatedVehicles
          onViewPress={(vehicle) => {
            console.log(
              "View vehicle:",
              vehicle
            );
          }}
        />

        <AuthRequiredBottomSheet
          visible={
            showAuthSheet
          }
          onClose={() =>
            setShowAuthSheet(
              false
            )
          }
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
