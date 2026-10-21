import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { KeyboardAwareScrollView as ScrollView } from "@/components/common/KeyboardAwareScrollView";
import { AppState, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import PrimaryButton from "@/components/common/PrimaryButton";
import { Colors } from "@/constants/colors";
import { FontFamily, FontSize, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAppToast } from "@/context/ToastContext";
import { useNotificationCount } from "@/context/NotificationContext";
import { resolveImageUrl } from "@/services/api";
import { uploadDriversLicense } from "@/services/profileService";
import { diagnoseLicensePhoto } from "@/services/licenseDiagnostics";

export default function DriverLicenseScreen() {
  const { user, isGuest, updateUser, refreshUser } = useAuth();
  const { showSuccess, showError } = useAppToast();
  const { refreshUnreadCount } = useNotificationCount();

  const [frontDraft, setFrontImage] = useState<string | null>(null);
  const frontImage = frontDraft ?? resolveImageUrl(user?.drivers_license_front_url || user?.drivers_license_front);
  const [backDraft, setBackImage] = useState<string | null>(null);
  const backImage = backDraft ?? resolveImageUrl(user?.drivers_license_back_url || user?.drivers_license_back);
  const [uploading, setUploading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [imageRevision, setImageRevision] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (isGuest) return;
      let active = true;
      const refresh = async () => {
        // Server URLs expire. Never store them in the local image-picker drafts.
        await refreshUser?.();
        if (active) setImageRevision((previous) => previous + 1);
      };
      void refresh();
      const interval = setInterval(() => void refresh(), 10 * 60 * 1000);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      return () => { active = false; clearInterval(interval); subscription.remove(); };
    }, [refreshUser, isGuest]),
  );

  const isVerified =
    Boolean(
      user?.is_drivers_license_verified &&
        user?.license_verification_status === "approved",
    ) || user?.license_verification_status === "approved";

  const verificationStatus =
    user?.license_verification_status ||
    (isVerified
      ? "approved"
      : user?.drivers_license_front
        ? "pending"
        : "unverified");

  const isPending = verificationStatus === "pending";
  const isRejected = verificationStatus === "rejected";
  const hasLicense = Boolean(user?.drivers_license_front || user?.drivers_license_back);
  const canEdit = (editing || !hasLicense) && !uploading;

  const statusInfo = isVerified
    ? {
        label: "Verified",
        color: "#047857",
        bg: "#ECFDF5",
        subtext: "Your driver's license is verified and ready for booking.",
      }
    : isPending
      ? {
          label: "Pending Review",
          color: "#92400E",
          bg: "#FEF3C7",
          subtext:
            "Submitted for operator review. Your operator will check the latest photos when reviewing your booking.",
        }
      : isRejected
        ? {
            label: "Rejected",
            color: "#B91C1C",
            bg: "#FEE2E2",
            subtext:
              user?.license_rejection_reason ||
              "Please upload clear, glare-free photos of both sides.",
          }
        : {
            label: "Unverified",
            color: "#92400E",
            bg: Colors.logoBackground,
            subtext:
              "Upload clear photos of the front and back of your license.",
          };

  const handlePickImage = async (side: "front" | "back") => {
    if (!canEdit) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError(
          "Permission Required",
          "Camera roll permission is required to upload your license.",
        );
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

  const handleSubmit = async () => {
    if (!frontDraft || !backDraft) {
      showError("Select Both Photos", "Choose a new front and back photo before saving your license.");
      return;
    }

    try {
      setUploading(true);
      const updatedUser = await uploadDriversLicense(frontDraft, backDraft);
      await updateUser(updatedUser);
      setFrontImage(null);
      setBackImage(null);
      setEditing(false);
      await refreshUser?.();
      await refreshUnreadCount().catch(() => {});
      showSuccess(
        "License Saved",
        "Driver's license saved! An operator will review your documents.",
      );
      router.back();
    } catch (e: any) {
      showError(
        "Upload Failed",
        e.response?.data?.message || "Could not save driver's license.",
      );
    } finally {
      setUploading(false);
    }
  };

  if (isGuest) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver&apos;s License</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.guestContainer}>
          <View style={styles.guestIconCircle}>
            <Ionicons name="card-outline" size={36} color={Colors.dark} />
          </View>
          <Text style={styles.guestTitle}>Sign In Required</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to upload and manage your driver&apos;s license.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/auth")}
            activeOpacity={0.85}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      {/* Clean Minimal Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver&apos;s License</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Simple Top Status Intro */}
        <View style={styles.topIntro}>
          <View style={styles.topRow}>
            <Text style={styles.pageHeading}>License Photos</Text>
            <View
              style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusInfo.color },
                ]}
              />
              <Text
                style={[styles.statusPillText, { color: statusInfo.color }]}
              >
                {statusInfo.label}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.pageSubtext,
              isRejected && { color: "#B91C1C", fontFamily: FontFamily.medium },
            ]}
          >
            {statusInfo.subtext}
          </Text>
        </View>

        {/* Centerpiece: Front & Back License Cards */}
        <View style={styles.licenseSection}>
          {/* Front Side */}
          <View style={styles.cardBlock}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>Front Side</Text>
              {frontImage && <Text style={styles.readyTag}>{frontDraft ? "Selected" : "Uploaded"}</Text>}
            </View>

            <TouchableOpacity
              style={[
                styles.licenseCard,
                frontImage && styles.licenseCardFilled,
              ]}
              onPress={() => handlePickImage("front")}
              disabled={!canEdit}
              activeOpacity={canEdit ? 0.85 : 1}
            >
              {frontImage ? (
                <View style={styles.imageWrapper}>
                  <Image
                    key={`front-${imageRevision}-${frontImage}`}
                    source={{ uri: frontImage }}
                    style={styles.licenseImage}
                    resizeMode="contain"
                    onError={() => {
                      void diagnoseLicensePhoto("front", frontImage);
                    }}
                  />
                  {canEdit && (
                    <View style={styles.changePill}>
                      <Ionicons name="camera" size={13} color={Colors.dark} />
                      <Text style={styles.changePillText}>Change</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyContent}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons
                      name="card-outline"
                      size={24}
                      color={Colors.dark}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Upload Front of License</Text>
                  <Text style={styles.emptySub}>
                    Photo, full name, and license number
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Back Side */}
          <View style={styles.cardBlock}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>Back Side</Text>
              {backImage && <Text style={styles.readyTag}>{backDraft ? "Selected" : "Uploaded"}</Text>}
            </View>

            <TouchableOpacity
              style={[
                styles.licenseCard,
                backImage && styles.licenseCardFilled,
              ]}
              onPress={() => handlePickImage("back")}
              disabled={!canEdit}
              activeOpacity={canEdit ? 0.85 : 1}
            >
              {backImage ? (
                <View style={styles.imageWrapper}>
                  <Image
                    key={`back-${imageRevision}-${backImage}`}
                    source={{ uri: backImage }}
                    style={styles.licenseImage}
                    resizeMode="contain"
                    onError={() => {
                      void diagnoseLicensePhoto("back", backImage);
                    }}
                  />
                  {canEdit && (
                    <View style={styles.changePill}>
                      <Ionicons name="camera" size={13} color={Colors.dark} />
                      <Text style={styles.changePillText}>Change</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptyContent}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons
                      name="barcode-outline"
                      size={24}
                      color={Colors.dark}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Upload Back of License</Text>
                  <Text style={styles.emptySub}>
                    Restrictions and back details
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          {hasLicense && !editing ? (
            <PrimaryButton title="Update License" onPress={() => setEditing(true)} />
          ) : (
            <>
              <Text style={[styles.pageSubtext, { marginBottom: 12 }]}>Select both sides of your license. Saved updates will be reviewed by the operator.</Text>
              <PrimaryButton title={hasLicense ? "Save Updated License" : "Save License"} onPress={handleSubmit} loading={uploading} />
              {hasLicense && (
                <TouchableOpacity disabled={uploading} onPress={() => { setFrontImage(null); setBackImage(null); setEditing(false); }} style={{ alignItems: "center", padding: 14 }}>
                  <Text style={{ fontFamily: FontFamily.semiBold, color: Colors.secondary }}>Cancel</Text>
                </TouchableOpacity>
              )}
            </>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.dark,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
  },

  /* Top Intro */
  topIntro: {
    marginBottom: 22,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageHeading: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.dark,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11.5,
  },
  pageSubtext: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.secondary,
    marginTop: 4,
    lineHeight: 19,
  },

  /* License Cards */
  licenseSection: {
    gap: 20,
  },
  cardBlock: {
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13.5,
    color: Colors.dark,
  },
  readyTag: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: "#047857",
  },
  licenseCard: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 18,
    backgroundColor: "#F8F8F8",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  licenseCardFilled: {
    backgroundColor: "#F0F0F0",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  licenseImage: {
    width: "100%",
    height: "100%",
  },
  changePill: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  changePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.dark,
  },
  emptyContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.dark,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 2,
    textAlign: "center",
  },

  /* Submit Button */
  buttonContainer: {
    marginTop: 28,
  },

  /* Guest Mode */
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  guestIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.logoBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  guestTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.heading,
    color: Colors.dark,
  },
  guestSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.secondary,
    textAlign: "center",
    marginTop: 6,
  },
  signInButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  signInText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.dark,
  },
});
