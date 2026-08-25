import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import AuthRequiredBottomSheet from "@/features/auth/components/AuthRequiredBottomSheet";
import VehicleCard from "@/features/renter/components/home/VehicleCard";

import { Colors } from "@/constants/colors";
import {
    FontFamily,
    FontSize,
    Spacing,
} from "@/constants/theme";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
    getAvailableVehicles,
    getNearbyVehicles,
} from "@/features/operator/services/vehicleService";
import { Vehicle as ApiVehicle } from "@/features/operator/types/vehicle";

const fallbackVehicles = [
  {
    id: "1",
    name: "Toyota Vios",
    image: require("../../../../../assets/img/car1.png"),
    pricePerDay: 1500,
    rating: 4.8,
    ratingCount: 27,
  },
  {
    id: "2",
    name: "Honda City",
    image: require("../../../../../assets/img/car2.png"),
    pricePerDay: 1800,
    rating: 4.7,
    ratingCount: 20,
  },
  {
    id: "3",
    name: "Mitsubishi Xpander",
    image: require("../../../../../assets/img/car3.png"),
    pricePerDay: 2500,
    rating: 4.9,
    ratingCount: 15,
  },
];

export default function AvailableVehicles() {
  const { isGuest } = useAuth();

  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<any[]>(fallbackVehicles);

  useEffect(() => {
    let mounted = true;

    const loadVehicles = async () => {
      let availableVehicles: ApiVehicle[] = [];

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const location = await Location.getCurrentPositionAsync({});
          availableVehicles = await getNearbyVehicles(
            location.coords.latitude,
            location.coords.longitude,
          );
        } else {
          availableVehicles = await getAvailableVehicles();
        }
      } catch {
        availableVehicles = await getAvailableVehicles();
      }

      return availableVehicles;
    };

    loadVehicles()
      .then((apiVehicles: ApiVehicle[]) => {
        if (!mounted || apiVehicles.length === 0) {
          return;
        }

        setVehicles(apiVehicles.map((vehicle) => ({
          id: String(vehicle.id),
          name: vehicle.name,
          image: vehicle.image_url ? { uri: vehicle.image_url } : require("../../../../../assets/img/car1.png"),
          pricePerDay: vehicle.price_per_day,
          rating: 0,
          ratingCount: 0,
        })));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const handleViewMore = () => {
    // Future vehicle listing screen
  };

  const handleViewVehicle = (vehicle: any) => {
    // Future vehicle details screen
  };

  const handleFavoriteVehicle = (vehicle: any) => {
    if (isGuest) {
      setShowAuthSheet(true);
      return;
    }

    setFavorites((currentFavorites) => {
      if (currentFavorites.includes(vehicle.id)) {
        return currentFavorites.filter(
          (id) => id !== vehicle.id
        );
      }

      return [
        ...currentFavorites,
        vehicle.id,
      ];
    });
  };

  return (
    <>
      <View style={styles.container}>

        <View style={styles.sectionHeader}>

          <Text style={styles.title}>
            Available Vehicles Near You
          </Text>

          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={handleViewMore}
            activeOpacity={0.8}
          >
            <Text style={styles.viewMoreText}>
              View More
            </Text>

            <MaterialCommunityIcons
              name="chevron-right"
              size={21}
              color={Colors.primary}
            />
          </TouchableOpacity>

        </View>

        <View style={styles.carouselContainer}>

          <View style={styles.topShadow} />

          <FlatList
            data={vehicles}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            snapToAlignment="center"
            snapToInterval={300 + Spacing.md}
            decelerationRate="fast"
            disableIntervalMomentum
            renderItem={({ item }) => (
              <VehicleCard
                vehicle={item}
                isFavorite={favorites.includes(item.id)}
                onViewPress={handleViewVehicle}
                onFavoritePress={handleFavoriteVehicle}
              />
            )}
          />

          <View style={styles.bottomShadow} />

        </View>

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
    position: "relative",
    marginTop: -40,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  title: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.body,
    color: Colors.dark,
  },

  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },

  viewMoreText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },

  carouselContainer: {
    position: "relative",
  },

  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  topShadow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    zIndex: 10,

    shadowColor: Colors.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,

    elevation: 4,
  },

  bottomShadow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 12,
    zIndex: 10,

    shadowColor: Colors.dark,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,

    elevation: 4,
  },
});
