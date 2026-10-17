import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ListPagination from "@/components/common/ListPagination";
import ScreenContainer from "@/components/common/ScreenContainer";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useFavorites } from "@/context/FavoritesContext";
import AuthRequiredBottomSheet from "@/features/auth/components/AuthRequiredBottomSheet";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getAvailableVehicles } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";
import NearVehicleCard, { NearVehicleItem } from "@/features/renter/components/home/NearVehicleCard";

import { matchesVehicleSearch } from "@/utils/vehicleSearch";

const CATEGORIES = ["All", "Sedan", "SUV", "Van", "Hatchback", "Automatic", "Manual"];
const PRICE_SORTS = ["Default", "Price: Low to High", "Price: High to Low"];
const ITEMS_PER_PAGE = 15;

export default function Search() {
  const params = useLocalSearchParams<{ query?: string }>();
  const { isGuest } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState(params.query || "");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("Default");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const flatListRef = React.useRef<FlatList>(null);

  useEffect(() => {
    if (params.query) {
      setSearchQuery(params.query);
    }
  }, [params.query]);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortOption]);

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
    const matchesQuery = matchesVehicleSearch(v, searchQuery);
    if (!matchesQuery) return false;

    if (selectedCategory === "All") return true;
    if (selectedCategory === "Automatic" || selectedCategory === "Manual") {
      return v.transmission?.toLowerCase() === selectedCategory.toLowerCase();
    }
    return (
      v.vehicle_type?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      v.name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      v.body_type?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  });

  if (sortOption === "Price: Low to High") {
    filteredVehicles = [...filteredVehicles].sort((a, b) => Number(a.price_per_day) - Number(b.price_per_day));
  } else if (sortOption === "Price: High to Low") {
    filteredVehicles = [...filteredVehicles].sort((a, b) => Number(b.price_per_day) - Number(a.price_per_day));
  }

  const totalItems = filteredVehicles.length;
  const paginatedVehicles = filteredVehicles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewVehicle = (vehicle: NearVehicleItem) => {
    router.push(`/vehicles/${vehicle.id}` as any);
  };

  const handleFavoriteVehicle = (vehicle: NearVehicleItem) => {
    if (isGuest) {
      setShowAuthSheet(true);
      return;
    }
    toggleFavorite(vehicle.id);
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Your Ride</Text>
          <Text style={styles.subtitle}>Search available vehicles for your next trip.</Text>
        </View>

        {/* Modern Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.dark} />
          <TextInput
            placeholder="Vehicle, brand, or type"
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

        {/* Vehicle Results in Full-Width NearVehicleCard Stack */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Vehicles Found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching with different terms or selecting another category filter.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={paginatedVehicles}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <ListPagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={ITEMS_PER_PAGE}
                itemName="vehicles"
                onPageChange={(page) => {
                  setCurrentPage(page);
                  flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
                }}
              />
            }
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
                  containerStyle={styles.searchCard}
                />
              );
            }}
          />
        )}
      </View>

      <AuthRequiredBottomSheet
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
      />
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
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.small,
    color: Colors.secondary,
    marginTop: -2,
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
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
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
  list: {
    paddingBottom: 32,
  },
  searchCard: {
    width: "100%",
    height: 190,
    marginRight: 0,
    marginBottom: Spacing.md,
  },
});
