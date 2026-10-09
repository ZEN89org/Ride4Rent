import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAppToast } from "@/context/ToastContext";
import { useNotificationCount } from "@/context/NotificationContext";
import { uploadDriversLicense } from "@/services/profileService";

export default function DriverLicenseScreen() {
  const { user, isGuest, updateUser, refreshUser } = useAuth();
  const { showSuccess, showError } = useAppToast();

  const [frontImage, setFrontImage] = useState<string | null>(
    user?.drivers_license_front || null
  );
  const [backImage, setBackImage] = useState<string | null>(
    user?.drivers_license_back || null
  );
  const [uploading, setUploading] = useState(false);

  // Sync state whenever user updates
  useEffect(() => {
    if (user?.drivers_license_front) setFrontImage(user.drivers_license_front);
    if (user?.drivers_license_back) setBackImage(user.drivers_license_back);
  }, [user?.drivers_license_front, user?.drivers_license_back]);

  // Automatically fetch latest status from backend when screen is focused
  useFocusEffect(
    useCallback(() => {
      refreshUser?.().then((latestUser) => {
        if (latestUser?.drivers_license_front) {
          setFrontImage(latestUser.drivers_license_front);
        }
        if (latestUser?.drivers_license_back) {
          setBackImage(latestUser.drivers_license_back);
        }
      });
    }, [])
  );

  const isVerified =
    Boolean(user?.is_drivers_license_verified && user?.license_verification_status === "approved") ||
    user?.license_verification_status === "approved";
  const verificationStatus =
    user?.license_verification_status ||
    (isVerified ? "approved" : user?.drivers_license_front ? "pending" : "unverified");
  const isPending = verificationStatus === "pending";
  const isRejected = verificationStatus === "rejected";
  const canEdit = isRejected || (!isPending && !isVerified);

  const handlePickImage = async (side: "front" | "back") => {
    if (isPending) {
      showError(
        "Under Review",
        "Your driver's license is currently being reviewed by our Admin team. You cannot change photos while review is in progress."
      );
      return;
    }
    if (isVerified) {
      showError(
        "Already Verified",
        "Your driver's license is verified and approved."
      );
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError("Permission Required", "Camera roll permission is required to upload your license.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (side === "front") setFrontImage(uri);
        else setBackImage(uri);
      }
    } catch {
      showError("Image Error", "Could not select photo.");
    }
  };

  const { refreshUnreadCount } = useNotificationCount();

  const handleSubmit = async () => {
    if (isPending) {
      showError(
        "Under Review",
        "Your license is currently under review by our Admin team. Please wait for verification."
      );
      return;
    }

    if (isVerified) {
      showSuccess("Verified", "Your driver's license is already verified.");
      return;
    }

    if (!frontImage || !backImage) {
      showError("Missing License Photo", "Please upload both the Front and Back sides of your driver's license.");
      return;
    }

    try {
      setUploading(true);
      const updatedUser = await uploadDriversLicense(frontImage, backImage);
      await updateUser(updatedUser);
      await refreshUser?.();
      await refreshUnreadCount().catch(() => {});
      showSuccess("Submitted for Review", "Driver's license submitted! Admin will verify your information shortly.");
      router.back();
    } catch (e: any) {
      showError("Upload Failed", e.response?.data?.message || "Could not save driver's license.");
    } finally {
      setUploading(false);
    }
  };

  if (isGuest) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver's License</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.guestContainer}>
          <Ionicons name="card-outline" size={72} color={Colors.secondary} />
          <Text style={styles.guestTitle}>Sign In Required</Text>
          <Text style={styles.guestSubtitle}>
            Please sign in to upload and manage your verified driver's license.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver's License</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Minimal Status Card */}
        <View
          style={[
            styles.minimalStatusCard,
            isRejected && { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
            isPending && { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
            isVerified && { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" },
          ]}
        >
          <View
            style={[
              styles.statusIconCircle,
              isRejected && { backgroundColor: "#FEE2E2" },
              isPending && { backgroundColor: "#FEF3C7" },
              isVerified && { backgroundColor: "#D1FAE5" },
            ]}
          >
            <Ionicons
              name={
                isVerified
                  ? "shield-checkmark"
                  : isPending
                  ? "time"
                  : isRejected
                  ? "alert-circle"
                  : "card-outline"
              }
              size={22}
              color={
                isVerified
                  ? "#059669"
                  : isPending
                  ? "#D97706"
                  : isRejected
                  ? "#DC2626"
                  : Colors.dark
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.statusTitleRow}>
              <Text style={styles.minimalStatusTitle}>Identity Verification</Text>
              <View
                style={[
                  styles.statusBadge,
                  isVerified
                    ? styles.statusBadgeVerified
                    : isPending
                    ? styles.statusBadgePending
                    : isRejected
                    ? styles.statusBadgeRejected
                    : styles.statusBadgeUnverified,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isVerified
                      ? styles.statusTextVerified
                      : isPending
                      ? styles.statusTextPending
                      : isRejected
                      ? styles.statusTextRejected
                      : styles.statusTextUnverified,
                  ]}
                >
                  {isVerified ? "Verified" : isPending ? "Under Review" : isRejected ? "Rejected" : "Not Submitted"}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.minimalStatusSub,
                isRejected && { color: "#991B1B", fontFamily: FontFamily.medium },
              ]}
            >
              {isVerified
                ? "Your driver's license is confirmed. You have full booking access."
                : isPending
                ? "Photos submitted. We will notify you as soon as review finishes."
                : isRejected
                ? user?.license_rejection_reason
                  ? `Note: ${user.license_rejection_reason}`
                  : "Photos did not match your account. Please re-upload clear photos."
                : "Upload front and back photos to enable booking."}
            </Text>
          </View>
        </View>

        {/* Upload Slots Grid - Clean 2-Card Layout */}
        <View style={styles.cardsGrid}>
          {/* Front Side */}
          <View style={styles.cardContainer}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>1. Front Side</Text>
              {frontImage && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
            </View>

            <TouchableOpacity
              style={[
                styles.minimalSlot,
                frontImage && styles.minimalSlotFilled,
                !canEdit && { opacity: 0.95 },
              ]}
              onPress={() => handlePickImage("front")}
              disabled={!canEdit}
              activeOpacity={canEdit ? 0.85 : 1}
            >
              {frontImage ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: frontImage }} style={styles.previewImg} resizeMode="cover" />
                  {canEdit ? (
                    <View style={styles.changeOverlay}>
                      <Ionicons name="camera-reverse" size={13} color={Colors.white} />
                      <Text style={styles.changeText}>Change</Text>
                    </View>
                  ) : isPending ? (
                    <View style={[styles.changeOverlay, { backgroundColor: "rgba(0, 0, 0, 0.65)" }]}>
                      <Ionicons name="lock-closed" size={12} color={Colors.white} />
                      <Text style={styles.changeText}>Locked</Text>
                    </View>
                  ) : (
                    <View style={[styles.changeOverlay, { backgroundColor: "rgba(5, 150, 105, 0.85)" }]}>
                      <Ionicons name="checkmark-done" size={12} color={Colors.white} />
                      <Text style={styles.changeText}>Verified</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptySlotContent}>
                  <MaterialCommunityIcons name="card-account-details-outline" size={30} color="#9CA3AF" />
                  <Text style={styles.slotUploadText}>Tap to add photo</Text>
                  <Text style={styles.slotHintText}>Photo & Full Name</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Back Side */}
          <View style={styles.cardContainer}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>2. Back Side</Text>
              {backImage && <Ionicons name="checkmark-circle" size={16} color="#059669" />}
            </View>

            <TouchableOpacity
              style={[
                styles.minimalSlot,
                backImage && styles.minimalSlotFilled,
                !canEdit && { opacity: 0.95 },
              ]}
              onPress={() => handlePickImage("back")}
              disabled={!canEdit}
              activeOpacity={canEdit ? 0.85 : 1}
            >
              {backImage ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: backImage }} style={styles.previewImg} resizeMode="cover" />
                  {canEdit ? (
                    <View style={styles.changeOverlay}>
                      <Ionicons name="camera-reverse" size={13} color={Colors.white} />
                      <Text style={styles.changeText}>Change</Text>
                    </View>
                  ) : isPending ? (
                    <View style={[styles.changeOverlay, { backgroundColor: "rgba(0, 0, 0, 0.65)" }]}>
                      <Ionicons name="lock-closed" size={12} color={Colors.white} />
                      <Text style={styles.changeText}>Locked</Text>
                    </View>
                  ) : (
                    <View style={[styles.changeOverlay, { backgroundColor: "rgba(5, 150, 105, 0.85)" }]}>
                      <Ionicons name="checkmark-done" size={12} color={Colors.white} />
                      <Text style={styles.changeText}>Verified</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptySlotContent}>
                  <MaterialCommunityIcons name="card-bulleted-outline" size={30} color="#9CA3AF" />
                  <Text style={styles.slotUploadText}>Tap to add photo</Text>
                  <Text style={styles.slotHintText}>Restrictions & Barcode</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Requirements Hint */}
        <View style={styles.requirementsHintCard}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text style={styles.requirementsHintText}>
            Ensure all details (Name, Birthdate, Gender) match your registered profile and the card is glare-free.
          </Text>
        </View>

        {/* Submit / Status Action Area */}
        <View style={styles.buttonWrapper}>
          {isPending ? (
            <View style={styles.pendingNoticeBox}>
              <Ionicons name="time-outline" size={18} color="#D97706" />
              <Text style={styles.pendingNoticeText}>
                Review in progress. Photos cannot be changed while verification is underway.
              </Text>
            </View>
          ) : isVerified ? (
            <View style={styles.verifiedNoticeBox}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={styles.verifiedNoticeText}>
                Your identity is fully verified. You can book any vehicle.
              </Text>
            </View>
          ) : (
            <PrimaryButton
              title={
                uploading
                  ? "Submitting..."
                  : isRejected
                  ? "Re-upload License"
                  : "Submit License"
              }
              onPress={handleSubmit}
              loading={uploading}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.dark,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  minimalStatusCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  minimalStatusTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.dark,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeVerified: {
    backgroundColor: "#ECFDF5",
  },
  statusBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  statusBadgeRejected: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeUnverified: {
    backgroundColor: "#F3F4F6",
  },
  statusBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  statusTextVerified: {
    color: "#059669",
  },
  statusTextPending: {
    color: "#B45309",
  },
  statusTextRejected: {
    color: "#DC2626",
  },
  statusTextUnverified: {
    color: "#6B7280",
  },
  minimalStatusSub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
    marginTop: 4,
  },
  cardsGrid: {
    gap: 16,
    marginBottom: Spacing.md,
  },
  cardContainer: {
    gap: 6,
  },
  cardLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  cardLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
  },
  minimalSlot: {
    height: 150,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  minimalSlotFilled: {
    borderStyle: "solid",
    borderColor: "#E5E7EB",
  },
  imagePreviewWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  previewImg: {
    width: "100%",
    height: "100%",
  },
  changeOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.white,
  },
  emptySlotContent: {
    alignItems: "center",
    gap: 3,
  },
  slotUploadText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.dark,
    marginTop: 2,
  },
  slotHintText: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: "#9CA3AF",
  },
  requirementsHintCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  requirementsHintText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 11.5,
    color: "#4B5563",
    lineHeight: 16,
  },
  buttonWrapper: {
    marginTop: 4,
    marginBottom: 20,
  },
  pendingNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pendingNoticeText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 17,
  },
  verifiedNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#6EE7B7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  verifiedNoticeText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#065F46",
    lineHeight: 17,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  guestTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    color: Colors.dark,
    marginTop: Spacing.md,
  },
  guestSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  signInButton: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 24,
  },
  signInText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.white,
  },
});
