import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ScreenContainer from "@/components/common/ScreenContainer";
import { VehicleCardSkeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getAvailableVehicles } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";
import NearVehicleCard, { NearVehicleItem } from "@/features/renter/components/home/NearVehicleCard";

export default function Favorites() {
  const { isGuest } = useAuth();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"price" | "rating" | "seats">("price");
  const [availabilityOnly, setAvailabilityOnly] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getAvailableVehicles()
      .then((data) => {
        if (isMounted) setVehicles(data);
      })
      .catch((error) => {
        console.error("Failed to load vehicles in favorites tab", error);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const favoriteVehicles = vehicles.filter((v) => favorites.includes(String(v.id)));
  const availableFavoriteCount = favoriteVehicles.filter(
    (vehicle) =>
      vehicle.is_available &&
      !vehicle.is_rented &&
      (vehicle.available_units ?? 1) > 0,
  ).length;
  const bestRateVehicle = favoriteVehicles.reduce<Vehicle | null>(
    (best, vehicle) =>
      !best || Number(vehicle.price_per_day) < Number(best.price_per_day)
        ? vehicle
        : best,
    null,
  );
  const displayedVehicles = favoriteVehicles
    .filter((vehicle) => {
      if (!availabilityOnly) return true;
      return (
        vehicle.is_available &&
        !vehicle.is_rented &&
        (vehicle.available_units ?? 1) > 0
      );
    })
    .sort((a, b) => {
      if (sortBy === "rating") return Number(b.rating || 0) - Number(a.rating || 0);
      if (sortBy === "seats") return Number(b.seats || 0) - Number(a.seats || 0);
      return Number(a.price_per_day) - Number(b.price_per_day);
    });

  const handleViewVehicle = (vehicle: NearVehicleItem) => {
    router.push(`/vehicles/${vehicle.id}` as any);
  };

  const handleFavoriteVehicle = (vehicle: NearVehicleItem) => {
    toggleFavorite(vehicle.id);
  };

  if (isGuest) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Favorite Rides</Text>
              <Text style={styles.headerSubtitle}>
                Save your favorite rides for later.
              </Text>
            </View>
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Save Your Dream Cars</Text>
            <Text style={styles.emptySubtitle}>
              Sign in to save vehicles and quickly find your next ride.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Minimalist Professional Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Favorite Rides</Text>
            <Text style={styles.headerSubtitle}>
              Save your favorite rides for later.
            </Text>
          </View>

        </View>

        {loading ? (
          <View style={styles.skeletonList}>
            <VehicleCardSkeleton height={190} />
            <View style={{ height: Spacing.md }} />
            <VehicleCardSkeleton height={190} />
          </View>
        ) : favoriteVehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Saved Vehicles Yet</Text>
            <Text style={styles.emptySubtitle}>
              Vehicles you save while browsing will appear here for easy access.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.highlightsRow}>

            </View>

            <View style={styles.sortHeader}>
              <Text style={styles.sortLabel}>Sort saved rides</Text>
              <Text style={styles.resultCount}>
                {displayedVehicles.length} {displayedVehicles.length === 1 ? "ride" : "rides"}
              </Text>
            </View>
            <View style={styles.sortOptions}>
              {([
                ["price", "Lowest price"],
                ["rating", "Top rated"],
                ["seats", "Most seats"],
              ] as const).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
                  onPress={() => setSortBy(key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sortChipText, sortBy === key && styles.sortChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={displayedVehicles}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const formattedItem: NearVehicleItem = {
                  id: String(item.id),
                  name: item.name,
                  image: item.image_url
                    ? { uri: item.image_url }
                    : { uri: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60" },
                  pricePerDay: Number(item.price_per_day),
                  rating: (Number(item.rating_count || 0) > 0 && item.rating !== null && item.rating !== undefined) ? Number(item.rating) : 0,
                  ratingCount: Number(item.rating_count || 0),
                  distance_km: item.distance_km,
                  seats: item.seats ?? undefined,
                  transmission: item.transmission ?? undefined,
                  available_units: item.available_units,
                };

                return (
                  <View key={formattedItem.id} style={styles.favoriteItem}>
                    <NearVehicleCard
                      vehicle={formattedItem}
                      isFavorite={isFavorite(formattedItem.id)}
                      onViewPress={handleViewVehicle}
                      onFavoritePress={handleFavoriteVehicle}
                      containerStyle={styles.favoriteCard}
                    />
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Rides Available Right Now</Text>
                  <Text style={styles.emptySubtitle}>
                    None of your saved vehicles are currently available for rent.
                  </Text>
                </View>
              }
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondary,
    marginTop: -2,
  },
  badgeCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.logoBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  skeletonList: {
    marginTop: Spacing.sm,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconOuterRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEF9E7",
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyIconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: Spacing.sm,
  },
  emptyBenefitsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBenefitPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  emptyBenefitText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.dark,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.lg,
    backgroundColor: Colors.dark,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.white,
  },
  list: {
    paddingBottom: 32,
  },
  highlightsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  highlightCard: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  highlightCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.logoBackground,
  },
  highlightIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: Colors.logoBackground,
    marginBottom: 8,
  },
  highlightIconActive: {
    backgroundColor: Colors.dark,
  },
  highlightLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.secondary,
  },
  highlightValue: {
    marginTop: 3,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  highlightTotal: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  highlightHint: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondary,
  },
  sortHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  sortLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },
  resultCount: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  sortOptions: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  sortChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.inputBackground,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
  },
  sortChipText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.dark,
  },
  sortChipTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  filteredEmptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  filteredEmptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },
  showAllText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
    textDecorationLine: "underline",
  },
  favoriteItem: {
    marginBottom: Spacing.md,
  },
  favoriteCard: {
    width: "100%",
    height: 190,
    marginRight: 0,
  },
});
