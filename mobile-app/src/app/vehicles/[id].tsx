import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBottomSheet } from "@/components/common/AppBottomSheet";
import PrimaryButton from "@/components/common/PrimaryButton";
import { Skeleton } from "@/components/common/Skeleton";
import TripDateTimeSelector from "@/components/common/TripDateTimeSelector";
import { Colors } from "@/constants/colors";
import { resolveCoordinatesFromAddress } from "@/constants/orientalMindoroLocations";
import { FontFamily, Spacing } from "@/constants/theme";
import {
  getDefaultAmenitiesForType,
  resolveAmenityDisplay,
} from "@/constants/vehicleAmenities";
import { useFavorites } from "@/context/FavoritesContext";
import { useAppToast } from "@/context/ToastContext";
import AssistantModal from "@/features/assistant/components/AssistantModal";
import AuthRequiredBottomSheet from "@/features/auth/components/AuthRequiredBottomSheet";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getVehicleById } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";
import api, { resolveImageUrl } from "@/services/api";
import { createBooking, getMyBookings } from "@/services/bookingService";
import { scheduleBookingReminders } from "@/services/deviceNotificationService";

export default function VehicleDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isGuest } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { showSuccess, showError, showWarning, showModal } = useAppToast();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // AI Assistant modal state for this car
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");

  // Booking bottom sheet state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 2);
    end.setHours(0, 0, 0, 0);
    return end;
  });
  const [selectedStartTime, setSelectedStartTime] = useState("10:00 AM");
  const [selectedEndTime, setSelectedEndTime] = useState("10:00 AM");

  const tripDurationDays = React.useMemo(() => {
    const diffMs = selectedEndDate.getTime() - selectedStartDate.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }, [selectedStartDate, selectedEndDate]);

  const [bookingNotes, setBookingNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Multi-Car / Concurrent Rental Designated Driver State
  const [hasActiveTripOverlap, setHasActiveTripOverlap] = useState(false);
  const [activeTripVehicleName, setActiveTripVehicleName] = useState<string>("");
  const [secondaryDriverName, setSecondaryDriverName] = useState("");
  const [secondaryDriverPhone, setSecondaryDriverPhone] = useState("");

  // Operator vehicle management state
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadVehicle();
  }, [id]);

  const loadVehicle = () => {
    setLoading(true);
    getVehicleById(id)
      .then((data) => {
        setVehicle(data);
      })
      .catch((err) => {
        console.error("Failed to load vehicle details:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(user?.role === "operator" ? "/operator-home" : "/(tabs)/home");
    }
  };

  const isOwner =
    user?.role === "operator" &&
    ((vehicle as any)?.operator_id === user?.id || (vehicle as any)?.operator?.id === user?.id);

  const handleDeleteVehicle = () => {
    showModal(
      "Delete Listing",
      "Are you sure you want to remove this vehicle from your fleet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await api.delete(`/operator/vehicles/${vehicle?.id}`);
              showSuccess("Listing Removed", "Vehicle deleted from your fleet.");
              router.replace("/operator-vehicles" as any);
            } catch (e: any) {
              showError("Error", e.response?.data?.message || "Could not delete vehicle.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
      "confirm"
    );
  };

  const handleToggleAvailability = async () => {
    if (!vehicle) return;
    const newStatus = vehicle.availability_status === "available" ? "unavailable" : "available";
    try {
      await api.patch(`/operator/vehicles/${vehicle.id}`, { availability_status: newStatus });
      showSuccess("Status Updated", `Vehicle set to ${newStatus}.`);
      loadVehicle();
    } catch (e: any) {
      showError("Availability Notice", e.response?.data?.message || "Could not update availability.");
    }
  };

  const handleBookNow = () => {
    if (isGuest) {
      setShowAuthSheet(true);
      return;
    }

    if (user?.role === "operator") {
      showWarning("Operator Account", "Operators cannot rent vehicles. Use a customer account.");
      return;
    }

    if (!user?.drivers_license_front || !user?.drivers_license_back) {
      showModal(
        "Driver's License Required",
        "To ensure rental safety, you must upload your Driver's License before booking a vehicle.",
        [
          { text: "Upload Now", style: "default", onPress: () => router.push("/driver-license" as any) },
          { text: "Later", style: "cancel" },
        ],
        "warning"
      );
      return;
    }

    const isVerified = Boolean(user?.is_drivers_license_verified);
    const verificationStatus =
      user?.license_verification_status || (isVerified ? "approved" : "pending");

    if (verificationStatus === "rejected") {
      showModal(
        "Driver's License Rejected",
        user?.license_rejection_reason ||
          "Your driver's license was rejected. Please re-upload clear, valid photos of your license to proceed.",
        [
          { text: "Re-upload Now", style: "default", onPress: () => router.push("/driver-license" as any) },
          { text: "Close", style: "cancel" },
        ],
        "error"
      );
      return;
    }

    // Check if user currently has an active trip or pending unpaid booking
    getMyBookings()
      .then((myBookings) => {
        const pendingUnpaid = myBookings.find(
          (b) =>
            (b.status === "pending_payment" || (b.status as string) === "pending") &&
            b.payment_status !== "paid_reservation" &&
            b.payment_status !== "paid_full"
        );
        if (pendingUnpaid) {
          showModal(
            "Pending Reservation Notice",
            "You already have a pending vehicle reservation awaiting payment. Please settle or cancel your existing request in 'My Bookings' before reserving another vehicle.",
            [
              { text: "View Bookings", style: "default", onPress: () => router.navigate("/(tabs)/bookings") },
              { text: "Close", style: "cancel" },
            ],
            "warning"
          );
          return;
        }

        // Duplicate reservation check for this specific vehicle
        const existingVehicleBooking = myBookings.find(
          (b) =>
            Number(b.vehicle_id) === Number(vehicle?.id) &&
            ["pending_payment", "pending_verification", "approved", "awaiting_pickup", "pickup_in_progress", "trip_in_progress", "ongoing"].includes(b.status)
        );
        if (existingVehicleBooking) {
          showModal(
            "Existing Reservation",
            "You already have an active reservation request for this vehicle. Please manage your trip in 'My Bookings'.",
            [
              { text: "View Bookings", style: "default", onPress: () => router.navigate("/(tabs)/bookings") },
              { text: "Close", style: "cancel" },
            ],
            "warning"
          );
          return;
        }

        const formatDateForCheck = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };
        const selectedStartStr = formatDateForCheck(selectedStartDate);
        const selectedEndStr = formatDateForCheck(selectedEndDate);

        const activeTrip = myBookings.find((b) => {
          if (["completed", "cancelled", "rejected", "refunded", "no_show"].includes(b.status)) return false;
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

          const bStart = (b.start_date || "").split("T")[0];
          const bEnd = (b.extension_end_date || b.extended_end_date || b.end_date || "").split("T")[0];
          return bStart <= selectedEndStr && bEnd >= selectedStartStr;
        });

        if (activeTrip) {
          setHasActiveTripOverlap(true);
          setActiveTripVehicleName(activeTrip.vehicle?.name || "Active Vehicle");
        } else {
          setHasActiveTripOverlap(false);
          setActiveTripVehicleName("");
        }
        setShowBookingModal(true);
      })
      .catch(() => {
        setShowBookingModal(true);
      });
  };

  const calculateFormattedDates = () => {
    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const sDay = selectedStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const eDay = selectedEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const tripDays = Math.max(1, Math.round((selectedEndDate.getTime() - selectedStartDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      startDateStr: formatDate(selectedStartDate),
      endDateStr: formatDate(selectedEndDate),
      displaySummary: `${sDay} – ${eDay} for ${tripDays} ${tripDays === 1 ? "Day" : "Days"}`,
      displayStart: `${sDay} (${selectedStartTime})`,
      displayEnd: `${eDay} (${selectedEndTime})`,
    };
  };

  const handleConfirmReservation = async () => {
    if (!vehicle) return;
    if (submittingBooking) return;
    const { startDateStr, endDateStr } = calculateFormattedDates();

    if (hasActiveTripOverlap && (!secondaryDriverName.trim() || !secondaryDriverPhone.trim())) {
      showError(
        "Designated Driver Required",
        "Because you currently have an active rental trip, please enter the name and contact number of the authorized secondary driver."
      );
      return;
    }

    try {
      setSubmittingBooking(true);

      // Re-check pending bookings before submitting to prevent concurrent multi-booking spam
      const myBookings = await getMyBookings();
      const pendingUnpaid = myBookings.find(
        (b) =>
          (b.status === "pending_payment" || (b.status as string) === "pending") &&
          b.payment_status !== "paid_reservation" &&
          b.payment_status !== "paid_full"
      );
      if (pendingUnpaid) {
        showError(
          "Pending Reservation Notice",
          "You already have a pending booking request awaiting payment. Please settle or cancel it before booking another vehicle."
        );
        setShowBookingModal(false);
        return;
      }

      const createdBooking = await createBooking({
        vehicle_id: vehicle.id,
        start_date: startDateStr,
        end_date: endDateStr,
        notes: bookingNotes.trim()
          ? `${bookingNotes.trim()} • Schedule: ${selectedStartTime} pickup → ${selectedEndTime} return`
          : `Schedule: ${selectedStartTime} pickup → ${selectedEndTime} return`,
        is_multi_vehicle_rental: hasActiveTripOverlap ? true : undefined,
        secondary_driver_name: hasActiveTripOverlap ? secondaryDriverName.trim() : undefined,
        secondary_driver_phone: hasActiveTripOverlap ? secondaryDriverPhone.trim() : undefined,
      } as any);

      scheduleBookingReminders(createdBooking, true).catch(() => {});

      setShowBookingModal(false);
      showSuccess("Reservation Created", "Booking request sent to host. Please settle reservation payment.");
      router.navigate("/(tabs)/bookings");
    } catch (e: any) {
      if (e.response?.data?.code === "LICENSE_REQUIRED") {
        setShowBookingModal(false);
        router.push("/driver-license" as any);
      } else {
        showError("Booking Notice", e.response?.data?.message || "Failed to create booking.");
      }
    } finally {
      setSubmittingBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.circleButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicle Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: Spacing.lg }}>
          <Skeleton height={220} borderRadius={20} style={{ marginBottom: 20 }} />
          <Skeleton width="60%" height={24} style={{ marginBottom: 10 }} />
          <Skeleton width="40%" height={16} style={{ marginBottom: 20 }} />
          <Skeleton height={100} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Vehicle not found</Text>
        <TouchableOpacity style={styles.backButtonSimple} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isFav = isFavorite(vehicle.id);
  const operator = (vehicle as any).operator;
  const { startDateStr, endDateStr, displaySummary, displayStart, displayEnd } = calculateFormattedDates();

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.circleButton} onPress={handleBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {isOwner ? "Manage Vehicle" : vehicle.name}
        </Text>

        {!isOwner ? (
          <TouchableOpacity
            style={styles.circleButton}
            onPress={() => {
              if (isGuest) setShowAuthSheet(true);
              else toggleFavorite(vehicle.id);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={22}
              color={isFav ? Colors.primary : Colors.dark}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.circleButton}
            onPress={handleDeleteVehicle}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Multi-Image Showcase Carousel */}
        {(() => {
          const allImages = (vehicle.images && vehicle.images.length > 0)
            ? vehicle.images.map((img) => resolveImageUrl(img.image_url) || img.image_url)
            : [resolveImageUrl(vehicle.image_url) || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60"];

          const screenWidth = Dimensions.get("window").width;

          return (
            <View style={styles.imageContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                  setActiveImageIndex(newIndex);
                }}
              >
                {allImages.map((imgUri, index) => (
                  <Pressable
                    key={`${imgUri}-${index}`}
                    style={{ width: screenWidth, height: 260 }}
                    onPress={() => setFullscreenImage(imgUri)}
                  >
                    <Image
                      source={{ uri: imgUri }}
                      style={styles.vehicleImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>

              {/* Counter / Pagination badge */}
              {allImages.length > 1 && (
                <View style={styles.photoCounterBadge}>
                  <Ionicons name="images-outline" size={13} color={Colors.white} />
                  <Text style={styles.photoCounterText}>
                    {activeImageIndex + 1} / {allImages.length}
                  </Text>
                </View>
              )}

              {/* Status Tag */}
              <View style={[styles.statusTag, vehicle.availability_status === "available" ? styles.statusAvail : styles.statusUnavail]}>
                <Text style={styles.statusTagText}>
                  {vehicle.availability_status === "available" ? "Available" : "Unavailable / Rented"}
                </Text>
              </View>

              {/* Tap to expand hint */}
              <TouchableOpacity
                style={styles.expandIconBtn}
                onPress={() => setFullscreenImage(allImages[activeImageIndex] || allImages[0])}
              >
                <Ionicons name="expand-outline" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Multi-Image Thumbnail Strip */}
        {vehicle.images && vehicle.images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailStrip}
          >
            {vehicle.images.map((img, idx) => {
              const resolvedThumb = resolveImageUrl(img.image_url) || img.image_url;
              return (
                <TouchableOpacity
                  key={img.id}
                  onPress={() => {
                    setActiveImageIndex(idx);
                    setFullscreenImage(resolvedThumb);
                  }}
                  style={[
                    styles.thumbItem,
                    activeImageIndex === idx && styles.thumbItemActive,
                  ]}
                >
                  <Image source={{ uri: resolvedThumb }} style={styles.thumbImage} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Vehicle Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
                <Text style={styles.vehicleModel}>
                  {vehicle.brand || "Sedan"} - {vehicle.transmission || "Automatic"}
                </Text>
                {vehicle.rating && (vehicle.rating_count ?? 0) > 0 ? (
                  <View style={styles.inlineRatingBadge}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.inlineRatingText}>
                      {Number(vehicle.rating).toFixed(1)} ({vehicle.rating_count})
                    </Text>
                  </View>
                ) : (
                  <View style={styles.inlineNewBadge}>
                    <Text style={styles.inlineNewBadgeText}>New Listing</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceAmount}>₱{Number(vehicle.price_per_day).toLocaleString()}</Text>
              <Text style={styles.priceUnit}>/ day</Text>
            </View>
          </View>

          {/* Quick Specs Pill Row - Horizontally Scrollable */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.specsScrollContainer}
            style={styles.specsScrollView}
          >
            <View style={styles.specPill}>
              <MaterialCommunityIcons name="car-seat" size={18} color={Colors.dark} />
              <Text style={styles.specText}>{vehicle.seats || 4} Seats</Text>
            </View>
            <View style={styles.specPill}>
              <MaterialCommunityIcons name="car-shift-pattern" size={18} color={Colors.dark} />
              <Text style={styles.specText}>{vehicle.transmission || "Auto"}</Text>
            </View>
            <View style={styles.specPill}>
              <MaterialCommunityIcons name="gas-station" size={18} color={Colors.dark} />
              <Text style={styles.specText}>{vehicle.fuel_type || "Gasoline"}</Text>
            </View>
            {vehicle.mileage ? (
              <View style={styles.specPill}>
                <MaterialCommunityIcons name="speedometer" size={18} color={Colors.dark} />
                <Text style={styles.specText}>{Number(vehicle.mileage).toLocaleString()} km</Text>
              </View>
            ) : null}
            {vehicle.vehicle_type ? (
              <View style={styles.specPill}>
                <MaterialCommunityIcons name="car-side" size={18} color={Colors.dark} />
                <Text style={styles.specText}>{vehicle.vehicle_type}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Key Amenities & Features Grid - Dynamically Tailored or Operator-Selected */}
          {(() => {
            const vType = (vehicle.vehicle_type || "").toLowerCase();
            const hasCustomFeatures = Array.isArray(vehicle.features) && vehicle.features.length > 0;

            let amenities: { icon: any; iconType?: "ion" | "mci"; color: string; label: string }[] = [];

            if (hasCustomFeatures) {
              amenities = vehicle.features!.map((feat: string) => {
                const resolved = resolveAmenityDisplay(feat);
                return {
                  icon: resolved.icon,
                  iconType: resolved.iconType,
                  color: resolved.color,
                  label: resolved.label,
                };
              });
            } else {
              const defaultIds = getDefaultAmenitiesForType(vType);
              amenities = defaultIds.map((id) => {
                const resolved = resolveAmenityDisplay(id);
                return {
                  icon: resolved.icon,
                  iconType: resolved.iconType,
                  color: resolved.color,
                  label: resolved.label,
                };
              });
            }

            return (
              <>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionHeading}>Vehicle Highlights & Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  {amenities.map((item, idx) => (
                    <View key={idx} style={styles.amenityItem}>
                      {item.iconType === "mci" ? (
                        <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                      ) : (
                        <Ionicons name={item.icon as any} size={18} color={item.color} />
                      )}
                      <Text style={styles.amenityText} numberOfLines={2}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            );
          })()}

          {/* AI Vehicle Assistant Action Card */}
          <TouchableOpacity
            style={styles.aiInsightCard}
            onPress={() => {
              setAssistantPrompt(`Tell me more about renting the ${vehicle.name}. Is it good for travel in Mindoro and what are the requirements?`);
              setShowAssistantModal(true);
            }}
            activeOpacity={0.85}
          >
            <View style={styles.aiIconBadge}>
              <MaterialCommunityIcons name="robot-excited-outline" size={22} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiCardTitle}>Ask AI About This Vehicle</Text>
              <Text style={styles.aiCardSubtitle}>Get instant answers on suitability, fuel cost, and Mindoro routes.</Text>
            </View>
            <Ionicons name="chatbubbles-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {/* Transparent Price & Fee Breakdown */}
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionHeading}>Price & Fee Breakdown</Text>
          <View style={styles.priceBreakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Daily Rental Rate</Text>
              <Text style={styles.breakdownValue}>₱{Number(vehicle.price_per_day).toLocaleString()} / day</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Required Reservation Fee</Text>
              <Text style={[styles.breakdownValue, { color: Colors.primary }]}>
                ₱{Number(vehicle.reservation_fee || 500).toLocaleString()}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Remaining Balance on Handover</Text>
              <Text style={styles.breakdownValue}>
                ₱{Math.max(0, Number(vehicle.price_per_day) - Number(vehicle.reservation_fee || 500)).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Rental Requirements & Policies */}
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionHeading}>Rental Rules & Policies</Text>
          <View style={styles.policiesCard}>
            <View style={styles.policyRow}>
              <View style={styles.policyIconCircle}>
                <Ionicons name="id-card-outline" size={18} color={Colors.dark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>Driver Requirements</Text>
                <Text style={styles.policyDesc}>
                  Age {vehicle.min_driver_age || 21}+ with valid Philippine or International Driver's License and 1 secondary ID.
                </Text>
              </View>
            </View>

            <View style={styles.policyRow}>
              <View style={styles.policyIconCircle}>
                <MaterialCommunityIcons name="gas-station" size={18} color={Colors.dark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>Fuel Policy</Text>
                <Text style={styles.policyDesc}>{vehicle.fuel_policy || "Same-to-Same (Return with identical fuel level at pickup)."}</Text>
              </View>
            </View>

            <View style={styles.policyRow}>
              <View style={styles.policyIconCircle}>
                <Ionicons name="time-outline" size={18} color={Colors.dark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>Late Return & Extension</Text>
                <Text style={styles.policyDesc}>{vehicle.late_return_policy || "Inform host 3 hours prior to extension. Overtime rates apply."}</Text>
              </View>
            </View>
          </View>

          {/* Location & Handover Point */}
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionHeading}>Pickup & Meetup Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationInfoRow}>
              <Ionicons name="location-sharp" size={22} color={Colors.dark} />
              <View style={{ flex: 1 }}>
                <Text style={styles.locationTitle}>{vehicle.pickup_address || "Pinamalayan, Oriental Mindoro"}</Text>
                <Text style={styles.locationSubtitle}>Exact meetup coordination provided upon booking confirmation.</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => {
                const addressToUse = vehicle.pickup_address || "Calapan City, Oriental Mindoro";
                const fallbackGeocoded = resolveCoordinatesFromAddress(addressToUse);
                const rawLat = vehicle.pickup_latitude || (vehicle.operator as any)?.latitude;
                const rawLng = vehicle.pickup_longitude || (vehicle.operator as any)?.longitude;
                const finalLat =
                  rawLat && Number(rawLat) !== 0 && !isNaN(Number(rawLat))
                    ? Number(rawLat)
                    : fallbackGeocoded.latitude;
                const finalLng =
                  rawLng && Number(rawLng) !== 0 && !isNaN(Number(rawLng))
                    ? Number(rawLng)
                    : fallbackGeocoded.longitude;

                router.push({
                  pathname: "/live-tracking",
                  params: {
                    type: "pickup",
                    mode: "pickup",
                    title: "Pickup & Garage Location",
                    vehicleName: vehicle.name,
                    address: addressToUse,
                    latitude: String(finalLat),
                    longitude: String(finalLng),
                    lat: String(finalLat),
                    lng: String(finalLng),
                  },
                } as any);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={16} color={Colors.dark} />
              <Text style={styles.directionsButtonText}>View Pickup Location</Text>
            </TouchableOpacity>
          </View>

          {/* Rating & Renter Reviews Section */}
          <View style={styles.sectionDivider} />
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeading}>
              Ratings & Reviews
            </Text>
            {vehicle.rating ? (
              <View style={styles.ratingBadgePill}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingBadgeText}>{Number(vehicle.rating).toFixed(1)}</Text>
              </View>
            ) : null}
          </View>

          {Array.isArray(vehicle.reviews) && vehicle.reviews.length > 0 ? (
            <View style={{ gap: 10, marginTop: 4 }}>
              {vehicle.reviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    {rev.renter_photo ? (
                      <Image source={{ uri: resolveImageUrl(rev.renter_photo) || rev.renter_photo }} style={styles.reviewerAvatarImage} />
                    ) : (
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerInitial}>
                          {(rev.renter_name || "R").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewerName}>{rev.renter_name}</Text>
                      <Text style={styles.reviewDate}>{rev.created_at || "Verified Renter"}</Text>
                    </View>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= rev.rating ? "star" : "star-outline"}
                          size={13}
                          color={s <= rev.rating ? "#F59E0B" : Colors.border}
                        />
                      ))}
                    </View>
                  </View>
                  {rev.review ? (
                    <Text style={styles.reviewContent}>{rev.review}</Text>
                  ) : (
                    <Text style={[styles.reviewContent, { fontStyle: "italic", color: Colors.secondary }]}>
                      Rated {rev.rating} out of 5 stars
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.newListingReviewCard}>
              <Text style={styles.newListingReviewTitle}>No Reviews Yet</Text>
              <Text style={styles.newListingReviewText}>
                Be among the first renters to book this vehicle and share your experience!
              </Text>
            </View>
          )}

          {/* Operator Controls or Renter Host Section */}
          {isOwner ? (
            <View style={styles.ownerControlsCard}>
              <Text style={styles.ownerTitle}>Operator Management Actions</Text>

              {vehicle.is_rented && (
                <View style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FEF3C7",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginBottom: 12,
                  gap: 8,
                }}>
                  <Ionicons name="lock-closed" size={16} color="#D97706" />
                  <Text style={{ fontSize: 12, color: "#92400E", flex: 1, fontFamily: FontFamily?.medium || undefined }}>
                    This vehicle is currently on an active rental trip. Availability cannot be manually altered until the booking completes.
                  </Text>
                </View>
              )}

              <View style={styles.ownerButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.ownerBtn,
                    { backgroundColor: Colors.inputBackground },
                    vehicle.is_rented && { opacity: 0.5 },
                  ]}
                  onPress={handleToggleAvailability}
                  disabled={vehicle.is_rented}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={vehicle.is_rented ? "lock-closed" : "swap-horizontal"}
                    size={16}
                    color={Colors.dark}
                  />
                  <Text style={styles.ownerBtnText}>
                    {vehicle.is_rented
                      ? "Currently Rented"
                      : vehicle.availability_status === "available"
                      ? "Set Unavailable"
                      : "Set Available"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ownerBtn,
                    { backgroundColor: "#FEF2F2" },
                    vehicle.is_rented && { opacity: 0.5 },
                  ]}
                  onPress={handleDeleteVehicle}
                  disabled={vehicle.is_rented || deleting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  <Text style={[styles.ownerBtnText, { color: Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Operator / Location Info with Avatar & Chat Button */}
              <View style={styles.sectionDivider} />
              <View style={styles.sectionHeadingRow}>
                <Text style={styles.sectionHeading}>Verified Host & Operator</Text>
                {operator?.id && (
                  <TouchableOpacity
                    onPress={() => router.push(`/operator/${operator?.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewFleetText}>View Fleet</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.operatorRow}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 12, minWidth: 0 }}
                  onPress={() => {
                    if (operator?.id) router.push(`/operator/${operator.id}` as any);
                  }}
                  activeOpacity={0.8}
                >
                  {operator?.profile_photo ? (
                    <Image source={{ uri: resolveImageUrl(operator.profile_photo) || operator.profile_photo }} style={styles.operatorAvatar} />
                  ) : (
                    <View style={styles.operatorIconWrap}>
                      <Ionicons name="business" size={20} color={Colors.dark} />
                    </View>
                  )}

                  <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                    <Text style={styles.operatorName} numberOfLines={1} ellipsizeMode="tail">
                      {operator?.business_name || operator?.name || "Verified Host"}
                    </Text>
                    <Text style={styles.operatorAddress} numberOfLines={1} ellipsizeMode="tail">
                      {vehicle.pickup_address || "Pickup address available upon booking"}
                    </Text>
                  </View>
                </TouchableOpacity>

                {operator?.id && (
                  <TouchableOpacity
                    style={styles.chatHostButton}
                    onPress={() => {
                      if (isGuest) {
                        setShowAuthSheet(true);
                        return;
                      }
                      router.push({
                        pathname: `/chat/${operator.id}`,
                        params: { name: operator?.business_name || operator?.name || "Host" },
                      } as any);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.dark} />
                    <Text style={styles.chatHostButtonText}>Message</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Description */}
          {vehicle.description ? (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeading}>Description</Text>
              <Text style={styles.descriptionText}>{vehicle.description}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Bar (Renter) */}
      {!isOwner && (
        <View style={styles.bottomBookingBar}>
          <View>
            <Text style={styles.bottomPriceLabel}>Total estimate</Text>
            <Text style={styles.bottomPrice}>₱{Number(vehicle.price_per_day).toLocaleString()} / day</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {operator?.id && (
              <TouchableOpacity
                style={styles.bottomChatButton}
                onPress={() => {
                  if (isGuest) {
                    setShowAuthSheet(true);
                    return;
                  }
                  router.push({
                    pathname: `/chat/${operator.id}`,
                    params: { name: operator?.business_name || operator?.name || "Host" },
                  } as any);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={20} color={Colors.dark} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.bookNowButton,
                vehicle.availability_status !== "available" && styles.bookNowDisabled,
              ]}
              onPress={handleBookNow}
              disabled={vehicle.availability_status !== "available"}
              activeOpacity={0.85}
            >
              <Text style={styles.bookNowText}>
                {vehicle.availability_status === "available" ? "Book Vehicle" : "Currently Unavailable"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* AI Assistant Sheet */}
      <AssistantModal
        visible={showAssistantModal}
        onClose={() => {
          setShowAssistantModal(false);
          setAssistantPrompt("");
        }}
        initialPrompt={assistantPrompt}
      />

      {/* Date Picker & Booking Confirmation Modal */}
      <AppBottomSheet
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        position="bottom"
        showHandle={false}
        sheetStyle={styles.modalCard}
        renderAsOverlay={true}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Trip Dates</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close-circle" size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {vehicle.name} - ₱{Number(vehicle.price_per_day).toLocaleString()}/day
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: Spacing.md }}
              style={{ maxHeight: Dimensions.get("window").height * 0.65 }}
            >
              {/* Responsive Trip Date & Time Selection Cards & Modal (Images 1 & 2) */}
              <Text style={styles.fieldLabel}>Pick Trip Schedule</Text>
              <TripDateTimeSelector
                startDate={selectedStartDate}
                endDate={selectedEndDate}
                startTime={selectedStartTime}
                endTime={selectedEndTime}
                onDateTimeChange={(start, end, sTime, eTime) => {
                  setSelectedStartDate(start);
                  setSelectedEndDate(end);
                  setSelectedStartTime(sTime);
                  setSelectedEndTime(eTime);
                }}
              />

              {/* Quick Duration Shortcuts */}
              <Text style={[styles.fieldLabel, { marginTop: Spacing.sm }]}>Quick Duration</Text>
              <View style={styles.pickerRow}>
                {[
                  { label: "1 Day", days: 1 },
                  { label: "2 Days", days: 2 },
                  { label: "3 Days", days: 3 },
                  { label: "5 Days", days: 5 },
                  { label: "1 Week", days: 7 },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.days}
                    style={[styles.pickerPill, tripDurationDays === opt.days && styles.pickerPillActive]}
                    onPress={() => {
                      const newEnd = new Date(selectedStartDate);
                      newEnd.setDate(selectedStartDate.getDate() + opt.days);
                      setSelectedEndDate(newEnd);
                    }}
                  >
                    <Text style={[styles.pickerPillText, tripDurationDays === opt.days && styles.pickerPillTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Selected Date Summary */}
              <View style={styles.dateSummaryBox}>
                <Ionicons name="calendar-outline" size={18} color={Colors.dark} />
                <Text style={styles.dateSummaryText}>
                  {displaySummary}
                </Text>
              </View>

              {/* Minimal reservation fee summary */}
              <View style={styles.reservationSummaryCard}>
                <View style={styles.reservationSummaryHeader}>
                  <View style={styles.reservationSummaryIcon}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={Colors.dark} />
                  </View>
                  <View style={styles.reservationSummaryHeading}>
                    <Text style={styles.reservationSummaryTitle}>Reservation fee</Text>
                    <Text style={styles.reservationSummaryCaption}>Pay now via GCash only</Text>
                  </View>
                  <Text style={styles.reservationDepositAmount}>
                    ₱{Number(vehicle.reservation_fee || 500).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.reservationSummaryDivider} />

                <View style={styles.reservationSummaryRow}>
                  <Text style={styles.reservationSummaryLabel}>
                    Rental total for {tripDurationDays} {tripDurationDays === 1 ? "day" : "days"}
                  </Text>
                  <Text style={styles.reservationSummaryValue}>
                    ₱{(Number(vehicle.price_per_day) * tripDurationDays).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.reservationSummaryRow}>
                  <Text style={styles.reservationSummaryLabel}>Balance at meetup</Text>
                  <Text style={styles.reservationSummaryValue}>
                    ₱{Math.max(0, Number(vehicle.price_per_day) * tripDurationDays - Number(vehicle.reservation_fee || 500)).toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Multi-Vehicle Rental Verification Notice */}
              {hasActiveTripOverlap && (
                <View style={styles.multiCarNoticeCard}>
                  <View style={styles.multiCarNoticeHeader}>
                    <Ionicons name="shield-checkmark" size={16} color="#B45309" />
                    <Text style={styles.multiCarNoticeTitle}>Multi-Vehicle Rental</Text>
                  </View>
                  <Text style={styles.multiCarNoticeText}>
                    You have an active ongoing trip ({activeTripVehicleName}). For insurance and verification, please designate the authorized secondary driver for this vehicle.
                  </Text>

                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Driver Name *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={secondaryDriverName}
                    onChangeText={setSecondaryDriverName}
                    placeholder="Full name"
                  />

                  <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Driver Mobile Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={secondaryDriverPhone}
                    onChangeText={setSecondaryDriverPhone}
                    keyboardType="phone-pad"
                    placeholder="phonenumber"
                  />
                </View>
              )}

              {/* Trip Notes */}
              <Text style={styles.fieldLabel}>Trip Notes</Text>
              <TextInput
                style={styles.modalInput}
                value={bookingNotes}
                onChangeText={setBookingNotes}
                placeholder="Special requests or pickup preferences..."
              />

              <View style={{ marginTop: Spacing.lg }}>
                <PrimaryButton
                  title={submittingBooking ? "Creating Booking..." : "Proceed to Payment"}
                  onPress={handleConfirmReservation}
                  loading={submittingBooking}
                />
              </View>
            </ScrollView>
      </AppBottomSheet>

      <AuthRequiredBottomSheet visible={showAuthSheet} onClose={() => setShowAuthSheet(false)} />

      {/* Fullscreen Photo Viewer Modal */}
      <Modal
        visible={fullscreenImage !== null}
        transparent
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.fullscreenBackdrop}>
          <TouchableOpacity
            style={styles.fullscreenCloseBtn}
            onPress={() => setFullscreenImage(null)}
          >
            <Ionicons name="close-circle" size={32} color={Colors.white} />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: "100%",
    height: 260,
    backgroundColor: Colors.inputBackground,
    position: "relative",
  },
  vehicleImage: {
    width: "100%",
    height: "100%",
  },
  photoCounterBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  photoCounterText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.white,
  },
  expandIconBtn: {
    position: "absolute",
    bottom: 12,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailStrip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 10,
    backgroundColor: Colors.white,
  },
  thumbItem: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  thumbItemActive: {
    borderColor: Colors.primary,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullscreenImage: {
    width: "95%",
    height: "80%",
  },
  statusTag: {
    position: "absolute",
    bottom: 12,
    left: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusAvail: {
    backgroundColor: "rgba(5, 81, 55, 0.95)",
  },
  statusUnavail: {
    backgroundColor: "rgba(65, 6, 6, 0.95)",
  },
  statusTagText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.white,
  },
  detailsCard: {
    padding: Spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  vehicleName: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.dark,
  },
  vehicleModel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 2,
  },
  priceBadge: {
    alignItems: "flex-end",
  },
  priceAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.dark,
  },
  priceUnit: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
  },
  specsScrollView: {
    marginTop: Spacing.md,
    marginHorizontal: -Spacing.lg,
  },
  specsScrollContainer: {
    paddingHorizontal: Spacing.lg,
    gap: 8,
    alignItems: "center",
  },
  specPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  specText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.dark,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.lg,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  viewFleetText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.primary,
  },
  operatorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    padding: Spacing.md,
    borderRadius: 16,
    gap: 12,
  },
  operatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  operatorIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  operatorName: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
  operatorAddress: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
  },
  descriptionText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    lineHeight: 20,
    marginTop: 6,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    marginTop: 10,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    width: "48.5%",
    minHeight: 44,
  },
  amenityText: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.dark,
    flex: 1,
    lineHeight: 15,
  },
  aiInsightCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.logoBackground,
    padding: Spacing.md,
    borderRadius: 16,
    marginTop: Spacing.lg,
    gap: 12,
  },
  aiIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  aiCardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  aiCardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
    lineHeight: 15,
  },
  priceBreakdownCard: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: 8,
  },
  reservationSummaryCard: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  reservationSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reservationSummaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.logoBackground,
    alignItems: "center",
    justifyContent: "center",
  },
  reservationSummaryHeading: {
    flex: 1,
  },
  reservationSummaryTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },
  reservationSummaryCaption: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 1,
  },
  reservationDepositAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  reservationSummaryDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  reservationSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  reservationSummaryLabel: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  reservationSummaryValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
    flex: 1,
    paddingRight: 8,
  },
  breakdownValue: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 8,
  },
  breakdownNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 2,
  },
  breakdownNoteText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    flex: 1,
    lineHeight: 15,
  },
  policiesCard: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: 8,
    gap: 14,
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  policyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#cdcdcd",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  policyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  policyDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
    lineHeight: 17,
  },
  locationCard: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: 8,
    gap: 12,
  },
  locationInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  locationTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  locationSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 2,
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  directionsButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  inlineRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inlineRatingText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: "#D97706",
  },
  inlineNewBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inlineNewBadgeText: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    color: Colors.secondary,
  },
  ratingBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#D97706",
  },
  reviewCard: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.inputBackground,
  },
  reviewerInitial: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.white,
  },
  reviewerName: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
  reviewDate: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
    marginTop: 1,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewContent: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.dark,
    marginTop: 8,
    lineHeight: 18,
  },
  newListingReviewCard: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  newListingReviewTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.dark,
    textAlign: "center",
  },
  newListingReviewText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 8,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: Spacing.sm,
  },
  chatHostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.logoBackground,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  chatHostButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  bottomChatButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.inputBackground,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ownerControlsCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.inputBackground,
    borderRadius: 16,
  },
  ownerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
    marginBottom: 10,
  },
  ownerButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  ownerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  ownerBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  bottomBookingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  bottomPriceLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.secondary,
  },
  bottomPrice: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  bookNowButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  bookNowDisabled: {
    backgroundColor: Colors.inputBackground,
  },
  bookNowText: {
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    maxHeight: Dimensions.get("window").height * 0.85,
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
  modalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.dark,
    marginTop: 8,
    marginBottom: 6,
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  pickerPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.inputBackground,
  },
  pickerPillActive: {
    backgroundColor: Colors.logoBackground,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  pickerPillText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.secondary,
  },
  pickerPillTextActive: {
    fontFamily: FontFamily.bold,
    color: Colors.dark,
  },
  dateSummaryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginVertical: 6,
  },
  dateSummaryText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
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
    borderWidth: 1,
    borderColor: Colors.border,
  },
  multiCarNoticeCard: {
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  multiCarNoticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  multiCarNoticeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: "#92400E",
  },
  multiCarNoticeText: {
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#78350F",
    lineHeight: 16,
  },
  errorText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  backButtonSimple: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  backButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.dark,
  },
});
