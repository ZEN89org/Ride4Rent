import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { useFocusEffect } from "expo-router";
import {
  approveBookingExtension,
  Booking,
  completeTrip,
  confirmOperatorPayment,
  getBookingLocation,
  getMyBookings,
  processBookingRefund,
  rejectBookingExtension,
  startTrip,
  updateBookingStatus,
} from "@/services/bookingService";

type OperatorTabType = "pending" | "approved" | "ongoing" | "history";

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

const formatDateTime = (dtStr: string | null | undefined): string => {
  if (!dtStr) return "";
  try {
    const d = new Date(dtStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
};

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

export default function OperatorBookingsScreen() {
  const { isOperatorPending } = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const [activeTab, setActiveTab] = useState<OperatorTabType>("pending");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Renter Profile Modal
  const [selectedRenter, setSelectedRenter] = useState<any | null>(null);

  // Dedicated Verify & Approve Booking Modal State
  const [verifyModalBooking, setVerifyModalBooking] = useState<Booking | null>(null);
  const [submittingVerifyApprove, setSubmittingVerifyApprove] = useState<boolean>(false);

  // Process Refund Modal State
  const [refundModalBooking, setRefundModalBooking] = useState<Booking | null>(null);
  const [refundRefInput, setRefundRefInput] = useState<string>("");
  const [refundNotesInput, setRefundNotesInput] = useState<string>("");
  const [refundError, setRefundError] = useState<string>("");
  const [submittingRefund, setSubmittingRefund] = useState<boolean>(false);

  // Start Trip Inspection Modal State
  const [startTripModalBooking, setStartTripModalBooking] = useState<Booking | null>(null);
  const [startMileageInput, setStartMileageInput] = useState<string>("");
  const [startFuelLevelInput, setStartFuelLevelInput] = useState<number>(100);
  const [startNotesInput, setStartNotesInput] = useState<string>("");
  const [submittingStartTrip, setSubmittingStartTrip] = useState<boolean>(false);

  // Return Trip Inspection Modal State
  const [returnTripModalBooking, setReturnTripModalBooking] = useState<Booking | null>(null);
  const [endMileageInput, setEndMileageInput] = useState<string>("");
  const [endFuelLevelInput, setEndFuelLevelInput] = useState<number>(100);
  const [fuelChargeInput, setFuelChargeInput] = useState<string>("0");
  const [damageChargeInput, setDamageChargeInput] = useState<string>("0");
  const [lateFeeInput, setLateFeeInput] = useState<string>("0");
  const [otherChargesInput, setOtherChargesInput] = useState<string>("0");
  const [endNotesInput, setEndNotesInput] = useState<string>("");
  const [submittingReturnTrip, setSubmittingReturnTrip] = useState<boolean>(false);

  const loadOperatorBookings = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getMyBookings();
      setBookings(data);
    } catch (e) {
      if (!silent) console.error("Failed to load operator bookings", e);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Auto-refresh when operator returns to screen
  useFocusEffect(
    React.useCallback(() => {
      loadOperatorBookings(true);
    }, [loadOperatorBookings])
  );

  // Polling every 8s for live fleet state updates
  useEffect(() => {
    loadOperatorBookings(false);
    const poller = setInterval(() => {
      loadOperatorBookings(true);
    }, 8000);
    return () => clearInterval(poller);
  }, [loadOperatorBookings]);

  const handleStatusChange = (
    bookingId: number,
    newStatus: "approved" | "rejected" | "awaiting_pickup" | "pickup_in_progress" | "return_pending" | "no_show"
  ) => {
    const actionName =
      newStatus === "approved" || newStatus === "awaiting_pickup"
        ? "Verify & Approve"
        : newStatus === "rejected"
        ? "Decline"
        : newStatus === "no_show"
        ? "Mark Renter as No-Show"
        : newStatus === "pickup_in_progress"
        ? "Check-in Renter for Pickup"
        : "Mark Return Pending";

    const confirmMsg =
      newStatus === "no_show"
        ? "Confirm marking this reservation as No-Show? The booking will be closed, the reservation fee retained, and the vehicle unit restored to your available fleet."
        : `Confirm status update to '${newStatus}' for this rental reservation?`;

    showModal(
      `${actionName}`,
      confirmMsg,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newStatus === "rejected" || newStatus === "no_show" ? "destructive" : "default",
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

  const handleExecuteVerifyApprove = async () => {
    if (!verifyModalBooking) return;
    try {
      setSubmittingVerifyApprove(true);
      try {
        await confirmOperatorPayment(verifyModalBooking.id, {
          payment_method: verifyModalBooking.payment_method || "cash",
        });
      } catch {
        await updateBookingStatus(verifyModalBooking.id, "approved");
      }
      showSuccess("✨ Payment Confirmed & Approved", `Booking #${verifyModalBooking.id} is confirmed. Renter has been notified.`);
      setVerifyModalBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      showError("Approval Failed", e.response?.data?.message || "Could not approve this booking.");
    } finally {
      setSubmittingVerifyApprove(false);
    }
  };

  const openRefundModal = (booking: Booking) => {
    setRefundModalBooking(booking);
    setRefundRefInput("");
    setRefundNotesInput("");
    setRefundError("");
  };

  const handleExecuteProcessRefund = async () => {
    if (!refundModalBooking) return;
    if (!refundRefInput.trim()) {
      setRefundError("Please enter the refund reference number or transaction receipt ID.");
      return;
    }
    setRefundError("");
    try {
      setSubmittingRefund(true);
      await processBookingRefund(refundModalBooking.id, {
        refund_reference: refundRefInput.trim(),
        refund_notes: refundNotesInput.trim() || undefined,
      });

      showSuccess("🎉 Refund Logged", "Refund reference recorded and notification sent to the renter.");
      setRefundModalBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      setRefundError(e.response?.data?.message || "Could not process the refund.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleApproveExtension = (bookingId: number) => {
    showModal(
      "Approve Rental Extension",
      "Confirm receiving the extension fee and extending the rental schedule for this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve Extension",
          style: "default",
          onPress: async () => {
            try {
              await approveBookingExtension(bookingId);
              showSuccess("Extension Approved", "Rental period updated and renter notified.");
              loadOperatorBookings();
            } catch (e: any) {
              showError("Error", e.response?.data?.message || "Could not approve extension.");
            }
          },
        },
      ],
      "confirm"
    );
  };

  const handleRejectExtension = (bookingId: number) => {
    showModal(
      "Decline Extension",
      "Are you sure you want to decline this rental extension request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline Request",
          style: "destructive",
          onPress: async () => {
            try {
              await rejectBookingExtension(bookingId);
              showSuccess("Extension Declined", "Rental extension request was rejected.");
              loadOperatorBookings();
            } catch (e: any) {
              showError("Error", e.response?.data?.message || "Could not reject extension.");
            }
          },
        },
      ],
      "confirm"
    );
  };

  const openStartTripModal = (booking: Booking) => {
    setStartTripModalBooking(booking);
    setStartMileageInput(booking.vehicle?.mileage ? String(booking.vehicle.mileage) : "25000");
    setStartFuelLevelInput(100);
    setStartNotesInput("");
  };

  const handleExecuteStartTrip = async () => {
    if (!startTripModalBooking) return;
    const mileageNum = parseInt(startMileageInput, 10);
    if (isNaN(mileageNum) || mileageNum < 0) {
      showError("Validation Error", "Please enter a valid starting odometer mileage in km.");
      return;
    }

    try {
      setSubmittingStartTrip(true);
      await startTrip(startTripModalBooking.id, {
        start_mileage: mileageNum,
        start_fuel_level: startFuelLevelInput,
        start_inspection_notes: startNotesInput.trim() || undefined,
      });

      showSuccess("🚗 Trip Started!", `Inspection recorded. Live GPS & Rental duration tracker active.`);
      setStartTripModalBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      showError("Trip Start Failed", e.response?.data?.message || "Could not start the trip.");
    } finally {
      setSubmittingStartTrip(false);
    }
  };

  const openReturnTripModal = (booking: Booking) => {
    setReturnTripModalBooking(booking);
    const estimatedEndMileage = (booking.start_mileage ?? 25000) + 50;
    setEndMileageInput(String(estimatedEndMileage));
    setEndFuelLevelInput(booking.start_fuel_level ?? 100);
    setFuelChargeInput("0");
    setDamageChargeInput("0");
    setLateFeeInput("0");
    setOtherChargesInput("0");
    setEndNotesInput("");
  };

  const handleExecuteReturnTrip = async () => {
    if (!returnTripModalBooking) return;
    const endMileageNum = parseInt(endMileageInput, 10);
    if (isNaN(endMileageNum) || endMileageNum < 0) {
      showError("Validation Error", "Please enter a valid return odometer mileage.");
      return;
    }

    const startMileage = returnTripModalBooking.start_mileage ?? 0;
    if (endMileageNum < startMileage) {
      showError("Mileage Mismatch", `End mileage (${endMileageNum} km) cannot be lower than start mileage (${startMileage} km).`);
      return;
    }

    try {
      setSubmittingReturnTrip(true);
      await completeTrip(returnTripModalBooking.id, {
        end_mileage: endMileageNum,
        end_fuel_level: endFuelLevelInput,
        fuel_charge: parseFloat(fuelChargeInput) || 0,
        damage_charge: parseFloat(damageChargeInput) || 0,
        late_fee: parseFloat(lateFeeInput) || 0,
        other_charges: parseFloat(otherChargesInput) || 0,
        end_inspection_notes: endNotesInput.trim() || undefined,
      });

      showSuccess("🎉 Trip Completed", "Return inspection finalized and rental closed.");
      setReturnTripModalBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      showError("Completion Failed", e.response?.data?.message || "Could not complete the trip inspection.");
    } finally {
      setSubmittingReturnTrip(false);
    }
  };

  const pendingRefundsCount = bookings.filter(
    (b) => b.refund_status === "pending" || b.payment_status === "refund_pending"
  ).length;

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "history") {
      return b.status === "completed" || b.status === "rejected" || b.status === "cancelled" || b.status === "no_show";
    }
    if (activeTab === "pending") {
      return (
        b.status === "pending_payment" ||
        b.status === "pending_verification" ||
        b.refund_status === "pending" ||
        b.payment_status === "refund_pending"
      );
    }
    if (activeTab === "approved") {
      return (
        b.status === "approved" ||
        b.status === "awaiting_pickup" ||
        b.status === "pickup_in_progress" ||
        b.status === "ready_to_start"
      );
    }
    if (activeTab === "ongoing") {
      return b.status === "trip_in_progress" || b.status === "return_pending" || b.status === "ongoing";
    }
    return b.status === activeTab;
  });

  const getStatusConfig = (item: Booking) => {
    if (item.refund_status === "pending" || item.payment_status === "refund_pending") {
      return {
        label: "Refund Required",
        bg: "#FEF2F2",
        text: "#DC2626",
        icon: "alert-circle" as const,
      };
    }
    if (item.refund_status === "refunded" || item.payment_status === "refunded") {
      return {
        label: "Refunded",
        bg: "#ECFDF5",
        text: "#059669",
        icon: "checkmark-circle" as const,
      };
    }
    switch (item.status) {
      case "pending_payment":
        return {
          label: "Awaiting Renter Fee",
          bg: "#FFFBEB",
          text: "#D97706",
          icon: "time-outline" as const,
        };
      case "pending_verification":
        return {
          label: "Verify Payment",
          bg: "#EFF6FF",
          text: "#2563EB",
          icon: "shield-checkmark-outline" as const,
        };
      case "approved":
      case "awaiting_pickup":
        return {
          label: "Awaiting Pickup",
          bg: "#ECFDF5",
          text: "#059669",
          icon: "checkmark-circle" as const,
        };
      case "pickup_in_progress":
        return {
          label: "Pickup In Progress",
          bg: "#FEF3C7",
          text: "#B45309",
          icon: "walk" as const,
        };
      case "ready_to_start":
        return {
          label: "Ready to Start",
          bg: "#EDE9FE",
          text: "#7C3AED",
          icon: "key" as const,
        };
      case "trip_in_progress":
      case "ongoing":
        return {
          label: "🚗 Trip In Progress",
          bg: "#F0FDF4",
          text: "#15803D",
          icon: "car" as const,
        };
      case "return_pending":
        return {
          label: "Return Pending",
          bg: "#FFF7ED",
          text: "#C2410C",
          icon: "hourglass-outline" as const,
        };
      case "completed":
        return {
          label: "Completed",
          bg: "#F3F4F6",
          text: "#4B5563",
          icon: "flag" as const,
        };
      case "rejected":
        return {
          label: "Declined",
          bg: "#FEF2F2",
          text: Colors.error,
          icon: "close-circle" as const,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bg: "#FEF2F2",
          text: Colors.error,
          icon: "close-circle" as const,
        };
      case "no_show":
        return {
          label: "No-Show",
          bg: "#F3F4F6",
          text: "#6B7280",
          icon: "person-remove-outline" as const,
        };
      default:
        return {
          label: String((item as any)?.status || "").toUpperCase(),
          bg: Colors.inputBackground,
          text: Colors.dark,
          icon: "information-circle" as const,
        };
    }
  };

  return (
    <OperatorShell activeRoute="bookings">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Rental Fleet Operations</Text>
          <Text style={styles.subtitle}>Reservations, payment verification & handovers</Text>
        </View>

        {/* Under Review Preview Banner */}
        {isOperatorPending && (
          <View style={styles.pendingNoticeBanner}>
            <Ionicons name="time" size={18} color="#D97706" />
            <Text style={styles.pendingNoticeSub}>
              Your operator account is currently under review by our Admin team. Customer bookings and approvals will unlock once verified.
            </Text>
          </View>
        )}

        {/* Urgent Pending Refunds Banner */}
        {pendingRefundsCount > 0 && (
          <View style={styles.urgentRefundAlertBanner}>
            <Ionicons name="warning" size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.urgentRefundAlertTitle}>
                {pendingRefundsCount} Pending {pendingRefundsCount === 1 ? "Refund" : "Refunds"} Required
              </Text>
              <Text style={styles.urgentRefundAlertSub}>
                Please return the reservation fee to the renters to maintain your host standing.
              </Text>
            </View>
          </View>
        )}

        {/* Tab Filters */}
        <View style={styles.tabBar}>
          {(["pending", "approved", "ongoing", "history"] as OperatorTabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = bookings.filter((b) =>
              tab === "history"
                ? b.status === "completed" || b.status === "rejected" || b.status === "cancelled"
                : tab === "pending"
                ? b.status === "pending_payment" ||
                  b.status === "pending_verification" ||
                  b.refund_status === "pending" ||
                  b.payment_status === "refund_pending"
                : tab === "approved"
                ? b.status === "approved" ||
                  b.status === "awaiting_pickup" ||
                  b.status === "pickup_in_progress" ||
                  b.status === "ready_to_start"
                : tab === "ongoing"
                ? b.status === "trip_in_progress" ||
                  b.status === "return_pending" ||
                  b.status === "ongoing"
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
            <Skeleton height={200} borderRadius={18} />
            <Skeleton height={200} borderRadius={18} />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="clipboard-text-clock-outline" size={40} color={Colors.secondary} />
            </View>
            <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "pending"
                ? "You currently have no new customer rental requests awaiting payment verification or refunds."
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
              const statusCfg = getStatusConfig(item);
              const renterName = item.renter
                ? `${item.renter.first_name || ""} ${item.renter.last_name || ""}`.trim()
                : "Customer";
              const vehicleName = item.vehicle?.name || "Vehicle";
              const vehicleImageUrl = resolveVehicleImage(item.vehicle);
              const dateInfo = formatShortDate(item.start_date);

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

                    {/* Middle Info */}
                    <View style={styles.cardCenterInfo}>
                      <TouchableOpacity
                        style={styles.hostRow}
                        onPress={() => item.renter && setSelectedRenter(item.renter)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="person-circle" size={13} color={Colors.primary} />
                        <Text style={styles.hostNameText} numberOfLines={1}>
                          {renterName}
                        </Text>
                        <Ionicons name="information-circle-outline" size={11} color={Colors.secondary} />
                      </TouchableOpacity>

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
                        <Ionicons name={statusCfg.icon} size={11} color={statusCfg.text} />
                        <Text style={[styles.statusPillText, { color: statusCfg.text }]}>
                          {statusCfg.label}
                        </Text>
                      </View>
                      <Image source={{ uri: vehicleImageUrl }} style={styles.vehicleThumbMini} contentFit="cover" transition={200} />
                    </View>
                  </View>

                  {/* Trip Live Metrics Banner for Ongoing & Completed */}
                  {(item.status === "trip_in_progress" || item.status === "return_pending" || item.status === "completed") && (
                    <View style={styles.tripMetricsBanner}>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>START ODOMETER</Text>
                        <Text style={styles.metricVal}>{item.start_mileage ? `${item.start_mileage.toLocaleString()} km` : "N/A"}</Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>START FUEL</Text>
                        <Text style={styles.metricVal}>{item.start_fuel_level !== undefined ? `${item.start_fuel_level}%` : "N/A"}</Text>
                      </View>
                      <View style={styles.metricDivider} />
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>TRIP STARTED</Text>
                        <Text style={styles.metricVal}>{item.actual_start_time ? formatDateTime(item.actual_start_time) : "Active"}</Text>
                      </View>
                    </View>
                  )}

                  {/* Multi-Vehicle Rental & Designated Driver Notice */}
                  {item.is_multi_vehicle_rental && (
                    <View style={styles.multiCarOperatorBox}>
                      <View style={styles.multiCarOperatorHeader}>
                        <Ionicons name="shield-checkmark" size={14} color="#B45309" />
                        <Text style={styles.multiCarOperatorTitle}>Concurrent Multi-Vehicle Rental</Text>
                      </View>
                      <Text style={styles.multiCarOperatorDesc}>
                        Authorized driver designated for this unit:
                      </Text>
                      <View style={styles.secondaryDriverInfoRow}>
                        <Ionicons name="person-outline" size={13} color="#92400E" />
                        <Text style={styles.secondaryDriverInfoText}>
                          {item.secondary_driver_name || "Designated Driver"} ({item.secondary_driver_phone || "No phone"})
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Reference Number / Receipt Box */}
                  {item.payment_reference && !isRefundPending ? (
                    <View style={styles.receiptBox}>
                      <Ionicons name="receipt-outline" size={14} color="#2563EB" />
                      <Text style={styles.receiptBoxLabel}>Payment Ref / Receipt:</Text>
                      <Text style={styles.receiptBoxVal} numberOfLines={1}>
                        {item.payment_reference}
                      </Text>
                    </View>
                  ) : null}

                  {/* Refund Required Box */}
                  {isRefundPending && (
                    <View style={styles.refundRequiredBox}>
                      <View style={styles.refundRequiredHeader}>
                        <Ionicons name="alert-circle" size={15} color="#DC2626" />
                        <Text style={styles.refundRequiredTitle}>
                          Action Required: Refund ₱{Number(item.refund_amount || item.reservation_fee).toLocaleString()}
                        </Text>
                      </View>
                      <Text style={styles.refundRequiredDesc}>
                        This reservation was cancelled/declined. Please return the fee to the renter:
                      </Text>
                      <View style={styles.refundInfoRow}>
                        <Text style={styles.refundInfoLabel}>Renter:</Text>
                        <Text style={styles.refundInfoVal}>
                          {item.renter_refund_account_name || renterName}
                        </Text>
                      </View>
                      <View style={styles.refundInfoRow}>
                        <Text style={styles.refundInfoLabel}>{item.renter_refund_method?.toUpperCase() || "GCASH"}:</Text>
                        <Text style={styles.refundInfoValHighlight}>
                          {item.renter_refund_account_number || item.renter?.phone_number || "N/A"}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Refund Completed Box */}
                  {isRefundCompleted && (
                    <View style={styles.refundCompletedBox}>
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text style={styles.refundCompletedText}>
                        Refund Completed: Ref #{item.refund_reference || "N/A"} (₱{Number(item.refund_amount || item.reservation_fee).toLocaleString()})
                      </Text>
                    </View>
                  )}

                  {/* Extension Request Review Card */}
                  {item.extension_status === "pending" && (
                    <View style={styles.extensionReviewBox}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Ionicons name="time" size={16} color="#D97706" />
                        <Text style={styles.extensionReviewTitle}>Rental Extension Request</Text>
                      </View>
                      <Text style={styles.extensionReviewSub}>
                        Renter requested +{item.extension_days || 1} {(item.extension_days || 1) === 1 ? "day" : "days"} extension until {cleanDate(item.extended_end_date)}.
                      </Text>
                      <View style={styles.extensionInfoRow}>
                        <Text style={styles.extensionInfoLabel}>Extra Fee Settled:</Text>
                        <Text style={styles.extensionInfoVal}>₱{Number(item.extension_fee || 0).toLocaleString()}</Text>
                      </View>
                      <View style={styles.extensionInfoRow}>
                        <Text style={styles.extensionInfoLabel}>Payment Method:</Text>
                        <Text style={styles.extensionInfoVal}>{item.extension_payment_method?.toUpperCase() || "GCASH"}</Text>
                      </View>
                      <View style={styles.extensionInfoRow}>
                        <Text style={styles.extensionInfoLabel}>Receipt Ref #:</Text>
                        <Text style={[styles.extensionInfoVal, { fontFamily: FontFamily.bold, color: Colors.primary }]}>
                          {item.extension_payment_reference || "Cash to Host"}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          style={styles.extensionDeclineBtn}
                          onPress={() => handleRejectExtension(item.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.extensionDeclineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.extensionApproveBtn}
                          onPress={() => handleApproveExtension(item.id)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="checkmark-circle" size={14} color="#065F46" />
                          <Text style={styles.extensionApproveText}>Approve Extension</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Extension Approved Banner */}
                  {item.extension_status === "approved" && (
                    <View style={styles.extensionApprovedBox}>
                      <Ionicons name="checkmark-circle" size={15} color="#059669" />
                      <Text style={styles.extensionApprovedText}>
                        Trip Extended (+{item.extension_days || 1} d) until {cleanDate(item.end_date)} • Extra Fee: ₱{Number(item.extension_fee || 0).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {/* Dual Actions Footer */}
                  <View style={styles.dualActionRow}>
                    {item.renter?.id && (
                      <TouchableOpacity
                        style={styles.outlineActionBtn}
                        onPress={() =>
                          router.push({
                            pathname: `/chat/${item.renter.id}`,
                            params: { name: renterName },
                          } as any)
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.dark} />
                        <Text style={styles.outlineActionText}>Chat</Text>
                      </TouchableOpacity>
                    )}

                    {isRefundPending ? (
                      <TouchableOpacity
                        style={[styles.primaryActionBtn, { backgroundColor: "#DC2626" }]}
                        onPress={() => openRefundModal(item)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="cash-outline" size={15} color={Colors.white} />
                        <Text style={[styles.primaryActionText, { color: Colors.white }]}>Submit Refund Proof</Text>
                      </TouchableOpacity>
                    ) : item.status === "pending_verification" ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        <TouchableOpacity
                          style={styles.dangerActionBtn}
                          onPress={() => handleStatusChange(item.id, "rejected")}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dangerActionText}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => setVerifyModalBooking(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="shield-checkmark" size={14} color={Colors.white} />
                          <Text style={styles.primaryActionText}>Verify & Approve</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (item.status === "approved" || item.status === "awaiting_pickup" || item.status === "pickup_in_progress" || item.status === "ready_to_start") ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        <TouchableOpacity
                          style={styles.dangerActionBtn}
                          onPress={() => handleStatusChange(item.id, "no_show")}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="person-remove-outline" size={13} color={Colors.error} />
                          <Text style={styles.dangerActionText}>No-Show</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => openStartTripModal(item)}
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons name="car-key" size={15} color={Colors.white} />
                          <Text style={styles.primaryActionText}>Start Trip & Inspect</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (item.status === "trip_in_progress" || item.status === "return_pending" || item.status === "ongoing") ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        <TouchableOpacity
                          style={styles.gpsActionBtn}
                          onPress={() =>
                            router.push({
                              pathname: "/live-tracking",
                              params: {
                                bookingId: item.id.toString(),
                                vehicleName: item.vehicle?.name || "Vehicle",
                                renterName: renterName,
                              },
                            } as any)
                          }
                          activeOpacity={0.8}
                        >
                          <Ionicons name="navigate-circle" size={15} color="#2563EB" />
                          <Text style={styles.gpsActionText}>Live GPS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => openReturnTripModal(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="clipboard-outline" size={15} color={Colors.white} />
                          <Text style={styles.primaryActionText}>Return Check</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Start Trip Inspection Modal */}
        <Modal
          visible={!!startTripModalBooking}
          transparent
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => setStartTripModalBooking(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setStartTripModalBooking(null)}
            />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>🚗 Start Trip Handover</Text>
                  <Text style={styles.modalSub}>{startTripModalBooking?.vehicle?.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setStartTripModalBooking(null)}>
                  <Ionicons name="close-circle" size={24} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Info Card */}
                <View style={styles.modalInfoBanner}>
                  <Ionicons name="information-circle" size={18} color="#2563EB" />
                  <Text style={styles.modalInfoBannerText}>
                    Record the vehicle's initial condition to baseline mileage and fuel before releasing the keys.
                  </Text>
                </View>

                {/* Starting Mileage */}
                <Text style={styles.inputLabel}>Starting Odometer Mileage (km) *</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="speedometer-outline" size={18} color={Colors.secondary} />
                  <TextInput
                    style={styles.textInputField}
                    keyboardType="numeric"
                    placeholder="e.g. 24580"
                    placeholderTextColor={Colors.secondary}
                    value={startMileageInput}
                    onChangeText={setStartMileageInput}
                  />
                  <Text style={styles.inputUnit}>km</Text>
                </View>

                {/* Starting Fuel Level Selector */}
                <Text style={styles.inputLabel}>Starting Fuel Level: {startFuelLevelInput}%</Text>
                <View style={styles.fuelOptionsRow}>
                  {[25, 50, 75, 100].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.fuelBtn, startFuelLevelInput === level && styles.fuelBtnActive]}
                      onPress={() => setStartFuelLevelInput(level)}
                    >
                      <Ionicons
                        name="flash"
                        size={12}
                        color={startFuelLevelInput === level ? Colors.white : Colors.secondary}
                      />
                      <Text style={[styles.fuelBtnText, startFuelLevelInput === level && styles.fuelBtnTextActive]}>
                        {level}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Inspection Notes */}
                <Text style={styles.inputLabel}>Handover & Vehicle Condition Notes</Text>
                <TextInput
                  style={[styles.textInputField, styles.textAreaField]}
                  multiline
                  numberOfLines={3}
                  placeholder="Note pre-existing scratches, cleanliness, or accessories handed over..."
                  placeholderTextColor={Colors.secondary}
                  value={startNotesInput}
                  onChangeText={setStartNotesInput}
                />
              </ScrollView>

              <View style={styles.modalFooterActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setStartTripModalBooking(null)}
                >
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmStartBtn}
                  onPress={handleExecuteStartTrip}
                  disabled={submittingStartTrip}
                >
                  <MaterialCommunityIcons name="car-key" size={16} color={Colors.white} />
                  <Text style={styles.confirmStartBtnText}>
                    {submittingStartTrip ? "Starting..." : "Start Trip"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Return Trip Inspection Modal */}
        <Modal
          visible={!!returnTripModalBooking}
          transparent
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => setReturnTripModalBooking(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setReturnTripModalBooking(null)} />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>🔍 Return Inspection</Text>
                  <Text style={styles.modalSub}>{returnTripModalBooking?.vehicle?.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setReturnTripModalBooking(null)}>
                  <Ionicons name="close-circle" size={24} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
                {/* Comparison Card */}
                <View style={styles.comparisonBox}>
                  <View style={styles.comparisonCol}>
                    <Text style={styles.comparisonLabel}>START MILEAGE</Text>
                    <Text style={styles.comparisonVal}>{returnTripModalBooking?.start_mileage?.toLocaleString() ?? "N/A"} km</Text>
                  </View>
                  <View style={styles.comparisonDivider} />
                  <View style={styles.comparisonCol}>
                    <Text style={styles.comparisonLabel}>START FUEL</Text>
                    <Text style={styles.comparisonVal}>{returnTripModalBooking?.start_fuel_level ?? 100}%</Text>
                  </View>
                </View>

                {/* End Mileage */}
                <Text style={styles.inputLabel}>Return Odometer Mileage (km) *</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="speedometer-outline" size={18} color={Colors.secondary} />
                  <TextInput
                    style={styles.textInputField}
                    keyboardType="numeric"
                    placeholder="e.g. 24720"
                    placeholderTextColor={Colors.secondary}
                    value={endMileageInput}
                    onChangeText={setEndMileageInput}
                  />
                  <Text style={styles.inputUnit}>km</Text>
                </View>

                {/* End Fuel Level */}
                <Text style={styles.inputLabel}>Return Fuel Level: {endFuelLevelInput}%</Text>
                <View style={styles.fuelOptionsRow}>
                  {[25, 50, 75, 100].map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.fuelBtn, endFuelLevelInput === level && styles.fuelBtnActive]}
                      onPress={() => setEndFuelLevelInput(level)}
                    >
                      <Ionicons
                        name="flash"
                        size={12}
                        color={endFuelLevelInput === level ? Colors.white : Colors.secondary}
                      />
                      <Text style={[styles.fuelBtnText, endFuelLevelInput === level && styles.fuelBtnTextActive]}>
                        {level}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Additional Charges Section */}
                <Text style={[styles.inputLabel, { marginTop: 14 }]}>Additional Surcharges (if applicable)</Text>
                <View style={styles.chargeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chargeMiniLabel}>Fuel Surcharge (₱)</Text>
                    <TextInput
                      style={styles.miniInput}
                      keyboardType="numeric"
                      value={fuelChargeInput}
                      onChangeText={setFuelChargeInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chargeMiniLabel}>Damage Charge (₱)</Text>
                    <TextInput
                      style={styles.miniInput}
                      keyboardType="numeric"
                      value={damageChargeInput}
                      onChangeText={setDamageChargeInput}
                    />
                  </View>
                </View>

                <View style={styles.chargeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chargeMiniLabel}>Late Return Fee (₱)</Text>
                    <TextInput
                      style={styles.miniInput}
                      keyboardType="numeric"
                      value={lateFeeInput}
                      onChangeText={setLateFeeInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chargeMiniLabel}>Other Charges (₱)</Text>
                    <TextInput
                      style={styles.miniInput}
                      keyboardType="numeric"
                      value={otherChargesInput}
                      onChangeText={setOtherChargesInput}
                    />
                  </View>
                </View>

                {/* End Inspection Notes */}
                <Text style={styles.inputLabel}>Return Inspection Summary & Remarks</Text>
                <TextInput
                  style={[styles.textInputField, styles.textAreaField]}
                  multiline
                  numberOfLines={2}
                  placeholder="Confirmed no damages, accessories returned in good condition..."
                  placeholderTextColor={Colors.secondary}
                  value={endNotesInput}
                  onChangeText={setEndNotesInput}
                />
              </ScrollView>

              <View style={styles.modalFooterActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setReturnTripModalBooking(null)}
                >
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmCompleteBtn}
                  onPress={handleExecuteReturnTrip}
                  disabled={submittingReturnTrip}
                >
                  <Ionicons name="checkmark-done" size={16} color={Colors.white} />
                  <Text style={styles.confirmCompleteBtnText}>
                    {submittingReturnTrip ? "Completing..." : "Complete Trip"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Submit Refund Proof Modal */}
        <Modal
          visible={!!refundModalBooking}
          transparent
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => setRefundModalBooking(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setRefundModalBooking(null)} />
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Process Renter Refund</Text>
                  <Text style={styles.modalSub}>
                    Submit transaction receipt ID for verification
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRefundModalBooking(null)}>
                  <Ionicons name="close-circle" size={24} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Refund Summary Banner */}
                <View style={styles.refundAmountBanner}>
                  <Text style={styles.refundAmountLabel}>AMOUNT TO REFUND</Text>
                  <Text style={styles.refundAmountVal}>
                    ₱{Number(refundModalBooking?.refund_amount || refundModalBooking?.reservation_fee || 500).toLocaleString()}
                  </Text>
                  <Text style={styles.refundAmountSub}>
                    Recipient: {refundModalBooking?.renter_refund_account_name || (refundModalBooking?.renter ? `${refundModalBooking.renter.first_name || ""} ${refundModalBooking.renter.last_name || ""}`.trim() : "Renter")}
                  </Text>
                  <Text style={styles.refundAccountHighlight}>
                    {refundModalBooking?.renter_refund_method?.toUpperCase() || "GCASH"}: {refundModalBooking?.renter_refund_account_number || refundModalBooking?.renter?.phone_number || "N/A"}
                  </Text>
                </View>

                {/* Refund Reference Input */}
                <Text style={styles.inputLabel}>Transaction / Reference Number *</Text>
                <View style={[styles.inputBox, refundError ? styles.inputBoxError : null]}>
                  <Ionicons name="receipt-outline" size={18} color={refundError ? "#DC2626" : Colors.secondary} />
                  <TextInput
                    style={styles.textInputField}
                    placeholder="e.g. 100293848123"
                    placeholderTextColor={Colors.secondary}
                    value={refundRefInput}
                    onChangeText={(val) => {
                      setRefundRefInput(val);
                      if (refundError) setRefundError("");
                    }}
                  />
                </View>
                {refundError ? (
                  <View style={styles.inlineErrorRow}>
                    <Ionicons name="alert-circle" size={14} color="#DC2626" />
                    <Text style={styles.inlineErrorText}>{refundError}</Text>
                  </View>
                ) : null}

                {/* Notes Input */}
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Optional Notes / Remarks</Text>
                <TextInput
                  style={[styles.textInputField, styles.textAreaField]}
                  multiline
                  numberOfLines={2}
                  placeholder="e.g. Sent via GCash Express Send..."
                  placeholderTextColor={Colors.secondary}
                  value={refundNotesInput}
                  onChangeText={setRefundNotesInput}
                />
              </ScrollView>

              <View style={styles.modalFooterActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setRefundModalBooking(null)}
                >
                  <Text style={styles.cancelModalBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmCompleteBtn, { backgroundColor: "#DC2626" }]}
                  onPress={handleExecuteProcessRefund}
                  disabled={submittingRefund}
                >
                  <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                  <Text style={styles.confirmCompleteBtnText}>
                    {submittingRefund ? "Submitting..." : "Confirm Refund"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* View Renter Profile Modal */}
        <Modal
          visible={!!selectedRenter}
          transparent
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setSelectedRenter(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedRenter(null)} />
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

        {/* Dedicated Professional & Minimal Verify & Approve Bottom Sheet */}
        <Modal
          visible={!!verifyModalBooking}
          transparent
          animationType="slide"
          statusBarTranslucent={true}
          onRequestClose={() => setVerifyModalBooking(null)}
        >
          <View style={styles.verifyModalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setVerifyModalBooking(null)} />
            <View style={styles.verifyModalCard}>
              {/* Bottom Sheet Top Pill Handle */}
              <View style={styles.verifySheetHandle} />

              {/* Top Drama Glow Icon */}
              <View style={styles.verifyGlowCircle}>
                <Ionicons name="shield-checkmark" size={32} color="#0F172A" />
              </View>

              <Text style={styles.verifyModalHeading}>Verify & Approve Reservation</Text>
              <Text style={styles.verifyModalSubheading}>
                Review renter and reservation credentials before confirming handover schedule
              </Text>

              {/* Renter & Vehicle Summary Card */}
              <View style={styles.verifySummaryCard}>
                <View style={styles.verifyRow}>
                  <Text style={styles.verifyLabel}>Renter</Text>
                  <Text style={styles.verifyValue} numberOfLines={1}>
                    {verifyModalBooking?.renter ? `${verifyModalBooking.renter.first_name || ""} ${verifyModalBooking.renter.last_name || ""}`.trim() : "Verified Renter"}
                  </Text>
                </View>

                <View style={styles.verifyDivider} />

                <View style={styles.verifyRow}>
                  <Text style={styles.verifyLabel}>Vehicle</Text>
                  <Text style={styles.verifyValue} numberOfLines={1}>
                    {verifyModalBooking?.vehicle?.name || "Vehicle"}
                  </Text>
                </View>

                <View style={styles.verifyDivider} />

                <View style={styles.verifyRow}>
                  <Text style={styles.verifyLabel}>Rental Schedule</Text>
                  <Text style={styles.verifyValue}>
                    {cleanDate(verifyModalBooking?.start_date)} → {cleanDate(verifyModalBooking?.end_date)} ({verifyModalBooking?.total_days} d)
                  </Text>
                </View>

                {verifyModalBooking?.payment_reference && (
                  <>
                    <View style={styles.verifyDivider} />
                    <View style={styles.verifyRow}>
                      <Text style={styles.verifyLabel}>Payment Ref / Receipt</Text>
                      <Text style={[styles.verifyValue, styles.verifyPaymentRef]}>
                        #{verifyModalBooking.payment_reference}
                      </Text>
                    </View>
                  </>
                )}

                <View style={styles.verifyDivider} />

                <View style={styles.verifyRow}>
                  <Text style={styles.verifyLabel}>Reservation Fee Received</Text>
                  <Text style={styles.verifyPriceHighlight}>
                    ₱{Number(verifyModalBooking?.reservation_fee || 500).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Operational Guarantee Notice */}
              <View style={styles.verifyNoticeBox}>
                <Ionicons name="lock-closed" size={14} color="#64748B" />
                <Text style={styles.verifyNoticeText}>
                  Approving will secure this vehicle in your fleet calendar and issue a pickup confirmation pass to the renter.
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.verifyActionsRow}>
                <TouchableOpacity
                  style={[styles.verifyCancelBtn, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }]}
                  onPress={() => {
                    const rId = verifyModalBooking?.renter_id;
                    const rName = verifyModalBooking?.renter
                      ? `${verifyModalBooking.renter.first_name || ""} ${verifyModalBooking.renter.last_name || ""}`.trim()
                      : "Renter";
                    setVerifyModalBooking(null);
                    if (rId) {
                      router.push({ pathname: `/chat/${rId}`, params: { name: rName } } as any);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color="#475569" />
                  <Text style={styles.verifyCancelBtnText}>Chat Renter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.verifyConfirmBtn}
                  onPress={handleExecuteVerifyApprove}
                  disabled={submittingVerifyApprove}
                  activeOpacity={0.88}
                >
                  <Ionicons name="checkmark-circle" size={17} color={Colors.white} />
                  <Text style={styles.verifyConfirmBtnText}>
                    {submittingVerifyApprove ? "Confirming..." : "Confirm & Approve"}
                  </Text>
                </TouchableOpacity>
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  header: {
    marginBottom: Spacing.md,
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.inputBackground,
    borderRadius: 14,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  tabItemActive: {
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabItemText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.secondary,
  },
  tabItemTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  list: {
    paddingBottom: 80,
    gap: 12,
  },
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
  gpsActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  gpsActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#2563EB",
  },
  timelineLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: "#64748B",
    letterSpacing: 0.5,
  },
  timelineDate: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
    marginTop: 1,
  },
  receiptBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  receiptBoxLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#1E40AF",
  },
  receiptBoxVal: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: "#1E40AF",
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chatBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  actionBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  declineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  declineBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.error,
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  approveBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  startBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#10B981",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  completeBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: Platform.OS === "ios" ? 38 : 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 24,
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
  tripMetricsBanner: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
    alignItems: "center",
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: Colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricVal: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#CBD5E1",
  },
  modalSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  modalInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 10,
    borderRadius: 12,
    marginVertical: 12,
  },
  modalInfoBannerText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#1E40AF",
    lineHeight: 16,
  },
  comparisonBox: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 12,
    alignItems: "center",
  },
  comparisonCol: {
    flex: 1,
    alignItems: "center",
  },
  comparisonLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  comparisonVal: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
    marginTop: 3,
  },
  comparisonDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#CBD5E1",
  },
  inputLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
    marginTop: 10,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  textInputField: {
    flex: 1,
    marginLeft: 8,
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },
  inputUnit: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.secondary,
  },
  textAreaField: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 10,
    height: 70,
    textAlignVertical: "top",
    marginLeft: 0,
  },
  fuelOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  fuelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 8,
  },
  fuelBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  fuelBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  fuelBtnTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.white,
  },
  chargeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  chargeMiniLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginBottom: 4,
  },
  miniInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  modalFooterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelModalBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.secondary,
  },
  confirmStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmStartBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
  },
  confirmCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmCompleteBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
  },
  trackGpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  trackGpsBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#2563EB",
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
  multiCarOperatorBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  multiCarOperatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  multiCarOperatorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: "#92400E",
  },
  multiCarOperatorDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#78350F",
    lineHeight: 15,
  },
  secondaryDriverInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  secondaryDriverInfoText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
    color: "#92400E",
  },
  urgentRefundAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#F87171",
    padding: 12,
    borderRadius: 14,
    marginBottom: Spacing.md,
  },
  urgentRefundAlertTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#991B1B",
  },
  urgentRefundAlertSub: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#B91C1C",
    marginTop: 2,
    lineHeight: 15,
  },
  refundRequiredBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  refundRequiredHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  refundRequiredTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#DC2626",
  },
  refundRequiredDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#7F1D1D",
    marginBottom: 4,
  },
  refundInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  refundInfoLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#991B1B",
  },
  refundInfoVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
    color: Colors.dark,
  },
  refundInfoValHighlight: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#DC2626",
  },
  refundCompletedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  refundCompletedText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#065F46",
    flex: 1,
  },
  refundAmountBanner: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  refundAmountLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#991B1B",
    letterSpacing: 0.5,
  },
  refundAmountVal: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: "#DC2626",
    marginVertical: 4,
  },
  refundAmountSub: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  refundAccountHighlight: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#B91C1C",
    marginTop: 2,
  },
  inputBoxError: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  inlineErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  inlineErrorText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#DC2626",
  },
  extensionReviewBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  extensionReviewTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#92400E",
  },
  extensionReviewSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#78350F",
    marginBottom: 8,
  },
  extensionInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  extensionInfoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#92400E",
  },
  extensionInfoVal: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    color: Colors.dark,
  },
  extensionDeclineBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  extensionDeclineText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: "#DC2626",
  },
  extensionApproveBtn: {
    flex: 1.6,
    flexDirection: "row",
    gap: 5,
    backgroundColor: "#A7F3D0",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  extensionApproveText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: "#065F46",
  },
  extensionApprovedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  extensionApprovedText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#065F46",
    flex: 1,
  },
  /* Dedicated Verify & Approve Bottom Sheet Styles */
  verifyModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    justifyContent: "flex-end",
  },
  verifyModalCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 38 : 26,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  verifySheetHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#CBD5E1",
    marginBottom: 16,
  },
  verifyGlowCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  verifyModalHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 17.5,
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  verifyModalSubheading: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  verifySummaryCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  verifyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  verifyLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#64748B",
  },
  verifyValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    color: "#0F172A",
    maxWidth: "58%",
    textAlign: "right",
  },
  verifyDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 6,
  },
  verifyPaymentRef: {
    fontFamily: FontFamily.bold,
    color: "#2563EB",
  },
  verifyPriceHighlight: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: "#059669",
  },
  verifyNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 18,
    width: "100%",
  },
  verifyNoticeText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#475569",
    flex: 1,
    lineHeight: 15,
  },
  verifyActionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  verifyCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyCancelBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: "#64748B",
  },
  verifyConfirmBtn: {
    flex: 1.8,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyConfirmBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.white,
    letterSpacing: -0.2,
  },
  pendingNoticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 6,
  },
  pendingNoticeSub: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
});

