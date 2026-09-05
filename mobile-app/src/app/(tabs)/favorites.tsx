import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ScreenContainer from "@/components/common/ScreenContainer";
import { ProCardSkeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
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

  const handleViewVehicle = (vehicle: Vehicle) => {
    router.push(`/vehicles/${vehicle.id}` as any);
  };

  const handleOperatorPress = (operatorId?: number) => {
    if (operatorId) {
      router.push(`/operator/${operatorId}` as any);
    }
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
            <ProCardSkeleton />
            <ProCardSkeleton />
          </View>
        ) : favoriteVehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-dislike-outline" size={40} color={Colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any vehicle to save it for quick booking anytime.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/(tabs)/home")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Explore Available Cars</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={favoriteVehicles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const operatorName = item.operator?.business_name || item.operator?.name || "Verified Host";

              return (
                <TouchableOpacity
                  style={styles.proCard}
                  onPress={() => handleViewVehicle(item)}
                  activeOpacity={0.88}
                >
                  <View style={styles.cardImageWrap}>
                    <Image
                      source={{
                        uri:
                          item.image_url ||
                          "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60",
                      }}
                      style={styles.cardImage}
                    />

                    {/* Un-favorite button */}
                    <TouchableOpacity
                      style={styles.favCircle}
                      onPress={() => toggleFavorite(item.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="heart" size={18} color={Colors.primary} />
                    </TouchableOpacity>

                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {item.transmission || "Auto"} • {item.seats || 4} Seats
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.rateBadge}>
                        <Text style={styles.rateAmount}>
                          ₱{Number(item.price_per_day).toLocaleString()}
                        </Text>
                        <Text style={styles.rateUnit}>/day</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.operatorRow}
                      onPress={() => handleOperatorPress(item.operator?.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="business-outline" size={14} color={Colors.secondary} />
                      <Text style={styles.operatorText} numberOfLines={1}>
                        {operatorName}
                      </Text>
                      <Ionicons name="chevron-forward" size={12} color={Colors.secondary} />
                    </TouchableOpacity>

                    <View style={styles.specsLine}>
                      <View style={styles.specItem}>
                        <MaterialCommunityIcons name="gas-station" size={13} color={Colors.secondary} />
                        <Text style={styles.specLabel}>{item.fuel_type || "Gasoline"}</Text>
                      </View>
                      <View style={styles.specDot} />
                      <View style={styles.specItem}>
                        <Ionicons name="shield-checkmark-outline" size={13} color="#10B981" />
                        <Text style={[styles.specLabel, { color: "#10B981", fontFamily: FontFamily.semiBold }]}>
                          Ready to Book
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
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
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
    marginTop: 4,
  },
  emptySubtitle: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  list: {
    paddingBottom: 24,
  },
  proCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageWrap: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.inputBackground,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  favCircle: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(26,26,26,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.white,
  },
  cardBody: {
    padding: Spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.dark,
    marginRight: Spacing.sm,
  },
  rateBadge: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  rateAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  rateUnit: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginLeft: 2,
  },
  operatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  operatorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  specsLine: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 8,
    marginTop: 4,
    gap: Spacing.sm,
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  specDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.secondary,
  },
  specLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
});
