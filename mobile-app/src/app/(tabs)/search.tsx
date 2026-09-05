import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ScreenContainer from "@/components/common/ScreenContainer";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useFavorites } from "@/context/FavoritesContext";
import { getAvailableVehicles } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";

const CATEGORIES = ["All", "Sedan", "SUV", "Van", "Hatchback", "Automatic", "Manual"];
const PRICE_SORTS = ["Default", "Price: Low to High", "Price: High to Low"];

export default function Search() {
  const params = useLocalSearchParams<{ query?: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [searchQuery, setSearchQuery] = useState(params.query || "");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("Default");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.query) {
      setSearchQuery(params.query);
    }
  }, [params.query]);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await getAvailableVehicles();
      setVehicles(data);
    } catch (e) {
      console.error("Failed to load search vehicles", e);
    } finally {
      setLoading(false);
    }
  };

  let filteredVehicles = vehicles.filter((v) => {
    const matchesQuery =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.brand && v.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (v.operator?.business_name && v.operator.business_name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesQuery) return false;

    if (selectedCategory === "All") return true;
    if (selectedCategory === "Automatic" || selectedCategory === "Manual") {
      return v.transmission?.toLowerCase() === selectedCategory.toLowerCase();
    }
    return (
      v.vehicle_type?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      v.name.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  });

  if (sortOption === "Price: Low to High") {
    filteredVehicles = [...filteredVehicles].sort((a, b) => Number(a.price_per_day) - Number(b.price_per_day));
  } else if (sortOption === "Price: High to Low") {
    filteredVehicles = [...filteredVehicles].sort((a, b) => Number(b.price_per_day) - Number(a.price_per_day));
  }

  const handleViewVehicle = (vehicle: Vehicle) => {
    router.push(`/vehicles/${vehicle.id}` as any);
  };

  const handleOperatorPress = (operatorId?: number) => {
    if (operatorId) {
      router.push(`/operator/${operatorId}` as any);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Modern Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.dark} />
          <TextInput
            placeholder="Search vehicle, brand, or host..."
            placeholderTextColor={Colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Categories Bar */}
        <View style={styles.categoriesWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.categoriesList}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item;
              return (
                <TouchableOpacity
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && styles.categoryPillTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Results Count & Quick Sort Filter */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredVehicles.length} {filteredVehicles.length === 1 ? "Vehicle" : "Vehicles"} Available
          </Text>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const nextIndex = (PRICE_SORTS.indexOf(sortOption) + 1) % PRICE_SORTS.length;
              setSortOption(PRICE_SORTS[nextIndex]);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="sort" size={16} color={Colors.dark} />
            <Text style={styles.sortText}>{sortOption}</Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Results in Professional Card Grid / List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color={Colors.secondary} />
            <Text style={styles.emptyTitle}>No Vehicles Found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with different terms or selecting another category filter.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredVehicles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const fav = isFavorite(item.id);
              const operatorName = item.operator?.business_name || item.operator?.name || "Verified Host";

              return (
                <TouchableOpacity
                  style={styles.proCard}
                  onPress={() => handleViewVehicle(item)}
                  activeOpacity={0.88}
                >
                  {/* Image & Badges */}
                  <View style={styles.cardImageWrap}>
                    <Image
                      source={{
                        uri:
                          item.image_url ||
                          "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60",
                      }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />

                    {/* Favorite Heart Button */}
                    <TouchableOpacity
                      style={styles.favCircle}
                      onPress={() => toggleFavorite(item.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={fav ? "heart" : "heart-outline"}
                        size={18}
                        color={fav ? Colors.primary : Colors.dark}
                      />
                    </TouchableOpacity>

                    {/* Transmission / Seat Pill */}
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {item.transmission || "Auto"} • {item.seats || 4} Seats
                      </Text>
                    </View>
                  </View>

                  {/* Content Section */}
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

                    {/* Host & Location */}
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

                    {/* Spec features row */}
                    <View style={styles.specsLine}>
                      <View style={styles.specItem}>
                        <MaterialCommunityIcons name="gas-station" size={13} color={Colors.secondary} />
                        <Text style={styles.specLabel}>{item.fuel_type || "Gasoline"}</Text>
                      </View>
                      <View style={styles.specDot} />
                      <View style={styles.specItem}>
                        <MaterialCommunityIcons name="car-door" size={13} color={Colors.secondary} />
                        <Text style={styles.specLabel}>{item.number_of_doors || 4} Doors</Text>
                      </View>
                      <View style={styles.specDot} />
                      <View style={styles.specItem}>
                        <Ionicons name="shield-checkmark-outline" size={13} color="#10B981" />
                        <Text style={[styles.specLabel, { color: "#10B981", fontFamily: FontFamily.semiBold }]}>
                          Verified
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.dark,
  },
  categoriesWrapper: {
    marginVertical: Spacing.md,
  },
  categoriesList: {
    gap: Spacing.xs,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
  },
  categoryPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
  },
  categoryPillTextActive: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  resultsCount: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sortText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    marginTop: 8,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
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
    height: 170,
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
