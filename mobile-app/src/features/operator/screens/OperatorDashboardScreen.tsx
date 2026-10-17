import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Radius, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { getMyVehicles } from "@/features/operator/services/vehicleService";
import { resolveImageUrl } from "@/services/api";
import { getMyBookings } from "@/services/bookingService";

const cleanDate = (d: string | null | undefined): string => {
  if (!d) return "";
  return String(d).split("T")[0];
};

const DEFAULT_CAR_FALLBACK =
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60";

const resolveVehicleImage = (vehicle: any): string => {
  if (!vehicle) return DEFAULT_CAR_FALLBACK;
  if (vehicle.image_url) return resolveImageUrl(vehicle.image_url, DEFAULT_CAR_FALLBACK) || DEFAULT_CAR_FALLBACK;
  if (vehicle.cover_photo) return resolveImageUrl(vehicle.cover_photo, DEFAULT_CAR_FALLBACK) || DEFAULT_CAR_FALLBACK;
  if (Array.isArray(vehicle.images) && vehicle.images.length > 0) {
    const first = vehicle.images[0].image_url || vehicle.images[0].image_path;
    return resolveImageUrl(first, DEFAULT_CAR_FALLBACK) || DEFAULT_CAR_FALLBACK;
  }
  return DEFAULT_CAR_FALLBACK;
};

export default function OperatorDashboardScreen() {
  const { user, isOperatorPending, refreshUser } = useAuth();
  const { showModal } = useAppToast();
  const profile = user?.operatorProfile ?? user?.operator_profile;

  const [fleet, setFleet] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    }
    try {
      const [vehiclesData, bookingsData] = await Promise.all([
        getMyVehicles().catch(() => []),
        getMyBookings().catch(() => []),
      ]);

      setFleet(vehiclesData);
      setBookings(bookingsData);
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData(false);
    }, [loadDashboardData])
  );

  const pendingVerification = bookings.filter(
    (b) => b.status === "pending_verification" || b.status === "pending_payment"
  );
  const activeRentals = bookings.filter(
    (b) =>
      b.status === "approved" ||
      b.status === "awaiting_pickup" ||
      b.status === "pickup_in_progress" ||
      b.status === "ready_to_start" ||
      b.status === "trip_in_progress" ||
      b.status === "return_pending" ||
      b.status === "ongoing"
  );
  const onTheRoadTrips = bookings.filter(
    (b) => b.status === "trip_in_progress" || b.status === "ongoing"
  );
  const completedTrips = bookings.filter((b) => b.status === "completed");
  const totalEarnings = completedTrips.reduce((acc, b) => acc + Number(b.total_price || 0), 0);
  const utilizationRate = fleet.length > 0 ? Math.round((activeRentals.length / fleet.length) * 100) : 0;

  return (
    <OperatorShell activeRoute="dashboard">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboardData(true)}
            colors={[Colors.primary]}
          />
        }
      >
        {/* 0. UNDER REVIEW PREVIEW BANNER */}
        {isOperatorPending && (
          <View style={styles.underReviewBanner}>
            <View style={styles.underReviewHeaderRow}>
              <View style={styles.underReviewIconCircle}>
                <Ionicons name="time" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                  <Text style={styles.underReviewTitle}>Account Under Review</Text>
                  <View style={styles.underReviewBadge}>
                    <Text style={styles.underReviewBadgeText}>Preview Mode</Text>
                  </View>
                </View>
                <Text style={styles.underReviewDesc}>
                  Your operator application & business documents are currently being evaluated by our Admin team. You can explore the dashboard, but vehicle listing and customer bookings remain locked until approved.
                </Text>
              </View>
            </View>
            <View style={styles.underReviewFooter}>
              <Ionicons name="information-circle-outline" size={14} color="#92400E" />
              <Text style={styles.underReviewFooterText}>
                Estimated review time: 12–24 business hours
              </Text>
            </View>
          </View>
        )}

        {/* 1. TOP OVERVIEW METRICS CARD (Dark & Gold Inspired by Screen 1) */}
        <View style={styles.topFinancialCard}>
          <View style={styles.topFinancialHeader}>
            <View>
              <Text style={styles.topFinancialLabel}>FLEET EARNINGS & BALANCE</Text>
              <Text style={styles.topFinancialAmount}>₱{totalEarnings.toLocaleString()}</Text>
            </View>
            <View style={styles.payoutBadge}>
              <Ionicons name="wallet" size={13} color={Colors.dark} />
              <Text style={styles.payoutBadgeText}>Active Wallet</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* 3 Metric Mini-Counters */}
          <View style={styles.miniCountersRow}>
            <TouchableOpacity
              style={styles.miniCounterItem}
              onPress={() => router.push("/operator-vehicles" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.miniCounterVal}>{fleet.length}</Text>
              <Text style={styles.miniCounterLabel}>Total Units</Text>
            </TouchableOpacity>

            <View style={styles.miniCounterDivider} />

            <TouchableOpacity
              style={styles.miniCounterItem}
              onPress={() => router.push("/operator-bookings" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.miniCounterVal}>{onTheRoadTrips.length}</Text>
              <Text style={styles.miniCounterLabel}>On Trip</Text>
            </TouchableOpacity>

            <View style={styles.miniCounterDivider} />

            <TouchableOpacity
              style={styles.miniCounterItem}
              onPress={() => router.push("/operator-bookings" as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.miniCounterVal, pendingVerification.length > 0 && { color: Colors.primary }]}>
                {pendingVerification.length}
              </Text>
              <Text style={styles.miniCounterLabel}>Action Due</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rental Payment Setup Reminder Banner */}
        {!Boolean(profile?.account_number && String(profile.account_number).trim()) && (
          <View style={styles.paymentNoticeCard}>
            <View style={styles.paymentNoticeIconWrap}>
              <Ionicons name="card" size={18} color={Colors.white} />
            </View>
            <View style={styles.paymentNoticeTextWrap}>
              <Text style={styles.paymentNoticeTitle}>Rental Payment Not Set Up</Text>
              <Text style={styles.paymentNoticeSub}>
                Set up your GCash details so you can list vehicles and receive reservation fees.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.paymentNoticeBtn}
              onPress={() => router.push("/operator-profile" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.paymentNoticeBtnText}>Set Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. HERO PROMO / ADD VEHICLE BANNER (Screen 1 Middle Banner) */}
        <View style={styles.heroPromoBanner}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=900&auto=format&fit=crop&q=80",
            }}
            style={styles.heroBannerBg}
            contentFit="cover"
          />
          <View style={styles.heroBannerOverlay} />

          <View style={styles.heroBannerContent}>
            <View style={styles.heroTagRow}>
              <View style={styles.verifiedHostTag}>
                <Ionicons name="shield-checkmark" size={11} color={Colors.primary} />
                <Text style={styles.verifiedHostTagText}>
                  {profile?.business_name || "Verified Fleet Host"}
                </Text>
              </View>
            </View>

            <Text style={styles.heroBannerHeading}>Expand Your Fleet</Text>
            <Text style={styles.heroBannerSub}>
              Add new vehicles to earn more from tourists & renters across Oriental Mindoro.
            </Text>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.heroPillBtn, { flex: 1 }]}
                onPress={() => {
                  if (isOperatorPending) {
                    showModal(
                      "Account Under Review",
                      "You cannot list new vehicles while your account is pending review. Listing will be enabled once your accreditation is approved by the Admin.",
                      [{ text: "Understood", style: "default" }],
                      "warning"
                    );
                    return;
                  }

                  const hasPaymentSetup = Boolean(
                    profile?.account_number && String(profile.account_number).trim()
                  );
                  if (!hasPaymentSetup) {
                    showModal(
                      "Payment Setup Required",
                      "Please set up your GCash rental payment details first before listing a vehicle, so renters know where to send reservation fees.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Set Up Now",
                          onPress: () => router.push("/operator-profile" as any),
                        },
                      ],
                      "warning"
                    );
                    return;
                  }

                  router.push("/operator-vehicle-upload" as any);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.heroPillBtnText}>Add Vehicle</Text>
                <View style={styles.heroPillIcon}>
                  <Ionicons name="add" size={13} color={Colors.dark} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.heroPillBtn, { flex: 1.2, backgroundColor: "#1E293B" }]}
                onPress={() => router.push("/operator-maintenance" as any)}
                activeOpacity={0.85}
              >
                <Text style={[styles.heroPillBtnText, { color: Colors.white }]}>Fleet Health</Text>
                <View style={[styles.heroPillIcon, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="build" size={12} color={Colors.dark} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 3. ACTIVE FLEET UTILIZATION PROGRESS CARD (Progress Ring Tracker from Screen 1) */}
        <View style={styles.utilizationCard}>
          <View style={styles.utilizationLeft}>
            <View style={styles.progressCircleBox}>
              <Text style={styles.progressCirclePercent}>{utilizationRate}%</Text>
              <Text style={styles.progressCircleCaption}>Active</Text>
            </View>
          </View>

          <View style={styles.utilizationRight}>
            <Text style={styles.utilizationTitle}>Fleet in Motion</Text>
            <Text style={styles.utilizationSub}>
              {activeRentals.length} of {fleet.length} vehicles currently booked or on the road.
            </Text>
            <View style={styles.utilizationBarTrack}>
              <View style={[styles.utilizationBarFill, { width: `${Math.min(100, utilizationRate)}%` }]} />
            </View>
          </View>
        </View>

        {/* 4. PENDING RESERVATIONS LIST */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Action Needed ({pendingVerification.length})</Text>
          <TouchableOpacity onPress={() => router.push("/operator-bookings" as any)}>
            <Text style={styles.viewAllText}>Manage All</Text>
          </TouchableOpacity>
        </View>

        {pendingVerification.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySub}>No customer payments pending your verification right now.</Text>
          </View>
        ) : (
          pendingVerification.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.bookingItemCard}
              onPress={() => router.push("/operator-bookings" as any)}
              activeOpacity={0.88}
            >
              <View style={styles.bookingItemTop}>
                <View style={styles.bookingRenterTag}>
                  <Ionicons name="person-circle" size={16} color={Colors.primary} />
                  <Text style={styles.bookingRenterName} numberOfLines={1}>
                    {item.renter?.first_name || "Customer"} {item.renter?.last_name || ""}
                  </Text>
                </View>
                <View style={styles.verifyChip}>
                  <Ionicons name="shield-checkmark" size={11} color="#2563EB" />
                  <Text style={styles.verifyChipText}>Verify Deposit</Text>
                </View>
              </View>

              <View style={styles.bookingItemBody}>
                <Image
                  source={{ uri: resolveVehicleImage(item.vehicle) }}
                  style={styles.bookingItemThumb}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingVehicleName} numberOfLines={1}>
                    {item.vehicle?.name || "Vehicle"}
                  </Text>
                  <Text style={styles.bookingDates}>
                    {cleanDate(item.start_date)} → {cleanDate(item.end_date)} ({item.total_days} {item.total_days === 1 ? "day" : "days"})
                  </Text>
                  <Text style={styles.bookingPrice}>
                    ₱{Number(item.total_price).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.actionArrowCircle}>
                  <Ionicons name="chevron-forward" size={14} color={Colors.dark} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* 5. FLEET OVERVIEW LIST */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.md }]}>
          <Text style={styles.sectionHeading}>My Vehicles ({fleet.length})</Text>
          <TouchableOpacity onPress={() => router.push("/operator-vehicles" as any)}>
            <Text style={styles.viewAllText}>View Fleet</Text>
          </TouchableOpacity>
        </View>

        {fleet.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Listed Vehicles</Text>
            <Text style={styles.emptySub}>List your vehicles to start receiving rental requests.</Text>
          </View>
        ) : (
          fleet.slice(0, 3).map((veh) => (
            <TouchableOpacity
              key={veh.id}
              style={styles.fleetItemCard}
              onPress={() => router.push(`/vehicles/${veh.id}` as any)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: resolveVehicleImage(veh) }}
                style={styles.fleetVehicleImg}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.fleetItemName} numberOfLines={1}>
                  {veh.name}
                </Text>
                <Text style={styles.fleetItemPlate}>
                  Plate: {veh.plate_number} • {veh.type || "Car"}
                </Text>
                <Text style={styles.fleetItemPrice}>
                  ₱{Number(veh.price_per_day).toLocaleString()} / day
                </Text>
              </View>

              <View style={{ alignItems: "flex-end", justifyContent: "space-between", height: 50 }}>
                <View style={[styles.fleetStatusDot, veh.availability_status === "available" ? styles.dotAvail : styles.dotUnavail]}>
                  <Text style={styles.fleetStatusText}>{veh.availability_status || "available"}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: 40,
  },
  // 1. Top Financial Card (Dark & Gold)
  topFinancialCard: {
    backgroundColor: Colors.dark,
    borderRadius: 20,
    padding: 16,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  topFinancialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topFinancialLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 0.6,
  },
  topFinancialAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.primary,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  payoutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
  },
  payoutBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#2E2E2E",
    marginVertical: 14,
  },
  miniCountersRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  miniCounterItem: {
    flex: 1,
    alignItems: "center",
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  miniCounterVal: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
  },
  miniCounterLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  miniCounterDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#2E2E2E",
  },
  // 2. Hero Promo Banner
  heroPromoBanner: {
    borderRadius: 20,
    backgroundColor: Colors.dark,
    overflow: "hidden",
    position: "relative",
    padding: 16,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  heroBannerBg: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.35,
  },
  heroBannerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(10, 10, 15, 0.65)",
  },
  heroBannerContent: {
    zIndex: 2,
  },
  heroTagRow: {
    marginBottom: 8,
  },
  verifiedHostTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  verifiedHostTagText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.white,
  },
  heroBannerHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  heroBannerSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#D1D5DB",
    marginTop: 3,
    marginBottom: 14,
    lineHeight: 16,
  },
  heroPillBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 7,
    borderRadius: 20,
  },
  heroPillBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  heroPillIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  // 3. Utilization Card (Progress Tracker)
  utilizationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.md,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  utilizationLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.logoBackground,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCirclePercent: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  progressCircleCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    color: "#B45309",
    marginTop: -2,
  },
  utilizationRight: {
    flex: 1,
  },
  utilizationTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  utilizationSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
    marginBottom: 8,
  },
  utilizationBarTrack: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  utilizationBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  // Section Headers
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  viewAllText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  emptyCard: {
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
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    paddingHorizontal: Spacing.sm,
  },
  // Booking Card
  bookingItemCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bookingItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bookingRenterTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  bookingRenterName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  verifyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifyChipText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#2563EB",
  },
  bookingItemBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bookingItemThumb: {
    width: 60,
    height: 46,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
  },
  bookingVehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.dark,
  },
  bookingDates: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 1,
  },
  bookingPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.dark,
    marginTop: 2,
  },
  actionArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  // Fleet Item Card
  fleetItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  fleetVehicleImg: {
    width: 60,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
  },
  fleetItemName: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.dark,
  },
  fleetItemPlate: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  fleetItemPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.dark,
    marginTop: 2,
  },
  fleetStatusDot: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dotAvail: {
    backgroundColor: "#ECFDF5",
  },
  dotUnavail: {
    backgroundColor: "#FEF2F2",
  },
  fleetStatusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9.5,
    color: "#059669",
    textTransform: "capitalize",
  },
  underReviewBanner: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  underReviewHeaderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  underReviewIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  underReviewTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: "#92400E",
  },
  underReviewBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  underReviewBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#B45309",
    textTransform: "uppercase",
  },
  underReviewDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: "#78350F",
    marginTop: 4,
  },
  underReviewFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
  },
  underReviewFooterText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#92400E",
  },
  paymentNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 10,
  },
  paymentNoticeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentNoticeTextWrap: {
    flex: 1,
  },
  paymentNoticeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#92400E",
  },
  paymentNoticeSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    lineHeight: 15,
  },
  paymentNoticeBtn: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
  },
  paymentNoticeBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
});

