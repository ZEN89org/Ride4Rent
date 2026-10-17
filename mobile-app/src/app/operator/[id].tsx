import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProCardSkeleton, Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import {
  MUNICIPALITY_COORDINATES,
  resolveCoordinatesFromAddress,
} from "@/constants/orientalMindoroLocations";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useFavorites } from "@/context/FavoritesContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getOperatorFleet } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";

export default function OperatorProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isGuest } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [operator, setOperator] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !/^\d+$/.test(String(id))) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getOperatorFleet(id)
      .then((res) => {
        setOperator(res?.operator || null);
        setVehicles(Array.isArray(res?.vehicles) ? res.vehicles : []);
      })
      .catch((err) => {
        console.log("Could not load operator fleet:", err?.message || err);
        setVehicles([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleChatPress = () => {
    if (isGuest) {
      router.push("/auth");
      return;
    }
    router.push({
      pathname: `/chat/${id}`,
      params: {
        name: operator?.business_name || operator?.name || "Host",
      },
    } as any);
  };

  const handleViewVehicle = (vehicle: Vehicle) => {
    router.push(`/vehicles/${vehicle.id}` as any);
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Host Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: Spacing.lg }}>
          <Skeleton height={150} borderRadius={20} style={{ marginBottom: 20 }} />
          <ProCardSkeleton />
          <ProCardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!operator) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Host Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Host Profile Unavailable</Text>
          <Text style={styles.emptySubtext}>
            This host does not have any active public profile details or listings yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const businessName = operator?.business_name || operator?.name || "Verified Operator";
  const addressParts = [
    operator?.street_address,
    operator?.barangay,
    operator?.municipality,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(", ") : operator?.address || null;
  const profilePhoto = operator?.profile_photo;

  const vehicleWithCoords = vehicles.find(
    (v) => v.pickup_latitude && v.pickup_longitude && Number(v.pickup_latitude) !== 0
  );
  const effectiveAddress =
    vehicleWithCoords?.pickup_address ||
    vehicles[0]?.pickup_address ||
    fullAddress ||
    "Calapan City, Oriental Mindoro";

  const fallbackGeocoded = resolveCoordinatesFromAddress(effectiveAddress);

  // Unify coordinate resolution with vehicle details view
  const rawLat =
    vehicleWithCoords?.pickup_latitude ||
    operator?.latitude ||
    (vehicles[0] as any)?.pickup_latitude;
  const rawLng =
    vehicleWithCoords?.pickup_longitude ||
    operator?.longitude ||
    (vehicles[0] as any)?.pickup_longitude;

  const finalLat =
    rawLat && Number(rawLat) !== 0 && !isNaN(Number(rawLat))
      ? Number(rawLat)
      : fallbackGeocoded.latitude;
  const finalLng =
    rawLng && Number(rawLng) !== 0 && !isNaN(Number(rawLng))
      ? Number(rawLng)
      : fallbackGeocoded.longitude;

  const handleViewLocationInApp = () => {
    router.push({
      pathname: "/live-tracking",
      params: {
        type: "pickup",
        mode: "pickup",
        title: "Pickup & Garage Location",
        vehicleName: businessName,
        address: effectiveAddress,
        latitude: String(finalLat),
        longitude: String(finalLng),
        lat: String(finalLat),
        lng: String(finalLng),
      },
    } as any);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {businessName}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.profileHeaderSection}>
            {/* Host Cover Accent Banner */}
            <View style={styles.coverAccent}>
              <View style={styles.accentCircleOne} />
              <View style={styles.accentCircleTwo} />
            </View>

            {/* Avatar overlapping the banner */}
            <View style={styles.avatarRowWrapper}>
              <View style={styles.avatarWrap}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.avatarImg} />
                ) : (
                  <Ionicons name="business" size={36} color={Colors.dark} />
                )}
              </View>

              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>Verified Host</Text>
              </View>
            </View>

            {/* Host Identity Details */}
            <View style={styles.detailsBlock}>
              <Text style={styles.businessTitle} numberOfLines={2}>
                {businessName}
              </Text>

              <Text style={styles.ownerText}>
                Managed by {operator?.name || "Verified Host"}
              </Text>

              {fullAddress ? (
                <View style={styles.addressContainer}>
                  <Ionicons name="location-sharp" size={15} color={Colors.primary} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {fullAddress}
                  </Text>
                </View>
              ) : null}

              {/* Action Buttons Row */}
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={styles.chatAction}
                  onPress={handleChatPress}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color={Colors.dark} />
                  <Text style={styles.chatActionText}>Message Host</Text>
                </TouchableOpacity>

                {operator?.business_contact_number || operator?.mobile_number ? (
                  <TouchableOpacity
                    style={styles.contactBadge}
                    onPress={() => {
                      const phone = operator.business_contact_number || operator.mobile_number;
                      if (phone) {
                        Linking.openURL(`tel:${phone}`);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="call" size={15} color={Colors.dark} />
                    <Text style={styles.contactText}>
                      {operator.business_contact_number || operator.mobile_number}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Statistics Pill Line */}
              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statNumber}>{vehicles.length}</Text>
                  <Text style={styles.statLabel}>Available Cars</Text>
                </View>

                <View style={styles.statPill}>
                  <Text style={styles.statNumber}>Fast</Text>
                  <Text style={styles.statLabel}>Response Rate</Text>
                </View>

                <View style={styles.statPill}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Text style={styles.statNumber}>5.0</Text>
                    <Ionicons name="star" size={13} color={Colors.primary} />
                  </View>
                  <Text style={styles.statLabel}>Host Rating</Text>
                </View>
              </View>

              {/* Pickup & Garage Location - Exactly matching vehicle details card */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeading}>Pickup & Garage Location</Text>
              <View style={styles.locationCard}>
                <View style={styles.locationInfoRow}>
                  <Ionicons name="location-sharp" size={22} color={Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locationTitle}>
                      {effectiveAddress}
                    </Text>
                    <Text style={styles.locationSubtitle}>
                      Official garage & vehicle meetup point for this host.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.directionsButton}
                  onPress={handleViewLocationInApp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map-outline" size={16} color={Colors.dark} />
                  <Text style={styles.directionsButtonText}>View Location on Map</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dividerLine} />
            <Text style={styles.fleetHeader}>Fleet Listings ({vehicles.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No Vehicles Currently Listed</Text>
            <Text style={styles.emptySubtext}>This host has no active vehicle listings available at the moment.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const fav = isFavorite(item.id);
          return (
            <TouchableOpacity
              style={styles.vehicleCard}
              onPress={() => handleViewVehicle(item)}
              activeOpacity={0.88}
            >
              <Image
                source={{
                  uri:
                    item.image_url ||
                    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60",
                }}
                style={styles.cardThumb}
              />

              <View style={styles.cardDetails}>
                <Text style={styles.carName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.carSpecs}>
                  {item.transmission || "Auto"} • {item.seats || 4} Seats • {item.vehicle_type || "Sedan"}
                </Text>

                <View style={styles.priceRow}>
                  <Text style={styles.carPrice}>
                    ₱{Number(item.price_per_day).toLocaleString()}
                    <Text style={styles.carPricePeriod}> / day</Text>
                  </Text>

                  <TouchableOpacity
                    onPress={() => toggleFavorite(item.id)}
                    style={styles.favSmall}
                  >
                    <Ionicons
                      name={fav ? "heart" : "heart-outline"}
                      size={18}
                      color={fav ? Colors.primary : Colors.dark}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    flex: 1,
    textAlign: "center",
    marginHorizontal: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  profileHeaderSection: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  coverAccent: {
    height: 90,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
  },
  accentCircleOne: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    top: -40,
    right: -20,
  },
  accentCircleTwo: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    bottom: -20,
    left: 20,
  },
  avatarRowWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: -38,
    paddingHorizontal: Spacing.md,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 4,
  },
  verifiedText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#065F46",
  },
  detailsBlock: {
    marginTop: Spacing.sm,
    paddingHorizontal: 4,
  },
  businessTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.dark,
  },
  ownerText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 2,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  addressText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: Spacing.md,
  },
  chatAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chatActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  contactBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  contactText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
  },
  statPill: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
    marginTop: 4,
    marginBottom: 6,
  },
  locationCard: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: 4,
    gap: 12,
  },
  locationInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  locationTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  locationSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  directionsButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  dividerLine: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.lg,
  },
  fleetHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.dark,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },
  emptySubtext: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: Spacing.sm,
    lineHeight: 19,
  },
  backBtnAction: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  backBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  vehicleCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 10,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: Spacing.md,
  },
  cardThumb: {
    width: 100,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.inputBackground,
  },
  cardDetails: {
    flex: 1,
  },
  carName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  carSpecs: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  carPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  carPricePeriod: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondary,
  },
  favSmall: {
    padding: 4,
  },
});
