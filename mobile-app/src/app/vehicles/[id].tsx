import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Skeleton } from "@/components/common/Skeleton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useFavorites } from "@/context/FavoritesContext";
import { useAppToast } from "@/context/ToastContext";
import AuthRequiredBottomSheet from "@/features/auth/components/AuthRequiredBottomSheet";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getVehicleById } from "@/features/operator/services/vehicleService";
import { Vehicle } from "@/features/operator/types/vehicle";
import { createBooking } from "@/services/bookingService";
import api from "@/services/api";

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

  // Booking bottom sheet state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [startDaysFromNow, setStartDaysFromNow] = useState(1);
  const [tripDurationDays, setTripDurationDays] = useState(2);
  const [bookingNotes, setBookingNotes] = useState("");
  const [submittingBooking, setSubmittingBooking] = useState(false);

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
    } catch {
      showError("Error", "Could not update availability.");
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

    setShowBookingModal(true);
  };

  const calculateFormattedDates = () => {
    const today = new Date();
    const startDateObj = new Date(today);
    startDateObj.setDate(today.getDate() + startDaysFromNow);

    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + tripDurationDays);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    return {
      startDateStr: formatDate(startDateObj),
      endDateStr: formatDate(endDateObj),
      displayStart: startDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      displayEnd: endDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
  };

  const handleConfirmReservation = async () => {
    if (!vehicle) return;
    const { startDateStr, endDateStr } = calculateFormattedDates();

    try {
      setSubmittingBooking(true);
      await createBooking({
        vehicle_id: vehicle.id,
        start_date: startDateStr,
        end_date: endDateStr,
        notes: bookingNotes.trim() || undefined,
      });

      setShowBookingModal(false);
      showSuccess("Reservation Created", "Booking request sent to host. Please settle reservation payment.");
      router.push("/(tabs)/bookings");
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
  const { startDateStr, endDateStr, displayStart, displayEnd } = calculateFormattedDates();

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
            ? vehicle.images.map((img) => img.image_url)
            : [vehicle.image_url || "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60"];

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
            {vehicle.images.map((img, idx) => (
              <TouchableOpacity
                key={img.id}
                onPress={() => {
                  setActiveImageIndex(idx);
                  setFullscreenImage(img.image_url);
                }}
                style={[
                  styles.thumbItem,
                  activeImageIndex === idx && styles.thumbItemActive,
                ]}
              >
                <Image source={{ uri: img.image_url }} style={styles.thumbImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Vehicle Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{vehicle.name}</Text>
              <Text style={styles.vehicleModel}>
                {vehicle.brand || "Sedan"} • {vehicle.transmission || "Automatic"}
              </Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceAmount}>₱{Number(vehicle.price_per_day).toLocaleString()}</Text>
              <Text style={styles.priceUnit}>/ day</Text>
            </View>
          </View>

          {/* Quick Specs */}
          <View style={styles.specsRow}>
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
              <Text style={styles.specText}>{vehicle.vehicle_type || "Gasoline"}</Text>
            </View>
          </View>

          {/* Operator Controls or Renter Host Section */}
          {isOwner ? (
            <View style={styles.ownerControlsCard}>
              <Text style={styles.ownerTitle}>Operator Management Actions</Text>
              <View style={styles.ownerButtonsRow}>
                <TouchableOpacity
                  style={[styles.ownerBtn, { backgroundColor: Colors.inputBackground }]}
                  onPress={handleToggleAvailability}
                  activeOpacity={0.8}
                >
                  <Ionicons name="swap-horizontal" size={16} color={Colors.dark} />
                  <Text style={styles.ownerBtnText}>
                    {vehicle.availability_status === "available" ? "Set Unavailable" : "Set Available"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.ownerBtn, { backgroundColor: "#FEF2F2" }]}
                  onPress={handleDeleteVehicle}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  <Text style={[styles.ownerBtnText, { color: Colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Operator / Location Info with Avatar */}
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

              <TouchableOpacity
                style={styles.operatorRow}
                onPress={() => {
                  if (operator?.id) router.push(`/operator/${operator.id}` as any);
                }}
                activeOpacity={0.8}
              >
                {operator?.profile_photo ? (
                  <Image source={{ uri: operator.profile_photo }} style={styles.operatorAvatar} />
                ) : (
                  <View style={styles.operatorIconWrap}>
                    <Ionicons name="business" size={20} color={Colors.dark} />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.operatorName}>
                    {operator?.business_name || operator?.name || "Verified Host"}
                  </Text>
                  <Text style={styles.operatorAddress} numberOfLines={1}>
                    {vehicle.pickup_address || "Pickup address available upon booking"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
              </TouchableOpacity>
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
      )}

      {/* Date Picker & Booking Confirmation Modal */}
      <Modal
        visible={showBookingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Trip Dates</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close-circle" size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Reserve {vehicle.name} • ₱{Number(vehicle.price_per_day).toLocaleString()}/day
            </Text>

            {/* Quick start date options (realistic dates only) */}
            <Text style={styles.fieldLabel}>Pickup Date</Text>
            <View style={styles.pickerRow}>
              {[
                { label: "Tomorrow", days: 1 },
                { label: "In 2 Days", days: 2 },
                { label: "In 3 Days", days: 3 },
                { label: "This Weekend", days: 5 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  style={[styles.pickerPill, startDaysFromNow === opt.days && styles.pickerPillActive]}
                  onPress={() => setStartDaysFromNow(opt.days)}
                >
                  <Text style={[styles.pickerPillText, startDaysFromNow === opt.days && styles.pickerPillTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration Selector */}
            <Text style={styles.fieldLabel}>Trip Duration</Text>
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
                  onPress={() => setTripDurationDays(opt.days)}
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
                {displayStart} → {displayEnd} ({tripDurationDays} {tripDurationDays === 1 ? "day" : "days"})
              </Text>
            </View>

            {/* Trip Notes */}
            <Text style={styles.fieldLabel}>Trip Notes (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={bookingNotes}
              onChangeText={setBookingNotes}
              placeholder="Special requests or pickup preferences..."
            />

            <View style={{ marginTop: Spacing.lg }}>
              <PrimaryButton
                title={submittingBooking ? "Creating Booking..." : "Confirm & Proceed to Payment"}
                onPress={handleConfirmReservation}
                loading={submittingBooking}
              />
            </View>
          </View>
        </View>
      </Modal>

      <AuthRequiredBottomSheet visible={showAuthSheet} onClose={() => setShowAuthSheet(false)} />

      {/* Fullscreen Photo Viewer Modal */}
      <Modal
        visible={fullscreenImage !== null}
        transparent
        animationType="fade"
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
    backgroundColor: "rgba(16, 185, 129, 0.95)",
  },
  statusUnavail: {
    backgroundColor: "rgba(239, 68, 68, 0.95)",
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
  specsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.md,
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
