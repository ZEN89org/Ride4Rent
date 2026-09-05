import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
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
import {
  Booking,
  getMyBookings,
  settleReservationPayment,
  submitBookingReview,
  updateBookingStatus,
} from "@/services/bookingService";

type TabType = "all" | "pending" | "approved" | "ongoing" | "past";

const cleanDate = (d: string | null | undefined): string => {
  if (!d) return "";
  return String(d).split("T")[0];
};

export default function Bookings() {
  const auth = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Payment Modal State
  const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [paymentRef, setPaymentRef] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Review Modal State
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!auth.isGuest && auth.user) {
      loadBookings();
    }
  }, [auth.isGuest, auth.user]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await getMyBookings();
      setBookings(data);
    } catch (e) {
      console.error("Failed to load renter bookings", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSettlePayment = async () => {
    if (!selectedBookingForPayment) return;
    try {
      setSubmittingPayment(true);
      await settleReservationPayment(selectedBookingForPayment.id, {
        payment_method: paymentMethod,
        payment_reference: paymentRef.trim() || undefined,
      });

      setSelectedBookingForPayment(null);
      setPaymentRef("");
      showSuccess("Payment Submitted", "Reservation fee submitted to host for verification.");
      loadBookings();
    } catch (e: any) {
      showError("Payment Notice", e.response?.data?.message || "Payment submission failed.");
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

  const handleCancelBooking = (bookingId: number) => {
    showModal(
      "Cancel Reservation",
      "Are you sure you want to cancel this booking request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await updateBookingStatus(bookingId, "cancelled");
              showSuccess("Reservation Cancelled", "Booking request has been cancelled.");
              loadBookings();
            } catch (e) {
              showError("Error", "Could not cancel booking.");
            }
          },
        },
      ],
      "confirm"
    );
  };

  if (auth.isGuest || !auth.user) {
    return (
      <ScreenContainer>
        <View style={styles.guestContainer}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="calendar-outline" size={44} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Track Your Trips</Text>
          <Text style={styles.subtitle}>
            Sign in to view real-time reservation status, host approvals, and rental trips.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/auth")}
            activeOpacity={0.85}
          >
            <Text style={styles.signInText}>Sign In to Ride4Rent</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return b.status === "pending_payment" || b.status === "pending_verification";
    if (activeTab === "past") return b.status === "completed" || b.status === "cancelled" || b.status === "rejected";
    return b.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return { label: "1. Settle Reservation", bg: "#FEF3C7", text: "#D97706", icon: "card-outline" };
      case "pending_verification":
        return { label: "2. Host Verifying", bg: "#EFF6FF", text: "#2563EB", icon: "shield-checkmark-outline" };
      case "approved":
        return { label: "3. Confirmed / Pickup", bg: "#ECFDF5", text: "#10B981", icon: "checkmark-circle" };
      case "ongoing":
        return { label: "4. Active Rental", bg: "#F0FDF4", text: "#059669", icon: "car" };
      case "completed":
        return { label: "5. Completed", bg: "#F3F4F6", text: Colors.secondary, icon: "flag" };
      case "rejected":
        return { label: "Declined", bg: "#FEF2F2", text: Colors.error, icon: "close-circle" };
      case "cancelled":
        return { label: "Cancelled", bg: "#FEF2F2", text: Colors.error, icon: "close-circle" };
      default:
        return { label: status.toUpperCase(), bg: Colors.inputBackground, text: Colors.dark, icon: "information-circle" };
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Bookings</Text>
          <Text style={styles.subtitle}>Track rental progress, handover & reviews</Text>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabBar}>
          {(["all", "pending", "approved", "ongoing", "past"] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List Content */}
        {loading && !refreshing ? (
          <View style={{ gap: 14 }}>
            <Skeleton height={150} borderRadius={18} />
            <Skeleton height={150} borderRadius={18} />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="car-clock" size={40} color={Colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab !== "all" ? activeTab : ""} Bookings</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "pending"
                ? "You have no reservations awaiting payment settlement or host verification."
                : "Browse available vehicles and start your rental trip today."}
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push("/(tabs)/home")}
              activeOpacity={0.85}
            >
              <Text style={styles.exploreButtonText}>Explore Fleet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredBookings}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadBookings();
                }}
                colors={[Colors.primary]}
              />
            }
            renderItem={({ item }) => {
              const statusBadge = getStatusBadge(item.status);
              const vehicleName = item.vehicle?.name || "Vehicle";
              const operatorName =
                item.operator?.operator_profile?.business_name ||
                item.operator?.first_name ||
                "Verified Host";

              return (
                <View style={styles.bookingCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.vehicleInfoWrap}>
                      <Text style={styles.vehicleName} numberOfLines={1}>
                        {vehicleName}
                      </Text>
                      <Text style={styles.operatorText}>Host: {operatorName}</Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                      <Ionicons name={statusBadge.icon as any} size={12} color={statusBadge.text} />
                      <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                        {statusBadge.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.tripMetaRow}>
                    <View>
                      <Text style={styles.metaLabel}>Schedule (YYYY-MM-DD)</Text>
                      <Text style={styles.metaValue}>
                        {cleanDate(item.start_date)} → {cleanDate(item.end_date)}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.metaLabel}>Total ({item.total_days} days)</Text>
                      <Text style={styles.priceValue}>₱{Number(item.total_price).toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* Flow Action Buttons */}
                  <View style={styles.actionRow}>
                    {item.status === "pending_payment" && (
                      <>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => handleCancelBooking(item.id)}
                        >
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() => setSelectedBookingForPayment(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="card" size={15} color={Colors.dark} />
                          <Text style={styles.payBtnText}>Settle Reservation Fee</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {item.status === "completed" && !item.rating && (
                      <TouchableOpacity
                        style={styles.reviewBtn}
                        onPress={() => setSelectedBookingForReview(item)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="star" size={15} color={Colors.dark} />
                        <Text style={styles.reviewBtnText}>Leave Review & Rating</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.chatHostBtn}
                      onPress={() =>
                        router.push({
                          pathname: `/chat/${item.operator_id}`,
                          params: { name: operatorName },
                        } as any)
                      }
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color={Colors.dark} />
                      <Text style={styles.chatHostText}>Message Host</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Step 2: Settle Reservation Payment Modal */}
        <Modal
          visible={!!selectedBookingForPayment}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedBookingForPayment(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Settle Reservation Payment</Text>
                <TouchableOpacity onPress={() => setSelectedBookingForPayment(null)}>
                  <Ionicons name="close-circle" size={24} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSub}>
                Vehicle: {selectedBookingForPayment?.vehicle?.name}
              </Text>
              <Text style={styles.feeHighlight}>
                Reservation Deposit: ₱{Number(selectedBookingForPayment?.reservation_fee || 500).toLocaleString()}
              </Text>

              <Text style={styles.modalFieldLabel}>Select Payment Channel</Text>
              <View style={styles.paymentMethodsGrid}>
                {[
                  { id: "gcash", label: "GCash" },
                  { id: "maya", label: "Maya" },
                  { id: "bank_transfer", label: "Bank Transfer" },
                  { id: "cash", label: "Cash on Handover" },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.paymentMethodPill, paymentMethod === m.id && styles.paymentMethodActive]}
                    onPress={() => setPaymentMethod(m.id)}
                  >
                    <Text style={[styles.paymentMethodText, paymentMethod === m.id && styles.paymentMethodTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalFieldLabel}>Transaction Reference # (Optional for online payment)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 10048291039"
                value={paymentRef}
                onChangeText={setPaymentRef}
              />

              <View style={{ marginTop: Spacing.lg }}>
                <PrimaryButton
                  title={submittingPayment ? "Submitting..." : "Submit Payment for Host Verification"}
                  onPress={handleSettlePayment}
                  loading={submittingPayment}
                />
              </View>
            </View>
          </View>
        </Modal>

        {/* Step 8: Review and Rating Modal */}
        <Modal
          visible={!!selectedBookingForReview}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedBookingForReview(null)}
        >
          <View style={styles.modalOverlay}>
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
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.heading,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 13,
  },
  tabItemActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabItemText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  tabItemTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  list: {
    paddingBottom: 24,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  vehicleInfoWrap: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  vehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  operatorText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  tripMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  metaValue: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
    marginTop: 2,
  },
  priceValue: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  cancelBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.error,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  payBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  reviewBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  chatHostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.inputBackground,
  },
  chatHostText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.bold,
    color: Colors.dark,
    marginTop: 4,
  },
  emptySubtitle: {
    marginTop: 6,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  exploreButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  guestIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  signInButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 24,
  },
  signInText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  feeHighlight: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.primary,
    marginTop: 6,
    marginBottom: Spacing.md,
  },
  modalFieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  paymentMethodsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  paymentMethodPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodActive: {
    backgroundColor: Colors.logoBackground,
    borderColor: Colors.primary,
  },
  paymentMethodText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  paymentMethodTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  modalInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.dark,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: Spacing.md,
  },
});
