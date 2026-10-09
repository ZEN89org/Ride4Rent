import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import NearVehicleCard from "@/features/renter/components/home/NearVehicleCard";

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

import { router } from "expo-router";
import { useFavorites } from "@/context/FavoritesContext";

import { VehicleCardSkeleton } from "@/components/common/Skeleton";

import { matchesVehicleSearch } from "@/utils/vehicleSearch";

interface AvailableVehiclesProps {
  searchQuery?: string;
}

export default function AvailableVehicles({ searchQuery = "" }: AvailableVehiclesProps) {
  const { isGuest } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isShowingFallbackAll, setIsShowingFallbackAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadVehicles = async () => {
      let availableVehicles: ApiVehicle[] = [];
      let usedFallback = false;

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const location = await Location.getCurrentPositionAsync({});
          availableVehicles = await getNearbyVehicles(
            location.coords.latitude,
            location.coords.longitude,
            25
          );

          // If no vehicles found strictly nearby, smoothly fallback to all available vehicles
          if (availableVehicles.length === 0) {
            availableVehicles = await getAvailableVehicles();
            usedFallback = true;
          }
        } else {
          availableVehicles = await getAvailableVehicles();
          usedFallback = true;
        }
      } catch {
        availableVehicles = await getAvailableVehicles();
        usedFallback = true;
      }

      if (mounted) {
        setIsShowingFallbackAll(usedFallback && availableVehicles.length > 0);
      }

      return availableVehicles;
    };

    loadVehicles()
      .then((apiVehicles: ApiVehicle[]) => {
        if (!mounted) {
          return;
        }

        setVehicles(apiVehicles.map((vehicle) => ({
          ...vehicle,
          id: String(vehicle.id),
          name: vehicle.name,
          brand: vehicle.brand,
          model: vehicle.model,
          year_model: vehicle.year_model,
          vehicle_type: vehicle.vehicle_type,
          body_type: vehicle.body_type,
          fuel_type: vehicle.fuel_type,
          pickup_address: vehicle.pickup_address,
          description: vehicle.description,
          operator: vehicle.operator,
          image: vehicle.image_url
            ? { uri: vehicle.image_url }
            : { uri: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60" },
          pricePerDay: Number(vehicle.price_per_day),
          rating: (Number(vehicle.rating_count || 0) > 0 && vehicle.rating !== null && vehicle.rating !== undefined) ? Number(vehicle.rating) : 0,
          ratingCount: Number(vehicle.rating_count || 0),
          distance_km: vehicle.distance_km,
          seats: vehicle.seats,
          transmission: vehicle.transmission,
          available_units: vehicle.available_units,
          demand_badge: (vehicle as any).demand_pricing?.demand_badge,
          demand_level: (vehicle as any).demand_pricing?.demand_level,
        })));
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleViewMore = () => {
    router.push("/(tabs)/search");
  };

  const handleViewVehicle = (vehicle: any) => {
    router.push(`/vehicles/${vehicle.id}` as any);
  };

  const handleFavoriteVehicle = (vehicle: any) => {
    if (isGuest) {
      setShowAuthSheet(true);
      return;
    }

    toggleFavorite(vehicle.id);
  };

  const displayedVehicles = searchQuery.trim()
    ? vehicles.filter((v) => matchesVehicleSearch(v, searchQuery))
    : vehicles.slice(0, 10);

  return (
    <>
      <View style={styles.container}>

        <View style={styles.sectionHeader}>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {searchQuery.trim()
                ? `Search: ${searchQuery.trim()} (${displayedVehicles.length})`
                : "Available Vehicles Near You"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={handleViewMore}
            activeOpacity={0.8}
          >
            <Text style={styles.viewMoreText}>
              View More
            </Text>

            <Ionicons
              name="arrow-forward"
              size={16}
              color={Colors.primary}
            />
          </TouchableOpacity>

        </View>

        <View style={styles.carouselContainer}>

          <View style={styles.topShadow} />

          {loading ? (
            <View style={{ flexDirection: "row", paddingHorizontal: Spacing.lg, gap: Spacing.sm }}>
              <VehicleCardSkeleton width={250} height={180} />
              <VehicleCardSkeleton width={250} height={180} />
            </View>
          ) : displayedVehicles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="car-off" size={32} color={Colors.secondary} />
              <Text style={styles.emptyTitle}>No Vehicles Found</Text>
              <Text style={styles.emptyText}>
                Check back soon or explore different search filters.
              </Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={handleViewMore}>
                <Text style={styles.exploreBtnText}>Browse All</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={displayedVehicles}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              snapToAlignment="start"
              snapToInterval={250 + Spacing.sm}
              decelerationRate="fast"
              disableIntervalMomentum
              renderItem={({ item }) => (
                <NearVehicleCard
                  vehicle={item}
                  isFavorite={isFavorite(item.id)}
                  onViewPress={handleViewVehicle}
                  onFavoritePress={handleFavoriteVehicle}
                />
              )}
            />
          )}

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
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.white,
    overflow: "hidden",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: 8,
  },

  title: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.dark,
  },

  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: Spacing.sm,
  },

  viewMoreText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },

  carouselContainer: {
    position: "relative",
  },

  list: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
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

  subtitleHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
    lineHeight: 15,
  },

  emptyContainer: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.body,
    color: Colors.dark,
    marginTop: Spacing.xs,
  },

  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondary,
    textAlign: "center",
  },

  exploreBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.logoBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  exploreBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
});

