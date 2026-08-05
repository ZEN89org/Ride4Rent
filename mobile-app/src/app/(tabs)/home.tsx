import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import AuthRequiredBottomSheet from "@/components/AuthRequiredBottomSheet";
import AvailableVehicles from "@/components/AvailableVehicles";
import HomeHeader from "@/components/HomeHeader";
import HomeTipsCarousel from "@/components/HomeTipsCarousel";
import ScreenContainer from "@/components/ScreenContainer";
import TopRatedVehicles from "@/components/TopRatedVehicles";

import { useSideNav } from "@/context/SideNavContext";
import { useAuth } from "@/hooks/useAuth";

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
