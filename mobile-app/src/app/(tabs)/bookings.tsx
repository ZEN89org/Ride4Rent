import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import * as WebBrowser from "expo-web-browser";
import { copyToClipboard } from "@/utils/clipboard";
import {
  Booking,
  getMyBookings,
  requestBookingExtension,
  sendBookingLocation,
  settleReservationPayment,
  submitBookingReview,
  updateBookingStatus,
} from "@/services/bookingService";

type TabType = "all" | "ongoing" | "approved" | "pending" | "past";

const cleanDate = (d: string | null | undefined): string => {
  if (!d) return "";
  return String(d).split("T")[0];
};

const formatShortDate = (d: string | null | undefined): { month: string; day: string } => {
  if (!d) return { month: "---", day: "--" };
  const raw = String(d).split("T")[0];
  const parts = raw.split("-");
  if (parts.length >= 3) {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return {
      month: months[monthIndex] || parts[1],
      day: parts[2],
    };
  }
  return { month: "DATE", day: "01" };
};

const GCASH_IMG = require("@/assets/img/gcash.jpg");

const DEFAULT_CAR_FALLBACK =
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60";

const resolveVehicleImage = (vehicle: any): string => {
  if (!vehicle) return DEFAULT_CAR_FALLBACK;
  if (vehicle.image_url) return vehicle.image_url;
  if (vehicle.cover_photo) return vehicle.cover_photo;
  if (Array.isArray(vehicle.images) && vehicle.images.length > 0) {
    return vehicle.images[0].image_url || DEFAULT_CAR_FALLBACK;
  }
  return DEFAULT_CAR_FALLBACK;
};

export default function Bookings() {
  const auth = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Booking for Schedule / Detail Modal
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);

  // Payment Modal State
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentRefError, setPaymentRefError] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showQrPreview, setShowQrPreview] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Review Modal State
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Extension Modal State
  const [selectedBookingForExtension, setSelectedBookingForExtension] = useState<Booking | null>(null);
  const [extensionDays, setExtensionDays] = useState(1);
  const [extensionPaymentMethod, setExtensionPaymentMethod] = useState("gcash");
  const [extensionPaymentRef, setExtensionPaymentRef] = useState("");
  const [extensionError, setExtensionError] = useState("");
  const [submittingExtension, setSubmittingExtension] = useState(false);

  const loadBookings = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getMyBookings();
      setBookings(data);
    } catch (e) {
      if (!silent) console.error("Failed to load renter bookings", e);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Refresh on screen focus
  useFocusEffect(
    React.useCallback(() => {
      if (!auth.isGuest && auth.user) {
        loadBookings(true);
      }
    }, [auth.isGuest, auth.user, loadBookings])
  );

  // Auto-polling every 6 seconds so when operator clicks Start Trip, renter screen updates immediately
  useEffect(() => {
    if (auth.isGuest || !auth.user) return;
    loadBookings(false);

    const poller = setInterval(() => {
      loadBookings(true);
    }, 6000);

    return () => clearInterval(poller);
  }, [auth.isGuest, auth.user, loadBookings]);

  // Active Trip GPS Transmitter
  useEffect(() => {
    if (auth.isGuest || !auth.user) return;

    const activeTrip = bookings.find(
      (b) => b.status === "trip_in_progress" || b.status === "ongoing"
    );

    if (!activeTrip) return;

    let isMounted = true;

    const transmitLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        let street = "";
        let barangay = "";
        let city = "";
        let fullAddress = "";

        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });

          if (geo) {
            street = geo.street || geo.name || "";
            barangay = geo.district || geo.subregion || (geo as any).neighborhood || "";
            city = geo.city || geo.subregion || geo.region || "";

            const parts = [];
            if (street) parts.push(street);
            if (barangay) parts.push(barangay.startsWith("Brgy") || barangay.startsWith("Barangay") ? barangay : `Brgy. ${barangay}`);
            if (city) parts.push(city);
            fullAddress = parts.join(", ");
          }
        } catch {
          // ignore reverse geocoding error
        }

        if (isMounted && activeTrip?.id) {
          sendBookingLocation(activeTrip.id, {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: loc.coords.speed !== null && loc.coords.speed >= 0 ? Math.round(loc.coords.speed * 3.6) : undefined,
            street,
            barangay,
            city,
            location_address: fullAddress || undefined,
          }).catch(() => {});
        }
      } catch {
        // silent fail on gps temporary disconnect
      }
    };

    transmitLocation();
    const interval = setInterval(transmitLocation, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [bookings, auth.isGuest, auth.user]);

  // Summary Metrics Computation
  const summary = useMemo(() => {
    let totalSpent = 0;
    let ongoingCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    bookings.forEach((b) => {
      const price = Number(b.total_price) || 0;
      if (b.status === "trip_in_progress" || b.status === "ongoing" || b.status === "return_pending") {
        ongoingCount += 1;
        totalSpent += price;
      } else if (b.status === "approved" || b.status === "awaiting_pickup" || b.status === "pickup_in_progress" || b.status === "ready_to_start") {
        upcomingCount += 1;
        totalSpent += price;
      } else if (b.status === "completed") {
        completedCount += 1;
        totalSpent += price;
      }
    });

    return { totalSpent, ongoingCount, upcomingCount, completedCount };
  }, [bookings]);

  const handleCancelBooking = (booking: Booking) => {
    const vehicleTitle = booking.vehicle?.name || "this booking";
    showModal(
      "Cancel Reservation",
      `Are you sure you want to cancel the reservation for ${vehicleTitle}? It will be removed from your bookings.`,
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await updateBookingStatus(booking.id, "cancelled");
              showSuccess("Booking Cancelled", "The booking has been cancelled and removed.");
              setBookings((prev) => prev.filter((b) => b.id !== booking.id));
              if (selectedBookingForDetails?.id === booking.id) {
                setSelectedBookingForDetails(null);
              }
            } catch (e: any) {
              showError("Error", e.response?.data?.message || "Could not cancel booking.");
            }
          },
        },
      ],
      "confirm"
    );
  };

  const handleChatOperatorForPayment = (booking: Booking) => {
    const opId = booking.operator_id;
    const opName =
      booking.operator?.operator_profile?.business_name ||
      booking.operator?.operatorProfile?.business_name ||
      booking.vehicle?.operator?.operator_profile?.business_name ||
      booking.operator?.first_name ||
      "Host";

    setSelectedBookingForPayment(null);
    router.push({
      pathname: `/chat/${opId}`,
      params: { name: opName },
    } as any);
  };

  const handleCopyNumber = async (num: string) => {
    if (!num) return;
    await copyToClipboard(num);
    setCopiedPhone(true);
    showSuccess("Copied", `${num} copied to clipboard!`);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSettlePayment = async () => {
    if (!selectedBookingForPayment) return;
    setPaymentRefError("");
    try {
      setSubmittingPayment(true);
      const renterFullName =
        auth.user?.name ||
        `${auth.user?.first_name || ""} ${auth.user?.last_name || ""}`.trim() ||
        "Renter";
      const renterContact =
        auth.user?.phone_number || auth.user?.mobile_number || "";

      await settleReservationPayment(selectedBookingForPayment.id, {
        payment_method: paymentMethod,
        payment_reference: paymentRef.trim() || undefined,
        renter_refund_method: paymentMethod,
        renter_refund_account_name: renterFullName,
        renter_refund_account_number: renterContact,
      });
      setSelectedBookingForPayment(null);
      setPaymentRef("");
      setPaymentRefError("");
      showSuccess("Payment Notice Sent", "Host notified! You can chat with the host to finalize payment receipt.");
      loadBookings();
    } catch (e: any) {
      setPaymentRefError(e.response?.data?.message || "Payment notification failed. Please try again.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedBookingForReview) return;
    try {
      setSubmittingReview(true);
      await submitBookingReview(selectedBookingForReview.id, {
        rating: reviewRating,
        review: reviewText.trim() || undefined,
      });
      setSelectedBookingForReview(null);
      setReviewText("");
      setReviewRating(5);
      showSuccess("Review Submitted", "Thank you for rating your rental experience!");
      loadBookings();
    } catch (e: any) {
      showError("Review Error", e.response?.data?.message || "Review submission failed.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRequestExtension = async () => {
    if (!selectedBookingForExtension) return;
    if (extensionPaymentMethod !== "cash" && !extensionPaymentRef.trim()) {
      setExtensionError("Please enter the transaction reference number / receipt ID.");
      return;
    }
    setExtensionError("");
    try {
      setSubmittingExtension(true);
      const currentEnd = new Date(selectedBookingForExtension.end_date);
      const newEnd = new Date(currentEnd.getTime() + extensionDays * 24 * 60 * 60 * 1000);
      const newEndDateStr = newEnd.toISOString().split("T")[0];

      await requestBookingExtension(selectedBookingForExtension.id, {
        extended_end_date: newEndDateStr,
        extension_payment_method: extensionPaymentMethod,
        extension_payment_reference: extensionPaymentRef.trim() || undefined,
      });

      setSelectedBookingForExtension(null);
      setExtensionPaymentRef("");
      setExtensionError("");
      showSuccess(
        "Extension Submitted",
        `Requested +${extensionDays} ${extensionDays === 1 ? "day" : "days"} extension. Sent to host for verification.`
      );
      loadBookings();
    } catch (e: any) {
      setExtensionError(
        e.response?.data?.message || "Failed to submit rental extension request. Please try again."
      );
    } finally {
      setSubmittingExtension(false);
    }
  };

  if (auth.isGuest || !auth.user) {
    return (
      <ScreenContainer>
        <View style={styles.guestContainer}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="calendar-outline" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Track Your Trips</Text>
          <Text style={styles.subtitle}>Sign in to view real-time reservation status and rental trips.</Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => router.push("/auth")}>
            <Text style={styles.signInText}>Sign In to Ride4Rent</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "ongoing") return b.status === "trip_in_progress" || b.status === "return_pending" || b.status === "ongoing";
    if (activeTab === "approved") return b.status === "approved" || b.status === "awaiting_pickup" || b.status === "pickup_in_progress" || b.status === "ready_to_start";
    if (activeTab === "pending") return b.status === "pending_payment" || b.status === "pending_verification";
    if (activeTab === "past") return b.status === "completed" || b.status === "cancelled" || b.status === "rejected" || b.status === "no_show";
    return b.status === activeTab;
  });

  const getStatusConfig = (item: Booking) => {
    if (item.refund_status === "pending" || item.payment_status === "refund_pending") {
      return { label: "Refund Pending", bg: "#FEF2F2", text: "#DC2626", dot: "#DC2626", icon: "alert-circle" as const };
    }
    if (item.refund_status === "refunded" || item.payment_status === "refunded") {
      return { label: "Refunded", bg: "#ECFDF5", text: "#059669", dot: "#059669", icon: "checkmark-circle" as const };
    }
    switch (item.status) {
      case "pending_payment":
        return { label: "Awaiting Fee", bg: "#FFFBEB", text: "#D97706", dot: "#D97706", icon: "time-outline" as const };
      case "pending_verification":
        return { label: "Verifying Fee", bg: "#EFF6FF", text: "#2563EB", dot: "#2563EB", icon: "shield-checkmark-outline" as const };
      case "approved":
      case "awaiting_pickup":
        return { label: "Awaiting Pickup", bg: "#ECFDF5", text: "#059669", dot: "#10B981", icon: "checkmark-circle" as const };
      case "pickup_in_progress":
        return { label: "Pickup Inspection", bg: "#FEF3C7", text: "#B45309", dot: "#F59E0B", icon: "walk" as const };
      case "ready_to_start":
        return { label: "Ready to Start", bg: "#EDE9FE", text: "#7C3AED", dot: "#8B5CF6", icon: "key" as const };
      case "trip_in_progress":
      case "ongoing":
        return { label: "On Trip", bg: "#F0FDF4", text: "#15803D", dot: "#22C55E", icon: "car" as const };
      case "return_pending":
        return { label: "Return Check", bg: "#FFF7ED", text: "#C2410C", dot: "#F97316", icon: "hourglass-outline" as const };
      case "completed":
        return { label: "Completed", bg: "#F3F4F6", text: "#4B5563", dot: "#9CA3AF", icon: "flag" as const };
      case "rejected":
        return { label: "Declined", bg: "#FEF2F2", text: Colors.error, dot: Colors.error, icon: "close-circle" as const };
      case "cancelled":
        return { label: "Cancelled", bg: "#FEF2F2", text: Colors.error, dot: Colors.error, icon: "close-circle" as const };
      case "no_show":
        return { label: "No-Show", bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF", icon: "person-remove-outline" as const };
      default:
        return { label: String((item as any)?.status || "").toUpperCase(), bg: Colors.inputBackground, text: Colors.dark, dot: Colors.secondary, icon: "information-circle" as const };
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
          <Text style={styles.subtitle}>Track your rental plans, schedules, and active trips</Text>
        </View>

        {/* Top Summary Card (Dark & Ride4Rent Gold Theme) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>RENTAL FLEET OVERVIEW</Text>
              <Text style={styles.summaryAmount}>
                {bookings.length} {bookings.length === 1 ? "Reservation" : "Total Trips"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.summaryExploreBadge}
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/home")}
            >
              <Ionicons name="car-sport" size={14} color={Colors.dark} />
              <Text style={styles.summaryExploreText}>Browse Cars</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryDivider} />

          {/* 3 Metrics Row */}
          <View style={styles.summaryMetricsRow}>
            <View style={styles.summaryMetricItem}>
              <Text style={styles.summaryMetricVal}>{summary.ongoingCount}</Text>
              <Text style={styles.summaryMetricTitle}>Ongoing</Text>
            </View>

            <View style={styles.summaryMetricDivider} />

            <View style={styles.summaryMetricItem}>
              <Text style={styles.summaryMetricVal}>{summary.upcomingCount}</Text>
              <Text style={styles.summaryMetricTitle}>Upcoming</Text>
            </View>

            <View style={styles.summaryMetricDivider} />

            <View style={styles.summaryMetricItem}>
              <Text style={styles.summaryMetricVal}>{summary.completedCount}</Text>
              <Text style={styles.summaryMetricTitle}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Horizontal Filter Pill Tabs */}
        <View style={styles.tabBarWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
            {[
              { id: "all", label: "All" },
              { id: "ongoing", label: "Ongoing" },
              { id: "approved", label: "Awaiting Pickup" },
              { id: "pending", label: "Pending" },
              { id: "past", label: "Past / Completed" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.id as TabType)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List Content */}
        {loading && !refreshing ? (
          <View style={{ gap: 14, marginTop: 8 }}>
            <Skeleton height={170} borderRadius={18} />
            <Skeleton height={170} borderRadius={18} />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="car-clock" size={40} color={Colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "all"
                ? "You have not made any vehicle reservations yet."
                : `No reservations in the "${activeTab}" category.`}
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push("/(tabs)/home")}
            >
              <Text style={styles.exploreButtonText}>Browse Available Vehicles</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadBookings} colors={[Colors.primary]} />}
            renderItem={({ item }) => {
              const statusCfg = getStatusConfig(item);
              const vehicleName = item.vehicle?.name || "Vehicle";
              const vehicleImageUrl = resolveVehicleImage(item.vehicle);
              const dateInfo = formatShortDate(item.start_date);
              const operatorBusinessName =
                item.operator?.operator_profile?.business_name ||
                item.operator?.operatorProfile?.business_name ||
                item.vehicle?.operator?.operatorProfile?.business_name ||
                item.vehicle?.operator?.operator_profile?.business_name ||
                item.operator?.first_name ||
                "Verified Host";

              const isRefundPending =
                item.refund_status === "pending" || item.payment_status === "refund_pending";
              const isRefundCompleted =
                item.refund_status === "refunded" || item.payment_status === "refunded";

              return (
                <View style={styles.bookingCard}>
                  {/* Card Main Row */}
                  <View style={styles.cardMainRow}>
                    {/* Left Date Badge */}
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateBadgeMonth}>{dateInfo.month}</Text>
                      <Text style={styles.dateBadgeDay}>{dateInfo.day}</Text>
                    </View>

                    {/* Middle Info & Thumbnail */}
                    <View style={styles.cardCenterInfo}>
                      <View style={styles.hostRow}>
                        <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
                        <Text style={styles.hostNameText} numberOfLines={1}>
                          {operatorBusinessName}
                        </Text>
                      </View>
                      <Text style={styles.vehicleTitle} numberOfLines={1}>
                        {vehicleName}
                      </Text>
                      <Text style={styles.specsSubText}>
                        ₱{Number(item.total_price).toLocaleString()} • {item.total_days} {item.total_days === 1 ? "day" : "days"}
                      </Text>
                    </View>

                    {/* Right Status Pill & Image */}
                    <View style={styles.cardRightCol}>
                      <View style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}>
                        <View style={[styles.statusPillDot, { backgroundColor: statusCfg.dot }]} />
                        <Text style={[styles.statusPillText, { color: statusCfg.text }]}>
                          {statusCfg.label}
                        </Text>
                      </View>
                      <Image source={{ uri: vehicleImageUrl }} style={styles.vehicleThumbMini} contentFit="cover" transition={200} />
                    </View>
                  </View>

                  {/* Pending Verification Countdown Notice */}
                  {item.status === "pending_verification" && !isRefundPending && !isRefundCompleted && (
                    <View style={styles.verificationNoticeBox}>
                      <Ionicons name="hourglass-outline" size={15} color="#2563EB" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.verificationNoticeTitle}>Awaiting Host Verification</Text>
                        <Text style={styles.verificationNoticeSub}>
                          Payment submitted (Ref: {item.payment_reference || "N/A"}). The host will verify your booking. If unconfirmed within 24h, it auto-expires and triggers a full refund.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Refund Pending Notice */}
                  {isRefundPending && (
                    <View style={styles.refundPendingBox}>
                      <Ionicons name="alert-circle" size={16} color="#DC2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.refundPendingTitle}>
                          Refund Pending: ₱{Number(item.refund_amount || item.reservation_fee).toLocaleString()}
                        </Text>
                        <Text style={styles.refundPendingSub}>
                          This reservation was cancelled/declined. The host has been notified to send ₱{Number(item.refund_amount || item.reservation_fee).toLocaleString()} back to your {item.renter_refund_method?.toUpperCase() || "GCash"} ({item.renter_refund_account_number || auth.user?.phone_number || "account"}).
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Refund Completed Notice */}
                  {isRefundCompleted && (
                    <View style={styles.refundCompletedBox}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.refundCompletedTitle}>
                          Refund Sent (₱{Number(item.refund_amount || item.reservation_fee).toLocaleString()})
                        </Text>
                        <Text style={styles.refundCompletedSub}>
                          The host recorded your refund payment. Transaction Ref: {item.refund_reference || "N/A"}.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* No-Show Notice */}
                  {item.status === "no_show" && (
                    <View style={styles.noShowNoticeBox}>
                      <Ionicons name="alert-circle-outline" size={16} color="#4B5563" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.noShowNoticeTitle}>Marked as No-Show</Text>
                        <Text style={styles.noShowNoticeSub}>
                          This reservation was marked as No-Show due to uncollected vehicle pickup. The ₱{Number(item.reservation_fee || 500).toLocaleString()} reservation fee was forfeited in accordance with the host's no-show policy.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Extension Pending Notice */}
                  {item.extension_status === "pending" && (
                    <View style={styles.extensionPendingBox}>
                      <Ionicons name="time" size={16} color="#D97706" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.extensionPendingTitle}>
                          Extension Request Pending (+{item.extension_days || 1} {(item.extension_days || 1) === 1 ? "day" : "days"})
                        </Text>
                        <Text style={styles.extensionPendingSub}>
                          Requested until {cleanDate(item.extended_end_date)} • Additional fee: ₱{Number(item.extension_fee || 0).toLocaleString()} via {item.extension_payment_method?.toUpperCase() || "GCash"}. Awaiting host approval.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Extension Approved Notice */}
                  {item.extension_status === "approved" && (
                    <View style={styles.extensionApprovedBox}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.extensionApprovedTitle}>Rental Extended</Text>
                        <Text style={styles.extensionApprovedSub}>
                          Rental period extended until {cleanDate(item.end_date)}. Extra fee settled: ₱{Number(item.extension_fee || 0).toLocaleString()}.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Trip Live Metrics Banner for Renter */}
                  {(item.status === "trip_in_progress" || item.status === "return_pending" || item.status === "completed") && (
                    <View style={styles.tripMetricsBanner}>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>ODOMETER</Text>
                        <Text style={styles.metricVal}>
                          {item.start_mileage ? `${item.start_mileage.toLocaleString()} km` : "Logged"}
                        </Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>FUEL LEVEL</Text>
                        <Text style={styles.metricVal}>
                          {item.start_fuel_level !== undefined ? `${item.start_fuel_level}%` : "100%"}
                        </Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>GPS STATUS</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name="radio" size={11} color="#10B981" />
                          <Text style={[styles.metricVal, { color: "#10B981" }]}>Active</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Dual Action Buttons Row */}
                  <View style={styles.dualActionRow}>
                    {/* Outline Button: Details / Message */}
                    <TouchableOpacity
                      style={styles.outlineActionBtn}
                      activeOpacity={0.75}
                      onPress={() => setSelectedBookingForDetails(item)}
                    >
                      <Ionicons name="document-text-outline" size={14} color={Colors.dark} />
                      <Text style={styles.outlineActionText}>Details</Text>
                    </TouchableOpacity>

                    {/* Primary Button: Context-Aware (Settle Fee, Map, GPS, Extend, Review) */}
                    {item.status === "pending_payment" ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        <TouchableOpacity
                          style={styles.dangerActionBtn}
                          onPress={() => handleCancelBooking(item)}
                          activeOpacity={0.75}
                        >
                          <Text style={styles.dangerActionText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => setSelectedBookingForPayment(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="card" size={14} color={Colors.dark} />
                          <Text style={styles.primaryActionText}>Settle Fee</Text>
                        </TouchableOpacity>
                      </View>
                    ) : item.status === "approved" || item.status === "awaiting_pickup" || item.status === "pickup_in_progress" || item.status === "ready_to_start" ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        <TouchableOpacity
                          style={[styles.outlineActionBtn, { flex: 1, borderColor: "#3B82F6", backgroundColor: "#EFF6FF" }]}
                          onPress={() => {
                            setSelectedBookingForExtension(item);
                            setExtensionDays(1);
                            setExtensionPaymentRef("");
                            setExtensionError("");
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="add-circle-outline" size={14} color="#2563EB" />
                          <Text style={[styles.outlineActionText, { color: "#2563EB" }]}>Extend</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.primaryActionBtn, { flex: 1.3 }]}
                          onPress={() =>
                            router.push({
                              pathname: "/live-tracking",
                              params: {
                                type: "pickup",
                                title: "Pickup Location",
                                vehicleName: vehicleName,
                                address: item.pickup_location || item.vehicle?.pickup_address || "Pinamalayan, Oriental Mindoro",
                                latitude: item.vehicle?.pickup_latitude ? String(item.vehicle.pickup_latitude) : undefined,
                                longitude: item.vehicle?.pickup_longitude ? String(item.vehicle.pickup_longitude) : undefined,
                              },
                            } as any)
                          }
                          activeOpacity={0.85}
                        >
                          <Ionicons name="location" size={14} color={Colors.dark} />
                          <Text style={styles.primaryActionText}>Pickup Map</Text>
                        </TouchableOpacity>
                      </View>
                    ) : item.status === "trip_in_progress" || item.status === "ongoing" || item.status === "return_pending" ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        {item.extension_status !== "pending" && (
                          <TouchableOpacity
                            style={[styles.outlineActionBtn, { flex: 1, borderColor: "#3B82F6", backgroundColor: "#EFF6FF" }]}
                            onPress={() => {
                              setSelectedBookingForExtension(item);
                              setExtensionDays(1);
                              setExtensionPaymentRef("");
                              setExtensionError("");
                            }}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="add-circle-outline" size={14} color="#2563EB" />
                            <Text style={[styles.outlineActionText, { color: "#2563EB" }]}>Extend</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.primaryActionBtn, { flex: item.extension_status !== "pending" ? 1.3 : 1 }]}
                          onPress={() =>
                            router.push({
                              pathname: "/live-tracking",
                              params: {
                                bookingId: item.id.toString(),
                                vehicleName: item.vehicle?.name || "Vehicle",
                                renterName: operatorBusinessName,
                              },
                            } as any)
                          }
                          activeOpacity={0.85}
                        >
                          <Ionicons name="navigate-circle" size={15} color={Colors.dark} />
                          <Text style={styles.primaryActionText}>Live GPS</Text>
                        </TouchableOpacity>
                      </View>
                    ) : item.status === "completed" && !item.rating ? (
                      <TouchableOpacity
                        style={styles.primaryActionBtn}
                        onPress={() => setSelectedBookingForReview(item)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="star" size={14} color={Colors.dark} />
                        <Text style={styles.primaryActionText}>Leave Review</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.outlineActionBtn, { backgroundColor: "#F8FAFC" }]}
                        onPress={() =>
                          router.push({
                            pathname: `/chat/${item.operator_id}`,
                            params: { name: operatorBusinessName },
                          } as any)
                        }
                        activeOpacity={0.85}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.dark} />
                        <Text style={styles.outlineActionText}>Chat Host</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Modal 1: Rental Details & Schedule Milestone (Reference UI Screen 3) */}
        <Modal
          visible={!!selectedBookingForDetails}
          transparent
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => setSelectedBookingForDetails(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedBookingForDetails(null)}
            />
            <View style={styles.modalCardLarge}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Rental Plan Details</Text>
                  <Text style={styles.modalSub}>
                    Booking #{selectedBookingForDetails?.id} • {selectedBookingForDetails?.vehicle?.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedBookingForDetails(null)}>
                  <Ionicons name="close-circle" size={26} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {/* Hero Total / Status Banner */}
                <View style={styles.detailsHeroCard}>
                  <View>
                    <Text style={styles.detailsHeroLabel}>TOTAL RENTAL FEE</Text>
                    <Text style={styles.detailsHeroValue}>
                      ₱{Number(selectedBookingForDetails?.total_price || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.detailsHeroStatusBox}>
                    <Text style={styles.detailsHeroStatusText}>
                      {selectedBookingForDetails ? getStatusConfig(selectedBookingForDetails).label : ""}
                    </Text>
                  </View>
                </View>

                {/* Vehicle Quick Summary Card */}
                <TouchableOpacity
                  style={styles.detailsVehicleBox}
                  activeOpacity={0.88}
                  onPress={() => {
                    if (selectedBookingForDetails?.vehicle_id) {
                      setSelectedBookingForDetails(null);
                      router.push(`/vehicles/${selectedBookingForDetails.vehicle_id}` as any);
                    }
                  }}
                >
                  <Image
                    source={{ uri: resolveVehicleImage(selectedBookingForDetails?.vehicle) }}
                    style={styles.detailsVehicleThumb}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailsVehicleTitle} numberOfLines={1}>
                      {selectedBookingForDetails?.vehicle?.name}
                    </Text>
                    <Text style={styles.detailsVehicleSub}>
                      {selectedBookingForDetails?.vehicle?.type || "Car"} • {selectedBookingForDetails?.vehicle?.transmission || "Automatic"} • {selectedBookingForDetails?.vehicle?.fuel_type || "Gasoline"}
                    </Text>
                    <Text style={styles.detailsPickupAddress} numberOfLines={1}>
                      📍 {selectedBookingForDetails?.pickup_location || selectedBookingForDetails?.vehicle?.pickup_address || "Pinamalayan, Oriental Mindoro"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
                </TouchableOpacity>

                {/* Rental Schedule Milestones (Vertical Timeline) */}
                <Text style={styles.timelineSectionTitle}>Trip Schedule & Milestones</Text>
                <View style={styles.verticalTimeline}>
                  {/* Step 1: Reservation */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineIconCol}>
                      <View style={[styles.timelineNode, { backgroundColor: Colors.primary }]}>
                        <Ionicons name="calendar" size={13} color={Colors.white} />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStepTitle}>Reservation Placed</Text>
                      <Text style={styles.timelineStepSub}>
                        {cleanDate(selectedBookingForDetails?.created_at)} • Deposit: ₱{Number(selectedBookingForDetails?.reservation_fee || 500).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Step 2: Pickup Handover */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineIconCol}>
                      <View style={[
                        styles.timelineNode,
                        selectedBookingForDetails?.status !== "pending_payment" && selectedBookingForDetails?.status !== "pending_verification"
                          ? { backgroundColor: "#10B981" }
                          : { backgroundColor: "#E2E8F0" }
                      ]}>
                        <Ionicons name="key" size={13} color={Colors.dark} />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStepTitle}>Vehicle Handover & Pickup</Text>
                      <Text style={styles.timelineStepSub}>
                        Start Date: {cleanDate(selectedBookingForDetails?.start_date)}
                      </Text>
                    </View>
                  </View>

                  {/* Step 3: Active Rental Trip */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineIconCol}>
                      <View style={[
                        styles.timelineNode,
                        selectedBookingForDetails?.status === "trip_in_progress" || selectedBookingForDetails?.status === "ongoing" || selectedBookingForDetails?.status === "completed"
                          ? { backgroundColor: "#10B981" }
                          : { backgroundColor: "#E2E8F0" }
                      ]}>
                        <Ionicons name="car" size={13} color={Colors.dark} />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStepTitle}>Active Trip & GPS Tracking</Text>
                      <Text style={styles.timelineStepSub}>
                        {selectedBookingForDetails?.start_mileage ? `Start Odometer: ${selectedBookingForDetails.start_mileage.toLocaleString()} km` : "Logged upon vehicle release"}
                      </Text>
                    </View>
                  </View>

                  {/* Step 4: Return & Clearance */}
                  <View style={styles.timelineRow}>
                    <View style={styles.timelineIconCol}>
                      <View style={[
                        styles.timelineNode,
                        selectedBookingForDetails?.status === "completed"
                          ? { backgroundColor: "#10B981" }
                          : { backgroundColor: "#E2E8F0" }
                      ]}>
                        <Ionicons name="flag" size={13} color={Colors.dark} />
                      </View>
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStepTitle}>Return & Inspection Clearance</Text>
                      <Text style={styles.timelineStepSub}>
                        Return Date: {cleanDate(selectedBookingForDetails?.end_date)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Bottom Quick Action */}
                <View style={{ marginTop: Spacing.md, gap: 10 }}>
                  <PrimaryButton
                    title="Message Host"
                    onPress={() => {
                      const opId = selectedBookingForDetails?.operator_id;
                      const opName =
                        selectedBookingForDetails?.operator?.operator_profile?.business_name ||
                        selectedBookingForDetails?.operator?.first_name ||
                        "Host";
                      setSelectedBookingForDetails(null);
                      router.push({ pathname: `/chat/${opId}`, params: { name: opName } } as any);
                    }}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Modal 2: Payment & Fee Settlement with Host */}
        <Modal
          visible={!!selectedBookingForPayment}
          transparent
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => setSelectedBookingForPayment(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedBookingForPayment(null)}
            />
            <View style={[styles.modalCardLarge, { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 24 }]}>
              {/* Drag Indicator */}
              <View style={{ alignItems: "center", marginBottom: 8 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border }} />
              </View>

              {/* Top Row with Close Icon */}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 }}>
                <TouchableOpacity onPress={() => setSelectedBookingForPayment(null)}>
                  <Ionicons name="close-circle" size={26} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {/* 1. HERO AMOUNT (Clean, Focused, Zero Clutter) */}
                <View style={{ alignItems: "center", marginBottom: 22 }}>
                  <Text style={{ fontFamily: FontFamily.semiBold, fontSize: 11.5, color: Colors.secondary, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Reservation Deposit
                  </Text>
                  <Text style={{ fontFamily: FontFamily.bold, fontSize: 38, color: Colors.dark, marginVertical: 2, letterSpacing: -0.5 }}>
                    ₱{Number(selectedBookingForPayment?.reservation_fee || 500).toLocaleString()}
                  </Text>
                  <Text style={{ fontFamily: FontFamily.medium, fontSize: 13, color: Colors.dark }}>
                    {selectedBookingForPayment?.vehicle?.name}
                  </Text>
                  <Text style={{ fontFamily: FontFamily.regular, fontSize: 11.5, color: Colors.secondary, marginTop: 2 }}>
                    Total ₱{Number(selectedBookingForPayment?.total_price || 0).toLocaleString()} • Balance of ₱{Math.max(0, Number(selectedBookingForPayment?.total_price || 0) - Number(selectedBookingForPayment?.reservation_fee || 500)).toLocaleString()} on pickup
                  </Text>
                </View>

                {/* 2. DEDICATED GCASH PAYMENT DESTINATION */}
                {(() => {
                  const pInfo =
                    selectedBookingForPayment?.operator_payment_info ||
                    selectedBookingForPayment?.operator?.operator_profile ||
                    selectedBookingForPayment?.operator?.operatorProfile ||
                    selectedBookingForPayment?.vehicle?.operator?.operator_profile;

                  const hostName =
                    selectedBookingForPayment?.operator?.operator_profile?.business_name ||
                    selectedBookingForPayment?.operator?.first_name ||
                    "Vehicle Host";

                  const hostNumber = pInfo?.account_number || "";

                  return (
                    <View style={{
                      backgroundColor: Colors.white,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      padding: 16,
                      marginBottom: 20,
                    }}>
                      {/* GCash Header with Asset Image & QR Button */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Image
                            source={GCASH_IMG}
                            style={{ width: 34, height: 34, borderRadius: 8 }}
                            contentFit="cover"
                          />
                          <View>
                            <Text style={{ fontFamily: FontFamily.bold, fontSize: 14, color: Colors.dark }}>
                              GCash
                            </Text>
                            <Text style={{ fontFamily: FontFamily.regular, fontSize: 11, color: Colors.secondary }}>
                              Send to {hostName}
                            </Text>
                          </View>
                        </View>

                        {pInfo?.qr_code_url ? (
                          <TouchableOpacity
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 5,
                              backgroundColor: Colors.logoBackground,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: "#FDE68A",
                            }}
                            onPress={() => setShowQrPreview(pInfo.qr_code_url)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="qr-code" size={14} color={Colors.dark} />
                            <Text style={{ fontFamily: FontFamily.bold, fontSize: 11, color: Colors.dark }}>
                              View QR
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {/* Recipient Number & Copy Button Row */}
                      <View style={{
                        backgroundColor: Colors.inputBackground,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ fontFamily: FontFamily.regular, fontSize: 10.5, color: Colors.secondary }}>
                            {pInfo?.account_name ? `Account Name: ${pInfo.account_name}` : "Host GCash Number"}
                          </Text>
                          <Text style={{ fontFamily: FontFamily.bold, fontSize: 15, color: Colors.dark, marginTop: 1, letterSpacing: 0.5 }}>
                            {hostNumber || "Contact host for GCash number"}
                          </Text>
                        </View>

                        {hostNumber ? (
                          <TouchableOpacity
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              backgroundColor: copiedPhone ? "#ECFDF5" : Colors.white,
                              borderWidth: 1,
                              borderColor: copiedPhone ? "#A7F3D0" : Colors.border,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 8,
                            }}
                            onPress={() => handleCopyNumber(hostNumber)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={copiedPhone ? "checkmark" : "copy-outline"}
                              size={13}
                              color={copiedPhone ? "#047857" : Colors.dark}
                            />
                            <Text style={{
                              fontFamily: FontFamily.bold,
                              fontSize: 11.5,
                              color: copiedPhone ? "#047857" : Colors.dark,
                            }}>
                              {copiedPhone ? "Copied" : "Copy"}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {/* Reference Input */}
                      <TextInput
                        style={{
                          backgroundColor: Colors.inputBackground,
                          borderRadius: 12,
                          paddingHorizontal: 14,
                          paddingVertical: 11,
                          fontFamily: FontFamily.medium,
                          fontSize: 13,
                          color: Colors.dark,
                          borderWidth: 1,
                          borderColor: paymentRef ? Colors.primary : "transparent",
                        }}
                        placeholder="Enter Reference No."
                        placeholderTextColor={Colors.secondary}
                        value={paymentRef}
                        onChangeText={setPaymentRef}
                      />
                    </View>
                  );
                })()}

                {/* 4. PRIMARY ACTION BUTTON */}
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.primary,
                    borderRadius: 14,
                    height: 50,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    shadowColor: Colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                  onPress={handleSettlePayment}
                  disabled={submittingPayment}
                  activeOpacity={0.88}
                >
                  {submittingPayment ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.white} />
                      <Text style={{ fontFamily: FontFamily.bold, fontSize: 14, color: Colors.white }}>
                        Sending Notice...
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                      <Text style={{ fontFamily: FontFamily.bold, fontSize: 14, color: Colors.white }}>
                        Send Payment Notice
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {paymentRefError ? (
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 8,
                  }}>
                    <Ionicons name="alert-circle" size={14} color={Colors.error} />
                    <Text style={{ fontFamily: FontFamily.medium, fontSize: 12, color: Colors.error }}>
                      {paymentRefError}
                    </Text>
                  </View>
                ) : null}

                {/* 5. SUBTLE CHAT LINK */}
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 14,
                    paddingVertical: 8,
                  }}
                  onPress={() => selectedBookingForPayment && handleChatOperatorForPayment(selectedBookingForPayment)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.secondary} />
                  <Text style={{ fontFamily: FontFamily.medium, fontSize: 12.5, color: Colors.secondary }}>
                    Have questions? Chat with host
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Fullscreen QR Code Preview Modal */}
        <Modal
          visible={!!showQrPreview}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowQrPreview(null)}
        >
          <View style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowQrPreview(null)} />
            <View style={{
              backgroundColor: Colors.white,
              borderRadius: 20,
              padding: 22,
              alignItems: "center",
              maxWidth: 340,
              width: "100%",
              shadowColor: Colors.shadow,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 8,
            }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 14 }} />
              <Text style={{ fontFamily: FontFamily.bold, fontSize: 16, color: Colors.dark, marginBottom: 2 }}>
                Host Payment QR Code
              </Text>
              <Text style={{ fontFamily: FontFamily.regular, fontSize: 11.5, color: Colors.secondary, marginBottom: 14, textAlign: "center" }}>
                Scan with GCash, Maya, or any QRPH banking app
              </Text>

              {showQrPreview && (
                <View style={{
                  padding: 10,
                  backgroundColor: Colors.inputBackground,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginBottom: 16,
                }}>
                  <Image
                    source={{ uri: showQrPreview }}
                    style={{ width: 220, height: 220, borderRadius: 8 }}
                    contentFit="contain"
                  />
                </View>
              )}

              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  borderRadius: 12,
                  width: "100%",
                  alignItems: "center",
                }}
                onPress={() => setShowQrPreview(null)}
                activeOpacity={0.88}
              >
                <Text style={{ fontFamily: FontFamily.bold, fontSize: 13.5, color: Colors.white }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal 3: Review Modal */}
        <Modal
          visible={!!selectedBookingForReview}
          transparent
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => setSelectedBookingForReview(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedBookingForReview(null)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rate Your Rental Trip</Text>
                <TouchableOpacity onPress={() => setSelectedBookingForReview(null)}>
                  <Ionicons name="close-circle" size={24} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSub}>
                How was your experience with {selectedBookingForReview?.vehicle?.name}?
              </Text>

              {/* Star Selector */}
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                    <Ionicons
                      name={star <= reviewRating ? "star" : "star-outline"}
                      size={34}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalFieldLabel}>Write a Review</Text>
              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                placeholder="Vehicle condition, handover punctuality, host friendliness..."
                value={reviewText}
                onChangeText={setReviewText}
                multiline
              />

              <View style={{ marginTop: Spacing.lg }}>
                <PrimaryButton
                  title={submittingReview ? "Submitting..." : "Submit Review"}
                  onPress={handleSubmitReview}
                  loading={submittingReview}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal 4: Rental Extension Modal */}
        <Modal
          visible={!!selectedBookingForExtension}
          transparent
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => setSelectedBookingForExtension(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedBookingForExtension(null)}
            />
            <View style={styles.modalCardLarge}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Extend Rental Duration</Text>
                  <Text style={styles.modalSub}>
                    {selectedBookingForExtension?.vehicle?.name || "Vehicle"} • Booking #{selectedBookingForExtension?.id}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedBookingForExtension(null)}>
                  <Ionicons name="close-circle" size={26} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {(() => {
                  if (!selectedBookingForExtension) return null;
                  const dailyRate = Number(
                    selectedBookingForExtension.vehicle?.price_per_day ||
                    selectedBookingForExtension.total_price ||
                    1000
                  );
                  const extraAmount = dailyRate * extensionDays;
                  const curEnd = new Date(selectedBookingForExtension.end_date);
                  const newEnd = new Date(curEnd.getTime() + extensionDays * 24 * 60 * 60 * 1000);
                  const newEndDateStr = newEnd.toISOString().split("T")[0];

                  const operator = selectedBookingForExtension.operator || (selectedBookingForExtension.vehicle as any)?.operator;
                  const operatorProfile = operator?.operator_profile || (selectedBookingForExtension.vehicle as any)?.operator_profile;
                  const operatorPayment = selectedBookingForExtension.operator_payment_info;

                  const businessName =
                    operatorProfile?.business_name ||
                    operator?.name ||
                    "Host";

                  const accountName =
                    operatorPayment?.account_name ||
                    operatorProfile?.payment_account_name ||
                    operatorProfile?.business_name ||
                    operator?.name ||
                    "Operator Account";

                  const accountNumber =
                    operatorPayment?.account_number ||
                    operatorProfile?.payment_account_number ||
                    operator?.phone_number ||
                    operator?.mobile_number ||
                    "09XX-XXX-XXXX";

                  return (
                    <View>
                      {/* Extension Duration Selector */}
                      <Text style={styles.modalFieldLabel}>Select Additional Days</Text>
                      <View style={styles.extensionDaysRow}>
                        {[1, 2, 3, 5, 7].map((days) => (
                          <TouchableOpacity
                            key={days}
                            style={[
                              styles.extensionDayPill,
                              extensionDays === days && styles.extensionDayPillActive,
                            ]}
                            onPress={() => setExtensionDays(days)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.extensionDayText,
                                extensionDays === days && styles.extensionDayTextActive,
                              ]}
                            >
                              +{days} {days === 1 ? "Day" : "Days"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Calculation Summary Box */}
                      <View style={styles.extSummaryCard}>
                        <View style={styles.extSummaryRow}>
                          <Text style={styles.extSummaryLabel}>Current End Date</Text>
                          <Text style={styles.extSummaryVal}>{cleanDate(selectedBookingForExtension.end_date)}</Text>
                        </View>
                        <View style={styles.extSummaryRow}>
                          <Text style={styles.extSummaryLabel}>New Return Date</Text>
                          <Text style={[styles.extSummaryVal, { color: "#2563EB", fontFamily: FontFamily.bold }]}>
                            {newEndDateStr}
                          </Text>
                        </View>
                        <View style={styles.extSummaryRow}>
                          <Text style={styles.extSummaryLabel}>Rate per Day</Text>
                          <Text style={styles.extSummaryVal}>₱{dailyRate.toLocaleString()}</Text>
                        </View>
                        <View style={styles.extSummaryDivider} />
                        <View style={styles.extSummaryRow}>
                          <Text style={[styles.extSummaryLabel, { fontFamily: FontFamily.bold, color: Colors.dark }]}>
                            Additional Rental Fee
                          </Text>
                          <Text style={styles.extSummaryTotalVal}>
                            ₱{extraAmount.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Host Payment Card */}
                      <View style={styles.hostPaymentCard}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                          <Text style={styles.hostPaymentTitle}>Pay Host for Extension</Text>
                        </View>
                        <View style={styles.hostPaymentRow}>
                          <Text style={styles.hostPaymentLabel}>Recipient:</Text>
                          <Text style={styles.hostPaymentVal}>{businessName}</Text>
                        </View>
                        <View style={styles.hostPaymentRow}>
                          <Text style={styles.hostPaymentLabel}>Account Name:</Text>
                          <Text style={styles.hostPaymentVal}>{accountName}</Text>
                        </View>
                        <View style={styles.hostPaymentRow}>
                          <Text style={styles.hostPaymentLabel}>Account Number:</Text>
                          <Text style={[styles.hostPaymentVal, { fontFamily: FontFamily.bold, color: Colors.primary }]}>
                            {accountNumber}
                          </Text>
                        </View>

                        {/* Payment Method Pills */}
                        <Text style={[styles.modalFieldLabel, { marginTop: 10 }]}>Payment Method Used</Text>
                        <View style={styles.paymentMethodsGrid}>
                          {[
                            { id: "gcash", label: "GCash" },
                            { id: "maya", label: "Maya" },
                            { id: "bank_transfer", label: "Bank Transfer" },
                            { id: "cash", label: "Cash to Host" },
                          ].map((m) => (
                            <TouchableOpacity
                              key={m.id}
                              style={[
                                styles.paymentMethodPill,
                                extensionPaymentMethod === m.id && styles.paymentMethodActive,
                              ]}
                              onPress={() => setExtensionPaymentMethod(m.id)}
                              activeOpacity={0.75}
                            >
                              <Text
                                style={[
                                  styles.paymentMethodText,
                                  extensionPaymentMethod === m.id && styles.paymentMethodTextActive,
                                ]}
                              >
                                {m.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Payment Ref Input */}
                      <Text style={styles.modalFieldLabel}>Transaction Reference # / Receipt ID</Text>
                      <TextInput
                        style={[
                          styles.modalInput,
                          extensionError ? styles.modalInputError : null,
                        ]}
                        placeholder="e.g. GCash / Maya Ref No."
                        placeholderTextColor={Colors.secondary}
                        value={extensionPaymentRef}
                        onChangeText={(t) => {
                          setExtensionPaymentRef(t);
                          if (extensionError) setExtensionError("");
                        }}
                      />

                      {extensionError ? (
                        <View style={styles.inlineErrorRow}>
                          <Ionicons name="alert-circle" size={15} color="#EF4444" />
                          <Text style={styles.inlineErrorText}>{extensionError}</Text>
                        </View>
                      ) : null}

                      <View style={{ marginTop: Spacing.lg }}>
                        <PrimaryButton
                          title={submittingExtension ? "Submitting..." : `Request Extension (₱${extraAmount.toLocaleString()})`}
                          onPress={handleRequestExtension}
                          loading={submittingExtension}
                        />
                      </View>
                    </View>
                  );
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
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
    marginTop: 2,
  },
  // Top Summary Card (Dark & Gold)
  summaryCard: {
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
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 0.6,
  },
  summaryAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.primary,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  summaryExploreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
  },
  summaryExploreText: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.white,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#2E2E2E",
    marginVertical: 14,
  },
  summaryMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryMetricItem: {
    flex: 1,
    alignItems: "center",
  },
  statusDotMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  summaryMetricVal: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.white,
  },
  summaryMetricTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1,
  },
  summaryMetricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#2E2E2E",
  },
  // Tab Bar Pills
  tabBarWrapper: {
    marginBottom: Spacing.md,
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  tabItemActive: {
    backgroundColor: Colors.primary,
  },
  tabItemText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  tabItemTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  list: {
    paddingBottom: 80,
    gap: 12,
  },
  // Redesigned Booking Card
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateBadge: {
    width: 48,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  dateBadgeMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    color: "#B45309",
    letterSpacing: 0.5,
  },
  dateBadgeDay: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    marginTop: -1,
  },
  cardCenterInfo: {
    flex: 1,
  },
  hostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  hostNameText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  vehicleTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14.5,
    color: Colors.dark,
    marginBottom: 2,
  },
  specsSubText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  cardRightCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
  },
  vehicleThumbMini: {
    width: 48,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
  },
  // Dual Action Buttons Row
  dualActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  outlineActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: Colors.white,
  },
  outlineActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  primaryActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  dangerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  dangerActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.error,
  },
  // Trip Live Metrics Banner
  tripMetricsBanner: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 10,
    alignItems: "center",
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 8.5,
    color: Colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricVal: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#CBD5E1",
  },
  verificationNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  verificationNoticeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#1E40AF",
  },
  verificationNoticeSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 2,
    lineHeight: 15,
  },
  refundPendingBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  refundPendingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#DC2626",
  },
  refundPendingSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#991B1B",
    marginTop: 2,
    lineHeight: 15,
  },
  refundCompletedBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  refundCompletedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#065F46",
  },
  refundCompletedSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
    lineHeight: 15,
  },
  noShowNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  noShowNoticeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#374151",
  },
  noShowNoticeSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 15,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    maxHeight: "85%",
  },
  modalCardLarge: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
  },
  modalSub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 2,
  },
  // Details Modal Specific Styles
  detailsHeroCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.dark,
    borderRadius: 16,
    padding: 16,
    marginBottom: Spacing.md,
  },
  detailsHeroLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#9CA3AF",
    letterSpacing: 0.6,
  },
  detailsHeroValue: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.primary,
    marginTop: 2,
  },
  detailsHeroStatusBox: {
    backgroundColor: "rgba(254, 193, 3, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(254, 193, 3, 0.3)",
  },
  detailsHeroStatusText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.primary,
  },
  detailsVehicleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
    marginBottom: Spacing.lg,
  },
  detailsVehicleThumb: {
    width: 60,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.inputBackground,
  },
  detailsVehicleTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  detailsVehicleSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.secondary,
    marginTop: 1,
  },
  detailsPickupAddress: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#059669",
    marginTop: 2,
  },
  timelineSectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 12,
  },
  verticalTimeline: {
    paddingLeft: 4,
    marginBottom: Spacing.md,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineIconCol: {
    alignItems: "center",
    width: 28,
  },
  timelineNode: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    height: 36,
    backgroundColor: "#E2E8F0",
    marginVertical: 3,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 3,
    paddingBottom: 16,
  },
  timelineStepTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  timelineStepSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.secondary,
    marginTop: 2,
  },
  // Payment Modal Specific
  paymentAmountBanner: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  paymentAmountLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  paymentAmountValue: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.dark,
    marginVertical: 4,
  },
  paymentAmountSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.secondary,
    textAlign: "center",
  },
  hostPaymentCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    padding: 14,
    marginBottom: Spacing.md,
  },
  hostPaymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  hostPaymentTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#166534",
  },
  hostPaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  hostPaymentLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#374151",
  },
  hostPaymentVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    color: Colors.dark,
  },
  modalFieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
    marginBottom: 6,
  },
  paymentMethodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  paymentMethodPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  paymentMethodActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentMethodText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  paymentMethodTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  modalInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  inlineErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inlineErrorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginVertical: Spacing.md,
  },
  guestContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: 40,
  },
  guestIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  signInButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  signInText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.white,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: Spacing.lg,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  exploreButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
  },
  extensionPendingBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  extensionPendingTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: "#B45309",
    marginBottom: 2,
  },
  extensionPendingSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#78350F",
    lineHeight: 16,
  },
  extensionApprovedBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  extensionApprovedTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: "#047857",
    marginBottom: 2,
  },
  extensionApprovedSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#065F46",
    lineHeight: 16,
  },
  extensionDaysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  extensionDayPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  extensionDayPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  extensionDayText: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    color: "#475569",
  },
  extensionDayTextActive: {
    fontFamily: FontFamily.bold,
    color: "#1D4ED8",
  },
  extSummaryCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  extSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  extSummaryLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12.5,
    color: "#64748B",
  },
  extSummaryVal: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },
  extSummaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
  },
  extSummaryTotalVal: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: "#2563EB",
  },
});

