import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Colors } from "@/constants/colors";
import { FontFamily, Radius, Spacing } from "@/constants/theme";
import { useCall } from "@/context/CallContext";
import { useNotificationCount } from "@/context/NotificationContext";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorRevenueModal from "@/features/operator/components/dashboard/OperatorRevenueModal";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { getOperatorRevenue } from "@/features/operator/services/operatorService";
import { getMyVehicles } from "@/features/operator/services/vehicleService";
import { OperatorRevenueData } from "@/features/operator/types/operatorService";
import { resolveImageUrl } from "@/services/api";
import { Booking, getMyBookings } from "@/services/bookingService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.82;

const DEFAULT_CAR_FALLBACK =
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60";

const resolveVehicleImage = (vehicle: any): string => {
  if (!vehicle) return DEFAULT_CAR_FALLBACK;
  if (vehicle.image_url)
    return (
      resolveImageUrl(vehicle.image_url, DEFAULT_CAR_FALLBACK) ||
      DEFAULT_CAR_FALLBACK
    );
  if (vehicle.cover_photo)
    return (
      resolveImageUrl(vehicle.cover_photo, DEFAULT_CAR_FALLBACK) ||
      DEFAULT_CAR_FALLBACK
    );
  if (Array.isArray(vehicle.images) && vehicle.images.length > 0) {
    const first = vehicle.images[0].image_url || vehicle.images[0].image_path;
    return resolveImageUrl(first, DEFAULT_CAR_FALLBACK) || DEFAULT_CAR_FALLBACK;
  }
  return DEFAULT_CAR_FALLBACK;
};

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr).split("T")[0];
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function OperatorDashboardScreen() {
  const { user, isOperatorPending } = useAuth();
  const { showModal, showError } = useAppToast();
  const { startCall } = useCall();
  const { unreadCount } = useNotificationCount();
  const profile = user?.operatorProfile ?? user?.operator_profile;

  const [fleet, setFleet] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [revenueData, setRevenueData] = useState<OperatorRevenueData | null>(
    null,
  );
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showRevenueInfoModal, setShowRevenueInfoModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(
    async (isManualRefresh: boolean = false) => {
      if (isManualRefresh) setRefreshing(true);
      try {
        const [vehiclesData, bookingsData, revData] = await Promise.all([
          getMyVehicles().catch(() => []),
          getMyBookings().catch(() => []),
          getOperatorRevenue().catch(() => null),
        ]);

        setFleet(vehiclesData);
        setBookings(bookingsData);
        if (revData) {
          setRevenueData(revData);
        }
      } finally {
        if (isManualRefresh) setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboardData(false);
    }, [loadDashboardData]),
  );

  // Operational categories
  const pendingActions = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.status === "pending_verification" || b.status === "pending_payment",
      ),
    [bookings],
  );

  const activeTrips = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === "trip_in_progress" || b.status === "ongoing",
      ),
    [bookings],
  );

  const completedTrips = useMemo(
    () => bookings.filter((b) => b.status === "completed"),
    [bookings],
  );

  const fallbackGross = completedTrips.reduce(
    (acc, b) => acc + Number(b.total_price || 0),
    0,
  );

  const grossRevenue = revenueData?.gross_revenue ?? fallbackGross;
  const platformCommission = revenueData?.commission_due ?? grossRevenue * 0.1;
  const netEarnings =
    revenueData?.net_earnings ?? grossRevenue - platformCommission;

  const hasMissingPaymentSetup = !Boolean(
    profile?.account_number && String(profile.account_number).trim(),
  );

  const firstName =
    user?.first_name ||
    profile?.business_name ||
    user?.name?.split(" ")[0] ||
    "Partner";

  const businessName =
    profile?.business_name ||
    user?.operator_profile?.business_name ||
    "Business Registered Name";

  const todayFormattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedNetEarnings = `${netEarnings.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}php`;

  const profilePhoto = resolveImageUrl(user?.profile_photo);

  const handleCallRenter = useCallback(
    (item: Booking) => {
      const renter = item.renter;
      const renterName = renter
        ? `${renter.first_name || ""} ${renter.last_name || ""}`.trim() ||
          "Customer"
        : "Customer";
      const renterPhone = renter?.phone_number || (item as any).renter_phone;

      if (renter?.id) {
        startCall({
          id: renter.id,
          name: renterName,
          first_name: renter.first_name,
          last_name: renter.last_name,
          role: "renter",
          profile_photo: renter.profile_photo_url || renter.profile_photo,
        });
      } else if (renterPhone) {
        Linking.openURL(`tel:${renterPhone}`).catch(() => {
          showError?.("Unable to open phone dialer.");
        });
      } else {
        showError?.("Renter contact number is unavailable.");
      }
    },
    [startCall, showError],
  );

  return (
    <OperatorShell activeRoute="dashboard">
      {({ openMenu }) => (
        <>
          <View style={styles.mainContainer}>
            {/* =========================================================================
            1. YELLOW PRIMARY HEADER CONTAINER
           ========================================================================= */}
            <View style={styles.yellowHeaderCard}>
              {/* Top Bar: Avatar on Left, Notifications & Hamburger Menu on Right */}
              <View style={styles.headerTopBar}>
                <TouchableOpacity
                  style={styles.avatarCircle}
                  onPress={() => router.push("/operator-profile" as any)}
                  activeOpacity={0.8}
                >
                  {profilePhoto ? (
                    <Image
                      source={{ uri: profilePhoto }}
                      contentFit="cover"
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={26} color={Colors.primary} />
                  )}
                </TouchableOpacity>

                <View style={styles.headerActionsWrap}>
                  {/* Notifications Button with dynamic unread count */}
                  <TouchableOpacity
                    style={styles.circleActionBtn}
                    onPress={() => router.push("/notifications" as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={21}
                      color={Colors.dark}
                    />
                    {unreadCount > 0 && (
                      <View style={styles.notifBadge}>
                        <Text style={styles.notifBadgeText}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Menu Button */}
                  <TouchableOpacity
                    style={styles.circleActionBtn}
                    onPress={openMenu}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="menu" size={23} color={Colors.dark} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stacked Greeting: Title and Subtitle directly below Avatar */}
              <View style={styles.greetingSection}>
                <Text style={styles.greetingName} numberOfLines={1}>
                  Hello, {firstName}!
                </Text>
                <Text style={styles.greetingSub}>
                  Let&apos;s manage your business with ease.
                </Text>
              </View>
            </View>

            {/* =========================================================================
            2. REVENUE SECTION: 50% OVERLAPPED WIDE DARK REVENUE CARD
           ========================================================================= */}
            <View style={styles.overlapRevenueContainer}>
              <View style={styles.darkRevenueCard}>
                {/* Top Row: Business Registered Name & Info Icon */}
                <View style={styles.darkCardTopRow}>
                  <Text style={styles.businessNameText} numberOfLines={1}>
                    {businessName}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowRevenueInfoModal(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={19}
                      color="#CBD5E1"
                    />
                  </TouchableOpacity>
                </View>

                {/* Middle Row: Net Earnings */}
                <Text style={styles.revenueAmountText} numberOfLines={1}>
                  {formattedNetEarnings}
                </Text>

                {/* Bottom Row: Date on Left, Yellow Track Revenue on Right */}
                <View style={styles.darkCardBottomRow}>
                  <Text style={styles.revenueDateText}>
                    {todayFormattedDate}
                  </Text>

                  <TouchableOpacity
                    style={styles.trackRevenueBtn}
                    onPress={() => setShowRevenueModal(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="trending-up"
                      size={15}
                      color={Colors.dark}
                    />
                    <Text style={styles.trackRevenueBtnText}>
                      Track Revenue
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* =========================================================================
            2. STAT PILLS ROW (Active Trips, Action Due, Fleet Units)
           ========================================================================= */}

            {/* Conditional Critical Alerts */}
            {isOperatorPending && (
              <View style={styles.alertCard}>
                <Ionicons name="time" size={16} color="#D97706" />
                <Text style={styles.alertCardText} numberOfLines={1}>
                  Application under review
                </Text>
              </View>
            )}

            {hasMissingPaymentSetup && (
              <TouchableOpacity
                style={styles.alertActionCard}
                onPress={() => router.push("/operator-profile" as any)}
                activeOpacity={0.85}
              >
                <Ionicons name="card" size={16} color="#B45309" />
                <Text style={styles.alertActionCardText} numberOfLines={1}>
                  Set up GCash payout to receive booking payments
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#B45309" />
              </TouchableOpacity>
            )}

            {/* =========================================================================
            3. SECTION: FLEET IN MOTION
           ========================================================================= */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fleet in Motion</Text>
              <View style={styles.yellowLine} />
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => router.push("/operator-bookings" as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <MaterialCommunityIcons
                  name="arrow-top-right"
                  size={14}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* Horizontal Fleet Carousel */}
            {activeTrips.length > 0 ? (
              <FlatList
                data={activeTrips}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
                contentContainerStyle={styles.horizontalListContent}
                keyExtractor={(item) => `trip-${item.id}`}
                renderItem={({ item }) => {
                  const renterName = item.renter
                    ? `${item.renter.first_name || ""} ${item.renter.last_name || ""}`.trim() ||
                      "Customer"
                    : "Customer";

                  return (
                    <View style={styles.fleetCard}>
                      <Image
                        source={{ uri: resolveVehicleImage(item.vehicle) }}
                        contentFit="cover"
                        style={styles.fleetCardImage}
                      />

                      {/* Gradient Overlay */}
                      <LinearGradient
                        colors={[
                          "transparent",
                          "rgba(0,0,0,0.45)",
                          "rgba(0,0,0,0.92)",
                        ]}
                        style={styles.fleetCardGradient}
                      >
                        <View style={styles.fleetCardBottomRow}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                              style={styles.fleetCardTitle}
                              numberOfLines={1}
                            >
                              {item.vehicle?.name || "Vehicle Display Name"}
                            </Text>
                            <Text style={styles.fleetCardPrice}>
                              PHP{" "}
                              {Number(item.total_price || 0).toLocaleString()}
                            </Text>
                            <Text
                              style={styles.fleetCardRenter}
                              numberOfLines={1}
                            >
                              Renter: {renterName}
                            </Text>
                          </View>

                          {/* Action Buttons: Call & See Location */}
                          <View style={styles.fleetCardActions}>
                            <TouchableOpacity
                              style={styles.fleetCallBtn}
                              onPress={() => handleCallRenter(item)}
                              activeOpacity={0.8}
                              accessibilityLabel={`Call ${renterName}`}
                            >
                              <Ionicons
                                name="call"
                                size={15}
                                color={Colors.dark}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.seeLocationBtn}
                              onPress={() =>
                                router.push({
                                  pathname: "/live-tracking",
                                  params: {
                                    bookingId: String(item.id),
                                    vehicleName:
                                      item.vehicle?.name || "Vehicle",
                                    renterName,
                                  },
                                } as any)
                              }
                              activeOpacity={0.85}
                            >
                              <Text style={styles.seeLocationBtnText}>
                                See Location
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </LinearGradient>
                    </View>
                  );
                }}
              />
            ) : fleet.length > 0 ? (
              /* Fallback: Displays Listed Fleet Cars */
              <FlatList
                data={fleet}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
                contentContainerStyle={styles.horizontalListContent}
                keyExtractor={(item) => `fleet-${item.id}`}
                renderItem={({ item }) => (
                  <View style={styles.fleetCard}>
                    <Image
                      source={{ uri: resolveVehicleImage(item) }}
                      contentFit="cover"
                      style={styles.fleetCardImage}
                    />

                    <LinearGradient
                      colors={[
                        "transparent",
                        "rgba(0,0,0,0.45)",
                        "rgba(0,0,0,0.92)",
                      ]}
                      style={styles.fleetCardGradient}
                    >
                      <View style={styles.fleetCardBottomRow}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.fleetCardTitle} numberOfLines={1}>
                            {item.name || "Vehicle Display Name"}
                          </Text>
                          <Text style={styles.fleetCardPrice}>
                            PHP{" "}
                            {Number(item.price_per_day || 0).toLocaleString()}
                          </Text>
                          <Text
                            style={styles.fleetCardRenter}
                            numberOfLines={1}
                          >
                            Plate: {item.plate_number || "Verified"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.seeLocationBtn}
                          onPress={() =>
                            router.push("/operator-vehicles" as any)
                          }
                          activeOpacity={0.85}
                        >
                          <Text style={styles.seeLocationBtnText}>Manage</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                )}
              />
            ) : (
              <View style={styles.emptyCardWrap}>
                <Text style={styles.emptyCardText}>
                  No vehicles currently listed.
                </Text>
              </View>
            )}

            {/* =========================================================================
            4. SECTION: ACTION REQUIRED
           ========================================================================= */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Action Required</Text>
              <View style={styles.yellowLine} />
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => router.push("/operator-bookings" as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <MaterialCommunityIcons
                  name="arrow-top-right"
                  size={14}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* Pending Requests List */}
            {pendingActions.length > 0 ? (
              <View style={styles.actionList}>
                {pendingActions.slice(0, 1).map((item) => {
                  const renterName = item.renter
                    ? `${item.renter.first_name || ""} ${item.renter.last_name || ""}`.trim() ||
                      "Customer"
                    : "Customer";

                  return (
                    <TouchableOpacity
                      key={`pending-${item.id}`}
                      style={styles.actionItemCard}
                      onPress={() => router.push("/operator-bookings" as any)}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: resolveVehicleImage(item.vehicle) }}
                        contentFit="cover"
                        style={styles.actionCarImage}
                      />

                      <View style={styles.actionDetails}>
                        <Text style={styles.actionCarTitle} numberOfLines={1}>
                          {item.vehicle?.name || "Vehicle"}
                        </Text>
                        <Text style={styles.actionSubtext} numberOfLines={1}>
                          {renterName} • PHP{" "}
                          {Number(item.total_price || 0).toLocaleString()}
                        </Text>
                        <Text style={styles.actionDateText}>
                          Reserved for {formatDate(item.start_date)}
                        </Text>
                      </View>

                      <View style={styles.actionBtn}>
                        <Text style={styles.actionBtnText}>Review</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.allClearCard}>
                <Ionicons
                  name="checkmark-done-circle"
                  size={30}
                  color="#10B981"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.allClearTitle}>All Bookings Clear</Text>
                  <Text style={styles.allClearSub}>
                    No pending deposit verifications right now.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Historical Track Revenue Modal */}
          <OperatorRevenueModal
            visible={showRevenueModal}
            onClose={() => setShowRevenueModal(false)}
          />

          {/* Revenue Sharing Policy Info Modal */}
          <Modal
            visible={showRevenueInfoModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowRevenueInfoModal(false)}
          >
            <View style={styles.infoModalOverlay}>
              <View style={styles.infoModalCard}>
                {/* Header */}
                <View style={styles.infoModalHeader}>
                  <View style={styles.infoModalIconCircle}>
                    <Ionicons
                      name="information-circle"
                      size={24}
                      color="#D97706"
                    />
                  </View>
                  <Text style={styles.infoModalTitle}>
                    Revenue Share Policy
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowRevenueInfoModal(false)}
                    style={styles.infoModalCloseBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {/* Description */}
                <Text style={styles.infoModalDescription}>
                  Ride4Rent uses a transparent revenue-sharing policy designed
                  to support your vehicle rental operations:
                </Text>

                {/* Breakdown Cards */}
                <View style={styles.infoShareBreakdown}>
                  {/* Operator: 90% */}
                  <View style={styles.infoShareRow}>
                    <View
                      style={[
                        styles.infoShareBadge,
                        { backgroundColor: "#ECFDF5" },
                      ]}
                    >
                      <Text
                        style={[styles.infoSharePercent, { color: "#059669" }]}
                      >
                        90%
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.infoShareItemTitle}>
                        Operator Net Earnings
                      </Text>
                      <Text style={styles.infoShareItemDesc}>
                        You keep 90% of all gross rental revenue from your
                        completed vehicle bookings.
                      </Text>
                    </View>
                  </View>

                  {/* Ride4Rent: 10% */}
                  <View style={[styles.infoShareRow, { marginTop: 10 }]}>
                    <View
                      style={[
                        styles.infoShareBadge,
                        { backgroundColor: "#FEF3C7" },
                      ]}
                    >
                      <Text
                        style={[styles.infoSharePercent, { color: "#D97706" }]}
                      >
                        10%
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.infoShareItemTitle}>
                        Ride4Rent Platform Share
                      </Text>
                      <Text style={styles.infoShareItemDesc}>
                        A 10% platform commission is shared with Ride4Rent every
                        end of the month to maintain marketing, verified
                        renters, and platform security.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Settlement Note */}
                <View style={styles.infoSettlementNote}>
                  <Ionicons name="calendar-outline" size={16} color="#0284C7" />
                  <Text style={styles.infoSettlementText}>
                    Billing cycles are calculated monthly. The 10% commission is
                    remitted at the end of each month.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.infoModalActions}>
                  <TouchableOpacity
                    style={styles.infoTrackBtn}
                    onPress={() => {
                      setShowRevenueInfoModal(false);
                      setShowRevenueModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="trending-up"
                      size={16}
                      color={Colors.dark}
                    />
                    <Text style={styles.infoTrackBtnText}>
                      Track Monthly Revenue
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.infoGotItBtn}
                    onPress={() => setShowRevenueInfoModal(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.infoGotItBtnText}>Got it</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </OperatorShell>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // =========================================================================
  // 1. YELLOW HEADER CONTAINER
  // =========================================================================
  yellowHeaderCard: {
    backgroundColor: Colors.primary,
    width: "100%",
    marginTop: 6,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 135,
  },
  headerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  greetingSection: {
    marginTop: 10,
  },
  greetingName: {
    fontFamily: FontFamily.bold,
    fontSize: 26,
    color: Colors.dark,
    letterSpacing: -0.6,
  },
  greetingSub: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    color: Colors.dark,
    marginTop: -5,
  },
  headerActionsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  circleActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.dark,
    lineHeight: 11,
  },

  // =========================================================================
  // 2. OVERLAPPING REVENUE CONTAINER
  // =========================================================================
  overlapRevenueContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: -125,
    zIndex: 10,
  },
  darkRevenueCard: {
    backgroundColor: "#2B2B2D",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
  darkCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  businessNameText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: "#E2E8F0",
    letterSpacing: 0.1,
  },
  revenueAmountText: {
    fontFamily: FontFamily.bold,
    fontSize: 29,
    color: Colors.white,
    marginTop: 8,
    marginBottom: 10,
    letterSpacing: -0.6,
  },
  darkCardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  revenueDateText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#CBD5E1",
    letterSpacing: 0.2,
  },
  trackRevenueBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trackRevenueBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },

  // =========================================================================
  // 2. STAT PILLS ROW
  // =========================================================================
  pillsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginTop: 18,
    gap: 8,
  },
  pillBtn: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    borderWidth: 1.2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pillBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
  },
  pillBadge: {
    position: "absolute",
    top: -7,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.dark,
  },

  // =========================================================================
  // ALERTS
  // =========================================================================
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
  },
  alertCardText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#92400E",
  },
  alertActionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
  },
  alertActionCardText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#B45309",
  },

  // =========================================================================
  // 3. SECTION HEADERS
  // =========================================================================
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
    color: Colors.dark,
  },
  yellowLine: {
    flex: 1,
    height: 2.5,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginHorizontal: 8,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  seeAllText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#64748B",
  },

  // =========================================================================
  // 4. FLEET IN MOTION CARDS
  // =========================================================================
  horizontalList: {
    flexGrow: 0,
  },
  horizontalListContent: {
    paddingHorizontal: Spacing.lg,
    gap: 14,
    marginTop: 5,
  },
  fleetCard: {
    width: CARD_WIDTH,
    height: 180,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#1E1E1E",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  fleetCardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  fleetCardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 45,
  },
  fleetCardBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  fleetCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.white,
  },
  fleetCardPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.white,
    marginTop: 2,
  },
  fleetCardRenter: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#E2E8F0",
    marginTop: 3,
  },
  fleetCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  fleetCallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  seeLocationBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  seeLocationBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
  },
  emptyCardWrap: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  emptyCardText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },

  // =========================================================================
  // 5. ACTION REQUIRED LIST
  // =========================================================================
  actionList: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    marginTop: 5,
  },
  actionItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  actionCarImage: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  actionDetails: {
    flex: 1,
  },
  actionCarTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  actionSubtext: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 1,
  },
  actionDateText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
  },
  allClearCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginHorizontal: Spacing.lg,
    padding: 12,
    marginTop: 0,
  },
  allClearTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.dark,
  },
  allClearSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },

  // =========================================================================
  // REVENUE SHARE INFO MODAL
  // =========================================================================
  infoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  infoModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  infoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  infoModalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  infoModalTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  infoModalCloseBtn: {
    padding: 4,
  },
  infoModalDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 16,
  },
  infoShareBreakdown: {
    marginBottom: 16,
  },
  infoShareRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoShareBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoSharePercent: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  infoShareItemTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  infoShareItemDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 16,
  },
  infoSettlementNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 18,
  },
  infoSettlementText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#0369A1",
    lineHeight: 15,
  },
  infoModalActions: {
    gap: 8,
  },
  infoTrackBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  infoTrackBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.dark,
  },
  infoGotItBtn: {
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  infoGotItBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: "#64748B",
  },
});
