import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { getMyVehicles } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function OperatorVehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyVehicles();
      setVehicles(data);
    } catch {
      console.error("Unable to load fleet vehicles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <OperatorShell activeRoute="vehicles">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Fleet Catalog</Text>
            <Text style={styles.subtitle}>
              {vehicles.length} {vehicles.length === 1 ? "car listed" : "cars listed in fleet"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/operator-vehicle-upload" as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={Colors.dark} />
            <Text style={styles.addBtnText}>Add Car</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={{ gap: 14 }}>
            <Skeleton height={130} borderRadius={18} />
            <Skeleton height={130} borderRadius={18} />
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="car-off" size={38} color={Colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>Your Fleet is Empty</Text>
            <Text style={styles.emptySubtitle}>
              Publish your first vehicle to start receiving rental requests and bookings from renters.
            </Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={() => router.push("/operator-vehicle-upload" as any)}
              activeOpacity={0.85}
            >
              <Text style={styles.addFirstBtnText}>List Your First Car</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  load();
                }}
                colors={[Colors.primary]}
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/vehicles/${item.id}` as any)}
                activeOpacity={0.88}
              >
                <Image
                  source={{
                    uri:
                      item.image_url ||
                      "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60",
                  }}
                  style={styles.image}
                />

                <View style={styles.details}>
                  <View style={styles.nameRow}>
                    <Text style={styles.vehicleName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Active</Text>
                    </View>
                  </View>

                  <Text style={styles.specsText}>
                    {item.transmission || "Auto"} • {item.seats || 5} Seats • {item.fuel_type || "Gas"}
                  </Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.price}>
                      ₱{Number(item.price_per_day).toLocaleString()}
                      <Text style={styles.pricePeriod}> / day</Text>
                    </Text>

                    <View style={styles.viewBadge}>
                      <Text style={styles.viewText}>Preview</Text>
                      <Ionicons name="chevron-forward" size={12} color={Colors.dark} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </OperatorShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
  },
  subtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    padding: 10,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    alignItems: "center",
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  image: {
    height: 90,
    width: 105,
    borderRadius: 14,
    backgroundColor: Colors.inputBackground,
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleName: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 15,
    flex: 1,
    marginRight: 4,
  },
  statusBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: "#10B981",
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },
  specsText: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 3,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  pricePeriod: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: 10,
  },
  viewBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  viewText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.dark,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    marginTop: Spacing.xs,
  },
  emptySubtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center",
  },
  addFirstBtn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addFirstBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
});
