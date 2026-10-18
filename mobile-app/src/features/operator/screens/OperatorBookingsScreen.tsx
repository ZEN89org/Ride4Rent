import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import ListPagination from "@/components/common/ListPagination";
import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useCall } from "@/context/CallContext";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import OperatorShell from "@/features/operator/components/navigation/OperatorShell";
import { resolveImageUrl } from "@/services/api";
import {
  approveBookingExtension,
  Booking,
  completeTrip,
  confirmOperatorPayment,
  confirmExtensionPayment,
  deleteBooking,
  getMyBookings,
  processBookingRefund,
  rejectBookingExtension,
  startTrip,
  updateBookingStatus,
} from "@/services/bookingService";

type OperatorTabType = "all" | "pending" | "approved" | "ongoing" | "history";

const cleanDate = (d: string | null | undefined): string => {
  if (!d) return "";
  return String(d).split("T")[0];
};

const formatShortDate = (
  d: string | null | undefined,
): { month: string; day: string } => {
  if (!d) return { month: "---", day: "--" };
  const raw = String(d).split("T")[0];
  const parts = raw.split("-");
  if (parts.length >= 3) {
    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
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
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

const getEffectiveReturnDate = (item: Booking): string => {
  if (item.extension_status === "approved") {
    return cleanDate(
      item.extension_end_date || item.extended_end_date || item.end_date,
    );
  }
  return cleanDate(item.end_date);
};

const formatPrettyDate = (d: string | null | undefined): string => {
  if (!d) return "";
  const raw = String(d).split("T")[0];
  const parts = raw.split("-");
  if (parts.length >= 3) {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const m = months[monthIndex] || parts[1];
    return `${m} ${parseInt(parts[2], 10)}`;
  }
  return d;
};

const formatPrettyTripDates = (
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined,
): string => {
  if (!startDateStr) return "Flexible dates";
  const start = formatPrettyDate(startDateStr);
  const end = formatPrettyDate(endDateStr);
  if (!end || start === end) return start;
  return `${start} – ${end}`;
};

const parseDateString = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  const raw = String(dateStr).split("T")[0];
  const parts = raw.split("-");
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEffectiveTripDays = (b: Booking | null | undefined): number => {
  if (!b) return 1;
  if (b.extension_status === "approved" && b.total_days && b.total_days > 0) {
    return b.total_days;
  }
  if (b.total_days && b.total_days > 0) {
    return b.total_days;
  }
  const start = b.start_date ? parseDateString(b.start_date) : null;
  const effectiveEndStr = getEffectiveReturnDate(b);
  const end = effectiveEndStr ? parseDateString(effectiveEndStr) : null;
  if (!start || !end) return 1;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};

const formatFullDate = (dStr: string | null | undefined): string => {
  if (!dStr) return "Not specified";
  const raw = cleanDate(dStr);
  const parts = raw.split("-");
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const dayName = days[d.getDay()] || "";
    const monthName = months[month] || "";
    return `${dayName}, ${monthName} ${day}, ${year}`;
  }
  return raw;
};

const getReturnStatus = (returnDateStr: string | null | undefined) => {
  if (!returnDateStr) {
    return {
      label: "No Date",
      badgeText: "NO DATE",
      color: Colors.secondary,
      borderColor: Colors.border,
      bannerBg: "#F8FAFC",
      badgeBg: "#F1F5F9",
      iconCircleBg: "#E2E8F0",
      icon: "calendar-outline" as const,
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      isOnSchedule: true,
      diffDays: 0,
      formattedDate: "No return date",
    };
  }

  const raw = cleanDate(returnDateStr);
  const parts = raw.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const returnDate = new Date(year, month, day);
  returnDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = returnDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = formatFullDate(returnDateStr);

  if (diffDays < 0) {
    const overdueCount = Math.abs(diffDays);
    return {
      label: `Overdue by ${overdueCount} ${overdueCount === 1 ? "day" : "days"}`,
      badgeText: `OVERDUE (${overdueCount}d)`,
      color: "#DC2626",
      borderColor: "#FCA5A5",
      bannerBg: "#FEF2F2",
      badgeBg: "#FEE2E2",
      iconCircleBg: "#FEE2E2",
      icon: "alert-circle" as const,
      isOverdue: true,
      isToday: false,
      isTomorrow: false,
      isOnSchedule: false,
      diffDays,
      formattedDate,
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due Today",
      badgeText: "DUE TODAY",
      color: "#D97706",
      borderColor: "#FCD34D",
      bannerBg: "#FFFBEB",
      badgeBg: "#FEF3C7",
      iconCircleBg: "#FEF3C7",
      icon: "time" as const,
      isOverdue: false,
      isToday: true,
      isTomorrow: false,
      isOnSchedule: false,
      diffDays,
      formattedDate,
    };
  }

  if (diffDays === 1) {
    return {
      label: "Due Tomorrow",
      badgeText: "TOMORROW",
      color: "#2563EB",
      borderColor: "#93C5FD",
      bannerBg: "#EFF6FF",
      badgeBg: "#DBEAFE",
      iconCircleBg: "#DBEAFE",
      icon: "calendar" as const,
      isOverdue: false,
      isToday: false,
      isTomorrow: true,
      isOnSchedule: true,
      diffDays,
      formattedDate,
    };
  }

  return {
    label: `${diffDays} days remaining`,
    badgeText: `${diffDays} DAYS LEFT`,
    color: "#059669",
    borderColor: "#A7F3D0",
    bannerBg: "#F0FDF4",
    badgeBg: "#DCFCE7",
    iconCircleBg: "#DCFCE7",
    icon: "checkmark-circle-outline" as const,
    isOverdue: false,
    isToday: false,
    isTomorrow: false,
    isOnSchedule: true,
    diffDays,
    formattedDate,
  };
};

const DEFAULT_CAR_FALLBACK =
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60";

const resolveStorageUrl = (path?: string | null): string | null => {
  return resolveImageUrl(path);
};

const resolveVehicleImage = (vehicle: any): string => {
  if (!vehicle) return DEFAULT_CAR_FALLBACK;
  if (vehicle.image_url)
    return resolveStorageUrl(vehicle.image_url) || DEFAULT_CAR_FALLBACK;
  if (vehicle.cover_photo)
    return resolveStorageUrl(vehicle.cover_photo) || DEFAULT_CAR_FALLBACK;
  if (Array.isArray(vehicle.images) && vehicle.images.length > 0) {
    const first = vehicle.images[0].image_url || vehicle.images[0].image_path;
    return resolveStorageUrl(first) || DEFAULT_CAR_FALLBACK;
  }
  return DEFAULT_CAR_FALLBACK;
};

export default function OperatorBookingsScreen() {
  const { isOperatorPending } = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const { startCall } = useCall();
  const [activeTab, setActiveTab] = useState<OperatorTabType>("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const operatorFlatListRef = React.useRef<FlatList>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Renter Profile Modal
  const [selectedRenter, setSelectedRenter] = useState<any | null>(null);

  // Dedicated Verify & Approve Booking Modal State
  const [verifyModalBooking, setVerifyModalBooking] = useState<Booking | null>(
    null,
  );
  const [submittingVerifyApprove, setSubmittingVerifyApprove] =
    useState<boolean>(false);
  const [licensePreviewUri, setLicensePreviewUri] = useState<string | null>(
    null,
  );

  // Process Refund Modal State
  const [refundModalBooking, setRefundModalBooking] = useState<Booking | null>(
    null,
  );
  const [refundRefInput, setRefundRefInput] = useState<string>("");
  const [refundNotesInput, setRefundNotesInput] = useState<string>("");
  const [refundError, setRefundError] = useState<string>("");
  const [submittingRefund, setSubmittingRefund] = useState<boolean>(false);

  // Start Trip Inspection Modal State
  const [startTripModalBooking, setStartTripModalBooking] =
    useState<Booking | null>(null);
  const [startMileageInput, setStartMileageInput] = useState<string>("");
  const [startFuelLevelInput, setStartFuelLevelInput] = useState<number>(100);
  const [startNotesInput, setStartNotesInput] = useState<string>("");
  const [startTripPhotos, setStartTripPhotos] = useState<string[]>([]);
  const [submittingStartTrip, setSubmittingStartTrip] =
    useState<boolean>(false);

  // Return Trip Inspection Modal State
  const [returnTripModalBooking, setReturnTripModalBooking] =
    useState<Booking | null>(null);
  const [endMileageInput, setEndMileageInput] = useState<string>("");
  const [endFuelLevelInput, setEndFuelLevelInput] = useState<number>(100);
  const [fuelChargeInput, setFuelChargeInput] = useState<string>("0");
  const [damageChargeInput, setDamageChargeInput] = useState<string>("0");
  const [lateFeeInput, setLateFeeInput] = useState<string>("0");
  const [otherChargesInput, setOtherChargesInput] = useState<string>("0");
  const [endNotesInput, setEndNotesInput] = useState<string>("");
  const [returnTripPhotos, setReturnTripPhotos] = useState<string[]>([]);
  const [submittingReturnTrip, setSubmittingReturnTrip] =
    useState<boolean>(false);

  // Dedicated Trip Extension Review Modal State
  const [reviewExtensionBooking, setReviewExtensionBooking] =
    useState<Booking | null>(null);
  const [submittingExtensionAction, setSubmittingExtensionAction] =
    useState<boolean>(false);

  // Progressive Disclosure: Track expanded cards
  const [expandedCardIds, setExpandedCardIds] = useState<
    Record<number, boolean>
  >({});

  const toggleExpandCard = (bookingId: number) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [bookingId]: !prev[bookingId],
    }));
  };

  const loadOperatorBookings = React.useCallback(async (silent = false) => {
    try {
      const data = await getMyBookings();
      setBookings(data);
    } catch (e) {
      if (!silent) console.error("Failed to load operator bookings", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Auto-refresh when operator returns to screen
  useFocusEffect(
    React.useCallback(() => {
      loadOperatorBookings(true);
    }, [loadOperatorBookings]),
  );

  // Polling every 8s for live fleet state updates
  useEffect(() => {
    const poller = setInterval(() => {
      loadOperatorBookings(true);
    }, 8000);
    return () => clearInterval(poller);
  }, [loadOperatorBookings]);

  const handleStatusChange = (
    bookingId: number,
    newStatus:
      | "approved"
      | "rejected"
      | "awaiting_pickup"
      | "pickup_in_progress"
      | "return_pending"
      | "no_show",
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
          style:
            newStatus === "rejected" || newStatus === "no_show"
              ? "destructive"
              : "default",
          onPress: async () => {
            try {
              await updateBookingStatus(bookingId, newStatus);
              showSuccess(
                "Status Updated",
                `Reservation marked as ${newStatus}.`,
              );
              loadOperatorBookings();
            } catch (e) {
              showError("Error", "Could not update booking status.");
            }
          },
        },
      ],
      "confirm",
    );
  };

  const handleDeleteHistoryBooking = (booking: Booking) => {
    if (
      booking.refund_status === "pending" ||
      booking.payment_status === "refund_pending"
    ) {
      showError(
        "Action Prohibited",
        "Bookings with a pending refund cannot be removed.",
      );
      return;
    }
    const vehicleTitle = booking.vehicle?.name || "this vehicle";
    showModal(
      "Delete History Record",
      `Are you sure you want to permanently delete the history record for #${booking.id} (${vehicleTitle})? This cannot be undone.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBooking(booking.id);
              showSuccess(
                "Booking Deleted",
                `Booking #${booking.id} removed from history.`,
              );
              setBookings((prev) => prev.filter((b) => b.id !== booking.id));
            } catch (e: any) {
              showError(
                "Delete Error",
                e.response?.data?.message || "Failed to delete booking.",
              );
            }
          },
        },
      ],
      "confirm",
    );
  };

  const handleExecuteVerifyApprove = async () => {
    if (!verifyModalBooking) return;
    try {
      setSubmittingVerifyApprove(true);
      await confirmOperatorPayment(verifyModalBooking.id, {
        payment_method: verifyModalBooking.payment_method || "cash",
      });
      showSuccess(
        "Payment Confirmed & Approved",
        `Booking #${verifyModalBooking.id} is confirmed. Renter has been notified.`,
      );
      setVerifyModalBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      showError(
        "Approval Failed",
        e.response?.data?.message || "Could not approve this booking.",
      );
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
      setRefundError(
        "Please enter the refund reference number or transaction receipt ID.",
      );
      return;
    }
    setRefundError("");
    try {
      setSubmittingRefund(true);
      await processBookingRefund(refundModalBooking.id, {
        refund_reference: refundRefInput.trim(),
        refund_notes: refundNotesInput.trim() || undefined,
      });

      showSuccess(
        "Refund Logged",
        "Refund reference recorded and notification sent to the renter.",
      );
      setRefundModalBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      setRefundError(
        e.response?.data?.message || "Could not process the refund.",
      );
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleApproveExtension = (bookingId: number) => {
    showModal(
      "Agree to Extension Schedule",
      "Agree to extend the rental by the requested days? Once agreed, the renter will be prompted to settle the extension payment via GCash.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Agree & Request Payment",
          style: "default",
          onPress: async () => {
            try {
              await approveBookingExtension(bookingId);
              showSuccess(
                "Extension Schedule Agreed",
                "Renter notified to settle the extension fee.",
              );
              loadOperatorBookings();
            } catch (e: any) {
              showError(
                "Error",
                e.response?.data?.message || "Could not agree to extension.",
              );
            }
          },
        },
      ],
      "confirm",
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
              showSuccess(
                "Extension Declined",
                "Rental extension request was rejected.",
              );
              loadOperatorBookings();
            } catch (e: any) {
              showError(
                "Error",
                e.response?.data?.message || "Could not reject extension.",
              );
            }
          },
        },
      ],
      "confirm",
    );
  };

  const handleConfirmApproveExtensionModal = async () => {
    if (!reviewExtensionBooking) return;
    try {
      setSubmittingExtensionAction(true);
      await approveBookingExtension(reviewExtensionBooking.id);
      showSuccess(
        "Extension Schedule Agreed",
        "Renter has been notified to settle the extension fee via GCash.",
      );
      setReviewExtensionBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      showError(
        "Approval Error",
        e.response?.data?.message || "Could not agree to extension.",
      );
    } finally {
      setSubmittingExtensionAction(false);
    }
  };

  const handleConfirmRejectExtensionModal = async () => {
    if (!reviewExtensionBooking) return;
    try {
      setSubmittingExtensionAction(true);
      await rejectBookingExtension(reviewExtensionBooking.id);
      showSuccess(
        "Extension Declined",
        "Rental extension request was declined.",
      );
      setReviewExtensionBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      showError(
        "Error",
        e.response?.data?.message || "Could not decline extension.",
      );
    } finally {
      setSubmittingExtensionAction(false);
    }
  };

  const pickStartPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((a) => a.uri).filter(Boolean);
        setStartTripPhotos((prev) => [...prev, ...uris].slice(0, 6));
      }
    } catch {
      showError("Photo Error", "Could not select photos from gallery.");
    }
  };

  const removeStartPhoto = (index: number) => {
    setStartTripPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const pickReturnPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map((a) => a.uri).filter(Boolean);
        setReturnTripPhotos((prev) => [...prev, ...uris].slice(0, 6));
      }
    } catch {
      showError("Photo Error", "Could not select photos from gallery.");
    }
  };

  const removeReturnPhoto = (index: number) => {
    setReturnTripPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const openStartTripModal = (booking: Booking) => {
    setStartTripModalBooking(booking);
    setStartMileageInput(
      booking.vehicle?.mileage ? String(booking.vehicle.mileage) : "25000",
    );
    setStartFuelLevelInput(100);
    setStartNotesInput("");
    setStartTripPhotos([]);
  };

  const handleExecuteStartTrip = async () => {
    if (!startTripModalBooking) return;
    const mileageNum = parseInt(startMileageInput, 10);
    if (isNaN(mileageNum) || mileageNum < 0) {
      showError(
        "Validation Error",
        "Please enter a valid starting odometer mileage in km.",
      );
      return;
    }

    try {
      setSubmittingStartTrip(true);
      if (startTripPhotos.length > 0) {
        const formData = new FormData();
        formData.append("start_mileage", String(mileageNum));
        formData.append("start_fuel_level", String(startFuelLevelInput));
        if (startNotesInput.trim()) {
          formData.append("start_inspection_notes", startNotesInput.trim());
        }
        startTripPhotos.forEach((uri, idx) => {
          formData.append("start_inspection_photos[]", {
            uri,
            name: `handover_${idx}.jpg`,
            type: "image/jpeg",
          } as any);
        });
        await startTrip(startTripModalBooking.id, formData);
      } else {
        await startTrip(startTripModalBooking.id, {
          start_mileage: mileageNum,
          start_fuel_level: startFuelLevelInput,
          start_inspection_notes: startNotesInput.trim() || undefined,
        });
      }

      showSuccess(
        "Trip Started!",
        `Inspection recorded with ${startTripPhotos.length} photo(s). Live GPS & tracker active.`,
      );
      setStartTripModalBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      showError(
        "Trip Start Failed",
        e.response?.data?.message || "Could not start the trip.",
      );
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

    // Pre-calculate suggested late fee if the vehicle is overdue
    const returnDateStr = getEffectiveReturnDate(booking);
    const returnStatus = getReturnStatus(returnDateStr);
    if (returnStatus.isOverdue) {
      const daysOverdue = Math.abs(returnStatus.diffDays);
      const suggestedLateFee = daysOverdue * (booking.daily_rate || 500);
      setLateFeeInput(String(suggestedLateFee));
    } else {
      setLateFeeInput("0");
    }

    setOtherChargesInput("0");
    setEndNotesInput("");
    setReturnTripPhotos([]);
  };

  const handleExecuteReturnTrip = async () => {
    if (!returnTripModalBooking) return;
    const endMileageNum = parseInt(endMileageInput, 10);
    if (isNaN(endMileageNum) || endMileageNum < 0) {
      showError(
        "Validation Error",
        "Please enter a valid return odometer mileage.",
      );
      return;
    }

    const startMileage = returnTripModalBooking.start_mileage ?? 0;
    if (endMileageNum < startMileage) {
      showError(
        "Mileage Mismatch",
        `End mileage (${endMileageNum} km) cannot be lower than start mileage (${startMileage} km).`,
      );
      return;
    }

    try {
      setSubmittingReturnTrip(true);
      const fuelVal = parseFloat(fuelChargeInput) || 0;
      const damageVal = parseFloat(damageChargeInput) || 0;
      const lateVal = parseFloat(lateFeeInput) || 0;
      const otherVal = parseFloat(otherChargesInput) || 0;

      if (returnTripPhotos.length > 0) {
        const formData = new FormData();
        formData.append("end_mileage", String(endMileageNum));
        formData.append("end_fuel_level", String(endFuelLevelInput));
        formData.append("fuel_charge", String(fuelVal));
        formData.append("damage_charge", String(damageVal));
        formData.append("late_fee", String(lateVal));
        formData.append("other_charges", String(otherVal));
        if (endNotesInput.trim()) {
          formData.append("end_inspection_notes", endNotesInput.trim());
        }
        returnTripPhotos.forEach((uri, idx) => {
          formData.append("end_inspection_photos[]", {
            uri,
            name: `return_${idx}.jpg`,
            type: "image/jpeg",
          } as any);
        });
        await completeTrip(returnTripModalBooking.id, formData);
      } else {
        await completeTrip(returnTripModalBooking.id, {
          end_mileage: endMileageNum,
          end_fuel_level: endFuelLevelInput,
          fuel_charge: fuelVal,
          damage_charge: damageVal,
          late_fee: lateVal,
          other_charges: otherVal,
          end_inspection_notes: endNotesInput.trim() || undefined,
        });
      }

      showSuccess(
        "Trip Completed",
        `Return inspection finalized with ${returnTripPhotos.length} photo(s). Rental closed.`,
      );
      setReturnTripModalBooking(null);
      loadOperatorBookings();
    } catch (e: any) {
      showError(
        "Completion Failed",
        e.response?.data?.message || "Could not complete the trip inspection.",
      );
    } finally {
      setSubmittingReturnTrip(false);
    }
  };

  const pendingRefundsCount = bookings.filter(
    (b) =>
      b.refund_status === "pending" || b.payment_status === "refund_pending",
  ).length;

  const ongoingReturnStats = React.useMemo(() => {
    const ongoingList = bookings.filter(
      (b) =>
        b.status === "trip_in_progress" ||
        b.status === "return_pending" ||
        b.status === "ongoing",
    );

    let overdue = 0;
    let dueToday = 0;
    let dueTomorrow = 0;
    let dueLater = 0;

    for (const b of ongoingList) {
      const returnDate = getEffectiveReturnDate(b);
      const status = getReturnStatus(returnDate);
      if (status.isOverdue) {
        overdue++;
      } else if (status.isToday) {
        dueToday++;
      } else if (status.isTomorrow) {
        dueTomorrow++;
      } else {
        dueLater++;
      }
    }

    return {
      total: ongoingList.length,
      overdue,
      dueToday,
      dueTomorrow,
      dueLater,
    };
  }, [bookings]);

  const filteredBookings = bookings
    .filter((b) => {
      if (activeTab === "all") {
        return true;
      }
      if (activeTab === "history") {
        return (
          b.status === "completed" ||
          b.status === "rejected" ||
          b.status === "cancelled" ||
          b.status === "no_show"
        );
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
        return (
          b.status === "trip_in_progress" ||
          b.status === "return_pending" ||
          b.status === "ongoing"
        );
      }
      return b.status === activeTab;
    })
    .sort((a, b) => {
      if (activeTab === "ongoing") {
        const dateA = getEffectiveReturnDate(a);
        const dateB = getEffectiveReturnDate(b);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      }
      return b.id - a.id;
    });

  const totalBookingsCount = filteredBookings.length;
  const isPaginating = activeTab === "all" || totalBookingsCount > 15;
  const paginatedBookings = isPaginating
    ? filteredBookings.slice((currentPage - 1) * 15, currentPage * 15)
    : filteredBookings;

  const getStatusConfig = (item: Booking) => {
    if (
      item.refund_status === "pending" ||
      item.payment_status === "refund_pending"
    ) {
      return {
        label: "Refund Required",
        bg: "#FDF2F2",
        text: "#991B1B",
        border: "#FEE2E2",
        icon: "alert-circle" as const,
      };
    }
    if (
      item.refund_status === "refunded" ||
      item.payment_status === "refunded"
    ) {
      return {
        label: "Refunded",
        bg: "#FFF6DA",
        text: "#92400E",
        border: "#FDE68A",
        icon: "checkmark-circle" as const,
      };
    }
    switch (item.status) {
      case "pending_payment":
        return {
          label: "Awaiting Renter Fee",
          bg: "#FFFBEB",
          text: "#B45309",
          border: "#FDE68A",
          icon: "time-outline" as const,
        };
      case "pending_verification":
        return {
          label: "Verify Payment",
          bg: "#FFF9E6",
          text: Colors.dark,
          border: Colors.primary,
          icon: "shield-checkmark-outline" as const,
        };
      case "approved":
      case "awaiting_pickup":
        return {
          label: "Awaiting Pickup",
          bg: "#FFF6DA",
          text: "#92400E",
          border: "#FDE68A",
          icon: "checkmark-circle" as const,
        };
      case "pickup_in_progress":
        return {
          label: "Pickup In Progress",
          bg: "#FEF3C7",
          text: "#B45309",
          border: "#FDE68A",
          icon: "walk" as const,
        };
      case "ready_to_start":
        return {
          label: "Ready to Start",
          bg: "#1A1A1A",
          text: Colors.primary,
          border: "#1A1A1A",
          icon: "key" as const,
        };
      case "trip_in_progress":
      case "ongoing":
        return {
          label: "Trip In Progress",
          bg: "#1A1A1A",
          text: Colors.primary,
          border: "#1A1A1A",
          icon: "car" as const,
        };
      case "return_pending":
        return {
          label: "Return Pending",
          bg: "#FFF6DA",
          text: "#92400E",
          border: "#FDE68A",
          icon: "hourglass-outline" as const,
        };
      case "completed":
        return {
          label: "Completed",
          bg: "#F4F4F5",
          text: "#52525B",
          border: "#E4E4E7",
          icon: "flag" as const,
        };
      case "rejected":
        return {
          label: "Declined",
          bg: "#FDF2F2",
          text: "#991B1B",
          border: "#FEE2E2",
          icon: "close-circle" as const,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bg: "#FDF2F2",
          text: "#991B1B",
          border: "#FEE2E2",
          icon: "close-circle" as const,
        };
      case "no_show":
        return {
          label: "No-Show",
          bg: "#F4F4F5",
          text: "#52525B",
          border: "#E4E4E7",
          icon: "person-remove-outline" as const,
        };
      default:
        return {
          label: String((item as any)?.status || "").toUpperCase(),
          bg: Colors.inputBackground,
          text: Colors.dark,
          border: Colors.border,
          icon: "information-circle" as const,
        };
    }
  };

  return (
    <OperatorShell activeRoute="bookings">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Rental Fleet Operations</Text>
          <Text style={styles.subtitle}>
            Reservations, payment verification & handovers
          </Text>
        </View>

        {/* Under Review Preview Banner */}
        {isOperatorPending && (
          <View style={styles.pendingNoticeBanner}>
            <Ionicons name="time" size={18} color="#D97706" />
            <Text style={styles.pendingNoticeSub}>
              Your operator account is currently under review by our Admin team.
              Customer bookings and approvals will unlock once verified.
            </Text>
          </View>
        )}

        {/* Urgent Pending Refunds Banner */}
        {pendingRefundsCount > 0 && (
          <View style={styles.urgentRefundAlertBanner}>
            <Ionicons name="warning" size={20} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.urgentRefundAlertTitle}>
                {pendingRefundsCount} Pending{" "}
                {pendingRefundsCount === 1 ? "Refund" : "Refunds"} Required
              </Text>
              <Text style={styles.urgentRefundAlertSub}>
                Please return the reservation fee to the renters to maintain
                your host standing.
              </Text>
            </View>
          </View>
        )}

        {/* Tab Filters */}
        <View style={styles.tabBar}>
          {(
            [
              "all",
              "pending",
              "approved",
              "ongoing",
              "history",
            ] as OperatorTabType[]
          ).map((tab) => {
            const isActive = activeTab === tab;
            const count = bookings.filter((b) =>
              tab === "all"
                ? true
                : tab === "history"
                  ? b.status === "completed" ||
                    b.status === "rejected" ||
                    b.status === "cancelled" ||
                    b.status === "no_show"
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
                        : b.status === tab,
            ).length;

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabItemText,
                    isActive && styles.tabItemTextActive,
                  ]}
                >
                  {tab === "all"
                    ? "All"
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
                {((tab === "pending" && count > 0) ||
                  (tab === "all" &&
                    bookings.some(
                      (b) =>
                        b.status === "pending_payment" ||
                        b.status === "pending_verification",
                    ))) && (
                  <View
                    style={[
                      styles.tabIndicatorDot,
                      styles.tabIndicatorDotPending,
                      isActive && styles.tabIndicatorDotActive,
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Ongoing Fleet Return Schedule Summary Widget */}
        {activeTab === "ongoing" && ongoingReturnStats.total > 0 && (
          <View style={styles.ongoingSummaryCard}>
            <View style={styles.ongoingSummaryHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="calendar" size={15} color={Colors.dark} />
                <Text style={styles.ongoingSummaryTitle}>
                  Fleet Return Schedule
                </Text>
              </View>
              <View style={styles.ongoingSummaryCountPill}>
                <Text style={styles.ongoingSummaryCountText}>
                  {ongoingReturnStats.total}{" "}
                  {ongoingReturnStats.total === 1
                    ? "Unit Active"
                    : "Units Active"}
                </Text>
              </View>
            </View>

            <View style={styles.ongoingStatsRow}>
              {/* Overdue */}
              <View
                style={[
                  styles.ongoingStatBox,
                  ongoingReturnStats.overdue > 0 &&
                    styles.ongoingStatBoxOverdue,
                ]}
              >
                <View style={styles.statBoxTop}>
                  <Ionicons
                    name="alert-circle"
                    size={13}
                    color={
                      ongoingReturnStats.overdue > 0
                        ? "#DC2626"
                        : Colors.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.statBoxNum,
                      ongoingReturnStats.overdue > 0 && { color: "#DC2626" },
                    ]}
                  >
                    {ongoingReturnStats.overdue}
                  </Text>
                </View>
                <Text style={styles.statBoxLabel}>Overdue</Text>
              </View>

              {/* Due Today */}
              <View
                style={[
                  styles.ongoingStatBox,
                  ongoingReturnStats.dueToday > 0 && styles.ongoingStatBoxToday,
                ]}
              >
                <View style={styles.statBoxTop}>
                  <Ionicons
                    name="time"
                    size={13}
                    color={
                      ongoingReturnStats.dueToday > 0
                        ? "#D97706"
                        : Colors.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.statBoxNum,
                      ongoingReturnStats.dueToday > 0 && { color: "#D97706" },
                    ]}
                  >
                    {ongoingReturnStats.dueToday}
                  </Text>
                </View>
                <Text style={styles.statBoxLabel}>Due Today</Text>
              </View>

              {/* Due Tomorrow */}
              <View
                style={[
                  styles.ongoingStatBox,
                  ongoingReturnStats.dueTomorrow > 0 &&
                    styles.ongoingStatBoxTomorrow,
                ]}
              >
                <View style={styles.statBoxTop}>
                  <Ionicons
                    name="calendar"
                    size={13}
                    color={
                      ongoingReturnStats.dueTomorrow > 0
                        ? "#2563EB"
                        : Colors.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.statBoxNum,
                      ongoingReturnStats.dueTomorrow > 0 && {
                        color: "#2563EB",
                      },
                    ]}
                  >
                    {ongoingReturnStats.dueTomorrow}
                  </Text>
                </View>
                <Text style={styles.statBoxLabel}>Tomorrow</Text>
              </View>

              {/* Due Later */}
              <View style={styles.ongoingStatBox}>
                <View style={styles.statBoxTop}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={13}
                    color="#059669"
                  />
                  <Text style={[styles.statBoxNum, { color: "#059669" }]}>
                    {ongoingReturnStats.dueLater}
                  </Text>
                </View>
                <Text style={styles.statBoxLabel}>Upcoming</Text>
              </View>
            </View>
          </View>
        )}

        {loading && !refreshing ? (
          <View style={{ gap: 14 }}>
            <Skeleton height={200} borderRadius={18} />
            <Skeleton height={200} borderRadius={18} />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "pending"
                ? "You currently have no new customer rental requests awaiting payment verification or refunds."
                : `No reservations under this category.`}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={operatorFlatListRef}
            data={paginatedBookings}
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
            ListFooterComponent={
              isPaginating && totalBookingsCount > 15 ? (
                <ListPagination
                  currentPage={currentPage}
                  totalItems={totalBookingsCount}
                  pageSize={15}
                  itemName="bookings"
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    operatorFlatListRef.current?.scrollToOffset({
                      offset: 0,
                      animated: true,
                    });
                  }}
                />
              ) : null
            }
            renderItem={({ item }) => {
              const statusCfg = getStatusConfig(item);
              const renterName = item.renter
                ? `${item.renter.first_name || ""} ${item.renter.last_name || ""}`.trim()
                : "Customer";
              const vehicleName = item.vehicle?.name || "Vehicle";
              const vehicleImageUrl = resolveVehicleImage(item.vehicle);
              const dateInfo = formatShortDate(item.start_date);

              const isOngoingItem =
                item.status === "trip_in_progress" ||
                item.status === "return_pending" ||
                item.status === "ongoing";

              const effectiveReturnDateStr = getEffectiveReturnDate(item);
              const returnDateInfo = formatShortDate(effectiveReturnDateStr);
              const returnStatus = getReturnStatus(effectiveReturnDateStr);
              const tripDays = getEffectiveTripDays(item);
              const tripDatesDisplay = formatPrettyTripDates(
                item.start_date,
                effectiveReturnDateStr,
              );

              const isRefundPending =
                item.refund_status === "pending" ||
                item.payment_status === "refund_pending";
              const isRefundCompleted =
                item.refund_status === "refunded" ||
                item.payment_status === "refunded";

              const extraDays = Number(item.extension_days || 1);
              const requestedEndDateStr = cleanDate(
                item.extension_end_date || item.extended_end_date,
              );
              const currentPrice = Number(item.total_price || 0);
              const currentDays = Number(item.total_days || 1);
              const dailyRate = Number(
                item.daily_rate ||
                  item.vehicle?.daily_rate ||
                  (currentDays > 0 ? currentPrice / currentDays : 0),
              );
              const extraFee = Number(
                item.extension_price ||
                  item.extension_fee ||
                  dailyRate * extraDays,
              );
              const newTotalDays = currentDays + extraDays;
              const newTotalPrice = currentPrice + extraFee;

              const isExpanded = !!expandedCardIds[item.id];

              return (
                <View style={styles.bookingCard}>
                  {/* Top Header Row: 68x68 Vehicle Thumb + Renter/Vehicle/Dates Info + Status Pill */}
                  <View style={styles.cardHeaderRow}>
                    <Image
                      source={{ uri: vehicleImageUrl }}
                      style={styles.cardImageThumb}
                      contentFit="cover"
                      transition={200}
                    />

                    <View style={styles.cardHeaderInfo}>
                      <TouchableOpacity
                        style={styles.renterBadgeRow}
                        onPress={() =>
                          item.renter && setSelectedRenter(item.renter)
                        }
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name="person-circle"
                          size={13}
                          color={Colors.primary}
                        />
                        <Text style={styles.renterBadgeText} numberOfLines={1}>
                          {renterName}
                        </Text>
                        <Ionicons
                          name="information-circle-outline"
                          size={11}
                          color={Colors.secondary}
                        />
                      </TouchableOpacity>

                      <Text style={styles.vehicleTitle} numberOfLines={1}>
                        {vehicleName}
                      </Text>

                      <View style={styles.datesRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color="#64748B"
                        />
                        <Text style={styles.datesText} numberOfLines={1}>
                          {tripDatesDisplay} • {tripDays}{" "}
                          {tripDays === 1 ? "day" : "days"}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: statusCfg.bg,
                          borderColor:
                            (statusCfg as any).border || statusCfg.bg,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: statusCfg.text },
                        ]}
                      >
                        {statusCfg.label}
                      </Text>
                    </View>
                  </View>

                  {/* Concise 2-Column Metric Strip */}
                  <View style={styles.cardMetaStrip}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>TOTAL PRICE</Text>
                      <Text style={styles.metaValue}>
                        ₱{Number(item.total_price).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaCol}>
                      {item.status === "pending_verification" ? (
                        <>
                          <Text style={styles.metaLabel}>DEPOSIT DUE</Text>
                          <Text
                            style={[styles.metaValue, { color: "#D97706" }]}
                          >
                            ₱
                            {Number(
                              item.reservation_fee || 500,
                            ).toLocaleString()}
                          </Text>
                        </>
                      ) : isOngoingItem ? (
                        <>
                          <Text style={styles.metaLabel}>RETURN STATUS</Text>
                          <Text
                            style={[
                              styles.metaValue,
                              { color: returnStatus.color },
                            ]}
                          >
                            {returnStatus.label}
                          </Text>
                        </>
                      ) : item.status === "completed" ? (
                        <>
                          <Text style={styles.metaLabel}>FINAL SETTLED</Text>
                          <Text
                            style={[styles.metaValue, { color: "#059669" }]}
                          >
                            ₱
                            {Number(
                              item.final_amount_due || item.total_price,
                            ).toLocaleString()}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.metaLabel}>RETURN DATE</Text>
                          <Text style={styles.metaValue}>
                            {cleanDate(effectiveReturnDateStr)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Extension Requests / Notices / Alerts */}
                  {item.extension_status === "pending" ? (
                    <View style={styles.extensionCardBanner}>
                      <View style={styles.extensionCardHeader}>
                        <View style={styles.extensionBadge}>
                          <Ionicons
                            name="calendar-outline"
                            size={12}
                            color="#D97706"
                          />
                          <Text style={styles.extensionBadgeText}>
                            EXTENSION REQUEST
                          </Text>
                        </View>
                        <Text style={styles.extensionFeeHighlight}>
                          +₱{extraFee.toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.extensionScheduleRow}>
                        <View style={styles.extensionScheduleItem}>
                          <Text style={styles.extensionSubLabel}>
                            CURRENT RETURN
                          </Text>
                          <Text style={styles.extensionMainText}>
                            {formatPrettyDate(item.end_date)}
                          </Text>
                        </View>
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color="#94A3B8"
                        />
                        <View style={styles.extensionScheduleItem}>
                          <Text style={styles.extensionSubLabel}>
                            REQUESTED (+{extraDays}d)
                          </Text>
                          <Text
                            style={[
                              styles.extensionMainText,
                              { color: Colors.primary },
                            ]}
                          >
                            {formatPrettyDate(requestedEndDateStr)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.extensionSummaryMathRow}>
                        <Text style={styles.extensionMathSummaryText}>
                          Updated Total:{" "}
                          <Text
                            style={{
                              fontFamily: FontFamily.bold,
                              color: Colors.dark,
                            }}
                          >
                            {newTotalDays} days
                          </Text>{" "}
                          •{" "}
                          <Text
                            style={{
                              fontFamily: FontFamily.bold,
                              color: Colors.dark,
                            }}
                          >
                            ₱{newTotalPrice.toLocaleString()}
                          </Text>
                        </Text>
                      </View>

                      <View style={styles.extensionBtnRow}>
                        <TouchableOpacity
                          style={styles.extensionDeclineBtn}
                          onPress={() => handleRejectExtension(item.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.extensionDeclineBtnText}>
                            Decline
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.extensionReviewBtn}
                          onPress={() => setReviewExtensionBooking(item)}
                          activeOpacity={0.88}
                        >
                          <Ionicons
                            name="eye-outline"
                            size={13}
                            color={Colors.dark}
                          />
                          <Text style={styles.extensionReviewBtnText}>
                            Review & Agree
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : item.extension_status === "pending_verification" ? (
                    <TouchableOpacity
                      style={styles.extensionReviewBtn}
                      onPress={() =>
                        showModal(
                          "Confirm extension payment",
                          `Verify receipt of ₱${Number(item.extension_price || 0).toLocaleString()} (reference: ${item.extension_payment_reference || "Cash"}) before extending the return date.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Payment received",
                              onPress: async () => {
                                try {
                                  await confirmExtensionPayment(item.id);
                                  loadOperatorBookings();
                                  showSuccess(
                                    "Extension confirmed",
                                    "The return date has been updated.",
                                  );
                                } catch (error: any) {
                                  showError(
                                    "Confirmation failed",
                                    error.response?.data?.message ||
                                      "Could not confirm extension payment.",
                                  );
                                }
                              },
                            },
                          ],
                          "confirm",
                        )
                      }
                    >
                      <Text style={styles.extensionReviewBtnText}>
                        Verify Extension Payment
                      </Text>
                    </TouchableOpacity>
                  ) : item.extension_status === "payment_required" ? (
                    <View style={styles.extensionAwaitingPaymentBanner}>
                      <Ionicons
                        name="hourglass-outline"
                        size={14}
                        color="#D97706"
                      />
                      <Text style={styles.extensionAwaitingText}>
                        Extension agreed (+{extraDays}d) • Awaiting
                        renter&apos;s ₱{extraFee.toLocaleString()} payment
                      </Text>
                    </View>
                  ) : item.extension_status === "approved" ? (
                    <View style={styles.extensionActiveBadgeRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#059669"
                      />
                      <Text style={styles.extensionActiveBadgeText}>
                        Trip Extended (+{item.extension_days || 1}d until{" "}
                        {formatPrettyDate(effectiveReturnDateStr)})
                        {item.extension_payment_reference
                          ? ` • Settled (Ref: ${item.extension_payment_reference})`
                          : ""}
                      </Text>
                    </View>
                  ) : isRefundPending ? (
                    <View style={styles.alertPillDanger}>
                      <Ionicons name="alert-circle" size={13} color="#DC2626" />
                      <Text style={styles.alertPillDangerText}>
                        Refund Required: ₱
                        {Number(
                          item.refund_amount || item.reservation_fee,
                        ).toLocaleString()}{" "}
                        to {item.renter_refund_account_name || renterName}
                      </Text>
                    </View>
                  ) : isRefundCompleted ? (
                    <View style={styles.alertPillSuccess}>
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color="#059669"
                      />
                      <Text style={styles.alertPillSuccessText}>
                        Refund Completed: Ref #{item.refund_reference || "N/A"}
                      </Text>
                    </View>
                  ) : null}

                  {/* Clean Dual Action Buttons */}
                  <View style={styles.cardActionRow}>
                    {item.renter?.id ? (
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
                        <Ionicons
                          name="chatbubble-ellipses-outline"
                          size={14}
                          color={Colors.dark}
                        />
                        <Text style={styles.outlineActionText}>Chat</Text>
                      </TouchableOpacity>
                    ) : null}

                    {item.renter?.id ? (
                      <TouchableOpacity
                        style={styles.outlineActionBtn}
                        onPress={() => {
                          startCall({
                            id: item.renter.id,
                            name: renterName,
                            first_name: item.renter.first_name,
                            last_name: item.renter.last_name,
                            role: "renter",
                            profile_photo:
                              item.renter.profile_photo_url ||
                              item.renter.profile_photo,
                          });
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="call-outline"
                          size={14}
                          color={Colors.dark}
                        />
                        <Text style={styles.outlineActionText}>Call</Text>
                      </TouchableOpacity>
                    ) : null}

                    {isRefundPending ? (
                      <TouchableOpacity
                        style={[
                          styles.primaryActionBtn,
                          { backgroundColor: "#991B1B" },
                        ]}
                        onPress={() => openRefundModal(item)}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={15}
                          color={Colors.white}
                        />
                        <Text
                          style={[
                            styles.primaryActionText,
                            { color: Colors.white },
                          ]}
                        >
                          Submit Refund Proof
                        </Text>
                      </TouchableOpacity>
                    ) : item.status === "pending_verification" ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        <TouchableOpacity
                          style={styles.dangerActionBtn}
                          onPress={() =>
                            handleStatusChange(item.id, "rejected")
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dangerActionText}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => setVerifyModalBooking(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="shield-checkmark"
                            size={14}
                            color={Colors.dark}
                          />
                          <Text style={styles.primaryActionText}>
                            Verify & Approve
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : item.status === "approved" ||
                      item.status === "awaiting_pickup" ||
                      item.status === "pickup_in_progress" ||
                      item.status === "ready_to_start" ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        <TouchableOpacity
                          style={styles.subtleActionBtn}
                          onPress={() => handleStatusChange(item.id, "no_show")}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="person-remove-outline"
                            size={13}
                            color="#991B1B"
                          />
                          <Text style={styles.subtleActionText}>No-Show</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => openStartTripModal(item)}
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons
                            name="car-key"
                            size={16}
                            color={Colors.dark}
                          />
                          <Text style={styles.primaryActionText}>
                            Start Handover
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : isOngoingItem ? (
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
                          <Ionicons
                            name="navigate-circle"
                            size={15}
                            color={Colors.dark}
                          />
                          <Text style={styles.gpsActionText}>Live GPS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.primaryActionBtn}
                          onPress={() => openReturnTripModal(item)}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="clipboard-outline"
                            size={15}
                            color={Colors.dark}
                          />
                          <Text style={styles.primaryActionText}>
                            Return Check
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : item.status === "completed" ||
                      item.status === "rejected" ||
                      item.status === "cancelled" ||
                      item.status === "no_show" ? (
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          flex: 1,
                          justifyContent: "flex-end",
                        }}
                      >
                        {item.refund_status !== "pending" &&
                        item.payment_status !== "refund_pending" ? (
                          <TouchableOpacity
                            style={styles.dangerOutlineActionBtn}
                            onPress={() => handleDeleteHistoryBooking(item)}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={14}
                              color="#DC2626"
                            />
                            <Text style={styles.dangerOutlineActionText}>
                              Delete Record
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Start Trip Handover Inspection Modal */}
        <AppBottomSheet
          visible={!!startTripModalBooking}
          onClose={() => setStartTripModalBooking(null)}
          position="bottom"
          showHandle={true}
          sheetStyle={styles.verifyModalCard}
        >
          <Text style={styles.verifyModalHeading}>Start Trip Handover</Text>
          <Text style={styles.verifyModalSubheading}>
            Record vehicle baseline condition & hand over keys to renter
          </Text>

          {/* Renter & Vehicle Summary Card */}
          <View style={styles.verifySummaryCard}>
            <View style={styles.verifyRow}>
              <Text style={styles.verifyLabel}>Renter</Text>
              <Text style={styles.verifyValue} numberOfLines={1}>
                {startTripModalBooking?.renter
                  ? `${startTripModalBooking.renter.first_name || ""} ${startTripModalBooking.renter.last_name || ""}`.trim()
                  : "Verified Renter"}
              </Text>
            </View>

            <View style={styles.verifyDivider} />

            <View style={styles.verifyRow}>
              <Text style={styles.verifyLabel}>Vehicle</Text>
              <Text style={styles.verifyValue} numberOfLines={1}>
                {startTripModalBooking?.vehicle?.name || "Vehicle"}
              </Text>
            </View>

            <View style={styles.verifyDivider} />

            <View style={styles.verifyRow}>
              <Text style={styles.verifyLabel}>Rental Schedule</Text>
              <Text style={styles.verifyValue}>
                {cleanDate(startTripModalBooking?.start_date)} →{" "}
                {cleanDate(startTripModalBooking?.end_date)} (
                {startTripModalBooking?.total_days || 1} d)
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 280 }}
          >
            {/* Starting Mileage */}
            <Text style={styles.inputLabel}>
              Starting Odometer Mileage (km) *
            </Text>
            <View style={styles.inputBox}>
              <Ionicons
                name="speedometer-outline"
                size={18}
                color={Colors.secondary}
              />
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
            <Text style={styles.inputLabel}>
              Starting Fuel Level: {startFuelLevelInput}%
            </Text>
            <View style={styles.fuelOptionsRow}>
              {[25, 50, 75, 100].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.fuelBtn,
                    startFuelLevelInput === level && styles.fuelBtnActive,
                  ]}
                  onPress={() => setStartFuelLevelInput(level)}
                >
                  <Ionicons
                    name="flash"
                    size={12}
                    color={
                      startFuelLevelInput === level
                        ? Colors.dark
                        : Colors.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.fuelBtnText,
                      startFuelLevelInput === level && styles.fuelBtnTextActive,
                    ]}
                  >
                    {level}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Inspection Notes */}
            <Text style={styles.inputLabel}>
              Handover & Vehicle Condition Notes
            </Text>
            <TextInput
              style={[styles.textInputField, styles.textAreaField]}
              multiline
              numberOfLines={3}
              placeholder="Note pre-existing scratches, cleanliness, or accessories handed over..."
              placeholderTextColor={Colors.secondary}
              value={startNotesInput}
              onChangeText={setStartNotesInput}
            />

            {/* Inspection Photos Upload */}
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={styles.inputLabel}>
                  Baseline Photos ({startTripPhotos.length}/6)
                </Text>
                <TouchableOpacity
                  onPress={pickStartPhotos}
                  activeOpacity={0.7}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons
                    name="camera-outline"
                    size={14}
                    color={Colors.dark}
                  />
                  <Text
                    style={{
                      fontFamily: FontFamily.semiBold,
                      fontSize: 12,
                      color: Colors.dark,
                    }}
                  >
                    + Add Photo
                  </Text>
                </TouchableOpacity>
              </View>
              {startTripPhotos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  {startTripPhotos.map((uri, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 8,
                        overflow: "hidden",
                        position: "relative",
                        borderWidth: 1,
                        borderColor: Colors.border,
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          borderRadius: 10,
                          width: 20,
                          height: 20,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => removeStartPhoto(idx)}
                      >
                        <Ionicons name="close" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <TouchableOpacity
                  onPress={pickStartPhotos}
                  style={{
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#CBD5E1",
                    borderRadius: 8,
                    padding: 12,
                    alignItems: "center",
                    backgroundColor: "#F8FAFC",
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="images-outline"
                    size={20}
                    color={Colors.secondary}
                  />
                  <Text
                    style={{
                      fontFamily: FontFamily.medium,
                      fontSize: 12,
                      color: Colors.secondary,
                      marginTop: 4,
                    }}
                  >
                    Tap to upload baseline condition photos (up to 6)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* Dual Action Footer matching verifyActionsRow */}
          <View style={styles.verifyActionsRow}>
            <TouchableOpacity
              style={styles.verifyCancelBtn}
              onPress={() => setStartTripModalBooking(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyCancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.verifyConfirmBtn}
              onPress={handleExecuteStartTrip}
              disabled={submittingStartTrip}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons
                name="car-key"
                size={18}
                color={Colors.dark}
              />
              <Text style={styles.verifyConfirmBtnText}>
                {submittingStartTrip ? "Starting..." : "Start Trip"}
              </Text>
            </TouchableOpacity>
          </View>
        </AppBottomSheet>

        {/* Return Trip Inspection Modal */}
        <AppBottomSheet
          visible={!!returnTripModalBooking}
          onClose={() => setReturnTripModalBooking(null)}
          position="bottom"
          showHandle={false}
          sheetStyle={styles.modalCard}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Return Inspection</Text>
              <Text style={styles.modalSub}>
                {returnTripModalBooking?.vehicle?.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReturnTripModalBooking(null)}>
              <Ionicons
                name="close-circle"
                size={24}
                color={Colors.secondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 440 }}
          >
            {/* Return Schedule & Due Status Row */}
            {returnTripModalBooking && (
              <View style={styles.modalReturnInfoBanner}>
                <Ionicons name="calendar-outline" size={16} color="#B45309" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalReturnInfoText}>
                    Scheduled Return:{" "}
                    {formatFullDate(
                      getEffectiveReturnDate(returnTripModalBooking),
                    )}
                    {returnTripModalBooking.extension_status === "approved"
                      ? " (Extended)"
                      : ""}
                  </Text>
                  {getReturnStatus(
                    getEffectiveReturnDate(returnTripModalBooking),
                  ).isOverdue && (
                    <Text
                      style={{
                        fontFamily: FontFamily.medium,
                        fontSize: 11,
                        color: "#DC2626",
                        marginTop: 2,
                      }}
                    >
                      ⚠️ Vehicle is{" "}
                      {getReturnStatus(
                        getEffectiveReturnDate(returnTripModalBooking),
                      ).label.toLowerCase()}
                      . Suggested late fee pre-calculated below.
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Comparison Card */}
            <View style={styles.comparisonBox}>
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonLabel}>START MILEAGE</Text>
                <Text style={styles.comparisonVal}>
                  {returnTripModalBooking?.start_mileage?.toLocaleString() ??
                    "N/A"}{" "}
                  km
                </Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonLabel}>START FUEL</Text>
                <Text style={styles.comparisonVal}>
                  {returnTripModalBooking?.start_fuel_level ?? 100}%
                </Text>
              </View>
            </View>

            {/* End Mileage */}
            <Text style={styles.inputLabel}>
              Return Odometer Mileage (km) *
            </Text>
            <View style={styles.inputBox}>
              <Ionicons
                name="speedometer-outline"
                size={18}
                color={Colors.secondary}
              />
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
            <Text style={styles.inputLabel}>
              Return Fuel Level: {endFuelLevelInput}%
            </Text>
            <View style={styles.fuelOptionsRow}>
              {[25, 50, 75, 100].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.fuelBtn,
                    endFuelLevelInput === level && styles.fuelBtnActive,
                  ]}
                  onPress={() => setEndFuelLevelInput(level)}
                >
                  <Ionicons
                    name="flash"
                    size={12}
                    color={
                      endFuelLevelInput === level
                        ? Colors.dark
                        : Colors.secondary
                    }
                  />
                  <Text
                    style={[
                      styles.fuelBtnText,
                      endFuelLevelInput === level && styles.fuelBtnTextActive,
                    ]}
                  >
                    {level}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Additional Charges Section */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>
              Additional Surcharges (if applicable)
            </Text>
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
            <Text style={styles.inputLabel}>
              Return Inspection Summary & Remarks
            </Text>
            <TextInput
              style={[styles.textInputField, styles.textAreaField]}
              multiline
              numberOfLines={2}
              placeholder="Confirmed no damages, accessories returned in good condition..."
              placeholderTextColor={Colors.secondary}
              value={endNotesInput}
              onChangeText={setEndNotesInput}
            />

            {/* Return Inspection Photos */}
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <Text style={styles.inputLabel}>
                  Return Photos & Evidence ({returnTripPhotos.length}/6)
                </Text>
                <TouchableOpacity
                  onPress={pickReturnPhotos}
                  activeOpacity={0.7}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Ionicons
                    name="camera-outline"
                    size={14}
                    color={Colors.dark}
                  />
                  <Text
                    style={{
                      fontFamily: FontFamily.semiBold,
                      fontSize: 12,
                      color: Colors.dark,
                    }}
                  >
                    + Add Photo
                  </Text>
                </TouchableOpacity>
              </View>
              {returnTripPhotos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  {returnTripPhotos.map((uri, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 8,
                        overflow: "hidden",
                        position: "relative",
                        borderWidth: 1,
                        borderColor: Colors.border,
                      }}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          borderRadius: 10,
                          width: 20,
                          height: 20,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => removeReturnPhoto(idx)}
                      >
                        <Ionicons name="close" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <TouchableOpacity
                  onPress={pickReturnPhotos}
                  style={{
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: "#CBD5E1",
                    borderRadius: 8,
                    padding: 12,
                    alignItems: "center",
                    backgroundColor: "#F8FAFC",
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="images-outline"
                    size={20}
                    color={Colors.secondary}
                  />
                  <Text
                    style={{
                      fontFamily: FontFamily.medium,
                      fontSize: 12,
                      color: Colors.secondary,
                      marginTop: 4,
                    }}
                  >
                    Tap to upload return photos (odometer, fuel, damages)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
              <Ionicons name="checkmark-done" size={16} color={Colors.dark} />
              <Text style={styles.confirmCompleteBtnText}>
                {submittingReturnTrip ? "Completing..." : "Complete Trip"}
              </Text>
            </TouchableOpacity>
          </View>
        </AppBottomSheet>

        {/* Submit Refund Proof Modal */}
        <AppBottomSheet
          visible={!!refundModalBooking}
          onClose={() => setRefundModalBooking(null)}
          position="bottom"
          showHandle={false}
          sheetStyle={styles.modalCard}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Process Renter Refund</Text>
              <Text style={styles.modalSub}>
                Submit transaction receipt ID for verification
              </Text>
            </View>
            <TouchableOpacity onPress={() => setRefundModalBooking(null)}>
              <Ionicons
                name="close-circle"
                size={24}
                color={Colors.secondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Refund Summary Banner */}
            <View style={styles.refundAmountBanner}>
              <Text style={styles.refundAmountLabel}>AMOUNT TO REFUND</Text>
              <Text style={styles.refundAmountVal}>
                ₱
                {Number(
                  refundModalBooking?.refund_amount ||
                    refundModalBooking?.reservation_fee ||
                    500,
                ).toLocaleString()}
              </Text>
              <Text style={styles.refundAmountSub}>
                Recipient:{" "}
                {refundModalBooking?.renter_refund_account_name ||
                  (refundModalBooking?.renter
                    ? `${refundModalBooking.renter.first_name || ""} ${refundModalBooking.renter.last_name || ""}`.trim()
                    : "Renter")}
              </Text>
              <Text style={styles.refundAccountHighlight}>
                {refundModalBooking?.renter_refund_method?.toUpperCase() ||
                  "GCASH"}
                :{" "}
                {refundModalBooking?.renter_refund_account_number ||
                  refundModalBooking?.renter?.phone_number ||
                  "N/A"}
              </Text>
            </View>

            {/* Refund Reference Input */}
            <Text style={styles.inputLabel}>
              Transaction / Reference Number *
            </Text>
            <View
              style={[
                styles.inputBox,
                refundError ? styles.inputBoxError : null,
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={18}
                color={refundError ? "#DC2626" : Colors.secondary}
              />
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
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>
              Optional Notes / Remarks
            </Text>
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
              style={[
                styles.confirmCompleteBtn,
                { backgroundColor: "#DC2626" },
              ]}
              onPress={handleExecuteProcessRefund}
              disabled={submittingRefund}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={Colors.white}
              />
              <Text
                style={[styles.confirmCompleteBtnText, { color: Colors.white }]}
              >
                {submittingRefund ? "Submitting..." : "Confirm Refund"}
              </Text>
            </TouchableOpacity>
          </View>
        </AppBottomSheet>

        {/* View Renter Profile Modal */}
        <AppBottomSheet
          visible={!!selectedRenter}
          onClose={() => setSelectedRenter(null)}
          position="bottom"
          showHandle={true}
          sheetStyle={[styles.modalCard, { maxHeight: "88%" }]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Renter Profile</Text>
            <TouchableOpacity onPress={() => setSelectedRenter(null)}>
              <Ionicons
                name="close-circle"
                size={24}
                color={Colors.secondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ width: "100%" }}
            contentContainerStyle={styles.renterModalBody}
          >
            {selectedRenter?.profile_photo ? (
              <Image
                source={{
                  uri:
                    resolveStorageUrl(selectedRenter.profile_photo) ||
                    selectedRenter.profile_photo,
                }}
                style={styles.renterAvatarLg}
              />
            ) : (
              <View style={styles.renterAvatarLg}>
                <Ionicons name="person" size={32} color={Colors.dark} />
              </View>
            )}

            <Text style={styles.renterNameLg}>
              {selectedRenter?.first_name} {selectedRenter?.last_name}
            </Text>
            <Text style={styles.renterEmailLg}>{selectedRenter?.email}</Text>
            <Text style={styles.renterPhoneLg}>
              {selectedRenter?.mobile_number || "No contact number"}
            </Text>

            <View
              style={[
                styles.verifiedPill,
                !selectedRenter?.is_drivers_license_verified && {
                  backgroundColor: "#FEF3C7",
                },
              ]}
            >
              <Ionicons
                name={
                  selectedRenter?.is_drivers_license_verified
                    ? "checkmark-circle"
                    : "time-outline"
                }
                size={14}
                color={
                  selectedRenter?.is_drivers_license_verified
                    ? "#10B981"
                    : "#D97706"
                }
              />
              <Text
                style={[
                  styles.verifiedText,
                  !selectedRenter?.is_drivers_license_verified && {
                    color: "#92400E",
                  },
                ]}
              >
                {selectedRenter?.is_drivers_license_verified
                  ? "Verified Driver"
                  : "License Pending Host Verification"}
              </Text>
            </View>

            {/* Renter Driver's License Photos */}
            {(selectedRenter?.drivers_license_front ||
              selectedRenter?.drivers_license_front_url ||
              selectedRenter?.drivers_license_back ||
              selectedRenter?.drivers_license_back_url) && (
              <View
                style={[
                  styles.verifyLicenseSection,
                  { marginTop: 14, marginBottom: 0 },
                ]}
              >
                <View style={styles.verifyLicenseSectionHeader}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name="card-outline"
                      size={15}
                      color={Colors.dark}
                    />
                    <Text style={styles.verifyLicenseSectionTitle}>
                      Driver&apos;s License Photos
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.secondary,
                      fontFamily: FontFamily.medium,
                    }}
                  >
                    Tap to inspect
                  </Text>
                </View>

                <View style={styles.licensePhotosRow}>
                  {(() => {
                    const fUri = resolveStorageUrl(
                      selectedRenter?.drivers_license_front_url ||
                        selectedRenter?.drivers_license_front,
                    );
                    return (
                      <TouchableOpacity
                        style={styles.licenseCardItem}
                        activeOpacity={fUri ? 0.8 : 1}
                        onPress={() => fUri && setLicensePreviewUri(fUri)}
                      >
                        <View style={styles.licenseCardItemHeader}>
                          <Text style={styles.licenseCardItemLabel}>FRONT</Text>
                          {fUri && (
                            <Ionicons
                              name="scan-outline"
                              size={13}
                              color={Colors.primary}
                            />
                          )}
                        </View>
                        {fUri ? (
                          <View style={styles.licenseThumbContainer}>
                            <Image
                              source={{ uri: fUri }}
                              style={styles.licenseThumbImage}
                              contentFit="cover"
                            />
                            <View style={styles.licenseThumbOverlay}>
                              <Ionicons
                                name="expand-outline"
                                size={13}
                                color={Colors.white}
                              />
                              <Text style={styles.licenseThumbOverlayText}>
                                Zoom
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.licenseThumbEmpty}>
                            <Ionicons
                              name="image-outline"
                              size={22}
                              color={Colors.secondary}
                            />
                            <Text style={styles.licenseThumbEmptyText}>
                              None
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })()}

                  {(() => {
                    const bUri = resolveStorageUrl(
                      selectedRenter?.drivers_license_back_url ||
                        selectedRenter?.drivers_license_back,
                    );
                    return (
                      <TouchableOpacity
                        style={styles.licenseCardItem}
                        activeOpacity={bUri ? 0.8 : 1}
                        onPress={() => bUri && setLicensePreviewUri(bUri)}
                      >
                        <View style={styles.licenseCardItemHeader}>
                          <Text style={styles.licenseCardItemLabel}>BACK</Text>
                          {bUri && (
                            <Ionicons
                              name="scan-outline"
                              size={13}
                              color={Colors.primary}
                            />
                          )}
                        </View>
                        {bUri ? (
                          <View style={styles.licenseThumbContainer}>
                            <Image
                              source={{ uri: bUri }}
                              style={styles.licenseThumbImage}
                              contentFit="cover"
                            />
                            <View style={styles.licenseThumbOverlay}>
                              <Ionicons
                                name="expand-outline"
                                size={13}
                                color={Colors.white}
                              />
                              <Text style={styles.licenseThumbOverlayText}>
                                Zoom
                              </Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.licenseThumbEmpty}>
                            <Ionicons
                              name="image-outline"
                              size={22}
                              color={Colors.secondary}
                            />
                            <Text style={styles.licenseThumbEmptyText}>
                              None
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              </View>
            )}
          </ScrollView>
        </AppBottomSheet>

        {/* Dedicated Professional & Minimal Verify & Approve Bottom Sheet */}
        <AppBottomSheet
          visible={!!verifyModalBooking}
          onClose={() => setVerifyModalBooking(null)}
          position="bottom"
          showHandle={true}
          sheetStyle={[styles.verifyModalCard, { maxHeight: "90%" }]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ alignItems: "center", paddingBottom: 12 }}
            style={{ width: "100%" }}
          >
            {/* Top Drama Glow Icon */}
            <View style={styles.verifyGlowCircle}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.dark} />
            </View>

            <Text style={styles.verifyModalHeading}>
              Verify & Approve Reservation
            </Text>
            <Text style={styles.verifyModalSubheading}>
              Inspect the renter&apos;s driver&apos;s license credentials before
              approving pickup schedule
            </Text>

            {/* Renter & Vehicle Summary Card */}
            <View style={styles.verifySummaryCard}>
              <View style={styles.verifyRow}>
                <Text style={styles.verifyLabel}>Renter</Text>
                <Text style={styles.verifyValue} numberOfLines={1}>
                  {verifyModalBooking?.renter
                    ? `${verifyModalBooking.renter.first_name || ""} ${verifyModalBooking.renter.last_name || ""}`.trim()
                    : "Verified Renter"}
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
                  {cleanDate(verifyModalBooking?.start_date)} →{" "}
                  {cleanDate(verifyModalBooking?.end_date)} (
                  {verifyModalBooking?.total_days} d)
                </Text>
              </View>

              {verifyModalBooking?.payment_reference && (
                <>
                  <View style={styles.verifyDivider} />
                  <View style={styles.verifyRow}>
                    <Text style={styles.verifyLabel}>
                      Payment Ref / Receipt
                    </Text>
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
                  ₱
                  {Number(
                    verifyModalBooking?.reservation_fee || 500,
                  ).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Driver's License Inspection Section (Option A - Operator Verification) */}
            <View style={styles.verifyLicenseSection}>
              <View style={styles.verifyLicenseSectionHeader}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Ionicons name="card-outline" size={16} color={Colors.dark} />
                  <Text style={styles.verifyLicenseSectionTitle}>
                    Driver&apos;s License Inspection
                  </Text>
                </View>
                <View
                  style={[
                    styles.licenseStatusBadge,
                    verifyModalBooking?.renter?.is_drivers_license_verified
                      ? styles.licenseStatusBadgeApproved
                      : verifyModalBooking?.renter?.drivers_license_front ||
                          verifyModalBooking?.renter?.drivers_license_front_url
                        ? styles.licenseStatusBadgePending
                        : styles.licenseStatusBadgeMissing,
                  ]}
                >
                  <Ionicons
                    name={
                      verifyModalBooking?.renter?.is_drivers_license_verified
                        ? "checkmark-circle"
                        : verifyModalBooking?.renter?.drivers_license_front ||
                            verifyModalBooking?.renter
                              ?.drivers_license_front_url
                          ? "time-outline"
                          : "alert-circle"
                    }
                    size={11}
                    color={
                      verifyModalBooking?.renter?.is_drivers_license_verified
                        ? "#065F46"
                        : verifyModalBooking?.renter?.drivers_license_front ||
                            verifyModalBooking?.renter
                              ?.drivers_license_front_url
                          ? "#92400E"
                          : "#991B1B"
                    }
                  />
                  <Text
                    style={[
                      styles.licenseStatusBadgeText,
                      verifyModalBooking?.renter?.is_drivers_license_verified
                        ? styles.licenseStatusBadgeTextApproved
                        : verifyModalBooking?.renter?.drivers_license_front ||
                            verifyModalBooking?.renter
                              ?.drivers_license_front_url
                          ? styles.licenseStatusBadgeTextPending
                          : styles.licenseStatusBadgeTextMissing,
                    ]}
                  >
                    {verifyModalBooking?.renter?.is_drivers_license_verified
                      ? "Already Verified"
                      : verifyModalBooking?.renter?.drivers_license_front ||
                          verifyModalBooking?.renter?.drivers_license_front_url
                        ? "Inspect & Verify"
                        : "Missing Photos"}
                  </Text>
                </View>
              </View>

              <Text style={styles.verifyLicenseHint}>
                Inspect front and back photos for validity, expiration date, and
                name match. Tap any image to zoom in full screen.
              </Text>

              {/* Front & Back Photo Cards Side-by-Side */}
              <View style={styles.licensePhotosRow}>
                {/* Front */}
                {(() => {
                  const frontUri = resolveStorageUrl(
                    verifyModalBooking?.renter?.drivers_license_front_url ||
                      verifyModalBooking?.renter?.drivers_license_front,
                  );
                  return (
                    <TouchableOpacity
                      style={styles.licenseCardItem}
                      activeOpacity={frontUri ? 0.8 : 1}
                      onPress={() => frontUri && setLicensePreviewUri(frontUri)}
                    >
                      <View style={styles.licenseCardItemHeader}>
                        <Text style={styles.licenseCardItemLabel}>FRONT</Text>
                        {frontUri && (
                          <Ionicons
                            name="scan-outline"
                            size={13}
                            color={Colors.primary}
                          />
                        )}
                      </View>
                      {frontUri ? (
                        <View style={styles.licenseThumbContainer}>
                          <Image
                            source={{ uri: frontUri }}
                            style={styles.licenseThumbImage}
                            contentFit="cover"
                          />
                          <View style={styles.licenseThumbOverlay}>
                            <Ionicons
                              name="expand-outline"
                              size={13}
                              color={Colors.white}
                            />
                            <Text style={styles.licenseThumbOverlayText}>
                              Zoom
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.licenseThumbEmpty}>
                          <Ionicons
                            name="image-outline"
                            size={24}
                            color={Colors.secondary}
                          />
                          <Text style={styles.licenseThumbEmptyText}>
                            Not provided
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })()}

                {/* Back */}
                {(() => {
                  const backUri = resolveStorageUrl(
                    verifyModalBooking?.renter?.drivers_license_back_url ||
                      verifyModalBooking?.renter?.drivers_license_back,
                  );
                  return (
                    <TouchableOpacity
                      style={styles.licenseCardItem}
                      activeOpacity={backUri ? 0.8 : 1}
                      onPress={() => backUri && setLicensePreviewUri(backUri)}
                    >
                      <View style={styles.licenseCardItemHeader}>
                        <Text style={styles.licenseCardItemLabel}>BACK</Text>
                        {backUri && (
                          <Ionicons
                            name="scan-outline"
                            size={13}
                            color={Colors.primary}
                          />
                        )}
                      </View>
                      {backUri ? (
                        <View style={styles.licenseThumbContainer}>
                          <Image
                            source={{ uri: backUri }}
                            style={styles.licenseThumbImage}
                            contentFit="cover"
                          />
                          <View style={styles.licenseThumbOverlay}>
                            <Ionicons
                              name="expand-outline"
                              size={13}
                              color={Colors.white}
                            />
                            <Text style={styles.licenseThumbOverlayText}>
                              Zoom
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.licenseThumbEmpty}>
                          <Ionicons
                            name="image-outline"
                            size={24}
                            color={Colors.secondary}
                          />
                          <Text style={styles.licenseThumbEmptyText}>
                            Not provided
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })()}
              </View>

              {/* Optional Secondary Driver License */}
              {(verifyModalBooking?.secondary_driver_name ||
                verifyModalBooking?.secondary_driver_license_front ||
                verifyModalBooking?.secondary_driver_license_back) && (
                <View style={styles.secondaryDriverBox}>
                  <Text style={styles.secondaryDriverTitle}>
                    Secondary Driver:{" "}
                    {verifyModalBooking.secondary_driver_name ||
                      "Authorized Additional Driver"}
                  </Text>
                  <View style={styles.licensePhotosRow}>
                    {/* Secondary Front */}
                    {(() => {
                      const sFrontUri = resolveStorageUrl(
                        verifyModalBooking.secondary_driver_license_front,
                      );
                      return (
                        <TouchableOpacity
                          style={styles.licenseCardItem}
                          activeOpacity={sFrontUri ? 0.8 : 1}
                          onPress={() =>
                            sFrontUri && setLicensePreviewUri(sFrontUri)
                          }
                        >
                          <View style={styles.licenseCardItemHeader}>
                            <Text style={styles.licenseCardItemLabel}>
                              SEC. FRONT
                            </Text>
                            {sFrontUri && (
                              <Ionicons
                                name="scan-outline"
                                size={13}
                                color={Colors.primary}
                              />
                            )}
                          </View>
                          {sFrontUri ? (
                            <View style={styles.licenseThumbContainer}>
                              <Image
                                source={{ uri: sFrontUri }}
                                style={styles.licenseThumbImage}
                                contentFit="cover"
                              />
                              <View style={styles.licenseThumbOverlay}>
                                <Ionicons
                                  name="expand-outline"
                                  size={13}
                                  color={Colors.white}
                                />
                                <Text style={styles.licenseThumbOverlayText}>
                                  Zoom
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.licenseThumbEmpty}>
                              <Ionicons
                                name="image-outline"
                                size={22}
                                color={Colors.secondary}
                              />
                              <Text style={styles.licenseThumbEmptyText}>
                                None
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })()}

                    {/* Secondary Back */}
                    {(() => {
                      const sBackUri = resolveStorageUrl(
                        verifyModalBooking.secondary_driver_license_back,
                      );
                      return (
                        <TouchableOpacity
                          style={styles.licenseCardItem}
                          activeOpacity={sBackUri ? 0.8 : 1}
                          onPress={() =>
                            sBackUri && setLicensePreviewUri(sBackUri)
                          }
                        >
                          <View style={styles.licenseCardItemHeader}>
                            <Text style={styles.licenseCardItemLabel}>
                              SEC. BACK
                            </Text>
                            {sBackUri && (
                              <Ionicons
                                name="scan-outline"
                                size={13}
                                color={Colors.primary}
                              />
                            )}
                          </View>
                          {sBackUri ? (
                            <View style={styles.licenseThumbContainer}>
                              <Image
                                source={{ uri: sBackUri }}
                                style={styles.licenseThumbImage}
                                contentFit="cover"
                              />
                              <View style={styles.licenseThumbOverlay}>
                                <Ionicons
                                  name="expand-outline"
                                  size={13}
                                  color={Colors.white}
                                />
                                <Text style={styles.licenseThumbOverlayText}>
                                  Zoom
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.licenseThumbEmpty}>
                              <Ionicons
                                name="image-outline"
                                size={22}
                                color={Colors.secondary}
                              />
                              <Text style={styles.licenseThumbEmptyText}>
                                None
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })()}
                  </View>
                </View>
              )}
            </View>

            {/* Operational Guarantee Notice */}
            <View style={styles.verifyNoticeBox}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.dark} />
              <Text style={styles.verifyNoticeText}>
                Approving confirms receipt of reservation fee, verifies the
                renter&apos;s driver license, and unlocks vehicle handover.
              </Text>
            </View>

            {/* Actions: Decline, Chat Renter, Verify & Approve */}
            <View style={styles.verifyActionsRow}>
              <TouchableOpacity
                style={styles.verifyDeclineBtn}
                onPress={() => {
                  const bId = verifyModalBooking?.id;
                  setVerifyModalBooking(null);
                  if (bId) {
                    handleStatusChange(bId, "rejected");
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color="#DC2626"
                />
                <Text style={styles.verifyDeclineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.verifyCancelBtn,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  },
                ]}
                onPress={() => {
                  const rId = verifyModalBooking?.renter_id;
                  const rName = verifyModalBooking?.renter
                    ? `${verifyModalBooking.renter.first_name || ""} ${verifyModalBooking.renter.last_name || ""}`.trim()
                    : "Renter";
                  setVerifyModalBooking(null);
                  if (rId) {
                    router.push({
                      pathname: `/chat/${rId}`,
                      params: { name: rName },
                    } as any);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={15}
                  color={Colors.dark}
                />
                <Text style={styles.verifyCancelBtnText}>Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.verifyConfirmBtn}
                onPress={handleExecuteVerifyApprove}
                disabled={submittingVerifyApprove}
                activeOpacity={0.88}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color={Colors.dark}
                />
                <Text style={styles.verifyConfirmBtnText}>
                  {submittingVerifyApprove
                    ? "Approving..."
                    : "Verify & Approve"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </AppBottomSheet>

        {/* Dedicated Modern Trip Extension Review Bottom Sheet */}
        <AppBottomSheet
          visible={!!reviewExtensionBooking}
          onClose={() => setReviewExtensionBooking(null)}
          position="bottom"
          showHandle={true}
          sheetStyle={[styles.verifyModalCard, { maxHeight: "90%" }]}
        >
          {reviewExtensionBooking &&
            (() => {
              const extExtraDays = Number(
                reviewExtensionBooking.extension_days || 1,
              );
              const extCurrentPrice = Number(
                reviewExtensionBooking.total_price || 0,
              );
              const extCurrentDays = Number(
                reviewExtensionBooking.total_days || 1,
              );
              const extDailyRate = Number(
                reviewExtensionBooking.daily_rate ||
                  reviewExtensionBooking.vehicle?.daily_rate ||
                  (extCurrentDays > 0 ? extCurrentPrice / extCurrentDays : 0),
              );
              const extFee = Number(
                reviewExtensionBooking.extension_price ||
                  reviewExtensionBooking.extension_fee ||
                  extDailyRate * extExtraDays,
              );
              const extNewTotalDays = extCurrentDays + extExtraDays;
              const extNewTotalPrice = extCurrentPrice + extFee;
              const extRenterName = reviewExtensionBooking.renter
                ? `${reviewExtensionBooking.renter.first_name || ""} ${reviewExtensionBooking.renter.last_name || ""}`.trim()
                : "Renter";

              return (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    alignItems: "center",
                    paddingBottom: 16,
                  }}
                  style={{ width: "100%" }}
                >
                  {/* Glowing Top Circle */}
                  <View
                    style={[
                      styles.verifyGlowCircle,
                      { backgroundColor: "#FEF3C7" },
                    ]}
                  >
                    <Ionicons name="calendar" size={30} color="#D97706" />
                  </View>

                  <Text style={styles.verifyModalHeading}>
                    Review Trip Extension
                  </Text>
                  <Text style={styles.verifyModalSubheading}>
                    Renter requested to extend this active rental schedule
                  </Text>

                  {/* Summary Card */}
                  <View style={styles.verifySummaryCard}>
                    <View style={styles.verifyRow}>
                      <Text style={styles.verifyLabel}>Renter</Text>
                      <Text style={styles.verifyValue} numberOfLines={1}>
                        {extRenterName}
                      </Text>
                    </View>

                    <View style={styles.verifyDivider} />

                    <View style={styles.verifyRow}>
                      <Text style={styles.verifyLabel}>Vehicle</Text>
                      <Text style={styles.verifyValue} numberOfLines={1}>
                        {reviewExtensionBooking.vehicle?.name || "Vehicle"}
                      </Text>
                    </View>
                  </View>

                  {/* Schedule Comparison Box */}
                  <View style={styles.extComparisonCard}>
                    <View style={styles.extComparisonHeader}>
                      <Text style={styles.extComparisonSectionTitle}>
                        SCHEDULE CHANGE
                      </Text>
                      <View style={styles.extDaysAddedPill}>
                        <Text style={styles.extDaysAddedPillText}>
                          +{extExtraDays} {extExtraDays === 1 ? "day" : "days"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.extComparisonRow}>
                      <View style={styles.extComparisonCol}>
                        <Text style={styles.extComparisonColLabel}>
                          CURRENT RETURN
                        </Text>
                        <Text style={styles.extComparisonColValue}>
                          {formatFullDate(reviewExtensionBooking.end_date)}
                        </Text>
                        <Text style={styles.extComparisonColSub}>
                          {extCurrentDays}{" "}
                          {extCurrentDays === 1 ? "day" : "days"} duration
                        </Text>
                      </View>

                      <View style={styles.extComparisonArrow}>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color={Colors.primary}
                        />
                      </View>

                      <View style={styles.extComparisonCol}>
                        <Text
                          style={[
                            styles.extComparisonColLabel,
                            { color: Colors.primary },
                          ]}
                        >
                          PROPOSED RETURN
                        </Text>
                        <Text
                          style={[
                            styles.extComparisonColValue,
                            { color: Colors.dark },
                          ]}
                        >
                          {formatFullDate(
                            reviewExtensionBooking.extension_end_date ||
                              reviewExtensionBooking.extended_end_date,
                          )}
                        </Text>
                        <Text
                          style={[
                            styles.extComparisonColSub,
                            {
                              color: Colors.primary,
                              fontFamily: FontFamily.semiBold,
                            },
                          ]}
                        >
                          {extNewTotalDays} days total
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Financial Calculation Breakdown */}
                  <View style={styles.extFinancialCard}>
                    <Text style={styles.extComparisonSectionTitle}>
                      FINANCIAL SUMMARY
                    </Text>

                    <View style={styles.extFeeRow}>
                      <Text style={styles.extFeeLabel}>
                        Current Total Price
                      </Text>
                      <Text style={styles.extFeeValue}>
                        ₱{extCurrentPrice.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.extFeeRow}>
                      <View>
                        <Text style={styles.extFeeLabel}>Extension Fee</Text>
                        <Text style={styles.extFeeSub}>
                          {extExtraDays} {extExtraDays === 1 ? "day" : "days"} ×
                          ₱{extDailyRate.toLocaleString()}/day
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.extFeeValue,
                          { color: "#D97706", fontFamily: FontFamily.bold },
                        ]}
                      >
                        +₱{extFee.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.extDivider} />

                    <View style={styles.extFeeRow}>
                      <Text style={styles.extTotalLabel}>
                        New Total Rental Amount
                      </Text>
                      <Text style={styles.extTotalValue}>
                        ₱{extNewTotalPrice.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Optional Renter Notes */}
                  {reviewExtensionBooking.extension_notes ? (
                    <View style={styles.extNotesCard}>
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={15}
                        color={Colors.secondary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.extNotesLabel}>
                          Renter&apos;s Note:
                        </Text>
                        <Text style={styles.extNotesText}>
                          {reviewExtensionBooking.extension_notes}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Helpful Instruction Note */}
                  <View style={styles.extNoticeBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={15}
                      color="#1D4ED8"
                    />
                    <Text style={styles.extNoticeText}>
                      Once agreed, the renter will be prompted to settle the ₱
                      {extFee.toLocaleString()} extension fee via GCash. The
                      booking schedule will update automatically upon payment.
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.verifyActionsRow}>
                    <TouchableOpacity
                      style={styles.verifyDeclineBtn}
                      onPress={handleConfirmRejectExtensionModal}
                      disabled={submittingExtensionAction}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={16}
                        color="#DC2626"
                      />
                      <Text style={styles.verifyDeclineBtnText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.verifyCancelBtn,
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        },
                      ]}
                      onPress={() => {
                        const rId = reviewExtensionBooking?.renter_id;
                        const rName = extRenterName;
                        setReviewExtensionBooking(null);
                        if (rId) {
                          router.push({
                            pathname: `/chat/${rId}`,
                            params: { name: rName },
                          } as any);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={15}
                        color={Colors.dark}
                      />
                      <Text style={styles.verifyCancelBtnText}>Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.verifyConfirmBtn,
                        { backgroundColor: Colors.dark },
                      ]}
                      onPress={handleConfirmApproveExtensionModal}
                      disabled={submittingExtensionAction}
                      activeOpacity={0.88}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={17}
                        color={Colors.white}
                      />
                      <Text
                        style={[
                          styles.verifyConfirmBtnText,
                          { color: Colors.white },
                        ]}
                      >
                        {submittingExtensionAction
                          ? "Agreeing..."
                          : "Agree & Request Pay"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
        </AppBottomSheet>

        {/* Full-Screen Driver's License Image Inspection Modal */}
        <Modal
          visible={!!licensePreviewUri}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setLicensePreviewUri(null)}
        >
          <View style={styles.licenseZoomBackdrop}>
            <View style={styles.licenseZoomHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons name="card" size={20} color={Colors.white} />
                <Text style={styles.licenseZoomTitle}>
                  Driver&apos;s License Inspection
                </Text>
              </View>
              <TouchableOpacity
                style={styles.licenseZoomCloseBtn}
                onPress={() => setLicensePreviewUri(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={Colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.licenseZoomImageWrapper}>
              {licensePreviewUri && (
                <Image
                  source={{ uri: licensePreviewUri }}
                  style={styles.licenseZoomImage}
                  contentFit="contain"
                  transition={200}
                />
              )}
            </View>

            <View style={styles.licenseZoomFooter}>
              <Text style={styles.licenseZoomFooterText}>
                Inspect license details, holographic seal, and expiration date
                carefully before approving.
              </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    gap: 4,
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
  tabIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  tabIndicatorDotPending: {
    backgroundColor: "#F59E0B",
  },
  tabIndicatorDotActive: {
    backgroundColor: Colors.primary,
  },
  refundableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  refundableBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#B45309",
  },
  ongoingSummaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ongoingSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  ongoingSummaryTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
    letterSpacing: -0.2,
  },
  ongoingSummaryCountPill: {
    backgroundColor: Colors.logoBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ongoingSummaryCountText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    color: "#B45309",
  },
  ongoingStatsRow: {
    flexDirection: "row",
    gap: 6,
  },
  ongoingStatBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  ongoingStatBoxOverdue: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  ongoingStatBoxToday: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  ongoingStatBoxTomorrow: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  statBoxTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statBoxNum: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  statBoxLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 9.5,
    color: Colors.secondary,
    marginTop: 1,
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
  cardHeaderRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  cardImageThumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  cardHeaderInfo: {
    flex: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  renterBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  renterBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
    flexShrink: 1,
  },
  vehicleTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  datesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  datesText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#64748B",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  // Concise Metric Strip
  cardMetaStrip: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  metaDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 12,
  },
  // Modern Trip Extension Card Banner
  extensionCardBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  extensionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  extensionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  extensionBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    color: "#B45309",
    letterSpacing: 0.3,
  },
  extensionFeeHighlight: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: "#B45309",
  },
  extensionScheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  extensionScheduleItem: {
    flex: 1,
  },
  extensionSubLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: "#94A3B8",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  extensionMainText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  extensionSummaryMathRow: {
    marginTop: 7,
    paddingHorizontal: 2,
  },
  extensionMathSummaryText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#64748B",
  },
  extensionBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  extensionDeclineBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
    color: "#991B1B",
  },
  extensionReviewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  extensionReviewBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  extensionAwaitingPaymentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  extensionAwaitingText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#B45309",
    flex: 1,
  },
  extensionActiveBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  extensionActiveBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: "#047857",
    flex: 1,
  },
  // Extension Review Sheet Modal Styles
  extComparisonCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
  },
  extComparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  extComparisonSectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#64748B",
    letterSpacing: 0.6,
  },
  extDaysAddedPill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  extDaysAddedPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: "#1D4ED8",
  },
  extComparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  extComparisonCol: {
    flex: 1,
  },
  extComparisonColLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: "#94A3B8",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  extComparisonColValue: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.dark,
    lineHeight: 16,
  },
  extComparisonColSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10.5,
    color: Colors.secondary,
    marginTop: 2,
  },
  extComparisonArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  extFinancialCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 12,
  },
  extFeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  extFeeLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#475569",
  },
  extFeeSub: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondary,
    marginTop: 1,
  },
  extFeeValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },
  extDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  extTotalLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  extTotalValue: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.primary,
  },
  extNotesCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  extNotesLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.secondary,
    marginBottom: 2,
  },
  extNotesText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.dark,
  },
  extNoticeBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  extNoticeText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#1E40AF",
    lineHeight: 15,
    flex: 1,
  },
  // Compact Alert Pills
  alertPillWarning: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    gap: 8,
  },
  alertPillWarningTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: "#92400E",
  },
  alertPillWarningDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: "#B45309",
    marginTop: 1,
  },
  extensionMiniDeclineBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  extensionMiniDeclineText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    color: "#991B1B",
  },
  extensionMiniApproveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  extensionMiniApproveText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    color: Colors.dark,
  },
  alertPillInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  alertPillInfoText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#B45309",
    flex: 1,
  },
  alertPillDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  alertPillDangerText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#B91C1C",
    flex: 1,
  },
  alertPillSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  alertPillSuccessText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#047857",
    flex: 1,
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  subtleActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  subtleActionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
    color: "#991B1B",
  },
  dangerOutlineActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  dangerOutlineActionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: "#DC2626",
  },
  approvedSecondaryRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  approvedChatBtn: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  approvedChatBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    color: Colors.dark,
  },
  approvedNoShowBtn: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    backgroundColor: "#FDF2F2",
  },
  approvedNoShowBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: "#991B1B",
  },
  approvedStartTripBtn: {
    width: "100%",
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  approvedStartTripBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.dark,
    letterSpacing: -0.2,
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
    color: Colors.dark,
  },
  dangerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  dangerActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#991B1B",
  },
  gpsActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  gpsActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
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
    gap: 6,
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  receiptBoxLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#92400E",
  },
  receiptBoxVal: {
    fontFamily: FontFamily.bold,
    fontSize: 11.5,
    color: Colors.dark,
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
    color: Colors.dark,
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
    color: Colors.dark,
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
    justifyContent: "flex-start",
    paddingTop: 32,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
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
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: Spacing.sm,
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
  returnScheduleBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 4,
    gap: 8,
  },
  returnScheduleBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  returnIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  returnScheduleHeaderLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: "#64748B",
    letterSpacing: 0.5,
  },
  extendedPillBadge: {
    backgroundColor: Colors.logoBackground,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "#FDE68A",
  },
  extendedPillBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 8.5,
    color: "#B45309",
  },
  returnScheduleDateText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.dark,
    marginTop: 1,
  },
  returnStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  returnStatusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  detailsToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  detailsToggleText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.secondary,
  },
  expandedDetailsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 6,
  },
  completedSummaryBox: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    alignItems: "center",
  },
  completedSummaryCol: {
    flex: 1,
    alignItems: "center",
  },
  completedSummaryLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 9,
    color: Colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  completedSummaryVal: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  scheduleDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 2,
  },
  scheduleDetailLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.secondary,
  },
  scheduleDetailVal: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.dark,
    flex: 1,
  },
  modalReturnInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  modalReturnInfoText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: "#92400E",
    flex: 1,
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
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 10,
    borderRadius: 12,
    marginVertical: 12,
  },
  modalInfoBannerText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#92400E",
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
    color: Colors.dark,
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
    color: Colors.dark,
  },
  confirmCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmCompleteBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  trackGpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  trackGpsBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
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
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  extensionApproveText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    color: Colors.dark,
  },
  extensionApprovedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF9E6",
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  extensionApprovedText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: "#92400E",
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
    backgroundColor: Colors.logoBackground,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  verifyModalHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  verifyModalSubheading: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    textAlign: "center",
    lineHeight: 17,
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  verifySummaryCard: {
    width: "100%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.secondary,
  },
  verifyValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    color: Colors.dark,
    maxWidth: "58%",
    textAlign: "right",
  },
  verifyDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 6,
  },
  verifyPaymentRef: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  verifyPriceHighlight: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  verifyNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 18,
    width: "100%",
  },
  verifyNoticeText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.dark,
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
    height: 48,
    borderRadius: 13,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyCancelBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.dark,
  },
  verifyConfirmBtn: {
    flex: 1.8,
    height: 48,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyConfirmBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
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
  /* Driver License Inspection Styles */
  verifyLicenseSection: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,
  },
  verifyLicenseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  verifyLicenseSectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13.5,
    color: Colors.dark,
  },
  licenseStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  licenseStatusBadgeApproved: {
    backgroundColor: "#D1FAE5",
  },
  licenseStatusBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  licenseStatusBadgeMissing: {
    backgroundColor: "#FEE2E2",
  },
  licenseStatusBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
  },
  licenseStatusBadgeTextApproved: {
    color: "#065F46",
  },
  licenseStatusBadgeTextPending: {
    color: "#92400E",
  },
  licenseStatusBadgeTextMissing: {
    color: "#991B1B",
  },
  verifyLicenseHint: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: Colors.secondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  licensePhotosRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  licenseCardItem: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    alignItems: "center",
  },
  licenseCardItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  licenseCardItemLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  licenseThumbContainer: {
    width: "100%",
    height: 84,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  licenseThumbImage: {
    width: "100%",
    height: "100%",
  },
  licenseThumbOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  licenseThumbOverlayText: {
    fontFamily: FontFamily.medium,
    fontSize: 9.5,
    color: Colors.white,
  },
  licenseThumbEmpty: {
    width: "100%",
    height: 84,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  licenseThumbEmptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondary,
  },
  secondaryDriverBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    width: "100%",
  },
  secondaryDriverTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
    color: Colors.dark,
    marginBottom: 8,
  },
  verifyDeclineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  verifyDeclineBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: "#DC2626",
  },
  licenseZoomBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 54 : 36,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    paddingHorizontal: 16,
  },
  licenseZoomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  licenseZoomTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
  },
  licenseZoomCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  licenseZoomImageWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  licenseZoomImage: {
    width: "100%",
    height: "100%",
  },
  licenseZoomFooter: {
    paddingHorizontal: 12,
    paddingTop: 12,
    alignItems: "center",
  },
  licenseZoomFooterText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#CBD5E1",
    textAlign: "center",
    lineHeight: 16,
  },
});
