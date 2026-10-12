import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import NearVehicleCard, { NearVehicleItem } from "@/features/renter/components/home/NearVehicleCard";
import { getAvailableVehicles } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";

export default function Favorites() {
  const { isGuest } = useAuth();
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await getAvailableVehicles();
      setVehicles(data);
    } catch (e) {
      console.error("Failed to load vehicles in favorites tab", e);
    } finally {
      setLoading(false);
    }
  };

  const favoriteVehicles = vehicles.filter((v) => favorites.includes(String(v.id)));

  const handleViewVehicle = (vehicle: NearVehicleItem) => {
    router.push(`/vehicles/${vehicle.id}` as any);
  };

  const handleFavoriteVehicle = (vehicle: NearVehicleItem) => {
    toggleFavorite(vehicle.id);
  };

  if (isGuest) {
    return (
      <ScreenContainer>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="heart" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Save Your Dream Cars</Text>
          <Text style={styles.subtitle}>
            Sign in to bookmark vehicles, compare daily rates, and quickly book your favorites.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/auth")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Sign In to Ride4Rent</Text>
          </TouchableOpacity>
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
            <Text style={styles.title}>Saved Fleet</Text>
            <Text style={styles.subtitle}>
              {favoriteVehicles.length} {favoriteVehicles.length === 1 ? "vehicle bookmarked" : "vehicles bookmarked"}
            </Text>
          </View>

          {favoriteVehicles.length > 0 && (
            <View style={styles.badgeCount}>
              <Ionicons name="bookmark" size={14} color={Colors.dark} />
              <Text style={styles.badgeText}>{favoriteVehicles.length}</Text>
            </View>
          )}
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
              Vehicles you mark as favorite while browsing will appear here for easy comparison and quick access.
            </Text>
          </View>
        ) : (
          <FlatList
            data={favoriteVehicles}
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
                <NearVehicleCard
                  vehicle={formattedItem}
                  isFavorite={isFavorite(formattedItem.id)}
                  onViewPress={handleViewVehicle}
                  onFavoritePress={handleFavoriteVehicle}
                  containerStyle={styles.favoriteCard}
                />
              );
            }}
          />
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
    marginBottom: Spacing.md,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    marginTop: 4,
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
  favoriteCard: {
    width: "100%",
    height: 190,
    marginRight: 0,
    marginBottom: Spacing.md,
  },
});
