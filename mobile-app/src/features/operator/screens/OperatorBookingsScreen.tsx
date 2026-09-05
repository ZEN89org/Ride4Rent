import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";

import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import {
  Booking,
  getMyBookings,
  updateBookingStatus,
} from "@/services/bookingService";

type OperatorTabType = "pending" | "approved" | "ongoing" | "history";

export default function OperatorBookingsScreen() {
  const { showSuccess, showError, showModal } = useAppToast();
  const [activeTab, setActiveTab] = useState<OperatorTabType>("pending");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Renter Profile Modal
  const [selectedRenter, setSelectedRenter] = useState<any | null>(null);

  useEffect(() => {
    loadOperatorBookings();
  }, []);

  const loadOperatorBookings = async () => {
    try {
      setLoading(true);
      const data = await getMyBookings();
      setBookings(data);
    } catch (e) {
      console.error("Failed to load operator bookings", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusChange = (
    bookingId: number,
    newStatus: "approved" | "rejected" | "ongoing" | "completed"
  ) => {
    const actionName =
      newStatus === "approved"
        ? "Verify & Approve"
        : newStatus === "rejected"
        ? "Decline"
        : newStatus === "ongoing"
        ? "Handover & Start Trip"
        : "Complete Inspection & Rental";

    showModal(
      `${actionName}`,
      `Confirm status update to '${newStatus}' for this rental reservation?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newStatus === "rejected" ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateBookingStatus(bookingId, newStatus);
              showSuccess("Status Updated", `Reservation marked as ${newStatus}.`);
              loadOperatorBookings();
            } catch (e) {
              showError("Error", "Could not update booking status.");
            }
          },
        },
      ],
      "confirm"
    );
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "history") {
      return b.status === "completed" || b.status === "rejected" || b.status === "cancelled";
    }
    if (activeTab === "pending") {
      return b.status === "pending_payment" || b.status === "pending_verification";
    }
    return b.status === activeTab;
  });

  return (
    <OperatorShell activeRoute="bookings">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Rental Fleet Operations</Text>
          <Text style={styles.title}>Reservations & Handover</Text>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabBar}>
          {(["pending", "approved", "ongoing", "history"] as OperatorTabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = bookings.filter((b) =>
              tab === "history"
                ? b.status === "completed" || b.status === "rejected" || b.status === "cancelled"
                : tab === "pending"
                ? b.status === "pending_payment" || b.status === "pending_verification"
                : b.status === tab
            ).length;

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} {count > 0 ? `(${count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading && !refreshing ? (
          <View style={{ gap: 14 }}>
            <Skeleton height={150} borderRadius={18} />
            <Skeleton height={150} borderRadius={18} />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={44} color={Colors.secondary} />
            <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "pending"
                ? "You currently have no new customer rental requests awaiting payment verification."
                : `No reservations under ${activeTab} category.`}
            </Text>
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
                  loadOperatorBookings();
                }}
                colors={[Colors.primary]}
              />
            }
            renderItem={({ item }) => {
              const renterName = item.renter
                ? `${item.renter.first_name || ""} ${item.renter.last_name || ""}`.trim()
                : "Customer";

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vehicleName}>{item.vehicle?.name || "Vehicle"}</Text>
                      <TouchableOpacity
                        style={styles.renterLink}
                        onPress={() => setSelectedRenter(item.renter)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.renterName}>Renter: {renterName}</Text>
                        <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.priceWrap}>
                      <Text style={styles.priceTotal}>₱{Number(item.total_price).toLocaleString()}</Text>
                      <Text style={styles.priceDays}>{item.total_days} days</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.detailsRow}>
                    <View>
                      <Text style={styles.metaLabel}>Schedule (YYYY-MM-DD)</Text>
                      <Text style={styles.metaVal}>
                        {String(item.start_date).split("T")[0]} → {String(item.end_date).split("T")[0]}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.metaLabel}>Payment Status</Text>
                      <Text style={[styles.metaVal, { color: item.payment_status === "unpaid" ? "#D97706" : "#10B981" }]}>
                        {item.payment_status === "unpaid"
                          ? "Awaiting Payment"
                          : `Paid via ${item.payment_method?.toUpperCase() || "Online"}`}
                      </Text>
                    </View>
                  </View>

                  {/* Reference number if paid */}
                  {item.payment_reference && (
                    <View style={styles.refBox}>
                      <Text style={styles.refText}>Payment Ref: {item.payment_reference}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    {item.status === "pending_payment" && (
                      <View style={styles.waitingBadge}>
                        <Ionicons name="time-outline" size={14} color="#D97706" />
                        <Text style={styles.waitingText}>Waiting for Renter Payment</Text>
                      </View>
                    )}

                    {item.status === "pending_verification" && (
                      <>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => handleStatusChange(item.id, "rejected")}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.declineText}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleStatusChange(item.id, "approved")}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="shield-checkmark" size={15} color={Colors.dark} />
                          <Text style={styles.approveText}>Verify & Confirm</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {item.status === "approved" && (
                      <TouchableOpacity
                        style={styles.startBtn}
                        onPress={() => handleStatusChange(item.id, "ongoing")}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="car-key" size={16} color={Colors.dark} />
                        <Text style={styles.startBtnText}>Handover & Start Trip</Text>
                      </TouchableOpacity>
                    )}

                    {item.status === "ongoing" && (
                      <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => handleStatusChange(item.id, "completed")}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-done" size={16} color={Colors.white} />
                        <Text style={styles.completeBtnText}>Vehicle Returned & Inspected</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* View Renter Profile Modal */}
        <Modal
          visible={!!selectedRenter}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedRenter(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Renter Profile</Text>
                <TouchableOpacity onPress={() => setSelectedRenter(null)}>
                  <Ionicons name="close-circle" size={24} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.renterModalBody}>
                {selectedRenter?.profile_photo ? (
                  <Image source={{ uri: selectedRenter.profile_photo }} style={styles.renterAvatarLg} />
                ) : (
                  <View style={styles.renterAvatarLg}>
                    <Ionicons name="person" size={32} color={Colors.dark} />
                  </View>
                )}

                <Text style={styles.renterNameLg}>
                  {selectedRenter?.first_name} {selectedRenter?.last_name}
                </Text>
                <Text style={styles.renterEmailLg}>{selectedRenter?.email}</Text>
                <Text style={styles.renterPhoneLg}>{selectedRenter?.mobile_number || "No contact number"}</Text>

                <View style={styles.verifiedPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.verifiedText}>Verified Customer</Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
    marginBottom: Spacing.md,
  },
  eyebrow: {
    color: Colors.secondary,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.small,
  },
  title: {
    color: Colors.dark,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    marginTop: 2,
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
    fontSize: 11,
    color: Colors.secondary,
  },
  tabItemTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  vehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  renterLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  renterName: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
  },
  priceWrap: {
    alignItems: "flex-end",
  },
  priceTotal: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  priceDays: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  metaVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
    marginTop: 2,
  },
  refBox: {
    backgroundColor: Colors.inputBackground,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  refText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.dark,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  waitingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  waitingText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#D97706",
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  declineText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.error,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  approveText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  startBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#10B981",
  },
  completeBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  emptyContainer: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.white,
  },
  emptyTitle: {
    color: Colors.dark,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.title,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.secondary,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
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
  renterModalBody: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  renterAvatarLg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  renterNameLg: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  renterEmailLg: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 2,
  },
  renterPhoneLg: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
  },
  verifiedText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: "#10B981",
  },
});
