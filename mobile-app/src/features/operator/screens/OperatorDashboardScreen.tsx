import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { getMyVehicles } from "@/features/operator/services/vehicleService";
import { getMyBookings } from "@/services/bookingService";

export default function OperatorDashboardScreen() {
  const { user } = useAuth();
  const profile = user?.operatorProfile ?? user?.operator_profile;

  const [fleet, setFleet] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const [vehiclesData, bookingsData] = await Promise.all([
        getMyVehicles().catch(() => []),
        getMyBookings().catch(() => []),
      ]);

      setFleet(vehiclesData);
      setBookings(bookingsData);
    } finally {
      setRefreshing(false);
    }
  };

  const pendingVerification = bookings.filter(
    (b) => b.status === "pending_verification" || b.status === "pending_payment"
  );
  const activeRentals = bookings.filter((b) => b.status === "ongoing" || b.status === "approved");
  const completedTrips = bookings.filter((b) => b.status === "completed");

  const totalEarnings = completedTrips.reduce((acc, b) => acc + Number(b.total_price || 0), 0);

  return (
    <OperatorShell activeRoute="dashboard">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadDashboardData}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <View style={styles.welcomeInfo}>
            <Text style={styles.greetingText}>
              Welcome back, {user?.first_name || "Host"}!
            </Text>
            <Text style={styles.businessSubtitle}>
              {profile?.business_name || "Rental Workspace"} • Fleet Control
            </Text>
          </View>
          <TouchableOpacity
            style={styles.uploadCta}
            onPress={() => router.push("/operator-vehicle-upload" as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={Colors.dark} />
            <Text style={styles.uploadCtaText}>Add Car</Text>
          </TouchableOpacity>
        </View>

        {/* Business Metrics Grid */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push("/operator-vehicles" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <MaterialCommunityIcons name="car-multiple" size={22} color="#2563EB" />
            </View>
            <Text style={styles.metricNumber}>{fleet.length}</Text>
            <Text style={styles.metricLabel}>Total Fleet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push("/operator-bookings" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time-outline" size={22} color="#D97706" />
            </View>
            <Text style={styles.metricNumber}>{pendingVerification.length}</Text>
            <Text style={styles.metricLabel}>Action Needed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => router.push("/operator-bookings" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.metricIconWrap, { backgroundColor: "#ECFDF5" }]}>
              <MaterialCommunityIcons name="car-key" size={22} color="#10B981" />
            </View>
            <Text style={styles.metricNumber}>{activeRentals.length}</Text>
            <Text style={styles.metricLabel}>Active Trips</Text>
          </TouchableOpacity>

          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: Colors.logoBackground }]}>
              <Ionicons name="cash-outline" size={22} color={Colors.dark} />
            </View>
            <Text style={styles.metricNumber}>₱{totalEarnings.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Settled Revenue</Text>
          </View>
        </View>

        {/* Action Shortcuts */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Quick Fleet Operations</Text>
        </View>

        <View style={styles.shortcutsRow}>
          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push("/operator-vehicle-upload" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.dark} />
            <Text style={styles.shortcutText}>List Vehicle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push("/operator-chats" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={Colors.dark} />
            <Text style={styles.shortcutText}>Inquiries</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shortcutBtn}
            onPress={() => router.push("/operator-profile" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={20} color={Colors.dark} />
            <Text style={styles.shortcutText}>Payment Setup</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Customer Reservations */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Pending Reservations ({pendingVerification.length})</Text>
          <TouchableOpacity onPress={() => router.push("/operator-bookings" as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {pendingVerification.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={36} color="#10B981" />
            <Text style={styles.emptyTitle}>All Caught Up</Text>
            <Text style={styles.emptySub}>No customer payments pending your verification right now.</Text>
          </View>
        ) : (
          pendingVerification.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.pendingCard}
              onPress={() => router.push("/operator-bookings" as any)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingVehicle}>{item.vehicle?.name || "Vehicle"}</Text>
                <Text style={styles.pendingRenter}>
                  Renter: {item.renter?.first_name || "Customer"} {item.renter?.last_name || ""}
                </Text>
                <Text style={styles.pendingDates}>{item.start_date} → {item.end_date}</Text>
              </View>

              <View style={styles.pendingActionWrap}>
                <Text style={styles.pendingAmount}>₱{Number(item.total_price).toLocaleString()}</Text>
                <View style={styles.verifyPill}>
                  <Text style={styles.verifyPillText}>Inspect & Verify</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Fleet Preview Section */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.lg }]}>
          <Text style={styles.sectionHeading}>My Listed Fleet ({fleet.length})</Text>
          <TouchableOpacity onPress={() => router.push("/operator-vehicles" as any)}>
            <Text style={styles.viewAllText}>Manage Fleet</Text>
          </TouchableOpacity>
        </View>

        {fleet.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="car-outline" size={38} color={Colors.secondary} />
            <Text style={styles.emptyTitle}>No Listed Vehicles</Text>
            <Text style={styles.emptySub}>Start listing your rental cars to start receiving booking inquiries.</Text>
          </View>
        ) : (
          fleet.slice(0, 3).map((veh) => (
            <TouchableOpacity
              key={veh.id}
              style={styles.fleetItemCard}
              onPress={() => router.push(`/vehicles/${veh.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.fleetItemName}>{veh.name}</Text>
                <Text style={styles.fleetItemPlate}>
                  Plate: {veh.plate_number} • {veh.quantity ?? 1} unit(s)
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.fleetItemPrice}>₱{Number(veh.price_per_day).toLocaleString()}/day</Text>
                <View style={[styles.fleetStatusDot, veh.availability_status === "available" ? styles.dotAvail : styles.dotUnavail]}>
                  <Text style={styles.fleetStatusText}>{veh.availability_status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </OperatorShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  welcomeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  welcomeInfo: {
    flex: 1,
  },
  greetingText: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  businessSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  uploadCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  uploadCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: Spacing.md,
  },
  metricCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  metricNumber: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  metricLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  viewAllText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shortcutText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
    marginTop: 6,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: 2,
  },
  pendingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pendingVehicle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  pendingRenter: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  pendingDates: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.dark,
    marginTop: 2,
  },
  pendingActionWrap: {
    alignItems: "flex-end",
    gap: 6,
  },
  pendingAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  verifyPill: {
    backgroundColor: Colors.logoBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifyPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.dark,
  },
  fleetItemCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fleetItemName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  fleetItemPlate: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  fleetItemPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  fleetStatusDot: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  dotAvail: {
    backgroundColor: "#ECFDF5",
  },
  dotUnavail: {
    backgroundColor: "#FEF2F2",
  },
  fleetStatusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.dark,
  },
});
