import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useRef, useState } from "react";
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

import { useFavorites } from "@/context/FavoritesContext";
import { router, useFocusEffect, useNavigation } from "expo-router";

import { VehicleCardSkeleton } from "@/components/common/Skeleton";
import { getSavedLocation, saveLocation } from "@/storage/locationStorage";

import { matchesVehicleSearch } from "@/utils/vehicleSearch";

interface AvailableVehiclesProps {
  searchQuery?: string;
  onViewMore?: () => void;
}

export default function AvailableVehicles({ searchQuery = "", onViewMore }: AvailableVehiclesProps) {
  const { isGuest } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isShowingFallbackAll, setIsShowingFallbackAll] = useState(false);
  const hasLoadedRef = useRef(false);
  const lastLocationKeyRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const checkAndLoad = async () => {
        const [savedLocPref, savedLoc] = await Promise.all([
          AsyncStorage.getItem("@settings_location").catch(() => null),
          getSavedLocation().catch(() => null),
        ]);

        const isLocEnabled = savedLocPref === null ? true : JSON.parse(savedLocPref);
        const currentLocationKey = `${isLocEnabled}:${savedLoc?.latitude ?? "none"}:${savedLoc?.longitude ?? "none"}`;

        if (hasLoadedRef.current && lastLocationKeyRef.current === currentLocationKey) {
          return;
        }

        if (!hasLoadedRef.current) {
          setLoading(true);
        }

        let availableVehicles: ApiVehicle[] = [];
        let usedFallback = false;

        try {
          if (isLocEnabled) {
            if (
              savedLoc &&
              Number.isFinite(savedLoc.latitude) &&
              Number.isFinite(savedLoc.longitude)
            ) {
              availableVehicles = await getNearbyVehicles(
                savedLoc.latitude,
                savedLoc.longitude,
                25
              );

              if (availableVehicles.length === 0) {
                availableVehicles = await getAvailableVehicles();
                usedFallback = true;
              }
            } else {
              const permission = await Location.requestForegroundPermissionsAsync();
              if (permission.granted) {
                const location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;

                try {
                  const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
                  const g = geo?.[0];
                  const addr = g
                    ? [g.street, g.district, g.city, g.region].filter(Boolean).join(", ")
                    : "Current GPS Location";
                  await saveLocation({
                    latitude,
                    longitude,
                    address: addr || "Current GPS Location",
                    confirmed: true,
                  });
                } catch {
                  // ignore reverse geocode error
                }

                availableVehicles = await getNearbyVehicles(latitude, longitude, 25);

                if (availableVehicles.length === 0) {
                  availableVehicles = await getAvailableVehicles();
                  usedFallback = true;
                }
              } else {
                availableVehicles = await getAvailableVehicles();
                usedFallback = true;
              }
            }
          } else {
            availableVehicles = await getAvailableVehicles();
            usedFallback = true;
          }
        } catch {
          availableVehicles = await getAvailableVehicles();
          usedFallback = true;
        }

        if (!mounted) {
          return;
        }

        const updatedSavedLoc = await getSavedLocation().catch(() => savedLoc);
        lastLocationKeyRef.current = `${isLocEnabled}:${updatedSavedLoc?.latitude ?? "none"}:${updatedSavedLoc?.longitude ?? "none"}`;
        hasLoadedRef.current = true;

        setIsShowingFallbackAll(usedFallback && availableVehicles.length > 0);
        setVehicles(
          availableVehicles.map((vehicle) => ({
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
            rating:
              Number(vehicle.rating_count || 0) > 0 &&
              vehicle.rating !== null &&
              vehicle.rating !== undefined
                ? Number(vehicle.rating)
                : 0,
            ratingCount: Number(vehicle.rating_count || 0),
            distance_km: vehicle.distance_km,
            seats: vehicle.seats,
            transmission: vehicle.transmission,
            available_units: vehicle.available_units,
            demand_badge: (vehicle as any).demand_pricing?.demand_badge,
            demand_level: (vehicle as any).demand_pricing?.demand_level,
          }))
        );
      };

      checkAndLoad()
        .catch(() => undefined)
        .finally(() => {
          if (mounted) setLoading(false);
        });

      return () => {
        mounted = false;
      };
    }, [])
  );

  const navigation = useNavigation<any>();

  const handleViewMore = () => {
    if (onViewMore) {
      onViewMore();
      return;
    }
    try {
      navigation.navigate("search");
    } catch {
      router.navigate("/(tabs)/search" as any);
    }
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

        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={handleViewMore}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={searchQuery.trim() ? "Open search results" : "Browse all available vehicles"}
        >
          <Text style={styles.title} numberOfLines={1}>
            {searchQuery.trim()
              ? `Search: ${searchQuery.trim()} (${displayedVehicles.length})`
              : "Available Vehicles Near You"}
          </Text>
          <Ionicons name="arrow-forward" size={17} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.carouselContainer}>

          <View pointerEvents="none" style={styles.topShadow} />

          {loading ? (
            <View style={{ flexDirection: "row", paddingHorizontal: Spacing.lg, gap: Spacing.sm }}>
              <VehicleCardSkeleton width={250} height={180} />
              <VehicleCardSkeleton width={250} height={180} />
            </View>
          ) : displayedVehicles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Vehicles Found</Text>
              <Text style={styles.emptyText}>
                Check back soon or explore different search filters.
              </Text>
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

          <View pointerEvents="none" style={styles.bottomShadow} />

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
    minHeight: 36,
    marginBottom: 10,
  },

  title: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.dark,
    marginRight: Spacing.sm,
  },

  carouselEndCard: {
    width: 140,
    height: 195,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    marginRight: Spacing.lg,
  },

  carouselEndIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF9C3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  carouselEndTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#0F172A",
  },

  carouselEndSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 10,
  },

  carouselEndPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  carouselEndPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
    color: "#0F172A",
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
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 24,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },

  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: Spacing.sm,
  },
});
