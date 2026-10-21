import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import RentalSheetHeader from "@/components/common/RentalSheetHeader";
import { rentalSheetStyle } from "@/constants/rentalDesign";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Linking, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import { Colors } from "@/constants/colors";
import { FontFamily, Radius, Spacing } from "@/constants/theme";
import { useCall } from "@/context/CallContext";
import { useNotificationCount } from "@/context/NotificationContext";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorRevenueModal from "@/features/operator/components/dashboard/OperatorRevenueModal";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { getOperatorRevenue } from "@/features/operator/services/operatorService";
import { OperatorRevenueData } from "@/features/operator/types/operatorService";
import { resolveImageUrl } from "@/services/api";
import { Booking, getMyBookings } from "@/services/bookingService";



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
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(420, width - Spacing.lg * 2);
  const { user, isOperatorPending, isOperatorFrozen } = useAuth();
  const { showModal, showError } = useAppToast();
  const { startCall } = useCall();
  const { unreadCount } = useNotificationCount();
  const profile = user?.operatorProfile ?? user?.operator_profile;

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
        const [bookingsData, revData] = await Promise.all([
          getMyBookings().catch(() => []),
          getOperatorRevenue().catch(() => null),
        ]);

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
        (b) => b.status === "trip_in_progress" || b.status === "ongoing" || b.status === "return_pending",
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

  const isAccountFrozen =
    Boolean(isOperatorFrozen) ||
    Boolean(user?.is_frozen) ||
    Boolean(revenueData?.remittance?.is_account_frozen);

  const remittance = revenueData?.remittance;
  const isGraceActive =
    !isAccountFrozen &&
    remittance?.status === "pending" &&
    !remittance?.is_grace_expired &&
    (remittance?.grace_hours_remaining ?? 0) > 0 &&
    (revenueData?.commission_due ?? 0) > 0 &&
    !revenueData?.is_current_cycle;


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
            {isAccountFrozen && (
              <TouchableOpacity
                style={styles.frozenAlertBanner}
                onPress={() => setShowRevenueModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.frozenAlertIconBox}>
                  <Ionicons name="snow" size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.frozenAlertTitle}>
                    Listings Temporarily Frozen
                  </Text>
                  <Text style={styles.frozenAlertDesc}>
                    Your vehicle listings are paused from receiving new bookings due to an unsettled monthly commission. Settle payment in Track Revenue to restore bookings.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#DC2626" />
              </TouchableOpacity>
            )}

            {isGraceActive && (
              <TouchableOpacity
                style={styles.graceAlertBanner}
                onPress={() => setShowRevenueModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.graceAlertIconBox}>
                  <Ionicons name="time" size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.graceAlertTitle}>
                    Commission Remittance Due ({remittance?.grace_hours_remaining}h left)
                  </Text>
                  <Text style={styles.graceAlertDesc}>
                    48-hour grace period is active. Settle Ride4Rent platform fee in Track Revenue to prevent automatic listing freeze.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D97706" />
              </TouchableOpacity>
            )}

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

            <ScrollView style={styles.operationsScroll} contentContainerStyle={styles.dashboardContent} showsVerticalScrollIndicator={false}>
            <View style={styles.operationalSections}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="View fleet maintenance recommendations" activeOpacity={0.85} onPress={() => router.push("/operator-maintenance" as any)} style={styles.maintenanceCard}>
              <View style={styles.maintenanceCardHeader}>
                <View style={styles.maintenanceIcon}><Ionicons name="build-outline" size={22} color={Colors.dark} /></View>
                <View style={{ flex: 1 }}><Text style={styles.maintenanceTitle}>Fleet Maintenance</Text><Text style={styles.maintenanceSubtitle}>Service reminders and vehicle care</Text></View>
                <Ionicons name="chevron-forward" size={20} color={Colors.dark} />
              </View>
            </TouchableOpacity>

            <View style={styles.operationalSection}>
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
                    <TouchableOpacity style={[styles.fleetCard, { width: cardWidth }]} onPress={() => router.push("/operator-bookings" as any)} activeOpacity={0.9}>
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
                          <View style={styles.fleetCardCopy}>
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
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <View style={styles.emptyCardWrap}>
                <Text style={[styles.emptyCardText, { fontFamily: FontFamily.semiBold, color: Colors.dark }]}>No active rentals</Text>
                <Text style={styles.emptyCardText}>Ongoing rentals will appear here.</Text>
              </View>
            )}

            </View>
            <View style={styles.operationalSection}>
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
            </View>
            </ScrollView>
          </View>

          {/* Historical Track Revenue Modal */}
          <OperatorRevenueModal
            visible={showRevenueModal}
            onClose={() => setShowRevenueModal(false)}
          />

          {/* Revenue Sharing Policy Info Modal */}
          <AppBottomSheet visible={showRevenueInfoModal} onClose={() => setShowRevenueInfoModal(false)} sheetStyle={rentalSheetStyle}>
            <RentalSheetHeader title="Revenue Sharing" subtitle="From completed rentals" icon="pie-chart-outline" onClose={() => setShowRevenueInfoModal(false)} />
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 16 }}>
              <View style={styles.revenueShareSummary}>
                <View style={styles.revenueShareRow}><Text style={styles.revenueShareLabel}>Your share</Text><Text style={styles.revenueShareValue}>{100 - Number(revenueData?.commission_percent ?? 10)}%</Text></View>
                <View style={styles.revenueShareRule} />
                <View style={styles.revenueShareRow}><Text style={styles.revenueShareLabel}>Platform commission</Text><Text style={styles.revenueShareValue}>{Number(revenueData?.commission_percent ?? 10)}%</Text></View>
              </View>
              <Text style={styles.revenueShareHint}>Commission is calculated from completed rental revenue. Check Revenue for your billing period and amount due.</Text>
            </ScrollView>
            <TouchableOpacity style={styles.revenueShareButton} onPress={() => { setShowRevenueInfoModal(false); setShowRevenueModal(true); }}><Text style={styles.revenueShareButtonText}>View Revenue</Text></TouchableOpacity>
          </AppBottomSheet>
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

  operationsScroll: { flex: 1 },
  dashboardContent: { paddingTop: 10 },
  operationalSections: { gap: 24, paddingBottom: 20, flexShrink: 0 },
  operationalSection: { gap: 12, flexShrink: 0 },
  fleetCardCopy: { flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0 },

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






  // =========================================================================
  // ALERTS
  // =========================================================================
  frozenAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  frozenAlertIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  frozenAlertTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: "#991B1B",
  },
  frozenAlertDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#B91C1C",
    lineHeight: 16,
    marginTop: 2,
  },
  graceAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFBEB",
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    marginHorizontal: Spacing.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  graceAlertIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  graceAlertTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: "#92400E",
  },
  graceAlertDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#B45309",
    lineHeight: 16,
    marginTop: 2,
  },
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
  revenueShareSummary: { backgroundColor: "#F8FAFC", borderRadius: 16, padding: 16, gap: 14 },
  revenueShareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  revenueShareLabel: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.dark, flexShrink: 1 },
  revenueShareValue: { fontFamily: FontFamily.bold, fontSize: 20, color: Colors.dark },
  revenueShareRule: { height: 1, backgroundColor: "#E2E8F0" },
  revenueShareHint: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 20, color: Colors.secondary },
  revenueShareButton: { minHeight: 50, borderRadius: 14, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", padding: 12 },
  revenueShareButtonText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.dark },
  maintenanceCard: { marginHorizontal: Spacing.lg, padding: 16, borderRadius: 18, backgroundColor: Colors.white, borderWidth: 1, borderColor: "#E2E8F0" },
  maintenanceCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  maintenanceIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.logoBackground, alignItems: "center", justifyContent: "center" },
  maintenanceTitle: { fontFamily: FontFamily.semiBold, fontSize: 15, lineHeight: 22, color: Colors.dark },
  maintenanceSubtitle: { fontFamily: FontFamily.regular, fontSize: 11, lineHeight: 17, color: Colors.secondary, marginTop: 2 },




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
  sectionHeader: { flexDirection: "row", alignItems: "center", minHeight: 44, gap: 8, paddingHorizontal: Spacing.lg },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 14.5, color: Colors.dark, flexShrink: 1 },
  yellowLine: { flex: 1, minWidth: 12, height: 2.5, backgroundColor: Colors.primary, borderRadius: 2 },
  seeAllBtn: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },
  seeAllText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#64748B",
  },

  // =========================================================================
  // 4. FLEET IN MOTION CARDS
  // =========================================================================
  horizontalList: { flexGrow: 0, flexShrink: 0 },
  horizontalListContent: { paddingHorizontal: Spacing.lg, paddingVertical: 4, gap: 14, alignItems: "flex-start" },
  fleetCard: { minHeight: 180, borderRadius: 18, overflow: "hidden", backgroundColor: "#1E1E1E", position: "relative" },
  fleetCardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  fleetCardGradient: { minHeight: 180, justifyContent: "flex-end", paddingHorizontal: 14, paddingBottom: 14, paddingTop: 48 },
  fleetCardBottomRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: 12 },
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
  fleetCardActions: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  fleetCallBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" },
  seeLocationBtn: { minHeight: 44, justifyContent: "center", alignItems: "center", backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10, flexShrink: 0 },
  seeLocationBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
  },
  emptyCardWrap: { marginHorizontal: Spacing.lg, padding: 16, minHeight: 80, justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 14 },
  emptyCardText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },

  // =========================================================================
  // 5. ACTION REQUIRED LIST
  // =========================================================================
  actionList: { paddingHorizontal: Spacing.lg, gap: 12, flexShrink: 0 },
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
    minWidth: 0,
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




















});
