import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProCardSkeleton, Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
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
    if (!id) return;
    setLoading(true);
    getOperatorFleet(id)
      .then((res) => {
        setOperator(res.operator);
        setVehicles(res.vehicles);
      })
      .catch((err) => {
        console.error("Failed to load operator fleet:", err);
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

  const businessName = operator?.business_name || operator?.name || "Verified Operator";

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
          <View style={styles.profileHero}>
            {/* Host Identity */}
            <View style={styles.identityRow}>
              <View style={styles.avatarWrap}>
                <Ionicons name="business" size={30} color={Colors.dark} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameVerifiedRow}>
                  <Text style={styles.businessTitle} numberOfLines={1}>
                    {businessName}
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                </View>
                <Text style={styles.ownerText}>
                  Managed by {operator?.name || "Verified Host"}
                </Text>
                {operator?.address ? (
                  <Text style={styles.addressText} numberOfLines={1}>
                    📍 {operator.address}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Quick Metrics Bar */}
            <View style={styles.metricsBar}>
              <View style={styles.metricItem}>
                <Text style={styles.metricNumber}>{vehicles.length}</Text>
                <Text style={styles.metricLabel}>Active Cars</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricNumber}>100%</Text>
                <Text style={styles.metricLabel}>Response Rate</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricNumber}>Verified</Text>
                <Text style={styles.metricLabel}>Account</Text>
              </View>
            </View>

            {/* Direct Message Action */}
            <TouchableOpacity
              style={styles.chatAction}
              onPress={handleChatPress}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={Colors.dark} />
              <Text style={styles.chatActionText}>Send Host a Message</Text>
            </TouchableOpacity>

            <View style={styles.dividerLine} />
            <Text style={styles.fleetHeader}>Available Fleet ({vehicles.length})</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="car-outline" size={44} color={Colors.secondary} />
            <Text style={styles.emptyText}>No vehicles currently listed.</Text>
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
    backgroundColor: "#F8F9FA",
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
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  profileHero: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  nameVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  businessTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    flex: 1,
  },
  ownerText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 1,
  },
  addressText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  metricsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    paddingVertical: 10,
    marginTop: Spacing.md,
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricNumber: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  metricLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  chatAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginTop: Spacing.md,
  },
  chatActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  dividerLine: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.lg,
  },
  fleetHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 8,
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
