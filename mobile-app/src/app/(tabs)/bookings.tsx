import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Linking,
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
import PrimaryButton from "@/components/common/PrimaryButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useCall } from "@/context/CallContext";
import { useAppToast } from "@/context/ToastContext";
import { useAuth } from "@/features/auth/hooks/useAuth";

import TripDateTimeSelector from "@/components/common/TripDateTimeSelector";
import { API_BASE_URL, resolveImageUrl } from "@/services/api";
import { Booking, deleteBooking, getMyBookings, requestBookingExtension, settleBookingExtensionPayment, settleReservationPayment, submitBookingReview, updateBookingStatus } from "@/services/bookingService";
import {
  cancelBookingReminders,
  syncBookingsReminders,
} from "@/services/deviceNotificationService";
import { copyToClipboard } from "@/utils/clipboard";
import * as FileSystem from "expo-file-system/legacy";


type TabType = "all" | "ongoing" | "approved" | "pending" | "past";

const cleanDate = (d: string | null | undefined): string => {
  if (!d) return "";
  return String(d).split("T")[0];
};

const resolveStorageUrl = (path?: string | null): string | null => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const baseDomain = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  const storagePath = path.replace(/^\/+/, "").replace(/^storage\//, "");
  return `${baseDomain}/storage/${storagePath}`;
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

const GCASH_IMG = require("@/assets/img/gcash.jpg");

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

const resolveCleanVehicleName = (vehicle: any, fallback = "Vehicle"): string => {
  if (!vehicle) return fallback;
  let rawName = typeof vehicle.name === "string" ? vehicle.name.trim() : "";
  if (rawName.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawName);
      rawName = parsed.name || parsed.model || "";
    } catch {
      // ignore
    }
  }
  const rawBrand = vehicle.brand;
  const brandName =
    typeof rawBrand === "string"
      ? rawBrand.trim()
      : typeof rawBrand === "object" && rawBrand?.name
      ? String(rawBrand.name).trim()
      : "";

  if (brandName && !rawName.toLowerCase().includes(brandName.toLowerCase())) {
    return `${brandName} ${rawName}`.trim();
  }
  return rawName || brandName || fallback;
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

const formatLocalDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getEffectiveTripDays = (b: Booking | null | undefined): number => {
  if (!b) return 1;
  const start = b.start_date ? parseDateString(b.start_date) : null;
  const endStr =
    b.extension_status === "approved" || b.status === "ongoing"
      ? b.extended_end_date || b.extension_end_date || b.end_date
      : b.end_date;
  const end = endStr ? parseDateString(endStr) : null;
  if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
    const diff = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff > 0) return diff;
  }
  const baseDays = Number(b.total_days) || 1;
  const extDays =
    b.extension_status === "approved" || b.status === "ongoing"
      ? Number(b.extension_days) || 0
      : 0;
  return Math.max(1, baseDays + extDays);
};

export default function Bookings() {
  const auth = useAuth();
  const { showSuccess, showError, showModal } = useAppToast();
  const { startCall } = useCall();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsFlatListRef = React.useRef<FlatList>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected Booking for Schedule / Detail Modal
  const [selectedBookingForDetails, setSelectedBookingForDetails] =
    useState<Booking | null>(null);

  // Payment Modal State
  const [selectedBookingForPayment, setSelectedBookingForPayment] =
    useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentRefError, setPaymentRefError] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showQrInline, setShowQrInline] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [qrSavedSuccess, setQrSavedSuccess] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Review Modal State
  const [selectedBookingForReview, setSelectedBookingForReview] =
    useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Extension Schedule Request Modal State
  const [selectedBookingForExtension, setSelectedBookingForExtension] =
    useState<Booking | null>(null);
  const [extensionDays, setExtensionDays] = useState(1);
  const [extensionStartDate, setExtensionStartDate] = useState<Date>(
    new Date(),
  );
  const [extensionEndDate, setExtensionEndDate] = useState<Date>(new Date());
  const [extensionStartTime, setExtensionStartTime] =
    useState<string>("10:00 AM");
  const [extensionEndTime, setExtensionEndTime] = useState<string>("10:00 AM");
  const [extensionError, setExtensionError] = useState("");
  const [submittingExtension, setSubmittingExtension] = useState(false);

  // Settle Extension Fee Modal State
  const [
    selectedBookingForExtensionPayment,
    setSelectedBookingForExtensionPayment,
  ] = useState<Booking | null>(null);
  const [extPayRef, setExtPayRef] = useState("");
  const [extPayRefError, setExtPayRefError] = useState("");
  const [submittingExtPay, setSubmittingExtPay] = useState(false);
  const [showExtPayQr, setShowExtPayQr] = useState(false);
  const [copiedExtPayPhone, setCopiedExtPayPhone] = useState(false);

  const paymentScrollRef = useRef<ScrollView>(null);
  const extPayScrollRef = useRef<ScrollView>(null);
  const reviewScrollRef = useRef<ScrollView>(null);
  const paymentRefInputRef = useRef<TextInput>(null);
  const extPayRefInputRef = useRef<TextInput>(null);
  const reviewInputRef = useRef<TextInput>(null);
  const focusedInputRef = useRef<TextInput | null>(null);
  const focusedScrollRef = useRef<ScrollView | null>(null);
  const focusedScrollOffsetRef = useRef(0);
  const keyboardMetricsRef = useRef({ height: 0, top: 0 });

  const scrollFocusedInputAboveKeyboard = React.useCallback(() => {
    const input = focusedInputRef.current;
    const scrollView = focusedScrollRef.current;
    const { height, top } = keyboardMetricsRef.current;
    if (!input || !scrollView || height <= 0) return;

    input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
      const overflow = inputY + inputHeight - (top - 12);
      if (overflow > 0) {
        const nextOffset = focusedScrollOffsetRef.current + overflow;
        focusedScrollOffsetRef.current = nextOffset;
        scrollView.scrollTo({ y: nextOffset, animated: true });
      }
    });
  }, []);

  const focusPaymentField = (
    input: TextInput | null,
    scrollView: ScrollView | null,
  ) => {
    focusedInputRef.current = input;
    focusedScrollRef.current = scrollView;
    if (keyboardMetricsRef.current.height > 0) {
      setTimeout(scrollFocusedInputAboveKeyboard, 100);
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        const height = e.endCoordinates.height;
        const top =
          e.endCoordinates.screenY || Dimensions.get("window").height - height;
        keyboardMetricsRef.current = { height, top };
        setTimeout(scrollFocusedInputAboveKeyboard, 150);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        keyboardMetricsRef.current = { height: 0, top: 0 };
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFocusedInputAboveKeyboard]);

  const loadBookings = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getMyBookings();
      syncBookingsReminders(data).catch(() => {});
      setBookings((prev) => {
        if (
          silent &&
          prev.length === data.length &&
          prev.every((b, idx) => {
            const next = data[idx];
            return (
              next &&
              b.id === next.id &&
              b.status === next.status &&
              b.payment_status === next.payment_status &&
              b.extension_status === next.extension_status &&
              b.updated_at === next.updated_at
            );
          })
        ) {
          return prev;
        }
        return data;
      });
    } catch (e) {
      if (!silent) console.error("Failed to load renter bookings", e);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const hasLoadedOnceRef = useRef(false);
  const modalOpenRef = useRef(false);
  useEffect(() => {
    modalOpenRef.current = Boolean(
      selectedBookingForReview ||
        selectedBookingForPayment ||
        selectedBookingForExtension ||
        selectedBookingForExtensionPayment,
    );
  }, [
    selectedBookingForReview,
    selectedBookingForPayment,
    selectedBookingForExtension,
    selectedBookingForExtensionPayment,
  ]);

  // Only poll while Bookings tab is actually focused
  useFocusEffect(
    React.useCallback(() => {
      if (auth.isGuest || !auth.user) return;

      loadBookings(hasLoadedOnceRef.current);
      hasLoadedOnceRef.current = true;

      const poller = setInterval(() => {
        if (modalOpenRef.current) {
          return;
        }
        loadBookings(true);
      }, 8000);

      return () => clearInterval(poller);
    }, [auth.isGuest, auth.user, loadBookings]),
  );

  // Summary Metrics Computation
  const summary = useMemo(() => {
    let totalSpent = 0;
    let ongoingCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    bookings.forEach((b) => {
      const price = Number(b.total_price) || 0;
      if (
        b.status === "trip_in_progress" ||
        b.status === "ongoing" ||
        b.status === "return_pending"
      ) {
        ongoingCount += 1;
        totalSpent += price;
      } else if (
        b.status === "approved" ||
        b.status === "awaiting_pickup" ||
        b.status === "pickup_in_progress" ||
        b.status === "ready_to_start"
      ) {
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
    const vehicleTitle = resolveCleanVehicleName(booking.vehicle, "this booking");
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
              cancelBookingReminders(booking.id).catch(() => {});
              showSuccess(
                "Booking Cancelled",
                "The booking has been cancelled and removed.",
              );
              setBookings((prev) => prev.filter((b) => b.id !== booking.id));
              if (selectedBookingForDetails?.id === booking.id) {
                setSelectedBookingForDetails(null);
              }
            } catch (e: any) {
              showError(
                "Error",
                e.response?.data?.message || "Could not cancel booking.",
              );
            }
          },
        },
      ],
      "confirm",
    );
  };

  const isDeletable = (status: string) => {
    return [
      "cancelled",
      "rejected",
      "declined",
      "completed",
      "no_show",
      "refunded",
    ].includes(status);
  };

  const handleDeleteBooking = (booking: Booking) => {
    const vehicleTitle = resolveCleanVehicleName(booking.vehicle, "this booking");
    showModal(
      "Delete Booking",
      `Are you sure you want to remove the booking for ${vehicleTitle}? It will be removed from your bookings list.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBooking(booking.id);
              cancelBookingReminders(booking.id).catch(() => {});
              showSuccess(
                "Booking Deleted",
                "The booking card has been removed.",
              );
              setBookings((prev) => prev.filter((b) => b.id !== booking.id));
              if (selectedBookingForDetails?.id === booking.id) {
                setSelectedBookingForDetails(null);
              }
            } catch (e: any) {
              showError(
                "Error",
                e.response?.data?.message || "Could not delete booking.",
              );
            }
          },
        },
      ],
      "confirm",
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

  const handleSaveQr = async (qrUrl: string) => {
    if (!qrUrl) return;
    try {
      setSavingQr(true);
      const filename = `host_qr_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${filename}`;
      const downloadRes = await FileSystem.downloadAsync(qrUrl, localUri);

      let saved = false;

      // 1. Try MediaLibrary dynamically (works if native module compiled in build)
      try {
        const MediaLibrary = require("expo-media-library");
        if (
          MediaLibrary &&
          typeof MediaLibrary.saveToLibraryAsync === "function"
        ) {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === "granted") {
            await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
            saved = true;
          }
        }
      } catch {
        // Native module not linked in current dev client
      }

      // 2. Fallback for Android: StorageAccessFramework directly saves into Pictures
      if (!saved && Platform.OS === "android") {
        try {
          const SAF = (FileSystem as any).StorageAccessFramework;
          if (SAF) {
            const initialUri = SAF.getUriForDirectoryInRoot("Pictures");
            const perm = await SAF.requestDirectoryPermissionsAsync(initialUri);
            if (perm && perm.granted) {
              const base64 = await FileSystem.readAsStringAsync(
                downloadRes.uri,
                {
                  encoding: FileSystem.EncodingType.Base64,
                },
              );
              const fileUri = await SAF.createFileAsync(
                perm.directoryUri,
                `host_qr_${Date.now()}`,
                "image/jpeg",
              );
              await FileSystem.writeAsStringAsync(fileUri, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              saved = true;
            }
          }
        } catch {
          // ignore or permission dismissed
        }
      }

      // Provide silent visual button feedback (no notification popup as requested)
      setQrSavedSuccess(true);
      setTimeout(() => setQrSavedSuccess(false), 2500);
    } catch (err: any) {
      console.error("Save QR error:", err);
    } finally {
      setSavingQr(false);
    }
  };

  const handleSettlePayment = async () => {
    if (!selectedBookingForPayment) return;
    if (submittingPayment) return;
    setPaymentRefError("");

    // Prevent duplicate settlement on already paid/processed bookings
    if (
      selectedBookingForPayment.payment_status === "paid_reservation" ||
      selectedBookingForPayment.payment_status === "paid_full" ||
      selectedBookingForPayment.status !== "pending_payment"
    ) {
      setPaymentRefError(
        "Payment notice has already been recorded for this reservation.",
      );
      return;
    }

    // Double Booking Settlement Guard: check if renter already has another active/settled trip overlapping with these trip dates
    const currentStart = parseDateString(selectedBookingForPayment.start_date);
    const currentEnd = parseDateString(selectedBookingForPayment.end_date);

    const otherActiveOrSettled = bookings.find((b) => {
      if (b.id === selectedBookingForPayment.id) return false;
      // Terminal states (completed, cancelled, rejected, refunded) are never active trips
      if (
        ["completed", "cancelled", "rejected", "refunded", "no_show"].includes(
          b.status,
        )
      )
        return false;
      const isActiveStatus = [
        "pending_verification",
        "approved",
        "awaiting_pickup",
        "pickup_in_progress",
        "ready_to_start",
        "trip_in_progress",
        "ongoing",
        "return_pending",
      ].includes(b.status);
      if (!isActiveStatus) return false;

      // Check date overlap
      const bStart = parseDateString(b.start_date);
      const bEnd = parseDateString(
        b.extension_end_date || b.extended_end_date || b.end_date,
      );
      return bStart <= currentEnd && bEnd >= currentStart;
    });

    if (
      otherActiveOrSettled &&
      (!selectedBookingForPayment.is_multi_vehicle_rental ||
        !selectedBookingForPayment.secondary_driver_name?.trim())
    ) {
      setPaymentRefError(
        "You already have an active rental during overlapping trip dates. Multi-vehicle rental requires an authorized secondary driver designated during booking.",
      );
      return;
    }

    const rawRef = paymentRef.trim();
    if (!rawRef) {
      setPaymentRefError(
        "Reference number is required to verify your transaction.",
      );
      return;
    }
    const cleanRef = rawRef.replace(/[\s-]/g, "");
    if (!/^\d+$/.test(cleanRef)) {
      setPaymentRefError("GCash reference number must contain only numbers.");
      return;
    }
    if (cleanRef.length < 10 || cleanRef.length > 16) {
      setPaymentRefError("Enter a valid 10–16 digit GCash reference number.");
      return;
    }
    if (/^(\d)\1+$/.test(cleanRef)) {
      setPaymentRefError(
        "Please enter the authentic reference number from your GCash receipt.",
      );
      return;
    }

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
        payment_reference: cleanRef,
        renter_refund_method: paymentMethod,
        renter_refund_account_name: renterFullName,
        renter_refund_account_number: renterContact,
      });

      cancelBookingReminders(selectedBookingForPayment.id).catch(() => {});

      setSelectedBookingForPayment(null);
      setPaymentRef("");
      setPaymentRefError("");
      setShowQrInline(false);
      showSuccess(
        "Deposit Notice Sent",
        "Your host can verify the reservation deposit. The remaining rental balance is due before key handover.",
      );
      loadBookings();
    } catch (e: any) {
      const msg =
        e.response?.data?.message ||
        e.message ||
        "Payment notification failed. Please try again.";
      if (
        msg.toLowerCase().includes("reference number is required") ||
        msg.toLowerCase().includes("receipt / reference")
      ) {
        setPaymentRefError(
          "Reference number is required to verify your transaction.",
        );
      } else {
        setPaymentRefError(msg);
      }
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
      showSuccess(
        "Review Submitted",
        "Thank you for rating your rental experience!",
      );
      loadBookings();
    } catch (e: any) {
      showError(
        "Review Error",
        e.response?.data?.message || "Review submission failed.",
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRequestExtension = async () => {
    if (!selectedBookingForExtension) return;
    setExtensionError("");

    const effectiveEndStr =
      selectedBookingForExtension.extension_end_date ||
      selectedBookingForExtension.extended_end_date ||
      selectedBookingForExtension.end_date;
    const curEnd = parseDateString(effectiveEndStr);
    curEnd.setHours(0, 0, 0, 0);

    const targetEnd = new Date(extensionEndDate);
    targetEnd.setHours(0, 0, 0, 0);

    const diff = Math.round(
      (targetEnd.getTime() - curEnd.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff <= 0 || targetEnd.getTime() <= curEnd.getTime()) {
      setExtensionError(
        `Extension return date must be at least 1 day after your current return date (${cleanDate(effectiveEndStr)}).`,
      );
      return;
    }

    try {
      setSubmittingExtension(true);
      const calcDays = Math.max(1, diff);
      const newEndDateStr = formatLocalDate(extensionEndDate);

      await requestBookingExtension(selectedBookingForExtension.id, {
        extended_end_date: newEndDateStr,
        extension_end_date: newEndDateStr,
        extension_days: calcDays,
        extension_payment_method: "gcash",
        extension_payment_reference: "0000000000000",
      });

      setSelectedBookingForExtension(null);
      setExtensionError("");
      showSuccess(
        "Extension Request Submitted",
        `Requested +${calcDays} ${calcDays === 1 ? "day" : "days"} extension until ${newEndDateStr}. Sent to host for review.`,
      );
      loadBookings();
    } catch (e: any) {
      setExtensionError(
        e.response?.data?.message ||
          "Failed to submit rental extension request. Please try again.",
      );
    } finally {
      setSubmittingExtension(false);
    }
  };

  const handleSettleExtensionPayment = async () => {
    if (!selectedBookingForExtensionPayment) return;
    setExtPayRefError("");
    const rawRef = extPayRef.trim();
    if (!rawRef) {
      setExtPayRefError(
        "Reference number is required to verify your transaction.",
      );
      return;
    }
    const cleanRef = rawRef.replace(/[\s-]/g, "");
    if (!/^\d+$/.test(cleanRef)) {
      setExtPayRefError("GCash reference number must contain only numbers.");
      return;
    }
    if (cleanRef.length < 10 || cleanRef.length > 16) {
      setExtPayRefError("Enter a valid 13-digit GCash reference number.");
      return;
    }
    if (/^(\d)\1+$/.test(cleanRef)) {
      setExtPayRefError(
        "Please enter the authentic reference number from your GCash receipt.",
      );
      return;
    }

    try {
      setSubmittingExtPay(true);
      await settleBookingExtensionPayment(
        selectedBookingForExtensionPayment.id,
        {
          payment_method: "gcash",
          payment_reference: cleanRef,
        },
      );

      setSelectedBookingForExtensionPayment(null);
      setExtPayRef("");
      setExtPayRefError("");
      setShowExtPayQr(false);
      showSuccess("Extension Paid", "Your trip has been extended.");
      loadBookings();
    } catch (e: any) {
      setExtPayRefError(
        e.response?.data?.message ||
          "Failed to settle extension fee. Please verify your reference number.",
      );
    } finally {
      setSubmittingExtPay(false);
    }
  };

  if (auth.isGuest || !auth.user) {
    return (
      <ScreenContainer>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Upcoming Rides</Text>
            <Text style={styles.subtitle}>Keep track of your bookings!</Text>
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Track Your Trips</Text>
            <Text style={styles.emptySubtitle}>
              Sign in to view real-time reservation status and rental trips.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "all") return true;
    if (activeTab === "ongoing")
      return (
        b.status === "trip_in_progress" ||
        b.status === "return_pending" ||
        b.status === "ongoing"
      );
    if (activeTab === "approved")
      return (
        b.status === "approved" ||
        b.status === "awaiting_pickup" ||
        b.status === "pickup_in_progress" ||
        b.status === "ready_to_start"
      );
    if (activeTab === "pending")
      return (
        b.status === "pending_payment" || b.status === "pending_verification"
      );
    if (activeTab === "past")
      return (
        b.status === "completed" ||
        b.status === "cancelled" ||
        b.status === "rejected" ||
        b.status === "no_show"
      );
    return b.status === activeTab;
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
        label: "Refund Pending",
        bg: "#FDF2F2",
        text: "#991B1B",
        dot: "#991B1B",
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
        dot: Colors.primary,
        border: "#FDE68A",
        icon: "checkmark-circle" as const,
      };
    }
    switch (item.status) {
      case "pending_payment":
        return {
          label: "Awaiting Fee",
          bg: "#FFFBEB",
          text: "#B45309",
          dot: Colors.primary,
          border: "#FDE68A",
          icon: "time-outline" as const,
        };
      case "pending_verification":
        return {
          label: "Verifying Fee",
          bg: "#FFF9E6",
          text: Colors.dark,
          dot: Colors.primary,
          border: Colors.primary,
          icon: "shield-checkmark-outline" as const,
        };
      case "approved":
      case "awaiting_pickup":
        return {
          label: "Awaiting Pickup",
          bg: "#FFF6DA",
          text: "#92400E",
          dot: Colors.primary,
          border: "#FDE68A",
          icon: "checkmark-circle" as const,
        };
      case "pickup_in_progress":
        return {
          label: "Pickup Inspection",
          bg: "#FEF3C7",
          text: "#B45309",
          dot: Colors.primary,
          border: "#FDE68A",
          icon: "walk" as const,
        };
      case "ready_to_start":
        return {
          label: "Ready to Start",
          bg: "#1A1A1A",
          text: Colors.primary,
          dot: Colors.primary,
          border: "#1A1A1A",
          icon: "key" as const,
        };
      case "trip_in_progress":
      case "ongoing":
        return {
          label: "On Trip",
          bg: "#1A1A1A",
          text: Colors.primary,
          dot: Colors.primary,
          border: "#1A1A1A",
          icon: "car" as const,
        };
      case "return_pending":
        return {
          label: "Return Check",
          bg: "#FFF6DA",
          text: "#92400E",
          dot: Colors.primary,
          border: "#FDE68A",
          icon: "hourglass-outline" as const,
        };
      case "completed":
        return {
          label: "Completed",
          bg: "#F4F4F5",
          text: "#52525B",
          dot: "#71717A",
          border: "#E4E4E7",
          icon: "flag" as const,
        };
      case "rejected":
        return {
          label: "Declined",
          bg: "#FDF2F2",
          text: "#991B1B",
          dot: "#991B1B",
          border: "#FEE2E2",
          icon: "close-circle" as const,
        };
      case "cancelled":
        return {
          label: "Cancelled",
          bg: "#FDF2F2",
          text: "#991B1B",
          dot: "#991B1B",
          border: "#FEE2E2",
          icon: "close-circle" as const,
        };
      case "no_show":
        return {
          label: "No-Show",
          bg: "#F4F4F5",
          text: "#52525B",
          dot: "#71717A",
          border: "#E4E4E7",
          icon: "person-remove-outline" as const,
        };
      default:
        return {
          label: String((item as any)?.status || "").toUpperCase(),
          bg: Colors.inputBackground,
          text: Colors.dark,
          dot: Colors.secondary,
          border: Colors.border,
          icon: "information-circle" as const,
        };
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Upcoming Rides</Text>
          <Text style={styles.subtitle}>Keep track of your bookings!</Text>
        </View>

        {/* Horizontal Filter Pill Tabs */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBar}
          >
            {[
              { id: "all", label: "All" },
              { id: "ongoing", label: "Ongoing" },
              { id: "approved", label: "Awaiting Pickup" },
              { id: "pending", label: "Pending" },
              { id: "past", label: "Completed" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => {
                    setActiveTab(tab.id as TabType);
                    setCurrentPage(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      isActive && styles.tabItemTextActive,
                    ]}
                  >
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
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "all"
                ? "You have not made any vehicle reservations yet."
                : `No reservations in this category.`}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={bookingsFlatListRef}
            data={paginatedBookings}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={loadBookings}
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
                    bookingsFlatListRef.current?.scrollToOffset({
                      offset: 0,
                      animated: true,
                    });
                  }}
                />
              ) : null
            }
            renderItem={({ item }) => {
              const statusCfg = getStatusConfig(item);
              const vehicleName = resolveCleanVehicleName(item.vehicle, "Vehicle");
              const vehicleImageUrl = resolveVehicleImage(item.vehicle);
              const operatorBusinessName =
                item.operator?.operator_profile?.business_name ||
                item.operator?.operatorProfile?.business_name ||
                item.vehicle?.operator?.operatorProfile?.business_name ||
                item.vehicle?.operator?.operator_profile?.business_name ||
                item.operator?.first_name ||
                "Verified Host";

              const isRefundPending =
                item.refund_status === "pending" ||
                item.payment_status === "refund_pending";
              const isRefundCompleted =
                item.refund_status === "refunded" ||
                item.payment_status === "refunded";

              const effectiveEndDate =
                item.extension_status === "approved"
                  ? item.extension_end_date ||
                    item.extended_end_date ||
                    item.end_date
                  : item.end_date;
              const tripDays = getEffectiveTripDays(item);
              const tripDatesDisplay = formatPrettyTripDates(
                item.start_date,
                effectiveEndDate,
              );
              const extraExtensionPrice = Number(
                item.extension_price || item.extension_fee || 0,
              );

              return (
                <View style={styles.modernCard}>
                  {/* Top Row: Vehicle Thumbnail + Details + Status Badge */}
                  <View style={styles.cardHeaderRow}>
                    <Image
                      source={{ uri: vehicleImageUrl }}
                      style={styles.cardImageThumb}
                      contentFit="cover"
                      transition={200}
                    />

                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.hostBadgeRow}>
                        <Ionicons
                          name="shield-checkmark"
                          size={11}
                          color={Colors.primary}
                        />
                        <Text style={styles.hostBadgeText} numberOfLines={1}>
                          {operatorBusinessName}
                        </Text>
                      </View>

                      <Text style={styles.vehicleTitle} numberOfLines={1}>
                        {vehicleName}
                      </Text>

                      <View style={styles.datesRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color={Colors.secondary}
                        />
                        <Text style={styles.datesText} numberOfLines={1}>
                          {tripDatesDisplay} for {tripDays}{" "}
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

                  {/* Concise Metric Strip */}
                  <View style={styles.cardMetaStrip}>
                    <View style={styles.metaCol}>
                      <Text style={styles.metaLabel}>TOTAL AMOUNT</Text>
                      <Text style={styles.metaValue}>
                        ₱{Number(item.total_price).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaCol}>
                      {item.status === "pending_payment" ? (
                        <>
                          <Text style={styles.metaLabel}>RESERVATION FEE</Text>
                          <Text
                            style={[styles.metaValue, { color: "#D97706" }]}
                          >
                            ₱
                            {Number(
                              item.reservation_fee || 500,
                            ).toLocaleString()}
                          </Text>
                        </>
                      ) : item.balance_amount &&
                        Number(item.balance_amount) > 0 ? (
                        <>
                          <Text style={styles.metaLabel}>
                            REMAINING BALANCE
                          </Text>
                          <Text style={styles.metaValue}>
                            ₱{Number(item.balance_amount).toLocaleString()}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.metaLabel}>RETURN DATE</Text>
                          <Text style={styles.metaValue}>
                            {cleanDate(effectiveEndDate)}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Compact Status / Notice Pills */}
                  {item.extension_status === "payment_required" && (
                    <View style={styles.alertPillWarning}>
                      <Ionicons name="alert-circle" size={14} color="#D97706" />
                      <Text
                        style={styles.alertPillWarningText}
                        numberOfLines={1}
                      >
                        Extension fee due: ₱
                        {extraExtensionPrice.toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {["pending", "pending_verification"].includes(
                    item.extension_status || "",
                  ) && (
                    <View style={styles.alertPillInfo}>
                      <Ionicons name="time-outline" size={14} color="#2563EB" />
                      <Text style={styles.alertPillInfoText} numberOfLines={1}>
                        {item.extension_status === "pending_verification"
                          ? "Payment submitted — awaiting host verification"
                          : "Waiting for approval"}
                      </Text>
                    </View>
                  )}

                  {item.extension_status === "approved" && (
                    <View style={styles.alertPillSuccess}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color="#059669"
                      />
                      <Text
                        style={styles.alertPillSuccessText}
                        numberOfLines={1}
                      >
                        Rental extended until {cleanDate(effectiveEndDate)}
                      </Text>
                    </View>
                  )}

                  {item.status === "pending_verification" &&
                    !isRefundPending &&
                    !isRefundCompleted && (
                      <View style={styles.alertPillInfo}>
                        <Ionicons
                          name="hourglass-outline"
                          size={14}
                          color="#2563EB"
                        />
                        <Text
                          style={styles.alertPillInfoText}
                          numberOfLines={1}
                        >
                          Payment submitted
                        </Text>
                      </View>
                    )}

                  {isRefundPending && (
                    <View style={styles.alertPillDanger}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={14}
                        color="#DC2626"
                      />
                      <Text
                        style={styles.alertPillDangerText}
                        numberOfLines={1}
                      >
                        Refund Pending: ₱
                        {Number(
                          item.refund_amount || item.reservation_fee,
                        ).toLocaleString()}{" "}
                        to {item.renter_refund_method?.toUpperCase() || "GCash"}
                      </Text>
                    </View>
                  )}

                  {isRefundCompleted && (
                    <View style={styles.alertPillSuccess}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color="#059669"
                      />
                      <Text
                        style={styles.alertPillSuccessText}
                        numberOfLines={1}
                      >
                        Refund sent: ₱
                        {Number(
                          item.refund_amount || item.reservation_fee,
                        ).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {item.status === "no_show" && (
                    <View style={styles.alertPillMuted}>
                      <Ionicons
                        name="close-circle-outline"
                        size={14}
                        color="#6B7280"
                      />
                      <Text style={styles.alertPillMutedText} numberOfLines={1}>
                        Marked as No-Show
                      </Text>
                    </View>
                  )}

                  {(item.status === "trip_in_progress" ||
                    item.status === "ongoing" ||
                    item.status === "return_pending") && (
                    <View style={styles.alertPillLive}>
                      <Ionicons name="radio" size={12} color="#16A34A" />
                      <Text style={styles.alertPillLiveText} numberOfLines={1}>
                        GPS Active - Odo:{" "}
                        {item.start_mileage
                          ? `${item.start_mileage.toLocaleString()} km`
                          : "Logged"}{" "}
                        - Fuel:{" "}
                        {item.start_fuel_level !== undefined
                          ? `${item.start_fuel_level}%`
                          : "100%"}
                      </Text>
                    </View>
                  )}

                  {item.status === "completed" && (
                    <View style={styles.alertPillSuccess}>
                      <Ionicons
                        name="checkmark-done-circle"
                        size={14}
                        color="#059669"
                      />
                      <Text
                        style={styles.alertPillSuccessText}
                        numberOfLines={1}
                      >
                        Trip Completed
                        {item.distance_traveled
                          ? ` • ${item.distance_traveled.toLocaleString()} km`
                          : ""}
                        {Number(item.final_amount_due) > 0
                          ? ` • Final Paid: ₱${Number(item.final_amount_due).toLocaleString()}`
                          : ""}
                      </Text>
                    </View>
                  )}

                  {/* Dual Action Buttons Row */}
                  <View style={styles.dualActionRow}>
                    <TouchableOpacity
                      style={styles.outlineActionBtn}
                      activeOpacity={0.75}
                      onPress={() => setSelectedBookingForDetails(item)}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={14}
                        color={Colors.dark}
                      />
                      <Text style={styles.outlineActionText}>Details</Text>
                    </TouchableOpacity>

                    {item.extension_status === "payment_required" ? (
                      <TouchableOpacity
                        style={[
                          styles.primaryActionBtn,
                          { backgroundColor: "#D97706" },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => {
                          setExtPayRef("");
                          setExtPayRefError("");
                          setShowExtPayQr(false);
                          setSelectedBookingForExtensionPayment(item);
                        }}
                      >
                        <Ionicons name="card" size={14} color={Colors.white} />
                        <Text
                          style={[
                            styles.primaryActionText,
                            { color: Colors.white },
                          ]}
                        >
                          Pay extension
                        </Text>
                      </TouchableOpacity>
                    ) : item.status === "pending_payment" ? (
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
                          onPress={() => {
                            const curStart = parseDateString(item.start_date);
                            const curEnd = parseDateString(item.end_date);
                            const otherActiveOrSettled = bookings.find((b) => {
                              if (b.id === item.id) return false;
                              if (
                                [
                                  "completed",
                                  "cancelled",
                                  "rejected",
                                  "refunded",
                                  "no_show",
                                ].includes(b.status)
                              )
                                return false;
                              const isActiveStatus = [
                                "pending_verification",
                                "approved",
                                "awaiting_pickup",
                                "pickup_in_progress",
                                "ready_to_start",
                                "trip_in_progress",
                                "ongoing",
                                "return_pending",
                              ].includes(b.status);
                              if (!isActiveStatus) return false;
                              const bStart = parseDateString(b.start_date);
                              const bEnd = parseDateString(
                                b.extension_end_date ||
                                  b.extended_end_date ||
                                  b.end_date,
                              );
                              return bStart <= curEnd && bEnd >= curStart;
                            });

                            if (
                              otherActiveOrSettled &&
                              (!item.is_multi_vehicle_rental ||
                                !item.secondary_driver_name)
                            ) {
                              showModal(
                                "Multi-Vehicle Rental Policy",
                                "You already have an active vehicle reservation during overlapping trip dates. Renting and settling payment for multiple vehicles simultaneously requires designating an authorized secondary driver during booking.",
                                [{ text: "Understood", style: "default" }],
                                "warning",
                              );
                              return;
                            }

                            setPaymentRef("");
                            setPaymentRefError("");
                            setShowQrInline(false);
                            setSelectedBookingForPayment(item);
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="card" size={14} color={Colors.dark} />
                          <Text style={styles.primaryActionText}>
                            Settle Fee
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : item.status === "approved" ||
                      item.status === "awaiting_pickup" ||
                      item.status === "pickup_in_progress" ||
                      item.status === "ready_to_start" ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        <TouchableOpacity
                          style={[
                            styles.outlineActionBtn,
                            {
                              flex: 1,
                              borderColor: "#FDE68A",
                              backgroundColor: "#FFF9E6",
                            },
                          ]}
                          onPress={() => {
                            const curEnd = parseDateString(
                              item.extension_end_date ||
                                item.extended_end_date ||
                                item.end_date,
                            );
                            const nextEnd = new Date(curEnd);
                            nextEnd.setDate(curEnd.getDate() + 1);
                            setExtensionStartDate(curEnd);
                            setExtensionEndDate(nextEnd);
                            setExtensionDays(1);
                            setSelectedBookingForExtension(item);
                            setExtensionError("");
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="add-circle-outline"
                            size={14}
                            color={Colors.dark}
                          />
                          <Text
                            style={[
                              styles.outlineActionText,
                              { color: Colors.dark },
                            ]}
                          >
                            Extend
                          </Text>
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
                                address:
                                  item.pickup_location ||
                                  item.vehicle?.pickup_address ||
                                  "Pinamalayan, Oriental Mindoro",
                                latitude: item.vehicle?.pickup_latitude
                                  ? String(item.vehicle.pickup_latitude)
                                  : undefined,
                                longitude: item.vehicle?.pickup_longitude
                                  ? String(item.vehicle.pickup_longitude)
                                  : undefined,
                              },
                            } as any)
                          }
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="location"
                            size={14}
                            color={Colors.dark}
                          />
                          <Text style={styles.primaryActionText}>
                            Pickup Map
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : item.status === "trip_in_progress" ||
                      item.status === "ongoing" ||
                      item.status === "return_pending" ? (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        {item.extension_status !== "pending" &&
                          item.extension_status !== "payment_required" &&
                          item.extension_status !== "pending_verification" && (
                            <TouchableOpacity
                              style={[
                                styles.outlineActionBtn,
                                {
                                  flex: 1,
                                  borderColor: "#FDE68A",
                                  backgroundColor: "#FFF9E6",
                                },
                              ]}
                              onPress={() => {
                                const curEnd = parseDateString(
                                  item.extension_end_date ||
                                    item.extended_end_date ||
                                    item.end_date,
                                );
                                const nextEnd = new Date(curEnd);
                                nextEnd.setDate(curEnd.getDate() + 1);
                                setExtensionStartDate(curEnd);
                                setExtensionEndDate(nextEnd);
                                setExtensionDays(1);
                                setSelectedBookingForExtension(item);
                                setExtensionError("");
                              }}
                              activeOpacity={0.85}
                            >
                              <Ionicons
                                name="add-circle-outline"
                                size={14}
                                color={Colors.dark}
                              />
                              <Text
                                style={[
                                  styles.outlineActionText,
                                  { color: Colors.dark },
                                ]}
                              >
                                Extend
                              </Text>
                            </TouchableOpacity>
                          )}
                        <TouchableOpacity
                          style={[
                            styles.primaryActionBtn,
                            {
                              flex:
                                item.extension_status !== "pending" &&
                                item.extension_status !== "payment_required"
                                  ? 1.3
                                  : 1,
                            },
                          ]}
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
                          <Ionicons
                            name="navigate-circle"
                            size={15}
                            color={Colors.dark}
                          />
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
                        <Text style={styles.primaryActionText}>
                          Leave Review
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: "row", gap: 8, flex: 1 }}>
                        {isDeletable(item.status) && (
                          <TouchableOpacity
                            style={[
                              styles.dangerActionBtn,
                              { paddingHorizontal: 12 },
                            ]}
                            onPress={() => handleDeleteBooking(item)}
                            activeOpacity={0.75}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={13}
                              color="#991B1B"
                            />
                            <Text style={styles.dangerActionText}>Delete</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[
                            styles.outlineActionBtn,
                            { backgroundColor: "#F8FAFC", flex: 1 },
                          ]}
                          onPress={() =>
                            router.push({
                              pathname: `/chat/${item.operator_id}`,
                              params: { name: operatorBusinessName },
                            } as any)
                          }
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={14}
                            color={Colors.dark}
                          />
                          <Text style={styles.outlineActionText}>
                            Chat Host
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Modal 1: Rental Plan Details Bottom Sheet (Clean Professional Redesign) */}
        <AppBottomSheet
          visible={!!selectedBookingForDetails}
          onClose={() => setSelectedBookingForDetails(null)}
          position="bottom"
          showHandle={false}
          sheetStyle={[
            styles.modalCardLarge,
            { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24 },
          ]}
        >
          {/* Subtle Drag Handle */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 38,
                height: 4.5,
                borderRadius: 3,
                backgroundColor: "#E2E8F0",
              }}
            />
          </View>

          {/* Clean Top Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  fontFamily: FontFamily.bold,
                  fontSize: 25,
                  color: Colors.dark,
                  letterSpacing: -0.3,
                }}
              >
                Rental Details
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedBookingForDetails(null)}
              hitSlop={10}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={26} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {selectedBookingForDetails &&
              (() => {
                const b = selectedBookingForDetails;
                const vehicle = b.vehicle;
                const statusCfg = getStatusConfig(b);
                const tripDays = getEffectiveTripDays(b);
                const effectiveEnd =
                  b.extension_status === "approved" ||
                  b.extension_status === "payment_required"
                    ? b.extension_end_date || b.extended_end_date || b.end_date
                    : b.end_date;
                const dailyRate = Number(
                  vehicle?.price_per_day ||
                    vehicle?.daily_rate ||
                    b.daily_rate ||
                    (tripDays > 0 ? Number(b.total_price) / tripDays : 0) ||
                    1000,
                );
                const totalPrice = Number(b.total_price || 0);
                const depositFee = Math.max(
                  0,
                  Number(b.reservation_fee ?? 500),
                );
                const extPrice = Number(
                  b.extension_price || b.extension_fee || 0,
                );
                const extensionAlreadyPaid =
                  b.extension_status === "approved" && extPrice > 0;
                const rentalAmountRemaining = Math.max(
                  0,
                  totalPrice - (extensionAlreadyPaid ? extPrice : 0),
                );
                const balanceDue = Math.max(
                  0,
                  rentalAmountRemaining - depositFee,
                );
                const extensionPaymentDue =
                  b.extension_status === "payment_required";
                const refundInProgress =
                  b.payment_status === "refund_pending" ||
                  b.payment_status === "refunded";
                const depositSubmitted =
                  b.payment_status === "paid_reservation" ||
                  b.payment_status === "paid_full";
                const depositAwaitingVerification =
                  b.payment_status === "paid_reservation" &&
                  b.status === "pending_verification";
                const paymentStatusLabel = extensionPaymentDue
                  ? "Extension due"
                  : b.payment_status === "paid_full"
                    ? "Paid in full"
                    : b.payment_status === "paid_reservation"
                      ? depositAwaitingVerification
                        ? "Deposit submitted · awaiting verification"
                        : "Reservation deposit paid"
                      : b.payment_status === "refund_pending"
                        ? "Refund pending"
                        : b.payment_status === "refunded"
                          ? "Refunded"
                          : "Unpaid";
                const isPaid =
                  b.payment_status === "paid_full" && !extensionPaymentDue;
                const amountDue = refundInProgress
                  ? 0
                  : b.payment_status === "paid_full"
                    ? extensionPaymentDue
                      ? extPrice
                      : 0
                    : b.payment_status === "paid_reservation"
                      ? balanceDue + (extensionPaymentDue ? extPrice : 0)
                      : rentalAmountRemaining +
                        (extensionPaymentDue ? extPrice : 0);
                const depositDisplay = refundInProgress
                  ? b.payment_status === "refunded"
                    ? "Refunded"
                    : "Refund pending"
                  : depositAwaitingVerification
                    ? "Submitted · verifying"
                    : depositSubmitted
                      ? "Paid"
                      : `₱${depositFee.toLocaleString()} due now`;
                const operator = b.operator || (vehicle as any)?.operator;
                const operatorProfile =
                  operator?.operatorProfile ||
                  operator?.operator_profile ||
                  (vehicle as any)?.operator?.operatorProfile ||
                  (vehicle as any)?.operator?.operator_profile;
                const hostName =
                  operatorProfile?.business_name ||
                  operator?.business_name ||
                  (vehicle as any)?.operator?.business_name ||
                  operator?.first_name ||
                  "Vehicle Host";
                const hostPhone =
                  operator?.business_contact_number ||
                  operatorProfile?.business_contact_number ||
                  (vehicle as any)?.operator?.business_contact_number;
                const hostPhoto =
                  operator?.profile_photo ||
                  (vehicle as any)?.operator?.profile_photo;
                const hostPhotoUrl = resolveStorageUrl(hostPhoto);

                const steps = [
                  {
                    key: "reserved",
                    label: "Reserved",
                    icon: "calendar-outline" as const,
                  },
                  {
                    key: "confirmed",
                    label: "Confirmed",
                    icon: "checkmark-done-outline" as const,
                  },
                  {
                    key: "trip",
                    label: "On Trip",
                    icon: "car-outline" as const,
                  },
                  {
                    key: "returned",
                    label: "Returned",
                    icon: "flag-outline" as const,
                  },
                ];
                const stepIndex =
                  b.status === "completed"
                    ? 3
                    : [
                          "trip_in_progress",
                          "ongoing",
                          "return_pending",
                        ].includes(b.status as string)
                      ? 2
                      : [
                            "approved",
                            "awaiting_pickup",
                            "pickup_in_progress",
                            "ready_to_start",
                          ].includes(b.status as string)
                        ? 1
                        : 0;
                const sectionLabel = {
                  fontFamily: FontFamily.semiBold,
                  fontSize: 11,
                  color: "#94A3B8",
                  letterSpacing: 0.6,
                  textTransform: "uppercase" as const,
                  marginBottom: 10,
                };
                const card = {
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#EEF2F6",
                  padding: 16,
                };
                const row = {
                  flexDirection: "row" as const,
                  justifyContent: "space-between" as const,
                  alignItems: "center" as const,
                  paddingVertical: 6,
                };

                return (
                  <View style={{ gap: 14 }}>
                    {/* 1. Vehicle */}
                    <TouchableOpacity
                      style={[
                        card,
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          padding: 12,
                        },
                      ]}
                      activeOpacity={0.88}
                      onPress={() => {
                        if (b.vehicle_id) {
                          setSelectedBookingForDetails(null);
                          router.push(`/vehicles/${b.vehicle_id}` as any);
                        }
                      }}
                    >
                      <Image
                        source={{ uri: resolveVehicleImage(vehicle) }}
                        style={{
                          width: 72,
                          height: 56,
                          borderRadius: 12,
                          backgroundColor: "#F1F5F9",
                        }}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: FontFamily.bold,
                            fontSize: 15,
                            color: Colors.dark,
                          }}
                          numberOfLines={1}
                        >
                          {vehicle?.name || "Rental Vehicle"}
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.regular,
                            fontSize: 12,
                            color: Colors.secondary,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {vehicle?.transmission || "Automatic"} •{" "}
                          {vehicle?.seats || 5} Seats •{" "}
                          {vehicle?.fuel_type || "Gasoline"}
                        </Text>
                        <View
                          style={{
                            alignSelf: "flex-start",
                            marginTop: 6,
                            backgroundColor: statusCfg.bg,
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: FontFamily.semiBold,
                              fontSize: 11,
                              color: statusCfg.text,
                            }}
                          >
                            {statusCfg.label}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#CBD5E1"
                      />
                    </TouchableOpacity>

                    {/* 2. Milestones - horizontal stepper */}
                    <View style={card}>
                      <Text style={sectionLabel}>Rental Progress</Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                        }}
                      >
                        {steps.map((s, i) => {
                          const done = i <= stepIndex;
                          const current = i === stepIndex;
                          return (
                            <View
                              key={s.key}
                              style={{ flex: 1, alignItems: "center" }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  width: "100%",
                                }}
                              >
                                <View
                                  style={{
                                    flex: 1,
                                    height: 2,
                                    backgroundColor:
                                      i === 0
                                        ? "transparent"
                                        : done
                                          ? Colors.primary
                                          : "#E2E8F0",
                                  }}
                                />
                                <View
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: done
                                      ? Colors.primary
                                      : "#F1F5F9",
                                    borderWidth: current ? 2 : 0,
                                    borderColor: Colors.primary,
                                  }}
                                >
                                  <Ionicons
                                    name={s.icon}
                                    size={14}
                                    color={done ? Colors.white : "#94A3B8"}
                                  />
                                </View>
                                <View
                                  style={{
                                    flex: 1,
                                    height: 2,
                                    backgroundColor:
                                      i === steps.length - 1
                                        ? "transparent"
                                        : i < stepIndex
                                          ? Colors.primary
                                          : "#E2E8F0",
                                  }}
                                />
                              </View>
                              <Text
                                style={{
                                  fontFamily: current
                                    ? FontFamily.bold
                                    : FontFamily.medium,
                                  fontSize: 11,
                                  color: current
                                    ? Colors.dark
                                    : done
                                      ? Colors.secondary
                                      : "#94A3B8",
                                  marginTop: 6,
                                }}
                              >
                                {s.label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* 3. Schedule */}
                    <View style={card}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <Text style={[sectionLabel, { marginBottom: 0 }]}>
                          Schedule
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.bold,
                            fontSize: 12,
                            color: Colors.dark,
                          }}
                        >
                          {tripDays} {tripDays === 1 ? "day" : "days"}
                        </Text>
                      </View>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontFamily: FontFamily.regular,
                              fontSize: 11.5,
                              color: Colors.secondary,
                            }}
                          >
                            Pickup
                          </Text>
                          <Text
                            style={{
                              fontFamily: FontFamily.bold,
                              fontSize: 14,
                              color: Colors.dark,
                              marginTop: 2,
                            }}
                          >
                            {cleanDate(b.start_date)}
                          </Text>
                          <Text
                            style={{
                              fontFamily: FontFamily.regular,
                              fontSize: 12,
                              color: Colors.secondary,
                            }}
                          >
                            {b.actual_start_time
                              ? new Date(
                                  b.actual_start_time,
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "At pickup"}
                          </Text>
                        </View>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#CBD5E1"
                          style={{ marginHorizontal: 8 }}
                        />
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontFamily: FontFamily.regular,
                              fontSize: 11.5,
                              color: Colors.secondary,
                            }}
                          >
                            Return
                          </Text>
                          <Text
                            style={{
                              fontFamily: FontFamily.bold,
                              fontSize: 14,
                              color: Colors.dark,
                              marginTop: 2,
                            }}
                          >
                            {cleanDate(effectiveEnd)}
                          </Text>
                          <Text
                            style={{
                              fontFamily: FontFamily.regular,
                              fontSize: 12,
                              color: Colors.secondary,
                            }}
                          >
                            {b.actual_end_time
                              ? new Date(b.actual_end_time).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )
                              : "At return"}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={{
                          height: 1,
                          backgroundColor: "#F1F5F9",
                          marginVertical: 12,
                        }}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Ionicons
                          name="location-outline"
                          size={25}
                          color={Colors.secondary}
                        />
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: FontFamily.medium,
                            fontSize: 11,
                            color: Colors.dark,
                          }}
                          numberOfLines={2}
                        >
                          {b.pickup_location ||
                            vehicle?.pickup_address ||
                            "Pinamalayan, Oriental Mindoro"}
                        </Text>
                      </View>
                    </View>

                    {/* 4. Payment */}
                    <View style={card}>
                      <Text style={sectionLabel}>Payment</Text>
                      <View style={row}>
                        <Text
                          style={{
                            fontFamily: FontFamily.regular,
                            fontSize: 13,
                            color: Colors.secondary,
                          }}
                        >
                          Rental total
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.semiBold,
                            fontSize: 13,
                            color: Colors.dark,
                          }}
                        >
                          ₱{rentalAmountRemaining.toLocaleString()}
                        </Text>
                      </View>
                      <View style={row}>
                        <Text
                          style={{
                            fontFamily: FontFamily.regular,
                            fontSize: 13,
                            color: Colors.secondary,
                          }}
                        >
                          Reservation deposit
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.semiBold,
                            fontSize: 13,
                            color:
                              depositSubmitted && !depositAwaitingVerification
                                ? "#059669"
                                : "#D97706",
                          }}
                        >
                          {depositDisplay}
                        </Text>
                      </View>
                      <View style={row}>
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: FontFamily.regular,
                            fontSize: 13,
                            color: Colors.secondary,
                          }}
                        >
                          Rental balance
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.semiBold,
                            fontSize: 13,
                            color: Colors.dark,
                          }}
                        >
                          ₱
                          {(b.payment_status === "paid_full"
                            ? 0
                            : balanceDue
                          ).toLocaleString()}
                        </Text>
                      </View>
                      {b.extension_status === "approved" && extPrice > 0 ? (
                        <View style={row}>
                          <Text
                            style={{
                              fontFamily: FontFamily.regular,
                              fontSize: 13,
                              color: Colors.secondary,
                            }}
                          >
                            Extension +{b.extension_days || 1}d (paid)
                          </Text>
                          <Text
                            style={{
                              fontFamily: FontFamily.semiBold,
                              fontSize: 13,
                              color: Colors.dark,
                            }}
                          >
                            ₱{extPrice.toLocaleString()}
                          </Text>
                        </View>
                      ) : null}
                      <View style={row}>
                        <Text
                          style={{
                            fontFamily: FontFamily.regular,
                            fontSize: 13,
                            color: Colors.secondary,
                          }}
                        >
                          Payment status
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.semiBold,
                            fontSize: 13,
                            color:
                              isPaid ||
                              (depositSubmitted &&
                                !depositAwaitingVerification &&
                                !extensionPaymentDue)
                                ? "#059669"
                                : "#D97706",
                          }}
                        >
                          {paymentStatusLabel}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 1,
                          backgroundColor: "#F1F5F9",
                          marginVertical: 8,
                        }}
                      />
                      <View style={row}>
                        <Text
                          style={{
                            fontFamily: FontFamily.bold,
                            fontSize: 14,
                            color: Colors.dark,
                          }}
                        >
                          Total still outstanding
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.bold,
                            fontSize: 18,
                            color: Colors.dark,
                          }}
                        >
                          ₱{amountDue.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Return Inspection & Final Settlement (If completed or has inspection logged) */}
                    {(b.status === "completed" ||
                      (b.end_mileage !== null &&
                        b.end_mileage !== undefined)) && (
                      <View style={card}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          <Text style={[sectionLabel, { marginBottom: 0 }]}>
                            Trip Return Receipt
                          </Text>
                          <View
                            style={{
                              backgroundColor: "#ECFDF5",
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 10,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: FontFamily.semiBold,
                                fontSize: 11,
                                color: "#059669",
                              }}
                            >
                              Finalized
                            </Text>
                          </View>
                        </View>

                        {/* Mileage & Fuel summary */}
                        <View
                          style={{
                            flexDirection: "row",
                            backgroundColor: "#F8FAFC",
                            borderRadius: 8,
                            padding: 10,
                            marginBottom: 10,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontFamily: FontFamily.regular,
                                fontSize: 11,
                                color: Colors.secondary,
                              }}
                            >
                              Distance Traveled
                            </Text>
                            <Text
                              style={{
                                fontFamily: FontFamily.bold,
                                fontSize: 14,
                                color: Colors.dark,
                                marginTop: 2,
                              }}
                            >
                              {b.distance_traveled
                                ? `${b.distance_traveled.toLocaleString()} km`
                                : b.start_mileage && b.end_mileage
                                  ? `${Math.max(0, b.end_mileage - b.start_mileage).toLocaleString()} km`
                                  : "N/A"}
                            </Text>
                            <Text
                              style={{
                                fontFamily: FontFamily.regular,
                                fontSize: 10.5,
                                color: Colors.secondary,
                                marginTop: 1,
                              }}
                            >
                              {b.start_mileage?.toLocaleString() ?? 0} km →{" "}
                              {b.end_mileage?.toLocaleString() ?? 0} km
                            </Text>
                          </View>
                          <View
                            style={{
                              width: 1,
                              backgroundColor: "#E2E8F0",
                              marginHorizontal: 8,
                            }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontFamily: FontFamily.regular,
                                fontSize: 11,
                                color: Colors.secondary,
                              }}
                            >
                              Fuel Level (End)
                            </Text>
                            <Text
                              style={{
                                fontFamily: FontFamily.bold,
                                fontSize: 14,
                                color: Colors.dark,
                                marginTop: 2,
                              }}
                            >
                              {b.end_fuel_level !== undefined &&
                              b.end_fuel_level !== null
                                ? `${b.end_fuel_level}%`
                                : "100%"}
                            </Text>
                            <Text
                              style={{
                                fontFamily: FontFamily.regular,
                                fontSize: 10.5,
                                color: Colors.secondary,
                                marginTop: 1,
                              }}
                            >
                              Started at {b.start_fuel_level ?? 100}%
                            </Text>
                          </View>
                        </View>

                        {/* Itemized Surcharges if any */}
                        {(Number(b.fuel_charge) > 0 ||
                          Number(b.damage_charge) > 0 ||
                          Number(b.late_fee) > 0 ||
                          Number(b.other_charges) > 0) && (
                          <View
                            style={{
                              marginBottom: 8,
                              paddingBottom: 8,
                              borderBottomWidth: 1,
                              borderBottomColor: "#F1F5F9",
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: FontFamily.bold,
                                fontSize: 12,
                                color: Colors.dark,
                                marginBottom: 6,
                              }}
                            >
                              Additional Charges Assessed
                            </Text>
                            {Number(b.fuel_charge) > 0 && (
                              <View style={row}>
                                <Text
                                  style={{
                                    fontFamily: FontFamily.regular,
                                    fontSize: 12.5,
                                    color: Colors.secondary,
                                  }}
                                >
                                  Fuel replenishment fee
                                </Text>
                                <Text
                                  style={{
                                    fontFamily: FontFamily.semiBold,
                                    fontSize: 12.5,
                                    color: Colors.dark,
                                  }}
                                >
                                  ₱{Number(b.fuel_charge).toLocaleString()}
                                </Text>
                              </View>
                            )}
                            {Number(b.damage_charge) > 0 && (
                              <View style={row}>
                                <Text
                                  style={{
                                    fontFamily: FontFamily.regular,
                                    fontSize: 12.5,
                                    color: Colors.secondary,
                                  }}
                                >
                                  Damage / repair assessment
                                </Text>
                                <Text
                                  style={{
                                    fontFamily: FontFamily.semiBold,
                                    fontSize: 12.5,
                                    color: Colors.dark,
                                  }}
                                >
                                  ₱{Number(b.damage_charge).toLocaleString()}
                                </Text>
                              </View>
                            )}
                            {Number(b.late_fee) > 0 && (
                              <View style={row}>
                                <Text
                                  style={{
                                    fontFamily: FontFamily.regular,
                                    fontSize: 12.5,
                                    color: Colors.secondary,
                                  }}
                                >
                                  Late return surcharge
                                </Text>
                                <Text
                                  style={{
                                    fontFamily: FontFamily.semiBold,
                                    fontSize: 12.5,
                                    color: Colors.dark,
                                  }}
                                >
                                  ₱{Number(b.late_fee).toLocaleString()}
                                </Text>
                              </View>
                            )}
                            {Number(b.other_charges) > 0 && (
                              <View style={row}>
                                <Text
                                  style={{
                                    fontFamily: FontFamily.regular,
                                    fontSize: 12.5,
                                    color: Colors.secondary,
                                  }}
                                >
                                  Other miscellaneous fees
                                </Text>
                                <Text
                                  style={{
                                    fontFamily: FontFamily.semiBold,
                                    fontSize: 12.5,
                                    color: Colors.dark,
                                  }}
                                >
                                  ₱{Number(b.other_charges).toLocaleString()}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}

                        {/* Final Amount Settled at Handover */}
                        {b.final_amount_due !== undefined &&
                          b.final_amount_due !== null && (
                            <View style={row}>
                              <Text
                                style={{
                                  fontFamily: FontFamily.bold,
                                  fontSize: 13,
                                  color: Colors.dark,
                                }}
                              >
                                Final Balance Settled
                              </Text>
                              <Text
                                style={{
                                  fontFamily: FontFamily.bold,
                                  fontSize: 15,
                                  color: "#059669",
                                }}
                              >
                                ₱{Number(b.final_amount_due).toLocaleString()}
                              </Text>
                            </View>
                          )}

                        {/* Remarks */}
                        {b.end_inspection_notes && (
                          <View
                            style={{
                              marginTop: 8,
                              backgroundColor: "#F8FAFC",
                              borderRadius: 6,
                              padding: 8,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: FontFamily.regular,
                                fontSize: 11,
                                color: Colors.secondary,
                              }}
                            >
                              Inspection remarks:{" "}
                              <Text style={{ color: Colors.dark }}>
                                {b.end_inspection_notes}
                              </Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* 5. Host */}
                    <View
                      style={[
                        card,
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          padding: 12,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          minWidth: 0,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                        }}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${hostName}'s host profile`}
                        onPress={() => {
                          const operatorId = b.operator_id || operator?.id;
                          if (!operatorId) return;
                          setSelectedBookingForDetails(null);
                          router.push({
                            pathname: "/operator/[id]",
                            params: { id: String(operatorId) },
                          } as any);
                        }}
                      >
                        {hostPhotoUrl ? (
                          <Image
                            source={{ uri: hostPhotoUrl }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: "#F1F5F9",
                            }}
                            contentFit="cover"
                          />
                        ) : (
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: Colors.logoBackground,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: FontFamily.bold,
                                fontSize: 15,
                                color: Colors.dark,
                              }}
                            >
                              {(hostName || "H")[0]?.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{
                              fontFamily: FontFamily.bold,
                              fontSize: 13.5,
                              color: Colors.dark,
                            }}
                            numberOfLines={1}
                          >
                            {hostName}
                          </Text>
                          <Text
                            style={{
                              fontFamily: FontFamily.regular,
                              fontSize: 11.5,
                              color: Colors.secondary,
                            }}
                          >
                            View host profile
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={Colors.secondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: "#F1F5F9",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => {
                          const opId = b.operator_id || operator?.id;
                          if (opId) {
                            startCall({
                              id: opId,
                              name: hostName,
                              role: "operator",
                              profile_photo: hostPhotoUrl,
                            });
                          } else if (hostPhone) {
                            Linking.openURL(`tel:${hostPhone}`);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call" size={16} color={Colors.dark} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 19,
                          backgroundColor: Colors.primary,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onPress={() => {
                          const opId = b.operator_id;
                          setSelectedBookingForDetails(null);
                          router.push({
                            pathname: `/chat/${opId}`,
                            params: { name: hostName },
                          } as any);
                        }}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={16}
                          color={Colors.dark}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })()}
          </ScrollView>
        </AppBottomSheet>

        {/* Modal 2: Payment & Fee Settlement with Host */}
        <AppBottomSheet
          visible={!!selectedBookingForPayment}
          onClose={() => {
            setSelectedBookingForPayment(null);
            setShowQrInline(false);
            setPaymentRef("");
            setPaymentRefError("");
          }}
          position="bottom"
          showHandle={false}
          sheetStyle={[
            styles.modalCardLarge,
            { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
          ]}
        >
          <View style={styles.depositSheetHeader}>
            <Text style={styles.depositSheetTitle}>Payments</Text>
            <TouchableOpacity
              style={styles.depositCloseButton}
              onPress={() => {
                setSelectedBookingForPayment(null);
                setShowQrInline(false);
                setPaymentRef("");
                setPaymentRefError("");
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close payment sheet"
            >
              <Ionicons name="close" size={22} color={Colors.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={paymentScrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
            contentContainerStyle={{ paddingBottom: 12 }}
            onScroll={(event) => {
              if (focusedScrollRef.current === paymentScrollRef.current) {
                focusedScrollOffsetRef.current =
                  event.nativeEvent.contentOffset.y;
              }
            }}
            scrollEventThrottle={16}
          >
            <View style={styles.depositPriceRow}>
              <View style={styles.depositPriceLabelGroup}>
                <Text style={styles.depositPriceLabel}>Reservation Fee</Text>
              </View>
              <Text style={styles.depositPriceAmount}>
                ₱
                {Number(
                  selectedBookingForPayment?.reservation_fee ?? 500,
                ).toLocaleString()}
              </Text>
            </View>

            <View style={styles.depositPriceRule} />

            <View style={styles.depositPriceRow}>
              <Text style={styles.depositPriceLabel}>Rental total</Text>
              <Text style={styles.depositPriceValue}>
                ₱
                {Number(
                  selectedBookingForPayment?.total_price || 0,
                ).toLocaleString()}
              </Text>
            </View>
            <View style={styles.depositPriceRow}>
              <View style={styles.depositPriceLabelGroup}>
                <Text style={styles.depositPriceLabel}>Balance at pickup</Text>
                <Text style={styles.depositPriceCaption}>
                  Due before key handover
                </Text>
              </View>
              <Text style={styles.depositPriceValue}>
                ₱
                {Math.max(
                  0,
                  Number(selectedBookingForPayment?.total_price || 0) -
                    Number(selectedBookingForPayment?.reservation_fee ?? 500),
                ).toLocaleString()}
              </Text>
            </View>

            <View style={styles.depositPriceRule} />

            {/* 2. DEDICATED GCASH PAYMENT DESTINATION */}
            {(() => {
              const pInfo =
                selectedBookingForPayment?.operator_payment_info ||
                selectedBookingForPayment?.operator?.operator_profile ||
                selectedBookingForPayment?.operator?.operatorProfile ||
                selectedBookingForPayment?.vehicle?.operator?.operator_profile;

              const hostName =
                selectedBookingForPayment?.operator?.operator_profile
                  ?.business_name ||
                selectedBookingForPayment?.operator?.first_name ||
                "Vehicle Host";

              const hostNumber = pInfo?.account_number || "";

              return (
                <View style={styles.depositPaymentSection}>
                  <View style={styles.depositRecipientRow}>
                    <Image
                      source={GCASH_IMG}
                      style={styles.depositGcashLogo}
                      contentFit="cover"
                    />
                    <View style={styles.depositRecipientInfo}>
                      <Text
                        style={styles.depositRecipientName}
                        numberOfLines={1}
                      >
                        {pInfo?.account_name || hostName}
                      </Text>
                      <Text style={styles.depositRecipientNumber}>
                        {hostNumber || "Contact host for GCash number"}
                      </Text>
                    </View>

                    {hostNumber ? (
                      <TouchableOpacity
                        style={[
                          styles.depositCopyButton,
                          copiedPhone && styles.depositCopyButtonSuccess,
                        ]}
                        onPress={() => handleCopyNumber(hostNumber)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={copiedPhone ? "checkmark" : "copy-outline"}
                          size={13}
                          color={copiedPhone ? "#047857" : Colors.dark}
                        />
                        <Text
                          style={{
                            fontFamily: FontFamily.semiBold,
                            fontSize: 11,
                            color: copiedPhone ? "#047857" : Colors.dark,
                          }}
                        >
                          {copiedPhone ? "Copied" : "Copy"}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Optional QR payment instructions */}
                  {pInfo?.qr_code_url ? (
                    <View style={{ marginBottom: 14 }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: showQrInline
                            ? Colors.logoBackground
                            : "transparent",
                          paddingHorizontal: 2,
                          paddingVertical: 8,
                        }}
                        onPress={() => setShowQrInline((prev) => !prev)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            flex: 1,
                          }}
                        >
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: Colors.logoBackground,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Ionicons
                              name="qr-code"
                              size={18}
                              color={Colors.dark}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontFamily: FontFamily.bold,
                                fontSize: 13,
                                color: Colors.dark,
                              }}
                            >
                              {showQrInline
                                ? "Hide QR code"
                                : "Pay with QR code"}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={showQrInline ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={Colors.secondary}
                        />
                      </TouchableOpacity>

                      {/* Prominent Inline QR View */}
                      {showQrInline ? (
                        <View
                          style={{
                            marginTop: 10,
                            backgroundColor: Colors.white,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: Colors.border,
                            padding: 14,
                            alignItems: "center",
                          }}
                        >
                          {/* Prominent QR Container */}
                          <View
                            style={{
                              backgroundColor: Colors.white,
                              padding: 8,
                              borderRadius: 14,
                              borderWidth: 1,
                              borderColor: Colors.border,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.08,
                              shadowRadius: 6,
                              elevation: 2,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Image
                              source={{ uri: pInfo.qr_code_url }}
                              style={{
                                width: 150,
                                height: 150,
                                borderRadius: 8,
                              }}
                              contentFit="contain"
                            />
                          </View>

                          {/* Save to Gallery Button */}
                          <TouchableOpacity
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              backgroundColor: qrSavedSuccess
                                ? "#FFF6DA"
                                : Colors.primary,
                              borderRadius: 10,
                              paddingVertical: 11,
                              paddingHorizontal: 16,
                              marginTop: 10,
                              width: "100%",
                              borderWidth: 1,
                              borderColor: qrSavedSuccess
                                ? "#FDE68A"
                                : Colors.primary,
                              opacity: savingQr ? 0.7 : 1,
                            }}
                            onPress={() => handleSaveQr(pInfo.qr_code_url!)}
                            disabled={savingQr}
                            activeOpacity={0.8}
                          >
                            {savingQr ? (
                              <ActivityIndicator
                                size="small"
                                color={Colors.dark}
                              />
                            ) : qrSavedSuccess ? (
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color="#92400E"
                              />
                            ) : (
                              <Ionicons
                                name="download-outline"
                                size={18}
                                color={Colors.dark}
                              />
                            )}
                            <Text
                              style={{
                                fontFamily: FontFamily.bold,
                                fontSize: 12,
                                color: qrSavedSuccess ? "#92400E" : Colors.dark,
                              }}
                            >
                              {savingQr
                                ? "Saving to Gallery..."
                                : qrSavedSuccess
                                  ? "Saved to Gallery!"
                                  : "Save QR Code"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Reference Input */}
                  <View style={styles.depositReferenceSection}>
                    <Text style={styles.depositReferenceTitle}>
                      Payment reference number
                    </Text>
                    <TextInput
                      ref={paymentRefInputRef}
                      style={[
                        styles.depositReferenceInput,
                        paymentRefError && styles.depositReferenceInputError,
                      ]}
                      placeholder="Reference number"
                      placeholderTextColor={Colors.secondary}
                      keyboardType="number-pad"
                      value={paymentRef}
                      onFocus={() =>
                        focusPaymentField(
                          paymentRefInputRef.current,
                          paymentScrollRef.current,
                        )
                      }
                      onChangeText={(val) => {
                        setPaymentRef(val);
                        if (paymentRefError) setPaymentRefError("");
                      }}
                    />
                    {paymentRefError ? (
                      <View style={styles.depositReferenceError}>
                        <Ionicons
                          name="alert-circle"
                          size={14}
                          color={Colors.error}
                        />
                        <Text style={styles.depositReferenceErrorText}>
                          {paymentRefError}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })()}

            {/* 4. PRIMARY ACTION BUTTON */}
            <View style={styles.depositSubmitDivider} />
            <TouchableOpacity
              style={{
                backgroundColor: Colors.primary,
                borderRadius: 12,
                height: 46,
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
                  <ActivityIndicator size="small" color={Colors.dark} />
                  <Text
                    style={{
                      fontFamily: FontFamily.bold,
                      fontSize: 13,
                      color: Colors.dark,
                    }}
                  >
                    Sending Notice...
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      fontFamily: FontFamily.bold,
                      fontSize: 20,
                      color: Colors.dark,
                    }}
                  >
                    Submit
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* 5. SUBTLE CHAT LINK */}
            <TouchableOpacity
              style={styles.depositChatLink}
              onPress={() =>
                selectedBookingForPayment &&
                handleChatOperatorForPayment(selectedBookingForPayment)
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color={Colors.secondary}
              />
              <Text
                style={{
                  fontFamily: FontFamily.medium,
                  fontSize: 12.5,
                  color: Colors.secondary,
                }}
              >
                Have questions? Chat with host
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </AppBottomSheet>

        {/* Modal 3: Review Modal */}
        <AppBottomSheet
          visible={!!selectedBookingForReview}
          onClose={() => setSelectedBookingForReview(null)}
          position="bottom"
          showHandle={true}
          sheetStyle={styles.modalCard}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rate Your Rental Trip</Text>
            <TouchableOpacity onPress={() => setSelectedBookingForReview(null)}>
              <Ionicons
                name="close-circle"
                size={24}
                color={Colors.secondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={reviewScrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
            contentContainerStyle={{ paddingBottom: 24 }}
            onScroll={(event) => {
              if (focusedScrollRef.current === reviewScrollRef.current) {
                focusedScrollOffsetRef.current =
                  event.nativeEvent.contentOffset.y;
              }
            }}
            scrollEventThrottle={16}
          >
            <Text style={styles.modalSub}>
              How was your experience with{" "}
              {selectedBookingForReview?.vehicle?.name}?
            </Text>

            {/* Star Selector */}
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                >
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
              ref={reviewInputRef}
              style={[
                styles.modalInput,
                { height: 90, textAlignVertical: "top", paddingTop: 10 },
              ]}
              placeholder="Vehicle condition, handover punctuality, host friendliness..."
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              blurOnSubmit={false}
              onFocus={() =>
                focusPaymentField(
                  reviewInputRef.current,
                  reviewScrollRef.current,
                )
              }
            />

            <View style={{ marginTop: Spacing.lg }}>
              <PrimaryButton
                title={submittingReview ? "Submitting..." : "Submit Review"}
                onPress={handleSubmitReview}
                loading={submittingReview}
              />
            </View>
          </ScrollView>
        </AppBottomSheet>

        {/* Modal 4: Rental Extension Schedule Request Modal (Redesigned) */}
        <AppBottomSheet
          visible={!!selectedBookingForExtension}
          onClose={() => {
            setSelectedBookingForExtension(null);
            setExtensionError("");
          }}
          position="bottom"
          showHandle={false}
          sheetStyle={[
            styles.modalCardLarge,
            { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24 },
          ]}
        >
          {/* Subtle Top Drag Handle */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 38,
                height: 4.5,
                borderRadius: 3,
                backgroundColor: "#E2E8F0",
              }}
            />
          </View>

          {/* Clean Top Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text
                style={{
                  fontFamily: FontFamily.bold,
                  fontSize: 19,
                  color: Colors.dark,
                  letterSpacing: -0.3,
                }}
              >
                Request Trip Extension
              </Text>
              <Text
                style={{
                  fontFamily: FontFamily.regular,
                  fontSize: 12,
                  color: Colors.secondary,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {selectedBookingForExtension?.vehicle?.name || "Vehicle Rental"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedBookingForExtension(null);
                setExtensionError("");
              }}
              hitSlop={10}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={26} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
            contentContainerStyle={{ paddingBottom: 36 }}
          >
            {(() => {
              if (!selectedBookingForExtension) return null;
              const b = selectedBookingForExtension;
              const effectiveEndStr =
                b.extension_end_date || b.extended_end_date || b.end_date;
              const curBookingEnd = parseDateString(effectiveEndStr);
              const minExtensionDate = new Date(curBookingEnd);
              minExtensionDate.setDate(curBookingEnd.getDate() + 1);

              const dailyRate = Number(
                b.vehicle?.price_per_day ||
                  b.vehicle?.daily_rate ||
                  b.daily_rate ||
                  1000,
              );
              const extraAmount = dailyRate * extensionDays;
              const newEndDateStr = formatLocalDate(extensionEndDate);

              return (
                <View style={{ gap: 14 }}>
                  {/* Calendar & Time Selector (Kept exactly as requested: 2 columns Current Pickup & Return) */}
                  <TripDateTimeSelector
                    startDate={extensionStartDate}
                    endDate={extensionEndDate}
                    startTime={extensionStartTime}
                    endTime={extensionEndTime}
                    isExtensionOnly={true}
                    minDate={minExtensionDate}
                    onDateTimeChange={(s, e, sTime, eTime) => {
                      const cur = parseDateString(effectiveEndStr);
                      cur.setHours(0, 0, 0, 0);

                      const checkEnd = new Date(e);
                      checkEnd.setHours(0, 0, 0, 0);

                      let validEnd = e;
                      if (checkEnd.getTime() <= cur.getTime()) {
                        validEnd = new Date(cur);
                        validEnd.setDate(cur.getDate() + 1);
                      }
                      setExtensionStartDate(cur);
                      setExtensionEndDate(validEnd);
                      setExtensionStartTime(sTime);
                      setExtensionEndTime(eTime);
                      const diff = Math.max(
                        1,
                        Math.round(
                          (validEnd.getTime() - cur.getTime()) /
                            (1000 * 60 * 60 * 24),
                        ),
                      );
                      setExtensionDays(diff);
                    }}
                  />

                  {/* Sleek Extension Summary Bar */}
                  <View
                    style={{
                      backgroundColor: "#F8FAFC",
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            fontFamily: FontFamily.regular,
                            fontSize: 11,
                            color: "#64748B",
                          }}
                        >
                          Daily Rate
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.semiBold,
                            fontSize: 12.5,
                            color: Colors.dark,
                          }}
                        >
                          ₱{dailyRate.toLocaleString()}/day
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontFamily: FontFamily.regular,
                          fontSize: 11,
                          color: "#64748B",
                        }}
                      >
                        Est. Extension Fee
                      </Text>
                      <Text
                        style={{
                          fontFamily: FontFamily.bold,
                          fontSize: 16.5,
                          color: Colors.dark,
                        }}
                      >
                        ₱{extraAmount.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Host Approval Protocol Notice */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: "#F0FDF4",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: "#BBF7D0",
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={18}
                      color="#15803D"
                    />
                    <Text
                      style={{
                        fontFamily: FontFamily.regular,
                        fontSize: 11.5,
                        color: "#166534",
                        flex: 1,
                        lineHeight: 16,
                      }}
                    >
                      Pay only after host approval.
                    </Text>
                  </View>

                  {extensionError ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: "#FEF2F2",
                        borderWidth: 1,
                        borderColor: "#FECACA",
                        borderRadius: 12,
                        padding: 10,
                      }}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={Colors.error}
                      />
                      <Text
                        style={{
                          fontFamily: FontFamily.medium,
                          fontSize: 12,
                          color: Colors.error,
                          flex: 1,
                        }}
                      >
                        {extensionError}
                      </Text>
                    </View>
                  ) : null}

                  {/* Submit Button */}
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
                    onPress={handleRequestExtension}
                    disabled={submittingExtension}
                    activeOpacity={0.88}
                  >
                    {submittingExtension ? (
                      <>
                        <ActivityIndicator size="small" color={Colors.dark} />
                        <Text
                          style={{
                            fontFamily: FontFamily.bold,
                            fontSize: 14,
                            color: Colors.dark,
                          }}
                        >
                          Submitting Request...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text
                          style={{
                            fontFamily: FontFamily.bold,
                            fontSize: 19,
                            color: Colors.dark,
                          }}
                        >
                          Confirm Extension
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })()}
          </ScrollView>
        </AppBottomSheet>

        {/* Modal 5: Settle Extension Fee Modal (GCash) - Redesigned Clean & Modern */}
        <AppBottomSheet
          visible={!!selectedBookingForExtensionPayment}
          onClose={() => {
            setSelectedBookingForExtensionPayment(null);
            setShowExtPayQr(false);
            setExtPayRef("");
            setExtPayRefError("");
          }}
          position="bottom"
          showHandle={false}
          sheetStyle={[
            styles.modalCardLarge,
            {
              paddingHorizontal: 20,
              paddingTop: 14,
              paddingBottom: 24,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            },
          ]}
        >
          {/* Top Handle */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#E2E8F0",
              }}
            />
          </View>

          {/* Modal Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={{
                  fontFamily: FontFamily.bold,
                  fontSize: 18,
                  color: Colors.dark,
                }}
              >
                Settle Trip Extension
              </Text>
              <Text
                style={{
                  fontFamily: FontFamily.regular,
                  fontSize: 12,
                  color: Colors.secondary,
                  marginTop: 2,
                }}
              >
                Pay the approved extension fee.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedBookingForExtensionPayment(null);
                setShowExtPayQr(false);
                setExtPayRef("");
                setExtPayRefError("");
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={extPayScrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={true}
            contentContainerStyle={{ paddingBottom: 30 }}
            onScroll={(event) => {
              if (focusedScrollRef.current === extPayScrollRef.current) {
                focusedScrollOffsetRef.current =
                  event.nativeEvent.contentOffset.y;
              }
            }}
            scrollEventThrottle={16}
          >
            {(() => {
              if (!selectedBookingForExtensionPayment) return null;
              const extraAmount = Number(
                selectedBookingForExtensionPayment.extension_price ||
                  selectedBookingForExtensionPayment.extension_fee ||
                  0,
              );
              const extraDays =
                selectedBookingForExtensionPayment.extension_days || 1;
              const newEndDateStr = cleanDate(
                selectedBookingForExtensionPayment.extension_end_date ||
                  selectedBookingForExtensionPayment.extended_end_date ||
                  selectedBookingForExtensionPayment.end_date,
              );

              const operator =
                selectedBookingForExtensionPayment.operator ||
                (selectedBookingForExtensionPayment.vehicle as any)?.operator;
              const operatorProfile =
                operator?.operatorProfile ||
                operator?.operator_profile ||
                (selectedBookingForExtensionPayment.vehicle as any)?.operator
                  ?.operatorProfile ||
                (selectedBookingForExtensionPayment.vehicle as any)?.operator
                  ?.operator_profile;
              const operatorPayment =
                selectedBookingForExtensionPayment.operator_payment_info;

              const businessName =
                operatorProfile?.business_name ||
                operator?.business_name ||
                "Host";

              const accountName =
                operatorPayment?.account_name ||
                operatorProfile?.account_name ||
                businessName ||
                "Operator Account";

              const accountNumber =
                operatorPayment?.account_number ||
                operatorProfile?.account_number ||
                "";
              const qrCodeUrl =
                operatorPayment?.qr_code_url || operatorProfile?.qr_code;

              return (
                <View>
                  {/* Clean Hero Extension Amount Card */}
                  <View
                    style={{
                      backgroundColor: Colors.logoBackground,
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: FontFamily.medium,
                        fontSize: 12,
                        color: Colors.secondary,
                      }}
                    >
                      Extension fee
                    </Text>
                    <Text
                      style={{
                        fontFamily: FontFamily.bold,
                        fontSize: 30,
                        color: Colors.dark,
                        letterSpacing: -0.5,
                        marginTop: 2,
                      }}
                    >
                      ₱{extraAmount.toLocaleString()}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: FontFamily.regular,
                          fontSize: 12,
                          color: Colors.secondary,
                        }}
                        numberOfLines={1}
                      >
                        {selectedBookingForExtensionPayment.vehicle?.name ||
                          `${extraDays} additional ${extraDays === 1 ? "day" : "days"}`}
                      </Text>
                      <Text
                        style={{
                          fontFamily: FontFamily.semiBold,
                          fontSize: 12,
                          color: Colors.dark,
                        }}
                      >
                        Until {newEndDateStr}
                      </Text>
                    </View>
                  </View>

                  {/* Host payment details */}
                  <View
                    style={{
                      backgroundColor: Colors.white,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      padding: 14,
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Image
                          source={GCASH_IMG}
                          style={{ width: 34, height: 34, borderRadius: 8 }}
                          contentFit="cover"
                        />
                        <View>
                          <Text
                            style={{
                              fontFamily: FontFamily.bold,
                              fontSize: 14,
                              color: Colors.dark,
                            }}
                          >
                            GCash
                          </Text>
                          <Text
                            style={{
                              fontFamily: FontFamily.regular,
                              fontSize: 11,
                              color: Colors.secondary,
                            }}
                          >
                            {businessName}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Account Details Box */}
                    <View
                      style={{
                        backgroundColor: Colors.white,
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: FontFamily.regular,
                            fontSize: 11,
                            color: Colors.secondary,
                          }}
                        >
                          Account name
                        </Text>
                        <Text
                          style={{
                            fontFamily: FontFamily.semiBold,
                            fontSize: 12.5,
                            color: Colors.dark,
                          }}
                        >
                          {accountName}
                        </Text>
                      </View>

                      <View
                        style={{
                          height: 1,
                          backgroundColor: "#F1F5F9",
                          marginVertical: 6,
                        }}
                      />

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View>
                          <Text
                            style={{
                              fontFamily: FontFamily.regular,
                              fontSize: 11,
                              color: Colors.secondary,
                            }}
                          >
                            Account number
                          </Text>
                          <Text
                            style={{
                              fontFamily: FontFamily.bold,
                              fontSize: 15,
                              color: Colors.dark,
                              marginTop: 1,
                              letterSpacing: 0.5,
                            }}
                          >
                            {accountNumber || "Contact host"}
                          </Text>
                        </View>

                        {accountNumber ? (
                          <TouchableOpacity
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 5,
                              backgroundColor: copiedExtPayPhone
                                ? Colors.primary
                                : Colors.dark,
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 8,
                            }}
                            onPress={async () => {
                              await copyToClipboard(accountNumber);
                              setCopiedExtPayPhone(true);
                              showSuccess(
                                "Copied",
                                `${accountNumber} copied to clipboard!`,
                              );
                              setTimeout(
                                () => setCopiedExtPayPhone(false),
                                2000,
                              );
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={
                                copiedExtPayPhone ? "checkmark" : "copy-outline"
                              }
                              size={13}
                              color={
                                copiedExtPayPhone ? Colors.dark : "#FFFFFF"
                              }
                            />
                            <Text
                              style={{
                                fontFamily: FontFamily.bold,
                                fontSize: 11.5,
                                color: copiedExtPayPhone
                                  ? Colors.dark
                                  : "#FFFFFF",
                              }}
                            >
                              {copiedExtPayPhone ? "Copied" : "Copy"}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>

                    {/* Optional QR Code View */}
                    {qrCodeUrl ? (
                      <View>
                        <TouchableOpacity
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1,
                            borderColor: showExtPayQr
                              ? Colors.primary
                              : Colors.border,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                          }}
                          onPress={() => setShowExtPayQr((prev) => !prev)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Ionicons
                              name="qr-code-outline"
                              size={16}
                              color={Colors.dark}
                            />
                            <Text
                              style={{
                                fontFamily: FontFamily.semiBold,
                                fontSize: 12.5,
                                color: Colors.dark,
                              }}
                            >
                              {showExtPayQr ? "Hide QR code" : "Show QR code"}
                            </Text>
                          </View>
                          <Ionicons
                            name={showExtPayQr ? "chevron-up" : "chevron-down"}
                            size={16}
                            color="#64748B"
                          />
                        </TouchableOpacity>

                        {showExtPayQr ? (
                          <View
                            style={{
                              marginTop: 8,
                              backgroundColor: "#FFFFFF",
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: "#E2E8F0",
                              padding: 14,
                              alignItems: "center",
                            }}
                          >
                            <Image
                              source={{ uri: qrCodeUrl }}
                              style={{
                                width: 190,
                                height: 190,
                                borderRadius: 8,
                              }}
                              contentFit="contain"
                            />
                            <TouchableOpacity
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                backgroundColor: qrSavedSuccess
                                  ? Colors.primary
                                  : Colors.dark,
                                borderRadius: 8,
                                paddingVertical: 8,
                                paddingHorizontal: 14,
                                marginTop: 10,
                              }}
                              onPress={() => handleSaveQr(qrCodeUrl)}
                              disabled={savingQr}
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name={
                                  qrSavedSuccess
                                    ? "checkmark"
                                    : "download-outline"
                                }
                                size={14}
                                color={qrSavedSuccess ? Colors.dark : "#FFFFFF"}
                              />
                              <Text
                                style={{
                                  fontFamily: FontFamily.bold,
                                  fontSize: 12,
                                  color: qrSavedSuccess
                                    ? Colors.dark
                                    : "#FFFFFF",
                                }}
                              >
                                {savingQr
                                  ? "Saving..."
                                  : qrSavedSuccess
                                    ? "Saved to Gallery"
                                    : "Save QR Code"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>

                  {/* Reference Number Section */}
                  <View style={{ marginBottom: 18 }}>
                    <Text
                      style={{
                        fontFamily: FontFamily.bold,
                        fontSize: 12.5,
                        color: Colors.dark,
                        marginBottom: 6,
                      }}
                    >
                      Payment reference number
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: Colors.white,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: extPayRefError
                          ? Colors.error
                          : extPayRef
                            ? Colors.primary
                            : Colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: Platform.OS === "ios" ? 12 : 9,
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name="receipt-outline"
                        size={17}
                        color="#64748B"
                      />
                      <TextInput
                        ref={extPayRefInputRef}
                        style={{
                          flex: 1,
                          fontFamily: FontFamily.semiBold,
                          fontSize: 14,
                          color: Colors.dark,
                        }}
                        placeholder="e.g. 0046 018 218906"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={extPayRef}
                        onFocus={() =>
                          focusPaymentField(
                            extPayRefInputRef.current,
                            extPayScrollRef.current,
                          )
                        }
                        onChangeText={(val) => {
                          setExtPayRef(val);
                          if (extPayRefError) setExtPayRefError("");
                        }}
                      />
                    </View>
                    {extPayRefError ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          marginTop: 6,
                        }}
                      >
                        <Ionicons
                          name="alert-circle"
                          size={14}
                          color={Colors.error}
                        />
                        <Text
                          style={{
                            fontFamily: FontFamily.medium,
                            fontSize: 11.5,
                            color: Colors.error,
                          }}
                        >
                          {extPayRefError}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontFamily: FontFamily.regular,
                          fontSize: 11,
                          color: Colors.secondary,
                          marginTop: 4,
                        }}
                      >
                        Enter the reference number from your GCash receipt.
                      </Text>
                    )}
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: Colors.primary,
                      borderRadius: 14,
                      height: 52,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      opacity: submittingExtPay ? 0.7 : 1,
                    }}
                    onPress={handleSettleExtensionPayment}
                    disabled={submittingExtPay}
                    activeOpacity={0.85}
                  >
                    {submittingExtPay ? (
                      <>
                        <ActivityIndicator size="small" color={Colors.dark} />
                        <Text
                          style={{
                            fontFamily: FontFamily.bold,
                            fontSize: 14,
                            color: Colors.dark,
                          }}
                        >
                          Submitting...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark"
                          size={17}
                          color={Colors.dark}
                        />
                        <Text
                          style={{
                            fontFamily: FontFamily.bold,
                            fontSize: 14,
                            color: Colors.dark,
                          }}
                        >
                          Confirm payment
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })()}
          </ScrollView>
        </AppBottomSheet>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
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
    marginTop: -2,
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
    color: Colors.dark,
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
    color: Colors.dark,
  },
  list: {
    paddingBottom: 80,
    gap: 12,
  },
  // Clean Modern Booking Card
  modernCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  hostBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  hostBadgeText: {
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
  // Status Pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusPillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
  // Compact Alert Pills
  alertPillWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  alertPillWarningText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: "#B45309",
    flex: 1,
  },
  alertPillInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  alertPillInfoText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#1D4ED8",
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
    paddingVertical: 6,
    marginTop: 8,
  },
  alertPillSuccessText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#047857",
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
    paddingVertical: 6,
    marginTop: 8,
  },
  alertPillDangerText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#B91C1C",
    flex: 1,
  },
  alertPillMuted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  alertPillMutedText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#4B5563",
    flex: 1,
  },
  alertPillLive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  alertPillLiveText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: "#15803D",
    flex: 1,
  },
  // Dual Action Buttons Row
  dualActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  dangerActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#991B1B",
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
  depositSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  depositSheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.dark,
  },
  depositCloseButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  depositPriceRow: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  depositPriceLabelGroup: {
    flex: 1,
  },
  depositPriceLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },
  depositPriceCaption: {
    marginTop: 1,
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.secondary,
  },
  depositPriceAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.primary,
  },
  depositPriceValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
  },
  depositPriceRule: {
    height: 1,
    backgroundColor: Colors.border,
  },
  depositPaymentSection: {
    paddingTop: 2,
    marginBottom: 8,
  },
  depositPaymentHeading: {
    paddingVertical: 9,
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  depositRecipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  depositGcashLogo: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  depositRecipientInfo: {
    flex: 1,
    minWidth: 0,
  },
  depositRecipientNumber: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
  depositRecipientName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  depositCopyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  depositCopyButtonSuccess: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  depositReferenceSection: {
    paddingTop: 9,
  },
  depositReferenceTitle: {
    marginBottom: 5,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  depositReferenceInput: {
    minHeight: 43,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.dark,
  },
  depositReferenceInputError: {
    borderColor: Colors.error,
  },
  depositReferenceError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  depositReferenceErrorText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.error,
  },
  depositChatLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  depositSubmitDivider: {
    height: 1,
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: Colors.border,
  },
  depositVerificationNote: {
    marginTop: 7,
    fontFamily: FontFamily.regular,
    fontSize: 9,
    color: Colors.secondary,
    textAlign: "center",
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
    color: Colors.dark,
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
    color: Colors.dark,
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
  exploreButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
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
